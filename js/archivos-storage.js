// ---------------------------------------------------------------
// MACLIVE · js/archivos-storage.js — Enlaces firmados a fotos y firmas del bucket privado "partes" de Supabase Storage
// ---------------------------------------------------------------
'use strict';

async function signedUrl(path) {
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || '';
}
async function signedUrls(paths) {
  if (!paths.length) return [];
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 3600);
  return (data || []).map(d => d.signedUrl);
}
