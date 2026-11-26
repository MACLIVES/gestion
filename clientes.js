// ---------------------------------------------------------------
// MACLIVE · js/clientes.js — Clientes, instalaciones y equipos
// ---------------------------------------------------------------
'use strict';

async function viewClientes(v) {
  v.innerHTML = `<div class="page-head"><h1>Clientes</h1>${isOficina() ? '<button class="btn-warm" id="nuevo">+ Nuevo cliente</button>' : ''}</div>
    <div class="filters"><input id="ftxt" placeholder="Buscar por nombre, CIF, teléfono o población…" autofocus></div>
    <div class="card"><div class="list" id="lst"></div></div>`;
  async function load(t = '') {
    let qq = sb.from('clientes').select('id,nombre,cif,tipo,telefono,poblacion,activo').order('nombre').limit(300);
    if (t) { const s = t.replace(/[,()%]/g, ' '); qq = qq.or(`nombre.ilike.%${s}%,cif.ilike.%${s}%,telefono.ilike.%${s}%,poblacion.ilike.%${s}%`); }
    const rows = await q(qq);
    $('#lst').innerHTML = rows.length ? rows.map(c => `<a class="item" href="#/cliente/${c.id}"><div class="main"><div class="t">${esc(c.nombre)}</div>
      <div class="s">${esc([TIPOS_CLIENTE[c.tipo], c.cif, c.poblacion, c.telefono].filter(Boolean).join(' · '))}</div></div>
      <div class="r">${c.activo ? '' : '<span class="badge b-cerrado">Inactivo</span>'}</div></a>`).join('') : '<div class="empty">No hay clientes</div>';
  }
  let t; $('#ftxt').oninput = e => { clearTimeout(t); t = setTimeout(() => load(e.target.value.trim()).catch(fail), 300); };
  if ($('#nuevo')) $('#nuevo').onclick = () => clienteForm({}, c => { S.cache.clientes = null; location.hash = '#/cliente/' + c.id; });
  await load();
}

function clienteForm(c = {}, onSaved) {
  openModal(`<h2>${c.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
    <form id="fcl">
      <div class="field"><label>Nombre / razón social *</label><input name="nombre" required value="${esc(c.nombre)}"></div>
      <div class="row"><div class="field"><label>CIF / NIF</label><input name="cif" value="${esc(c.cif)}"></div>
        <div class="field"><label>Tipo</label><select name="tipo">${opts(TIPOS_CLIENTE, c.tipo || 'empresa')}</select></div></div>
      <div class="row"><div class="field"><label>Teléfono</label><input name="telefono" type="tel" value="${esc(c.telefono)}"></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(c.email)}"></div></div>
      <div class="field"><label>Persona de contacto</label><input name="contacto" value="${esc(c.contacto)}"></div>
      <div class="field"><label>Dirección fiscal</label><input name="direccion" value="${esc(c.direccion)}"></div>
      <div class="row"><div class="field"><label>Población</label><input name="poblacion" value="${esc(c.poblacion ?? 'Málaga')}"></div>
        <div class="field"><label>CP</label><input name="cp" value="${esc(c.cp)}"></div></div>
      <div class="field"><label>Notas</label><textarea name="notas">${esc(c.notas)}</textarea></div>
      ${c.id ? `<label class="check"><input type="checkbox" name="activo" ${c.activo ? 'checked' : ''}>Cliente activo</label>` :
        '<label class="check"><input type="checkbox" name="_crearInst" checked>Crear también la instalación en esta misma dirección</label>'}
      <div class="actions"><button type="button" class="btn-ghost" data-close>Cancelar</button><button>Guardar</button></div>
    </form>`, m => {
    $('#fcl', m).onsubmit = async e => {
      e.preventDefault();
      const d = formData(e.target); const crearInst = d._crearInst; delete d._crearInst;
      try {
        const saved = c.id ? await q(sb.from('clientes').update(d).eq('id', c.id).select().single())
          : await q(sb.from('clientes').insert(d).select().single());
        if (crearInst) await q(sb.from('instalaciones').insert({ cliente_id: saved.id, nombre: 'Principal', direccion: d.direccion, poblacion: d.poblacion, cp: d.cp, contacto: d.contacto, telefono: d.telefono }));
        S.cache.clientes = null; modal.close(); toast('Cliente guardado');
        onSaved ? onSaved(saved) : route();
      } catch (err) { fail(err); }
    };
  });
}

async function viewCliente(v, id) {
  const [c, inst, contratos, avisos] = await Promise.all([
    q(sb.from('clientes').select('*').eq('id', id).single()),
    q(sb.from('instalaciones').select('*,equipos(*)').eq('cliente_id', id).order('nombre')),
    q(sb.from('contratos').select('id,referencia,periodicidad_meses,activo,instalaciones(nombre)').eq('cliente_id', id)),
    q(sb.from('avisos').select('id,numero,titulo,estado,prioridad,creado_en,clientes(nombre),instalaciones(nombre),tecnico:perfiles!avisos_tecnico_id_fkey(nombre)').eq('cliente_id', id).order('creado_en', { ascending: false }).limit(15))
  ]);
  v.innerHTML = `<a class="back" href="#/clientes">← Clientes</a>
    <div class="page-head"><div><h1>${esc(c.nombre)}</h1><div class="muted">${esc([TIPOS_CLIENTE[c.tipo], c.cif].filter(Boolean).join(' · '))}</div></div>
      <div class="row">${isOficina() ? `<button class="btn-ghost" id="ed">Editar</button><a class="btn btn-warm" href="#" id="nav">+ Aviso</a>` : ''}</div></div>
    <div class="grid g2">
      <div class="card"><h2>Datos de contacto</h2><dl class="kv">
        <dt>Teléfono</dt><dd>${c.telefono ? `<a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>` : '—'}</dd>
        <dt>Email</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
        <dt>Contacto</dt><dd>${esc(c.contacto || '—')}</dd>
        <dt>Dirección</dt><dd>${esc([c.direccion, c.cp, c.poblacion].filter(Boolean).join(', ') || '—')}</dd></dl>
        ${c.notas ? `<p style="white-space:pre-wrap">${esc(c.notas)}</p>` : ''}</div>
      <div class="card"><div class="card-head"><h2>Contratos de mantenimiento</h2>${isOficina() ? '<button class="btn-sm btn-ghost" id="nct">+ Contrato</button>' : ''}</div>
        <div class="list">${contratos.map(k => `<a class="item" href="#/contrato/${k.id}"><div class="main"><div class="t">${esc(k.referencia || 'Contrato')}</div>
          <div class="s">${esc(k.instalaciones?.nombre || 'Todas')} · cada ${k.periodicidad_meses} meses</div></div>
          <div class="r">${k.activo ? '<span class="badge b-resuelto">Activo</span>' : '<span class="badge b-cerrado">Inactivo</span>'}</div></a>`).join('') || '<div class="empty">Sin contrato</div>'}</div></div>
    </div>
    <div class="card"><div class="card-head"><h2>Instalaciones y equipos</h2>${isOficina() ? '<button class="btn-sm btn-ghost" id="ni">+ Instalación</button>' : ''}</div>
      ${inst.map(i => `<div style="border-top:1px solid var(--line);padding:12px 0">
        <div class="card-head" style="margin-bottom:6px"><div><h3 style="margin:0">${esc(i.nombre)}</h3>
          <div class="small muted">${esc([i.direccion, i.poblacion].filter(Boolean).join(', '))}${i.acceso ? ' · Acceso: ' + esc(i.acceso) : ''}</div></div>
          <div class="row">${isOficina() ? `<button class="btn-sm btn-ghost" data-ei="${i.id}">Editar</button>` : ''}<button class="btn-sm btn-ghost" data-ne="${i.id}">+ Equipo</button></div></div>
        ${i.equipos.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Equipo</th><th>Ubicación</th><th>Gas</th><th>Nº serie</th><th>Instalado</th><th></th></tr>
          ${i.equipos.map(e => `<tr><td><b>${esc(e.tipo)}</b> ${esc([e.marca, e.modelo].filter(Boolean).join(' '))}${e.potencia_kw ? ' · ' + e.potencia_kw + ' kW' : ''}</td>
            <td>${esc(e.ubicacion || '')}</td><td>${esc(e.refrigerante || '')}${e.carga_kg ? ' · ' + e.carga_kg + ' kg' : ''}</td>
            <td>${esc(e.num_serie || '')}</td><td>${fDate(e.fecha_instalacion)}</td>
            <td>${isOficina() ? `<button class="btn-sm btn-ghost" data-ee="${e.id}">Editar</button>` : ''}</td></tr>`).join('')}</table></div>`
          : '<div class="empty small">Sin equipos registrados</div>'}</div>`).join('') || '<div class="empty">Sin instalaciones</div>'}
    </div>
    <div class="card"><h2>Últimos avisos</h2><div class="list">${avisos.map(avisoItem).join('') || '<div class="empty">Sin avisos</div>'}</div></div>`;

  if ($('#ed')) $('#ed').onclick = () => clienteForm(c);
  if ($('#nav')) $('#nav').onclick = e => { e.preventDefault(); avisoForm({}, { cliente_id: id }); };
  if ($('#nct')) $('#nct').onclick = () => contratoForm({}, { cliente_id: id });
  if ($('#ni')) $('#ni').onclick = () => instalacionForm({ cliente_id: id, poblacion: c.poblacion });
  $$('[data-ei]').forEach(b => b.onclick = () => instalacionForm(inst.find(i => i.id === b.dataset.ei)));
  $$('[data-ne]').forEach(b => b.onclick = () => equipoForm({ instalacion_id: b.dataset.ne }, () => route()));
  $$('[data-ee]').forEach(b => b.onclick = () => equipoForm(inst.flatMap(i => i.equipos).find(e => e.id === b.dataset.ee), () => route()));
}

function instalacionForm(i = {}) {
  openModal(`<h2>${i.id ? 'Editar instalación' : 'Nueva instalación'}</h2>
    <form id="fi">
      <div class="field"><label>Nombre *</label><input name="nombre" required value="${esc(i.nombre)}" placeholder="Ej.: Local C/ Larios, Planta 2…"></div>
      <div class="field"><label>Dirección</label><input name="direccion" value="${esc(i.direccion)}"></div>
      <div class="row"><div class="field"><label>Población</label><input name="poblacion" value="${esc(i.poblacion ?? 'Málaga')}"></div>
        <div class="field"><label>CP</label><input name="cp" value="${esc(i.cp)}"></div></div>
      <div class="row"><div class="field"><label>Contacto en sitio</label><input name="contacto" value="${esc(i.contacto)}"></div>
        <div class="field"><label>Teléfono</label><input name="telefono" type="tel" value="${esc(i.telefono)}"></div></div>
      <div class="field"><label>Acceso / horarios / observaciones</label><textarea name="acceso">${esc(i.acceso)}</textarea></div>
      <div class="actions">${i.id ? '<button type="button" class="btn-danger" id="del" style="margin-right:auto">Eliminar</button>' : ''}
        <button type="button" class="btn-ghost" data-close>Cancelar</button><button>Guardar</button></div>
    </form>`, m => {
    $('#fi', m).onsubmit = async e => {
      e.preventDefault();
      const d = formData(e.target);
      try {
        if (i.id) await q(sb.from('instalaciones').update(d).eq('id', i.id));
        else await q(sb.from('instalaciones').insert({ ...d, cliente_id: i.cliente_id }));
        modal.close(); toast('Instalación guardada'); route();
      } catch (err) { fail(err); }
    };
    if ($('#del', m)) $('#del', m).onclick = async () => {
      if (!(await confirmar('¿Eliminar la instalación y todos sus equipos?'))) return;
      try { await q(sb.from('instalaciones').delete().eq('id', i.id)); toast('Instalación eliminada'); route(); } catch (err) { fail(err); }
    };
  });
}

function equipoForm(e = {}, onSaved) {
  openModal(`<h2>${e.id ? 'Editar equipo' : 'Nuevo equipo'}</h2>
    <form id="feq">
      <div class="row"><div class="field"><label>Tipo *</label><select name="tipo" required>${optsArr(TIPOS_EQUIPO, e.tipo || 'split')}</select></div>
        <div class="field"><label>Ubicación</label><input name="ubicacion" value="${esc(e.ubicacion)}" placeholder="Ej.: Sala reuniones, cubierta"></div></div>
      <div class="row"><div class="field"><label>Marca</label><input name="marca" value="${esc(e.marca)}" list="marcas"></div>
        <div class="field"><label>Modelo</label><input name="modelo" value="${esc(e.modelo)}"></div></div>
      <datalist id="marcas">${['Daikin', 'Mitsubishi Electric', 'Fujitsu', 'LG', 'Samsung', 'Panasonic', 'Toshiba', 'Hitachi', 'Carrier', 'Gree', 'Haier', 'Midea', 'Hisense', 'Baxi', 'Saunier Duval', 'Ferroli', 'Vaillant'].map(m => `<option value="${m}">`).join('')}</datalist>
      <div class="row"><div class="field"><label>Nº de serie</label><input name="num_serie" value="${esc(e.num_serie)}"></div>
        <div class="field"><label>Potencia (kW)</label><input name="potencia_kw" type="number" step="0.01" value="${e.potencia_kw ?? ''}"></div></div>
      <div class="row"><div class="field"><label>Refrigerante</label><select name="refrigerante">${optsArr(REFRIGERANTES, e.refrigerante, '—')}</select></div>
        <div class="field"><label>Carga (kg)</label><input name="carga_kg" type="number" step="0.01" value="${e.carga_kg ?? ''}"></div></div>
      <div class="row"><div class="field"><label>Fecha instalación</label><input name="fecha_instalacion" type="date" value="${esc(e.fecha_instalacion)}"></div>
        <div class="field"><label>Garantía hasta</label><input name="garantia_hasta" type="date" value="${esc(e.garantia_hasta)}"></div></div>
      <div class="field"><label>Notas</label><textarea name="notas">${esc(e.notas)}</textarea></div>
      <div class="actions"><button type="button" class="btn-ghost" data-close>Cancelar</button><button>Guardar</button></div>
    </form>`, m => {
    $('#feq', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = formData(ev.target);
      try {
        const saved = e.id ? await q(sb.from('equipos').update(d).eq('id', e.id).select().single())
          : await q(sb.from('equipos').insert({ ...d, instalacion_id: e.instalacion_id }).select().single());
        modal.close(); toast('Equipo guardado'); onSaved && onSaved(saved);
      } catch (err) { fail(err); }
    };
  });
}
