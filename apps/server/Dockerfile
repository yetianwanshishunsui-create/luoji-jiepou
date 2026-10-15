# 构建上下文为 monorepo 根目录：
#   docker build -f apps/server/Dockerfile -t luoji/server .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
RUN pnpm install --frozen-lockfile --filter @luoji/server... \
  && pnpm --filter @luoji/shared build \
  && pnpm --filter @luoji/server build \
  && pnpm --filter @luoji/server deploy --prod --legacy /out \
  && cp -r apps/server/dist apps/server/prisma /out/ \
  && cd /out && ./node_modules/.bin/prisma generate

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3000
# 启动前执行数据库迁移
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
