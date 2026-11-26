// ---------------------------------------------------------------
// MACLIVE · js/navegacion.js — Menú lateral / barra inferior, cabecera y router por #hash
// ---------------------------------------------------------------
'use strict';

const I = {
  panel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  avisos: '<path d="M12 2 1 21h22L12 2zm0 6v6m0 3v.5"/>',
  partes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
  prev: '<path d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M8 15l2 2 4-4"/>',
  clientes: '<path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6M7 10h2M15 10h2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

// Iniciales para el botón "Mi cuenta" de la cabecera del móvil: "Ana Oficina" → "AO"
const iniciales = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function renderShell() {
  const links = [
    ['panel', 'Inicio', 'panel'],
    ['avisos', 'Avisos', 'avisos'],
    ['partes', 'Partes', 'partes'],
    ['preventivos', 'Preventivos', 'prev'],
    ['clientes', 'Clientes', 'clientes'],
    ...(isAdmin() ? [['usuarios', 'Usuarios', 'users', 'nav-extra']] : [])
  ];
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><img class="logo-img abre-acerca-de" src="icon-192.png" alt="MACLIVE" title="Acerca de"><div><div class="brand-name">${esc(EMP.nombre)}</div><div class="brand-sub">${esc(EMP.subtitulo || '')}</div></div></div>
      <nav class="nav">${links.map(([r, l, i, c]) => `<a href="#/${r}" data-r="${r}" class="${c || ''}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
      <div class="me"><div><b>${esc(S.me.nombre)}</b></div><div class="muted" style="color:#8fb3c9">${ROLES[S.me.rol]}</div>
        <button class="btn-sm btn-ghost" id="logout">Cerrar sesión</button>
        <div class="app-version" id="appVersionTag">${APP_VERSION_ACTUAL ? 'v' + esc(APP_VERSION_ACTUAL) : ''}</div></div>
    </aside>
    <div>
      <div class="topbar"><img class="logo-img abre-acerca-de" src="icon-192.png" alt="MACLIVE" style="width:30px;height:30px"><div class="brand-name">${esc(EMP.nombre)} <span class="app-version-top">${APP_VERSION_ACTUAL ? 'v' + esc(APP_VERSION_ACTUAL) : ''}</span></div>
        <button class="mi-cuenta-btn" id="miCuenta" aria-label="Mi cuenta">${esc(iniciales(S.me.nombre))}</button></div>
      <main id="view"></main>
    </div></div>`;
  const out = async () => { if (await confirmar('¿Cerrar sesión?')) sb.auth.signOut(); };
  $('#logout').onclick = out;
  $('#miCuenta').onclick = () => openModal(`
    <div class="mi-cuenta">
      <div class="mi-cuenta-avatar">${esc(iniciales(S.me.nombre))}</div>
      <div><b>${esc(S.me.nombre)}</b><div class="muted small">${esc(S.me.email || '')}</div><div class="muted small">${ROLES[S.me.rol]}</div></div>
    </div>
    <div class="list" style="margin-top:12px">
      ${isAdmin() ? `<a class="item" href="#/usuarios" data-close>${icon('users')}<div class="main"><div class="t">Usuarios</div><div class="s">Activar usuarios y asignar rol</div></div></a>` : ''}
      <a class="item abre-acerca-de" href="#" data-close><img src="icon-192.png" alt="" style="width:24px;height:24px;border-radius:6px"><div class="main"><div class="t">Acerca de MACLIVE</div><div class="s">${APP_VERSION_ACTUAL ? 'Versión ' + esc(APP_VERSION_ACTUAL) : ''}</div></div></a>
    </div>
    <div class="actions"><button class="btn-ghost" data-close>Cerrar</button><button class="btn-danger" id="out2">Cerrar sesión</button></div>`, m => {
      $('#out2', m).onclick = () => { modal.close(); sb.auth.signOut(); };
      $$('a[href="#"]', m).forEach(a => a.addEventListener('click', e => e.preventDefault()));
    });
}


// Router por #hash: #/avisos, #/aviso/<id>, #/parte-editar?aviso=<id>…
// Se construye al navegar (no al cargar) porque las pantallas están en
// archivos js que se cargan después de este.
const rutas = () => ({
  panel: viewPanel,
  avisos: viewAvisos,
  aviso: viewAviso,
  partes: viewPartes,
  parte: viewParte,
  'parte-editar': viewParteForm,
  preventivos: viewPreventivos,
  contrato: viewContrato,
  clientes: viewClientes,
  cliente: viewCliente,
  usuarios: viewUsuarios
});

function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [name, id] = path.split('/');
  return { name: name || 'panel', id, params: new URLSearchParams(qs || '') };
}

async function route() {
  if (!S.me) return;
  const r = parseHash();
  const fn = rutas()[r.name] || viewPanel;
  const top = r.name.split('-')[0];
  const navKey = { aviso: 'avisos', parte: 'partes', contrato: 'preventivos', cliente: 'clientes' }[top] || top;
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.r === navKey));
  const view = $('#view');
  if (!view) return;
  view.innerHTML = '<p class="muted">Cargando…</p>';
  try { await fn(view, r.id, r.params); }
  catch (e) { view.innerHTML = `<div class="card"><h2>No se pudo cargar</h2><p class="muted">${esc(e.message)}</p><button onclick="route()">Reintentar</button></div>`; console.error(e); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
window.route = route;
