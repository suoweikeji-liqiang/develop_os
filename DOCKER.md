# Docker 部署说明

## 1. 部署内容

当前仓库已包含以下容器化能力：

- `db`: PostgreSQL 16 + pgvector
- `migrate`: Prisma 迁移任务容器（一次性）
- `app`: Next.js 生产容器（standalone 模式）

启动顺序由 `docker-compose.yml` 控制：`db` -> `migrate` -> `app`。

## 2. 前置条件

- 已安装 Docker Desktop
- 能在终端执行 `docker` 与 `docker compose`

## 3. 环境变量

根目录已有两个文件：

- `.env.example`: 模板
- `.env`: 实际配置（请填写密钥）

至少需要确认：

- `DEEPSEEK_API_KEY`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`（必须是 64 位十六进制字符串）

说明：

- `.env` 中 `DATABASE_URL` 默认是 `localhost`（便于本机开发）
- 容器运行时会在 `docker-compose.yml` 中覆盖为 `db` 主机

## 4. 一键初始化（推荐）

```powershell
npm run docker:init
```

该命令会执行：

1. 创建/检查 `.env`
2. 自动生成 `SESSION_SECRET` 与 `ENCRYPTION_KEY`（若是占位符）
3. 启动数据库
4. 执行 Prisma 迁移
5. 构建并启动应用

启动后访问：

- http://localhost:3000

## 5. 手动启动

```powershell
docker compose up -d db
docker compose run --rm migrate
docker compose up -d --build app
```

## 6. 常用运维命令

查看状态：

```powershell
docker compose ps
```

查看应用日志：

```powershell
npm run docker:logs
```

停止服务：

```powershell
npm run docker:down
```

完整重建：

```powershell
docker compose down
docker compose up -d --build
```

## 7. 升级发布流程（建议）

1. 拉取最新代码
2. 若有新迁移，先执行 `docker compose run --rm migrate`
3. 执行 `docker compose up -d --build app`
4. `docker compose ps` 确认服务健康

## 8. 常见问题

`ENCRYPTION_KEY must be set as a 64-character hex string`：

- 检查 `.env` 的 `ENCRYPTION_KEY` 是否为 64 位 hex

数据库连接失败：

- 确认 `db` 容器已启动并健康
- 在容器场景下不要手动把 `DATABASE_URL` 改成 `db`，compose 会自动覆盖

AI 调用报缺少 key：

- 填写 `DEEPSEEK_API_KEY`
- 若 embedding 用 OpenAI，还需填写 `OPENAI_API_KEY`
