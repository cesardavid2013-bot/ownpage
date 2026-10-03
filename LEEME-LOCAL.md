# Lumi en tu ordenador

Todo funciona igual que online: app web, chat en tiempo real, perfiles, matches, membresías (compras simuladas) y panel de moderación.

## Opción A: con Docker (la más fácil)

1. Instala **Docker Desktop** (https://www.docker.com/products/docker-desktop) y ábrelo.
2. Descomprime este zip.
3. Haz doble clic en **`iniciar.bat`** (Windows) o ejecuta **`./iniciar.sh`** (Mac/Linux).
   La primera vez tarda unos 5–10 minutos (construye la app).
4. Se abre **http://localhost:4000**. Entra con `demo@lumi.app` / `password123`, o crea tu cuenta.

Para apagarla: `docker compose down`. Tus datos se conservan; para borrarlos todos: `docker compose down -v`.

## Opción B: sin Docker (Node + PostgreSQL)

Necesitas **Node 22** y **PostgreSQL 16**.

```bash
createdb lumi
cd server
cp .env.example .env            # y pon DATABASE_URL=postgres://usuario:clave@localhost:5432/lumi
npm install
npm run seed                    # perfiles de demostración
cd ../app
npm install
npx expo export --clear --platform web
cd ../server
npm run build
WEB_DIR=../app/dist NODE_ENV=development npm start
```

Abre http://localhost:4000. (En Windows PowerShell usa `$env:WEB_DIR="../app/dist"` antes de `npm start`.)

Para desarrollar con recarga en vivo: `cd server && npm run dev` y, en otra terminal, `cd app && npx expo start --web`.

## Cosas útiles

| Qué | Dónde |
|---|---|
| App | http://localhost:4000 |
| Panel de moderación | http://localhost:4000/admin — clave `local-admin-token-0123456789abcdef` |
| Cuenta de prueba | `demo@lumi.app` / `password123` |
| Probar en tu móvil | conecta el móvil a la misma Wi-Fi y abre `http://IP-DE-TU-PC:4000`. Para que se vean las fotos, arranca con `PUBLIC_URL=http://IP-DE-TU-PC:4000 docker compose up -d --build` |
| Pruebas del servidor | `cd server && npm test` (necesita una base `dating_test`) |

## Notas

- Las fotos de los perfiles de demostración se cargan de internet (Unsplash); sin conexión se ven placeholders.
- Los pagos son simulados en local. Para cobrar de verdad hacen falta Stripe / las tiendas (ver `README.md`).
- Las claves de este archivo son **solo para local**. No las uses en un servidor público.
