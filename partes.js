// ---------------------------------------------------------------
// MACLIVE · js/partes.js — Partes de trabajo: listado, detalle, impresión/PDF, validar y facturar
// ---------------------------------------------------------------
'use strict';

async function viewPartes(v, _id, params) {
  const st = { estado: params.get('estado') || '', tecnico: '', desde: '', hasta: '' };
  const tecnicos = isOficina() ? await tecnicosList() : [];
  v.innerHTML = `<div class="page-head"><h1>Partes de trabajo</h1><a class="btn btn-ice" href="#/parte-editar">+ Nuevo parte</a></div>
    <div class="filters">
      <select id="fest">${opts(ESTADOS_PARTE, st.estado, 'Todos los estados')}</select>
      ${isOficina() ? `<select id="ftec">${optsRows(tecnicos, '', 'Todos los técnicos')}</select>` : ''}
      <input type="date" id="fdes" title="Desde"><input type="date" id="fhas" title="Hasta">
    </div>
    <div class="card"><div class="list" id="lst"></div></div>`;
  async function load() {
    let qq = sb.from('partes').select('id,numero,fecha,tipo,estado,horas,trabajo_realizado,clientes(nombre),instalaciones(nombre),perfiles!partes_tecnico_id_fkey(nombre),avisos(numero)')
      .order('fecha', { ascending: false }).order('creado_en', { ascending: false }).limit(200);
    if (st.estado) qq = qq.eq('estado', st.estado);
    if (st.tecnico) qq = qq.eq('tecnico_id', st.tecnico);
    if (st.desde) qq = qq.gte('fecha', st.desde);
    if (st.hasta) qq = qq.lte('fecha', st.hasta);
    const rows = await q(qq);
    const totalH = rows.reduce((s, r) => s + (Number(r.horas) || 0), 0);
    $('#lst').innerHTML = rows.length ? rows.map(p => `<a class="item" href="#/parte/${p.id}"><div class="main">
        <div class="t">${esc(p.clientes?.nombre)}${p.instalaciones ? ' · ' + esc(p.instalaciones.nombre) : ''}</div>
        <div class="s">${esc(p.numero)} · ${fDate(p.fecha)} · ${TIPOS_PARTE[p.tipo]} · ${esc(p.perfiles?.nombre)}${p.avisos ? ' · ' + esc(p.avisos.numero) : ''}</div>
        <div class="s">${esc((p.trabajo_realizado || '').slice(0, 110))}</div></div>
        <div class="r">${badge(p.estado, ESTADOS_PARTE)}<span class="small muted">${p.horas ?? '—'} h</span></div></a>`).join('')
      + `<div class="small muted" style="padding:10px 4px">${rows.length} partes · ${totalH.toFixed(2)} horas</div>`
      : '<div class="empty">No hay partes</div>';
  }
  $('#fest').onchange = e => { st.estado = e.target.value; load().catch(fail); };
  if ($('#ftec')) $('#ftec').onchange = e => { st.tecnico = e.target.value; load().catch(fail); };
  $('#fdes').onchange = e => { st.desde = e.target.value; load().catch(fail); };
  $('#fhas').onchange = e => { st.hasta = e.target.value; load().catch(fail); };
  await load();
}


// Detalle / impresión del parte
async function viewParte(v, id) {
  const p = await q(sb.from('partes').select('*,clientes(*),instalaciones(*),equipos(*),perfiles!partes_tecnico_id_fkey(nombre),avisos(id,numero,titulo)').eq('id', id).single());
  const [mats, fotos] = await Promise.all([
    q(sb.from('partes_materiales').select('*').eq('parte_id', id)),
    q(sb.from('partes_fotos').select('*').eq('parte_id', id).order('creado_en'))
  ]);
  const [firmaUrl, fotoUrls] = await Promise.all([p.firma_url ? signedUrl(p.firma_url) : null, signedUrls(fotos.map(f => f.ruta))]);
  const c = p.clientes, inst = p.instalaciones, eq = p.equipos;
  const editable = isOficina() || ['borrador', 'firmado'].includes(p.estado);

  v.innerHTML = `<a class="back no-print" href="#/partes">← Partes</a>
    <div class="print-only print-head"><div><div class="brand-name" style="font-size:1.4rem">${esc(EMP.nombre)}</div>
      <div class="small">${esc([EMP.subtitulo, EMP.cif && 'CIF ' + EMP.cif].filter(Boolean).join(' · '))}</div>
      <div class="small">${esc([EMP.direccion, EMP.telefono, EMP.email].filter(Boolean).join(' · '))}</div></div>
      <div style="text-align:right"><div style="font-size:1.2rem;font-weight:800">PARTE DE TRABAJO</div><div>${esc(p.numero)}</div><div>${fDate(p.fecha)}</div></div></div>
    <div class="page-head no-print"><div><h1>Parte ${esc(p.numero)}</h1><div class="muted">${fDate(p.fecha)} · ${TIPOS_PARTE[p.tipo]} · ${esc(p.perfiles?.nombre)}</div></div>
      <div class="row">${badge(p.estado, ESTADOS_PARTE)}</div></div>
    <div class="actions no-print" style="justify-content:flex-start;margin:0 0 14px">
      ${editable ? `<a class="btn btn-ghost" href="#/parte-editar/${p.id}">Editar</a>` : ''}
      <button class="btn-ghost" id="print">🖨️ Imprimir / PDF</button>
      ${isOficina() && p.estado === 'firmado' ? '<button class="btn-ok" id="validar">✓ Validar</button>' : ''}
      ${isOficina() && p.estado === 'validado' ? '<button id="facturar">Marcar facturado</button>' : ''}
      ${isOficina() && ['borrador'].includes(p.estado) ? '<button class="btn-danger" id="borrar">Eliminar</button>' : ''}
    </div>
    <div class="grid g2">
      <div class="card"><h3>Cliente</h3><dl class="kv">
        <dt>Cliente</dt><dd>${esc(c.nombre)}${c.cif ? ' · ' + esc(c.cif) : ''}</dd>
        <dt>Instalación</dt><dd>${inst ? esc(inst.nombre) : '—'}</dd>
        <dt>Dirección</dt><dd>${esc(inst ? [inst.direccion, inst.poblacion].filter(Boolean).join(', ') : [c.direccion, c.poblacion].filter(Boolean).join(', ')) || '—'}</dd>
        ${p.avisos ? `<dt>Aviso</dt><dd><a href="#/aviso/${p.avisos.id}">${esc(p.avisos.numero)}</a> · ${esc(p.avisos.titulo)}</dd>` : ''}
      </dl></div>
      <div class="card"><h3>Equipo y tiempos</h3><dl class="kv">
        <dt>Equipo</dt><dd>${eq ? esc(equipoLabel(eq)) : '—'}</dd>
        ${eq?.num_serie ? `<dt>Nº serie</dt><dd>${esc(eq.num_serie)}</dd>` : ''}
        <dt>Técnico</dt><dd>${esc(p.perfiles?.nombre)}</dd>
        <dt>Horario</dt><dd>${p.hora_inicio ? esc(p.hora_inicio.slice(0, 5)) + ' – ' + esc((p.hora_fin || '').slice(0, 5)) : '—'}</dd>
        <dt>Horas</dt><dd>${p.horas ?? '—'}${p.desplazamiento ? ' · con desplazamiento' : ''}</dd>
        ${p.gas_tipo ? `<dt>Gas</dt><dd>${esc(p.gas_tipo)} · cargado ${p.gas_kg_cargado ?? 0} kg · recuperado ${p.gas_kg_recuperado ?? 0} kg</dd>` : ''}
      </dl></div>
    </div>
    <div class="card"><h3>Trabajo realizado</h3><p style="white-space:pre-wrap;margin:0">${esc(p.trabajo_realizado) || '—'}</p>
      ${p.observaciones ? `<h3 style="margin-top:12px">Observaciones</h3><p style="white-space:pre-wrap;margin:0">${esc(p.observaciones)}</p>` : ''}
      <p class="small" style="margin:10px 0 0"><b>${p.resuelto ? '✓ Avería resuelta' : '⚠ Pendiente de completar'}</b></p></div>
    ${p.checklist?.length ? `<div class="card"><h3>Checklist</h3><table class="tbl">${p.checklist.map(x => `<tr><td>${esc(x.item)}</td><td style="width:60px">${x.ok ? '✓ OK' : '—'}</td></tr>`).join('')}</table></div>` : ''}
    ${mats.length ? `<div class="card"><h3>Materiales</h3><table class="tbl"><tr><th>Descripción</th><th>Cantidad</th></tr>${mats.map(m => `<tr><td>${esc(m.descripcion)}</td><td>${m.cantidad} ${esc(m.unidad || '')}</td></tr>`).join('')}</table></div>` : ''}
    ${fotos.length ? `<div class="card"><h3>Fotos</h3><div class="photos">${fotoUrls.map(u => `<div class="ph"><a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Foto"></a></div>`).join('')}</div></div>` : ''}
    <div class="card"><h3>Conformidad del cliente</h3>
      ${firmaUrl ? `<img class="sig-img" src="${firmaUrl}" alt="Firma del cliente">` : '<p class="muted">Sin firmar</p>'}
      <div>${esc(p.firma_nombre || '')}${p.firma_dni ? ' · DNI ' + esc(p.firma_dni) : ''}</div></div>`;

  $('#print').onclick = () => window.print();
  const setEstado = async est => { try { await q(sb.from('partes').update({ estado: est }).eq('id', id)); toast('Parte ' + ESTADOS_PARTE[est].toLowerCase()); route(); } catch (e) { fail(e); } };
  if ($('#validar')) $('#validar').onclick = () => setEstado('validado');
  if ($('#facturar')) $('#facturar').onclick = () => setEstado('facturado');
  if ($('#borrar')) $('#borrar').onclick = async () => {
    if (!(await confirmar('¿Eliminar este parte en borrador?'))) return;
    try {
      if (fotos.length || p.firma_url) await sb.storage.from(BUCKET).remove([...fotos.map(f => f.ruta), p.firma_url].filter(Boolean));
      await q(sb.from('partes').delete().eq('id', id)); toast('Parte eliminado'); location.hash = '#/partes';
    } catch (e) { fail(e); }
  };
}
