// ---------------------------------------------------------------
// MACLIVE · js/ui-modal.js — Ventana modal genérica de la app y confirmaciones
// ---------------------------------------------------------------
'use strict';

function openModal(html, onReady) {
  modal.innerHTML = `<div class="modal-body">${html}</div>`;
  modal.showModal();
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', () => modal.close()));
  onReady && onReady(modal);
}
// Un clic fuera de la ventana NO la cierra (solo sus botones Cancelar / Cerrar):
// la ventana da un pequeño "toque" para indicar que hay que usar sus botones.
modal.addEventListener('click', e => {
  if (e.target !== modal) return;
  const box = modal.querySelector('.modal-body');
  if (box && box.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
  }
});

function confirmar(msg) {
  return new Promise(res => {
    openModal(`<h2>Confirmar</h2><p>${esc(msg)}</p>
      <div class="actions"><button class="btn-ghost" data-no>Cancelar</button><button data-yes>Aceptar</button></div>`, m => {
      $('[data-no]', m).onclick = () => { modal.close(); res(false); };
      $('[data-yes]', m).onclick = () => { modal.close(); res(true); };
    });
  });
}
