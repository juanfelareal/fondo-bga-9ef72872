/* ============ Grupo de Inversión Bucaramanga ============ */

const db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let members = [];
let options = [];
let votes = [];
let fund = null;
let selectedOptionId = null;

// ---------- Formato ----------

const fmtCOP = (n) => {
  const [intPart, decPart] = Number(n).toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { grouped, decimals: decPart };
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// ---------- Carga de datos ----------

async function loadAll() {
  const [fundRes, membersRes, optionsRes, votesRes] = await Promise.all([
    db.from('fund').select('*').eq('id', 1).single(),
    db.from('members_public').select('*').order('id'),
    db.from('options').select('*').order('sort'),
    db.from('votes').select('*'),
  ]);

  if (fundRes.error || membersRes.error || optionsRes.error || votesRes.error) {
    console.error('Error cargando datos', fundRes.error, membersRes.error, optionsRes.error, votesRes.error);
    document.getElementById('voteProgress').textContent = 'Error cargando datos. Recarga la página.';
    return;
  }

  fund = fundRes.data;
  members = membersRes.data;
  options = optionsRes.data;
  votes = votesRes.data;

  renderBalance();
  renderMembers();
  renderOptions();
}

async function refreshVotes() {
  const { data, error } = await db.from('votes').select('*');
  if (!error) {
    votes = data;
    renderMembers();
    renderOptions();
  }
}

// ---------- Render ----------

function renderBalance() {
  const { grouped, decimals } = fmtCOP(fund.balance);
  document.getElementById('balanceAmount').innerHTML =
    `$${grouped}<span class="decimals">,${decimals}</span>`;
}

function renderMembers() {
  const votedIds = new Set(votes.map(v => v.member_id));
  document.getElementById('membersList').innerHTML = members.map(m => `
    <div class="member-row">
      <div class="member-avatar">${esc(initials(m.name))}</div>
      <div class="member-name">${esc(m.name)}</div>
      <div class="member-voted ${votedIds.has(m.id) ? 'yes' : ''}">${votedIds.has(m.id) ? '✓ Ya votó' : 'Sin votar'}</div>
    </div>
  `).join('');
}

// Map option sort to detail page
const detailPages = {
  1: 'laureles.html',
  2: 'aldea.html',
  3: 'patito-feo.html',
  4: 'vis.html',
  5: 'indie-universe.html',
  6: 'nido-de-agua.html',
};

// Map option sort to project status (true = operating, false = construction)
const projectStatus = {
  1: true,   // Laureles - en funcionamiento
  2: false,  // Aldea - en construcción
  3: true,   // Patito Feo - en funcionamiento
  4: false,  // Mazzú - en construcción
  5: true,   // Indie Universe - en funcionamiento
  6: false,  // Nido de Agua - en construcción
};

// Map option sort to project image (real project photos)
const projectImages = {
  1: 'https://casa-fiora-laureles.medellin-hotels.com/data/Photos/OriginalPhoto/17088/1708863/1708863804.JPEG', // Casa Fiora Laureles
  2: 'https://lokl-assets.s3.us-east-1.amazonaws.com/lokl-marketing/IMG_7118%2B(1).jpg', // Aldea
  3: 'https://patitofeostays.com/wp-content/uploads/2024/12/DSC_2647-HDR-Editar.jpg', // Patito Feo
  4: 'https://s3.amazonaws.com/cdn.contex.com.co/wp-content/uploads/Mazzu-Caldas-Spa.jpg', // Mazzú
  5: 'https://lokl-assets.s3.us-east-1.amazonaws.com/home/Hero-indie-movil.png', // Indie Universe
  6: 'https://cdn.prod.website-files.com/65eb27038e864e34c8514f01/662fe345edceb725ce70f790_pexels-ehsan-haque-17873737%201.png', // Nido de Agua
};

function renderOptions() {
  const total = members.length;
  const counts = {};
  votes.forEach(v => { counts[v.option_id] = (counts[v.option_id] || 0) + 1; });
  const maxVotes = Math.max(0, ...Object.values(counts));

  document.getElementById('voteProgress').textContent =
    `${votes.length} de ${total} integrantes han votado`;

  const memberById = Object.fromEntries(members.map(m => [m.id, m]));

  document.getElementById('optionsGrid').innerHTML = options.map((o, i) => {
    const count = counts[o.id] || 0;
    const voters = votes.filter(v => v.option_id === o.id)
      .map(v => memberById[v.member_id]?.name)
      .filter(Boolean);
    const isLeading = count > 0 && count === maxVotes;
    const pct = total ? (count / total) * 100 : 0;
    const highlights = Array.isArray(o.highlights) ? o.highlights : [];
    const detailPage = detailPages[o.sort] || null;
    const isOperating = projectStatus[o.sort];
    const statusBadge = isOperating !== undefined
      ? `<span class="status-badge ${isOperating ? 'operating' : 'construction'}">${isOperating ? 'EN FUNCIONAMIENTO' : 'EN CONSTRUCCIÓN'}</span>`
      : '';
    const projectImage = projectImages[o.sort] || '';

    return `
    <div class="option-card ${isLeading ? 'leading' : ''}">
      ${isLeading ? '<div class="option-lead-badge">VA GANANDO</div>' : ''}
      ${projectImage ? `<div class="option-image"><img src="${projectImage}" alt="${esc(o.title)}" loading="lazy"></div>` : ''}
      <div class="option-content">
      ${statusBadge}
      <div class="option-num">OPCIÓN ${i + 1}</div>
      <div class="option-title">${esc(o.title)}</div>
      <div class="option-desc">${esc(o.description || '')}</div>
      ${highlights.length ? `<ul class="option-highlights">${highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      ${detailPage ? `<a class="option-link" href="${detailPage}">Ver información completa →</a>` : ''}
      ${o.link ? `<a class="option-link" href="${esc(o.link)}" target="_blank" rel="noopener">Sitio web del proyecto ↗</a>` : ''}
      <div class="option-votes">
        <div class="vote-bar-row">
          <div class="vote-bar"><div class="vote-bar-fill" style="width:${pct}%"></div></div>
          <div class="vote-count">${count} voto${count === 1 ? '' : 's'}</div>
        </div>
        <div class="vote-chips">
          ${voters.length
            ? voters.map(n => `<span class="vote-chip">${esc(n)}</span>`).join('')
            : '<span class="no-votes">Aún sin votos</span>'}
        </div>
        <button class="btn-vote" data-option-id="${o.id}" data-option-title="${esc(o.title)}">Votar por esta opción</button>
      </div>
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.btn-vote').forEach(btn => {
    btn.addEventListener('click', () => openVoteModal(
      Number(btn.dataset.optionId), btn.dataset.optionTitle
    ));
  });
}

// ---------- Modal: votar ----------

const voteModal = document.getElementById('voteModal');
const voteError = document.getElementById('voteError');

function openVoteModal(optionId, optionTitle) {
  selectedOptionId = optionId;
  document.getElementById('voteOptionName').textContent = optionTitle;
  const select = document.getElementById('voteMember');
  select.innerHTML = '<option value="">Selecciona tu nombre…</option>' +
    members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');

  const savedId = localStorage.getItem('gib_member_id');
  if (savedId && members.some(m => m.id === Number(savedId))) select.value = savedId;

  document.getElementById('votePin').value = '';
  voteError.textContent = '';
  voteModal.classList.add('open');
}

document.getElementById('voteSubmit').addEventListener('click', async () => {
  const memberId = Number(document.getElementById('voteMember').value);
  const pin = document.getElementById('votePin').value.trim();
  voteError.textContent = '';

  if (!memberId) { voteError.textContent = 'Selecciona tu nombre.'; return; }
  if (!/^\d{4}$/.test(pin)) { voteError.textContent = 'El PIN son 4 dígitos.'; return; }

  const btn = document.getElementById('voteSubmit');
  btn.disabled = true;

  const { data, error } = await db.rpc('cast_vote', {
    p_member_id: memberId, p_pin: pin, p_option_id: selectedOptionId,
  });

  btn.disabled = false;

  if (error) { voteError.textContent = 'Error de conexión. Intenta de nuevo.'; return; }
  if (!data.ok) { voteError.textContent = data.error; return; }

  localStorage.setItem('gib_member_id', String(memberId));
  voteModal.classList.remove('open');
  showToast('✓ Voto registrado');
  await refreshVotes();
});

// ---------- Modal: saldo ----------

const balanceModal = document.getElementById('balanceModal');
const balanceError = document.getElementById('balanceError');

document.getElementById('btnEditBalance').addEventListener('click', () => {
  document.getElementById('balanceInput').value = '';
  document.getElementById('balancePin').value = '';
  balanceError.textContent = '';
  balanceModal.classList.add('open');
});

function parseCOP(str) {
  // Acepta "95.893.532,36", "95893532.36", "95,893,532.36", "$ 95.893.532"
  let s = str.replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');   // formato es-CO
  } else {
    s = s.replace(/,/g, '');                       // formato en-US
  }
  return Number(s);
}

document.getElementById('balanceSubmit').addEventListener('click', async () => {
  const raw = document.getElementById('balanceInput').value;
  const pin = document.getElementById('balancePin').value.trim();
  balanceError.textContent = '';

  const amount = parseCOP(raw);
  if (isNaN(amount) || amount < 0) { balanceError.textContent = 'Monto no válido.'; return; }
  if (!/^\d{4}$/.test(pin)) { balanceError.textContent = 'El PIN son 4 dígitos.'; return; }

  const admin = members.find(m => m.is_admin);
  if (!admin) { balanceError.textContent = 'No hay administrador configurado.'; return; }

  const btn = document.getElementById('balanceSubmit');
  btn.disabled = true;

  const { data, error } = await db.rpc('update_balance', {
    p_member_id: admin.id, p_pin: pin, p_balance: amount,
  });

  btn.disabled = false;

  if (error) { balanceError.textContent = 'Error de conexión. Intenta de nuevo.'; return; }
  if (!data.ok) { balanceError.textContent = data.error; return; }

  balanceModal.classList.remove('open');
  showToast('✓ Saldo actualizado');
  const { data: f } = await db.from('fund').select('*').eq('id', 1).single();
  if (f) { fund = f; renderBalance(); }
});

// ---------- Cierre de modales / toast ----------

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.hasAttribute('data-close')) {
      overlay.classList.remove('open');
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---------- Init ----------

loadAll();
