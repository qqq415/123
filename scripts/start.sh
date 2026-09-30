#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

# Render 等平台通过 PORT 环境变量动态分配端口；沙箱用 DEPLOY_RUN_PORT；本地兜底 5000
DEPLOY_RUN_PORT="${PORT:-${DEPLOY_RUN_PORT:-5000}}"


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
