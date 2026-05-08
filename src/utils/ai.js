/**
 * AI 引擎 - 支持多种后端 + 知识库注入 + 全文摘要
 * - Ollama (本地大模型)
 * - OpenAI 兼容接口 (DeepSeek / 通义千问 / 自定义)
 */

// 模型配置 - 扩展支持更多模型
export const MODEL_CONFIGS = {
  ollama: {
    models: [
      { id: 'qwen2.5:7b', name: 'Qwen2.5 7B (推荐)', contextWindow: 32768 },
      { id: 'qwen2.5:14b', name: 'Qwen2.5 14B (高质量)', contextWindow: 32768 },
      { id: 'qwen2.5:32b', name: 'Qwen2.5 32B (顶级)', contextWindow: 32768 },
      { id: 'llama3.1:8b', name: 'Llama3.1 8B', contextWindow: 128000 },
      { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B (推理)', contextWindow: 32768 },
      { id: 'mistral:7b', name: 'Mistral 7B', contextWindow: 32768 },
    ],
    defaultModel: 'qwen2.5:7b',
  },
  openai: {
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (推荐)', contextWindow: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (快速)', contextWindow: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
      { id: 'o1-preview', name: 'O1 Preview (推理)', contextWindow: 200000 },
    ],
    defaultModel: 'gpt-4o',
  },
  deepseek: {
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (推理)', contextWindow: 64000 },
    ],
    defaultModel: 'deepseek-chat',
  },
}

// 统一的 AI 调用函数（支持流式返回）
export async function callAI(prompt, config) {
  const messages = [{ role: 'user', content: prompt }]
  const result = await chatCompletion(config, messages)
  return result.content
}

// 非流式的 chatCompletion wrapper
export async function chatCompletion(config, messages) {
  const { provider, temperature = 0.8, maxTokens = 4096 } = config

  switch (provider) {
    case 'ollama':
      return ollamaChat(config, messages, temperature, maxTokens)
    case 'openai':
      return openaiChat('https://api.openai.com/v1', config.openaiApiKey, config.openaiModel, messages, temperature, maxTokens)
    case 'deepseek':
      return openaiChat('https://api.deepseek.com/v1', config.deepseekApiKey, config.deepseekModel, messages, temperature, maxTokens)
    case 'custom':
      return openaiChat(config.customUrl, config.customApiKey, config.customModel, messages, temperature, maxTokens)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

async function ollamaChat(config, messages, temperature, maxTokens) {
  const baseUrl = config.ollamaUrl || 'http://localhost:11434'
  
  // 先检查 Ollama 是否运行
  try {
    const checkRes = await fetch(`${baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(3000) })
    if (!checkRes.ok) {
      throw new Error('Ollama 服务未响应')
    }
  } catch (e) {
    throw new Error(`Ollama 未运行！请先启动 Ollama 服务：
1. 安装: 访问 https://ollama.ai 下载
2. 启动: 运行 ollama serve
3. 下载模型: ollama pull qwen2.5:7b

或者使用云端 API（OpenAI/DeepSeek）`)
  }
  
  const url = `${baseUrl}/api/chat`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel || 'qwen2.5:7b',
      messages,
      stream: true,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama 错误: ${res.status} - ${errText}`)
  }

  // 流式读取
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.message?.content) {
          fullText += json.message.content
        }
      } catch {}
    }
  }

  return fullText
}

async function openaiChat(baseUrl, apiKey, model, messages, temperature, maxTokens) {
  if (!apiKey) throw new Error('请先设置 API Key')

  const url = `${baseUrl}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API 错误: ${res.status} - ${errText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) fullText += content
        } catch {}
      }
    }
  }

  return fullText
}

/**
 * 构建章节写作的系统提示 - 增强版
 * 注入知识库：人物、世界观、全书摘要、写作风格
 */
export function buildChapterSystemPrompt(project, chapter, allChapters, knowledge = null, contextMode = 'auto') {
  let prompt = `你是一位专业的小说作家。请根据以下信息进行创作。

## 项目信息
- 书名：${project.name}
- 类型：${project.genre || '未指定'}
`

  if (project.description) {
    prompt += `- 简介：${project.description}\n`
  }

  // === 注入知识库 ===
  if (knowledge) {
    // 1. 写作风格
    if (knowledge.writingStyle) {
      prompt += `\n## 写作风格要求\n${knowledge.writingStyle}\n`
    }

    // 2. 全书摘要（上下文桥梁）
    if (knowledge.globalSummary) {
      prompt += `\n## 全书故事摘要\n${knowledge.globalSummary}\n`
    }

    // 3. 人物档案
    if (knowledge.characters?.length) {
      prompt += `\n## 人物档案\n`
      knowledge.characters.forEach(c => {
        prompt += `### ${c.name}\n`
        if (c.description) prompt += `描述：${c.description}\n`
        if (c.traits) prompt += `性格：${c.traits}\n`
        if (c.relationships) prompt += `人物关系：${c.relationships}\n`
      })
    }

    // 4. 世界观设定
    if (knowledge.worldSettings?.length) {
      prompt += `\n## 世界观设定\n`
      knowledge.worldSettings.forEach(s => {
        prompt += `- ${s.key}：${s.value}\n`
      })
    }

    // 5. 自定义笔记
    if (knowledge.customNotes?.length) {
      prompt += `\n## 重要笔记\n`
      knowledge.customNotes.forEach(n => {
        prompt += `### ${n.title}\n${n.content}\n`
      })
    }
  }

  // === 上下文章节（根据 contextMode 决定）===
  const chapterIndex = allChapters.findIndex(c => c.id === chapter.id)
  
  // 计算上下文预算
  let contextBudget = 6000 // 默认
  if (contextMode === 'full') {
    contextBudget = 20000
  } else if (contextMode === 'auto') {
    contextBudget = 8000
  }
  
  // 收集前文摘要（从知识库的 plotPoints 或章节 summary）
  if (chapterIndex > 0) {
    prompt += `\n## 前情提要\n`
    
    // 策略1: 使用章节摘要（更高效）
    let usedTokens = 0
    const maxSummaries = contextMode === 'chapter' ? 1 : 5
    
    for (let i = Math.max(0, chapterIndex - maxSummaries); i < chapterIndex; i++) {
      const prevCh = allChapters[i]
      if (prevCh.summary) {
        prompt += `**${prevCh.title}**: ${prevCh.summary}\n`
        usedTokens += prevCh.summary.length
      } else if (contextMode !== 'chapter' && prevCh.content) {
        // 如果没有摘要，用内容前500字代替
        const brief = prevCh.content.slice(0, 500) + '...'
        prompt += `**${prevCh.title}** (节选): ${brief}\n`
        usedTokens += brief.length
      }
      
      if (usedTokens > contextBudget) break
    }
  }

  // === 当前章节信息 ===
  prompt += `\n## 当前章节：${chapter.title}\n`
  if (chapter.content) {
    const contentPreview = contextMode === 'full' ? chapter.content : chapter.content.slice(-2000)
    prompt += `\n当前已有内容：\n${contentPreview}\n`
  }

  prompt += `\n## 写作要求
1. 保持风格统一，文笔流畅
2. 注意前后文连贯性，与前情提要衔接自然
3. 人物性格和行为要一致，参考人物档案
4. 注意情节推进的节奏
5. 适当使用对话、心理描写和环境描写
6. 遵循世界观设定，不要破坏设定
7. 直接输出小说正文内容，不要添加标题或元信息
`

  return prompt
}

/**
 * 构建章节摘要的系统提示
 */
export function buildSummarySystemPrompt(chapter) {
  return `你是一位专业的文学编辑。请为以下章节内容生成简洁的摘要。

## 章节标题
${chapter.title}

## 章节内容
${chapter.content}

## 要求
1. 摘要长度控制在 100-200 字
2. 包含主要情节、关键事件
3. 标注出场人物
4. 保持客观描述
5. 只输出摘要内容，不要添加其他内容`
}

/**
 * 构建全书摘要的系统提示
 */
export function buildGlobalSummaryPrompt(project, allChapters) {
  let prompt = `你是一位专业的文学编辑。请根据以下信息生成全书故事摘要。

## 项目信息
- 书名：${project.name}
- 类型：${project.genre || '未指定'}
- 简介：${project.description || '无'}

## 各章摘要
`

  allChapters.forEach((ch, i) => {
    prompt += `\n### ${ch.title}\n${ch.summary || '（暂无摘要）'}\n`
  })

  prompt += `
## 要求
1. 全书摘要长度控制在 500-1000 字
2. 梳理完整的故事主线
3. 标注关键转折点和高潮
4. 提炼人物关系变化
5. 只输出摘要内容`
  
  return prompt
}

/**
 * 构建大纲生成的系统提示
 */
export function buildOutlineSystemPrompt(project) {
  let prompt = `你是一位专业的小说策划师。请根据以下信息生成详细的小说大纲。

## 项目信息
- 书名：${project.name}
- 类型：${project.genre || '未指定'}
- 简介：${project.description || '未提供'}`

  // 注入现有知识库
  if (project.knowledge) {
    if (project.knowledge.characters?.length) {
      prompt += `\n\n## 已有人物\n`
      project.knowledge.characters.forEach(c => {
        prompt += `- ${c.name}：${c.description || '暂无描述'}\n`
      })
    }
    if (project.knowledge.worldSettings?.length) {
      prompt += `\n\n## 世界观设定\n`
      project.knowledge.worldSettings.forEach(s => {
        prompt += `- ${s.key}：${s.value}\n`
      })
    }
  }

  prompt += `
## 要求
1. 生成完整的全书大纲，包含卷/章结构
2. 每个章节用简洁的几句话描述主要内容
3. 注意故事弧线的完整性（起承转合）
4. 标注关键转折点和高潮
5. 总章节数建议在 20-50 章之间

请用清晰的层级结构输出大纲。`

  return prompt
}

/**
 * 构建拆书分析的系统提示
 */
export function buildBookAnalysisPrompt(content, analysisType = 'full') {
  const typePrompts = {
    full: `请对以下小说内容进行全面分析拆解，提取以下信息：

## 📋 一、故事大纲
梳理完整的故事主线、起承转合，用简洁的语言概括。

## 👥 二、人物档案
提取所有主要人物：
- 姓名、身份、性格特点
- 人物关系图谱
- 在故事中的作用
- 经典台词或行为

## 🎭 三、情节结构
分析故事的节奏、高潮点、转折点：
- 开篇（铺垫）
- 发展（冲突升级）
- 高潮（核心冲突）
- 结局（问题解决）

## ✨ 四、写作技巧
分析作者使用的：
- 叙事手法（视角切换、时空跳跃等）
- 描写技巧（心理描写、环境描写、动作描写）
- 对话艺术（潜台词、节奏感）
- 节奏把控（快慢结合、张弛有度）

## 💎 五、精彩片段
摘录精彩的对话、描写片段，并说明好在哪里。

## 🎯 六、可借鉴点
总结可以学习和模仿的地方，给出具体的建议。

请用清晰的格式输出分析结果。`,

    outline: `请分析以下小说内容，提取并梳理出完整的故事大纲。

要求：
1. 按章节或情节节点梳理
2. 标注关键转折点和高潮
3. 分析故事结构（三幕式/英雄之旅等）
4. 简要总结每个部分的核心内容
5. 分析故事的起承转合

请用清晰的层级结构输出。`,

    characters: `请分析以下小说内容，提取并整理人物档案。

对每个主要人物，请提供：
- 姓名
- 身份/职业
- 性格特点
- 人物关系
- 经典台词
- 人物弧光（成长变化）

请用卡片形式输出。`,

    style: `请分析以下小说内容的写作风格和技巧。

分析：
- 叙事视角
- 语言风格
- 描写手法（心理/环境/动作）
- 对话艺术
- 节奏把控

并给出可借鉴的具体技巧。`,

    worldbuilding: `请分析以下小说内容，提取世界观设定。

包括：
- 世界背景
- 力量体系（如有）
- 组织势力
- 规则法则
- 文化元素`,

    techniques: `请分析以下小说内容中可以学习和模仿的写作技巧。

列出：
1. 开篇技巧
2. 铺垫技巧
3. 人物塑造技巧
4. 情节推进技巧
5. 对话写作技巧
6. 描写技巧
7. 结尾技巧

每个技巧给出具体应用建议。`,
  }

  return `你是一位专业的文学分析师和写作教练。${typePrompts[analysisType] || typePrompts.full}

---

## 小说内容

${content}`
}

/**
 * 构建仿写系统提示
 */
export function buildImitationPrompt(originalContent, newContext) {
  return `你是一位专业的小说作家。请学习以下优秀片段的写作风格，并根据新的情境进行仿写。

## 原文片段

${originalContent}

## 仿写要求

${newContext}

## 注意事项

1. 学习原文的叙事节奏和语言风格
2. 保持相似的描写手法和表达方式
3. 但内容要符合新的情境，不要照搬原文
4. 字数与原文相近
5. 直接输出仿写内容，不要添加解释`
}

/**
 * 构建扩写系统提示
 */
export function buildExpansionPrompt(content, expansionType = 'detail') {
  const typePrompts = {
    detail: '请对以下内容进行扩写，增加更多细节描写（环境、动作、心理等），使内容更加丰富生动。',
    dialogue: '请对以下内容进行扩写，增加人物对话，使情节更加生动，人物性格更加鲜明。',
    emotion: '请对以下内容进行扩写，着重增加人物心理活动和情感描写。',
    scene: '请对以下内容进行扩写，着重增加场景描写和环境渲染。',
  }

  return `你是一位专业的小说作家。${typePrompts[expansionType] || typePrompts.detail}

## 原始内容

${content}

## 要求

1. 保持原有风格和语调
2. 扩写后的内容要自然流畅，不能生硬
3. 扩写比例约为 1:2 到 1:3
4. 直接输出扩写后的内容，不要添加解释`
}
