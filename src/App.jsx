import React, { useEffect, useState, Component } from 'react'
import { Layout, Button, Space, message, Menu, Tooltip, Badge, Result, ConfigProvider, theme } from 'antd'
import { HomeOutlined, ExportOutlined, BookOutlined, FileTextOutlined, SettingOutlined, DatabaseOutlined, RobotOutlined, EditOutlined, FolderOutlined, RocketOutlined, ToolOutlined, BulbOutlined, WarningOutlined, SearchOutlined, EditOutlined as WordIcon, ImportOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'
import Sidebar from './components/Sidebar'
import ChapterEditor from './components/ChapterEditor'
import AIPanel from './components/AIPanel'
import BookAnalyzer from './components/BookAnalyzer'
import ImportPanel from './components/ImportPanel'
import KnowledgePanel from './components/KnowledgePanel'
import NameGenerator from './components/NameGenerator'
import SensitiveChecker from './components/SensitiveChecker'
import WordCounter from './components/WordCounter'
import TemplatePanel from './components/TemplatePanel'
import OutlinePanel from './components/OutlinePanel'
import SearchPanel from './components/SearchPanel'
import ProjectList from './pages/ProjectList'
import SettingsPage from './pages/SettingsPage'
import useStore from './stores/useStore'
import { check } from '@tauri-apps/plugin-updater'

const { Header, Content, Sider } = Layout
const { defaultAlgorithm, darkAlgorithm } = theme

// Error Boundary to catch rendering errors
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面渲染错误"
          subTitle={this.state.error?.message || '未知错误'}
          extra={<Button type="primary" onClick={() => window.location.reload()}>刷新页面</Button>}
        />
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

function AppContent() {
  const { view, currentProjectId, projects, exportProject, knowledge, searchContent, startAutoSave } = useStore()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [rightPanel, setRightPanel] = useState('ai')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('novel-writer-dark-mode')
    return saved === 'true'
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null)

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('novel-writer-dark-mode', String(newMode))
  }

  // 初始化：加载数据并启动自动保存
  useEffect(() => {
    useStore.getState().loadFromDisk()
    const stopAutoSave = useStore.getState().startAutoSave((status) => {
      setAutoSaveStatus({ text: status, time: new Date().toLocaleTimeString() })
    })
    setTimeout(() => setIsLoaded(true), 100)
    return () => stopAutoSave()
  }, [])

  // 检查应用更新（启动后延迟检查）
  useEffect(() => {
    if (!isLoaded) return
    const lastChecked = localStorage.getItem('novel-writer-updater-last-checked')
    const now = Date.now()
    // 同一天内不重复检查
    if (lastChecked && now - parseInt(lastChecked) < 24 * 60 * 60 * 1000) return
    localStorage.setItem('novel-writer-updater-last-checked', String(now))

    check()
      .then(update => {
        if (update?.available) {
          message.info({
            content: (
              <span>
                🚀 发现新版本 <strong>{update.version}</strong>！
                请前往 <a href="https://github.com/zhangyujie9023/novel-writer/releases" target="_blank" rel="noopener noreferrer">GitHub Releases</a> 下载更新
              </span>
            ),
            duration: 8,
          })
        }
      })
      .catch(() => { /* 检查失败，静默忽略 */ })
  }, [isLoaded])

  // 加载前显示加载指示器
  if (!isLoaded) {
    return (
      <Layout style={{ height: '100vh', justifyContent: 'center', alignItems: 'center', display: 'flex', background: isDarkMode ? '#141414' : '#fff' }}>
        <div style={{ textAlign: 'center', color: '#999' }}>加载中...</div>
      </Layout>
    )
  }

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

  // Ant Design 主题配置
  const themeConfig = {
    algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#6366f1',
      borderRadius: 6,
    },
  }

  // 动态背景色
  const bgColor = isDarkMode ? '#141414' : '#f5f5f5'
  const contentBg = isDarkMode ? '#1f1f1f' : '#fff'
  const borderColor = isDarkMode ? '#303030' : '#f0f0f0'

  // 如果view不是预期值，默认显示项目列表
  if (!view || (view !== 'settings' && view !== 'knowledge' && view !== 'book-analyzer' && view !== 'projects' && view !== 'editor' && view !== 'outline' && view !== 'import')) {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('projects', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor }}>
            <ProjectList />
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 设置页面 - 保留左侧导航
  if (view === 'settings') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('settings', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor }}>
            <SettingsPage />
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 知识库独立页 - 保留左侧导航
  if (view === 'knowledge') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('knowledge', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor, padding: 24 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <KnowledgePanel />
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 大纲独立页 - 保留左侧导航
  if (view === 'outline') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('outline', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor, padding: 24 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <OutlinePanel />
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }
  // 导入独立页
  if (view === 'import') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('import', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor, padding: 24 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <ImportPanel />
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 拆书分析页面 - 保留左侧导航
  if (view === 'book-analyzer') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('book-analyzer', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'hidden', background: bgColor }}>
            <BookAnalyzer standalone />
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 项目列表页
  if (view === 'projects') {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('projects', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor }}>
            <ProjectList />
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  // 编辑器页面
  const project = projects.find(p => p.id === currentProjectId)
  const knowledgeStats = {
    characters: knowledge?.characters?.length || 0,
    settings: knowledge?.worldSettings?.length || 0,
    notes: knowledge?.customNotes?.length || 0,
  }
  const totalKnowledge = knowledgeStats.characters + knowledgeStats.settings + knowledgeStats.notes

  // 如果没有选中项目，返回项目列表
  if (!currentProjectId || !project) {
    // 自动切回项目列表视图
    useStore.setState({ view: 'projects' })
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ height: '100vh', background: bgColor }}>
          {renderLeftNav('projects', navCollapsed, setNavCollapsed, null, null, 0, isDarkMode, toggleDarkMode)}
          <Content style={{ flex: 1, overflow: 'auto', background: bgColor }}>
            <ProjectList />
          </Content>
        </Layout>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ height: '100vh', background: bgColor }}>
        {/* 左侧主导航 */}
        {renderLeftNav('editor', navCollapsed, setNavCollapsed, currentProjectId, project, totalKnowledge, isDarkMode, toggleDarkMode)}

        <Layout>
          {/* 顶部工具栏 */}
          <Header style={{
            background: contentBg,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: 48,
          }}>
            <Space>
              <EditOutlined style={{ color: '#6366f1' }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: isDarkMode ? '#fff' : '#333' }}>
                {project?.name || '未命名项目'}
              </span>
              {project?.genre && (
                <span style={{ fontSize: 12, color: isDarkMode ? '#999' : '#999', background: isDarkMode ? '#262626' : '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
                  {project.genre}
                </span>
              )}
            </Space>
            <Space>
              <Tooltip title="搜索章节内容 (Ctrl+F)">
                <Button size="small" icon={<SearchOutlined />} onClick={() => setSearchOpen(true)}>
                  搜索
                </Button>
              </Tooltip>
              <Tooltip title="导出为Markdown文件">
                <Button size="small" icon={<ExportOutlined />} onClick={handleExport}>
                  导出
                </Button>
              </Tooltip>
              <Tooltip title={isDarkMode ? '切换亮色模式' : '切换暗色模式'}>
                <Button size="small" icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />} onClick={toggleDarkMode}>
                  {isDarkMode ? '亮色' : '暗色'}
                </Button>
              </Tooltip>
            </Space>
          </Header>

          <Content style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* 左侧章节导航 */}
            <div style={{ width: 220, background: contentBg, borderRight: `1px solid ${borderColor}`, overflow: 'auto' }}>
              <Sidebar />
            </div>

            {/* 中间编辑器 */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: contentBg }}>
              <ChapterEditor />
            </div>

            {/* 右侧面板 */}
            <div style={{ width: 360, background: contentBg, borderLeft: `1px solid ${borderColor}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* 面板切换标签 */}
              <div style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '4px',
              }}>
                <PanelTab
                  active={rightPanel === 'ai'}
                  onClick={() => setRightPanel('ai')}
                  icon={<RobotOutlined />}
                  label="AI"
                />
                <PanelTab
                  active={rightPanel === 'knowledge'}
                  onClick={() => setRightPanel('knowledge')}
                  icon={<DatabaseOutlined />}
                  label="知识"
                  badge={totalKnowledge}
                />
                <PanelTab
                  active={rightPanel === 'template'}
                  onClick={() => setRightPanel('template')}
                  icon={<RocketOutlined />}
                  label="模板"
                />
                <PanelTab
                  active={rightPanel === 'tools'}
                  onClick={() => setRightPanel('tools')}
                  icon={<ToolOutlined />}
                  label="工具"
                />
              </div>

              {/* 面板内容 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {rightPanel === 'ai' && <AIPanel />}
                {rightPanel === 'knowledge' && <KnowledgePanel />}
                {rightPanel === 'template' && <TemplatePanel />}
                {rightPanel === 'tools' && <ToolsPanel />}
              </div>
            </div>
          </Content>

          {/* 自动保存状态指示器 */}
          {autoSaveStatus && (
            <div style={{
              position: 'fixed',
              bottom: 12,
              right: 12,
              fontSize: 11,
              color: '#999',
              background: 'rgba(255,255,255,0.9)',
              padding: '4px 10px',
              borderRadius: 4,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
            }}>
              ✓ {autoSaveStatus.text} {autoSaveStatus.time}
            </div>
          )}
        </Layout>
      </Layout>

      {/* 搜索弹窗 */}
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ConfigProvider>
  )
}

// 工具面板组件
function ToolsPanel() {
  const [activeTool, setActiveTool] = useState('name')
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '8px 12px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <Button
          size="small"
          type={activeTool === 'name' ? 'primary' : 'default'}
          icon={<BulbOutlined />}
          onClick={() => setActiveTool('name')}
        >
          起名
        </Button>
        <Button
          size="small"
          type={activeTool === 'sensitive' ? 'primary' : 'default'}
          icon={<WarningOutlined />}
          onClick={() => setActiveTool('sensitive')}
        >
          敏感词
        </Button>
        <Button
          size="small"
          type={activeTool === 'counter' ? 'primary' : 'default'}
          icon={<EditOutlined />}
          onClick={() => setActiveTool('counter')}
        >
          统计
        </Button>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTool === 'name' && <NameGenerator />}
        {activeTool === 'sensitive' && <SensitiveChecker />}
        {activeTool === 'counter' && <WordCounter />}
      </div>
    </div>
  )
}

// 面板标签组件
function PanelTab({ active, onClick, icon, label, badge }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'center',
        borderRadius: 8,
        margin: 4,
        background: active ? '#fff' : 'transparent',
        color: active ? '#6366f1' : '#fff',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.3s',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      {React.cloneElement(icon, { style: { fontSize: 16 } })}
      <span style={{ fontSize: 13 }}>{label}</span>
      {badge > 0 && (
        <Badge count={badge} size="small" style={{ marginLeft: 4 }} />
      )}
    </div>
  )
}

// 左侧导航渲染函数
function renderLeftNav(selectedKey, collapsed, onCollapse, projectId, project, knowledgeCount, isDarkMode, toggleDarkMode) {
  const menuItems = [
    {
      key: 'projects',
      icon: <FolderOutlined />,
      label: '我的作品',
      onClick: () => useStore.setState({ view: 'projects' }),
    },
    {
      type: 'divider',
    },
    {
      key: 'book-analyzer',
      icon: <BookOutlined />,
      label: '拆书分析',
      onClick: () => useStore.setState({ view: 'book-analyzer' }),
    },
    {
      key: 'outline',
      icon: <BulbOutlined />,
      label: collapsed ? '' : '大纲',
      onClick: () => useStore.setState({ view: 'outline' }),
    },
    {
      key: 'import',
      icon: <ImportOutlined />,
      label: collapsed ? '' : '导入',
      onClick: () => useStore.setState({ view: 'import' }),
    },
    {
      key: 'knowledge',
      icon: <DatabaseOutlined />,
      label: collapsed ? '' : '知识库',
      onClick: () => useStore.setState({ view: 'knowledge' }),
      badge: knowledgeCount,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => useStore.setState({ view: 'settings' }),
    },
  ]

  // 如果在编辑器中，显示项目返回选项
  if (selectedKey === 'editor' && project) {
    menuItems.splice(2, 0, {
      key: 'current-project',
      icon: <EditOutlined />,
      label: project.name,
      style: { color: '#6366f1', fontWeight: 600 },
    })
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      theme={isDarkMode ? 'dark' : 'light'}
      width={180}
      style={{ borderRight: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}` }}
      trigger={null}
    >
      {/* Logo */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 16px',
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
        fontWeight: 600,
        color: '#6366f1',
        cursor: 'pointer',
      }}
      onClick={() => useStore.setState({ view: 'projects' })}
      >
        {collapsed ? '📖' : '📖 AI写作工作台'}
      </div>

      {/* 菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={selectedKey === 'editor' ? ['current-project'] : []}
        style={{ borderRight: 0 }}
        items={menuItems.filter(item => {
          if (item.key === 'current-project') return selectedKey === 'editor'
          return true
        })}
      />

      {/* 折叠按钮 */}
      <div
        onClick={() => onCollapse(!collapsed)}
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isDarkMode ? '#262626' : '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        {collapsed ? '→' : '←'}
      </div>
    </Sider>
  )
}
