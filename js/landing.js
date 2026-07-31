/* =========================================================================
   LANDING.JS — Catálogo público
   -------------------------------------------------------------------------
   Índice:
   1. Referencias DOM + datos del negocio (footer / whatsapp)
   2. Utilidades
   3. Render de tarjetas (producto / promo)
   4. Carga de datos (Supabase)
   5. Filtros (búsqueda + categoría)
   6. FX — efectos de entrada al hacer scroll (ligeros, sin librerías)
   7. Init
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. Referencias DOM + datos del negocio
   ------------------------------------------------------------------------- */
document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('copyName').textContent = NEGOCIO.nombre;
document.getElementById('direccion').textContent = NEGOCIO.direccion;
document.getElementById('linkFacebook').href = NEGOCIO.facebook;
document.getElementById('linkInstagram').href = NEGOCIO.instagram;

const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;
document.getElementById('linkWhats').href = waHref;

const waLink = document.getElementById('waTexto');
waLink.href = waHref;
waLink.textContent = `+${WHATSAPP_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{4}).*/, '$1 $2 $3 $4')}`;

let PRODUCTOS = []; // cache para el buscador
let BUSQUEDA = '';
let CAT_ACTIVA = 'Todos';

/* -------------------------------------------------------------------------
   2. Utilidades
   ------------------------------------------------------------------------- */

/** Construye el enlace de WhatsApp con el mensaje solicitado */
function linkWhatsApp(nombre, precio) {
  const precioFmt = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(precio || 0));
  const msg = `Hola, me interesa comprar ${nombre} por el precio de $${precioFmt}. ¿Tienen disponibilidad?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* -------------------------------------------------------------------------
   3. Render de tarjetas
   ------------------------------------------------------------------------- */

/** Tarjeta HTML de un producto */
function cardProducto(p) {
  const img = p.imagen_url
    ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" />`
    : '<i class="fa-solid fa-wine-bottle"></i>';

  return `
    <article class="producto card reveal">
      <div class="producto-img">${img}</div>
      <div class="producto-body">
        ${p.categoria ? `<span class="producto-cat">${esc(p.categoria)}</span>` : ''}
        <h3 class="producto-nombre">${esc(p.nombre)}</h3>
        <p class="producto-desc">${esc(p.descripcion || '')}</p>
        <div class="producto-foot">
          <span class="producto-precio">${money(p.precio_venta)}</span>
          <span class="stock-badge">Disponible</span>
        </div>
        <a class="btn btn-wa btn-block" target="_blank" rel="noopener"
           href="${linkWhatsApp(p.nombre, p.precio_venta)}">
           <i class="fa-brands fa-whatsapp"></i> Comprar por WhatsApp
        </a>
      </div>
    </article>`;
}

/** Tarjeta HTML de una promoción */
function cardPromo(p) {
  const img = p.imagen_url
    ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.titulo)}" loading="lazy" decoding="async" />`
    : '<i class="fa-solid fa-tags"></i>';

  let badge = '';
  if (p.descuento_pct) badge = `<span class="promo-badge">-${p.descuento_pct}%</span>`;
  else if (p.precio_promo) badge = `<span class="promo-badge">OFERTA</span>`;

  const precio = p.precio_promo ? `<span class="promo-precio">${money(p.precio_promo)}</span>` : '';
  const wa = linkWhatsApp(p.titulo, p.precio_promo || 0);

  return `
    <article class="promo-card card reveal">
      <div class="promo-img">${img}${badge}</div>
      <div class="promo-body">
        <h3>${esc(p.titulo)}</h3>
        <p class="muted">${esc(p.descripcion || '')}</p>
        ${precio}
        <a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${wa}">
          <i class="fa-brands fa-whatsapp"></i> Pedir promoción
        </a>
      </div>
    </article>`;
}

/** Pinta un listado de productos en el grid */
function render(lista) {
  const grid = document.getElementById('grid');

  if (!lista.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wine-glass-empty" style="font-size:2rem;color:var(--gold);margin-bottom:10px;display:block"></i>No hay productos disponibles por ahora. ¡Vuelve pronto!</div>`;
    return;
  }

  grid.innerHTML = lista.map(cardProducto).join('');
  FX.observe('#grid .producto');
}

/* -------------------------------------------------------------------------
   4. Carga de datos (Supabase)
   ------------------------------------------------------------------------- */

/** Carga las promociones vigentes (RLS ya filtra por fecha/activo) */
async function cargarPromos() {
  const { data, error } = await db
    .from(DB.promociones)
    .select('id, titulo, descripcion, precio_promo, descuento_pct, imagen_url, producto_id, fecha_fin')
    .order('created_at', { ascending: false });

  if (error || !data || !data.length) return; // silencioso: la sección queda oculta

  document.getElementById('promos').classList.remove('hidden');
  const grid = document.getElementById('promosGrid');
  grid.innerHTML = data.map(cardPromo).join('');
  FX.observe('#promosGrid .promo-card');
}

/** Carga inicial de productos desde Supabase */
async function cargarCatalogo() {
  const { data, error } = await db
    .from(DB.productos)
    .select('id, nombre, descripcion, categoria, precio_venta, stock_actual, imagen_url')
    .gt('stock_actual', 0)
    .order('nombre', { ascending: true });

  if (error) {
    console.error(error);
    document.getElementById('grid').innerHTML =
      `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:var(--red);margin-right:6px"></i>No se pudo cargar el catálogo.<br>${esc(error.message)}</div>`;
    return;
  }

  PRODUCTOS = data || [];
  aplicarFiltros();
}

/** Chips de categorías (tabla categorias de Supabase) */
async function cargarCategorias() {
  const { data } = await db.from(DB.categorias).select('nombre').order('nombre');
  const cats = ['Todos', ...(data || []).map((c) => c.nombre)];
  const cont = document.getElementById('catFiltros');

  cont.innerHTML = cats
    .map((c, i) => `<button class="cat-chip ${i === 0 ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join('');

  cont.querySelectorAll('.cat-chip').forEach((b) =>
    b.addEventListener('click', () => {
      cont.querySelectorAll('.cat-chip').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      CAT_ACTIVA = b.dataset.cat;
      aplicarFiltros();
    })
  );
}

/* -------------------------------------------------------------------------
   5. Filtros (búsqueda + categoría)
   ------------------------------------------------------------------------- */

/** Aplica búsqueda + categoría activa sobre el cache */
function aplicarFiltros() {
  const q = BUSQUEDA;
  const lista = PRODUCTOS.filter((p) => {
    const okCat = CAT_ACTIVA === 'Todos' || (p.categoria || '') === CAT_ACTIVA;
    const okQ = !q || p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q);
    return okCat && okQ;
  });
  render(lista);
}

/** Buscador en vivo (filtra el cache), con pequeño debounce para no re-renderizar en cada tecla */
let buscadorTimeout = null;
document.getElementById('buscador').addEventListener('input', (e) => {
  clearTimeout(buscadorTimeout);
  const valor = e.target.value.trim().toLowerCase();
  buscadorTimeout = setTimeout(() => {
    BUSQUEDA = valor;
    aplicarFiltros();
  }, 120);
});

/* =========================================================================
   6. FX — Efectos de entrada al hacer scroll
   -------------------------------------------------------------------------
   Reemplaza anime.js por transiciones CSS nativas controladas con
   IntersectionObserver. Es más liviano, no bloquea el hilo principal y
   evita jank en catálogos con muchas tarjetas.
   ========================================================================= */
const FX = (() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIO = 'IntersectionObserver' in window;

  // Duración/curva se define en CSS (.reveal), aquí solo activamos la clase.
  const io = supportsIO
    ? new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            obs.unobserve(entry.target);
            entry.target.classList.add('reveal-in');
            // Libera la capa GPU una vez terminó la transición.
            entry.target.addEventListener(
              'transitionend',
              () => entry.target.classList.add('reveal-done'),
              { once: true }
            );
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      )
    : null;

  /** Observa elementos y les aplica un pequeño stagger según su posición */
  function observe(selector) {
    const els = document.querySelectorAll(selector);

    if (reduce || !supportsIO) {
      els.forEach((el) => el.classList.add('reveal-in', 'reveal-done'));
      return;
    }

    els.forEach((el, i) => {
      if (el.dataset.io) return;
      el.dataset.io = '1';
      // Stagger suave, con tope para que listas largas no tarden una eternidad.
      el.style.transitionDelay = `${Math.min(i % 8, 8) * 40}ms`;
      io.observe(el);
    });
  }

  return { observe };
})();

/* -------------------------------------------------------------------------
   7. Init
   ------------------------------------------------------------------------- */
FX.observe('.section-head');
FX.observe('.marcas');

cargarCategorias();
cargarCatalogo();
cargarPromos();