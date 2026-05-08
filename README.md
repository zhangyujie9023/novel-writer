# Novel-Writer

> AI 驱动的长篇小说写作工作台 | AI-Powered Novel Writing Studio

<p align="center">
  <img src="src/assets/hero.png" alt="Novel-Writer" width="600">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Tauri-2-24C8D8" alt="Tauri">
  <img src="https://img.shields.io/badge/Ant_Design-6-0170FE" alt="Ant Design">
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey" alt="Platform">
</p>

## 功能特性

### 📚 项目管理
- 创建、编辑、删除小说项目
- 多章节管理，实时字数统计
- 数据本地存储，隐私安全

### 🤖 AI 写作助手
- 支持 Ollama 本地模型（推荐 qwen2.5:14b）
- 支持 OpenAI / DeepSeek / 自定义 API
- 续写、改写、扩写、润色
- 大纲自动生成

### 📖 拆书分析
- 导入 TXT / PDF / EPUB / DOCX
- 全面分析、大纲提取、人物档案
- 写作风格、世界观、写作技巧分析

### ✨ 更多功能
- 🎨 深色/浅色主题切换
- 🔍 全文搜索
- 📝 人名生成器
- 🛡️ 敏感词检测
- 📋 写作模板（玄幻、都市、科幻等）
- ⌨️ 撤销/重做
- 💾 自动保存

## 快速开始

### 下载安装

前往 [Releases](https://github.com/zhangyujie9023/novel-writer/releases) 下载最新版 Windows 安装包。

### 从源码构建

**系统要求：**
- Node.js 18+（推荐 v22+）
- Rust 1.77+
- Windows 10/11

```bash
# 克隆仓库
git clone https://github.com/zhangyujie9023/novel-writer.git
cd novel-writer

# 安装前端依赖
npm install

# 开发模式
npm run tauri:dev

# 构建生产版本
npm run tauri:build
```

### 纯前端模式（无需 Rust）

```bash
npm install
npm run dev      # 开发模式 http://localhost:5173
npm run build    # 构建
npm run start    # 生产模式 http://localhost:3000
```

## AI 配置

### Ollama（推荐 - 完全离线）

```bash
# 安装 Ollama: https://ollama.ai
ollama pull qwen2.5:14b
ollama serve
```

应用内设置：
- Provider: Ollama
- URL: `http://localhost:11434`
- Model: `qwen2.5:14b`

### 云端 API

支持 OpenAI (GPT-4o)、DeepSeek、或任何 OpenAI 兼容 API。

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 |
| 前端框架 | React 19 |
| UI 组件 | Ant Design 6 |
| 状态管理 | Zustand 5 |
| 构建工具 | Vite 8 |
| PDF 解析 | pdfjs-dist |
| EPUB 解析 | epub.js |
| DOCX 解析 | mammoth |

## 项目结构

```
novel-writer/
├── src/                     # 前端源码
│   ├── components/          # React 组件
│   │   ├── AIPanel.jsx      # AI 写作面板
│   │   ├── BookAnalyzer.jsx # 拆书分析
│   │   ├── ChapterEditor.jsx# 章节编辑器
│   │   ├── Sidebar.jsx      # 侧边栏
│   │   ├── SearchPanel.jsx  # 搜索
│   │   ├── NameGenerator.jsx# 人名生成
│   │   ├── TemplatePanel.jsx# 模板
│   │   └── ...
│   ├── pages/               # 页面
│   ├── stores/              # Zustand 状态
│   ├── utils/               # 工具函数
│   └── data/                # 静态数据
├── src-tauri/               # Tauri (Rust) 后端
│   ├── src/                 # Rust 源码
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
├── .github/workflows/       # CI/CD
│   └── release.yml          # 自动构建发布
└── package.json
```

## 自动更新

应用内置 Tauri Updater，发布新版本后会自动提示更新。

## 许可证

[MIT](LICENSE)

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/zhangyujie9023">zhangyujie9023</a>
</p>
