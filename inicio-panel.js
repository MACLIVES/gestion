// ---------------------------------------------------------------
// MACLIVE · js/inicio-panel.js — Pantalla de Inicio: indicadores de oficina, avisos abiertos y preventivos próximos
// ---------------------------------------------------------------
'use strict';

async function viewPanel(v) {
  const hoy = today();
  const en30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const avQ = sb.from('avisos').select('id,numero,titulo,estado,prioridad,fecha_programada,clientes(nombre),instalaciones(nombre,poblacion),tecnico:perfiles!avisos_tecnico_id_fkey(nombre)')
    .not('estado', 'in', '(resuelto,cerrado,cancelado)').order('prioridad', { ascending: false }).order('creado_en', { ascending: true }).limit(40);
  if (!isOficina()) avQ.eq('tecnico_id', S.me.id);
  const revQ = sb.from('revisiones').select('id,fecha_prevista,estado,tecnico_id,contratos(id,referencia,clientes(nombre),instalaciones(nombre,poblacion)),tecnico:perfiles!revisiones_tecnico_id_fkey(nombre)')
    .in('estado', ['pendiente', 'programada']).lte('fecha_prevista', en30).order('fecha_prevista').limit(30);
  const [avisos, revs, resumen] = await Promise.all([q(avQ), q(revQ), isOficina() ? q(sb.from('v_resumen').select('*').single()) : null]);

  const prioOrder = { urgente: 0, alta: 1, normal: 2, baja: 3 };
  avisos.sort((a, b) => prioOrder[a.prioridad] - prioOrder[b.prioridad]);

  v.innerHTML = `
    <div class="page-head"><div><h1>Hola, ${esc(S.me.nombre.split(' ')[0])}</h1>
      <div class="muted">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <div class="row">${isOficina() ? '<a class="btn btn-warm" href="#/avisos?nuevo=1">+ Nuevo aviso</a>' : ''}<a class="btn btn-ice" href="#/parte-editar">+ Nuevo parte</a></div></div>
    ${resumen ? `<div class="kpis">
      <a class="kpi" href="#/avisos?estado=nuevo"><div class="n">${resumen.avisos_nuevos}</div><div class="l">Avisos sin asignar</div></a>
      <a class="kpi warn" href="#/avisos"><div class="n">${resumen.avisos_abiertos}</div><div class="l">Avisos en marcha</div></a>
      <a class="kpi bad" href="#/avisos?prioridad=urgente"><div class="n">${resumen.avisos_urgentes}</div><div class="l">Urgentes abiertos</div></a>
      <a class="kpi bad" href="#/preventivos?f=vencidas"><div class="n">${resumen.revisiones_vencidas}</div><div class="l">Preventivos vencidos</div></a>
      <a class="kpi" href="#/preventivos"><div class="n">${resumen.revisiones_30d}</div><div class="l">Preventivos próx. 30 días</div></a>
      <a class="kpi ok" href="#/partes"><div class="n">${resumen.partes_mes}</div><div class="l">Partes este mes</div></a>
    </div>` : ''}
    <div class="grid g2">
      <div class="card"><div class="card-head"><h2>${isOficina() ? 'Avisos abiertos' : 'Mis avisos'}</h2><a href="#/avisos" class="small">Ver todos</a></div>
        <div class="list">${avisos.length ? avisos.slice(0, 12).map(avisoItem).join('') : '<div class="empty">No hay avisos abiertos 👍</div>'}</div></div>
      <div class="card"><div class="card-head"><h2>${isOficina() ? 'Preventivos próximos' : 'Mis preventivos'}</h2><a href="#/preventivos" class="small">Ver todos</a></div>
        <div class="list">${revs.length ? revs.slice(0, 12).map(r => revItem(r, hoy)).join('') : '<div class="empty">Nada en los próximos 30 días</div>'}</div></div>
    </div>`;
}

function avisoItem(a) {
  return `<a class="item" href="#/aviso/${a.id}"><div class="main">
      <div class="t">${esc(a.titulo)}</div>
      <div class="s">${esc(a.numero)} · ${esc(a.clientes?.nombre)}${a.instalaciones ? ' · ' + esc(a.instalaciones.nombre) : ''}</div>
      <div class="s">${a.tecnico ? '👷 ' + esc(a.tecnico.nombre) : '<i>Sin asignar</i>'}${a.fecha_programada ? ' · 📅 ' + fDateTime(a.fecha_programada) : ''}</div>
    </div><div class="r">${badge(a.prioridad, PRIORIDADES, 'p-')}${badge(a.estado, ESTADOS_AVISO)}</div></a>`;
}
function revItem(r, hoy = today()) {
  const venc = r.fecha_prevista < hoy && ['pendiente', 'programada'].includes(r.estado);
  const c = r.contratos || {};
  return `<div class="item"><div class="main">
      <div class="t">${esc(c.clientes?.nombre)}${c.instalaciones ? ' · ' + esc(c.instalaciones.nombre) : ''}</div>
      <div class="s">📅 ${fDate(r.fecha_prevista)} · ${r.tecnico ? '👷 ' + esc(r.tecnico.nombre) : '<i>Sin asignar</i>'}${c.referencia ? ' · ' + esc(c.referencia) : ''}</div>
    </div><div class="r">${venc ? '<span class="badge b-vencida">Vencida</span>' : badge(r.estado, ESTADOS_REV)}
      ${['pendiente', 'programada'].includes(r.estado) ? `<a class="btn btn-sm btn-ice" href="#/parte-editar?revision=${r.id}">Hacer parte</a>` : ''}</div></div>`;
}
