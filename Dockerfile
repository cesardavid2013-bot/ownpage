# Lumi: API + realtime + web app in one image.
# Build:  docker build -t lumi .
# Run:    docker run -p 4000:4000 -e DATABASE_URL=... -e JWT_SECRET=... -v lumi-data:/data lumi

# ---- web app (Expo, exported as a static single-page app) ----
FROM node:22-slim AS web
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
ENV EXPO_PUBLIC_API_URL=same-origin EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1
ARG EXPO_PUBLIC_REVENUECAT_IOS_KEY=""
ARG EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=""
RUN npx expo export --platform web --output-dir dist

# ---- API ----
FROM node:22-slim AS api
WORKDIR /server
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:22-slim
ENV NODE_ENV=production PORT=4000 WEB_DIR=/srv/web UPLOAD_DIR=/data/uploads
WORKDIR /srv/api
COPY --from=api /server/package.json ./
COPY --from=api /server/node_modules ./node_modules
COPY --from=api /server/dist ./dist
COPY --from=web /app/dist /srv/web
# Runs as root so it can write to a host-mounted volume at /data (Render disk, Fly/Railway volume).
RUN mkdir -p /data/uploads /data/private-uploads
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
