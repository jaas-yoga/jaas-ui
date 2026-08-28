FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# This app has no public/ directory of its own (no static assets checked
# in) — ensure one exists so the runner stage's COPY below always has a
# source, whether or not that changes in the future.
RUN mkdir -p ./public
RUN npm run build

# next.config.ts's output: "standalone" traces only the files each page
# needs into .next/standalone, so this runtime stage never installs
# node_modules itself — no npm, no dev dependencies, minimal image.
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3027
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3027
CMD ["node", "server.js"]
