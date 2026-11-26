// ---------------------------------------------------------------
// MACLIVE · js/supabase-client.js — Conexión con Supabase (proyecto MACLIVE)
// ---------------------------------------------------------------
'use strict';

const SUPABASE_URL = 'https://sevabtqahznxkcdufnmq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xSV7SL1edzSxtULtmKHKDg_SZKnClmm';

// Bucket privado donde se guardan las fotos y firmas de los partes.
const BUCKET = 'partes';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // La sesión se guarda en el dispositivo (localStorage) para que el técnico
    // no tenga que meter la contraseña cada vez que abre la app en obra.
    persistSession: true,
    autoRefreshToken: true
  }
});
