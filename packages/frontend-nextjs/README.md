# FutManager Frontend - Next.js

Este es el frontend de FutManager migrado de React puro a Next.js para mejorar la seguridad mediante el uso de cookies HTTPOnly para la gestión de sesiones de Supabase.

## 🔐 Características de Seguridad

- **Cookies HTTPOnly**: Las sesiones de Supabase se almacenan en cookies HTTPOnly en lugar de localStorage
- **Server-Side Rendering (SSR)**: Renderizado del lado del servidor para mejor seguridad y SEO
- **Middleware de autenticación**: Control de rutas protegidas a nivel de servidor
- **Protección CSRF**: Implementación de tokens CSRF para formularios críticos

## 🚀 Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.local.example` a `.env.local` y completa las variables:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_API_URL=https://tu-api.workers.dev
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── dashboard/         # Página del dashboard
│   ├── login/            # Página de login
│   ├── register/         # Página de registro
│   ├── teams/            # Gestión de equipos
│   ├── players/          # Gestión de jugadores
│   ├── sanctions/        # Gestión de sanciones
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Página de inicio
├── components/           # Componentes reutilizables
│   └── Layout.tsx       # Layout de navegación
├── contexts/            # Contextos de React
│   └── AuthContext.tsx  # Contexto de autenticación
├── lib/                 # Configuraciones y utilidades
│   └── supabase.ts     # Cliente de Supabase con cookies
├── utils/              # Funciones utilitarias
│   └── api.ts         # Helpers para API calls
└── globals.css        # Estilos globales
```

## 🔧 Migración desde React puro

### Principales cambios:

1. **Routing**: De React Router a Next.js App Router
2. **Supabase**: Configuración con `@supabase/ssr` para cookies HTTPOnly
3. **Autenticación**: Middleware de Next.js para protección de rutas
4. **Estado**: Context API mantenido, pero adaptado para SSR

### Beneficios de la migración:

- ✅ **Seguridad mejorada**: No más localStorage para tokens
- ✅ **SSR/SSG**: Mejor SEO y performance inicial
- ✅ **Middleware**: Control granular de autenticación
- ✅ **API Routes**: Manejo server-side de cookies
- ✅ **Optimizaciones automáticas**: Imágenes, fonts, etc.

## 🍪 Configuración de Cookies

El archivo `src/lib/supabase.ts` implementa un storage personalizado que:

1. **Server-side**: Lee cookies de la request usando `next/headers`
2. **Client-side**: Utiliza el cliente browser de Supabase
3. **Middleware**: Refresca automáticamente las sesiones
4. **HTTPOnly**: Las cookies no son accesibles desde JavaScript

## 🔐 Autenticación y Autorización

- **Login/Register**: Formularios seguros con validación
- **Rutas protegidas**: Middleware automático para `/dashboard`, `/teams`, etc.
- **Roles**: Admin, Team Owner, Vocal con permisos diferenciados
- **Logout**: Limpieza segura de cookies

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
npm run build
# Se despliega automáticamente conectando el repo a Vercel
```

### Otras plataformas

```bash
npm run build
npm start
```

## 📝 Scripts disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter

## 🔄 Comparación con la versión anterior

| Aspecto | React Puro | Next.js |
|---------|-----------|----------|
| Autenticación | localStorage | Cookies HTTPOnly |
| Routing | React Router | Next.js App Router |
| Rendering | CSR | SSR/SSG |
| Seguridad | Vulnerable a XSS | Protegido |
| SEO | Limitado | Optimizado |
| Performance | Bueno | Excelente |

## 🛡️ Consideraciones de Seguridad

1. **Cookies HTTPOnly**: Protección contra XSS
2. **HTTPS obligatorio**: En producción
3. **Validación server-side**: En middleware
4. **Tokens JWT**: Validación automática
5. **CORS**: Configurado correctamente

---

Esta migración proporciona una base sólida y segura para el sistema FutManager, eliminando las vulnerabilidades de seguridad asociadas con el almacenamiento de tokens en localStorage.
