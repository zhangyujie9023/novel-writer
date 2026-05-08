import React, { useState, useRef, useEffect } from 'react'
import { Typography, Button, Space, Input, Select, Spin, message, Card, Divider, Empty, Modal, Upload, List, Collapse, Tag, Progress, Tabs } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  UserOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SaveOutlined,
  DeleteOutlined,
  UploadOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  ReadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from '@ant-design/icons'
import useStore from '../stores/useStore'
import { chatCompletion, buildBookAnalysisPrompt } from '../utils/ai'

// PDF 解析
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// EPUB 解析
import ePub from 'epubjs'

// DOCX 解析
import mammoth from 'mammoth'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input
const { Panel } = Collapse

const SUPPORTED_FORMATS = [
  { ext: '.txt', label: 'TXT 纯文本', icon: '📄', mime: 'text/plain' },
  { ext: '.pdf', label: 'PDF 文档', icon: '📕', mime: 'application/pdf' },
  { ext: '.epub', label: 'EPUB 电子书', icon: '📘', mime: 'application/epub+zip' },
  { ext: '.docx', label: 'Word 文档', icon: '📘', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
]

const ANALYSIS_TYPES = [
  { value: 'full', label: '📚 全面分析', desc: '大纲+人物+情节+技巧' },
  { value: 'outline', label: '📋 故事大纲', desc: '梳理故事结构' },
  { value: 'characters', label: '👥 人物档案', desc: '提取人物设定' },
  { value: 'style', label: '✨ 写作风格', desc: '分析叙事技巧' },
  { value: 'worldbuilding', label: '🌍 世界观设定', desc: '提取世界观元素' },
  { value: 'techniques', label: '🎯 写作技巧', desc: '学习可复用的技巧' },
]

export default function BookAnalyzer({ standalone }) {
  const {
    aiConfig,
    aiLoading,
    setAILoading,
    bookAnalyses,
    addBookAnalysis,
    deleteBookAnalysis,
  } = useStore()

  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('import') // import | chapters | result | history
  
  // 书籍数据
  const [bookTitle, setBookTitle] = useState('')
  const [bookContent, setBookContent] = useState('') // 完整内容
  const [chapters, setChapters] = useState([]) // 章节列表 [{title, content, analyzed}]
  const [importFormat, setImportFormat] = useState(null) // 当前导入的格式
  
  // 当前分析
  const [analysisType, setAnalysisType] = useState('full')
  const [currentResult, setCurrentResult] = useState('')
  const [analysisProgress, setAnalysisProgress] = useState(null) // {current, total, chapter}
  
  // 导入进度
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null) // {current, total}

  // 初始化：从 store 同步 bookAnalyses（解决首次加载时 store 数据未就绪的问题）
  useEffect(() => {
    // store 数据在首次 render 时可能还未从 localStorage 加载
    // 监听 store 变化，确保 bookAnalyses 始终最新
  }, [bookAnalyses])

  // 解析 PDF
  const parsePDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const totalPages = pdf.numPages
    let fullText = ''
    
    setImportProgress({ current: 0, total: totalPages })
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
      setImportProgress({ current: i, total: totalPages })
    }
    
    setImportProgress(null)
    return fullText
  }

  // 解析 EPUB
  const parseEPUB = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const book = ePub(arrayBuffer)
    
    await book.ready
    const spine = await book.loaded.spine
    let fullText = ''
    const sections = spine.items || spine.spineItems || []
    
    setImportProgress({ current: 0, total: sections.length })
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      try {
        await section.load(book.load.bind(book))
        const doc = section.document
        if (doc && doc.body) {
          fullText += doc.body.textContent + '\n\n'
        }
        setImportProgress({ current: i + 1, total: sections.length })
      } catch (e) {
        console.warn('Section load error:', e)
      }
    }
    
    setImportProgress(null)
    return fullText
  }

  // 解析 DOCX
  const parseDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  // 解析 TXT
  const parseTXT = async (file) => {
    return await file.text()
  }

  // 导入文件
  const handleFileImport = async (file) => {
    const fileName = file.name.toLowerCase()
    
    // 检测格式
    let format = SUPPORTED_FORMATS.find(f => fileName.endsWith(f.ext))
    if (!format) {
      message.error('不支持的文件格式，请导入 TXT、PDF、EPUB 或 DOCX 文件')
      return false
    }

    setImporting(true)
    setImportFormat(format)
    
    try {
      message.loading({ content: `正在导入${format.label}...`, key: 'import' })
      
      let text = ''
      
      switch (format.ext) {
        case '.pdf':
          text = await parsePDF(file)
          break
        case '.epub':
          text = await parseEPUB(file)
          break
        case '.docx':
          text = await parseDOCX(file)
          break
        case '.txt':
        default:
          text = await parseTXT(file)
          break
      }
      
      if (!text || text.trim().length < 100) {
        throw new Error('无法提取文本内容或内容过少')
      }
      
      // 清理文本
      text = cleanText(text)
      
      // 自动分割章节
      const parsedChapters = parseChapters(text, file.name)
      
      setBookTitle(file.name.replace(/\.(txt|pdf|epub|docx)$/i, ''))
      setBookContent(text)
      setChapters(parsedChapters)
      
      message.success({ 
        content: `成功导入 ${file.name}（${format.label}），共 ${parsedChapters.length} 个章节，约 ${(text.length / 10000).toFixed(1)} 万字`, 
        key: 'import' 
      })
      setActiveTab('chapters')
      
    } catch (err) {
      message.error({ content: '导入失败: ' + err.message, key: 'import' })
    } finally {
      setImporting(false)
      setImportFormat(null)
    }
    
    return false // 阻止默认上传行为
  }

  // 清理文本
  const cleanText = (text) => {
    return text
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\n{3,}/g, '\n\n')  // 多个空行改为两个
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // 移除控制字符
      .trim()
  }

  // 解析章节
  const parseChapters = (text, fileName) => {
    const chapters = []
    
    // 常见章节标题模式（按优先级排序）
    const chapterPatterns = [
      // 中文标准格式
      /^第[零一二三四五六七八九十百千万\d]+[章节回卷部篇集][^\n]*/gm,
      // 卷+章节
      /^第[零一二三四五六七八九十百千万\d]+[卷部][^\n]*\n*第[零一二三四五六七八九十百千万\d]+[章节回][^\n]*/gm,
      // 英文格式
      /^Chapter\s*\d+[^\n]*/gim,
      /^Part\s*\d+[^\n]*/gim,
      // 数字序号
      /^[零一二三四五六七八九十百千万\d]+[、.．][^\n]*/gm,
      /^\d+[\.\、][^\n]*/gm,
      // 方括号格式
      /^【[^】]+】[^\n]*/gm,
      /^〖[^〗]+〗[^\n]*/gm,
      // 星号格式
      /^\*{2,}[^*]+\*{2,}$/gm,
      // 章节关键词
      /^[篇部][^\n]{1,20}$/gm,
    ]
    
    // 尝试匹配章节
    let matches = []
    let usedPattern = null
    
    for (const pattern of chapterPatterns) {
      try {
        const found = [...text.matchAll(pattern)]
        if (found.length >= 3) { // 至少3个章节才算有效
          matches = found
          usedPattern = pattern
          break
        }
      } catch (e) {
        console.warn('Pattern error:', e)
      }
    }
    
    if (matches.length >= 3) {
      // 按章节分割
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length
        const content = text.slice(start, end).trim()
        
        if (content.length > 100) { // 忽略太短的章节
          chapters.push({
            id: i,
            title: matches[i][0].trim().slice(0, 50), // 限制标题长度
            content: content,
            analyzed: false,
            wordCount: content.length,
          })
        }
      }
    }
    
    // 如果章节太少，按字数分块
    if (chapters.length < 3) {
      chapters.length = 0 // 清空
      
      const chunkSize = 5000 // 每块5000字
      const lines = text.split('\n')
      let currentChunk = ''
      let chunkIndex = 0
      
      for (const line of lines) {
        currentChunk += line + '\n'
        
        if (currentChunk.length >= chunkSize) {
          chapters.push({
            id: chunkIndex,
            title: `第 ${chunkIndex + 1} 部分`,
            content: currentChunk.trim(),
            analyzed: false,
            wordCount: currentChunk.length,
          })
          chunkIndex++
          currentChunk = ''
        }
      }
      
      // 最后一部分
      if (currentChunk.trim().length > 200) {
        chapters.push({
          id: chunkIndex,
          title: `第 ${chunkIndex + 1} 部分`,
          content: currentChunk.trim(),
          analyzed: false,
          wordCount: currentChunk.length,
        })
      }
    }
    
    return chapters
  }

  // 分析单个章节
  const handleAnalyzeChapter = async (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return

    if (aiConfig.provider === 'ollama' && !aiConfig.ollamaUrl) {
      message.error('请先配置 Ollama 地址')
      return
    }

    setAILoading(true)
    setCurrentResult('')

    try {
      const systemPrompt = buildBookAnalysisPrompt(chapter.content, analysisType)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `章节标题：${chapter.title}\n\n请分析这个章节。` },
      ]

      const result = await chatCompletion(aiConfig, messages)
      setCurrentResult(result)
      
      // 标记为已分析
      setChapters(prev => prev.map(c => 
        c.id === chapterId ? { ...c, analyzed: true } : c
      ))
      
      setActiveTab('result')
      message.success('章节分析完成！')
    } catch (err) {
      message.error('分析失败: ' + err.message)
    } finally {
      setAILoading(false)
    }
  }

  // 批量分析所有章节
  const handleAnalyzeAll = async () => {
    if (chapters.length === 0) {
      message.warning('没有可分析的章节')
      return
    }

    const unanalyzed = chapters.filter(c => !c.analyzed)
    if (unanalyzed.length === 0) {
      message.info('所有章节都已分析过')
      return
    }

    Modal.confirm({
      title: '批量拆书分析',
      content: `即将分析 ${unanalyzed.length} 个未分析的章节，这可能需要较长时间。是否继续？`,
      onOk: async () => {
        setAILoading(true)
        const results = []

        for (let i = 0; i < unanalyzed.length; i++) {
          const chapter = unanalyzed[i]
          setAnalysisProgress({ current: i + 1, total: unanalyzed.length, chapter: chapter.title })

          try {
            const systemPrompt = buildBookAnalysisPrompt(chapter.content, analysisType)
            const messages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `章节标题：${chapter.title}\n\n请分析这个章节。` },
            ]

            const result = await chatCompletion(aiConfig, messages)
            results.push({ chapter, result })

            // 保存到历史
            addBookAnalysis({
              title: `${bookTitle} - ${chapter.title}`,
              content: chapter.content.slice(0, 200) + '...',
              result: result,
              type: analysisType,
            })

            // 标记为已分析
            setChapters(prev => prev.map(c => 
              c.id === chapter.id ? { ...c, analyzed: true } : c
            ))

          } catch (err) {
            message.error(`${chapter.title} 分析失败: ${err.message}`)
          }
        }

        setAnalysisProgress(null)
        setAILoading(false)
        
        // 生成总结
        if (results.length > 1) {
          const summary = `✅ 已完成 ${results.length} 个章节的分析\n\n` + 
            results.map(r => `### ${r.chapter.title}\n${r.result.slice(0, 200)}...`).join('\n\n---\n\n')
          setCurrentResult(summary)
          // ✅ 自动保存汇总结果到历史
          addBookAnalysis({
            title: `${bookTitle} - 批量分析（${results.length}章节）`,
            content: bookContent.slice(0, 200) + '...',
            result: summary,
            type: analysisType,
          })
          setActiveTab('result')
        }
      },
    })
  }

  // 保存当前结果
  const handleSaveResult = () => {
    if (!currentResult) {
      message.warning('没有可保存的结果')
      return
    }
    addBookAnalysis({
      title: `${bookTitle} - ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label}`,
      content: bookContent.slice(0, 200) + '...',
      result: currentResult,
      type: analysisType,
    })
    message.success('已保存到历史记录')
  }

  const handleCopyResult = () => {
    if (currentResult) {
      navigator.clipboard.writeText(currentResult)
      message.success('已复制到剪贴板')
    }
  }

  const handleUseHistory = (record) => {
    setCurrentResult(record.result)
    setActiveTab('result')
  }

  // 获取接受的上传类型
  const acceptTypes = SUPPORTED_FORMATS.map(f => f.ext).join(',')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* 标签页切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        {[
          { key: 'import', label: '📥 导入书籍', icon: <UploadOutlined /> },
          { key: 'chapters', label: '📖 章节列表', icon: <ReadOutlined /> },
          { key: 'result', label: '📊 分析结果', icon: <FileTextOutlined /> },
          { key: 'history', label: '📚 历史记录', icon: <FolderOpenOutlined /> },
        ].map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              borderBottom: activeTab === tab.key ? '2px solid #6366f1' : 'none',
              color: activeTab === tab.key ? '#6366f1' : '#666',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* 导入书籍 */}
        {activeTab === 'import' && (
          <div>
            {/* 支持格式提示 */}
            <Card size="small" style={{ marginBottom: 16, borderRadius: 8, background: '#f0f5ff' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>📦 支持的文件格式</Text>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {SUPPORTED_FORMATS.map(f => (
                  <Tag key={f.ext} style={{ padding: '4px 8px' }}>
                    {f.icon} {f.label} ({f.ext})
                  </Tag>
                ))}
              </div>
            </Card>

            <Card style={{ marginBottom: 16, borderRadius: 8, textAlign: 'center' }}>
              <Upload.Dragger
                accept={acceptTypes}
                beforeUpload={handleFileImport}
                showUploadList={false}
                style={{ border: '2px dashed #d9d9d9', borderRadius: 8 }}
                disabled={importing}
              >
                <p style={{ padding: '40px 0' }}>
                  <FileAddOutlined style={{ fontSize: 48, color: '#6366f1', marginBottom: 16 }} />
                  <br />
                  <Text strong style={{ fontSize: 16 }}>
                    {importing ? `正在导入${importFormat?.label || '文件'}...` : '点击或拖拽导入电子书'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    支持 TXT、PDF、EPUB、DOCX 等多种格式
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    系统会自动识别章节结构
                  </Text>
                </p>
              </Upload.Dragger>
            </Card>

            <Divider>或者手动粘贴内容</Divider>

            <TextArea
              value={bookContent}
              onChange={(e) => setBookContent(e.target.value)}
              placeholder="粘贴小说全文或部分内容...

支持格式：
• 第X章/第X节/第X回 等标准章节格式
• Chapter 1/Chapter 2 等英文格式
• 【章节标题】格式
• 或直接粘贴长文本，系统会自动分块"
              autoSize={{ minRows: 10, maxRows: 15 }}
              style={{ marginBottom: 12 }}
              disabled={importing}
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Input
                placeholder="书籍名称（可选）"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                style={{ width: 200 }}
                disabled={importing}
              />
              <Button
                type="primary"
                disabled={!bookContent.trim() || importing}
                onClick={() => {
                  const parsed = parseChapters(bookContent, bookTitle || '未命名书籍')
                  setChapters(parsed)
                  message.success(`已分割为 ${parsed.length} 个章节`)
                  setActiveTab('chapters')
                }}
              >
                解析章节
              </Button>
            </Space>
          </div>
        )}

        {/* 章节列表 */}
        {activeTab === 'chapters' && (
          <div>
            {chapters.length === 0 ? (
              <Empty
                description="还没有导入书籍"
                style={{ padding: 60 }}
              >
                <Button type="primary" onClick={() => setActiveTab('import')}>
                  去导入书籍
                </Button>
              </Empty>
            ) : (
              <>
                {/* 统计信息 */}
                <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>{bookTitle || '未命名书籍'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        共 {chapters.length} 章 · 
                        已分析 {chapters.filter(c => c.analyzed).length} 章 ·
                        约 {(chapters.reduce((sum, c) => sum + c.wordCount, 0) / 10000).toFixed(1)} 万字
                      </Text>
                    </div>
                    <Space>
                      <Select
                        value={analysisType}
                        onChange={setAnalysisType}
                        style={{ width: 150 }}
                        options={ANALYSIS_TYPES}
                      />
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={handleAnalyzeAll}
                        loading={aiLoading}
                      >
                        批量拆书
                      </Button>
                    </Space>
                  </div>
                </Card>

                {/* 章节列表 */}
                <List
                  dataSource={chapters}
                  renderItem={(chapter) => (
                    <List.Item
                      style={{
                        background: '#fff',
                        marginBottom: 8,
                        borderRadius: 8,
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{chapter.title}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {chapter.wordCount} 字
                          </Text>
                        </div>
                        <Space>
                          {chapter.analyzed && <Tag color="success">已分析</Tag>}
                          <Button
                            size="small"
                            type={chapter.analyzed ? 'default' : 'primary'}
                            onClick={() => handleAnalyzeChapter(chapter.id)}
                            loading={aiLoading}
                          >
                            {chapter.analyzed ? '重新分析' : '拆书分析'}
                          </Button>
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}

        {/* 分析结果 */}
        {activeTab === 'result' && (
          <div>
            {currentResult ? (
              <>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                  <Button size="small" icon={<CopyOutlined />} onClick={handleCopyResult}>
                    复制
                  </Button>
                  <Button size="small" icon={<SaveOutlined />} onClick={handleSaveResult}>
                    保存
                  </Button>
                </div>
                <Card size="small" style={{ background: '#fff', borderRadius: 8 }}>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>
                    {currentResult}
                  </div>
                </Card>
              </>
            ) : (
              <Empty
                description="还没有分析结果"
                style={{ padding: 60 }}
              >
                <Button type="primary" onClick={() => setActiveTab('chapters')}>
                  去分析章节
                </Button>
              </Empty>
            )}
          </div>
        )}

        {/* 历史记录 */}
        {activeTab === 'history' && (
          <div>
            {bookAnalyses.length === 0 ? (
              <Empty description="还没有历史记录" style={{ padding: 60 }} />
            ) : (
              bookAnalyses.map(record => (
                <Card
                  key={record.id}
                  size="small"
                  style={{ marginBottom: 8, borderRadius: 8 }}
                  hoverable
                  onClick={() => handleUseHistory(record)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Text strong>{record.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {record.content.slice(0, 50)}...
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(record.createdAt).toLocaleString()}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBookAnalysis(record.id)
                        message.success('已删除')
                      }}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* 导入进度 */}
      {importProgress && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <Progress
            type="circle"
            percent={Math.round((importProgress.current / importProgress.total) * 100)}
            format={() => `${importProgress.current}/${importProgress.total}`}
          />
          <Text style={{ marginTop: 16, fontWeight: 500 }}>
            正在解析{importFormat?.label || '文件'}...
          </Text>
        </div>
      )}

      {/* 批量分析进度 */}
      {analysisProgress && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <Progress
            type="circle"
            percent={Math.round((analysisProgress.current / analysisProgress.total) * 100)}
            format={() => `${analysisProgress.current}/${analysisProgress.total}`}
          />
          <Text style={{ marginTop: 16, fontWeight: 500 }}>{analysisProgress.chapter}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            正在进行拆书分析...
          </Text>
        </div>
      )}

      {/* 单章节分析加载 */}
      {aiLoading && !analysisProgress && !importProgress && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <Spin size="large" />
          <Text style={{ marginTop: 16 }}>AI 正在分析拆解中...</Text>
        </div>
      )}
    </div>
  )
}
