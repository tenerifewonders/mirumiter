# 📘 Manual de Despliegue y Configuración: App Única Tenerife Wonders

Este manual explica paso a paso cómo subir la nueva **App Única Tenerife Wonders** a GitHub y cómo configurarla en Supabase y Stripe/WordPress manteniendo la compatibilidad con todo lo existente.

---

## 1. Subir la App Única a GitHub Pages

1. **Crear un nuevo repositorio en GitHub**:
   - Entra en tu cuenta de GitHub y crea un nuevo repositorio público llamado **`app`** (o `tenerife-wonders-app`).
2. **Subir los archivos de la carpeta**:
   - Sube todo el contenido de la carpeta `C:\Users\santi\Documents\PWA\tenerife-wonders-app\` al nuevo repositorio.
3. **Activar GitHub Pages**:
   - Ve a **Settings ➔ Pages** en GitHub.
   - En **Source**, selecciona `Deploy from a branch` (rama `main` / `root`).
   - Guarda los cambios. Tu nueva App estará lista en segundos en:
     `https://tenerifewonders.github.io/app/` (o vinculada a `mirumiter.com/app`).

---

## 2. Configuración de Licencias en Supabase

No requiere modificar ningún script en Supabase. La tabla `licenses` gestionará las licencias mediante el campo `guide`:

### 📋 Códigos permitidos en la columna `guide`:

| Tipo de Compra | Valor en la columna `guide` | Resultado en la App Única |
| :--- | :--- | :--- |
| **Audioguía Individual** | `quinta`, `santacruz`, `teide`, `anaga`, `lalaguna`, `orotava`, `puertocruz`, `candelaria`, `costaadeje` | Desbloquea esa audioguía específica |
| **Colección Heritage** | `heritage_collection` | Desbloquea automáticamente: **Santa Cruz + Anaga + La Orotava** |
| **Colección Mystic** | `mystic_collection` | Desbloquea automáticamente: **Teide + La Laguna + La Quinta** |
| **Colección Seaside** | `seaside_collection` | Desbloquea automáticamente: **Costa Adeje + Puerto de la Cruz + Candelaria** |
| **Pase Total (Discovery)** | `all_access` | Desbloquea automáticamente **las 9 audioguías** |

---

## 3. Configuración de Redirección en Stripe / WordPress

Cuando un cliente completa una compra en Stripe o WooCommerce:

- **Redirección de Retorno (Success URL)**:
  Configura la URL de agradecimiento/redirección para enviarlos a la App Única con su código:
  ```text
  https://tenerifewonders.github.io/app/?license={CHECKOUT_SESSION_ID}
  ```
  *(o con el código de licencia generado por tu plugin/script)*.

Al hacer clic en el enlace del email o tras comprar, la App se abrirá, comprobará el código contra Supabase, guardará el acceso en la memoria del teléfono del viajero y mostrará sus rutas **desbloqueadas y listas para escuchar**.

---

## 4. Estructura de Archivos del Proyecto

```text
tenerife-wonders-app/
├── index.html                  <-- App Única (Catálogo + Reproductor Maestro)
├── service-worker.js           <-- Service Worker v12 (Rangos HTTP 206 + Caché Offline)
├── manifest.json               <-- PWA Manifest
├── icon-192.png & icon-512.png <-- Iconos de la App
├── PASOS_CONFIGURACION_Y_DESPLIEGUE.md
└── routes/                     <-- Archivos GeoJSON de los 9 destinos
    ├── quinta.geojson
    ├── santa-cruz.geojson
    ├── teide.geojson
    ├── anaga.geojson
    ├── la-laguna.geojson
    ├── orotava.geojson
    ├── puerto-cruz.geojson
    ├── candelaria.geojson
    └── costa-adeje.geojson
```
