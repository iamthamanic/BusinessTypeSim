# Build from repository root: docker build -f server/Dockerfile .
FROM node:22-alpine
WORKDIR /repo

COPY server/package.json server/package-lock.json* ./server/
WORKDIR /repo/server
RUN npm install

WORKDIR /repo
COPY server ./server
COPY shared/domain ./shared/domain

WORKDIR /repo/server
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
