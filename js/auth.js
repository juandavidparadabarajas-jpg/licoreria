/* =========================================================================
   HELPERS DE SESIÓN Y ROLES
   Utilidades compartidas por todas las páginas protegidas.
   ========================================================================= */

/** Devuelve el perfil (con rol) del usuario autenticado, o null. */
async function getSessionProfile() {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await db
    .from(DB.profiles)
    .select('id, nombre, email, rol')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('No se pudo leer el perfil:', error.message);
    return { id: session.user.id, email: session.user.email, rol: null };
  }
  return profile;
}

/**
 * Protege una página. Si no hay sesión -> login.
 * Si se pasa `rolRequerido` y no coincide -> se le manda a su panel.
 * Devuelve el perfil si todo está OK.
 */
async function requireAuth(rolRequerido = null) {
  const profile = await getSessionProfile();

  if (!profile) {
    window.location.replace('login.html');
    return null;
  }
  if (rolRequerido && profile.rol !== rolRequerido) {
    redirigirPorRol(profile.rol);
    return null;
  }
  return profile;
}

/** Manda a cada rol a su panel correspondiente. */
function redirigirPorRol(rol) {
  if (rol === ROLES.ADMIN) window.location.replace('admin.html');
  else if (rol === ROLES.CAJERO) window.location.replace('cajero.html');
  else window.location.replace('login.html');
}

/** Cierra sesión y vuelve al login. */
async function logout() {
  await db.auth.signOut();
  window.location.replace('login.html');
}

/**
 * Registra una acción del usuario en audit_logs (trazabilidad).
 * No bloquea el flujo: si falla, solo avisa por consola.
 * @param {string} accion   Tipo de evento (ej. 'EDITAR_PRODUCTO')
 * @param {string} detalles Descripción legible de lo ocurrido
 */
async function logAudit(accion, detalles) {
  try {
    const email =
      (typeof PROFILE !== 'undefined' && PROFILE && PROFILE.email) ||
      (await db.auth.getUser()).data?.user?.email ||
      null;
    await db.from(DB.auditLogs).insert({ usuario_email: email, accion, detalles });
  } catch (e) {
    console.warn('No se pudo registrar auditoría:', e?.message || e);
  }
}
