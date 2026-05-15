# Oh My Skills

中文 | [English](./README.en.md)

Oh My Skills 是一个本地运行的 AI Agent Skill 管理工具，用来统一发现、查看、编辑、安装、复制、启用、禁用和删除不同工具里的 skills。它面向经常同时使用 Agents、Codex、Claude、Cursor、OpenCode、Trae 等工具的用户，目标是把分散在各处的 `SKILL.md` 和规则文件收拢到一个可视化面板里管理。

推荐全局安装后使用：

```bash
npm i -g oh-my-skills
oms
oms --help
oh-my-skills --help
```

默认会优先启动在 `2525` 端口，`oms` 是 `oh-my-skills` 的简写命令。

## 产品功能展示

### 技能总览

统一展示本机与项目里的 skills，顶部指标卡只跟来源和搜索结果联动；列表支持搜索、来源筛选、状态筛选、批量选择和批量操作。首页提供卡片视图与列表视图两种浏览方式。

![技能总览](./docs/screenshots/01-dashboard-card.png)

![列表视图](./docs/screenshots/02-dashboard-list.png)

### 安装技能

安装页支持 SkillHub 搜索，进入页面会先展示热门 skills，搜索框保持为空；输入关键词后可以回车或点击搜索。结果会显示作者、来源、下载量、收藏量和本机是否已安装。

![SkillHub 默认推荐结果](./docs/screenshots/03-install-default-results.png)

也可以从 Git 仓库安装，或手动创建新的 `SKILL.md`。

![Git 仓库安装](./docs/screenshots/05-install-git.png)

![手动创建技能](./docs/screenshots/06-install-manual.png)

### 项目管理

支持全盘扫描包含 skill 目录的项目，也可以手动添加项目路径，让首页同时管理项目级 skills。

![项目管理](./docs/screenshots/07-projects.png)

### 技能详情与文件编辑

详情页展示技能状态、来源、路径、文件大小、更新时间和技能目录下的所有文件；可编辑文件会进入独立编辑页，支持编辑、分屏和预览。编辑页会跟随当前皮肤，操作按钮集中在左侧，便于连续编辑。

![技能详情](./docs/screenshots/08-skill-detail.png)

![文件编辑](./docs/screenshots/09-file-editor.png)

## 核心功能

### 统一技能列表

- 自动扫描本机常见的全局 skill 目录。
- 支持显示技能名称、描述、来源、工具类型、启用状态、文件大小、最后修改时间。
- 支持按关键词搜索。
- 支持按来源筛选，并显示每个来源下的数量。
- 支持按状态筛选：全部、启用、禁用。
- 支持点击标题或描述进入技能详情页。

### 多工具目录支持

当前支持的全局目录包括：

- `~/.agents/skills`
- `~/.codex/skills`
- `~/.codex/skills/.system`
- `~/.cursor/skills`
- `~/.claude/skills`
- `~/.opencode/skills`
- `~/.trae/skills`
- `~/.windsurf/rules`
- `~/.cline/rules`
- `~/.continue/rules`
- `~/.roo/rules`

项目级目录支持：

- `.agents/skills`
- `.codex/skills`
- `.cursor/skills`
- `.claude/skills`
- `.opencode/skills`
- `.trae/skills`

默认不会扫描 `~/.claude/plugins`，因为该目录通常内容很多，容易造成结果噪音。

### 技能详情与文件管理

- 查看 skill 的基础信息、来源、分类、路径、大小、更新时间。
- 查看 skill 目录下的所有文件。
- 支持多级目录文件展示。
- 可编辑常见文本文件，例如 `md`、`json`、`yaml`、`toml`、`js`、`ts`、`py`、`sh` 等。
- 文件编辑页支持编辑、分屏、预览三种模式。
- Markdown 文件支持预览。
- 保存后会有明确反馈。

### 启用、禁用与删除

- 单个 skill 可在列表或详情页启用、禁用。
- 启用/禁用状态会在不同页面同步。
- 删除 skill 前会弹出确认。
- 删除后列表会重新扫描。

### 批量操作

在技能列表中可以勾选多个 skill 后批量操作：

- 全选当前结果。
- 反选当前结果。
- 清空选择。
- 批量安装到目标目录。
- 批量启用。
- 批量禁用。
- 批量删除。

### SkillHub 安装

- 安装页搜索框默认为空，输入关键词后可回车或点击按钮搜索 SkillHub。
- 支持从 SkillHub 搜索社区 skill。
- 搜索结果会显示作者、来源、下载量、收藏量。
- 如果本机已有匹配的 skill，会显示“已安装”。
- 已安装的 skill 再次安装时会提示先手动删除原 skill，避免覆盖或误装。
- 安装时可以选择目标目录，例如 Agents、Cursor、Claude、OpenCode、Trae、Codex 等全局目录。

### Git 仓库安装

- 支持输入 Git 仓库 URL。
- 自动拉取仓库并识别其中包含 `SKILL.md` 的 skill 目录。
- 可选择某个 skill 安装到目标目录。

### 手动创建

- 支持输入技能名称。
- 支持直接编写 `SKILL.md` 内容。
- 可选择目标目录并创建新 skill。

### 项目管理

- 支持手动添加项目路径。
- 支持扫描整台电脑，查找包含指定 skill 目录的项目。
- 显示上次扫描时间、耗时、发现项目数量。
- 可将发现的项目加入跟踪列表。
- 加入跟踪后，首页会同时展示这些项目级 skills。

### 界面能力

- 侧边栏带图标导航。
- 支持侧边栏收起。
- 支持全屏切换。
- 支持中英文切换。
- 默认语言会根据用户电脑/浏览器语言自动设置：中文环境使用中文，其它语言使用英文。
- 用户手动切换语言后会保存偏好。
- 支持多套皮肤：光域、雪白、石墨夜、青瓷。

## 安装与运行

临时运行最新版：

```bash
npx oh-my-skills@latest
```

全局安装：

```bash
npm install -g oh-my-skills
oh-my-skills
```

使用别名：

```bash
oms
```

需要自定义端口时：

```bash
oh-my-skills --port 2526
```

启动后在浏览器打开：

```text
http://localhost:2525
```

默认端口是 `2525`。如果没有显式传入 `--port`，且 `2525` 已被占用，CLI 会自动从 `2526` 开始继续寻找可用端口；如果你显式传入 `--port`，则会按指定端口启动。

## CLI 与 Agent 调用

Oh My Skills 不只是网页工具，也全面支持 CLI 调用。所有主要 API 能力都可以通过 `oh-my-skills` 或简写命令 `oms` 操作，因此也适合让 agent 直接调用命令完成安装、扫描、启用、禁用、删除等任务。

推荐全局安装：

```bash
npm i -g oh-my-skills
```

之后可以使用完整命令或简写：

```bash
oh-my-skills -h
oms -h
```

### 服务启动、关闭、重启

```bash
oms start --daemon --open
oms status --port 2525
oms stop --port 2525
oms restart --port 2525 --open
oms open --port 2525
```

说明：

- `npx oh-my-skills@latest` 默认会启动网页面板。
- `oms start` 启动服务。
- `oms stop` 停止服务。
- `oms restart` 重启服务。
- `oms status` 检查服务是否可用。
- `oms open` 打开浏览器。
- `--daemon` 表示后台运行。
- `--open` 表示启动后自动打开浏览器。
- 默认端口为 `2525`；没有传 `--port` 时，如果 `2525` 不可用，会自动使用下一个可用端口。

### Skill API 命令

```bash
oms skills list --json
oms skills list --q wiki --state enabled
oms skills toggle --id <skill-id> --enabled true
oms skills toggle --id <skill-id> --enabled false
oms skills delete --id <skill-id>
oms skills bulk --ids <id1,id2> --action enable
oms skills bulk --ids <id1,id2> --action disable
oms skills bulk --ids <id1,id2> --action delete
oms skills bulk --ids <id1,id2> --action copy --destination global-agents
```

### 安装相关命令

```bash
oms hub search --query wiki-skill --json
oms hub install --slug wiki-skill --destination global-agents
oms install manual --destination global-agents --name my-skill --file ./SKILL.md
oms install manual --destination global-agents --name my-skill --raw '# My Skill'
oms install repo --repo-url https://github.com/example/skills
oms install repo --repo-url https://github.com/example/skills --skill-name my-skill --destination global-agents
oms copy --id <skill-id> --destination global-codex
```

### 项目相关命令

```bash
oms projects list --json
oms projects list --discover --json
oms projects add --path /path/to/project
oms projects remove --path /path/to/project
```

### 原始 API 调用

本地服务启动后，可以通过 `api` 子命令调用任意内部 API：

```bash
oms api GET /api/skills --json
oms api POST /api/install/hub-search --data '{"query":"wiki-skill"}' --json
oms api POST /api/install/hub --data '{"slug":"wiki-skill","destination":"global-agents"}' --json
```

### 安装 Oh My Skills Agent Skill

如果用户在 agent 里输入“安装 npx oh-my-skills”或想让 agent 学会管理 Oh My Skills，可以先运行：

```bash
npx oh-my-skills@latest --install
```

或者全局安装后运行：

```bash
oh-my-skills --install
```

它会把内置的 agent skill 安装到：

```text
~/.agents/skills/oh-my-skills/SKILL.md
```

安装后，agent 可以根据这个 skill 使用 `oms` 命令启动、关闭、重启服务，并调用所有 CLI/API 能力。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

类型检查：

```bash
npm run typecheck
```

生产模式启动：

```bash
npm run build
npm run start -- -p 2525
```

## Skill 格式约定

推荐每个 skill 使用目录结构：

```text
my-skill/
  SKILL.md
  scripts/
  assets/
  references/
```

`SKILL.md` 可以使用 frontmatter：

```markdown
---
name: my-skill
description: Describe when this skill should be used.
---

# My Skill

Detailed instructions...
```

Oh My Skills 会优先读取：

- `name` 作为标题。
- `description` 作为描述。
- 文件修改时间作为更新时间。
- `SKILL.md.disabled` 作为禁用状态。

## 数据与安全说明

- Oh My Skills 默认只在本机运行。
- 它会读取本机 skill 目录内容，用于展示和编辑。
- 删除、启用、禁用、保存文件等操作会直接修改本机文件。
- SkillHub 安装包会先下载到临时目录，检查 zip 路径安全后再复制到目标目录。
- 如果目标目录中已经存在同名 skill，会阻止安装，避免覆盖。

## 适合场景

- 同时维护多个 Agent 工具的 skills。
- 想快速查看本机有哪些 skills。
- 想统一启用、禁用、删除或复制 skills。
- 想从 SkillHub 或 Git 仓库安装 skill。
- 想编辑一个 skill 目录中的多个任务文件。
- 想扫描项目中的 `.agents/skills`、`.codex/skills`、`.claude/skills` 等目录。

## 发布到 npm

发布前建议执行：

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

确认包内容后发布：

```bash
npm publish
```

## 许可证

[MIT](./LICENSE)
