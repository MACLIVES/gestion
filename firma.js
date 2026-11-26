// ---------------------------------------------------------------
// MACLIVE · js/firma.js — Lienzo de firma del cliente con el dedo o el ratón
// ---------------------------------------------------------------
'use strict';

function signaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, empty = true, last = null;
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b2540';
    empty = true;
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; empty = false;
    const hint = canvas.parentElement.querySelector('.hint'); if (hint) hint.style.display = 'none';
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => (drawing = false)));
  requestAnimationFrame(resize);
  return {
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; const h = canvas.parentElement.querySelector('.hint'); if (h) h.style.display = ''; },
    isEmpty: () => empty,
    resize,
    toBlob: () => new Promise(r => canvas.toBlob(r, 'image/png'))
  };
}
