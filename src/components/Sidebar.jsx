import React, { useState, useEffect } from 'react'
import { Typography, Button, Space, Tooltip, message, Modal, Input, Select, Dropdown, Collapse, Badge } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  FileTextOutlined,
  RobotOutlined,
  SnippetsOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Text } = Typography
const { Panel } = Collapse

export default function Sidebar() {
  const {
    volumes,
    chapters,
    currentChapterId,
    currentVolumeId,
    selectChapter,
    createChapter,
    deleteChapter,
    updateChapterTitle,
    createVolume,
    updateVolume,
    deleteVolume,
    moveChapterToVolume,
    generateChapterSummary,
    generateVolumeSummary,
    currentProjectId,
    projects,
    updateProject,
  } = useStore()

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editingType, setEditingType] = useState(null) // 'chapter' | 'volume'
  const [expandedVolumes, setExpandedVolumes] = useState([])
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectGenre, setProjectGenre] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(null)

  const project = projects.find(p => p.id === currentProjectId)
  
  // 无卷的章节
  const unassignedChapters = chapters.filter(ch => !ch.volumeId).sort((a, b) => (a.order || 0) - (b.order || 0))
  
  // 总字数
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)

  useEffect(() => {
    if (project) {
      setProjectName(project.name || '')
      setProjectGenre(project.genre || '')
      setProjectDesc(project.description || '')
    }
  }, [project])

  useEffect(() => {
    // 默认展开所有卷
    setExpandedVolumes(volumes.map(v => v.id))
  }, [volumes])

  // ========== 章节操作 ==========
  const handleAddChapter = (volumeId = null) => {
    createChapter(undefined, volumeId)
  }

  const handleStartEditChapter = (ch) => {
    setEditingId(ch.id)
    setEditTitle(ch.title)
    setEditingType('chapter')
  }

  const handleStartEditVolume = (vol) => {
    setEditingId(vol.id)
    setEditTitle(vol.name)
    setEditingType('volume')
  }

  const handleFinishEdit = () => {
    if (editingId && editTitle.trim()) {
      if (editingType === 'chapter') {
        updateChapterTitle(editingId, editTitle.trim())
      } else if (editingType === 'volume') {
        updateVolume(editingId, { name: editTitle.trim() })
      }
    }
    setEditingId(null)
    setEditTitle('')
    setEditingType(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFinishEdit()
    if (e.key === 'Escape') { setEditingId(null); setEditTitle('') }
  }

  // ========== 卷操作 ==========
  const handleAddVolume = () => {
    const id = createVolume()
    setExpandedVolumes(prev => [...prev, id])
  }

  const handleDeleteVolume = (vol) => {
    Modal.confirm({
      title: '删除卷',
      content: `确定要删除「${vol.name}」吗？该卷下的章节将移至无卷状态。`,
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteVolume(vol.id)
        message.success('卷已删除')
      },
    })
  }

  // ========== 摘要生成 ==========
  const handleGenerateChapterSummary = async (ch) => {
    setGeneratingSummary(ch.id)
    try {
      const summary = await generateChapterSummary(ch.id)
      if (summary) {
        message.success('章节摘要已生成')
      }
    } catch (e) {
      message.error('生成摘要失败：' + e.message)
    }
    setGeneratingSummary(null)
  }

  const handleGenerateVolumeSummary = async (vol) => {
    setGeneratingSummary(vol.id)
    try {
      const summary = await generateVolumeSummary(vol.id)
      if (summary) {
        message.success('卷摘要已生成')
      }
    } catch (e) {
      message.error('生成摘要失败：' + e.message)
    }
    setGeneratingSummary(null)
  }

  // ========== 项目设置 ==========
  const handleSaveProjectSettings = () => {
    if (!projectName.trim()) {
      message.error('项目名称不能为空')
      return
    }
    updateProject(currentProjectId, {
      name: projectName.trim(),
      genre: projectGenre,
      description: projectDesc,
    })
    message.success('项目设置已保存')
    setShowProjectSettings(false)
  }

  // ========== 渲染章节项 ==========
  const renderChapterItem = (ch) => (
    <div
      key={ch.id}
      onClick={() => selectChapter(ch.id)}
      style={{
        padding: '10px 12px 10px 24px',
        borderRadius: 6,
        cursor: 'pointer',
        marginBottom: 2,
        background: ch.id === currentChapterId ? '#eef2ff' : 'transparent',
        borderLeft: ch.id === currentChapterId ? '3px solid #6366f1' : '3px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingId === ch.id && editingType === 'chapter' ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={handleKeyDown}
            style={{
              border: '1px solid #6366f1',
              borderRadius: 4,
              padding: '2px 6px',
              width: '100%',
              outline: 'none',
              fontSize: 13,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <Text
              style={{
                fontSize: 13,
                fontWeight: ch.id === currentChapterId ? 500 : 400,
                color: ch.id === currentChapterId ? '#4338ca' : '#333',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <FileTextOutlined style={{ marginRight: 6, opacity: 0.5 }} />
              {ch.title}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {ch.wordCount ? `${ch.wordCount.toLocaleString()}字` : '空'}
              </Text>
              {ch.summary && (
                <Tooltip title="已有摘要">
                  <SnippetsOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                </Tooltip>
              )}
            </div>
          </>
        )}
      </div>
      {ch.id === currentChapterId && editingId !== ch.id && (
        <Space size={0}>
          <Tooltip title="编辑标题">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); handleStartEditChapter(ch) }}
              style={{ width: 24, height: 24 }}
            />
          </Tooltip>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'summary', label: '生成摘要', icon: <SnippetsOutlined /> },
                { type: 'divider' },
                { key: 'delete', label: '删除章节', icon: <DeleteOutlined />, danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'delete') {
                  Modal.confirm({
                    title: '删除章节',
                    content: `确定要删除「${ch.title}」吗？`,
                    okText: '删除',
                    cancelText: '取消',
                    onOk: () => {
                      deleteChapter(ch.id)
                      message.success('章节已删除')
                    },
                  })
                } else if (key === 'summary') {
                  handleGenerateChapterSummary(ch)
                }
              },
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 24, height: 24 }}
            />
          </Dropdown>
        </Space>
      )}
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* 头部 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 15, color: '#6366f1' }}>
            📖 {project?.name || '未命名'}
          </Text>
          <Space>
            <Tooltip title="项目设置">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setShowProjectSettings(true)}
              />
            </Tooltip>
          </Space>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {volumes.length} 卷 · {chapters.length} 章 · {totalWords.toLocaleString()} 字
        </Text>
        {project?.genre && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
            类型：{project.genre}
          </Text>
        )}
      </div>

      {/* 分卷列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
        {/* 卷列表 */}
        {volumes.sort((a, b) => (a.order || 0) - (b.order || 0)).map(vol => {
          const volChapters = chapters.filter(ch => ch.volumeId === vol.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
          const volWords = volChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
          const isExpanded = expandedVolumes.includes(vol.id)

          return (
            <div key={vol.id} style={{ marginBottom: 4 }}>
              {/* 卷头 */}
              <div
                onClick={() => setExpandedVolumes(prev => 
                  isExpanded ? prev.filter(id => id !== vol.id) : [...prev, vol.id]
                )}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: vol.id === currentVolumeId ? '#f0f5ff' : '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <FolderOutlined style={{ color: '#6366f1' }} />
                  {editingId === vol.id && editingType === 'volume' ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={handleKeyDown}
                      style={{
                        border: '1px solid #6366f1',
                        borderRadius: 4,
                        padding: '2px 6px',
                        width: '100%',
                        outline: 'none',
                        fontSize: 13,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <Text strong style={{ fontSize: 13 }}>{vol.name}</Text>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Badge count={volChapters.length} size="small" style={{ backgroundColor: '#6366f1' }} />
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                    {volWords.toLocaleString()}字
                  </Text>
                  {vol.summary && <SnippetsOutlined style={{ fontSize: 12, color: '#52c41a', marginLeft: 4 }} />}
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'edit', label: '编辑名称', icon: <EditOutlined /> },
                        { key: 'addChapter', label: '添加章节', icon: <PlusOutlined /> },
                        { key: 'summary', label: '生成卷摘要', icon: <SnippetsOutlined /> },
                        { type: 'divider' },
                        { key: 'delete', label: '删除卷', icon: <DeleteOutlined />, danger: true },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'edit') handleStartEditVolume(vol)
                        else if (key === 'addChapter') handleAddChapter(vol.id)
                        else if (key === 'summary') handleGenerateVolumeSummary(vol)
                        else if (key === 'delete') handleDeleteVolume(vol)
                      },
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 24, height: 24, marginLeft: 4 }}
                    />
                  </Dropdown>
                </div>
              </div>

              {/* 卷内章节 */}
              {isExpanded && (
                <div style={{ marginTop: 2 }}>
                  {volChapters.map(ch => renderChapterItem(ch))}
                  {volChapters.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 12, color: '#bbb', fontSize: 12 }}>
                      暂无章节
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 无卷的章节 */}
        {unassignedChapters.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#fff',
                marginBottom: 4,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                <FolderOutlined style={{ marginRight: 4 }} />
                未分卷章节
              </Text>
            </div>
            {unassignedChapters.map(ch => renderChapterItem(ch))}
          </div>
        )}

        {/* 空状态 */}
        {volumes.length === 0 && chapters.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <Text type="secondary">还没有内容</Text>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleAddChapter(null)}
          style={{ flex: 1 }}
        >
          新建章节
        </Button>
        <Button 
          icon={<FolderOutlined />} 
          onClick={handleAddVolume}
        >
          新建卷
        </Button>
      </div>

      {/* 项目大纲预览 */}
      {project?.outline && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', maxHeight: 150, overflow: 'auto' }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>📋 大纲预览</Text>
          <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {project.outline.slice(0, 300)}
            {project.outline.length > 300 && '...'}
          </Text>
        </div>
      )}

      {/* 项目设置弹窗 */}
      <Modal
        title="项目设置"
        open={showProjectSettings}
        onOk={handleSaveProjectSettings}
        onCancel={() => setShowProjectSettings(false)}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>项目名称</Text>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="输入项目名称"
            />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>类型</Text>
            <Select
              value={projectGenre}
              onChange={setProjectGenre}
              style={{ width: '100%' }}
              options={[
                { value: '', label: '未指定' },
                { value: '玄幻', label: '玄幻' },
                { value: '仙侠', label: '仙侠' },
                { value: '都市', label: '都市' },
                { value: '历史', label: '历史' },
                { value: '科幻', label: '科幻' },
                { value: '悬疑', label: '悬疑' },
                { value: '言情', label: '言情' },
                { value: '其他', label: '其他' },
              ]}
            />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>简介</Text>
            <Input.TextArea
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="输入故事简介，AI 会根据简介生成大纲"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
