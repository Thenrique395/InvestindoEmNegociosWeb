FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENVIRONMENT=production
ENV PORT=4000
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/dist /app/dist
COPY --from=build /app/src/legal-publisher.mjs /app/legal-publisher.mjs
EXPOSE 4000
CMD ["node", "dist/investindo-em-negocios-web/server/server.mjs"]
