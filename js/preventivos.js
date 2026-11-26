// ---------------------------------------------------------------
// MACLIVE · js/preventivos.js — Mantenimiento preventivo: revisiones planificadas y contratos
// ---------------------------------------------------------------
'use strict';

async function viewPreventivos(v, _id, params) {
  const tab = params.get('tab') || 'revisiones';
  const filtro = params.get('f') || 'proximas';
  v.innerHTML = `<div class="page-head"><h1>Mantenimiento preventivo</h1>
      ${isOficina() ? '<button class="btn-warm" id="nuevoC">+ Nuevo contrato</button>' : ''}</div>
    <div class="chips">
      <a class="chip${tab === 'revisiones' ? ' on' : ''}" href="#/preventivos?tab=revisiones">Revisiones</a>
      <a class="chip${tab === 'contratos' ? ' on' : ''}" href="#/preventivos?tab=contratos">Contratos</a></div>
    <div id="pv"></div>`;
  if ($('#nuevoC')) $('#nuevoC').onclick = () => contratoForm();
  const pv = $('#pv');

  if (tab === 'contratos') {
    const rows = await q(sb.from('contratos').select('*,clientes(nombre),instalaciones(nombre)').order('creado_en', { ascending: false }));
    pv.innerHTML = `<div class="card"><div class="list">${rows.length ? rows.map(c => `<a class="item" href="#/contrato/${c.id}"><div class="main">
      <div class="t">${esc(c.clientes?.nombre)}${c.instalaciones ? ' · ' + esc(c.instalaciones.nombre) : ''}</div>
      <div class="s">${esc(c.referencia || 'Sin referencia')} · cada ${c.periodicidad_meses} meses · desde ${fDate(c.fecha_inicio)}${c.fecha_fin ? ' hasta ' + fDate(c.fecha_fin) : ''}</div></div>
      <div class="r">${c.activo ? '<span class="badge b-resuelto">Activo</span>' : '<span class="badge b-cerrado">Inactivo</span>'}</div></a>`).join('') : '<div class="empty">No hay contratos de mantenimiento</div>'}</div></div>`;
    return;
  }

  const tecnicos = isOficina() ? await tecnicosList() : [];
  pv.innerHTML = `<div class="chips" id="rf">${[['vencidas', 'Vencidas'], ['proximas', 'Próximos 30 días'], ['mes', 'Este mes'], ['pendientes', 'Todas pendientes'], ['realizadas', 'Realizadas']]
    .map(([k, l]) => `<button class="chip${k === filtro ? ' on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="card"><div class="tbl-wrap" id="rl"></div></div>`;

  async function load(f) {
    const hoy = today();
    let qq = sb.from('revisiones').select('id,fecha_prevista,estado,tecnico_id,parte_id,contratos(id,referencia,clientes(nombre),instalaciones(nombre,poblacion))').order('fecha_prevista').limit(300);
    if (f === 'vencidas') qq = qq.in('estado', ['pendiente', 'programada']).lt('fecha_prevista', hoy);
    if (f === 'proximas') qq = qq.in('estado', ['pendiente', 'programada']).gte('fecha_prevista', hoy).lte('fecha_prevista', new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
    if (f === 'mes') { const d = new Date(); const ini = new Date(d.getFullYear(), d.getMonth(), 1), fin = new Date(d.getFullYear(), d.getMonth() + 1, 0); qq = qq.gte('fecha_prevista', ini.toLocaleDateString('sv')).lte('fecha_prevista', fin.toLocaleDateString('sv')); }
    if (f === 'pendientes') qq = qq.in('estado', ['pendiente', 'programada']);
    if (f === 'realizadas') qq = qq.eq('estado', 'realizada').order('fecha_prevista', { ascending: false });
    const rows = await q(qq);
    $('#rl').innerHTML = rows.length ? `<table class="tbl"><tr><th>Fecha</th><th>Cliente / instalación</th><th>Técnico</th><th>Estado</th><th></th></tr>
      ${rows.map(r => {
        const venc = r.fecha_prevista < hoy && ['pendiente', 'programada'].includes(r.estado);
        const c = r.contratos || {};
        return `<tr><td>${fDate(r.fecha_prevista)}</td>
          <td><a href="#/contrato/${c.id}">${esc(c.clientes?.nombre)}</a><div class="small muted">${esc(c.instalaciones?.nombre || '')} ${esc(c.instalaciones?.poblacion || '')}</div></td>
          <td>${isOficina() && r.estado !== 'realizada' ? `<select data-rt="${r.id}" style="min-width:140px">${optsRows(tecnicos, r.tecnico_id, '— Sin asignar —')}</select>` : esc(tecnicos.find(t => t.id === r.tecnico_id)?.nombre || (r.tecnico_id === S.me.id ? S.me.nombre : '—'))}</td>
          <td>${venc ? '<span class="badge b-vencida">Vencida</span>' : badge(r.estado, ESTADOS_REV)}</td>
          <td style="white-space:nowrap">${r.parte_id ? `<a class="btn btn-sm btn-ghost" href="#/parte/${r.parte_id}">Ver parte</a>`
            : ['pendiente', 'programada'].includes(r.estado) ? `<a class="btn btn-sm btn-ice" href="#/parte-editar?revision=${r.id}">Hacer parte</a>` : ''}</td></tr>`;
      }).join('')}</table>` : '<div class="empty">No hay revisiones en este filtro</div>';
    $$('[data-rt]').forEach(s => s.onchange = async () => {
      try { await q(sb.from('revisiones').update({ tecnico_id: s.value || null, estado: s.value ? 'programada' : 'pendiente' }).eq('id', s.dataset.rt)); toast('Técnico asignado'); }
      catch (e) { fail(e); }
    });
  }
  $$('#rf .chip').forEach(b => b.onclick = () => { $$('#rf .chip').forEach(x => x.classList.toggle('on', x === b)); load(b.dataset.k).catch(fail); });
  await load(filtro);
}

async function contratoForm(c = {}, preset = {}) {
  const clientes = await clientesList();
  const cid = c.cliente_id || preset.cliente_id;
  const inst = await instalacionesDe(cid);
  const checklist = (c.checklist || null);
  openModal(`<h2>${c.id ? 'Editar contrato' : 'Nuevo contrato de mantenimiento'}</h2>
    <form id="fc">
      <div class="field"><label>Cliente *</label><select name="cliente_id" required>${optsRows(clientes, cid)}</select></div>
      <div class="field"><label>Instalación</label><select name="instalacion_id">${optsRows(inst, c.instalacion_id || preset.instalacion_id || (inst.length === 1 ? inst[0].id : null), '— Todas / sin especificar —')}</select></div>
      <div class="row"><div class="field"><label>Referencia</label><input name="referencia" value="${esc(c.referencia)}" placeholder="Ej.: MNT-2027-014"></div>
        <div class="field"><label>Revisión cada (meses)</label><select name="periodicidad_meses">${opts({ 1: 'Mensual', 2: 'Bimestral', 3: 'Trimestral', 4: 'Cuatrimestral', 6: 'Semestral', 12: 'Anual' }, String(c.periodicidad_meses || 6))}</select></div></div>
      <div class="row"><div class="field"><label>Inicio *</label><input type="date" name="fecha_inicio" required value="${esc(c.fecha_inicio || today())}"></div>
        <div class="field"><label>Fin</label><input type="date" name="fecha_fin" value="${esc(c.fecha_fin)}"></div>
        <div class="field"><label>Importe anual (€)</label><input type="number" step="0.01" name="importe_anual" value="${c.importe_anual ?? ''}"></div></div>
      <div class="field"><label>Descripción / alcance</label><textarea name="descripcion">${esc(c.descripcion)}</textarea></div>
      <div class="field"><label>Checklist de la revisión (una tarea por línea)</label><textarea name="checklist_txt" rows="7" placeholder="Se usará la lista estándar si lo dejas vacío">${esc((checklist || []).join('\n'))}</textarea></div>
      ${c.id ? `<label class="check"><input type="checkbox" name="activo" ${c.activo ? 'checked' : ''}>Contrato activo</label>` : ''}
      <div class="actions"><button type="button" class="btn-ghost" data-close>Cancelar</button><button>Guardar${c.id ? '' : ' y generar revisiones'}</button></div>
    </form>`, m => {
    const f = $('#fc', m); bindCascade(f);
    f.onsubmit = async e => {
      e.preventDefault();
      const d = formData(f); const txt = d.checklist_txt; delete d.checklist_txt;
      if (txt) d.checklist = txt.split('\n').map(s => s.trim()).filter(Boolean);
      d.periodicidad_meses = Number(d.periodicidad_meses);
      try {
        const saved = c.id ? await q(sb.from('contratos').update(d).eq('id', c.id).select().single())
          : await q(sb.from('contratos').insert(d).select().single());
        if (!c.id) { const n = await q(sb.rpc('generar_revisiones', { p_contrato: saved.id })); toast(`Contrato creado · ${n} revisiones planificadas`); }
        else toast('Contrato guardado');
        modal.close();
        if (location.hash === '#/contrato/' + saved.id) route(); else location.hash = '#/contrato/' + saved.id;
      } catch (err) { fail(err); }
    };
  });
}

async function viewContrato(v, id) {
  const c = await q(sb.from('contratos').select('*,clientes(id,nombre),instalaciones(nombre,direccion,poblacion)').eq('id', id).single());
  const revs = await q(sb.from('revisiones').select('id,fecha_prevista,estado,parte_id,tecnico:perfiles!revisiones_tecnico_id_fkey(nombre)').eq('contrato_id', id).order('fecha_prevista'));
  const hoy = today();
  v.innerHTML = `<a class="back" href="#/preventivos?tab=contratos">← Contratos</a>
    <div class="page-head"><div><h1>${esc(c.clientes.nombre)}</h1><div class="muted">${esc(c.referencia || 'Contrato de mantenimiento')} · cada ${c.periodicidad_meses} meses</div></div>
      ${isOficina() ? '<div class="row"><button class="btn-ghost" id="ed">Editar</button><button id="gen">Generar revisiones</button></div>' : ''}</div>
    <div class="grid g2">
      <div class="card"><h2>Contrato</h2><dl class="kv">
        <dt>Cliente</dt><dd><a href="#/cliente/${c.clientes.id}">${esc(c.clientes.nombre)}</a></dd>
        <dt>Instalación</dt><dd>${c.instalaciones ? esc(c.instalaciones.nombre) + ' · ' + esc([c.instalaciones.direccion, c.instalaciones.poblacion].filter(Boolean).join(', ')) : '—'}</dd>
        <dt>Vigencia</dt><dd>${fDate(c.fecha_inicio)} – ${c.fecha_fin ? fDate(c.fecha_fin) : 'indefinido'}</dd>
        ${isOficina() && c.importe_anual ? `<dt>Importe anual</dt><dd>${Number(c.importe_anual).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</dd>` : ''}
        <dt>Estado</dt><dd>${c.activo ? 'Activo' : 'Inactivo'}</dd></dl>
        ${c.descripcion ? `<p style="white-space:pre-wrap">${esc(c.descripcion)}</p>` : ''}
        <h3 style="margin-top:12px">Checklist</h3><ul>${(c.checklist || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>Revisiones</h2><div class="list">${revs.map(r => {
        const venc = r.fecha_prevista < hoy && ['pendiente', 'programada'].includes(r.estado);
        return `<div class="item"><div class="main"><div class="t">${fDate(r.fecha_prevista)}</div><div class="s">${r.tecnico ? esc(r.tecnico.nombre) : 'Sin asignar'}</div></div>
          <div class="r">${venc ? '<span class="badge b-vencida">Vencida</span>' : badge(r.estado, ESTADOS_REV)}
          ${r.parte_id ? `<a class="small" href="#/parte/${r.parte_id}">Ver parte</a>` : ['pendiente', 'programada'].includes(r.estado) ? `<a class="btn btn-sm btn-ice" href="#/parte-editar?revision=${r.id}">Hacer parte</a>` : ''}</div></div>`;
      }).join('') || '<div class="empty">Sin revisiones</div>'}</div></div>
    </div>`;
  if ($('#ed')) $('#ed').onclick = () => contratoForm(c);
  if ($('#gen')) $('#gen').onclick = async () => {
    try { const n = await q(sb.rpc('generar_revisiones', { p_contrato: id })); toast(n ? `${n} revisiones nuevas` : 'Ya estaban todas generadas'); route(); } catch (e) { fail(e); }
  };
}
