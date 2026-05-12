# Polaris Framework — Capa 1 FX Macro

Demo interactiva de la Capa 1 del Polaris Framework para trading FX direccional.

## Stack Tecnológico

- **React 19** — Interfaz de usuario
- **Vite** — Herramienta de desarrollo y build
- **Tailwind CSS v4** — Estilos utilitarios
- **Supabase** — Backend / Base de datos / Autenticación (configurado)
- **Zustand** — Estado global
- **React Router** — Navegación
- **Vitest** — Tests unitarios
- **Librerías visuales:**
  - Recharts — Gráficos de datos
  - Lightweight Charts — Gráficos de trading
  - Lucide React — Iconos
  - Motion (Framer Motion) — Animaciones
  - OGL — WebGL / Gráficos 3D

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Previsualizar build
npm run test     # Ejecutar tests
```

## Estructura

```
src/
  components/     # Componentes React
  data/           # Datos de módulos y pipeline
  lib/            # Clientes externos (Supabase)
  stores/         # Zustand stores
  test/           # Tests con Vitest
```

## Despliegue

Configurado para **Vercel**. Incluye `vercel.json` con rewrites para SPA.

## Variables de entorno

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
