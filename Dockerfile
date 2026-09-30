# syntax=docker/dockerfile:1

# ===== Stage 1: deps =====
FROM node:24-bookworm-slim AS deps
WORKDIR /app

# 国内构建用 pnpm 与镜像源（.npmrc 已配置 registry.npmmirror.com）
RUN corepack enable
COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ===== Stage 2: build =====
FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建期不需要外部密钥：Next 页面均在请求时取数据
ENV NEXT_TELEMETRY_DISABLED=1
RUN bash scripts/build.sh

# 移除 devDependencies，得到生产运行所需 node_modules
RUN pnpm install --frozen-lockfile --prod

# ===== Stage 3: runner =====
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    COZE_PROJECT_ENV=PROD \
    PORT=8080

# 拷贝生产依赖、构建产物与静态资源
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts ./scripts

EXPOSE 8080

# 平台（Sealos）会注入 PORT；start.sh 读取 PORT 并启动 node dist/server.js
CMD ["bash", "scripts/start.sh"]
