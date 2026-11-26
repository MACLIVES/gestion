# MACLIVE · App de gestión de mantenimiento y averías

App web instalable en el móvil (PWA) para MACLIVE, instaladora y mantenedora de climatización en Málaga.
Base de datos y usuarios en **Supabase**. No necesita compilar nada: son archivos estáticos que se publican tal cual (GitHub Pages, Netlify, etc.).

## Qué hace

| Módulo | Oficina / admin | Técnico |
|---|---|---|
| **Inicio** | Indicadores (avisos sin asignar, urgentes, preventivos vencidos…), avisos abiertos y preventivos próximos | Sus avisos y sus revisiones |
| **Avisos / averías** | Crear, asignar técnico y fecha, prioridad, estados, historial | Ve los suyos, cambia estado, añade comentarios |
| **Partes de trabajo** | Ver todos, filtrar por técnico/fechas, validar, marcar facturado, imprimir/PDF | Rellena el parte en obra: horas, trabajo, materiales, gas, checklist, fotos y **firma del cliente** con el dedo |
| **Preventivos** | Contratos de mantenimiento, generación automática de revisiones, asignación | Ve sus revisiones y hace el parte con el checklist del contrato |
| **Clientes** | Clientes → instalaciones → equipos (marca, modelo, nº serie, gas, carga) | Consulta, y puede dar de alta un equipo nuevo desde obra |
| **Usuarios** | (solo admin) activar usuarios y asignar rol | — |

Automatismos:
- Al asignar técnico, el aviso pasa a **Asignado**. Al empezar un parte, a **En curso**. Al firmar el parte, a **Resuelto** (o **Pendiente de material** si no se resolvió).
- Al firmar un parte preventivo, la revisión queda **Realizada** y enlazada al parte.
- Numeración automática: `AV-26-00001` (avisos), `PT-26-00001` (partes).
- Si el técnico se queda sin cobertura, el parte se guarda en el móvil y se puede recuperar.
- Seguridad en base de datos (RLS): un técnico solo ve sus avisos y partes, no puede tocar clientes ni validar partes. Los usuarios nuevos entran **inactivos** hasta que el admin los activa.

## Puesta en marcha (unos 15 minutos)

> **Estado (26/11/2026):** los pasos 1 y 2 ya están hechos. La base de datos está aplicada en el proyecto `sevabtqahznxkcdufnmq` de la organización MACLIVE, y `js/supabase-client.js` ya lleva su URL y su clave pública. Queda publicar (paso 3) y crear usuarios (paso 4).

### 1. Crear el proyecto de Supabase
1. Entra en [supabase.com](https://supabase.com) con la cuenta de MACLIVE y crea un proyecto (región recomendada: **West EU (Ireland)**).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. Debe terminar sin errores.

### 2. Configurar la app
1. En Supabase: **Project Settings → API** (o botón **Connect**). Copia la **Project URL** y la **publishable key** (o *anon key*).
2. Pégalas en `js/supabase-client.js` (`SUPABASE_URL` y `SUPABASE_ANON_KEY`). Los datos de la empresa que salen en el parte impreso están en `js/config.js` (`EMP`).

### 3. Publicar
Con GitHub Pages:
1. Crea un repositorio (por ejemplo `maclive-app`) y sube todos los archivos de esta carpeta.
2. **Settings → Pages → Deploy from a branch → main / root**.
3. La app quedará en `https://TU-USUARIO.github.io/maclive-app/`.
4. En Supabase: **Authentication → URL Configuration → Site URL** = esa dirección (para que funcione el email de "olvidé mi contraseña").

### 4. Crear usuarios
1. **El primer usuario será el administrador**: en Supabase **Authentication → Users → Add user → Create new user**, con email y contraseña, marcando *Auto Confirm User*.
2. Entra en la app con ese usuario.
3. Para cada técnico u oficinista: créalo igual en Supabase y luego, en la app, **Usuarios** → márcalo como activo, elige rol (Técnico / Oficina) y **Guardar**.
4. Recomendado: en **Authentication → Providers → Email**, desactivar "Allow new users to sign up" para que nadie pueda registrarse por su cuenta.

### 5. Instalar en el móvil y en el ordenador
Como GIDT y SALIDAS, la app obliga a usarla instalada: al abrirla en el navegador sale el aviso "Instala la app para continuar".

- **Android (Chrome)**: abrir la dirección → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari)**: abrir la dirección → botón Compartir → *Añadir a pantalla de inicio*.

## Publicar una versión nueva (igual que en GIDT y SALIDAS)
1. Sube los archivos cambiados, todos en el mismo commit.
2. Añade la entrada arriba del todo en `js/changelog.js` (sale en "Acerca de" → Novedades).
3. Cambia el número de `version.json`.

Las apps abiertas lo detectan en unos minutos (o al volver a la app) y muestran el aviso "¡Nueva versión en camino!". `sw.js` no hay que tocarlo.

## Estructura
```
index.html            Página principal + ventanas comunes (instalar app, nueva versión, Acerca de)
styles.css            Diseño (incluye formato de impresión del parte)
manifest.json         Datos para instalar como app
sw.js                 Service worker (abre sin cobertura)
version.json          Número de versión (la única fuente)
icon-192.png / icon-512.png
js/
  supabase-client.js  Conexión con Supabase
  config.js           Datos de la empresa, sesión y catálogos
  utilidades.js       Funciones comunes
  ui-modal.js         Ventanas modales
  datos.js            Listas para desplegables
  auth.js             Login y arranque
  navegacion.js       Menú y router
  actualizaciones.js  Aviso de versión nueva (version.json)
  changelog.js        Novedades de cada versión
  acerca-de.js        Ventana "Acerca de" (logo)
  instalar-app.js     Obliga a usarla instalada
  inicio-panel.js     Pantalla de Inicio
  avisos.js           Avisos y averías
  partes.js           Listado y detalle de partes
  parte-formulario.js Formulario del parte
  preventivos.js      Contratos y revisiones
  clientes.js         Clientes, instalaciones y equipos
  usuarios.js         Usuarios (admin)
  archivos-storage.js Fotos y firmas en Supabase Storage
  comprimir-imagen.js Reducir fotos antes de subir
  firma.js            Lienzo de firma
supabase/schema.sql   Base de datos completa (ya aplicada en el proyecto de MACLIVE)
```

## Ideas para siguientes fases
- Enviar el parte en PDF por email al cliente al firmarlo.
- Notificación al técnico cuando se le asigna un aviso.
- Portal para que los clientes abran avisos y consulten sus partes.
- Planificador/calendario semanal de técnicos.
- Registro de gases fluorados (libro de equipo) y exportación para facturación.
