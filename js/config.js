// ---------------------------------------------------------------
// MACLIVE · js/config.js — Datos de la empresa, estado de la sesión y catálogos (estados, prioridades, tipos…)
// ---------------------------------------------------------------
'use strict';

// Datos de MACLIVE que salen en la cabecera del parte impreso.
const EMP = {
  nombre: 'MACLIVE',
  subtitulo: 'Climatización y mantenimiento',
  cif: '',
  direccion: 'Málaga',
  telefono: '',
  email: ''
};

// Versión de la app: la ÚNICA fuente del número es version.json (aquí no hay
// que escribirlo). Al arrancar, js/actualizaciones.js lo lee y lo deja en esta
// variable; se muestra en el login y en la cabecera.
let APP_VERSION_ACTUAL = null;

// Estado de la sesión: usuario de Supabase Auth, su perfil (rol) y cachés.
const S = { session: null, me: null, cache: {} };
const ESTADOS_AVISO = {
  nuevo: 'Nuevo', asignado: 'Asignado', en_curso: 'En curso', pendiente_material: 'Pend. material',
  resuelto: 'Resuelto', cerrado: 'Cerrado', cancelado: 'Cancelado'
};
const ESTADOS_PARTE = { borrador: 'Borrador', firmado: 'Firmado', validado: 'Validado', facturado: 'Facturado' };
const ESTADOS_REV = { pendiente: 'Pendiente', programada: 'Programada', realizada: 'Realizada', cancelada: 'Cancelada' };
const PRIORIDADES = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const TIPOS_AVISO = { averia: 'Avería', instalacion: 'Instalación', revision: 'Revisión', presupuesto: 'Presupuesto', otro: 'Otro' };
const TIPOS_PARTE = { correctivo: 'Correctivo / avería', preventivo: 'Preventivo', instalacion: 'Instalación', otro: 'Otro' };
const TIPOS_CLIENTE = { empresa: 'Empresa', particular: 'Particular', comunidad: 'Comunidad', administracion: 'Administración' };
const TIPOS_EQUIPO = ['split', 'multisplit', 'cassette', 'conductos', 'suelo-techo', 'VRV/VRF', 'enfriadora', 'bomba de calor', 'fancoil', 'rooftop', 'aerotermia', 'recuperador', 'cámara frigorífica', 'otro'];
const REFRIGERANTES = ['R32', 'R410A', 'R407C', 'R134a', 'R290', 'R454B', 'R744 (CO2)', 'R22', 'otro'];
const ROLES = { admin: 'Administrador', oficina: 'Oficina', tecnico: 'Técnico' };
