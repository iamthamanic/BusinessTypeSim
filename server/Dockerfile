# Build from repository root: docker build -f server/Dockerfile .
FROM node:22-alpine
WORKDIR /repo

COPY server/package.json server/package-lock.json* ./server/
WORKDIR /repo/server
RUN npm install

WORKDIR /repo
COPY server ./server
COPY shared/domain ./shared/domain

# shared/domain imports zod; Node resolves from /repo/shared/domain, not /repo/server.
# Expose server deps at the monorepo root so tsx can load them.
RUN mkdir -p /repo/node_modules \
  && ln -sfn /repo/server/node_modules/zod /repo/node_modules/zod

WORKDIR /repo/server
ENV NODE_ENV=production
ENV NODE_PATH=/repo/server/node_modules
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
