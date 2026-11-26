// ---------------------------------------------------------------
// MACLIVE · js/comprimir-imagen.js — Reduce las fotos antes de subirlas (máx. 1600 px, JPG)
// ---------------------------------------------------------------
'use strict';

function compressImage(file, max = 1600, quality = 0.78) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => (b ? res(b) : rej(new Error('No se pudo procesar la foto'))), 'image/jpeg', quality);
    };
    img.onerror = () => rej(new Error('Formato de imagen no soportado'));
    img.src = URL.createObjectURL(file);
  });
}
