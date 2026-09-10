# Cuestalo

**Descubre cuánto cuesta construir tu idea.**

Web conectada a la API de DeepSeek que:

- **Compara modelos** (`deepseek-flash`, `deepseek-v4-pro`) midiendo latencia real (TTFT), tiempo total, tokens/s, tokens de entrada/salida/razonamiento/caché y coste por tarifa punta/valle.
- **Estima proyectos**: describes una idea y la IA la descompone en funcionalidades, estima horas de desarrollo y tokens de IA, y calcula el coste con cada modelo.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.

## Proveedores de IA

La app funciona con dos proveedores compatibles con OpenAI. Elige uno en `.env.local`:

| Proveedor | Variables | Notas |
| --- | --- | --- |
| **OpenCode Go** (recomendado) | `OPENCODE_API_KEY` + `OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1` | Suscripción $10/mes. Envía `User-Agent` propio y cabecera `x-opencode-session` automáticamente. |
| **DeepSeek directo** | `DEEPSEEK_API_KEY` (+ `DEEPSEEK_BASE_URL` opcional) | Facturación por token. |

Si defines `OPENCODE_API_KEY`, tiene prioridad.

## Puesta en marcha

```bash
cp .env.example .env.local      # en Windows: Copy-Item .env.example .env.local
# edita .env.local y añade tu clave
npm install
npm run dev
```

Abre http://localhost:3000 y pulsa **Verificar conexión**.

La API key se usa solo en el servidor (rutas API), nunca se expone al navegador.

## Estructura

| Ruta | Descripción |
| --- | --- |
| `src/lib/models.ts` | Tarifas, detección de hora punta/valle (UTC) y cálculo de coste. |
| `src/lib/deepseek.ts` | Cliente con streaming (mide TTFT) y parseo JSON robusto. |
| `src/lib/types.ts` | Tipos compartidos de las respuestas de la API. |
| `src/app/api/models/route.ts` | Catálogo, tarifa actual y verificación de la API key. |
| `src/app/api/compare/route.ts` | Compara modelos en paralelo. |
| `src/app/api/estimate/route.ts` | Genera el plan y estima coste/tiempo/tokens. |
| `src/components/*` | UI: comparador, estimador y precios. |

## Precios

Basados en la tarifa oficial de DeepSeek (sep 2026). Hora valle = mitad de
tarifa; horas punta: 01:00–04:00 y 06:00–10:00 UTC (lunes a viernes).
Actualiza los valores en `src/lib/models.ts` si DeepSeek cambia los precios.

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servidor de producción
npm run lint    # ESLint
```
