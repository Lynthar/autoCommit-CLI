# Auto Commit CLI

一个强大、稳定、易用的 Git 提交生成工具，可以在任意时间范围内自动生成带有自定义日期的 commits。

> A powerful CLI tool for generating Git commits with custom dates.

## 功能特点

- **跨平台** - 支持 macOS、Windows、Linux，无需 VSCode
- **安全可靠** - 使用 `simple-git` 库，比 shell 命令更安全
- **完善的错误处理** - 清晰的错误信息和修复建议
- **预览模式** - 执行前可预览所有将生成的 commits
- **进度可视化** - 实时进度条显示
- **优雅中断** - Ctrl+C 可安全中断并自动回滚
- **灵活配置** - 支持命令行参数、配置文件、交互式向导

---

## 前置条件

在开始之前，请确保已安装：

- **Node.js** 18.0 或更高版本
- **Git**
- **GitHub 账号**（如果要推送到 GitHub）

检查安装：
```bash
node --version   # 应显示 v18.x.x 或更高
git --version    # 应显示 git version x.x.x
```

---

## 完整使用流程

### 第一步：准备 GitHub 仓库

```bash
# 1. 在 GitHub 上创建一个新的空仓库（不要初始化 README）

# 2. 克隆到本地
git clone https://github.com/你的用户名/你的仓库名.git
cd 你的仓库名

# 3. 创建初始提交
echo "# My Project" > README.md
git add README.md
git commit -m "Initial commit"
git push -u origin main
```

### 第二步：安装 Auto Commit CLI

```bash
# 1. 克隆本项目
git clone https://github.com/Lynthar/autoCommit-cli.git
cd autoCommit-cli

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 全局安装（可在任何地方使用 auto-commit 命令）
npm link
```

### 第三步：配置

```bash
# 进入你要生成 commits 的仓库
cd ~/你的仓库名

# 启动交互式配置向导
auto-commit init
```

按提示设置：
- 开始日期 / 结束日期
- 每天提交次数（最小/最大）
- 跳过哪些天（如周末）
- 提交时间范围
- 等等...

### 第四步：预览（重要！）

```bash
# 先预览，确认无误再执行
auto-commit generate --dry-run
```

### 第五步：生成 Commits

```bash
# 正式生成
auto-commit generate

# 或跳过确认直接生成
auto-commit generate -y
```

### 第六步：推送到 GitHub

```bash
git push origin main
```

完成！访问你的 GitHub 主页查看贡献图。

---

## 命令参考

### `auto-commit init`

交互式创建配置文件。

```bash
auto-commit init
auto-commit init --output myconfig.json   # 指定输出路径
```

### `auto-commit generate`

生成 commits。

```bash
# 使用配置文件
auto-commit generate

# 指定日期范围
auto-commit generate --from 2024-01-01 --to 2024-12-31

# 完整示例
auto-commit generate \
  --from 2024-01-01 \
  --to 2024-12-31 \
  --min 1 \
  --max 5 \
  --skip-weekends \
  --message "feat: update {{date}}" \
  -y

# 预览模式
auto-commit generate --dry-run

# 生成后自动推送
auto-commit generate --push
```

**参数说明：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `-f, --from` | 开始日期 | `--from 2024-01-01` |
| `-t, --to` | 结束日期 | `--to 2024-12-31` |
| `--min` | 每天最少提交数 | `--min 1` |
| `--max` | 每天最多提交数 | `--max 5` |
| `--skip-weekends` | 跳过周末 | |
| `--skip-days` | 跳过指定天 (0=周日, 6=周六) | `--skip-days 0,6` |
| `--skip-prob` | 随机跳过概率 (0-1) | `--skip-prob 0.1` |
| `--message` | 提交信息模板 | `--message "update {{date}}"` |
| `--time-start` | 开始时间 | `--time-start 09:00` |
| `--time-end` | 结束时间 | `--time-end 18:00` |
| `--push` | 生成后自动推送 | |
| `--dry-run` | 预览模式，不实际执行 | |
| `-y, --yes` | 跳过确认提示 | |

### `auto-commit rollback`

撤销/回滚已生成的 commits。

```bash
auto-commit rollback          # 交互式选择
auto-commit rollback 10       # 回滚最近 10 个 commits
auto-commit rollback 50 -y    # 跳过确认
```

### `auto-commit status`

查看仓库和配置状态。

```bash
auto-commit status
```

---

## 配置文件

运行 `auto-commit init` 后会生成 `.autocommitrc.json`：

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "commitsPerDay": {
    "min": 1,
    "max": 5
  },
  "commitMessage": "feat: update {{date}} #{{index}}",
  "targetFile": ".auto-commit-log",
  "skipDays": [0, 6],
  "skipProbability": 0.1,
  "timeRange": {
    "start": "09:00",
    "end": "18:00"
  },
  "autoPush": false
}
```

**配置项说明：**

| 配置项 | 说明 |
|--------|------|
| `startDate` | 开始日期 (YYYY-MM-DD) |
| `endDate` | 结束日期 (YYYY-MM-DD) |
| `commitsPerDay.min` | 每天最少提交数 |
| `commitsPerDay.max` | 每天最多提交数 |
| `commitMessage` | 提交信息模板 |
| `targetFile` | 用于生成提交的目标文件 |
| `skipDays` | 跳过的星期几 (0=周日, 6=周六) |
| `skipProbability` | 随机跳过概率 (0-1, 如 0.1 表示 10%) |
| `timeRange` | 提交时间范围 |
| `autoPush` | 是否自动推送 |

### 提交信息模板变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `{{date}}` | 日期 | 2024-06-15 |
| `{{datetime}}` | 日期时间 | 2024-06-15 14:30:00 |
| `{{time}}` | 时间 | 14:30:00 |
| `{{index}}` | 提交序号 | 42 |
| `{{year}}` | 年 | 2024 |
| `{{month}}` | 月 | 06 |
| `{{day}}` | 日 | 15 |

---

## 卸载

### 卸载全局命令

```bash
# 进入项目目录
cd /path/to/autoCommit-cli

# 移除全局链接
npm unlink
```

### 完全删除

```bash
# 1. 移除全局链接
cd /path/to/autoCommit-cli
npm unlink

# 2. 删除项目文件夹
rm -rf /path/to/autoCommit-cli

# 3. (可选) 删除目标仓库中的配置文件
rm .autocommitrc.json
```

### 查看安装位置

```bash
# 查看全局安装位置
npm root -g

# 查看命令位置
which auto-commit        # macOS/Linux
where auto-commit        # Windows
```

---

## 常见问题

### GitHub 贡献图没有显示？

**原因**：Git 提交的邮箱与 GitHub 账户绑定的邮箱不一致。

**解决**：
```bash
# 查看当前 Git 邮箱
git config user.email

# 设置为 GitHub 绑定的邮箱
git config user.email "your-github-email@example.com"

# 然后重新生成 commits
auto-commit rollback <之前生成的数量>
auto-commit generate
```

### 命令找不到 `command not found: auto-commit`？

**原因**：没有运行 `npm link` 或者 PATH 未配置。

**解决方案 1**：运行 `npm link`
```bash
cd /path/to/autoCommit-cli
npm link
```

**解决方案 2**：直接使用 node 运行
```bash
node /path/to/autoCommit-cli/dist/index.js generate --dry-run
```

### 推送失败 (403/401)？

**原因**：GitHub 认证问题。

**解决**：
```bash
# 使用 SSH（推荐）
git remote set-url origin git@github.com:用户名/仓库名.git

# 或使用 Personal Access Token
git remote set-url origin https://TOKEN@github.com/用户名/仓库名.git
```

### 想撤销所有生成的 commits？

```bash
# 方法 1：使用 rollback 命令
auto-commit rollback 100

# 方法 2：使用 git reset
git reset --hard HEAD~100   # 撤销最近 100 个 commits
git push -f origin main     # 强制推送（谨慎使用）
```

### Windows 上 npm link 权限问题？

以管理员身份运行 PowerShell，然后执行：
```powershell
npm link
```

---

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动重新构建）
npm run dev

# 运行测试
npm test

# 本地测试
npm link
```

---

## 与原 VSCode 插件对比

| 特性 | 原版 (VSCode 插件) | 本 CLI 工具 |
|------|-------------------|-------------|
| 运行平台 | 仅 VSCode | 任意终端 |
| Git 操作 | Shell exec | simple-git 库 |
| 错误处理 | 基础 | 完善 + 修复建议 |
| 预览模式 | 无 | ✅ dry-run |
| 进度显示 | 基础 | 进度条 |
| 中断处理 | 有限 | 优雅回滚 |
| 配置方式 | 仅 UI | 文件 + CLI + 交互式 |
| 可测试性 | 困难 | ✅ 单元测试 |

---

## 许可证

MIT

---

## 免责声明

本工具仅供学习和演示目的。请合理、道德地使用。

This tool is intended for learning and demonstration purposes only. Use responsibly and ethically.
