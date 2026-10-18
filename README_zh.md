# dsh-prompt-predict

<div align="center">
  <b>Codex 风格的输入框提示词联想</b><br />
  助手回复结束后，把你的下一句话以灰色 ghost text 直接写进输入框 —— <b>Tab 采纳</b>、<b>Esc 忽略</b>、开始输入自动消失<br /><br />
  <a href="https://www.npmjs.com/package/dsh-prompt-predict"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-prompt-predict" /></a>
  <a href="https://www.npmjs.com/package/dsh-prompt-predict"><img alt="npm downloads" src="https://img.shields.io/npm/dm/dsh-prompt-predict" /></a>
  <a href="https://github.com/ferrisching/dsh-prompt-predict/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/ferrisching/dsh-prompt-predict" /></a>
  <img alt="已验证 DSH 0.2.1-rc.2" src="https://img.shields.io/badge/DSH-0.2.1--rc.2-4d6bfe" />
  <img alt="零运行时依赖" src="https://img.shields.io/badge/%E4%BE%9D%E8%B5%96-%E9%9B%B6%E8%BF%90%E8%A1%8C%E6%97%B6%E4%BE%9D%E8%B5%96-41ba41" />
  <img alt="客户端 + Host 双端插件" src="https://img.shields.io/badge/%E5%BD%A2%E6%80%81-Host%20%2B%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%8F%92%E4%BB%B6-8250df" />
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
</div>

<div align="center">
  🌏 <b>中文</b> · <a href="./README.md">English</a>
</div>

<div align="center">
  <img alt="效果演示：回复结束后输入框浮现灰色建议，↻ 换一条、Alt+→ 逐段采纳、Tab 采纳" src="https://raw.githubusercontent.com/ferrisching/dsh-prompt-predict/main/docs/demo.gif" width="760" />
</div>

`dsh-prompt-predict` 是一个 [DeepSeek Harness](https://www.deepseek.com/) 插件：每轮助手回复结束后，它根据当前会话预测你**下一句最可能输入什么**，并以灰色 ghost text 的形式浮在输入框里。整条建议不写进编辑器，只有按下 `Tab` 采纳时才真正插入（可撤销），因此误预测零成本。

## 📑 目录

- [✨ 功能一览](#-功能一览)
- [🚀 安装](#-安装)
- [⌨️ 使用](#-使用)
- [⚙️ 设置](#-设置)
- [🔌 HTTP 接口](#-http-接口)
- [🧩 工作原理](#-工作原理)
- [🛠️ 开发](#-开发)
- [🔐 安全与成本](#-安全与成本)
- [⚠️ 已知限制](#-已知限制)
- [📄 许可](#-许可)

## ✨ 功能一览

- **回复结束即出建议**：在输入框首字符处浮出灰色 ghost text，光标位置、字号、行高都对齐当前编辑器
- **四种交互**：`Tab` 采纳 · `Alt+→` 逐段采纳 · `↻` 换一条 · `Esc` 忽略；开始输入自动消失，把草稿删空它还会回来
- **轻量上下文**：只取最近若干条 user/assistant 的纯文本，工具结果、附件、系统提示一律不进辅助调用
- **默认跟随当前会话模型**：不写死任何提供商，联想调用沿用会话自身选用的模型；也可以在设置页固定到某个更便宜的模型
- **不会复读、不会卡死**：连续两轮撞车时自动要求换一条；思考档位与真实模型不兼容时自动降级重试，不会出现「设置都对但永远没建议」
- **全部可调**：开关、提供商 / 模型、响应超时、上下文规模与预算、输出上限、思考深度，保存后立即生效，无需重启 DSH
- **界面跟随语言设置**：把「设置 → 语言」切成 English，插件界面立刻变英文——包括输入框上的 ghost 提示与**设置里的校验报错**（报错文案由 Host 生成，会按请求带来的语言返回），无需刷新；没有语言服务时回落中文
- **零运行时依赖**：纯 ESM，Host 端与客户端都不引入第三方包

## 🚀 安装

插件已发布到 npm，安装方式按方便程度排序。

### 在 DSH 里安装（推荐）

**图形界面**：打开插件页 →「添加插件」→ 填入包名 `dsh-prompt-predict` → 安装。

**或者用 dsh CLI**——想装某个已发布版本就用 pnpm 的 `@版本` 语法：

```bash
dsh plugin --profile desktop add dsh-prompt-predict@0.2.3
```

`--profile` 换成你自己的 profile（桌面端一般是 `desktop`，Web 端是 `web`），**装完重启 DSH 生效**。

> ⚠️ **CLI 只负责装包。** DSH 只有在 `~/.dsh/profiles/<profile>/package.json` 的
> `dsh.profile.bundles` 里也列出该插件时才会加载它。实测：包装了但不在该列表里，插件路由返回 `404`，
> 什么都不会加载。上面的图形界面路径会替你处理；用 CLI 的话请自己把 `"dsh-prompt-predict"` 加进该数组，
> 或直接跑下面的 `scripts/install.sh`——它两步都做。

> 装完在 **设置 → 提示词联想** 里能看到开关与各项参数。

### 从 release 的 tarball 安装

每个 [release](https://github.com/ferrisching/dsh-prompt-predict/releases) 都附了与 npm 上
**完全一致**的 tarball（`shasum` 与 registry 相同），适合离线机器或需要自行校验产物的场景：

```bash
gh release download v0.2.3 --repo ferrisching/dsh-prompt-predict --pattern '*.tgz'
dsh plugin --profile desktop add ./dsh-prompt-predict-0.2.3.tgz
```

与上面 CLI 路径同样的注意点：请自己把 `"dsh-prompt-predict"` 加进 `dsh.profile.bundles`，
或改用 `scripts/install.sh`。

### 从源码安装

```bash
git clone https://github.com/ferrisching/dsh-prompt-predict.git
cd dsh-prompt-predict
bash scripts/install.sh
```

脚本会现场打包本仓库、装进 profile 的 `node_modules`，并把 `dsh-prompt-predict` 接进 `dsh.profile.bundles`。默认目标是 `~/.dsh/profiles/desktop`，装别的 profile：

```bash
bash scripts/install.sh ~/.dsh/profiles/web
```

**装完重启 DSH 生效**，然后在 **设置 → 提示词联想** 里能看到开关与各项参数。

### 手动安装

```bash
cd ~/.dsh/profiles/desktop
pnpm add dsh-prompt-predict              # 从 npm 装
# 或装本地源码（符号链接，适合边改边调）：
pnpm add /path/to/dsh-prompt-predict
```

再打开该 profile 的 `package.json`，把 `"dsh-prompt-predict"` 加进 `dsh.profile.bundles` 数组，重启 DSH。

### 安装要求

- 已在 **DSH `0.2.1-rc.2`** 上验证（Web 构建；桌面端跑的是同一套 host 与 client 代码）
- `node` / `pnpm`：安装脚本优先使用 `~/.dsh/dsh-runtimes/*/dependencies` 下 DSH 自带的运行时，找不到才回退 `PATH`
- macOS / Linux；Windows 未验证

## ⌨️ 使用

1. 正常对话，等助手这一轮回复结束，且**输入框为空**
2. 约 350 ms 后，输入框里浮出一条灰色建议，右侧是 `Tab` / `↻` / `Esc 忽略` 三个操作
3. 按需选择：

| 操作 | 效果 |
|---|---|
| `Tab` | 整条采纳（此刻才插入输入框，可撤销） |
| `Alt+→` | **逐段采纳**：一次填一小段（中文 2 字、英文 1 词），剩下的继续浮动，随时可停 |
| `↻`（点右侧按钮） | **换一条**：让模型给一条不同的建议 |
| `Esc` | 忽略这条 |
| 直接开始打字 | 建议消失；**把草稿删空它还会回来**（只有 `Esc` 是永久忽略） |

建议只在输入框为空、且当前会话不在运行中时出现；切换会话、中断回复都会清掉旧建议。

## ⚙️ 设置

**设置 → 提示词联想**：

| 设置项 | 说明 | 默认 |
|---|---|---|
| 启用联想 | 总开关 | 开 |
| 提供商 / 模型 | 联想调用使用的模型；选「跟随当前会话模型」则沿用会话自身模型 | 跟随当前会话模型 |
| 响应超时（高级） | 1–60 秒 | 12 秒 |
| 上下文规模（高级） | 少 3 条 / 标准 8 条 / 多 12 条 | 标准 8 条 |
| 上下文预算（高级） | 送进辅助调用的字符上限，1000–20000 | 6000 |
| 输出上限（高级） | 单条建议的 token 上限，16–512 | 64 |
| 思考深度（高级） | 选项**按真实使用的模型动态生成**（跟随会话时按会话模型），模型不支持的档位不会出现 | 关闭（最快最省） |

设置页底部还有一行「**上次预测**」状态：时间、所用模型、耗时，以及是否自动降级了思考档位 / 换过一条，失败时直接显示原因——联想出问题时不必靠猜。

- 保存后**立即生效**，无需重启 DSH
- 设置落盘在 `~/.dsh/dsh-prompt-predict/config.json`（权限 600）
- 优先级：**用户保存的设置 > cordis patch 部署默认 > 内置默认**

## 🔌 HTTP 接口

插件在 DSH 的 Web 服务上注册同源前缀路由 `/dsh-prompt-predict`，设置页与输入框联想都走它。所有接口都经 DSH 浏览器 Cookie 认证（`connection.requestRejection`），非本机浏览器调用会拿到 401/403。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dsh-prompt-predict/status` | 当前会话模型、有效设置、已保存项、部署默认 |
| GET | `/dsh-prompt-predict/catalog` | 全部 provider 与模型（供下拉选择） |
| GET | `/dsh-prompt-predict/efforts?provider=&model=` | 该模型真实支持的思考档位 |
| POST | `/dsh-prompt-predict/settings` | 保存设置；`{ "reset": true }` 恢复默认 |
| POST | `/dsh-prompt-predict/suggest` | `{ sessionId }` → 一条建议 |

所有接口都认一个可选请求头 **`x-dsh-locale`**（`zh` / `en`，或缺省即中文）：它决定校验错误与预测失败原因用哪种语言返回。客户端会自动带上当前界面语言。

## 🧩 工作原理

**Host 端**（`lib/`）

1. `lib/index.js` 作为插件入口注册同源 HTTP 路由
2. 收到 `suggest` 后，`lib/predict.mjs` 从会话里裁出最近的 user/assistant 纯文本——按条数上限和字符预算从后往前取
3. 裁剪结果被**帧化成一条 request-only 的 user 输入**再发给辅助模型：DSH 的 Assistant Message 必须带完整 `stream` / `replayState`，不能拿裁剪片段伪装成助手消息（与 session-title 的做法一致）
4. 流式收回的文本经归一化（剥掉代码块包装、`建议：` 前缀、成对引号，合并换行）后返回给客户端

模型选择上，`provider` / `model` 为 `auto` 表示跟随会话；此时不向辅助调用写死路由，由 `predictNextPrompt` 继承会话自身选用的模型。

**客户端**（`client/`）

- 注入 `conversation.composer.dock`（输入框旁的生命周期挂载点）与 `settings.section`（设置页分区）两个 slot
- ghost text 是一层**覆盖层**，不写进 Lexical 编辑器；只有采纳时才通过 `inputActions.insertText` 真正插入

## 🛠️ 开发

```bash
git clone https://github.com/ferrisching/dsh-prompt-predict.git
cd dsh-prompt-predict
npm test        # 71 项：51 项 Host 端 + 20 项客户端渲染冒烟
```

```
.
├── lib/                 Host 端（纯 ESM，无构建步骤）
│   ├── index.js         插件入口，注册 HTTP 路由
│   ├── host-route.mjs   同源接口：状态 / 模型目录 / 思考档位 / 设置 / 建议
│   ├── predict.mjs      会话裁剪、调用辅助模型、建议归一化
│   ├── messages.mjs     Host 端面向用户的文案（中英双语）
│   └── config.mjs       用户设置持久化
├── client/
│   └── client.js        客户端：输入框 ghost text 覆盖层 + 设置页
├── test/
│   ├── predict.mjs      51 项用例：文本裁剪、建议清洗、路由继承、设置校验、降级重试、去重、双语错误、接口端到端
│   └── client-render.mjs  20 项用例：极简 React 替身渲染 ghost 覆盖层与设置页，含中英双语与词典自检
├── scripts/
│   └── install.sh       一键安装 / 升级
├── cordis.patch.yml     插件挂载补丁
└── package.json
```

> `test/client-render.mjs` 是客户端唯一的自动化防线：它不依赖浏览器，用一个极简 React 替身把组件递归展开成对象树，断言 ghost 是否出现、`Tab` / `↻` / `Esc` 控件是否齐全。加它的直接原因是一个真实事故——覆盖层引用了没从 props 读出的变量，渲染时抛错被 error boundary 吞掉，表现是「接口正常返回建议但界面上永远没有」，而当时 Host 端用例全绿。

测试不依赖 DSH 运行时：用假 ctx 与本地 HTTP server 覆盖路由注册、设置校验、路由继承与端到端调用。

## 🔐 安全与成本

- 每轮助手回复默认产生**一次**小额辅助调用，`maxTokens` 默认 64；只有在「档位需降级」或「撞车需换一条」时才会多试一次，**极端情况上限 3 次**，且共享同一个超时预算
- 建议**不写入会话日志**；只有按 `Tab` 采纳并发送后才成为正式消息
- 只发送裁剪后的 user/assistant 纯文本，工具结果、附件、系统提示都不出本机
- 设置页与联想接口均走 DSH 自身的浏览器 Cookie 认证

## ⚠️ 已知限制

- 仅在 DSH `0.2.1-rc.2` 上验证过，其它版本未测
- 依赖宿主的 `conversation.composer.dock` 与 `settings.section` 两个 slot 名称，DSH 大版本调整后可能需要适配
- 联想会消耗所选模型的额度；固定到快速小模型比跟随推理模型更省

## 📄 许可

[MIT](LICENSE) © ferrisching

可以自由使用、修改、分发，包括闭源商业项目；只需保留版权声明与许可证文本。

变更记录见 [CHANGELOG_zh.md](./CHANGELOG_zh.md)（[English](./CHANGELOG.md)）。
