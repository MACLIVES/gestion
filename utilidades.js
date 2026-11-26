// ---------------------------------------------------------------
// MACLIVE · js/utilidades.js — Utilidades comunes: escapar HTML, fechas, avisos (toast), errores y formularios
// ---------------------------------------------------------------
'use strict';

const app = document.getElementById('app');
const modal = document.getElementById('modal');

const esc = v => (v ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const isOficina = () => S.me && ['admin', 'oficina'].includes(S.me.rol);
const isAdmin = () => S.me && S.me.rol === 'admin';
const today = () => new Date().toISOString().slice(0, 10);

function fDate(d) {
  if (!d) return '—';
  const x = new Date(d.length <= 10 ? d + 'T12:00:00' : d);
  return x.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function toLocalInput(d) {
  if (!d) return '';
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}
function toast(msg, bad = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(t._h); t._h = setTimeout(() => (t.className = ''), 3200);
}
function fail(err) {
  console.error(err);
  const m = err?.message || String(err);
  toast(/fetch|network/i.test(m) ? 'Sin conexión. Inténtalo de nuevo.' : 'Error: ' + m, true);
}
async function q(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}


const badge = (k, map, prefix = 'b-') => `<span class="badge ${prefix}${esc(k)}">${esc(map[k] || k)}</span>`;
const opts = (map, sel, empty) => (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') +
  Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const optsArr = (arr, sel, empty) => opts(Object.fromEntries(arr.map(a => [a, a])), sel, empty);
const optsRows = (rows, sel, empty = '— Seleccionar —', label = r => r.nombre) =>
  `<option value="">${esc(empty)}</option>` + rows.map(r => `<option value="${r.id}"${r.id === sel ? ' selected' : ''}>${esc(label(r))}</option>`).join('');

function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number') o[el.name] = el.value === '' ? null : Number(el.value);
    else o[el.name] = el.value.trim() === '' ? null : el.value.trim();
  }
  return o;
}
