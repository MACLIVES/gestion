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
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

function confirmar(msg) {
  return new Promise(res => {
    openModal(`<h2>Confirmar</h2><p>${esc(msg)}</p>
      <div class="actions"><button class="btn-ghost" data-no>Cancelar</button><button data-yes>Aceptar</button></div>`, m => {
      $('[data-no]', m).onclick = () => { modal.close(); res(false); };
      $('[data-yes]', m).onclick = () => { modal.close(); res(true); };
    });
  });
}
