/* =========================================================================
   CLIENTE SUPABASE (singleton)
   Requiere que ANTES se cargue el CDN de supabase-js v2 y config.js
   ========================================================================= */
const { createClient } = supabase; // 'supabase' lo expone el CDN global

/* Multi-sesión por pestaña:
   Usamos sessionStorage en vez de localStorage. Cada pestaña tiene su propio
   sessionStorage, así puedes tener admin en una pestaña y cajero en otra al
   mismo tiempo sin que una sesión pise a la otra.
   Nota: al CERRAR la pestaña se cierra la sesión de esa pestaña (más seguro
   para un negocio). Recargar la misma pestaña sí mantiene la sesión. */
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.sessionStorage,
    storageKey: 'madnight-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* Formateador de moneda: solo signo $, sin decimales, sin prefijo COP/COL
   Ej: 50000 -> "$ 50.000" */
const money = (n) =>
  '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(n || 0));
