import React, { useState } from 'react'
import { Layout, Button, Space, Dropdown, Modal, message, Tabs, Badge, Tooltip } from 'antd'
import { HomeOutlined, ExportOutlined, BookOutlined, RobotOutlined, FileTextOutlined, ThunderboltOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons'
import Sidebar from '../components/Sidebar'
import ChapterEditor from '../components/ChapterEditor'
import AIPanel from '../components/AIPanel'
import BookAnalyzer from '../components/BookAnalyzer'
import KnowledgePanel from '../components/KnowledgePanel'
import useStore from '../stores/useStore'

const { Header, Content, Sider } = Layout

export default function EditorPage() {
  const { currentProjectId, projects, exportProject, knowledge } = useStore()
  const [rightPanel, setRightPanel] = useState('ai') // ai | knowledge | book

  const handleExport = () => {
    if (!currentProjectId) return
    const text = exportProject(currentProjectId)
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projects.find(p => p.id === currentProjectId)?.name || '作品'}.md`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }

  // 知识库状态统计
  const knowledgeStats = {
    characters: knowledge?.characters?.length || 0,
    settings: knowledge?.worldSettings?.length || 0,
    notes: knowledge?.customNotes?.length || 0,
    hasSummary: !!knowledge?.globalSummary,
    hasStyle: !!knowledge?.writingStyle,
  }
  const knowledgeReady = knowledgeStats.characters > 0 || knowledgeStats.hasSummary

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 顶部工具栏 */}
      <Header style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        lineHeight: '48px',
      }}>
        <Space>
          <Button type="text" icon={<HomeOutlined />} onClick={() => useStore.setState({ view: 'projects' })}>
            我的作品
          </Button>
        </Space>
        <Space>
          <Tooltip title={knowledgeReady ? '知识库已配置' : '建议先配置知识库'}>
            <Button 
              type="text" 
              icon={<DatabaseOutlined />} 
              onClick={() => setRightPanel('knowledge')}
              style={{ color: knowledgeReady ? '#52c41a' : undefined }}
            >
              知识库 {knowledgeStats.characters + knowledgeStats.settings + knowledgeStats.notes > 0 && 
                <Badge count={knowledgeStats.characters + knowledgeStats.settings + knowledgeStats.notes} size="small" style={{ marginLeft: 4 }} />
              }
            </Button>
          </Tooltip>
          <Button type="text" icon={<ExportOutlined />} onClick={handleExport}>
            导出 MD
          </Button>
        </Space>
      </Header>

      <Content style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧章节导航 */}
        <Sider width={240} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <Sidebar />
        </Sider>

        {/* 中间编辑器 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChapterEditor />
        </div>

        {/* 右侧面板（AI / 知识库 / 拆书） */}
        <Sider width={360} theme="light" style={{ borderLeft: '1px solid #f0f0f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* 面板切换标签 - 三标签设计 */}
          <div style={{
            display: 'flex',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '4px',
          }}>
            {/* AI 写作 */}
            <div
              onClick={() => setRightPanel('ai')}
              style={{
                flex: 1,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                borderRadius: 8,
                margin: 4,
                background: rightPanel === 'ai' ? '#fff' : 'transparent',
                color: rightPanel === 'ai' ? '#6366f1' : '#fff',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s',
                boxShadow: rightPanel === 'ai' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <RobotOutlined style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12 }}>AI写作</span>
            </div>

            {/* 知识库 */}
            <div
              onClick={() => setRightPanel('knowledge')}
              style={{
                flex: 1,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                borderRadius: 8,
                margin: 4,
                background: rightPanel === 'knowledge' ? '#fff' : 'transparent',
                color: rightPanel === 'knowledge' ? '#6366f1' : '#fff',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s',
                boxShadow: rightPanel === 'knowledge' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <DatabaseOutlined style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12 }}>
                知识库
                {knowledgeStats.characters > 0 && (
                  <Badge count={knowledgeStats.characters} size="small" style={{ marginLeft: 4 }} />
                )}
              </span>
            </div>

            {/* 拆书分析 */}
            <div
              onClick={() => setRightPanel('book')}
              style={{
                flex: 1,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                borderRadius: 8,
                margin: 4,
                background: rightPanel === 'book' ? '#fff' : 'transparent',
                color: rightPanel === 'book' ? '#6366f1' : '#fff',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s',
                boxShadow: rightPanel === 'book' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <BookOutlined style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12 }}>拆书</span>
            </div>
          </div>

          {/* 面板内容 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rightPanel === 'ai' && <AIPanel />}
            {rightPanel === 'knowledge' && <KnowledgePanel />}
            {rightPanel === 'book' && <BookAnalyzer />}
          </div>
        </Sider>
      </Content>
    </Layout>
  )
}
