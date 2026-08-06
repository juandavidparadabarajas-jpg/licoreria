/* =========================================================================
   CONFIGURACIÓN GLOBAL
   -------------------------------------------------------------------------
   Rellena estos valores con los de tu proyecto Supabase.
   (Settings -> API en el panel de Supabase)
   ========================================================================= */

// URL de tu proyecto Supabase — SOLO el origin (el cliente añade /rest, /auth, etc.)
const SUPABASE_URL = 'https://kxarretpcphacfqusrxx.supabase.co';

// Clave pública (publishable / anon). Segura para el frontend, respetada por RLS.
const SUPABASE_ANON_KEY = 'sb_publishable_jEC1uKsuEl70Ip4Rqt6ZIA_sEsbHlwu';

// Número de WhatsApp de la licorería en formato internacional SIN '+' ni espacios.
const WHATSAPP_NUMBER = '573228619735';

// Número de soporte técnico del sistema (botón de ayuda), sin '+' ni espacios.
const SOPORTE_WHATSAPP = '573238361617';

// Datos públicos de la licorería (usados en landing y footer)
const NEGOCIO = {
  nombre: 'Licorería Madnight',
  direccion: 'Calle 13 #16-48, Bucaramanga, Santander',
  facebook: 'https://www.facebook.com/profile.php?id=61585837157691',
  instagram: 'https://www.instagram.com/madnightlicorera/',
};

/* -------------------------------------------------------------------------
   NOMBRES DE OBJETOS EN LA BASE DE DATOS
   Ajusta si tu esquema usa otros nombres.
   ------------------------------------------------------------------------- */
const DB = {
  productos: 'productos',      // tabla de productos
  profiles: 'profiles',        // tabla de perfiles (id, rol, nombre, email)
  ventas: 'ventas',            // tabla cabecera de ventas
  detalleVentas: 'venta_items',// tabla de detalle (opcional, para reportes)
  promociones: 'promociones',  // tabla de promociones
  gastos: 'gastos',            // tabla de gastos / egresos
  configuracion: 'configuracion_negocio', // config del negocio (hora de cierre)
  cierres: 'cierres_caja',     // historial de cierres de caja
  categorias: 'categorias',    // catálogo de categorías
  turnos: 'turnos',            // turnos de caja (apertura/cierre ciego)
  movimientosStock: 'movimientos_stock', // entradas/salidas de inventario
  auditLogs: 'audit_logs',     // trazabilidad de acciones del staff

  // Bucket de Storage para imágenes de productos/promos
  bucketImagenes: 'productos',

  // Funciones RPC (definidas en supabase_schema.sql / supabase_extras.sql / supabase_cierre.sql)
  rpcRegistrarVenta: 'registrar_venta',
  rpcParamItems: 'p_items',
  rpcParamMetodo: 'p_metodo',
  rpcEliminarUsuario: 'eliminar_usuario',
  rpcResumenFinanciero: 'resumen_financiero',
  rpcCierreManual: 'ejecutar_cierre_caja_admin',
  rpcAnularVenta: 'anular_venta',
  rpcAbrirTurno: 'abrir_turno',
  rpcCerrarTurnoCiego: 'cerrar_turno_ciego',
  rpcMovimientoStock: 'registrar_movimiento_stock',
};

/* Valores esperados en la columna profiles.rol */
const ROLES = {
  ADMIN: 'Administrador',
  CAJERO: 'Trabajador',
};
