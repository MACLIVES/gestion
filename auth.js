// ---------------------------------------------------------------
// MACLIVE · js/auth.js — Arranque, inicio de sesión, cambio de contraseña y cuenta pendiente de activar
// ---------------------------------------------------------------
'use strict';

async function boot() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('TU-PROYECTO')) {
    app.innerHTML = `<div class="login-wrap"><div class="login-card"><h2>Falta configurar</h2>
      <p>Edita <b>js/supabase-client.js</b> y pon la URL y la clave pública de tu proyecto de Supabase.</p></div></div>`;
    return;
  }
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  sb.auth.onAuthStateChange((ev, session) => {
    const changed = !!session !== !!S.session;
    S.session = session;
    if (ev === 'PASSWORD_RECOVERY') return renderNewPassword();
    if (changed) start();
  });
  start();
}

async function start() {
  if (!S.session) return renderLogin();
  try {
    S.me = await q(sb.from('perfiles').select('*').eq('id', S.session.user.id).maybeSingle());
  } catch (e) { fail(e); }
  if (!S.me || !S.me.activo) {
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <div class="brand"><img class="logo-img abre-acerca-de" src="icon-192.png" alt="MACLIVE"><div><div class="brand-name">${esc(EMP.nombre)}</div></div></div>
      <h2>Cuenta pendiente de activar</h2>
      <p class="muted">Tu usuario (${esc(S.session.user.email)}) está registrado pero un administrador tiene que activarlo.</p>
      <button class="btn-ghost btn-block" id="out">Salir</button></div></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    return;
  }
  S.cache = {};
  renderShell();
  route();
}

function renderLogin() {
  app.innerHTML = `<div class="login-wrap"><form class="login-card" id="login">
    <div class="brand"><img class="logo-img abre-acerca-de" src="icon-192.png" alt="MACLIVE" title="Acerca de"><div><div class="brand-name">${esc(EMP.nombre)}</div><div class="brand-sub">${esc(EMP.subtitulo || '')}</div></div></div>
    <div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
    <div class="field"><label>Contraseña</label><input name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn-block">Entrar</button>
    <p class="small" style="text-align:center;margin-top:14px"><a href="#" id="forgot">¿Has olvidado la contraseña?</a></p>
    <div class="err" id="lerr"></div>
    <div class="login-version" id="loginVersionTag">${APP_VERSION_ACTUAL ? 'Versión ' + esc(APP_VERSION_ACTUAL) : ''}</div></form></div>`;
  $('#login').onsubmit = async e => {
    e.preventDefault();
    const f = formData(e.target), b = $('button', e.target);
    b.disabled = true; $('#lerr').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
    b.disabled = false;
    if (error) $('#lerr').textContent = /invalid/i.test(error.message) ? 'Email o contraseña incorrectos.' : error.message;
  };
  $('#forgot').onclick = async e => {
    e.preventDefault();
    const email = $('#login').elements.email.value.trim();
    if (!email) return ($('#lerr').textContent = 'Escribe tu email primero.');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    $('#lerr').textContent = error ? error.message : 'Te hemos enviado un email para cambiar la contraseña.';
  };
}

function renderNewPassword() {
  app.innerHTML = `<div class="login-wrap"><form class="login-card" id="np">
    <h2>Nueva contraseña</h2>
    <div class="field"><label>Contraseña (mín. 8)</label><input name="p" type="password" minlength="8" required autocomplete="new-password"></div>
    <button class="btn-block">Guardar</button><div class="err" id="nerr"></div></form></div>`;
  $('#np').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: e.target.elements.p.value });
    if (error) return ($('#nerr').textContent = error.message);
    toast('Contraseña actualizada'); start();
  };
}

// Arranque: todos los js/*.js ya están cargados cuando salta DOMContentLoaded.
document.addEventListener('DOMContentLoaded', boot);
