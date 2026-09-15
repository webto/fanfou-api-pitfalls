# 安全说明

## 这个仓库里不会出现什么

- Consumer Key / Consumer Secret
- Access Token / Token Secret
- 任何密码、私钥（`.p8`）、App Store Connect 凭证、签名文件
- 任何真实用户的个人数据导出

主文档与脚本中的示例全部是占位符（`xxx`、`<TOKEN>`）。

## 凭证怎么给

按优先级：

1. 环境变量（推荐，进程结束即消失）

    export FANFOU_CONSUMER_KEY=...
    export FANFOU_CONSUMER_SECRET=...
    export FANFOU_OAUTH_TOKEN=...
    export FANFOU_OAUTH_TOKEN_SECRET=...

2. 本地 JSON 文件 `fanfou-credentials.json`（已在 `.gitignore` 中）：

    {
      "consumerKey": "...",
      "consumerSecret": "...",
      "oauthToken": "...",
      "oauthTokenSecret": "..."
    }

## 输出脱敏

`lib/config.mjs` 的 `makeRedactor()` 会把已知的 key/secret/token（原样与百分号编码两种形式）替换成 `<..._REDACTED>`；
脚本默认只打印长度与状态，不打印完整凭证。提交任何日志前请仍然人工过一眼。

## 上报问题

如果发现仓库里混入了凭证，请立刻在 GitHub 上开 issue（不要贴出凭证本身）。
