# 📊 Metrics Dashboard — Documentación del Proyecto

> Guía completa para desarrolladores nuevos. Cubre arquitectura, configuración, estructura de código y flujos de datos.

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Requisitos Previos](#3-requisitos-previos)
4. [Instalación y Puesta en Marcha](#4-instalación-y-puesta-en-marcha)
5. [Estructura de Carpetas](#5-estructura-de-carpetas)
6. [Backend — FastAPI](#6-backend--fastapi)
7. [Frontend — React + Vite](#7-frontend--react--vite)
8. [Vistas del Dashboard](#8-vistas-del-dashboard)
9. [Componentes Reutilizables](#9-componentes-reutilizables)
10. [Sistema de Caché](#10-sistema-de-caché)
11. [Flujo de Datos Completo](#11-flujo-de-datos-completo)
12. [Variables de Entorno](#12-variables-de-entorno)
13. [Docker y Despliegue](#13-docker-y-despliegue)
14. [Convenciones y Buenas Prácticas](#14-convenciones-y-buenas-prácticas)
15. [Solución de Problemas Frecuentes](#15-solución-de-problemas-frecuentes)

---

## 1. Visión General

**Metrics Dashboard** es una aplicación web full-stack de monitorización y analítica para una flota de dispositivos IoT gestionados a través de la plataforma **Kiconex**. Permite visualizar en tiempo real el estado de:

- Tarjetas SIM M2M (consumo, estado de ciclo de vida, alertas)
- Pools de datos (uso vs límite contratado)
- Dispositivos físicos Boards y Kiwi (versiones de firmware, conectividad)
- Renovaciones de suscripciones M2M y planes
- Instalaciones y su obsolescencia
- Túneles VPN y coherencia con el estado en Cloud
- Alarmas activas con histórico temporal

La aplicación consume datos de dos fuentes externas (Core API y Cloud API de Kiconex) y de una base de datos MySQL interna donde se persiste el histórico de alarmas.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                    NAVEGADOR                        │
│         React 19 + Vite + Tailwind CSS              │
│  (SPA con caché en memoria y filtros interactivos)  │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (axios)
                   ▼
┌─────────────────────────────────────────────────────┐
│               BACKEND  (Puerto 8000)                │
│           FastAPI + Python 3.8                      │
│   Lógica de negocio, transformación de datos,       │
│   paginación y limpieza de NaN                      │
└──────┬───────────────────────────┬──────────────────┘
       │                           │
       ▼                           ▼
┌──────────────┐          ┌────────────────┐
│  Core API    │          │   Cloud API    │
│ (Kiconex)    │          │  (Kiconex)     │
│ Dispositivos │          │ Alarmas,       │
│ M2M, Pools   │          │ Devices Cloud  │
│ Renovaciones │          └────────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐
│  MySQL DB    │
│  Histórico   │
│  de alarmas  │
│  Info devices│
└──────────────┘
```

**Stack tecnológico:**

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 3, Chart.js 4, Recharts 3 |
| Backend | FastAPI, Python 3.8, Pandas, Uvicorn |
| Base de datos | MySQL |
| HTTP Client | Axios (frontend), Requests (backend) |
| Contenedores | Docker + Docker Compose |
| Iconos | Lucide React |

---

## 3. Requisitos Previos

### Para desarrollo local (sin Docker)

- **Python** 3.8 o superior
- **Node.js** 20.19.0 o superior (requerido por Vite 7)
- **MySQL** 5.7 o superior (accesible en red)
- Acceso a tokens de la API de Kiconex (Core y Cloud)

### Para despliegue con Docker

- **Docker** 20+ y **Docker Compose** v2+

---

## 4. Instalación y Puesta en Marcha

### Opción A — Docker Compose (recomendado)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd <nombre-del-proyecto>

# 2. Crear el archivo de entorno del backend
cp backend/.env.sample backend/.env
# Editar backend/.env con los tokens y credenciales reales

# 3. Levantar todos los servicios
docker-compose up --build

# Frontend disponible en: http://localhost:5173
# Backend disponible en:  http://localhost:8000
# Docs interactivas API:  http://localhost:8000/docs
```

### Opción B — Desarrollo Local

**Backend:**
```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.sample .env
# Editar .env con los valores reales

# Arrancar el servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

> **Nota:** El frontend espera el backend en `http://localhost:8000` por defecto. Para cambiarlo, crear un archivo `frontend/.env` con `VITE_API_BASE=http://tu-backend/internal/dashboard`.

---

## 5. Estructura de Carpetas

```
proyecto/
├── backend/
│   ├── main.py                  # Punto de entrada FastAPI, todos los endpoints
│   ├── requirements.txt         # Dependencias Python
│   ├── Dockerfile
│   ├── .env.sample              # Plantilla de variables de entorno
│   ├── config/
│   │   ├── settings.py          # URLs de API, credenciales de BD, configuración global
│   │   ├── api_client.py        # Cliente HTTP para Core API (CoreClient)
│   │   ├── cloud_client.py      # Cliente HTTP para Cloud API (CloudClient)
│   │   └── database.py          # Adaptador MySQL (DatabaseAdapter)
│   └── logic/
│       ├── data_m2m.py          # Procesamiento de datos M2M
│       ├── data_device.py       # Procesamiento de Boards y Kiwi
│       ├── data_pool.py         # Procesamiento de Pools
│       ├── data_renewal.py      # Procesamiento de Renovaciones (M2M y Planes)
│       ├── data_inst.py         # Procesamiento de Instalaciones
│       ├── data_info.py         # Procesamiento de Info de dispositivos (desde BD)
│       ├── data_vpn.py          # Procesamiento de estado VPN
│       └── process_alarms.py    # Categorización y persistencia de alarmas
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx             # Punto de entrada React, envuelve con DataCacheProvider
│       ├── App.jsx              # Navegación principal, menú, routing de vistas
│       ├── index.css            # Estilos globales + directivas Tailwind
│       ├── services/
│       │   └── api.js           # Capa de acceso a la API (objeto `api`)
│       ├── context/
│       │   └── DataCacheContext.jsx  # Caché global en memoria con TTL de 1 hora
│       ├── hooks/
│       │   └── useCachedFetch.js    # Hook reutilizable para peticiones con caché
│       ├── utils/
│       │   └── colors.js        # Paleta de colores corporativos y helpers
│       ├── components/
│       │   ├── KpiCard.jsx      # Tarjeta de indicador clave (reutilizable)
│       │   ├── TableCard.jsx    # Tabla paginada con búsqueda y filtros
│       │   ├── BarChartCard.jsx # Gráfico de barras con leyenda interactiva
│       │   ├── PieChartCard.jsx # Gráfico de tarta con leyenda interactiva
│       │   └── SelectDash.jsx   # Gestor de secciones ocultables/minimizables
│       └── views/
│           ├── M2MView.jsx      # Gestión de tarjetas SIM M2M
│           ├── PoolView.jsx     # Monitor de pools de datos
│           ├── DevicesView.jsx  # Inventario de dispositivos Boards
│           ├── KiwiView.jsx     # Inventario de dispositivos Kiwi
│           ├── RenView.jsx      # Dashboard de renovaciones
│           ├── InfoView.jsx     # Versiones de software y firmware
│           ├── AlarmsView.jsx   # Analítica de alarmas
│           ├── InstView.jsx     # Inventario de instalaciones
│           └── VpnView.jsx      # Comparativa Cloud vs VPN
│
└── docker-compose.yml
```

---

## 6. Backend — FastAPI

### 6.1 Punto de Entrada (`main.py`)

El archivo `main.py` define todos los endpoints REST bajo el prefijo `/internal/dashboard/`. Su responsabilidad es:

1. Obtener datos crudos de los clientes HTTP (`CoreClient`, `CloudClient`) o de la BD (`DatabaseAdapter`).
2. Pasar esos datos a las funciones de lógica en `/logic/`.
3. Limpiar NaN/Inf del DataFrame resultante (helper `clean_df`).
4. Aplicar paginación (`paginate_df`).
5. Devolver la respuesta como lista de diccionarios con `.to_dict(orient="records")`.

**Helpers internos importantes:**

```python
def clean_df(df):
    """Elimina NaN y valores infinitos antes de serializar a JSON."""
    df_obj = df.astype(object)
    return df_obj.where(pd.notnull(df_obj), None)

def paginate_df(df, limit, offset):
    """Aplica ventana de paginación sobre un DataFrame."""
    return df.iloc[offset : offset + limit]
```

### 6.2 Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/internal/dashboard/devices` | Boards con modelo y organización |
| GET | `/internal/dashboard/kiwi` | Dispositivos Kiwi con versión de software |
| GET | `/internal/dashboard/info` | Datos de firmware desde BD (devices_info) |
| GET | `/internal/dashboard/m2m` | Tarjetas SIM con consumo y estado |
| POST | `/internal/dashboard/m2m/{icc}/history` | Histórico de consumo de una SIM |
| GET | `/internal/dashboard/pools` | Pools de datos con consumo vs límite |
| GET | `/internal/dashboard/renewals/m2m` | Renovaciones de suscripciones M2M |
| GET | `/internal/dashboard/renewals/plan` | Renovaciones de planes |
| GET | `/internal/dashboard/installations` | Instalaciones con flag de obsolescencia |
| GET | `/internal/dashboard/alarms/stats` | Contadores actuales de alarmas |
| GET | `/internal/dashboard/alarms/history` | Histórico de contadores de alarmas |
| POST | `/internal/dashboard/alarms/sync` | Sincroniza alarmas desde Cloud API a BD |
| GET | `/internal/dashboard/devices_cloud` | Dispositivos desde Cloud API |
| GET | `/internal/dashboard/vpn_status` | Estado de túneles VPN |

Todos los endpoints GET aceptan los parámetros `limit` (defecto 5000) y `offset` (defecto 0) para paginación.

### 6.3 Clientes HTTP

**`CoreClient` (`config/api_client.py`):**
Consume la Core API de Kiconex usando un token de autenticación (`X-Authorization`). Expone métodos como `get_m2m()`, `get_devicesB()`, `get_pools()`, `get_m2m_renewals()`, etc. Todos internamente llaman a `_get_data()` que maneja la extracción de listas anidadas en distintos formatos de respuesta (`content`, `data`, lista directa).

**`CloudClient` (`config/cloud_client.py`):**
Consume la Cloud API de Kiconex con el header `X-QUIIOT-TOKEN`. Provee `get_alarms()` y `get_device_cloud()`.

**`DatabaseAdapter` (`config/database.py`):**
Wrapper sobre `mysql.connector`. Expone `get_all_device_info()`, `get_latest_counts()`, `get_history_counts()` y `execute_query()` para escritura.

### 6.4 Módulos de Lógica

Cada archivo en `/logic/` recibe datos crudos y devuelve un DataFrame limpio:

**`data_m2m.py`:** Traduce `lifeCycleStatus` a español, calcula consumo diario/mensual en bytes y MB, clasifica en tiers de uso, extrae país desde JSON anidado `presence`, y cuenta alarmas.

**`data_device.py`:** Une dispositivos con su software (por `version_uuid`) y modelos (por `model_uuid`) para obtener el nombre real del modelo. Normaliza nombres de organización usando un mapa de palabras clave (`_ORG_KEYWORD_MAP`). Funciones principales: `prepare_boards()` y `prepare_kiwi()`.

**`data_renewal.py`:** Procesa renovaciones M2M y de plan. Cruza por `uuid` para obtener modelo y cliente final. Excluye automáticamente entradas con `ki_subscription_state == "not-applicable"`. Función `_status_label()` traduce estados al español.

**`data_inst.py`:** Extrae campos de un JSON anidado `status` (detectado, habilitado, timestamps). Calcula el flag `obsoletas` comparando `last_change` con un umbral dinámico en años.

**`data_vpn.py`:** Extrae `detected` y `lastchange` del JSON de status de VPN. Convierte timestamps epoch a ISO 8601 UTC. Filtra solo entradas de tipo `"device"`.

**`data_info.py`:** Parsea el campo JSON `info` de la tabla BD `devices_info`. Extrae versión, fecha de compilación, modelo de placa, temperatura, RAM libre, interfaces de red. Calcula `update_status` comparando la fecha de compilación contra un umbral (junio 2025).

**`process_alarms.py`:** Categoriza alarmas por `alarm_type` (1=link, 2=entity, 3=SIM) y severidad. Persiste contadores en la tabla `alarm_counts`.

---

## 7. Frontend — React + Vite

### 7.1 Punto de Entrada y Contexto Global

`src/main.jsx` envuelve toda la aplicación con `<DataCacheProvider>`, que proporciona el sistema de caché global a todos los componentes hijos.

`src/App.jsx` gestiona la navegación. El menú está definido en el array `menuStructure` — para añadir una vista nueva, basta con agregar una entrada allí y un `case` en la función `renderContent()`.

### 7.2 Capa de Servicio (`src/services/api.js`)

Centraliza todas las llamadas HTTP al backend. El objeto exportado `api` expone:

```javascript
api.getDevices(page, limit)
api.getKiwi(page, limit)
api.getM2M(page, limit)
api.getPool(page, limit)
api.getRenewals(page, limit)     // combina M2M + Plan en una sola llamada
api.getInst(page, limit, years)  // 'years' para el umbral de obsolescencia
api.getCloudDevice(page, limit)
api.getCloudVPN(page, limit)
api.getAlarmStats()
api.getAlarmHistory(limit)
api.syncAlarms()
api.getHistory(icc, payload)     // histórico de consumo de una SIM
```

La variable de entorno `VITE_API_BASE` controla la URL base (por defecto `http://localhost:8000/internal/dashboard`).

---

## 8. Vistas del Dashboard

Todas las vistas siguen el mismo patrón estructural:

1. **Carga de datos** — via `useCachedFetch` o petición directa con caché local al módulo.
2. **Filtros externos** — selectores en el header de la vista.
3. **KPIs interactivos** — `KpiCard` con toggle para filtrar la tabla.
4. **Visualizaciones** — gráficas envueltas en `SelectDash` (ocultables/minimizables).
5. **Tabla detalle** — `TableCard` con búsqueda, paginación y exportación CSV.

### M2MView
Muestra las tarjetas SIM. Permite filtrar por organización, estado de ciclo de vida, tipo de red, país, plan tarifario y tramo de consumo. Incluye análisis de consumo diario vs mensual con tabs.

### PoolView
Monitor de pools de datos. Muestra un gráfico de barras `Recharts` con Consumo vs Límite (coloreado por porcentaje de uso) y un panel lateral `OrgLegend` que lista las SIMs por organización con sus consumos individuales. Lógica de cruce: vincula cada SIM a su pool usando `commercialGroupID`.

### DevicesView
Inventario de dispositivos Board. Filtra por organización y modelo. Drilldowns cruzados por organización, modelo, versión de hardware y estado de producción.

### KiwiView
Similar a DevicesView pero para dispositivos Kiwi. El "modelo" se resuelve desde la versión de software (campo `ssid` o cruce con la tabla de versiones).

### RenView (Renovaciones)
Dashboard más complejo. Combina datos M2M y de plan. Incluye una línea de tiempo interactiva (Chart.js `Line`) donde al hacer clic en un mes se muestra un panel lateral `LegendBox` con los dispositivos que vencen ese mes, expandibles para ver el UUID. Los KPIs distinguen entre Activas, Por Vencer (≤30 días) y Expiradas.

### InfoView (Versiones)
Muestra versiones de firmware desde la BD. Permite al usuario definir cuál es la "versión objetivo" (referencia) para calcular el estado Actualizado/Desactualizado dinámicamente en el cliente. Incluye selector de columnas visibles con persistencia.

### AlarmsView
Única vista con sincronización explícita. Al entrar, si no hay caché válida, dispara automáticamente `syncAlarms()` que llama al backend, que a su vez consulta la Cloud API y guarda en BD. El gráfico histórico (últimas 144 muestras = 24 horas a 10 min/muestra) permite filtrar líneas individuales haciendo clic en los KPIs.

### InstView (Instalaciones)
Inventario con flag de obsolescencia dinámico. El usuario introduce los años de umbral y al pulsar "Aplicar" se hace una nueva petición al backend con el parámetro `years`. Usa una caché por clave `years-N` para no repetir peticiones al cambiar de tab y volver.

### VpnView
Vista más elaborada de cruce de datos. **No llama al backend para el cruce** — obtiene los datos de Cloud (`getCloudDevice`) y VPN (`getCloudVPN`) por separado y hace el `join` en el cliente usando `Map` para eficiencia O(N+M). Calcula el `sync_status` según la combinación de presencia y estado en cada sistema.

---

## 9. Componentes Reutilizables

### `KpiCard`

```jsx
<KpiCard
  title="Activas"
  value={42}
  icon={<CheckCircle />}
  color="green"           // blue|green|yellow|red|purple|orange|indigo|slate
  sub="Texto secundario"  // opcional
  active={true}           // muestra badge "activo"
  onClick={() => {}}      // convierte en botón de filtro toggle
/>
```

### `TableCard`

Tabla completa con: búsqueda, ordenación por columna, filtros checkbox por columna, filtro de rango de fechas, paginación con input de página, y exportación a CSV.

Props clave:
- `data` — array de objetos
- `columns` — array de `{ header, accessor, render? }`
- `enableExport` + `exportFilename` — activa el botón CSV
- `enableDateRange` + `dateRangeKey` — activa el filtro de fechas sobre esa columna
- `searchableKeys` — columnas donde aplica la búsqueda de texto libre

### `BarChartCard` / `PieChartCard`

Ambos aceptan:
- `data` — array con `{ name, value }` (o claves configurables via `labelKey`/`valueKey`)
- `onBarClick` / `onSliceClick` — callback con el label clicado para implementar drilldown
- `selectedLabel` — el label actualmente filtrado (se resalta visualmente)
- `getColor(index, row)` — función para colores personalizados

### `SelectDash`

Gestor de secciones visuales. Persiste el estado (show/min/hide) en `localStorage` usando la `storageKey`. Acepta un array `sections` donde cada elemento tiene `{ id, title, defaultMode, render }`.

---

## 10. Sistema de Caché

### Caché Global (`DataCacheContext`)

`src/context/DataCacheContext.jsx` implementa un sistema de caché en memoria con TTL de **1 hora**. Expone tres métodos:

```javascript
const { getCachedData, invalidateCache, isCached } = useDataCache();

// Obtener con caché automática
const data = await getCachedData('mi-clave', async () => {
  return await api.getAlgunDato();
});

// Invalidar para forzar recarga
invalidateCache('mi-clave');    // invalida una clave
invalidateCache(null);          // invalida todo

// Comprobar si existe y no expiró
if (isCached('mi-clave')) { ... }
```

Los datos persisten mientras el usuario esté en la misma sesión de navegador (no se pierden al cambiar de vista).

### Hook `useCachedFetch`

```javascript
const { data, loading, error, refresh } = useCachedFetch(
  'clave-unica',
  () => api.getAlgunDato(1, 5000),
  { deps: [], skip: false, initialData: [] }
);
```

### Cachés Locales por Módulo

Algunas vistas (M2MView, KiwiView, PoolView) usan un objeto de módulo `const xyzCache = { data: null }` como caché local muy simple, que persiste entre desmontajes del componente dentro de la misma sesión de la SPA pero no usa el TTL global.

**Cuándo usar cada estrategia:**

| Estrategia | Cuándo |
|-----------|--------|
| `useCachedFetch` + `DataCacheContext` | Vistas que necesitan invalidación explícita (ej: AlarmsView) |
| `useCachedFetch` sin invalidar | Datos estáticos durante la sesión (DevicesView, InfoView) |
| Caché local de módulo | Vistas simples donde el dato no cambia nunca en sesión |

---

## 11. Flujo de Datos Completo

Ejemplo con la vista **Renovaciones** (`RenView`):

```
Usuario entra a RenView
       │
       ▼
useCachedFetch('renewals', fetcher)
       │
       ├─ ¿Caché válida? → devuelve datos inmediatamente
       │
       └─ No hay caché → api.getRenewals()
              │
              ├─ GET /renewals/m2m  ──► CoreClient.get_m2m_renewals()
              │                             │
              │                       process_m2m_renewals_logic()
              │                       ├─ Cruza con get_m2m() por ICC
              │                       ├─ Cruza con devices por UUID
              │                       ├─ Resuelve modelo via software → models
              │                       └─ Limpia NaN, devuelve JSON
              │
              └─ GET /renewals/plan ──► CoreClient.get_plan_renewals()
                                             │
                                       process_plan_renewals_logic()
                                       ├─ Cruza con devices por UUID
                                       ├─ Resuelve modelo
                                       └─ Limpia NaN, devuelve JSON

rawData = [...m2mArray, ...planArray]  (guardado en caché)
       │
       ▼
dataWithStatusLabel (useMemo) — calcula status_label en cliente
       │
       ▼
filteredByControls (useMemo) — aplica drilldowns y filtros de tab
       │
       ▼
processed (useMemo) — agrupa stats para gráficas y KPIs
       │
       ├─ KpiCards (total, activas, por vencer, expiradas)
       ├─ PieChartCard (estado de producción)
       ├─ BarChartCard (distribución por modelo)
       ├─ Line Chart (timeline mensual)
       └─ TableCard (listado paginado)
```

---

## 12. Variables de Entorno

### Backend (`backend/.env`)

```env
# Tokens de autenticación con Kiconex
CORE_API_TOKEN=tu_token_core_api
CLOUD_API_TOKEN=tu_token_cloud_api

# Base de datos MySQL
DB_HOST=localhost         # o 'host.docker.internal' en Docker
DB_NAME=metrics
DB_USER=tu_usuario
DB_PASS=tu_contraseña
```

> La variable `DB_HOST_SYSTEM` tiene prioridad sobre `DB_HOST` (útil para diferenciar entornos). Ver `config/settings.py`.

### Frontend (`frontend/.env` — opcional)

```env
# URL base de la API. Por defecto: http://localhost:8000/internal/dashboard
VITE_API_BASE=https://mi-dominio.com/internal/dashboard
```

---

## 13. Docker y Despliegue

### `docker-compose.yml`

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env
    volumes: ["./backend:/app"]
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Para acceder a MySQL en el host

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    volumes:
      - ./frontend:/app
      - /app/node_modules   # Evita sobreescribir node_modules del contenedor
    depends_on: [backend]
    environment:
      - VITE_API_BASE=https://metrics.kiconex.com/internal/dashboard
```

### Producción

Para producción, en lugar de `npm run dev` se construye el frontend con `npm run build` y se sirve el contenido estático de `dist/` con Nginx u otro servidor. El backend puede correr con `uvicorn main:app --workers 4`.

El `vite.config.js` incluye configuración para que el HMR funcione detrás de un proxy inverso:
```javascript
server: {
  allowedHosts: ['metrics.kiconex.com'],
  hmr: { clientPort: 443 }
}
```

---

## 14. Convenciones y Buenas Prácticas

### Backend

- **Nunca modificar** los clientes (`api_client.py`, `cloud_client.py`) para hacer transformaciones de datos. Toda lógica va en `/logic/`.
- Los módulos de lógica **siempre reciben datos crudos** (lista de dicts o DataFrame) y **siempre devuelven** un DataFrame limpio o una lista de dicts.
- Usar `clean_df()` antes de serializar para evitar errores de JSON con `NaN`.
- Los recursos generados (archivos Excel de depuración) se guardan en `resources/` que está en `.gitignore`.

### Frontend

- **Patrón drilldown:** Cada vista mantiene sus propios estados `drilldownX` (uno por dimensión). Los filtros se aplican en cadena en un `useMemo` de `filteredByControls`. Siempre ofrecer un botón "Limpiar filtros" cuando `hasActiveFilter === true`.
- **Cálculos derivados en `useMemo`:** Nunca calcular stats directamente en el JSX. Todo debe ser un `useMemo` con dependencias explícitas.
- **Separación de responsabilidades:** La vista decide qué datos pedir y cómo filtrarlos. Los componentes (`KpiCard`, `TableCard`) sólo reciben props y renderizan.
- **Colores de organización:** Usar `getOrgColor()` de `utils/colors.js` para mantener consistencia corporativa entre vistas.
- Para añadir una nueva vista: crear el componente en `src/views/`, añadirlo al array `menuStructure` en `App.jsx`, y añadir un `case` en `renderContent()`.

### Nomenclatura

- Archivos de vista: `PascalCase` + sufijo `View.jsx` (ej: `M2MView.jsx`)
- Componentes: `PascalCase.jsx`
- Hooks: `useCamelCase.js`
- Módulos backend: `data_snake_case.py`

---

## 15. Solución de Problemas Frecuentes

### "NaN is not valid JSON" en el backend
La función `clean_df()` en `main.py` debe aplicarse antes de `.to_dict()`. Si aparece este error en un endpoint nuevo, asegúrate de llamarla. También revisar que los módulos de lógica terminen con `df.replace({math.nan: None})`.

### El frontend no conecta con el backend
1. Verificar que el backend esté corriendo en el puerto 8000.
2. Comprobar `VITE_API_BASE` en el `.env` del frontend.
3. El backend tiene CORS abierto (`allow_origins=["*"]`), por lo que no debería ser un problema en desarrollo.

### Datos desactualizados en la vista
La caché tiene TTL de 1 hora. Para forzar recarga durante desarrollo, recargar la página (vacía la caché en memoria). En AlarmsView, usar el botón "Sincronizar Ahora" que llama a `invalidateCache()` explícitamente.

### Error de conexión a MySQL
- Verificar credenciales en `backend/.env`.
- En Docker, usar `host.docker.internal` como `DB_HOST` para apuntar al MySQL del host.
- La variable `DB_HOST_SYSTEM` tiene prioridad si está definida.

### El cruce de modelos devuelve "Desconocido"
El pipeline es: `devices.version_uuid` → `software.uuid` → `software.model_uuid` → `models.uuid` → `models.name`. Si algún UUID es `null` o no coincide, el modelo queda como "Desconocido". Revisar que los datos de las APIs de software y modelos estén llegando correctamente en los endpoints de debug (pasar `raw=true` en renovaciones para ver datos crudos).

### La vista VPN muestra datos vacíos
Esta vista hace dos peticiones en paralelo (Cloud y VPN). Si una de las dos APIs falla, el cruce puede quedar vacío. Revisar los tokens `CLOUD_API_TOKEN` y `CORE_API_TOKEN`.

### `node_modules` no encontrado en Docker
El `docker-compose.yml` usa un volumen anónimo `/app/node_modules` para preservar los módulos instalados dentro del contenedor y que no sean sobreescritos por el bind mount del código fuente. Si hay problemas, reconstruir con `docker-compose up --build --force-recreate`.

---

*Documentación generada para el proyecto Metrics Dashboard. Para dudas sobre APIs externas de Kiconex, consultar la documentación interna de la plataforma.*