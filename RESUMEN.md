# Resumen — Ember & Salt (restaurante con AR)

## Qué se construyó
Una sola aplicación web (Next.js 16) autohospedada, **sin Supabase**: PostgreSQL propio + Drizzle, login con better-auth, órdenes en tiempo real por SSE y archivos en el disco de tu servidor.

| Rol | Qué puede hacer | Rutas |
|---|---|---|
| Cliente (sin cuenta) | Ver menú, ver plato en 3D/AR a tamaño real, carrito, pedir (mesa o retiro), seguir su orden | `/`, `/menu`, `/menu/[plato]`, `/order/[id]` |
| Empleado | Pantalla de cocina en vivo (Nuevas / En preparación / Listas, urgencia por tiempo, conteo total por plato, sonido), cargar órdenes por el cliente, historial | `/staff/kitchen`, `/staff/new-order`, `/staff/orders` |
| Admin (dueño) | Métricas y tendencias (ingresos, órdenes, ticket promedio, horas pico, top platos, conversión de AR), CRUD de platos con subida de modelo 3D + calibración + QR, gestión del equipo | `/admin`, `/admin/dishes`, `/admin/team` |

## Flujo "escanear el plato"
1. Escaneás el plato real con Polycam, Luma o Reality Composer (iPhone).
2. Exportás `.glb` (y `.usdz` para iPhone).
3. En Admin → Dishes lo subís: la app lo previsualiza, mide el modelo, lo compara con las medidas reales y te ofrece calibrarlo.
4. Imprimís el QR del plato para la mesa: abre la AR directo en el celular del cliente.

## Verificación
- Lint OK · Typecheck OK · **246 tests en verde** · Build de producción OK.
- Probado en el navegador: landing, menú, visor 3D con cotas, carrito → orden → seguimiento, redirección a login de rutas protegidas, vista mobile sin scroll horizontal.
- El writer también probó con scripts: precios calculados en el servidor, roles (401/403), SSE, subida de modelos y protección contra path traversal.

## Bug que encontré y corregí
Los modelos de demo de Poly Haven cargaban **blancos**: sus `.gltf` apuntan a texturas con rutas relativas que no existen en el CDN. Agregué `/api/demo-models/polyhaven/[asset]`, que reescribe esas rutas con el mapa oficial de archivos. Tiene lista blanca de assets para no convertirse en un proxy abierto y está cubierto con 8 tests.

## Pendiente o limitaciones
- **AR en un dispositivo real sin probar**: falta probarla en un celular con HTTPS (WebXR, Scene Viewer y Quick Look).
- **Docker sin probar**: no hay Docker en esta máquina, así que `Dockerfile` y `docker-compose.yml` están escritos pero no se ejecutaron.
- **Escala en Android y iPhone**: el visor de Android ignora la escala, así que la calibración se "hornea" dentro del `.glb` al subirlo. Para iPhone, el `.usdz` debe exportarse ya a escala real (Polycam y Luma lo hacen por defecto).
- **Interfaz en español**: toda la interfaz está traducida. El catálogo de demostración ya viene en español; si tu base de datos local ya tenía platos en inglés, bórrala (`.data/pglite`) y ejecuta `npm run db:seed` para verlos traducidos.

## Probarlo en local
```bash
npm install
npm run db:seed
npm run dev
```
Las credenciales de prueba del admin y del empleado están en `.env.local`.

## Llevarlo a tu servidor (VPS)
1. Apuntá el DNS (registro A) de tu dominio al servidor y abrí los puertos 80 y 443.
2. `cp .env.example .env` y completá `DOMAIN`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
3. `docker compose up -d --build`. Caddy saca el certificado HTTPS solo, y la AR lo necesita.
4. `docker compose exec app node scripts/seed.cjs` crea el admin.
5. Entrás a `https://TU_DOMINIO/login` y creás los empleados en Admin → Team.

Los backups (`pg_dump` + el volumen de uploads) y el escalado están detallados en el `README.md`.
