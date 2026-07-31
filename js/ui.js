/* =========================================================================
   UI.JS — utilidades de interfaz compartidas (toasts)
   ========================================================================= */
function toast(msg, type = '') {
  let cont = document.getElementById('toast');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toast';
    document.body.appendChild(cont);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  cont.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
const ok = (m) => toast(m, 'ok');
const err = (m) => toast(m, 'err');

/** Escapa texto para insertarlo en HTML de forma segura */
function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
