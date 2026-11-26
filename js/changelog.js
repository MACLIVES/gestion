// ---------------------------------------------------------------
// MACLIVE · js/changelog.js — Historial de versiones (pestaña "Novedades"
// de la ventana "Acerca de", js/acerca-de.js).
//
// Con cada versión nueva: añadir una entrada ARRIBA del todo (la más
// reciente primero) y subir version.json al mismo número.
// tipo: 'nuevo' | 'mejora' | 'correccion'
// fecha: 'AAAA-MM-DD'
// Redacción en impersonal (la lee todo el equipo).
// ---------------------------------------------------------------
const CHANGELOG_MACLIVE = [
  {
    version: '1.0.1',
    fecha: '2026-11-26',
    cambios: [
      { tipo: 'correccion', texto: 'Las pantallas ocupan todo el ancho de la ventana en monitores grandes (antes quedaba un hueco vacío a la derecha)' }
    ]
  },
  {
    version: '1.0.0',
    fecha: '2026-11-26',
    cambios: [
      { tipo: 'nuevo', texto: 'Avisos y averías: alta, asignación de técnico y fecha, prioridad, estados e historial de cambios' },
      { tipo: 'nuevo', texto: 'Partes de trabajo desde el móvil: horas, trabajo realizado, materiales, gas refrigerante, fotos y firma del cliente' },
      { tipo: 'nuevo', texto: 'Partes: validación y marcado como facturado por oficina, e impresión / PDF con los datos de MACLIVE' },
      { tipo: 'nuevo', texto: 'Mantenimiento preventivo: contratos con periodicidad, revisiones planificadas automáticamente y checklist en el parte' },
      { tipo: 'nuevo', texto: 'Clientes, instalaciones y equipos (marca, modelo, nº de serie, gas y carga)' },
      { tipo: 'nuevo', texto: 'Usuarios con rol de administrador, oficina o técnico; los nuevos quedan inactivos hasta que se activan' }
    ]
  }
];
