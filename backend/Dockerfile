FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate

# ---- dev: watch mode, migrations applied at boot ----
FROM base AS dev
EXPOSE 3000
CMD ["sh", "-c", "npm install --prefer-offline && npx prisma migrate deploy && npm run start:dev"]

# ---- prod ----
FROM base AS build
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
