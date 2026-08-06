/* =========================================================================
   ADMIN.JS — Dashboard: métricas, gráficos, CRUD productos, usuarios
   ========================================================================= */

let PROFILE = null;
let PRODUCTOS = [];
let chartVentas = null;
let chartStock = null;
let chartFin = null;

/* --------------------- Arranque / seguridad --------------------- */
(async function init() {
  PROFILE = await requireAuth(ROLES.ADMIN);
  if (!PROFILE) return;
  document.getElementById('userName').textContent = PROFILE.nombre || PROFILE.email;
  await Promise.all([cargarProductos(), cargarMetricas(), cargarCategoriasAdmin()]);
})();

document.getElementById('btnLogout').addEventListener('click', logout);

/* --------------------- Navegación lateral --------------------- */
const titulos = {
  dashboard: 'Dashboard',
  finanzas: 'Finanzas y contabilidad',
  ventas: 'Historial de ventas',
  productos: 'Gestión de productos',
  promociones: 'Gestión de promociones',
  gastos: 'Registro de gastos',
  caja: 'Cierre de caja',
  auditoria: 'Auditoría operativa',
  usuarios: 'Gestión de usuarios',
};
let VISTA_ACTUAL = 'dashboard';
document.querySelectorAll('.side-link[data-view]').forEach((link) =>
  link.addEventListener('click', () => {
    const v = link.dataset.view;
    VISTA_ACTUAL = v;
    document.querySelectorAll('.side-link').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('viewTitle').textContent = titulos[v];
    document.querySelectorAll('.view').forEach((s) => s.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    if (v === 'usuarios') cargarUsuarios();
    if (v === 'productos') renderProductos();
    if (v === 'finanzas') cargarFinanzas();
    if (v === 'promociones') cargarPromociones();
    if (v === 'gastos') cargarGastos();
    if (v === 'caja') cargarCaja();
    if (v === 'auditoria') cargarAuditoria();
    if (v === 'ventas') cargarHistorialVentas();
  })
);

/* =========================================================================
   AYUDA CONTEXTUAL — guía "qué es / para qué sirve / cómo se usa" por sección
   ========================================================================= */
const AYUDA = {
  dashboard: {
    titulo: 'Dashboard',
    que: 'Es la pantalla de inicio: un resumen rápido de cómo va el negocio hoy.',
    sirve: 'Ver de un vistazo las ventas del día, la ganancia neta, cuántos tickets se han hecho y cómo está el inventario, sin tener que buscar nada.',
    usar: [
      'Las tarjetas de arriba muestran los números clave de HOY: total vendido, cuánto entró en efectivo, cuánto en transferencia o banco, la ganancia, las transacciones y los productos en catálogo.',
      '"En efectivo" y "En transferencia / banco" suman por separado; juntos dan el total vendido del día.',
      'El gráfico de líneas muestra la evolución de las ventas de los últimos 7 días y el de barras los 8 productos con más stock.',
    ],
    nota: 'Estos números se actualizan solos cada vez que entras. Si anulas una venta, el dashboard lo refleja al instante.',
  },
  finanzas: {
    titulo: 'Finanzas y contabilidad',
    que: 'Es la contabilidad del negocio: ingresos, costos, gastos y ganancia real.',
    sirve: 'Saber cuánto ganó realmente el negocio en un periodo (hoy, este mes, este año o el rango que elijas), descontando el costo de la mercancía y los gastos.',
    usar: [
      'Elige un rango con los campos "Desde" y "Hasta" y presiona "Aplicar", o usa los botones rápidos "Hoy", "Este mes" y "Este año".',
      'La tarjeta destacada "Utilidad neta" es la ganancia final real: ingresos menos costo de mercancía menos gastos.',
      'El gráfico compara ingresos, costos, gastos y utilidad para entender de dónde salen los números.',
    ],
    nota: 'La utilidad neta se muestra en verde cuando hay ganancia y en rojo si el periodo dio pérdida.',
  },
  ventas: {
    titulo: 'Historial de ventas',
    que: 'Es el listado de todas las ventas registradas en el sistema.',
    sirve: 'Consultar qué se vendió, cuándo, con qué método de pago, y anular una venta si se cobró algo por error.',
    usar: [
      'Por defecto se muestran las ventas del día en curso. Cambia la fecha para revisar cualquier día anterior (por ejemplo, un cierre pasado), o usa "Ver todo" para el listado completo.',
      'Cada fila es una venta. Toca el número de productos para desplegar el detalle de lo que incluyó.',
      'El botón "Anular" cancela una venta hecha por error: devuelve el stock automáticamente y la deja marcada en rojo.',
    ],
    nota: 'Consultar días pasados no altera nada: ni el día en curso ni ningún otro. Anular NO borra la venta: queda registrada como ANULADA para constancia pero se excluye de la contabilidad. Solo la dueña puede anular.',
  },
  productos: {
    titulo: 'Gestión de productos',
    que: 'Es el catálogo completo de la licorería.',
    sirve: 'Crear productos nuevos, editar precios, costos y stock, subir fotos y ver el margen de ganancia de cada uno.',
    usar: [
      'Usa el buscador o el filtro por categoría para encontrar un producto.',
      'Presiona "Nuevo producto" para agregar uno; en el formulario puedes subir una imagen o pegar una URL.',
      'En cada fila, el ícono de lápiz edita el producto y el de papelera lo elimina.',
    ],
    nota: 'Todo lo que cambies aquí se refleja al instante en la tienda pública. Un producto sin stock desaparece solo del catálogo del cliente.',
  },
  promociones: {
    titulo: 'Gestión de promociones',
    que: 'Es donde se crean y administran las ofertas y combos.',
    sirve: 'Mostrar promociones en la tienda pública durante el periodo que elijas, con precio especial o descuento.',
    usar: [
      'Presiona "Nueva promoción" y completa título, producto relacionado, precio o descuento y fechas de vigencia.',
      'Marca la casilla "Promoción activa" para que se muestre; desmárcala para ocultarla sin borrarla.',
      'Edita o elimina cualquier promoción con los íconos de cada fila.',
    ],
    nota: 'Solo se muestran en la tienda las promociones ACTIVAS y dentro de su rango de fechas. La columna "Estado" te dice si está vigente.',
  },
  gastos: {
    titulo: 'Registro de gastos',
    que: 'Es el registro de los egresos del negocio.',
    sirve: 'Anotar todo lo que sale de caja (proveedores, arriendo, servicios, nómina, etc.) para que la contabilidad refleje la ganancia real.',
    usar: [
      'Llena el formulario de la izquierda: concepto, categoría, monto y fecha. El concepto es obligatorio.',
      'Presiona "Registrar gasto" y aparecerá al instante en la lista de la derecha.',
      'La lista muestra los gastos recientes con su total; usa la papelera para eliminar uno.',
    ],
    nota: 'Todo gasto que registres aquí se descuenta automáticamente de la utilidad en la sección de Finanzas.',
  },
  caja: {
    titulo: 'Cierre de caja',
    que: 'Es el control del dinero: cierres del día y auditoría de los turnos del personal.',
    sirve: 'Configurar el cierre automático diario, hacer un cierre manual y comparar lo que el personal contó contra lo que el sistema esperaba.',
    usar: [
      'En "Configuración de Caja" fija la hora del cierre automático diario y guárdala.',
      'Usa "Ejecutar cierre ahora" solo si necesitas cerrar el día en curso de inmediato.',
      'La tabla "Turnos y descuadres" muestra los cierres a ciegas del personal: base, contado, teórico y si hubo faltante o sobrante.',
    ],
    nota: 'El personal del local NUNCA ve el descuadre: cuentan el efectivo a ciegas y solo tú, como dueña, ves la comparación aquí.',
  },
  auditoria: {
    titulo: 'Auditoría operativa',
    que: 'Es la bitácora automática de todas las acciones importantes del sistema.',
    sirve: 'Saber quién hizo qué y cuándo: si alguien editó un producto, creó una promoción, registró un gasto o anuló una venta.',
    usar: [
      'Cada fila registra fecha y hora, usuario, tipo de acción y el detalle.',
      'Escribe en el filtro para buscar por usuario, acción o detalle.',
      'Usa "Actualizar" para traer los registros más recientes.',
    ],
    nota: 'Esta bitácora se llena sola: no hay que registrar nada a mano. Es tu respaldo para revisar cualquier movimiento del personal.',
  },
  usuarios: {
    titulo: 'Gestión de usuarios',
    que: 'Es donde administras las cuentas de acceso del personal.',
    sirve: 'Crear cuentas para el personal del local (Administrador Operativo), reiniciar contraseñas y quitar el acceso a quien ya no trabaje.',
    usar: [
      'En el formulario de la izquierda crea una cuenta con nombre, correo y una contraseña temporal.',
      'En la lista de la derecha, "Reset" envía al usuario un correo para que cambie su contraseña.',
      'La papelera elimina el acceso de un usuario (no puedes eliminarte a ti misma).',
    ],
    nota: 'El Administrador Operativo tiene permisos limitados: no puede editar precios ni márgenes, ni anular ventas. Ese control es solo tuyo.',
  },
};

const modalAyuda = document.getElementById('modalAyuda');

function renderAyuda(v) {
  const a = AYUDA[v];
  if (!a) return;
  document.querySelector('#ayudaTitle span').textContent = 'Ayuda · ' + a.titulo;
  const pasos = a.usar.map((p) => `<li>${esc(p)}</li>`).join('');
  document.getElementById('ayudaBody').innerHTML = `
    <div class="help-section">
      <div class="help-ico"><i class="fa-solid fa-lightbulb"></i></div>
      <div><h4>¿Qué es?</h4><p>${esc(a.que)}</p></div>
    </div>
    <div class="help-section">
      <div class="help-ico"><i class="fa-solid fa-bullseye"></i></div>
      <div><h4>¿Para qué sirve?</h4><p>${esc(a.sirve)}</p></div>
    </div>
    <div class="help-section">
      <div class="help-ico"><i class="fa-solid fa-list-check"></i></div>
      <div><h4>¿Cómo se usa?</h4><ol class="help-steps">${pasos}</ol></div>
    </div>
    ${a.nota ? `<div class="help-note"><i class="fa-solid fa-circle-exclamation"></i><span>${esc(a.nota)}</span></div>` : ''}`;
}

function abrirAyuda() {
  renderAyuda(VISTA_ACTUAL);
  const wa = document.getElementById('ayudaWhatsApp');
  const msg = encodeURIComponent(`Hola, necesito ayuda con la sección "${AYUDA[VISTA_ACTUAL]?.titulo || ''}" del panel de administración.`);
  wa.href = `https://wa.me/${SOPORTE_WHATSAPP}?text=${msg}`;
  modalAyuda.classList.remove('hidden');
}
function cerrarAyuda() { modalAyuda.classList.add('hidden'); }

document.getElementById('btnAyuda').addEventListener('click', abrirAyuda);
modalAyuda.querySelectorAll('[data-close-ayuda]').forEach((b) => b.addEventListener('click', cerrarAyuda));
modalAyuda.addEventListener('click', (e) => { if (e.target === modalAyuda) cerrarAyuda(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalAyuda.classList.contains('hidden')) cerrarAyuda(); });

/* =========================================================================
   PRODUCTOS (carga compartida)
   ========================================================================= */
async function cargarProductos() {
  const { data, error } = await db
    .from(DB.productos)
    .select('id, nombre, descripcion, categoria, costo_unitario, precio_venta, stock_actual, imagen_url')
    .order('nombre', { ascending: true });
  if (error) { err('Error productos: ' + error.message); return; }
  PRODUCTOS = data || [];
  document.getElementById('mProductos').textContent = PRODUCTOS.length;
  renderProductos();
  renderChartStock();
}

/* --------------------- Categorías --------------------- */
let CATEGORIAS = [];
async function cargarCategoriasAdmin() {
  const { data } = await db.from(DB.categorias).select('nombre').order('nombre');
  CATEGORIAS = (data || []).map((c) => c.nombre);
  document.getElementById('catDatalist').innerHTML =
    CATEGORIAS.map((c) => `<option value="${esc(c)}"></option>`).join('');
  document.getElementById('prodCatFilter').innerHTML =
    '<option value="">Todas las categorías</option>' +
    CATEGORIAS.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

/* --------------------- Tabla de productos (CRUD) --------------------- */
let PROD_CAT = '';
function renderProductos(filtro = '') {
  const q = filtro.toLowerCase();
  const lista = PRODUCTOS.filter((p) => {
    const okCat = !PROD_CAT || (p.categoria || '') === PROD_CAT;
    const okQ = p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q);
    return okCat && okQ;
  });
  const body = document.getElementById('prodBody');
  if (!lista.length) {
    body.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin productos.</td></tr>`;
    return;
  }
  body.innerHTML = lista
    .map((p) => {
      const margen = p.precio_venta - p.costo_unitario;
      const pct = p.costo_unitario > 0 ? ((margen / p.costo_unitario) * 100).toFixed(0) : '—';
      let pill = 'ok';
      if (p.stock_actual <= 0) pill = 'out';
      else if (p.stock_actual <= 5) pill = 'low';
      return `
      <tr>
        <td><strong>${esc(p.nombre)}</strong></td>
        <td class="muted">${esc(p.categoria || '—')}</td>
        <td>${money(p.costo_unitario)}</td>
        <td class="gold">${money(p.precio_venta)}</td>
        <td class="text-green">${money(margen)} <span class="muted">(${pct}%)</span></td>
        <td><span class="pill ${pill}">${p.stock_actual}</span></td>
        <td>
          <div class="acciones">
            <button class="icon-btn" data-edit="${p.id}" aria-label="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="icon-btn del" data-del="${p.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  body.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => abrirModal(b.dataset.edit))
  );
  body.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => eliminarProducto(b.dataset.del))
  );
}

document.getElementById('prodSearch').addEventListener('input', (e) => renderProductos(e.target.value));
document.getElementById('prodCatFilter').addEventListener('change', (e) => {
  PROD_CAT = e.target.value;
  renderProductos(document.getElementById('prodSearch').value);
});

/* --------------------- Modal producto (crear / editar) --------------------- */
const modal = document.getElementById('modalProd');

/** Pinta la preview de imagen (URL o placeholder) */
function setImgPreview(url) {
  const box = document.getElementById('pImgPreview');
  box.innerHTML = url
    ? `<img src="${esc(url)}" alt="preview" />`
    : '<i class="fa-solid fa-image"></i>';
}

function abrirModal(id = null) {
  const f = document.getElementById('formProd');
  f.reset();
  document.getElementById('pId').value = '';
  document.getElementById('modalTitle').textContent = 'Nuevo producto';
  document.getElementById('pImgStatus').textContent = '';
  setImgPreview('');

  if (id) {
    const p = PRODUCTOS.find((x) => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('modalTitle').textContent = 'Editar producto';
    document.getElementById('pId').value = p.id;
    document.getElementById('pNombre').value = p.nombre;
    document.getElementById('pCategoria').value = p.categoria || '';
    document.getElementById('pStock').value = p.stock_actual;
    document.getElementById('pCosto').value = p.costo_unitario;
    document.getElementById('pPrecio').value = p.precio_venta;
    document.getElementById('pImagen').value = p.imagen_url || '';
    document.getElementById('pDesc').value = p.descripcion || '';
    setImgPreview(p.imagen_url || '');
  }
  modal.classList.remove('hidden');
}

/* Preview cuando se pega una URL manualmente */
document.getElementById('pImagen').addEventListener('input', (e) => setImgPreview(e.target.value.trim()));

/* Subida de archivo a Supabase Storage */
document.getElementById('pImgFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = document.getElementById('pImgStatus');

  if (!file.type.startsWith('image/')) { err('El archivo debe ser una imagen.'); return; }
  if (file.size > 5 * 1024 * 1024) { err('La imagen no debe superar 5 MB.'); return; }

  // Preview inmediata local
  setImgPreview(URL.createObjectURL(file));
  status.textContent = 'Subiendo...';

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `productos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await db.storage
    .from(DB.bucketImagenes)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (upErr) { status.textContent = ''; err('Error subiendo imagen: ' + upErr.message); return; }

  const { data: pub } = db.storage.from(DB.bucketImagenes).getPublicUrl(path);
  document.getElementById('pImagen').value = pub.publicUrl;
  setImgPreview(pub.publicUrl);
  status.innerHTML = '<span class="text-green">Imagen lista ✓</span>';
});

function cerrarModal() { modal.classList.add('hidden'); }
document.getElementById('btnNuevoProd').addEventListener('click', () => abrirModal());
modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', cerrarModal));
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

document.getElementById('formProd').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pId').value;
  const payload = {
    nombre: document.getElementById('pNombre').value.trim(),
    categoria: document.getElementById('pCategoria').value.trim() || null,
    stock_actual: parseInt(document.getElementById('pStock').value, 10),
    costo_unitario: parseFloat(document.getElementById('pCosto').value),
    precio_venta: parseFloat(document.getElementById('pPrecio').value),
    imagen_url: document.getElementById('pImagen').value.trim() || null,
    descripcion: document.getElementById('pDesc').value.trim() || null,
  };

  let error;
  if (id) {
    ({ error } = await db.from(DB.productos).update(payload).eq('id', id));
  } else {
    ({ error } = await db.from(DB.productos).insert(payload));
  }

  if (error) { err('No se pudo guardar: ' + error.message); return; }

  // Sincroniza la tabla categorias si es una categoría nueva
  if (payload.categoria && !CATEGORIAS.includes(payload.categoria)) {
    await db.from(DB.categorias).insert({ nombre: payload.categoria });
    await cargarCategoriasAdmin();
  }

  ok(id ? 'Producto actualizado.' : 'Producto creado.');
  cerrarModal();
  await cargarProductos();
});

async function eliminarProducto(id) {
  const p = PRODUCTOS.find((x) => String(x.id) === String(id));
  if (!confirm(`¿Eliminar "${p?.nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from(DB.productos).delete().eq('id', id);
  if (error) { err('No se pudo eliminar: ' + error.message); return; }
  ok('Producto eliminado.');
  await cargarProductos();
}

/* =========================================================================
   MÉTRICAS Y GRÁFICOS
   ========================================================================= */
async function cargarMetricas() {
  // Rango del día de hoy (00:00 local)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desdeHoy = hoy.toISOString();

  // Se asume una tabla `ventas` con: created_at, total, ganancia (o costo_total).
  // Si tu esquema difiere, ajusta los nombres de columna aquí.
  const { data: ventasHoy, error } = await db
    .from(DB.ventas)
    .select('total, ganancia, metodo_pago, created_at')
    .neq('estado', 'ANULADA')
    .gte('created_at', desdeHoy);

  if (error) {
    console.warn('No se pudieron leer ventas de hoy:', error.message);
    document.getElementById('mVentas').textContent = money(0);
    document.getElementById('mEfectivo').textContent = money(0);
    document.getElementById('mBanco').textContent = money(0);
    document.getElementById('mGanancia').textContent = money(0);
    document.getElementById('mTx').textContent = '0';
  } else {
    const totalVentas = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalGanancia = ventasHoy.reduce((s, v) => s + Number(v.ganancia || 0), 0);
    const totalEfectivo = ventasHoy
      .filter((v) => v.metodo_pago === 'Efectivo')
      .reduce((s, v) => s + Number(v.total || 0), 0);
    const totalBanco = totalVentas - totalEfectivo; // Transferencia + Tarjeta ("banco")
    document.getElementById('mVentas').textContent = money(totalVentas);
    document.getElementById('mEfectivo').textContent = money(totalEfectivo);
    document.getElementById('mBanco').textContent = money(totalBanco);
    document.getElementById('mGanancia').textContent = money(totalGanancia);
    document.getElementById('mTx').textContent = ventasHoy.length;
  }

  await renderChartVentas();
}

/* Gráfico de ventas de los últimos 7 días */
async function renderChartVentas() {
  const desde = new Date();
  desde.setDate(desde.getDate() - 6);
  desde.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from(DB.ventas)
    .select('total, created_at')
    .neq('estado', 'ANULADA')
    .gte('created_at', desde.toISOString());

  // Estructura de 7 días
  const labels = [];
  const map = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }));
    map[key] = 0;
  }
  if (!error && data) {
    data.forEach((v) => {
      const key = new Date(v.created_at).toISOString().slice(0, 10);
      if (key in map) map[key] += Number(v.total || 0);
    });
  }
  const valores = Object.values(map);

  if (chartVentas) chartVentas.destroy();
  chartVentas = new Chart(document.getElementById('chartVentas'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Ventas',
        data: valores,
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212,175,55,0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#d4af37',
      }],
    },
    options: chartOpts(true),
  });
}

/* Gráfico de stock por producto (Top 8 con más stock) */
function renderChartStock() {
  const top = [...PRODUCTOS].sort((a, b) => b.stock_actual - a.stock_actual).slice(0, 8);
  if (chartStock) chartStock.destroy();
  chartStock = new Chart(document.getElementById('chartStock'), {
    type: 'bar',
    data: {
      labels: top.map((p) => p.nombre),
      datasets: [{
        label: 'Stock',
        data: top.map((p) => p.stock_actual),
        backgroundColor: '#7b1e2b',
        borderColor: '#d4af37',
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: chartOpts(),
  });
}

/* Opciones comunes con tema oscuro. isMoney => eje Y formateado como $ sin decimales */
function chartOpts(isMoney = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => (isMoney ? money(c.parsed.y ?? c.parsed) : c.parsed.y ?? c.parsed) } },
    },
    scales: {
      x: { ticks: { color: '#9aa3b7' }, grid: { color: '#2b3346' } },
      y: {
        ticks: { color: '#9aa3b7', callback: (v) => (isMoney ? money(v) : v) },
        grid: { color: '#2b3346' },
        beginAtZero: true,
      },
    },
  };
}

/* =========================================================================
   USUARIOS
   ========================================================================= */
/* Rebranding visual: el rol 'Trabajador' se muestra como Administrador Operativo */
function rolDisplay(rol) {
  if (rol === ROLES.CAJERO) return 'Administrador Operativo';
  return rol || '—';
}

async function cargarUsuarios() {
  const { data, error } = await db.from(DB.profiles).select('id, nombre, email, rol').order('nombre');
  const body = document.getElementById('userBody');
  if (error) {
    body.innerHTML = `<tr><td colspan="4" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  body.innerHTML = (data || [])
    .map((u) => {
      const esYo = u.id === PROFILE.id;
      return `
      <tr>
        <td><strong>${esc(u.nombre || '—')}</strong>${esYo ? ' <span class="muted small">(tú)</span>' : ''}</td>
        <td class="muted">${esc(u.email || '—')}</td>
        <td><span class="pill rol">${esc(rolDisplay(u.rol))}</span></td>
        <td>
          <div class="acciones">
            <button class="icon-btn" data-pass="${u.id}" data-email="${esc(u.email)}"><i class="fa-solid fa-key"></i> Reset</button>
            <button class="icon-btn del" data-del-user="${u.id}" data-nombre="${esc(u.nombre || u.email)}" ${esYo ? 'disabled title="No puedes eliminarte a ti mismo"' : ''}><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  body.querySelectorAll('[data-pass]').forEach((b) =>
    b.addEventListener('click', () => cambiarPassword(b.dataset.pass, b.dataset.email))
  );
  body.querySelectorAll('[data-del-user]').forEach((b) =>
    b.addEventListener('click', () => eliminarUsuario(b.dataset.delUser, b.dataset.nombre))
  );
}

/* ---- Eliminar usuario (RPC eliminar_usuario, SECURITY DEFINER) ---- */
async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"? Se borrará su cuenta de acceso. Esta acción no se puede deshacer.`)) return;
  const { error } = await db.rpc(DB.rpcEliminarUsuario, { p_id: id });
  if (error) { err('No se pudo eliminar: ' + error.message); return; }
  ok(`Usuario "${nombre}" eliminado.`);
  cargarUsuarios();
}

/* ---- Crear cajero ----
   Usamos el endpoint público /auth/v1/signup con fetch directo (NO db.auth.signUp,
   porque ese método reemplazaría la sesión del admin por la del recién creado).
   El trigger handle_new_user creará el profile con el rol enviado en `data.rol`.
*/
document.getElementById('formNuevoUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuNombre').value.trim();
  const email = document.getElementById('nuEmail').value.trim();
  const password = document.getElementById('nuPass').value;
  const btn = e.submitter || e.target.querySelector('button');

  if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }

  // Guardamos la sesión del admin antes de firmar al nuevo usuario (por si acaso).
  const { data: { session: adminSession } } = await db.auth.getSession();

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: { nombre, rol: ROLES.CAJERO },
      }),
    });
    const body = await res.json();

    if (!res.ok) {
      err('No se pudo crear el usuario: ' + (body.msg || body.error_description || body.error || 'error desconocido'));
      return;
    }

    // Restauramos la sesión del admin explícitamente por seguridad.
    if (adminSession) {
      await db.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
    }

    ok(`Administrador Operativo "${nombre}" creado correctamente.`);
    e.target.reset();
    cargarUsuarios();
  } catch (ex) {
    err('Error de red: ' + ex.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Crear Administrador Operativo'; }
  }
});

/* ---- "Cambiar contraseña" ----
   Cambiar la contraseña de OTRO usuario directamente requiere service_role,
   que NO puede estar en el navegador. En su lugar, enviamos un correo de
   restablecimiento: el cajero recibirá un link para poner su nueva clave.
*/
async function cambiarPassword(_userId, email) {
  if (!confirm(`¿Enviar un correo a ${email} para que restablezca su contraseña?`)) return;

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html',
  });
  if (error) { err('No se pudo enviar: ' + error.message); return; }
  ok(`Correo de restablecimiento enviado a ${email}.`);
}

/* =========================================================================
   PROMOCIONES (CRUD)
   ========================================================================= */
let PROMOS = [];
const modalPromo = document.getElementById('modalPromo');

async function cargarPromociones() {
  const { data, error } = await db
    .from(DB.promociones)
    .select('*')
    .order('created_at', { ascending: false });
  const body = document.getElementById('promoBody');
  if (error) {
    body.innerHTML = `<tr><td colspan="7" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  PROMOS = data || [];
  if (!PROMOS.length) {
    body.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Aún no hay promociones.</td></tr>`;
    return;
  }
  body.innerHTML = PROMOS
    .map((p) => {
      const prod = PRODUCTOS.find((x) => x.id === p.producto_id);
      const hoy = new Date().toISOString().slice(0, 10);
      const vigente = p.activo && p.fecha_inicio <= hoy && (!p.fecha_fin || p.fecha_fin >= hoy);
      const vig = `${p.fecha_inicio}${p.fecha_fin ? ' → ' + p.fecha_fin : ''}`;
      return `
      <tr>
        <td><strong>${esc(p.titulo)}</strong></td>
        <td class="muted">${prod ? esc(prod.nombre) : '—'}</td>
        <td class="gold">${p.precio_promo != null ? money(p.precio_promo) : '—'}</td>
        <td>${p.descuento_pct != null ? p.descuento_pct + '%' : '—'}</td>
        <td class="muted">${esc(vig)}</td>
        <td><span class="pill ${vigente ? 'ok' : 'out'}">${vigente ? 'Vigente' : 'Inactiva'}</span></td>
        <td>
          <div class="acciones">
            <button class="icon-btn" data-edit-promo="${p.id}"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="icon-btn del" data-del-promo="${p.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  body.querySelectorAll('[data-edit-promo]').forEach((b) =>
    b.addEventListener('click', () => abrirModalPromo(b.dataset.editPromo))
  );
  body.querySelectorAll('[data-del-promo]').forEach((b) =>
    b.addEventListener('click', () => eliminarPromo(b.dataset.delPromo))
  );
}

function llenarSelectProductos() {
  const sel = document.getElementById('prProducto');
  sel.innerHTML = '<option value="">— Ninguno —</option>' +
    PRODUCTOS.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
}

function abrirModalPromo(id = null) {
  const f = document.getElementById('formPromo');
  f.reset();
  llenarSelectProductos();
  document.getElementById('prId').value = '';
  document.getElementById('promoModalTitle').textContent = 'Nueva promoción';
  document.getElementById('prInicio').value = new Date().toISOString().slice(0, 10);
  document.getElementById('prActivo').checked = true;

  if (id) {
    const p = PROMOS.find((x) => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('promoModalTitle').textContent = 'Editar promoción';
    document.getElementById('prId').value = p.id;
    document.getElementById('prTitulo').value = p.titulo;
    document.getElementById('prDesc').value = p.descripcion || '';
    document.getElementById('prProducto').value = p.producto_id || '';
    document.getElementById('prPrecio').value = p.precio_promo ?? '';
    document.getElementById('prDescuento').value = p.descuento_pct ?? '';
    document.getElementById('prInicio').value = p.fecha_inicio;
    document.getElementById('prFin').value = p.fecha_fin || '';
    document.getElementById('prActivo').checked = p.activo;
  }
  modalPromo.classList.remove('hidden');
}

function cerrarModalPromo() { modalPromo.classList.add('hidden'); }
document.getElementById('btnNuevaPromo').addEventListener('click', () => abrirModalPromo());
modalPromo.querySelectorAll('[data-close-promo]').forEach((b) => b.addEventListener('click', cerrarModalPromo));
modalPromo.addEventListener('click', (e) => { if (e.target === modalPromo) cerrarModalPromo(); });

document.getElementById('formPromo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('prId').value;
  const payload = {
    titulo: document.getElementById('prTitulo').value.trim(),
    descripcion: document.getElementById('prDesc').value.trim() || null,
    producto_id: document.getElementById('prProducto').value || null,
    precio_promo: document.getElementById('prPrecio').value ? parseFloat(document.getElementById('prPrecio').value) : null,
    descuento_pct: document.getElementById('prDescuento').value ? parseFloat(document.getElementById('prDescuento').value) : null,
    fecha_inicio: document.getElementById('prInicio').value,
    fecha_fin: document.getElementById('prFin').value || null,
    activo: document.getElementById('prActivo').checked,
  };

  let error;
  if (id) ({ error } = await db.from(DB.promociones).update(payload).eq('id', id));
  else ({ error } = await db.from(DB.promociones).insert(payload));

  if (error) { err('No se pudo guardar: ' + error.message); return; }
  ok(id ? 'Promoción actualizada.' : 'Promoción creada.');
  cerrarModalPromo();
  cargarPromociones();
});

async function eliminarPromo(id) {
  if (!confirm('¿Eliminar esta promoción?')) return;
  const { error } = await db.from(DB.promociones).delete().eq('id', id);
  if (error) { err('No se pudo eliminar: ' + error.message); return; }
  ok('Promoción eliminada.');
  cargarPromociones();
}

/* =========================================================================
   GASTOS
   ========================================================================= */
async function cargarGastos() {
  document.getElementById('gFecha').value ||= new Date().toISOString().slice(0, 10);

  const { data, error } = await db
    .from(DB.gastos)
    .select('id, concepto, categoria, monto, fecha')
    .order('fecha', { ascending: false })
    .limit(100);

  const body = document.getElementById('gastosBody');
  if (error) {
    body.innerHTML = `<tr><td colspan="5" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;padding:26px">Sin gastos registrados.</td></tr>`;
    document.getElementById('gastosTotal').textContent = money(0);
    return;
  }
  const total = data.reduce((s, g) => s + Number(g.monto), 0);
  document.getElementById('gastosTotal').textContent = 'Total: ' + money(total);
  body.innerHTML = data
    .map((g) => `
      <tr>
        <td class="muted">${esc(g.fecha)}</td>
        <td><strong>${esc(g.concepto)}</strong></td>
        <td><span class="pill rol">${esc(g.categoria || '—')}</span></td>
        <td class="text-red">${money(g.monto)}</td>
        <td><button class="icon-btn del" data-del-gasto="${g.id}"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`)
    .join('');

  body.querySelectorAll('[data-del-gasto]').forEach((b) =>
    b.addEventListener('click', () => eliminarGasto(b.dataset.delGasto))
  );
}

document.getElementById('formGasto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    concepto: document.getElementById('gConcepto').value.trim(),
    categoria: document.getElementById('gCategoria').value,
    monto: parseFloat(document.getElementById('gMonto').value),
    fecha: document.getElementById('gFecha').value,
    notas: document.getElementById('gNotas').value.trim() || null,
    registrado_por: PROFILE.id,
  };
  const { error } = await db.from(DB.gastos).insert(payload);
  if (error) { err('No se pudo registrar: ' + error.message); return; }
  ok('Gasto registrado.');
  e.target.reset();
  document.getElementById('gFecha').value = new Date().toISOString().slice(0, 10);
  cargarGastos();
});

async function eliminarGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  const { error } = await db.from(DB.gastos).delete().eq('id', id);
  if (error) { err('No se pudo eliminar: ' + error.message); return; }
  ok('Gasto eliminado.');
  cargarGastos();
}

/* =========================================================================
   FINANZAS
   ========================================================================= */
function setRango(desde, hasta) {
  document.getElementById('finDesde').value = desde;
  document.getElementById('finHasta').value = hasta;
}

async function cargarFinanzas() {
  // Por defecto: mes actual
  if (!document.getElementById('finDesde').value) {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    setRango(inicioMes, hoy.toISOString().slice(0, 10));
  }
  await calcularFinanzas();
}

async function calcularFinanzas() {
  const desde = document.getElementById('finDesde').value;
  const hasta = document.getElementById('finHasta').value;
  if (!desde || !hasta) { err('Selecciona el rango de fechas.'); return; }

  const { data, error } = await db.rpc(DB.rpcResumenFinanciero, { p_desde: desde, p_hasta: hasta });
  if (error) { err('Error calculando finanzas: ' + error.message); return; }

  document.getElementById('fIngresos').textContent = money(data.ingresos);
  document.getElementById('fCosto').textContent = '−' + money(data.costo_mercancia);
  document.getElementById('fBruta').textContent = money(data.utilidad_bruta);
  document.getElementById('fGastos').textContent = '−' + money(data.gastos);
  document.getElementById('fTickets').textContent = data.tickets;

  const neta = document.getElementById('fNeta');
  neta.textContent = money(data.utilidad_neta);
  neta.className = 'metric-value ' + (Number(data.utilidad_neta) >= 0 ? 'text-green' : 'text-red');

  renderChartFin(data);
}

function renderChartFin(d) {
  if (chartFin) chartFin.destroy();
  chartFin = new Chart(document.getElementById('chartFin'), {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Costo mercancía', 'Utilidad bruta', 'Gastos', 'Utilidad neta'],
      datasets: [{
        label: 'Monto',
        data: [d.ingresos, d.costo_mercancia, d.utilidad_bruta, d.gastos, d.utilidad_neta],
        backgroundColor: ['#2ecc71', '#e74c3c', '#d4af37', '#e67e22', Number(d.utilidad_neta) >= 0 ? '#3b82f6' : '#e74c3c'],
        borderRadius: 6,
      }],
    },
    options: chartOpts(true),
  });
}

document.getElementById('btnFinAplicar').addEventListener('click', calcularFinanzas);
document.querySelectorAll('.fin-presets [data-preset]').forEach((b) =>
  b.addEventListener('click', () => {
    const hoy = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    if (b.dataset.preset === 'hoy') setRango(iso(hoy), iso(hoy));
    if (b.dataset.preset === 'mes') setRango(iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy));
    if (b.dataset.preset === 'anio') setRango(iso(new Date(hoy.getFullYear(), 0, 1)), iso(hoy));
    calcularFinanzas();
  })
);

/* =========================================================================
   CAJA — configuración de hora de cierre e historial de cierres
   ========================================================================= */
async function cargarCaja() {
  const { data: cfg } = await db
    .from(DB.configuracion)
    .select('hora_cierre_automatica')
    .eq('id', 1)
    .single();
  if (cfg?.hora_cierre_automatica) {
    document.getElementById('cfgHora').value = String(cfg.hora_cierre_automatica).slice(0, 5);
  }
  cargarCierres();
  cargarTurnos();
}

/* Auditoría de turnos con descuadre (solo visible para la Dueña/admin) */
async function cargarTurnos() {
  const { data, error } = await db
    .from(DB.turnos)
    .select('apertura_at, cierre_at, monto_apertura, monto_contado, total_teorico, descuadre, estado, profiles(nombre)')
    .order('apertura_at', { ascending: false })
    .limit(60);
  const body = document.getElementById('turnosBody');
  if (error) { body.innerHTML = `<tr><td colspan="7" class="text-red">${esc(error.message)}</td></tr>`; return; }
  if (!data.length) { body.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin turnos registrados.</td></tr>`; return; }
  const fmt = (d) => (d ? new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  body.innerHTML = data
    .map((t) => {
      const abierto = t.estado === 'ABIERTO';
      const desc = Number(t.descuadre || 0);
      let clase = 'muted', txt = '—';
      if (!abierto) {
        if (desc === 0) { clase = 'text-green'; txt = 'Cuadrado'; }
        else if (desc > 0) { clase = 'text-green'; txt = 'Sobrante ' + money(desc); }
        else { clase = 'text-red'; txt = 'Faltante ' + money(Math.abs(desc)); }
      }
      return `
      <tr>
        <td><strong>${esc(t.profiles?.nombre || '—')}</strong></td>
        <td class="muted">${esc(fmt(t.apertura_at))}</td>
        <td class="muted">${abierto ? '<span class="pill low">ABIERTO</span>' : esc(fmt(t.cierre_at))}</td>
        <td>${money(t.monto_apertura)}</td>
        <td>${t.monto_contado != null ? money(t.monto_contado) : '—'}</td>
        <td>${t.total_teorico != null ? money(t.total_teorico) : '—'}</td>
        <td class="${clase}">${txt}</td>
      </tr>`;
    })
    .join('');
}

async function cargarCierres() {
  const { data, error } = await db
    .from(DB.cierres)
    .select('fecha_cierre, total_efectivo, total_tarjeta, total_transferencia, total_ventas, cantidad_tickets, estado')
    .order('fecha_cierre', { ascending: false })
    .limit(60);
  const body = document.getElementById('cierresBody');
  if (error) {
    body.innerHTML = `<tr><td colspan="7" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Aún no hay cierres registrados.</td></tr>`;
    return;
  }
  body.innerHTML = data
    .map((c) => `
      <tr>
        <td><strong>${esc(c.fecha_cierre)}</strong></td>
        <td>${money(c.total_efectivo)}</td>
        <td>${money(c.total_tarjeta)}</td>
        <td>${money(c.total_transferencia)}</td>
        <td class="gold">${money(c.total_ventas)}</td>
        <td>${c.cantidad_tickets}</td>
        <td><span class="pill ${c.estado === 'AUTOMATICO' ? 'ok' : 'rol'}">${esc(c.estado)}</span></td>
      </tr>`)
    .join('');
}

document.getElementById('formConfigCaja').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hora = document.getElementById('cfgHora').value;
  const { error } = await db
    .from(DB.configuracion)
    .update({ hora_cierre_automatica: hora, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) { err('No se pudo guardar: ' + error.message); return; }
  ok('Hora de cierre actualizada a las ' + hora + '.');
});

document.getElementById('btnCierreManual').addEventListener('click', async () => {
  if (!confirm('¿Ejecutar el cierre de caja del día en curso ahora?')) return;
  const { data, error } = await db.rpc(DB.rpcCierreManual);
  if (error) { err('No se pudo cerrar: ' + error.message); return; }
  ok(`Cierre generado · Total ${money(data.total_ventas)} (${data.tickets} tickets).`);
  cargarCierres();
});

/* =========================================================================
   HISTORIAL DE VENTAS + ANULACIÓN (soft delete)
   ========================================================================= */
async function cargarHistorialVentas() {
  const body = document.getElementById('ventasBody');
  const fecha = document.getElementById('ventasFecha').value; // '' = todas
  let query = db
    .from(DB.ventas)
    .select('id, created_at, metodo_pago, total, estado, venta_items(nombre_snapshot, cantidad, precio_unitario)')
    .order('created_at', { ascending: false })
    .limit(300);

  // Filtro por día: solo consulta, no altera ningún dato del día en curso ni de otros.
  if (fecha) {
    const inicio = new Date(fecha + 'T00:00:00');
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
    query = query.gte('created_at', inicio.toISOString()).lt('created_at', fin.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    body.innerHTML = `<tr><td colspan="7" class="text-red">${esc(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    const txt = fecha
      ? 'No hubo ventas registradas ese día.'
      : 'Sin ventas registradas.';
    body.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">${txt}</td></tr>`;
    return;
  }
  body.innerHTML = data.map(filaVenta).join('');
  body.querySelectorAll('[data-anular]').forEach((b) =>
    b.addEventListener('click', () => anularVenta(b.dataset.anular))
  );
}

function detalleItems(items) {
  if (!items || !items.length) return '<span class="muted small">Sin detalle</span>';
  const lis = items
    .map((it) => `<li><span>${esc(it.nombre_snapshot)}</span><span class="det-cant">x${it.cantidad}</span></li>`)
    .join('');
  return `
    <details class="venta-det">
      <summary>${items.length} producto(s)</summary>
      <ul class="det-list">${lis}</ul>
    </details>`;
}

function filaVenta(v) {
  const anulada = v.estado === 'ANULADA';
  const fecha = new Date(v.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  return `
    <tr class="${anulada ? 'row-anulada' : ''}">
      <td class="muted">${esc(fecha)}</td>
      <td>#${v.id}</td>
      <td>${detalleItems(v.venta_items)}</td>
      <td>${esc(v.metodo_pago || '—')}</td>
      <td class="${anulada ? 'muted' : 'gold'}">${money(v.total)}</td>
      <td><span class="pill ${anulada ? 'out' : 'ok'}">${anulada ? 'ANULADA' : 'ACTIVA'}</span></td>
      <td>
        ${anulada
          ? '<span class="muted small">—</span>'
          : `<button class="icon-btn del" data-anular="${v.id}"><i class="fa-solid fa-ban"></i> Anular</button>`}
      </td>
    </tr>`;
}

async function anularVenta(id) {
  if (!confirm(`¿Anular la venta #${id}? Quedará registrada como ANULADA para auditoría y se excluirá de la contabilidad.`)) return;
  const { error } = await db.rpc(DB.rpcAnularVenta, { p_id: Number(id) });
  if (error) { err('No se pudo anular: ' + error.message); return; }
  ok(`Venta #${id} anulada. Stock devuelto.`);
  cargarHistorialVentas();
  cargarMetricas();
  cargarProductos(); // refleja el stock devuelto en tabla y gráfico
}

// Por defecto muestra el día en curso; se puede cambiar de día o ver todo.
document.getElementById('ventasFecha').value = new Date().toISOString().slice(0, 10);
document.getElementById('btnRefrescarVentas').addEventListener('click', cargarHistorialVentas);
document.getElementById('ventasFecha').addEventListener('change', cargarHistorialVentas);
document.getElementById('btnVentasTodo').addEventListener('click', () => {
  document.getElementById('ventasFecha').value = '';
  cargarHistorialVentas();
});

/* =========================================================================
   AUDITORÍA OPERATIVA — historial de acciones (audit_logs)
   ========================================================================= */
let AUDIT = [];
async function cargarAuditoria() {
  const body = document.getElementById('audBody');
  const { data, error } = await db
    .from(DB.auditLogs)
    .select('created_at, usuario_email, accion, detalles')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) { body.innerHTML = `<tr><td colspan="4" class="text-red">${esc(error.message)}</td></tr>`; return; }
  AUDIT = data || [];
  renderAuditoria();
}

function renderAuditoria(filtro = '') {
  const q = filtro.toLowerCase();
  const lista = AUDIT.filter(
    (a) =>
      (a.usuario_email || '').toLowerCase().includes(q) ||
      (a.accion || '').toLowerCase().includes(q) ||
      (a.detalles || '').toLowerCase().includes(q)
  );
  const body = document.getElementById('audBody');
  if (!lista.length) {
    body.innerHTML = `<tr><td colspan="4" class="muted" style="text-align:center;padding:26px">Sin registros de actividad.</td></tr>`;
    return;
  }
  body.innerHTML = lista
    .map((a) => {
      const fecha = new Date(a.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' });
      return `
      <tr>
        <td class="muted">${esc(fecha)}</td>
        <td>${esc(a.usuario_email || '—')}</td>
        <td><span class="pill rol">${esc(a.accion)}</span></td>
        <td>${esc(a.detalles || '—')}</td>
      </tr>`;
    })
    .join('');
}

document.getElementById('btnRefrescarAud').addEventListener('click', cargarAuditoria);
document.getElementById('audSearch').addEventListener('input', (e) => renderAuditoria(e.target.value));
