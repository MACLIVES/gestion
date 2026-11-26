// ---------------------------------------------------------------
// MACLIVE · js/avisos.js — Avisos y averías: listado con filtros, alta/edición, detalle, estados e historial
// ---------------------------------------------------------------
'use strict';

async function viewAvisos(v, _id, params) {
  const st = { estado: params.get('estado') || 'abiertos', prioridad: params.get('prioridad') || '', tecnico: '', texto: '' };
  const tecnicos = isOficina() ? await tecnicosList() : [];
  v.innerHTML = `<div class="page-head"><h1>Avisos y averías</h1>${isOficina() ? '<button class="btn-warm" id="nuevo">+ Nuevo aviso</button>' : ''}</div>
    <div class="chips" id="chips">${[['abiertos', 'Abiertos'], ['nuevo', 'Sin asignar'], ['en_curso', 'En curso'], ['pendiente_material', 'Pend. material'], ['resuelto', 'Resueltos'], ['cerrado', 'Cerrados'], ['todos', 'Todos']]
      .map(([k, l]) => `<button class="chip${k === st.estado ? ' on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="filters">
      <input id="ftxt" placeholder="Buscar título o nº…">
      <select id="fprio">${opts(PRIORIDADES, st.prioridad, 'Todas las prioridades')}</select>
      ${isOficina() ? `<select id="ftec">${optsRows(tecnicos, '', 'Todos los técnicos')}<option value="none">Sin asignar</option></select>` : ''}
    </div>
    <div class="card"><div class="list" id="lst"><p class="muted">Cargando…</p></div></div>`;

  async function load() {
    let qq = sb.from('avisos').select('id,numero,titulo,estado,prioridad,fecha_programada,creado_en,clientes(nombre),instalaciones(nombre,poblacion),tecnico:perfiles!avisos_tecnico_id_fkey(nombre)')
      .order('creado_en', { ascending: false }).limit(200);
    if (st.estado === 'abiertos') qq = qq.not('estado', 'in', '(resuelto,cerrado,cancelado)');
    else if (st.estado !== 'todos') qq = qq.eq('estado', st.estado);
    if (st.prioridad) qq = qq.eq('prioridad', st.prioridad);
    if (st.tecnico === 'none') qq = qq.is('tecnico_id', null); else if (st.tecnico) qq = qq.eq('tecnico_id', st.tecnico);
    if (st.texto) qq = qq.or(`titulo.ilike.%${st.texto.replace(/[,()%]/g, ' ')}%,numero.ilike.%${st.texto.replace(/[,()%]/g, ' ')}%`);
    const rows = await q(qq);
    $('#lst').innerHTML = rows.length ? rows.map(avisoItem).join('') : '<div class="empty">No hay avisos con estos filtros</div>';
  }
  $$('#chips .chip').forEach(b => b.onclick = () => { st.estado = b.dataset.k; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === b)); load().catch(fail); });
  $('#fprio').onchange = e => { st.prioridad = e.target.value; load().catch(fail); };
  if ($('#ftec')) $('#ftec').onchange = e => { st.tecnico = e.target.value; load().catch(fail); };
  let t; $('#ftxt').oninput = e => { clearTimeout(t); t = setTimeout(() => { st.texto = e.target.value.trim(); load().catch(fail); }, 300); };
  if ($('#nuevo')) $('#nuevo').onclick = () => avisoForm();
  await load();
  if (params.get('nuevo') && isOficina()) avisoForm();
}

async function avisoForm(a = {}, preset = {}) {
  const [clientes, tecnicos] = await Promise.all([clientesList(), tecnicosList()]);
  const cid = a.cliente_id || preset.cliente_id;
  const [inst, eqs] = await Promise.all([instalacionesDe(cid), equiposDe(a.instalacion_id || preset.instalacion_id)]);
  openModal(`<h2>${a.id ? 'Editar aviso ' + esc(a.numero) : 'Nuevo aviso'}</h2>
    <form id="fa">
      <div class="field"><label>Cliente *</label><select name="cliente_id" required>${optsRows(clientes, cid, '— Cliente —')}</select>
        <div class="small" style="margin-top:4px"><a href="#" id="nc">+ Cliente nuevo</a></div></div>
      <div class="row"><div class="field"><label>Instalación</label><select name="instalacion_id">${optsRows(inst, a.instalacion_id || preset.instalacion_id || (inst.length === 1 ? inst[0].id : null), '— Instalación —')}</select></div>
        <div class="field"><label>Equipo</label><select name="equipo_id">${optsRows(eqs, a.equipo_id || preset.equipo_id, '— Equipo (opcional) —', equipoLabel)}</select></div></div>
      <div class="field"><label>Título / síntoma *</label><input name="titulo" required value="${esc(a.titulo)}" placeholder="Ej.: No enfría, gotea, salta el diferencial…"></div>
      <div class="field"><label>Descripción</label><textarea name="descripcion">${esc(a.descripcion)}</textarea></div>
      <div class="row">
        <div class="field"><label>Tipo</label><select name="tipo">${opts(TIPOS_AVISO, a.tipo || 'averia')}</select></div>
        <div class="field"><label>Prioridad</label><select name="prioridad">${opts(PRIORIDADES, a.prioridad || 'normal')}</select></div></div>
      <div class="row">
        <div class="field"><label>Persona de contacto</label><input name="contacto" value="${esc(a.contacto)}"></div>
        <div class="field"><label>Teléfono contacto</label><input name="telefono" type="tel" value="${esc(a.telefono)}"></div></div>
      <div class="row">
        <div class="field"><label>Técnico</label><select name="tecnico_id">${optsRows(tecnicos, a.tecnico_id, '— Sin asignar —')}</select></div>
        <div class="field"><label>Fecha / hora prevista</label><input name="fecha_programada" type="datetime-local" value="${toLocalInput(a.fecha_programada)}"></div></div>
      <div class="actions"><button type="button" class="btn-ghost" data-close>Cancelar</button><button>Guardar</button></div>
    </form>`, m => {
    const f = $('#fa', m);
    bindCascade(f);
    $('#nc', m).onclick = e => { e.preventDefault(); clienteForm({}, async nuevo => { await clientesList(true); avisoForm({ ...a, ...formData(f), cliente_id: nuevo.id }); }); };
    f.onsubmit = async e => {
      e.preventDefault();
      const d = formData(f);
      d.fecha_programada = d.fecha_programada ? new Date(d.fecha_programada).toISOString() : null;
      const btn = $('button:not([type])', f); btn.disabled = true;
      try {
        const saved = a.id ? await q(sb.from('avisos').update(d).eq('id', a.id).select().single())
          : await q(sb.from('avisos').insert(d).select().single());
        modal.close(); toast('Aviso guardado');
        if (location.hash === '#/aviso/' + saved.id) route(); else location.hash = '#/aviso/' + saved.id;
      } catch (err) { fail(err); btn.disabled = false; }
    };
  });
}

async function viewAviso(v, id) {
  const a = await q(sb.from('avisos').select('*,clientes(id,nombre,telefono),instalaciones(id,nombre,direccion,poblacion,acceso,contacto,telefono),equipos(*),tecnico:perfiles!avisos_tecnico_id_fkey(id,nombre)').eq('id', id).single());
  const [hist, partes, tecnicos] = await Promise.all([
    q(sb.from('avisos_historial').select('*,perfiles(nombre)').eq('aviso_id', id).order('creado_en', { ascending: false })),
    q(sb.from('partes').select('id,numero,fecha,estado,horas,perfiles!partes_tecnico_id_fkey(nombre)').eq('aviso_id', id).order('fecha', { ascending: false })),
    isOficina() ? tecnicosList() : []
  ]);
  const inst = a.instalaciones, eq = a.equipos;
  const dir = inst ? [inst.direccion, inst.poblacion].filter(Boolean).join(', ') : '';
  const tel = a.telefono || inst?.telefono || a.clientes?.telefono;
  const cerrado = ['cerrado', 'cancelado'].includes(a.estado);

  v.innerHTML = `<a class="back" href="#/avisos">← Avisos</a>
    <div class="page-head"><div><h1>${esc(a.titulo)}</h1><div class="muted">${esc(a.numero)} · ${TIPOS_AVISO[a.tipo]} · creado ${fDateTime(a.creado_en)}</div></div>
      <div class="row">${badge(a.prioridad, PRIORIDADES, 'p-')} ${badge(a.estado, ESTADOS_AVISO)}</div></div>
    <div class="grid g2">
      <div>
        <div class="card"><h2>Datos</h2><dl class="kv">
          <dt>Cliente</dt><dd><a href="#/cliente/${a.clientes.id}">${esc(a.clientes.nombre)}</a></dd>
          <dt>Instalación</dt><dd>${inst ? esc(inst.nombre) : '—'}</dd>
          <dt>Dirección</dt><dd>${dir ? `${esc(dir)} · <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}">Mapa</a>` : '—'}</dd>
          ${inst?.acceso ? `<dt>Acceso</dt><dd>${esc(inst.acceso)}</dd>` : ''}
          <dt>Contacto</dt><dd>${esc(a.contacto || inst?.contacto || '—')}${tel ? ` · <a href="tel:${esc(tel)}">${esc(tel)}</a>` : ''}</dd>
          <dt>Equipo</dt><dd>${eq ? esc(equipoLabel(eq)) + (eq.refrigerante ? ' · ' + esc(eq.refrigerante) : '') + (eq.num_serie ? ' · S/N ' + esc(eq.num_serie) : '') : '—'}</dd>
          <dt>Técnico</dt><dd>${a.tecnico ? esc(a.tecnico.nombre) : '<i>Sin asignar</i>'}</dd>
          <dt>Prevista</dt><dd>${fDateTime(a.fecha_programada)}</dd>
        </dl>${a.descripcion ? `<p style="white-space:pre-wrap;margin:12px 0 0">${esc(a.descripcion)}</p>` : ''}
        <div class="actions">${isOficina() ? '<button class="btn-ghost" id="edit">Editar</button>' : ''}
          ${!cerrado ? `<a class="btn btn-ice" href="#/parte-editar?aviso=${a.id}">+ Parte de trabajo</a>` : ''}</div></div>

        <div class="card"><h2>Cambiar estado</h2>
          <form id="fe" class="row" style="align-items:flex-end">
            <div class="field"><label>Estado</label><select name="estado">${opts(isOficina() ? ESTADOS_AVISO : { asignado: 'Asignado', en_curso: 'En curso', pendiente_material: 'Pend. material', resuelto: 'Resuelto' }, a.estado)}</select></div>
            ${isOficina() ? `<div class="field"><label>Técnico</label><select name="tecnico_id">${optsRows(tecnicos, a.tecnico_id, '— Sin asignar —')}</select></div>` : ''}
            <div class="field" style="flex-basis:100%"><label>Comentario (opcional)</label><input name="comentario" placeholder="Ej.: pedido compresor, vuelvo el jueves"></div>
            <button>Actualizar</button></form></div>
      </div>
      <div>
        <div class="card"><div class="card-head"><h2>Partes</h2></div><div class="list">${partes.length ? partes.map(p => `
          <a class="item" href="#/parte/${p.id}"><div class="main"><div class="t">${esc(p.numero)}</div><div class="s">${fDate(p.fecha)} · ${esc(p.perfiles?.nombre)} · ${p.horas ?? '—'} h</div></div><div class="r">${badge(p.estado, ESTADOS_PARTE)}</div></a>`).join('')
          : '<div class="empty">Sin partes todavía</div>'}</div></div>
        <div class="card"><h2>Historial</h2><ul class="timeline">${hist.map(h => `<li><b>${esc(ESTADOS_AVISO[h.estado] || h.estado || '')}</b> · ${esc(h.comentario)}<div class="small muted">${fDateTime(h.creado_en)} · ${esc(h.perfiles?.nombre || 'Sistema')}</div></li>`).join('')}</ul></div>
      </div>
    </div>`;

  if ($('#edit')) $('#edit').onclick = () => avisoForm(a);
  $('#fe').onsubmit = async e => {
    e.preventDefault();
    const d = formData(e.target), coment = d.comentario; delete d.comentario;
    try {
      const changed = d.estado !== a.estado || (isOficina() && d.tecnico_id !== a.tecnico_id);
      if (changed) await q(sb.from('avisos').update(d).eq('id', a.id));
      if (coment) await q(sb.from('avisos_historial').insert({ aviso_id: a.id, estado: d.estado, comentario: coment }));
      toast('Aviso actualizado'); route();
    } catch (err) { fail(err); }
  };
}
