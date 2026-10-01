# Lumi

App de citas premium: web, iPhone y Android, 20 idiomas, 3 membresías de pago.

| Carpeta    | Qué es |
|------------|--------|
| `server/`  | API (Node + Postgres), chat en tiempo real, pagos (Stripe web + RevenueCat móvil), panel de moderación en `/admin` |
| `app/`     | La app (Expo / React Native): un solo código para iPhone, Android y web |
| `website/` | Página pública (publicada en GitHub Pages) |

Un único servidor sirve la API, la app web y el panel `/admin` en el mismo dominio.

---

## Lanzamiento, paso a paso

### 1. Poner el servidor en línea (≈ 15 min, Render)

1. Crea una cuenta en [render.com](https://render.com) y conecta tu GitHub.
2. **New → Blueprint** → elige este repositorio. Render lee `render.yaml` y crea:
   - la base de datos Postgres,
   - el servicio `lumi` (API + app web + `/admin`) con un disco de 5 GB para las fotos,
   - `JWT_SECRET` y `ADMIN_TOKEN` generados automáticamente.
3. Al terminar tendrás una URL tipo `https://lumi-xxxx.onrender.com`:
   - `…/` → la app web, lista para registrarse.
   - `…/admin` → panel de moderación. La clave es el valor de `ADMIN_TOKEN` (Render → lumi → Environment).
4. (Opcional) **Settings → Custom Domain** para usar tu dominio, p. ej. `app.tudominio.com`.

Coste orientativo: servicio Starter + Postgres básico + disco ≈ 15 USD/mes.

### 2. Conectar la página web con la app

En `website/config.js` pon la URL del paso 1 en `appUrl`. Los botones "Empezar" abrirán la app en lugar de "Próximamente".

### 3. Cobros en la web (Stripe)

1. En Stripe → **Products**, crea 8 precios:

   | Variable | Producto | Precio |
   |---|---|---|
   | `STRIPE_PRICE_PLUS_MONTHLY` | Lumi Plus, mensual | 9,99 |
   | `STRIPE_PRICE_PLUS_YEARLY` | Lumi Plus, anual | 59,99 |
   | `STRIPE_PRICE_GOLD_MONTHLY` | Lumi Gold, mensual | 19,99 |
   | `STRIPE_PRICE_GOLD_YEARLY` | Lumi Gold, anual | 119,99 |
   | `STRIPE_PRICE_PLATINUM_MONTHLY` | Lumi Platinum, mensual | 29,99 |
   | `STRIPE_PRICE_PLATINUM_YEARLY` | Lumi Platinum, anual | 179,99 |
   | `STRIPE_PRICE_BOOST_PACK` | 5 Boosts (pago único) | 14,99 |
   | `STRIPE_PRICE_SUPERLIKE_PACK` | 15 Super Likes (pago único) | 9,99 |

2. **Developers → Webhooks → Add endpoint**: `https://TU-URL/billing/webhook/stripe` con los eventos
   `checkout.session.completed`, `invoice.paid` y `customer.subscription.deleted`.
3. En Render → Environment, rellena `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y los 8 `STRIPE_PRICE_*`.

### 4. iPhone y Android (Expo EAS + RevenueCat)

Necesitas: Apple Developer (99 USD/año) y Google Play Console (25 USD, una vez).

1. En App Store Connect y Google Play crea los productos con estos identificadores (o cualquiera que contenga la palabra):
   `lumi_plus_monthly`, `lumi_plus_yearly`, `lumi_gold_monthly`, `lumi_gold_yearly`,
   `lumi_platinum_monthly`, `lumi_platinum_yearly`, `lumi_boost_5`, `lumi_superlike_15`.
2. En [RevenueCat](https://www.revenuecat.com) conecta ambas tiendas, crea una *offering* con esos productos y añade el webhook
   `https://TU-URL/billing/webhook/revenuecat`. Copia el valor de *Authorization* en `REVENUECAT_WEBHOOK_AUTH` (Render).
3. En `app/eas.json` cambia `EXPO_PUBLIC_API_URL` (perfiles `preview` y `production`) por tu URL, y añade
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
4. Compila y envía:
   ```bash
   cd app
   npx eas-cli build --platform all --profile production
   npx eas-cli submit --platform ios
   npx eas-cli submit --platform android
   ```

### 5. Antes de abrir al público

- Revisa `website/privacy.html` y `website/terms.html` con tu razón social y un correo de soporte real
  (en la app está en `app/src/lib/config.ts` → `SUPPORT_EMAIL`).
- Revisa `/admin` cada día: verificaciones por selfie pendientes y denuncias.
- No ejecutes `npm run seed` en producción: solo crea perfiles de prueba (el script se niega a hacerlo).

---

## Desarrollo local

```bash
# Postgres local con base dating_dev (postgres:postgres)
cd server && cp .env.example .env && npm install && npm run seed && npm run dev   # API en :4000
cd app && npm install && npx expo start                                          # app (web, iOS, Android)
```

Cuenta de prueba: `demo@lumi.app` / `password123`.

Comprobaciones:

```bash
cd server && npm test            # pruebas de la API
cd app && npx tsc --noEmit && npm run check:i18n   # tipos + 20 idiomas completos
```

Imagen de producción (la que usa Render): `docker build -t lumi .`
