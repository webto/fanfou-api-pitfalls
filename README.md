# fanfou-api-pitfalls

饭否（Fanfou）API 的**实测踩坑记录 + 可复现的验证脚本**。

官方 wiki 只描述理想情况；这个仓库只记录**文档没写、但一定会踩**的行为，每条都能用附带的脚本复现。
内容与任何具体客户端实现解耦，可作为独立参考资料。

## 内容

- [`docs/fanfou-api-pitfalls.md`](docs/fanfou-api-pitfalls.md) —— 主文档（OAuth、ID/游标、分页、图片、审核、转发、限流、错误）。
- `scripts/` —— 验证脚本；`lib/` —— 无依赖的 OAuth 1.0a 与请求工具。

## 快速开始

需要 Node.js 18+（用到内置 `fetch`）与一个饭否账号。

    # 1. 配置应用凭证（只放本地，绝不提交）
    export FANFOU_CONSUMER_KEY=xxx
    export FANFOU_CONSUMER_SECRET=xxx

    # 2. 走一次 OAuth 1.0a，拿到访问令牌（PIN 流程）
    node scripts/login.mjs
    #    按提示在浏览器授权、把 PIN 粘回来；
    #    脚本会打印 export 语句，或写入本地 fanfou-credentials.json（已 gitignore）

    # 3. 不需要凭证的离线自检（OAuth 签名 / 编码）
    node scripts/sign-check.mjs

    # 4. 需要令牌的验证脚本
    node scripts/probe-favorites-paging.mjs
    node scripts/probe-photo-urls.mjs
    node scripts/probe-cursors.mjs
    node scripts/probe-mentions.mjs

## 脚本一览

| 脚本 | 验证什么 | 需要令牌 |
| --- | --- | --- |
| `sign-check.mjs` | RFC 5849 签名基串/百分号编码（含非 ASCII）、HMAC-SHA1 确定性 | 否 |
| `login.mjs` | OAuth 1.0a 授权（PIN 流程），输出本地凭证 | 否（需应用凭证） |
| `probe-favorites-paging.mjs` | `/favorites` 只能按 `page` 翻页、页重叠、顺序按收藏时间、畸形条目 | 是 |
| `probe-photo-urls.mjs` | CDN 变换后缀 vs 原图（`thumburl`/`imageurl`/`largeurl`/去掉 `@…`） | 是 |
| `probe-cursors.mjs` | `since_id` 排除边界、`max_id` 需 `id` 串且部分接口忽略 | 是 |
| `probe-mentions.mjs` | `count` 行为与稳定序列 | 是 |

## 安全

见 [SECURITY.md](SECURITY.md)。要点：**仓库里没有任何 key/secret/token**；所有凭证只从环境变量或本地已 gitignore 的文件读取；日志输出统一脱敏。

## 免责

本项目与饭否官方无关，仅为个人实测笔记。请遵守饭否的服务条款，并注意请求频率。
