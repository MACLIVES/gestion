// ---------------------------------------------------------------
// MACLIVE · js/datos.js — Listas cacheadas para desplegables (clientes, técnicos, instalaciones, equipos) y cascada cliente → instalación → equipo
// ---------------------------------------------------------------
'use strict';

async function clientesList(force) {
  if (!S.cache.clientes || force) S.cache.clientes = await q(sb.from('clientes').select('id,nombre,telefono,poblacion').eq('activo', true).order('nombre'));
  return S.cache.clientes;
}
async function tecnicosList(force) {
  if (!S.cache.tecnicos || force) S.cache.tecnicos = await q(sb.from('perfiles').select('id,nombre,rol').eq('activo', true).order('nombre'));
  return S.cache.tecnicos;
}
async function instalacionesDe(clienteId) {
  if (!clienteId) return [];
  return q(sb.from('instalaciones').select('id,nombre,direccion,poblacion').eq('cliente_id', clienteId).order('nombre'));
}
async function equiposDe(instId) {
  if (!instId) return [];
  return q(sb.from('equipos').select('id,tipo,marca,modelo,ubicacion,refrigerante').eq('instalacion_id', instId).order('ubicacion'));
}
const equipoLabel = e => [e.tipo, e.marca, e.modelo, e.ubicacion && `(${e.ubicacion})`].filter(Boolean).join(' ');

/* Cascada cliente → instalación → equipo dentro de un formulario */
function bindCascade(form, onChange) {
  const cSel = form.elements.cliente_id, iSel = form.elements.instalacion_id, eSel = form.elements.equipo_id;
  cSel?.addEventListener('change', async () => {
    const inst = await instalacionesDe(cSel.value);
    iSel.innerHTML = optsRows(inst, inst.length === 1 ? inst[0].id : null, '— Instalación —');
    if (eSel) eSel.innerHTML = optsRows(await equiposDe(iSel.value), null, '— Equipo (opcional) —', equipoLabel);
    onChange && onChange();
  });
  iSel?.addEventListener('change', async () => {
    if (eSel) eSel.innerHTML = optsRows(await equiposDe(iSel.value), null, '— Equipo (opcional) —', equipoLabel);
    onChange && onChange();
  });
}
