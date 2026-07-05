-- =============================================================
-- Agregar opciones: Indie Universe y Nido de Agua
-- Pegar en el SQL Editor de Supabase y ejecutar
-- =============================================================

insert into options (title, description, highlights, link, sort) values
  (
    'Indie Universe',
    'Proyecto de inversión inmobiliaria en Medellín a través de LOKL. Oportunidad de participar en desarrollo urbano con ticket de entrada accesible (~$5.4M COP).',
    '["Inversión desde ~$5.4M COP", "Ubicación: Medellín", "Plataforma LOKL con track record", "Modelo de crowdfunding regulado"]',
    'https://www.lokl.life/indie-universe',
    5
  ),
  (
    'Nido de Agua',
    'Proyecto exclusivo de inversión inmobiliaria de LOKL. Desarrollo con enfoque en naturaleza y bienestar.',
    '["Proyecto exclusivo LOKL", "Enfoque en naturaleza y bienestar", "Inversión fraccionada accesible", "Modelo de inversión colectiva"]',
    'https://www.lokl.life/nido-de-agua',
    6
  );
