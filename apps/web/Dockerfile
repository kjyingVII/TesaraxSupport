FROM node:22-alpine

WORKDIR /app

RUN corepack enable

ARG NEXT_PUBLIC_API_URL=http://localhost:14000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install

COPY apps/web apps/web
COPY packages/shared packages/shared

RUN pnpm --filter @support-system/web build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "--filter", "@support-system/web", "start"]
