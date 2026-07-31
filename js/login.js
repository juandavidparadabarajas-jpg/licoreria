/* =========================================================================
   LOGIN.JS — Autenticación con Supabase Auth
   ========================================================================= */

// Si ya hay sesión activa, redirige directo a su panel.
(async function checkExisting() {
  const profile = await getSessionProfile();
  if (profile && profile.rol) redirigirPorRol(profile.rol);
})();

const form = document.getElementById('loginForm');
const btn = document.getElementById('btnLogin');
const errorBox = document.getElementById('loginError');

// Mostrar / ocultar contraseña
document.getElementById('togglePass').addEventListener('click', (e) => {
  const inp = document.getElementById('password');
  const icon = e.currentTarget.querySelector('i');
  const visible = inp.type === 'text';
  inp.type = visible ? 'password' : 'text';
  icon.className = visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Verificando...';

  // 1) Iniciar sesión
  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    showError(
      error.message.includes('Invalid login')
        ? 'Correo o contraseña incorrectos.'
        : error.message
    );
    btn.disabled = false;
    btn.textContent = 'Iniciar sesión';
    return;
  }

  // 2) Leer el rol desde profiles y redirigir
  const { data: profile, error: pErr } = await db
    .from(DB.profiles)
    .select('rol')
    .eq('id', data.user.id)
    .single();

  if (pErr || !profile?.rol) {
    showError('Tu usuario no tiene un rol asignado. Contacta al administrador.');
    await db.auth.signOut();
    btn.disabled = false;
    btn.textContent = 'Iniciar sesión';
    return;
  }

  redirigirPorRol(profile.rol);
});
