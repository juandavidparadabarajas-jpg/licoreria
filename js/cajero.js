/* =========================================================================
   CAJERO.JS — Punto de Venta + Visor de inventario
   ========================================================================= */

let PROFILE = null;
let PRODUCTOS = [];          // catálogo cargado
const CART = new Map();      // id -> { producto, cantidad }

/* --------------------- Arranque / seguridad --------------------- */
(async function init() {
  PROFILE = await requireAuth(ROLES.CAJERO);
  if (!PROFILE) return; // requireAuth ya redirigió
  document.getElementById('userName').textContent = PROFILE.nombre || PROFILE.email;
  await cargarProductos();
  cargarCategoriasPos();
})();

document.getElementById('btnLogout').addEventListener('click', logout);

/* --------------------- Navegación por pestañas --------------------- */
const VISTAS = ['pos', 'turno', 'inventario', 'gastos', 'historial', 'promos'];
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const v = t.dataset.view;
    VISTAS.forEach((name) =>
      document.getElementById('view-' + name).classList.toggle('hidden', v !== name)
    );
    if (v === 'inventario') { renderInventario(); llenarMovProductos(); }
    if (v === 'historial') cargarHistorial();
    if (v === 'promos') cargarPromosStaff();
    if (v === 'turno') cargarEstadoTurno();
    if (v === 'gastos') cargarGastosOp();
  })
);

/* --------------------- Carga de productos --------------------- */
async function cargarProductos() {
  const { data, error } = await db
    .from(DB.productos)
    .select('id, nombre, categoria, precio_venta, stock_actual')
    .order('nombre', { ascending: true });

  if (error) {
    err('Error cargando productos: ' + error.message);
    return;
  }
  PRODUCTOS = data || [];
  aplicarFiltrosPos();
}

let POS_BUSQUEDA = '';
let POS_CAT = 'Todos';

function aplicarFiltrosPos() {
  const q = POS_BUSQUEDA;
  renderPosGrid(
    PRODUCTOS.filter((p) => {
      const okCat = POS_CAT === 'Todos' || (p.categoria || '') === POS_CAT;
      const okQ = !q || p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q);
      return okCat && okQ;
    })
  );
}

/* Chips de categorías del POS (tabla categorias) */
async function cargarCategoriasPos() {
  const { data } = await db.from(DB.categorias).select('nombre').order('nombre');
  const cats = ['Todos', ...(data || []).map((c) => c.nombre)];
  const cont = document.getElementById('posCatFiltros');
  cont.innerHTML = cats
    .map((c, i) => `<button class="cat-chip ${i === 0 ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join('');
  cont.querySelectorAll('.cat-chip').forEach((b) =>
    b.addEventListener('click', () => {
      cont.querySelectorAll('.cat-chip').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      POS_CAT = b.dataset.cat;
      aplicarFiltrosPos();
    })
  );
}

/* --------------------- Grid de POS --------------------- */
function renderPosGrid(lista) {
  const grid = document.getElementById('posGrid');
  if (!lista.length) {
    grid.innerHTML = `<p class="muted">Sin resultados.</p>`;
    return;
  }
  grid.innerHTML = lista
    .map((p) => {
      const agotado = p.stock_actual <= 0;
      return `
      <div class="pos-card ${agotado ? 'sin-stock' : ''}" data-id="${p.id}">
        ${p.categoria ? `<span class="cat">${esc(p.categoria)}</span>` : ''}
        <span class="nombre">${esc(p.nombre)}</span>
        <span class="stock">Stock: ${p.stock_actual}</span>
        <span class="precio">${money(p.precio_venta)}</span>
      </div>`;
    })
    .join('');

  grid.querySelectorAll('.pos-card').forEach((c) =>
    c.addEventListener('click', () => addAlCarrito(c.dataset.id))
  );
}

document.getElementById('posSearch').addEventListener('input', (e) => {
  POS_BUSQUEDA = e.target.value.toLowerCase();
  aplicarFiltrosPos();
});

/* --------------------- Lógica del carrito --------------------- */
function addAlCarrito(id) {
  const prod = PRODUCTOS.find((p) => String(p.id) === String(id));
  if (!prod) return;
  const item = CART.get(id) || { producto: prod, cantidad: 0 };

  if (item.cantidad + 1 > prod.stock_actual) {
    err(`Stock insuficiente para ${prod.nombre} (máx: ${prod.stock_actual}).`);
    return;
  }
  item.cantidad += 1;
  CART.set(id, item);
  renderTicket();
}

function cambiarCantidad(id, delta) {
  const item = CART.get(id);
  if (!item) return;
  const nueva = item.cantidad + delta;
  if (nueva <= 0) {
    CART.delete(id);
  } else if (nueva > item.producto.stock_actual) {
    err(`Máximo disponible: ${item.producto.stock_actual}.`);
    return;
  } else {
    item.cantidad = nueva;
  }
  renderTicket();
}

function quitar(id) {
  CART.delete(id);
  renderTicket();
}

function renderTicket() {
  const cont = document.getElementById('ticketItems');
  const btnCobrar = document.getElementById('btnCobrar');

  if (CART.size === 0) {
    cont.innerHTML = `<p class="ticket-empty muted">Agrega productos desde la izquierda.</p>`;
    document.getElementById('ticketCount').textContent = '0';
    document.getElementById('ticketTotal').textContent = money(0);
    btnCobrar.disabled = true;
    return;
  }

  let total = 0;
  let count = 0;
  cont.innerHTML = [...CART.values()]
    .map(({ producto, cantidad }) => {
      const sub = producto.precio_venta * cantidad;
      total += sub;
      count += cantidad;
      return `
      <div class="ticket-line">
        <div>
          <div class="l-nombre">${esc(producto.nombre)}</div>
          <div class="l-precio">${money(producto.precio_venta)} c/u</div>
          <div class="qty">
            <button data-act="minus" data-id="${producto.id}">−</button>
            <span>${cantidad}</span>
            <button data-act="plus" data-id="${producto.id}">+</button>
          </div>
        </div>
        <div class="l-sub">${money(sub)}</div>
        <button class="l-del" data-act="del" data-id="${producto.id}"><i class="fa-solid fa-trash"></i> Quitar</button>
      </div>`;
    })
    .join('');

  cont.querySelectorAll('button[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      const { act, id } = b.dataset;
      if (act === 'plus') cambiarCantidad(id, 1);
      if (act === 'minus') cambiarCantidad(id, -1);
      if (act === 'del') quitar(id);
    })
  );

  document.getElementById('ticketCount').textContent = count;
  document.getElementById('ticketTotal').textContent = money(total);
  btnCobrar.disabled = false;
}

document.getElementById('btnClear').addEventListener('click', () => {
  CART.clear();
  renderTicket();
});

/* --------------------- Método de pago --------------------- */
let METODO_PAGO = 'Efectivo';
document.querySelectorAll('.pago-opt').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.pago-opt').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    METODO_PAGO = b.dataset.metodo;
  })
);

/* --------------------- Total de la sesión actual --------------------- */
let SESION_TOTAL = 0;

/* --------------------- Cobrar (RPC Supabase) --------------------- */
document.getElementById('btnCobrar').addEventListener('click', async () => {
  if (CART.size === 0) return;
  const btn = document.getElementById('btnCobrar');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  const items = [...CART.values()].map(({ producto, cantidad }) => ({
    producto_id: producto.id,
    cantidad,
    precio_unitario: producto.precio_venta,
  }));

  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  const { data, error } = await db.rpc(DB.rpcRegistrarVenta, {
    [DB.rpcParamItems]: items,
    [DB.rpcParamMetodo]: METODO_PAGO,
  });

  if (error) {
    err('No se pudo registrar la venta: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cash-register"></i> Cobrar';
    return;
  }

  SESION_TOTAL += total;
  document.getElementById('sesionTotal').textContent = money(SESION_TOTAL);
  ok(`Venta registrada (${METODO_PAGO}) · Total ${money(total)}`);
  CART.clear();
  renderTicket();
  await cargarProductos(); // refresca stock
  btn.innerHTML = '<i class="fa-solid fa-cash-register"></i> Cobrar';
});

/* --------------------- Visor de inventario --------------------- */
function renderInventario(filtro = '') {
  const q = filtro.toLowerCase();
  const lista = PRODUCTOS.filter(
    (p) => p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q)
  );
  const body = document.getElementById('invBody');

  if (!lista.length) {
    body.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Sin resultados.</td></tr>`;
    return;
  }
  body.innerHTML = lista
    .map((p) => {
      let pill = 'ok', txt = 'Disponible';
      if (p.stock_actual <= 0) { pill = 'out'; txt = 'Agotado'; }
      else if (p.stock_actual <= 5) { pill = 'low'; txt = 'Bajo'; }
      return `
      <tr>
        <td>${esc(p.nombre)}</td>
        <td class="muted">${esc(p.categoria || '—')}</td>
        <td>${money(p.precio_venta)}</td>
        <td><strong>${p.stock_actual}</strong></td>
        <td><span class="pill ${pill}">${txt}</span></td>
        <td><button class="icon-btn" data-edit-prod="${p.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button></td>
      </tr>`;
    })
    .join('');
  body.querySelectorAll('[data-edit-prod]').forEach((b) =>
    b.addEventListener('click', () => abrirModalProd(b.dataset.editProd))
  );
}

document.getElementById('invSearch').addEventListener('input', (e) =>
  renderInventario(e.target.value)
);

/* --------------------- Edición rápida de producto --------------------- */
const modalProdOp = document.getElementById('modalProdOp');

function abrirModalProd(id) {
  const p = PRODUCTOS.find((x) => String(x.id) === String(id));
  if (!p) return;
  document.getElementById('epId').value = p.id;
  document.getElementById('epNombre').value = p.nombre;
  document.getElementById('epCategoria').value = p.categoria || '';
  document.getElementById('epPrecio').value = p.precio_venta;
  document.getElementById('epStock').value = p.stock_actual;
  // categorías existentes como sugerencias
  const cats = [...new Set(PRODUCTOS.map((x) => x.categoria).filter(Boolean))];
  document.getElementById('epCatList').innerHTML = cats.map((c) => `<option value="${esc(c)}"></option>`).join('');
  modalProdOp.classList.remove('hidden');
}
function cerrarModalProd() { modalProdOp.classList.add('hidden'); }
modalProdOp.querySelectorAll('[data-close-prod]').forEach((b) => b.addEventListener('click', cerrarModalProd));
modalProdOp.addEventListener('click', (e) => { if (e.target === modalProdOp) cerrarModalProd(); });

document.getElementById('formProdOp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('epId').value;
  const payload = {
    nombre: document.getElementById('epNombre').value.trim(),
    categoria: document.getElementById('epCategoria').value.trim() || null,
    precio_venta: parseFloat(document.getElementById('epPrecio').value),
    stock_actual: parseInt(document.getElementById('epStock').value, 10),
  };
  const { error } = await db.from(DB.productos).update(payload).eq('id', id);
  if (error) { err('No se pudo actualizar: ' + error.message); return; }
  ok('Producto actualizado.');
  logAudit('EDITAR_PRODUCTO', `Actualizó "${payload.nombre}": precio ${money(payload.precio_venta)}, stock ${payload.stock_actual}`);
  cerrarModalProd();
  await cargarProductos();
  renderInventario(document.getElementById('invSearch').value);
  llenarMovProductos();
});

/* --------------------- Historial de ventas del cajero --------------------- */
function detalleItems(items) {
  if (!items || !items.length) return '<span class="muted">Sin detalle</span>';
  const lis = items
    .map((it) => `<li><span>${esc(it.nombre_snapshot)}</span><span class="det-cant">x${it.cantidad}</span></li>`)
    .join('');
  return `
    <details class="venta-det">
      <summary>${items.length} producto(s)</summary>
      <ul class="det-list">${lis}</ul>
    </details>`;
}

async function cargarHistorial() {
  const body = document.getElementById('histBody');
  // RLS limita las filas a las ventas del propio cajero.
  // Solo lectura: el Administrador Operativo no puede anular ni editar ventas.
  const { data, error } = await db
    .from(DB.ventas)
    .select('id, created_at, metodo_pago, total, estado, venta_items(nombre_snapshot, cantidad)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    body.innerHTML = `<tr><td colspan="5" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;padding:26px">Aún no tienes ventas registradas.</td></tr>`;
    return;
  }
  body.innerHTML = data
    .map((v) => {
      const anulada = v.estado === 'ANULADA';
      const fecha = new Date(v.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
      return `
      <tr class="${anulada ? 'row-anulada' : ''}">
        <td class="muted">${esc(fecha)}</td>
        <td>#${v.id}</td>
        <td>${detalleItems(v.venta_items)}</td>
        <td>${esc(v.metodo_pago || '—')}</td>
        <td class="${anulada ? 'muted' : 'gold'}">${money(v.total)}</td>
      </tr>`;
    })
    .join('');
}

document.getElementById('btnRefrescarHist').addEventListener('click', cargarHistorial);

/* --------------------- Promociones y combos (gestión) --------------------- */
let PROMOS_OP = [];
async function cargarPromosStaff() {
  const cont = document.getElementById('promosStaff');
  cont.innerHTML = '<div class="spinner"></div>';
  const { data, error } = await db
    .from(DB.promociones)
    .select('id, titulo, descripcion, precio_promo, descuento_pct, imagen_url, producto_id, fecha_inicio, fecha_fin, activo')
    .order('created_at', { ascending: false });
  if (error) { cont.innerHTML = `<p class="text-red">${esc(error.message)}</p>`; return; }
  PROMOS_OP = data || [];
  if (!PROMOS_OP.length) { cont.innerHTML = '<p class="muted">Aún no hay promociones. Crea la primera.</p>'; return; }
  cont.innerHTML = PROMOS_OP
    .map((p) => {
      const badge = p.descuento_pct ? `-${p.descuento_pct}%` : (p.precio_promo ? 'OFERTA' : '');
      const img = p.imagen_url
        ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.titulo)}" />`
        : '<i class="fa-solid fa-tags"></i>';
      return `
      <div class="promo-staff-card card">
        <div class="promo-staff-img">${img}${badge ? `<span class="promo-badge">${badge}</span>` : ''}
          ${p.activo ? '' : '<span class="promo-badge" style="background:var(--surface-2);left:10px;right:auto">INACTIVA</span>'}
        </div>
        <div class="promo-staff-body">
          <h3>${esc(p.titulo)}</h3>
          <p class="muted">${esc(p.descripcion || '')}</p>
          ${p.precio_promo ? `<span class="gold" style="font-weight:700;font-size:1.2rem">${money(p.precio_promo)}</span>` : ''}
          ${p.fecha_fin ? `<span class="muted" style="font-size:0.78rem">Hasta ${esc(p.fecha_fin)}</span>` : ''}
          <div class="flex gap" style="margin-top:8px">
            <button class="icon-btn" data-edit-promo="${p.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
            <button class="icon-btn del" data-del-promo="${p.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    })
    .join('');
  cont.querySelectorAll('[data-edit-promo]').forEach((b) =>
    b.addEventListener('click', () => abrirModalPromoOp(b.dataset.editPromo))
  );
  cont.querySelectorAll('[data-del-promo]').forEach((b) =>
    b.addEventListener('click', () => eliminarPromoOp(b.dataset.delPromo))
  );
}

document.getElementById('btnRefrescarPromos').addEventListener('click', cargarPromosStaff);

/* Modal de promoción (crear / editar) */
const modalPromoOp = document.getElementById('modalPromoOp');

function abrirModalPromoOp(id = null) {
  const f = document.getElementById('formPromoOp');
  f.reset();
  document.getElementById('poId').value = '';
  document.getElementById('promoOpTitle').textContent = 'Nueva promoción';
  document.getElementById('poInicio').value = new Date().toISOString().slice(0, 10);
  document.getElementById('poActivo').checked = true;
  document.getElementById('poProducto').innerHTML =
    '<option value="">— Ninguno —</option>' +
    PRODUCTOS.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

  if (id) {
    const p = PROMOS_OP.find((x) => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('promoOpTitle').textContent = 'Editar promoción';
    document.getElementById('poId').value = p.id;
    document.getElementById('poTitulo').value = p.titulo;
    document.getElementById('poDesc').value = p.descripcion || '';
    document.getElementById('poProducto').value = p.producto_id || '';
    document.getElementById('poPrecio').value = p.precio_promo ?? '';
    document.getElementById('poDescuento').value = p.descuento_pct ?? '';
    document.getElementById('poInicio').value = p.fecha_inicio;
    document.getElementById('poFin').value = p.fecha_fin || '';
    document.getElementById('poActivo').checked = p.activo;
  }
  modalPromoOp.classList.remove('hidden');
}
function cerrarModalPromoOp() { modalPromoOp.classList.add('hidden'); }
document.getElementById('btnNuevaPromoOp').addEventListener('click', () => abrirModalPromoOp());
modalPromoOp.querySelectorAll('[data-close-promo]').forEach((b) => b.addEventListener('click', cerrarModalPromoOp));
modalPromoOp.addEventListener('click', (e) => { if (e.target === modalPromoOp) cerrarModalPromoOp(); });

document.getElementById('formPromoOp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('poId').value;
  const payload = {
    titulo: document.getElementById('poTitulo').value.trim(),
    descripcion: document.getElementById('poDesc').value.trim() || null,
    producto_id: document.getElementById('poProducto').value || null,
    precio_promo: document.getElementById('poPrecio').value ? parseFloat(document.getElementById('poPrecio').value) : null,
    descuento_pct: document.getElementById('poDescuento').value ? parseFloat(document.getElementById('poDescuento').value) : null,
    fecha_inicio: document.getElementById('poInicio').value,
    fecha_fin: document.getElementById('poFin').value || null,
    activo: document.getElementById('poActivo').checked,
  };
  let error;
  if (id) ({ error } = await db.from(DB.promociones).update(payload).eq('id', id));
  else ({ error } = await db.from(DB.promociones).insert(payload));
  if (error) { err('No se pudo guardar: ' + error.message); return; }
  ok(id ? 'Promoción actualizada.' : 'Promoción creada.');
  logAudit(id ? 'EDITAR_PROMOCION' : 'CREAR_PROMOCION', `${id ? 'Actualizó' : 'Creó'} la promoción "${payload.titulo}"`);
  cerrarModalPromoOp();
  cargarPromosStaff();
});

async function eliminarPromoOp(id) {
  const p = PROMOS_OP.find((x) => String(x.id) === String(id));
  if (!confirm(`¿Eliminar la promoción "${p?.titulo}"?`)) return;
  const { error } = await db.from(DB.promociones).delete().eq('id', id);
  if (error) { err('No se pudo eliminar: ' + error.message); return; }
  ok('Promoción eliminada.');
  logAudit('ELIMINAR_PROMOCION', `Eliminó la promoción "${p?.titulo}"`);
  cargarPromosStaff();
}

/* =========================================================================
   TURNO — apertura y cierre a ciegas (blind balance)
   ========================================================================= */
async function cargarEstadoTurno() {
  // Busca un turno ABIERTO del operativo (RLS limita a los propios).
  const { data } = await db
    .from(DB.turnos)
    .select('id, apertura_at, monto_apertura, estado')
    .eq('estado', 'ABIERTO')
    .order('apertura_at', { ascending: false })
    .limit(1);

  const abierto = data && data[0];
  const apertura = document.getElementById('turnoApertura');
  const cierre = document.getElementById('turnoCierre');

  if (abierto) {
    apertura.classList.add('hidden');
    cierre.classList.remove('hidden');
    const desde = new Date(abierto.apertura_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    document.getElementById('turnoInfo').innerHTML =
      `Turno abierto desde <strong>${esc(desde)}</strong> · Base: <strong>${money(abierto.monto_apertura)}</strong>`;
  } else {
    apertura.classList.remove('hidden');
    cierre.classList.add('hidden');
  }
}

document.getElementById('formApertura').addEventListener('submit', async (e) => {
  e.preventDefault();
  const base = parseFloat(document.getElementById('turnoBase').value) || 0;
  const { error } = await db.rpc(DB.rpcAbrirTurno, { p_base: base });
  if (error) { err('No se pudo abrir el turno: ' + error.message); return; }
  ok('Turno abierto.');
  logAudit('ABRIR_TURNO', `Abrió turno con base ${money(base)}`);
  cargarEstadoTurno();
});

document.getElementById('formCierre').addEventListener('submit', async (e) => {
  e.preventDefault();
  const contado = parseFloat(document.getElementById('turnoContado').value);
  if (isNaN(contado) || contado < 0) { err('Ingresa el efectivo contado.'); return; }
  // Cierre a ciegas: el sistema calcula el descuadre internamente y NO lo muestra.
  const { error } = await db.rpc(DB.rpcCerrarTurnoCiego, { p_contado: contado });
  if (error) { err('No se pudo cerrar el turno: ' + error.message); return; }
  document.getElementById('formCierre').reset();
  ok('Turno cerrado. El conteo quedó registrado.');
  // No se registra el teórico ni el descuadre (cierre a ciegas).
  logAudit('CERRAR_TURNO', `Cerró turno declarando ${money(contado)} en efectivo contado`);
  cargarEstadoTurno();
});

/* =========================================================================
   CAJA CHICA — gastos con concepto obligatorio
   ========================================================================= */
async function cargarGastosOp() {
  document.getElementById('goFecha').value ||= new Date().toISOString().slice(0, 10);
  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from(DB.gastos)
    .select('concepto, monto, created_at')
    .gte('fecha', hoy)
    .order('created_at', { ascending: false });
  const body = document.getElementById('gastosOpBody');
  if (error) { body.innerHTML = `<tr><td colspan="3" class="text-red">${esc(error.message)}</td></tr>`; return; }
  if (!data.length) { body.innerHTML = `<tr><td colspan="3" class="muted" style="text-align:center;padding:20px">Sin gastos hoy.</td></tr>`; return; }
  body.innerHTML = data
    .map((g) => `
      <tr>
        <td class="muted">${esc(new Date(g.created_at).toLocaleTimeString('es-CO', { timeStyle: 'short' }))}</td>
        <td>${esc(g.concepto)}</td>
        <td class="text-red">${money(g.monto)}</td>
      </tr>`)
    .join('');
}

document.getElementById('formGastoOp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const concepto = document.getElementById('goConcepto').value.trim();
  if (!concepto) { err('El concepto / justificación es obligatorio.'); return; }
  const payload = {
    concepto,
    categoria: 'Caja chica',
    monto: parseFloat(document.getElementById('goMonto').value),
    fecha: document.getElementById('goFecha').value,
    registrado_por: PROFILE.id,
  };
  const { error } = await db.from(DB.gastos).insert(payload);
  if (error) { err('No se pudo registrar: ' + error.message); return; }
  ok('Gasto de caja chica registrado.');
  logAudit('REGISTRAR_GASTO', `Registró gasto de caja chica: "${concepto}" por ${money(payload.monto)}`);
  e.target.reset();
  document.getElementById('goFecha').value = new Date().toISOString().slice(0, 10);
  cargarGastosOp();
});

/* =========================================================================
   MOVIMIENTOS DE STOCK — entrada / salida
   ========================================================================= */
function llenarMovProductos() {
  const sel = document.getElementById('movProducto');
  const actual = sel.value;
  sel.innerHTML = '<option value="">Selecciona...</option>' +
    PRODUCTOS.map((p) => `<option value="${p.id}">${esc(p.nombre)} (stock ${p.stock_actual})</option>`).join('');
  if (actual) sel.value = actual;
}

document.getElementById('formMov').addEventListener('submit', async (e) => {
  e.preventDefault();
  const producto_id = document.getElementById('movProducto').value;
  const tipo = document.getElementById('movTipo').value;
  const cantidad = parseInt(document.getElementById('movCantidad').value, 10);
  const motivo = document.getElementById('movMotivo').value.trim();
  if (!producto_id) { err('Selecciona un producto.'); return; }
  if (!motivo) { err('El motivo es obligatorio.'); return; }

  const { error } = await db.rpc(DB.rpcMovimientoStock, {
    p_producto_id: Number(producto_id),
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });
  if (error) { err('No se pudo registrar el movimiento: ' + error.message); return; }
  ok(`${tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} de ${cantidad} registrada.`);
  const prod = PRODUCTOS.find((p) => String(p.id) === String(producto_id));
  logAudit('MOVIMIENTO_STOCK', `${tipo} de ${cantidad} u. en "${prod?.nombre || producto_id}" (motivo: ${motivo})`);
  e.target.reset();
  await cargarProductos();     // refresca stock
  renderInventario(document.getElementById('invSearch').value);
  llenarMovProductos();
});
