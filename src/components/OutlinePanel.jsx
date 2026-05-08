import React, { useState, useEffect } from 'react'
import { Card, Typography, Input, Button, Space, message, Divider, Modal, Tooltip } from 'antd'
import { BulbOutlined, SaveOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, RobotOutlined } from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function OutlinePanel() {
  const { currentProjectId, projects, updateProject, generateOutline } = useStore()
  const project = projects.find(p => p.id === currentProjectId)
  
  const [outline, setOutline] = useState(project?.outline || '')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setOutline(project?.outline || '')
  }, [currentProjectId])

  const handleSave = () => {
    setSaving(true)
    updateProject(currentProjectId, { outline })
    setTimeout(() => {
      setSaving(false)
      setEditMode(false)
      message.success('大纲已保存')
    }, 300)
  }

  const handleAIGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateOutline()
      if (result) {
        setOutline(result)
        message.success('大纲已生成！')
      } else {
        message.error('生成失败，请检查 AI 配置和 Ollama 是否运行')
      }
    } catch (e) {
      message.error('生成失败：' + (e.message || '未知错误'))
    }
    setGenerating(false)
  }

  const handleClear = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空大纲吗？此操作不可恢复。',
      onOk: () => {
        setOutline('')
        updateProject(currentProjectId, { outline: '' })
        message.success('大纲已清空')
      }
    })
  }

  if (!project) {
    return (
      <div style={{ padding: 16 }}>
        <Text type="secondary">请先选择一个项目</Text>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          <BulbOutlined style={{ marginRight: 8, color: '#faad14' }} />
          大纲管理
        </Title>
        <Space>
          {editMode ? (
            <>
              <Tooltip title="保存大纲">
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                  保存
                </Button>
              </Tooltip>
              <Tooltip title="取消编辑">
                <Button size="small" onClick={() => setEditMode(false)}>
                  取消
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="AI 生成大纲">
                <Button size="small" type="primary" icon={<RobotOutlined />} onClick={handleAIGenerate} loading={generating}>
                  {generating ? '生成中...' : 'AI 生成'}
                </Button>
              </Tooltip>
              <Tooltip title="编辑大纲">
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditMode(true)}>
                  编辑
                </Button>
              </Tooltip>
              <Tooltip title="清空大纲">
                <Button size="small" icon={<DeleteOutlined />} onClick={handleClear} danger>
                  清空
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      </div>

      <Text type="secondary" style={{ fontSize: 12 }}>
        规划故事结构、情节走向、章节安排
      </Text>

      <Divider style={{ margin: '12px 0' }} />

      {editMode ? (
        <TextArea
          value={outline}
          onChange={e => setOutline(e.target.value)}
          placeholder="输入小说大纲...

示例：
第一章：穿越
- 主角意外穿越到异世界
- 醒来发现自己在一个陌生的森林
- 遇到第一个NPC引导剧情

第二章：成长
- 加入新手村势力
- 完成第一个任务
- 认识女主角"
          autoSize={{ minRows: 15, maxRows: 30 }}
          style={{ fontFamily: 'inherit', fontSize: 14 }}
        />
      ) : (
        <div>
          {outline ? (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8 }}>
              {outline}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">暂无大纲</Text>
              </div>
              <Button type="link" onClick={() => setEditMode(true)} style={{ marginTop: 8 }}>
                立即添加大纲
              </Button>
            </div>
          )}
        </div>
      )}

      <Divider style={{ margin: '16px 0 12px' }} />

      {/* 大纲统计 */}
      {outline && (
        <Card size="small" style={{ background: '#fafafa' }}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              字数：{outline.length} 字
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              章节标记：{(outline.match(/^第[一二三四五六七八九十百千]+章/gm) || []).length} 章
            </Text>
          </Space>
        </Card>
      )}

      {/* 提示 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 小贴士：建议先写大纲再开始创作。大纲可以帮助你保持故事连贯性，避免卡文。
        </Text>
      </div>
    </div>
  )
}