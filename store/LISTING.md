# Fichas de tienda — Lumi

Textos listos para copiar en App Store Connect y Google Play Console.
Español primero; inglés debajo. Los límites de caracteres ya están respetados.

---

## App Store (iPhone)

| Campo | Español | English |
|---|---|---|
| Nombre (30) | Lumi: citas con intención | Lumi: Dating with intent |
| Subtítulo (30) | Personas verificadas, de noche | Verified people, after dark |
| Categoría | Estilo de vida (secundaria: Redes sociales) | Lifestyle (secondary: Social Networking) |
| Clasificación de edad | 17+ (citas / contenido generado por usuarios) | 17+ |

**Texto promocional (170)**
- ES: Perfiles que empiezan por cómo piensa alguien, no solo por cómo sale en fotos. Verificación con selfie, 20 idiomas y una experiencia sin ruido.
- EN: Profiles that lead with how someone thinks, not only how they photograph. Selfie verification, 20 languages and an experience without the noise.

**Palabras clave (100)**
- ES: `citas,pareja,conocer gente,match,relaciones,solteros,amor,chat,verificado,premium,internacional`
- EN: `dating,match,relationships,singles,meet people,love,chat,verified,premium,international,date`

**Descripción — ES**

Lumi es una app de citas para personas que se fijan en los detalles.

Cada perfil empieza con respuestas, no solo con fotos: qué te hace reír, tu domingo ideal, la señal que buscas en alguien. Así la primera conversación no empieza en «hola».

LO QUE TE ENCONTRARÁS
• Perfiles verificados: una selfie con la pose del día, revisada por una persona, no por un algoritmo.
• Preguntas que cuentan algo: elige hasta tres y responde a tu manera.
• Chat cuidado: rompehielos, «me gusta» en mensajes y confirmación de lectura en Gold.
• 20 idiomas, para conocer a gente de cualquier ciudad.
• Seguridad primero: bloquea y denuncia en dos toques; cada denuncia se revisa.

MEMBRESÍAS
• Lumi Plus — likes ilimitados, deshacer, Passport a cualquier ciudad, filtros avanzados, ocultar edad y distancia.
• Lumi Gold — todo Plus, más ver quién te ha dado like, Top Picks diarios y confirmación de lectura.
• Lumi Platinum — todo Gold, más modo incógnito, likes prioritarios, nota con cada Super Like y ver tus likes enviados.

Lumi es gratis. Las membresías se renuevan automáticamente salvo que se cancelen al menos 24 horas antes del fin del periodo; gestiónalas en los ajustes de tu cuenta de Apple.

Términos: https://cesardavid2013-bot.github.io/ownpage/terms.html
Privacidad: https://cesardavid2013-bot.github.io/ownpage/privacy.html

**Description — EN**

Lumi is a dating app for people who notice things.

Every profile leads with answers, not only photos: what makes you laugh, your ideal Sunday, the green flag you look for. So the first message never has to be "hey".

WHAT YOU'LL FIND
• Verified profiles: a selfie in today's pose, checked by a person, not an algorithm.
• Prompts that say something: pick up to three and answer in your own words.
• A better chat: icebreakers, message likes and read receipts with Gold.
• 20 languages, to meet people from any city.
• Safety first: block and report in two taps; every report is reviewed.

MEMBERSHIPS
• Lumi Plus — unlimited likes, rewind, Passport to any city, advanced filters, hide age and distance.
• Lumi Gold — everything in Plus, plus see who likes you, daily Top Picks and read receipts.
• Lumi Platinum — everything in Gold, plus Incognito, priority likes, a note with every Super Like and your sent likes.

Lumi is free. Memberships renew automatically unless cancelled at least 24 hours before the end of the period; manage them in your Apple account settings.

**Notas para la revisión de Apple (App Review)**
> Demo account: demo@lumi.app / password123 (create it on the production server with `npm run seed` only on a staging database, or register a fresh account in the app).
> Moderation: users can block and report from any profile or chat (⋯ menu). Reports are reviewed in our moderation console within 24 hours. Selfie verification photos are private and never shown on profiles.
> Account deletion: Settings → Delete account (in-app, immediate).

### Privacidad de la app (App Privacy)

| Dato | Recogido | Vinculado al usuario | Uso |
|---|---|---|---|
| Nombre, correo | Sí | Sí | Funcionalidad de la app |
| Fotos | Sí | Sí | Funcionalidad de la app |
| Ubicación aproximada | Sí | Sí | Funcionalidad (personas cercanas) |
| Mensajes | Sí | Sí | Funcionalidad de la app |
| Compras | Sí | Sí | Funcionalidad de la app |
| Seguimiento entre apps | **No** | — | — |

---

## Google Play (Android)

| Campo | Español | English |
|---|---|---|
| Nombre (30) | Lumi: citas con intención | Lumi: Dating with intent |
| Descripción breve (80) | Citas con personas verificadas y perfiles que dicen algo. En 20 idiomas. | Dating with verified people and profiles that say something. In 20 languages. |
| Descripción completa | La misma que en App Store (arriba) | Same as App Store (above) |
| Categoría | Citas | Dating |
| Clasificación | Rellenar el cuestionario: interacción entre usuarios = Sí; ubicación compartida = Sí | |

### Seguridad de los datos (Data safety)
- Datos recogidos: nombre, correo, fotos, ubicación aproximada, mensajes, historial de compras.
- Cifrado en tránsito: **Sí** (HTTPS).
- El usuario puede pedir que se borren sus datos: **Sí**, en la app (Ajustes → Eliminar cuenta) y en
  https://cesardavid2013-bot.github.io/ownpage/delete-account.html
- Datos compartidos con terceros: solo procesadores de pago (Stripe / Google Play / RevenueCat).

---

## Productos de compra (mismos IDs en Apple y Google)

| ID | Tipo | Precio (USD) |
|---|---|---|
| `lumi_plus_monthly` | Suscripción 1 mes | 9,99 |
| `lumi_plus_yearly` | Suscripción 1 año | 59,99 |
| `lumi_gold_monthly` | Suscripción 1 mes | 19,99 |
| `lumi_gold_yearly` | Suscripción 1 año | 119,99 |
| `lumi_platinum_monthly` | Suscripción 1 mes | 29,99 |
| `lumi_platinum_yearly` | Suscripción 1 año | 179,99 |
| `lumi_boost_5` | Consumible | 14,99 |
| `lumi_superlike_15` | Consumible | 9,99 |

En Apple, pon las seis suscripciones en un mismo grupo («Lumi Membership») ordenadas Platinum > Gold > Plus, para que cambiar de plan sea una mejora o una bajada y no una segunda suscripción.
