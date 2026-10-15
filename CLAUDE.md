# 项目约定

- 本仓库（yetianwanshishunsui-create/luoji-jiepou）是「逻辑解剖教学服务小程序」唯一的开发仓库。所有改动只提交、推送到这里；yetianwanshishunsui-create/task 中的 `luoji-jiepou-miniprogram/` 是历史副本，不再更新。
- 技术方案见 `docs/技术方案.md`，演示与验收清单见 `docs/演示与验收清单.md`（在线协作版链接在文件开头）。
- 提交前运行 `pnpm typecheck` 和 `pnpm test`；CI 配置见 `.github/workflows/ci.yml`。
