import { create } from 'zustand'

const DEFAULT_AI_CONFIG = {
  provider: 'ollama', // ollama | openai | deepseek | custom
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  customUrl: '',
  customApiKey: '',
  customModel: '',
  temperature: 0.8,
  maxTokens: 4096,
  contextMode: 'chapter', // chapter | full | auto
  contextSize: 8000,
}

const DEFAULT_KNOWLEDGE = {
  characters: [],
  worldSettings: [],
  plotPoints: [],
  customNotes: [],
  globalSummary: '',
  writingStyle: '',
}

const useStore = create((set, get) => ({
  // === 项目管理 ===
  projects: [],
  currentProjectId: null,

  // === 卷管理 ===
  volumes: [], // [{ id, name, order, summary, createdAt }]
  currentVolumeId: null,

  // === 章节管理 ===
  chapters: [], // [{ id, volumeId, title, content, summary, wordCount, order }]
  currentChapterId: null,

  // === 编辑器 ===
  editorContent: '',

  // === AI 配置 ===
  aiConfig: DEFAULT_AI_CONFIG,

  // === AI 聊天记录 ===
  aiMessages: [],
  aiLoading: false,

  // === UI 状态 ===
  view: 'projects',
  activePanel: 'ai',

  // === 拆书记录 ===
  bookAnalyses: [],

  // === 知识库 ===
  knowledge: null,

  // ========== 项目操作 ==========
  createProject: (name, genre = '其他', description = '') => {
    const id = 'proj_' + Date.now()
    const project = {
      id,
      name,
      genre,
      description,
      outline: '',
      knowledge: { ...DEFAULT_KNOWLEDGE },
      volumes: [], // 新增：卷列表
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set(state => ({ projects: [...state.projects, project] }))
    get().saveToDisk()
    return id
  },

  deleteProject: (id) => {
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      view: state.currentProjectId === id ? 'projects' : state.view,
      chapters: state.currentProjectId === id ? [] : state.chapters,
      volumes: state.currentProjectId === id ? [] : state.volumes,
      currentChapterId: state.currentProjectId === id ? null : state.currentChapterId,
      knowledge: state.currentProjectId === id ? null : state.knowledge,
    }))
    get().saveToDisk()
  },

  selectProject: (id) => {
    const state = get()
    const project = state.projects.find(p => p.id === id)
    if (!project) return
    set({ 
      currentProjectId: id, 
      view: 'editor', 
      chapters: project.chapters || [], 
      volumes: project.volumes || [],
      currentChapterId: null, 
      currentVolumeId: null,
      editorContent: '', 
      aiMessages: [],
      knowledge: project.knowledge || { ...DEFAULT_KNOWLEDGE },
    })
  },

  updateProject: (id, updates) => {
    set(state => ({
      projects: state.projects.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }))
    get().saveToDisk()
  },

  // ========== AI 辅助功能 ==========
  generateOutline: async () => {
    const state = get()
    if (!state.currentProjectId) return
    const project = state.projects.find(p => p.id === state.currentProjectId)
    if (!project) return

    const { callAI, buildOutlineSystemPrompt } = await import('../utils/ai')
    const prompt = buildOutlineSystemPrompt(project)
    
    try {
      const outline = await callAI(prompt, state.aiConfig)
      get().updateProject(state.currentProjectId, { outline })
      return outline
    } catch (e) {
      console.error('生成大纲失败:', e)
      throw e
    }
  },

  // ========== 卷操作 ==========
  createVolume: (name = '') => {
    const state = get()
    if (!state.currentProjectId) return null

    const id = 'vol_' + Date.now()
    const volume = {
      id,
      name: name || `第${state.volumes.length + 1}卷`,
      order: state.volumes.length,
      summary: '',
      createdAt: new Date().toISOString(),
    }

    set(state => ({ volumes: [...state.volumes, volume] }))
    get().syncToProject()
    return id
  },

  updateVolume: (id, updates) => {
    set(state => ({
      volumes: state.volumes.map(v =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }))
    get().syncToProject()
  },

  deleteVolume: (id) => {
    const state = get()
    // 删除卷时，其下章节移动到无卷状态
    set(state => ({
      volumes: state.volumes.filter(v => v.id !== id),
      chapters: state.chapters.map(ch =>
        ch.volumeId === id ? { ...ch, volumeId: null } : ch
      ),
      currentVolumeId: state.currentVolumeId === id ? null : state.currentVolumeId,
    }))
    get().syncToProject()
  },

  reorderVolumes: (newOrder) => {
    set(state => ({
      volumes: newOrder.map((id, idx) => {
        const vol = state.volumes.find(v => v.id === id)
        return { ...vol, order: idx }
      })
    }))
    get().syncToProject()
  },

  generateVolumeSummary: async (volumeId) => {
    const state = get()
    const volumeChapters = state.chapters.filter(ch => ch.volumeId === volumeId)
    
    if (volumeChapters.length === 0) return ''

    // 拼接该卷所有章节内容
    const content = volumeChapters
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(ch => `【${ch.title}】\n${ch.content || ''}\n${ch.summary ? `[摘要: ${ch.summary}]` : ''}`)
      .join('\n\n---\n\n')

    // 调用AI生成卷摘要
    const { callAI } = await import('../utils/ai')
    const prompt = `请为以下小说卷内容生成一份500字左右的摘要，概括本卷的主要情节发展、人物关系变化、核心冲突和结局。

内容：
${content.slice(0, 16000)}

请用简洁的文学语言概括，不要分段，一气呵成。`

    try {
      const summary = await callAI(prompt, state.aiConfig)
      get().updateVolume(volumeId, { summary })
      return summary
    } catch (e) {
      console.error('生成卷摘要失败:', e)
      return ''
    }
  },

  // ========== 章节操作 ==========
  createChapter: (title, volumeId = null) => {
    const id = 'ch_' + Date.now()
    const state = get()
    if (!state.currentProjectId) return

    // 找出同卷内最大order
    const siblings = state.chapters.filter(ch => ch.volumeId === volumeId)
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(ch => ch.order || 0)) : -1

    const chapter = {
      id,
      volumeId,
      title: title || `第${state.chapters.length + 1}章`,
      content: '',
      summary: '',
      wordCount: 0,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set(state => ({ chapters: [...state.chapters, chapter] }))
    get().syncToProject()
    get().selectChapter(id)
    return id
  },

  deleteChapter: (id) => {
    set(state => ({
      chapters: state.chapters.filter(c => c.id !== id),
      currentChapterId: state.currentChapterId === id ? null : state.currentChapterId,
    }))
    get().syncToProject()
  },

  selectChapter: (id) => {
    const state = get()
    const chapter = state.chapters.find(c => c.id === id)
    if (chapter) {
      set({ 
        currentChapterId: id, 
        editorContent: chapter.content || '',
        currentVolumeId: chapter.volumeId,
      })
    }
  },

  updateChapterContent: (content) => {
    const state = get()
    if (!state.currentChapterId) return
    set({ editorContent: content })
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === state.currentChapterId
          ? { ...c, content, wordCount: content.length, updatedAt: new Date().toISOString() }
          : c
      ),
    }))
    get().syncToProject()
  },

  updateChapterTitle: (id, title) => {
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
      ),
    }))
    get().syncToProject()
  },

  updateChapterSummary: (id, summary) => {
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === id ? { ...c, summary, updatedAt: new Date().toISOString() } : c
      ),
    }))
    get().syncToProject()
  },

  moveChapterToVolume: (chapterId, volumeId) => {
    set(state => ({
      chapters: state.chapters.map(ch =>
        ch.id === chapterId ? { ...ch, volumeId } : ch
      ),
    }))
    get().syncToProject()
  },

  reorderChapters: (volumeId, newOrder) => {
    set(state => ({
      chapters: state.chapters.map(ch => {
        if (ch.volumeId !== volumeId) return ch
        const idx = newOrder.indexOf(ch.id)
        return idx >= 0 ? { ...ch, order: idx } : ch
      }),
    }))
    get().syncToProject()
  },

  generateChapterSummary: async (chapterId) => {
    const state = get()
    const chapter = state.chapters.find(c => c.id === chapterId)
    if (!chapter || !chapter.content) return ''

    const { callAI } = await import('../utils/ai')
    const prompt = `请为以下小说章节生成一份200字左右的摘要，概括本章的主要情节、人物表现、关键冲突。

章节标题：${chapter.title}
章节内容：
${chapter.content.slice(0, 12000)}

请用简洁的文学语言概括，不要分段，突出重点。`

    try {
      const summary = await callAI(prompt, state.aiConfig)
      get().updateChapterSummary(chapterId, summary)
      return summary
    } catch (e) {
      console.error('生成章节摘要失败:', e)
      return ''
    }
  },

  // ========== 知识库操作 ==========
  addCharacter: (character) => {
    const id = 'char_' + Date.now()
    const newChar = { id, ...character, createdAt: new Date().toISOString() }
    set(state => ({
      knowledge: {
        ...state.knowledge,
        characters: [...(state.knowledge?.characters || []), newChar]
      }
    }))
    get().syncKnowledgeToProject()
    return id
  },

  updateCharacter: (id, updates) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        characters: state.knowledge?.characters?.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  deleteCharacter: (id) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        characters: state.knowledge?.characters?.filter(c => c.id !== id) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  addWorldSetting: (setting) => {
    const id = 'ws_' + Date.now()
    const newSetting = { id, ...setting, createdAt: new Date().toISOString() }
    set(state => ({
      knowledge: {
        ...state.knowledge,
        worldSettings: [...(state.knowledge?.worldSettings || []), newSetting]
      }
    }))
    get().syncKnowledgeToProject()
    return id
  },

  updateWorldSetting: (id, updates) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        worldSettings: state.knowledge?.worldSettings?.map(s =>
          s.id === id ? { ...s, ...updates } : s
        ) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  deleteWorldSetting: (id) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        worldSettings: state.knowledge?.worldSettings?.filter(s => s.id !== id) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  addCustomNote: (note) => {
    const id = 'note_' + Date.now()
    const newNote = { id, ...note, createdAt: new Date().toISOString() }
    set(state => ({
      knowledge: {
        ...state.knowledge,
        customNotes: [...(state.knowledge?.customNotes || []), newNote]
      }
    }))
    get().syncKnowledgeToProject()
    return id
  },

  updateCustomNote: (id, updates) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        customNotes: state.knowledge?.customNotes?.map(n =>
          n.id === id ? { ...n, ...updates } : n
        ) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  deleteCustomNote: (id) => {
    set(state => ({
      knowledge: {
        ...state.knowledge,
        customNotes: state.knowledge?.customNotes?.filter(n => n.id !== id) || []
      }
    }))
    get().syncKnowledgeToProject()
  },

  updateGlobalSummary: (summary) => {
    set(state => ({
      knowledge: { ...state.knowledge, globalSummary: summary }
    }))
    get().syncKnowledgeToProject()
  },

  updateWritingStyle: (style) => {
    set(state => ({
      knowledge: { ...state.knowledge, writingStyle: style }
    }))
    get().syncKnowledgeToProject()
  },

  syncKnowledgeToProject: () => {
    const state = get()
    if (!state.currentProjectId) return
    set(state => ({
      projects: state.projects.map(p =>
        p.id === state.currentProjectId
          ? { ...p, knowledge: state.knowledge, updatedAt: new Date().toISOString() }
          : p
      ),
    }))
    get().saveToDisk()
  },

  // ========== AI 操作 ==========
  setAIConfig: (config) => {
    set({ aiConfig: { ...get().aiConfig, ...config } })
    get().saveToDisk()
  },

  addAIMessage: (msg) => {
    set(state => ({ aiMessages: [...state.aiMessages, msg] }))
  },

  clearAIMessages: () => {
    set({ aiMessages: [] })
  },

  setAILoading: (loading) => {
    set({ aiLoading: loading })
  },

  // ========== 拆书操作 ==========
  addBookAnalysis: (analysis) => {
    const id = 'ba_' + Date.now()
    const record = {
      id,
      title: analysis.title || '未命名分析',
      content: analysis.content,
      result: analysis.result,
      type: analysis.type || 'full',
      createdAt: new Date().toISOString(),
    }
    set(state => ({ bookAnalyses: [...state.bookAnalyses, record] }))
    get().saveToDisk()
    return id
  },

  deleteBookAnalysis: (id) => {
    set(state => ({ bookAnalyses: state.bookAnalyses.filter(b => b.id !== id) }))
    get().saveToDisk()
  },

  // ========== 工具方法 ==========
  syncToProject: () => {
    const state = get()
    if (!state.currentProjectId) return
    set(state => ({
      projects: state.projects.map(p =>
        p.id === state.currentProjectId
          ? { ...p, chapters: state.chapters, volumes: state.volumes, updatedAt: new Date().toISOString() }
          : p
      ),
    }))
    get().saveToDisk()
  },

  // ========== 持久化 ==========
  saveToDisk: () => {
    const state = get()
    const data = {
      projects: state.projects,
      aiConfig: state.aiConfig,
      bookAnalyses: state.bookAnalyses,
    }
    localStorage.setItem('novel-writer-data', JSON.stringify(data))
  },

  // 自动保存（每30秒）- 支持状态回调
  startAutoSave: (onSave) => {
    const interval = setInterval(() => {
      get().saveToDisk()
      if (onSave) onSave('已保存')
      console.log('[自动保存]', new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  },

  // 搜索章节内容
  searchContent: (query) => {
    const state = get()
    if (!query?.trim()) return []
    const q = query.toLowerCase()
    const results = []
    state.chapters.forEach(ch => {
      const titleMatch = ch.title?.toLowerCase().includes(q)
      const contentMatch = ch.content?.toLowerCase().includes(q)
      if (titleMatch || contentMatch) {
        results.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          volumeId: ch.volumeId,
          matchType: titleMatch && contentMatch ? 'both' : titleMatch ? 'title' : 'content',
          preview: contentMatch ? ch.content.slice(0, 200) : '',
        })
      }
    })
    return results
  },

  loadFromDisk: () => {
    try {
      const raw = localStorage.getItem('novel-writer-data')
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.projects) set({ projects: data.projects })
      if (data.aiConfig) set({ aiConfig: { ...DEFAULT_AI_CONFIG, ...data.aiConfig } })
      if (data.bookAnalyses) set({ bookAnalyses: data.bookAnalyses })
    } catch (e) {
      console.error('Failed to load data:', e)
    }
  },

  exportProject: (id) => {
    const project = get().projects.find(p => p.id === id)
    if (!project) return ''
    let text = `# ${project.name}\n\n`
    text += `## 简介\n${project.description || '无'}\n\n`
    
    // 知识库导出
    if (project.knowledge) {
      const k = project.knowledge
      if (k.characters?.length) {
        text += `## 人物档案\n`
        k.characters.forEach(c => {
          text += `### ${c.name}\n${c.description || ''}\n`
          if (c.traits) text += `性格: ${c.traits}\n`
          if (c.relationships) text += `关系: ${c.relationships}\n`
        })
        text += '\n'
      }
      if (k.worldSettings?.length) {
        text += `## 世界观设定\n`
        k.worldSettings.forEach(s => {
          text += `- ${s.key}: ${s.value}\n`
        })
        text += '\n'
      }
      if (k.globalSummary) {
        text += `## 全书摘要\n${k.globalSummary}\n\n`
      }
      if (k.writingStyle) {
        text += `## 写作风格\n${k.writingStyle}\n\n`
      }
    }
    
    if (project.outline) {
      text += `## 大纲\n${project.outline}\n\n`
    }

    // 分卷导出
    const volumes = project.volumes || []
    const chapters = project.chapters || []

    if (volumes.length > 0) {
      volumes.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(vol => {
        text += `# ${vol.name}\n\n`
        if (vol.summary) {
          text += `> 本卷摘要：${vol.summary}\n\n`
        }
        const volChapters = chapters.filter(ch => ch.volumeId === vol.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
        volChapters.forEach(ch => {
          text += `## ${ch.title}\n\n${ch.content || ''}\n\n`
          if (ch.summary) {
            text += `> 本章摘要：${ch.summary}\n\n`
          }
        })
        text += '\n---\n\n'
      })
    } else {
      // 无卷结构，直接按章节
      chapters.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(ch => {
        text += `## ${ch.title}\n\n${ch.content || ''}\n\n`
        if (ch.summary) {
          text += `> 本章摘要：${ch.summary}\n\n`
        }
      })
    }

    return text
  },

  // 获取上下文（用于AI写作）
  getWritingContext: (mode = 'auto') => {
    const state = get()
    const project = state.projects.find(p => p.id === state.currentProjectId)
    if (!project) return ''

    let context = ''
    const k = project.knowledge

    // 1. 写作风格
    if (k?.writingStyle) {
      context += `【写作风格】\n${k.writingStyle}\n\n`
    }

    // 2. 人物档案（精简）
    if (k?.characters?.length) {
      context += `【主要人物】\n`
      k.characters.slice(0, 10).forEach(c => {
        context += `- ${c.name}：${c.description?.slice(0, 100) || '无描述'}\n`
      })
      context += '\n'
    }

    // 3. 世界观（精简）
    if (k?.worldSettings?.length) {
      context += `【世界观】\n`
      k.worldSettings.slice(0, 10).forEach(s => {
        context += `- ${s.key}：${s.value?.slice(0, 100) || ''}\n`
      })
      context += '\n'
    }

    // 4. 前文摘要
    const currentChapter = state.chapters.find(ch => ch.id === state.currentChapterId)
    if (currentChapter) {
      // 同卷前几章摘要
      const siblings = state.chapters
        .filter(ch => ch.volumeId === currentChapter.volumeId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      
      const currentIdx = siblings.findIndex(ch => ch.id === state.currentChapterId)
      if (currentIdx > 0) {
        const prevChapters = siblings.slice(Math.max(0, currentIdx - 3), currentIdx)
        if (prevChapters.length > 0) {
          context += `【前情提要】\n`
          prevChapters.forEach(ch => {
            if (ch.summary) {
              context += `${ch.title}：${ch.summary}\n`
            }
          })
          context += '\n'
        }
      }
    }

    // 5. 卷摘要
    if (currentChapter?.volumeId) {
      const vol = state.volumes.find(v => v.id === currentChapter.volumeId)
      if (vol?.summary) {
        context += `【本卷摘要】\n${vol.summary}\n\n`
      }
    }

    // 6. 全书摘要
    if (k?.globalSummary) {
      context += `【全书摘要】\n${k.globalSummary}\n\n`
    }

    return context
  },
}))

export default useStore
