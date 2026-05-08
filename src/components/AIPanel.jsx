import React, { useState, useRef, useEffect } from 'react'
import { Layout, Typography, Button, Space, Tooltip, Select, Input, Divider, Spin, message, Tabs, Modal, Alert, Tag, Radio, Card } from 'antd'
const { Paragraph } = Typography
import {
  EditOutlined,
  ThunderboltOutlined,
  BookOutlined,
  SettingOutlined,
  SaveOutlined,
  CopyOutlined,
  FileTextOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import useStore from '../stores/useStore'
import { chatCompletion, buildChapterSystemPrompt, buildOutlineSystemPrompt, MODEL_CONFIGS } from '../utils/ai'

const { Content, Sider } = Layout
const { Text, Title } = Typography
const { TextArea } = Input

const PRESETS = [
  {
    label: '✍️ 续写本章',
    prompt: '请根据当前章节的已有内容，续写下一段。保持文风一致，适当推进情节。',
  },
  {
    label: '🔍 补全细节',
    prompt: '请对当前内容进行扩写，增加细节描写、人物心理、环境描写等，使内容更加丰富。',
  },
  {
    label: '💬 添加对话',
    prompt: '请根据当前场景，增加人物对话，使情节更生动。',
  },
  {
    label: '🌍 补充环境',
    prompt: '请增加环境描写，营造当前场景的氛围。',
  },
]

// 一键生成整章模板
const CHAPTER_TEMPLATES = [
  {
    label: '📖 标准章节',
    desc: '完整的故事情节章节（3000-5000字）',
    buildPrompt: (chapter, context) => `请为以下章节标题生成完整的章节内容（3000-5000字）：

章节标题：${chapter?.title || '未命名章节'}

${context ? `写作上下文：\n${context}` : ''}

要求：
1. 情节完整，有起承转合
2. 人物形象鲜明，对话自然
3. 细节描写到位，环境氛围生动
4. 结尾留有悬念或过渡
5. 文风流畅，适合网文阅读`,
  },
  {
    label: '⚔️ 战斗章节',
    desc: '紧张刺激的战斗场面（2500-4000字）',
    buildPrompt: (chapter, context) => `请生成一场精彩的战斗章节（2500-4000字）：

章节标题：${chapter?.title || '战斗'}

${context ? `战斗背景：\n${context}` : ''}

要求：
1. 战斗节奏紧凑，招式描写生动
2. 人物心理活动丰富
3. 战场环境描写到位
4. 战斗结果合理，符合人物实力设定
5. 加入逆转或转折，增加戏剧性`,
  },
  {
    label: '💕 情感章节',
    desc: '情感细腻的日常生活（2000-3500字）',
    buildPrompt: (chapter, context) => `请生成一段情感细腻的日常章节（2000-3500字）：

章节标题：${chapter?.title || '日常'}

${context ? `情感背景：\n${context}` : ''}

要求：
1. 情感表达自然，不刻意煽情
2. 人物互动真实，对话生动
3. 细节描写到位，氛围温馨
4. 推进人物关系，埋下伏笔`,
  },
  {
    label: '🎭 冲突章节',
    desc: '矛盾爆发的关键转折（3000-4500字）',
    buildPrompt: (chapter, context) => `请生成一段矛盾冲突爆发的章节（3000-4500字）：

章节标题：${chapter?.title || '冲突'}

${context ? `冲突背景：\n${context}` : ''}

要求：
1. 冲突层层递进，节奏紧凑
2. 人物性格鲜明，立场清晰
3. 对话针锋相对，有张力
4. 结果具有冲击力，改变故事走向
5. 为后续情节埋下伏笔`,
  },
]

export default function AIPanel() {
  const {
    aiConfig,
    setAIConfig,
    aiMessages,
    addAIMessage,
    clearAIMessages,
    aiLoading,
    setAILoading,
    editorContent,
    currentChapterId,
    chapters,
    currentProjectId,
    projects,
    updateProject,
    updateChapterContent,
    knowledge,
  } = useStore()

  const [inputText, setInputText] = useState('')
  const [mode, setMode] = useState('chapter')
  const [taskType, setTaskType] = useState('continue')
  const [configOpen, setConfigOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState('checking') // checking | online | offline
  const abortRef = useRef(null)
  const project = projects.find(p => p.id === currentProjectId)
  const currentChapter = chapters.find(c => c.id === currentChapterId)

  // 检测 AI 服务状态
  useEffect(() => {
    checkAIStatus()
  }, [aiConfig.provider, aiConfig.ollamaUrl])

  const checkAIStatus = async () => {
    setAiStatus('checking')
    if (aiConfig.provider === 'ollama') {
      try {
        const res = await fetch(`${aiConfig.ollamaUrl || 'http://localhost:11434'}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })
        setAiStatus(res.ok ? 'online' : 'offline')
      } catch {
        setAiStatus('offline')
      }
    } else if (aiConfig.provider === 'openai' || aiConfig.provider === 'deepseek' || aiConfig.provider === 'custom') {
      // 云端 API 只检查是否有 key
      const hasKey = aiConfig.provider === 'openai' ? aiConfig.openaiApiKey :
                     aiConfig.provider === 'deepseek' ? aiConfig.deepseekApiKey :
                     aiConfig.customApiKey
      setAiStatus(hasKey ? 'online' : 'offline')
    }
  }

  // 配置表单状态
  const [tempConfig, setTempConfig] = useState({})

  const openConfig = () => {
    setTempConfig({ ...aiConfig })
    setConfigOpen(true)
  }

  const saveConfig = () => {
    setAIConfig(tempConfig)
    setConfigOpen(false)
    message.success('配置已保存')
    checkAIStatus()
  }

  const appendToEditor = (text) => {
    const sep = editorContent ? '\n\n' : ''
    updateChapterContent(editorContent + sep + text)
    message.success('已插入正文末尾')
  }

  const handleSend = async (presetPrompt) => {
    if (!project) {
      message.warning('请先选择一个作品项目')
      return
    }
    if (aiConfig.provider === 'ollama' && !aiConfig.ollamaUrl) {
      message.error('请先配置 Ollama 地址')
      return
    }

    const userMessage = presetPrompt || inputText.trim()
    if (!userMessage) return

    setAILoading(true)
    addAIMessage({ role: 'user', content: userMessage, time: new Date().toISOString() })

    try {
      const systemPrompt = mode === 'outline'
        ? buildOutlineSystemPrompt(project)
        : buildChapterSystemPrompt(project, currentChapter || {}, chapters, knowledge, aiConfig.contextMode)

      const messages = [
        { role: 'system', content: systemPrompt },
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ]

      const result = await chatCompletion(aiConfig, messages)

      addAIMessage({ role: 'assistant', content: result, time: new Date().toISOString() })

      if (mode === 'outline') {
        message.success('大纲生成完成！点击"保存大纲"按钮将其应用到项目')
      }
    } catch (err) {
      addAIMessage({ role: 'error', content: err.message, time: new Date().toISOString() })
      message.error('AI 生成失败: ' + err.message)
    } finally {
      setAILoading(false)
      setInputText('')
    }
  }

  // 一键生成大纲
  const handleAutoGenerateOutline = async () => {
    if (!project) {
      message.warning('请先选择一个作品项目')
      return
    }
    if (!project.description && !project.genre) {
      message.warning('请先填写项目简介或类型')
      return
    }

    const prompt = `请为《${project.name}》生成完整的故事大纲。这是一部${project.genre || '小说'}，简介如下：${project.description || '暂无简介'}

请生成：
1. 完整的故事大纲（包含起承转合）
2. 主要人物设定
3. 世界观/背景设定（如适用）
4. 建议的章节结构`

    setInputText(prompt)
    handleSend(prompt)
  }

  // 保存大纲到项目
  const handleSaveOutline = () => {
    if (!project || !currentProjectId) {
      message.error('请先选择项目')
      return
    }
    const lastAssistantMsg = aiMessages.filter(m => m.role === 'assistant').at(-1)
    if (!lastAssistantMsg) {
      message.error('没有可保存的大纲内容')
      return
    }

    updateProject(currentProjectId, { outline: lastAssistantMsg.content })
    message.success('大纲已保存到项目！')
  }

  const handlePreset = (preset) => {
    handleSend(preset.prompt)
    setTaskType(preset.label)
  }

  // 一键生成整章
  const [chapterTemplateOpen, setChapterTemplateOpen] = useState(false)
  const [selectedChapterTemplate, setSelectedChapterTemplate] = useState(null)

  const handleGenerateChapter = async (template) => {
    if (!project || !currentChapterId) {
      message.warning('请先选择要写入的章节')
      return
    }

    setSelectedChapterTemplate(template)
    setChapterTemplateOpen(false)
    setAILoading(true)

    try {
      // 构建上下文
      const context = useStore.getState().getWritingContext(aiConfig.contextMode)
      const prompt = template.buildPrompt(currentChapter, context)

      addAIMessage({ role: 'user', content: `[一键生成] ${template.label}`, time: new Date().toISOString() })

      const systemPrompt = buildChapterSystemPrompt(project, currentChapter || {}, chapters, knowledge, aiConfig.contextMode)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]

      const result = await chatCompletion(aiConfig, messages)
      addAIMessage({ role: 'assistant', content: result, time: new Date().toISOString() })
      
      message.success(`已生成 ${result.length} 字，点击"插入正文"添加到章节`)
    } catch (err) {
      addAIMessage({ role: 'error', content: err.message, time: new Date().toISOString() })
      message.error('生成失败: ' + err.message)
    } finally {
      setAILoading(false)
    }
  }

  // 世界观一致性检查
  const [worldCheckOpen, setWorldCheckOpen] = useState(false)
  const [worldCheckResult, setWorldCheckResult] = useState(null)

  const handleWorldConsistencyCheck = async () => {
    if (!project || !knowledge) {
      message.warning('请先创建人物档案和世界观设定')
      return
    }

    if (!editorContent) {
      message.warning('当前章节内容为空')
      return
    }

    setWorldCheckOpen(true)
    setAILoading(true)
    setWorldCheckResult(null)

    try {
      const k = knowledge
      const prompt = `请检查以下章节内容是否与人物档案和世界观设定保持一致。

【当前章节内容】
${editorContent.slice(0, 8000)}

【人物档案】
${k.characters?.map(c => `- ${c.name}：${c.description}`).join('\n') || '暂无'}

【世界观设定】
${k.worldSettings?.map(s => `- ${s.key}：${s.value}`).join('\n') || '暂无'}

【全书摘要】
${k.globalSummary || '暂无'}

请检查并输出：
1. 人物性格是否一致（如有矛盾请指出）
2. 人物能力/等级是否合理
3. 人物关系是否正确
4. 世界观设定是否矛盾
5. 时间线是否合理

如果一切正常，请说"未发现明显矛盾"。如果发现问题，请详细说明并给出修改建议。`

      const systemPrompt = '你是一个专业的小说编辑，擅长发现故事中的逻辑矛盾和设定冲突。'
      const result = await chatCompletion(aiConfig, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ])

      setWorldCheckResult(result)
    } catch (err) {
      setWorldCheckResult('检查失败: ' + err.message)
    } finally {
      setAILoading(false)
    }
  }

  const handleCopyLast = () => {
    const last = aiMessages.filter(m => m.role === 'assistant').at(-1)
    if (last) {
      navigator.clipboard.writeText(last.content)
      message.success('已复制到剪贴板')
    }
  }

  const handleInsertLast = () => {
    const last = aiMessages.filter(m => m.role === 'assistant').at(-1)
    if (last) appendToEditor(last.content)
  }

  // 获取当前 provider 的模型列表
  const currentModels = MODEL_CONFIGS[aiConfig.provider]?.models || []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* 头部 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>🤖 AI 写作助手</Title>
          <Space>
            {/* AI 状态指示 */}
            {aiStatus === 'checking' && <Tag icon={<LoadingOutlined spin />} color="processing">检测中</Tag>}
            {aiStatus === 'online' && <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>}
            {aiStatus === 'offline' && <Tag icon={<CloseCircleOutlined />} color="error">未连接</Tag>}
            <Tooltip title="知识库状态">
              <Tag icon={<DatabaseOutlined />} color={knowledge ? 'blue' : 'default'}>
                {knowledge?.characters?.length || 0}人 / {knowledge?.worldSettings?.length || 0}设定
              </Tag>
            </Tooltip>
            <Button size="small" icon={<SettingOutlined />} onClick={openConfig} />
          </Space>
        </div>

        {/* 离线提示 */}
        {aiStatus === 'offline' && (
          <Alert
            message={
              aiConfig.provider === 'ollama' 
                ? 'Ollama 未运行，AI 功能不可用'
                : 'API Key 未配置，AI 功能不可用'
            }
            description={
              aiConfig.provider === 'ollama'
                ? <span>请先启动 Ollama：<br/>1. 下载安装：<a href="https://ollama.ai" target="_blank">ollama.ai</a><br/>2. 运行命令：<code>ollama serve</code><br/>3. 下载模型：<code>ollama pull qwen2.5:7b</code></span>
                : '点击右上角设置按钮配置 API Key'
            }
            type="warning"
            showIcon
            style={{ marginTop: 8, fontSize: 12 }}
          />
        )}

        {/* 模型选择 - 增强 */}
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
          <Space>
            <Text style={{ fontSize: 12, width: 50 }}>提供商</Text>
            <Select
              size="small"
              value={aiConfig.provider}
              onChange={(v) => setAIConfig({ provider: v })}
              options={[
                { label: '🤖 Ollama (本地免费)', value: 'ollama' },
                { label: '🔑 OpenAI (GPT-4)', value: 'openai' },
                { label: '🔮 DeepSeek (国产)', value: 'deepseek' },
                { label: '⚙️ 自定义 API', value: 'custom' },
              ]}
              style={{ width: 140 }}
            />
          </Space>

          {aiConfig.provider === 'ollama' && (
            <>
              <Space>
                <Text style={{ fontSize: 12, width: 50 }}>地址</Text>
                <Input
                  size="small"
                  placeholder="http://localhost:11434"
                  value={aiConfig.ollamaUrl}
                  onChange={(e) => setAIConfig({ ollamaUrl: e.target.value })}
                  style={{ width: 130 }}
                />
              </Space>
              <Space>
                <Text style={{ fontSize: 12, width: 50 }}>模型</Text>
                <Select
                  size="small"
                  value={aiConfig.ollamaModel}
                  onChange={(v) => setAIConfig({ ollamaModel: v })}
                  options={currentModels.map(m => ({
                    label: `${m.name}`,
                    value: m.id,
                  }))}
                  style={{ width: 180 }}
                  placeholder="选择或输入模型名"
                  showSearch
                />
              </Space>
            </>
          )}

          {(aiConfig.provider === 'openai' || aiConfig.provider === 'deepseek') && (
            <Space>
              <Text style={{ fontSize: 12, width: 50 }}>API Key</Text>
              <Input.Password
                size="small"
                placeholder="sk-..."
                value={aiConfig[aiConfig.provider + 'ApiKey']}
                onChange={(e) => setAIConfig({ [aiConfig.provider + 'ApiKey']: e.target.value })}
                style={{ width: 130 }}
              />
            </Space>
          )}

          {/* 上下文记忆模式 */}
          <Space>
            <Text style={{ fontSize: 12, width: 50 }}>记忆</Text>
            <Select
              size="small"
              value={aiConfig.contextMode || 'auto'}
              onChange={(v) => setAIConfig({ contextMode: v })}
              options={[
                { label: '📖 仅本章', value: 'chapter' },
                { label: '📚 智能摘要', value: 'auto' },
                { label: '📚📚 完整上下文', value: 'full' },
              ]}
              style={{ width: 120 }}
            />
            <Tooltip title="本章=只看当前章节 | 智能摘要=使用前文摘要 | 完整=全部内容(消耗更多token)">
              <Text type="secondary" style={{ fontSize: 11 }}>?</Text>
            </Tooltip>
          </Space>
        </Space>

        {/* 模式切换 */}
        <Tabs
          size="small"
          activeKey={mode}
          onChange={setMode}
          style={{ marginTop: 8 }}
          items={[
            { key: 'chapter', label: '✏️ 章节写作', children: null },
            { key: 'outline', label: '🗺️ 大纲生成', children: null },
          ]}
        />
      </div>

      {/* 快捷指令 */}
      {mode === 'chapter' && currentChapter && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>快捷指令</Text>
            <Space size={4}>
              <Tooltip title="一键生成完整章节">
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<ThunderboltOutlined />}
                  onClick={() => setChapterTemplateOpen(true)}
                >
                  一键生成整章
                </Button>
              </Tooltip>
              <Tooltip title="检查与设定的矛盾">
                <Button 
                  size="small" 
                  icon={<CheckCircleOutlined />}
                  onClick={handleWorldConsistencyCheck}
                  loading={aiLoading && worldCheckOpen}
                >
                  一致性检查
                </Button>
              </Tooltip>
            </Space>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="small"
                onClick={() => handlePreset(p)}
                disabled={aiLoading}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 大纲模式特殊操作 */}
      {mode === 'outline' && project && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={handleAutoGenerateOutline}
              loading={aiLoading}
            >
              一键生成大纲
            </Button>
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveOutline}
              disabled={aiMessages.filter(m => m.role === 'assistant').length === 0}
            >
              保存大纲
            </Button>
          </Space>
        </div>
      )}

      {/* 聊天记录 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {aiMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💭</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {mode === 'outline'
                ? '输入想法，AI 帮你生成大纲\n或点击"一键生成大纲"'
                : '输入指令，AI 帮你写章节内容'}
            </Text>
          </div>
        )}

        {aiMessages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: msg.role === 'user' ? '#eef2ff' : msg.role === 'error' ? '#fff1f0' : '#f9f9f9',
              borderLeft: `3px solid ${
                msg.role === 'user' ? '#6366f1' :
                msg.role === 'error' ? '#ff4d4f' : '#52c41a'
              }`,
            }}
          >
            <Text strong style={{ fontSize: 12, color: '#666' }}>
              {msg.role === 'user' ? '📝 你' : msg.role === 'error' ? '❌ 错误' : '🤖 AI'}
            </Text>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 4 }}>
              {msg.content}
            </div>
          </div>
        ))}

        {aiLoading && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#f9f9f9' }}>
            <Spin size="small" /> <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>AI 正在思考...</Text>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
        {/* 操作按钮 */}
        <div style={{ marginBottom: 8, display: 'flex', gap: 4 }}>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopyLast} disabled={aiLoading || !aiMessages.length}>
            复制
          </Button>
          {mode === 'chapter' && (
            <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={handleInsertLast} disabled={aiLoading || !aiMessages.length}>
              插入正文
            </Button>
          )}
          <Button size="small" onClick={() => clearAIMessages()} disabled={aiLoading || !aiMessages.length}>
            清空
          </Button>
        </div>

        {/* 输入框 */}
        <TextArea
          placeholder={
            mode === 'outline'
              ? '输入你的故事想法、体裁、大纲要求...'
              : '输入你想让 AI 写的内容，或选择上方快捷指令...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend() } }}
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={aiLoading || !currentChapterId && mode === 'chapter'}
        />
        <Button
          type="primary"
          block
          onClick={() => handleSend()}
          loading={aiLoading}
          style={{ marginTop: 6 }}
          disabled={!inputText.trim() && (mode === 'chapter' ? !currentChapterId : !project)}
        >
          {aiLoading ? '生成中...' : mode === 'outline' ? '生成大纲' : '生成内容'}
        </Button>
      </div>

      {/* 配置弹窗 - 增强 */}
      <Modal
        title="⚙️ AI 配置"
        open={configOpen}
        onOk={saveConfig}
        onCancel={() => setConfigOpen(false)}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text strong>模型提供商</Text>
            <Select
              value={tempConfig.provider}
              onChange={(v) => setTempConfig({ ...tempConfig, provider: v })}
              options={[
                { label: '🤖 Ollama (本地免费)', value: 'ollama' },
                { label: '🔑 OpenAI (GPT-4)', value: 'openai' },
                { label: '🔮 DeepSeek (国产)', value: 'deepseek' },
                { label: '⚙️ 自定义 API', value: 'custom' },
              ]}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {tempConfig.provider === 'ollama' && (
            <>
              <div>
                <Text strong>Ollama 地址</Text>
                <Input
                  placeholder="http://localhost:11434"
                  value={tempConfig.ollamaUrl}
                  onChange={(e) => setTempConfig({ ...tempConfig, ollamaUrl: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>模型</Text>
                <Select
                  value={tempConfig.ollamaModel}
                  onChange={(v) => setTempConfig({ ...tempConfig, ollamaModel: v })}
                  options={MODEL_CONFIGS.ollama.models.map(m => ({
                    label: `${m.name} (${(m.contextWindow/1000).toFixed(0)}K上下文)`,
                    value: m.id,
                  }))}
                  style={{ width: '100%', marginTop: 4 }}
                  showSearch
                  placeholder="选择模型或输入自定义模型名"
                />
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  更多模型: ollama pull qwen2.5:32b (高质量) | ollama pull llama3.1:8b (长上下文128K)
                </Text>
              </div>
            </>
          )}

          {tempConfig.provider === 'openai' && (
            <>
              <div>
                <Text strong>OpenAI API Key</Text>
                <Input.Password
                  placeholder="sk-..."
                  value={tempConfig.openaiApiKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, openaiApiKey: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>模型</Text>
                <Select
                  value={tempConfig.openaiModel || 'gpt-4o'}
                  onChange={(v) => setTempConfig({ ...tempConfig, openaiModel: v })}
                  options={MODEL_CONFIGS.openai.models.map(m => ({
                    label: `${m.name} (${(m.contextWindow/1000).toFixed(0)}K上下文)`,
                    value: m.id,
                  }))}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            </>
          )}

          {tempConfig.provider === 'deepseek' && (
            <>
              <div>
                <Text strong>DeepSeek API Key</Text>
                <Input.Password
                  placeholder="sk-..."
                  value={tempConfig.deepseekApiKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, deepseekApiKey: e.target.value })}
                  style={{ marginTop: 4 }}
                />
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  获取: <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>
                </Text>
              </div>
              <div>
                <Text strong>模型</Text>
                <Select
                  value={tempConfig.deepseekModel || 'deepseek-chat'}
                  onChange={(v) => setTempConfig({ ...tempConfig, deepseekModel: v })}
                  options={MODEL_CONFIGS.deepseek.models.map(m => ({
                    label: `${m.name}`,
                    value: m.id,
                  }))}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            </>
          )}

          {tempConfig.provider === 'custom' && (
            <>
              <div>
                <Text strong>API 地址</Text>
                <Input
                  placeholder="https://api.example.com/v1"
                  value={tempConfig.customUrl}
                  onChange={(e) => setTempConfig({ ...tempConfig, customUrl: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>API Key</Text>
                <Input.Password
                  placeholder="..."
                  value={tempConfig.customApiKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, customApiKey: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>模型名称</Text>
                <Input
                  placeholder="model-name"
                  value={tempConfig.customModel}
                  onChange={(e) => setTempConfig({ ...tempConfig, customModel: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
            </>
          )}

          <Divider style={{ margin: '8px 0' }} />
          
          <div>
            <Text strong>温度 (创造性)</Text>
            <Select
              value={tempConfig.temperature || 0.8}
              onChange={(v) => setTempConfig({ ...tempConfig, temperature: v })}
              options={[
                { label: '0.5 (保守稳定)', value: 0.5 },
                { label: '0.7 (平衡)', value: 0.7 },
                { label: '0.8 (推荐)', value: 0.8 },
                { label: '1.0 (更有创意)', value: 1.0 },
              ]}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <Text strong>上下文记忆模式</Text>
            <Select
              value={tempConfig.contextMode || 'auto'}
              onChange={(v) => setTempConfig({ ...tempConfig, contextMode: v })}
              options={[
                { label: '📖 仅本章 - 最快，只看当前章节', value: 'chapter' },
                { label: '📚 智能摘要 - 推荐，使用前文摘要', value: 'auto' },
                { label: '📚📚 完整上下文 - 最完整，消耗更多token', value: 'full' },
              ]}
              style={{ width: '100%', marginTop: 4 }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              记忆长度可在"知识库 → 全书摘要"中管理章节摘要
            </Text>
          </div>
        </Space>
      </Modal>

      {/* 一键生成整章模板选择弹窗 */}
      <Modal
        title="📖 选择章节模板"
        open={chapterTemplateOpen}
        onCancel={() => setChapterTemplateOpen(false)}
        footer={null}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>选择模板类型，AI 将生成完整的章节内容</Text>
          <div style={{ display: 'grid', gap: 8 }}>
            {CHAPTER_TEMPLATES.map((tpl) => (
              <Card
                key={tpl.label}
                size="small"
                hoverable
                style={{ cursor: 'pointer', borderLeft: '3px solid #6366f1' }}
                onClick={() => handleGenerateChapter(tpl)}
              >
                <div>
                  <Text strong style={{ fontSize: 14 }}>{tpl.label}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{tpl.desc}</Text>
                </div>
              </Card>
            ))}
          </div>
          {currentChapter && (
            <Alert
              message={`将写入章节：${currentChapter.title}`}
              type="info"
              showIcon
              style={{ marginTop: 8, fontSize: 12 }}
            />
          )}
        </Space>
      </Modal>

      {/* 世界观一致性检查结果弹窗 */}
      <Modal
        title="🔍 一致性检查结果"
        open={worldCheckOpen}
        onCancel={() => setWorldCheckOpen(false)}
        footer={[
          <Button key="close" onClick={() => setWorldCheckOpen(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {aiLoading && !worldCheckResult ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="正在检查..." />
          </div>
        ) : (
          <Paragraph
            style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: 13,
              background: '#fafafa', 
              padding: 16, 
              borderRadius: 8,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {worldCheckResult || '暂无检查结果'}
          </Paragraph>
        )}
      </Modal>
    </div>
  )
}
