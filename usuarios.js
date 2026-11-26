// ---------------------------------------------------------------
// MACLIVE · js/usuarios.js — Gestión de usuarios (solo administrador): activar y asignar rol
// ---------------------------------------------------------------
'use strict';

async function viewUsuarios(v) {
  if (!isAdmin()) { v.innerHTML = '<div class="card">Solo para administradores.</div>'; return; }
  const rows = await q(sb.from('perfiles').select('*').order('activo').order('nombre'));
  v.innerHTML = `<div class="page-head"><h1>Usuarios</h1></div>
    <div class="notice">Para dar de alta a alguien: en Supabase ve a <b>Authentication → Users → Add user → Create new user</b> (email + contraseña, marcando "Auto Confirm User"). Aparecerá aquí como <b>inactivo</b>: actívalo, elige su rol y pulsa Guardar. Después puede cambiar su contraseña con "¿Has olvidado la contraseña?".</div>
    <div class="card tbl-wrap"><table class="tbl"><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Activo</th><th></th></tr>
    ${rows.map(u => `<tr data-u="${u.id}">
      <td><input name="nombre" value="${esc(u.nombre)}"></td><td class="small">${esc(u.email)}</td>
      <td><input name="telefono" value="${esc(u.telefono)}" style="width:120px"></td>
      <td><select name="rol" ${u.id === S.me.id ? 'disabled' : ''}>${opts(ROLES, u.rol)}</select></td>
      <td><input type="checkbox" name="activo" ${u.activo ? 'checked' : ''} ${u.id === S.me.id ? 'disabled' : ''}></td>
      <td><button class="btn-sm" data-save>Guardar</button></td></tr>`).join('')}</table></div>`;
  $$('[data-save]').forEach(b => b.onclick = async () => {
    const tr = b.closest('tr'), d = {};
    $$('input,select', tr).forEach(el => { if (!el.disabled) d[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    try { await q(sb.from('perfiles').update(d).eq('id', tr.dataset.u)); S.cache.tecnicos = null; toast('Usuario actualizado'); } catch (e) { fail(e); }
  });
}
