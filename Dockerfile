FROM node:26-bookworm-slim AS build

WORKDIR /app
ENV CI=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:26-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4174
ENV PSC_SETTINGS_FILE=/data/lockstep-users.json

RUN mkdir -p /data && chown -R node:node /data /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/serve.mjs /app/personal-security-checklist.yml ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server

USER node
EXPOSE 4174

CMD ["node", "serve.mjs"]
