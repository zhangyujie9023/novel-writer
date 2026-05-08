# AI小说写作工作台 - 本地部署指南

## 系统要求

- Node.js 18+ (推荐 v22+)
- npm 9+
- 约 500MB 磁盘空间

## 快速启动

### 方式一：开发模式（推荐开发调试）
```bash
cd novel-writer
npm install          # 首次运行需要安装依赖
npm run dev          # 启动开发服务器，访问 http://localhost:5173
```

### 方式二：生产模式（推荐日常使用）
```bash
cd novel-writer
npm install          # 首次运行需要安装依赖
npm run build        # 构建生产版本
npm run start        # 启动静态服务器，访问 http://localhost:3000
```

### 方式三：一键部署
```bash
cd novel-writer
npm run deploy       # 自动构建并启动
```

## 功能列表

### ✅ 已实现功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 📚 项目管理 | ✅ | 创建、编辑、删除小说项目 |
| 📝 章节编辑 | ✅ | 多章节管理，实时字数统计 |
| 🤖 AI 写作 | ✅ | 续写、改写、扩写、润色 |
| 📋 大纲生成 | ✅ | 根据简介自动生成大纲 |
| 👥 人物管理 | ✅ | 人物档案管理 |
| 📖 拆书分析 | ✅ | 导入书籍分析学习 |
| 📥 多格式导入 | ✅ | TXT/PDF/EPUB/DOCX |
| 💾 本地存储 | ✅ | 数据保存在浏览器 localStorage |
| 📤 导出 | ✅ | 导出为 Markdown 文件 |

### 🔄 拆书分析功能

支持的导入格式：
- **TXT** - 纯文本文件
- **PDF** - PDF 文档（逐页提取）
- **EPUB** - 电子书格式
- **DOCX** - Word 文档

分析模式：
1. 📚 全面分析 - 大纲+人物+情节+技巧
2. 📋 故事大纲 - 梳理故事结构
3. 👥 人物档案 - 提取人物设定
4. ✨ 写作风格 - 分析叙事技巧
5. 🌍 世界观设定 - 提取世界观元素
6. 🎯 写作技巧 - 学习可复用的技巧

## AI 配置

### 本地 Ollama（推荐）
```bash
# 安装 Ollama
# 访问 https://ollama.ai 下载安装

# 下载推荐模型
ollama pull qwen2.5:14b

# 启动服务（默认端口 11434）
ollama serve
```

应用内配置：
- Provider: Ollama
- URL: http://localhost:11434
- Model: qwen2.5:14b

### 云端 API

支持以下云端服务：
- OpenAI (GPT-4o)
- DeepSeek
- 自定义 OpenAI 兼容 API

## 数据存储

所有数据存储在浏览器 localStorage 中：
- 键名：`novel-writer-data`
- 包含：项目列表、章节内容、AI 配置、拆书历史

### 数据备份
打开浏览器开发者工具：
```javascript
// 导出数据
console.log(localStorage.getItem('novel-writer-data'))

// 导入数据
localStorage.setItem('novel-writer-data', '你的备份数据')
```

## 目录结构

```
novel-writer/
├── dist/                    # 生产构建输出
├── public/                  # 静态资源
├── src/
│   ├── components/          # React 组件
│   │   ├── AIPanel.jsx      # AI 写作面板
│   │   ├── BookAnalyzer.jsx # 拆书分析
│   │   ├── ChapterEditor.jsx# 章节编辑器
│   │   └── Sidebar.jsx      # 左侧边栏
│   ├── pages/
│   │   ├── EditorPage.jsx   # 编辑器页面
│   │   └── ProjectList.jsx  # 项目列表页
│   ├── stores/
│   │   └── useStore.js      # Zustand 状态管理
│   ├── utils/
│   │   └── ai.js            # AI API 封装
│   ├── App.jsx              # 主应用
│   ├── App.css              # 样式
│   └── main.jsx             # 入口
├── index.html
├── package.json
└── vite.config.js
```

## 端口说明

| 模式 | 默认端口 | 说明 |
|------|----------|------|
| npm run dev | 5173 | Vite 开发服务器 |
| npm run preview | 4173 | Vite 预览服务器 |
| npm run start | 3000 | 静态文件服务器 |

## 常见问题

### Q: 端口被占用怎么办？
A: 依次尝试其他端口：
- dev: 5173 → 5174 → 5175...
- preview: 4173 → 4174 → 4175...
- start: 3000 → 3001 → 3002...

### Q: PDF/EPUB 导入失败？
A: 
1. 确保文件不是加密的
2. 尝试较小的文件先测试
3. 检查浏览器控制台错误信息

### Q: AI 调用失败？
A:
1. 检查 Ollama 是否运行：`ollama list`
2. 检查模型是否下载：`ollama pull qwen2.5:14b`
3. 检查端口是否正确（默认 11434）

### Q: 数据丢失了？
A: 
- localStorage 数据在清除浏览器数据时会丢失
- 建议定期导出项目备份

## 技术栈

- **前端框架**: React 19
- **构建工具**: Vite 8
- **UI 组件**: Ant Design 6
- **状态管理**: Zustand 5
- **Markdown**: react-markdown
- **PDF 解析**: pdfjs-dist
- **EPUB 解析**: epubjs
- **DOCX 解析**: mammoth

## 许可证

MIT
