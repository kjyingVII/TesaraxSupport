FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @support-system/api exec prisma generate --schema=prisma/schema.prisma

EXPOSE 4000

CMD ["pnpm", "dev:api"]
