import React, { useState } from 'react'
import { 
  Tabs, Card, Button, Input, Space, Typography, Tag, Modal, 
  Form, Select, Divider, Empty, Spin, message, Popconfirm, Tooltip
} from 'antd'
import {
  UserOutlined, GlobalOutlined, FileTextOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, BookOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import useStore from '../stores/useStore'
import { chatCompletion, buildGlobalSummaryPrompt, buildSummarySystemPrompt } from '../utils/ai'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 人物卡片组件
function CharacterCard({ character, onEdit, onDelete }) {
  return (
    <Card 
      size="small" 
      style={{ marginBottom: 8 }}
      actions={[
        <EditOutlined key="edit" onClick={() => onEdit(character)} />,
        <Popconfirm
          key="delete"
          title="确定删除此人物？"
          onConfirm={() => onDelete(character.id)}
        >
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
        </Popconfirm>
      ]}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ 
          width: 40, height: 40, borderRadius: '50%', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 'bold',
          flexShrink: 0
        }}>
          {character.name?.charAt(0) || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{character.name}</Title>
          {character.description && (
            <Paragraph style={{ margin: 0, fontSize: 12, color: '#666' }} ellipsis={{ rows: 2 }}>
              {character.description}
            </Paragraph>
          )}
          {character.traits && (
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>{character.traits}</Tag>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// 世界观设定卡片
function WorldSettingCard({ setting, onEdit, onDelete }) {
  return (
    <Card 
      size="small" 
      style={{ marginBottom: 8 }}
      actions={[
        <EditOutlined key="edit" onClick={() => onEdit(setting)} />,
        <Popconfirm
          key="delete"
          title="确定删除此设定？"
          onConfirm={() => onDelete(setting.id)}
        >
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
        </Popconfirm>
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>{setting.key}</Text>
        {setting.category && <Tag>{setting.category}</Tag>}
      </div>
      <Paragraph style={{ margin: '8px 0 0', fontSize: 12, color: '#666' }} ellipsis={{ rows: 2 }}>
        {setting.value}
      </Paragraph>
    </Card>
  )
}

// 笔记卡片
function NoteCard({ note, onEdit, onDelete }) {
  return (
    <Card 
      size="small" 
      style={{ marginBottom: 8 }}
      actions={[
        <EditOutlined key="edit" onClick={() => onEdit(note)} />,
        <Popconfirm
          key="delete"
          title="确定删除此笔记？"
          onConfirm={() => onDelete(note.id)}
        >
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
        </Popconfirm>
      ]}
    >
      <Title level={5} style={{ margin: 0, marginBottom: 8 }}>{note.title}</Title>
      <Paragraph style={{ margin: 0, fontSize: 12, color: '#666' }} ellipsis={{ rows: 3 }}>
        {note.content}
      </Paragraph>
      {note.tags?.length && (
        <div style={{ marginTop: 8 }}>
          {note.tags.map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}
        </div>
      )}
    </Card>
  )
}

export default function KnowledgePanel() {
  const {
    knowledge,
    addCharacter, updateCharacter, deleteCharacter,
    addWorldSetting, updateWorldSetting, deleteWorldSetting,
    addCustomNote, updateCustomNote, deleteCustomNote,
    updateGlobalSummary, updateWritingStyle,
    currentProjectId, projects, chapters,
    aiConfig, aiLoading, setAILoading
  } = useStore()

  const [activeTab, setActiveTab] = useState('characters')
  const [editModal, setEditModal] = useState({ open: false, type: '', data: null })
  const [summaryLoading, setSummaryLoading] = useState(false)

  const project = projects.find(p => p.id === currentProjectId)

  // === 人物编辑 ===
  const [characterForm] = Form.useForm()
  
  const openCharacterModal = (char = null) => {
    if (char) {
      characterForm.setFieldsValue(char)
    } else {
      characterForm.resetFields()
    }
    setEditModal({ open: true, type: 'character', data: char })
  }

  const saveCharacter = async () => {
    const values = await characterForm.validateFields()
    if (editModal.data) {
      updateCharacter(editModal.data.id, values)
    } else {
      addCharacter(values)
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('人物已保存')
  }

  // === 世界观编辑 ===
  const [worldForm] = Form.useForm()

  const openWorldModal = (setting = null) => {
    if (setting) {
      worldForm.setFieldsValue(setting)
    } else {
      worldForm.resetFields()
    }
    setEditModal({ open: true, type: 'world', data: setting })
  }

  const saveWorld = async () => {
    const values = await worldForm.validateFields()
    if (editModal.data) {
      updateWorldSetting(editModal.data.id, values)
    } else {
      addWorldSetting(values)
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('设定已保存')
  }

  // === 笔记编辑 ===
  const [noteForm] = Form.useForm()

  const openNoteModal = (note = null) => {
    if (note) {
      noteForm.setFieldsValue(note)
    } else {
      noteForm.resetFields()
    }
    setEditModal({ open: true, type: 'note', data: note })
  }

  const saveNote = async () => {
    const values = await noteForm.validateFields()
    const tags = values.tagsStr?.split(/[,，]/).map(t => t.trim()).filter(Boolean) || []
    if (editModal.data) {
      updateCustomNote(editModal.data.id, { ...values, tags })
    } else {
      addCustomNote({ ...values, tags })
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('笔记已保存')
  }

  // === AI 生成全书摘要 ===
  const generateGlobalSummary = async () => {
    if (!project || chapters.length === 0) {
      message.warning('请先添加章节')
      return
    }

    setSummaryLoading(true)
    try {
      const prompt = buildGlobalSummaryPrompt(project, chapters)
      const result = await chatCompletion(aiConfig, [
        { role: 'system', content: '你是一位专业的文学编辑，擅长总结故事内容。' },
        { role: 'user', content: prompt }
      ])
      updateGlobalSummary(result)
      message.success('全书摘要已生成')
    } catch (err) {
      message.error('生成失败: ' + err.message)
    } finally {
      setSummaryLoading(false)
    }
  }

  // === AI 生成章节摘要 ===
  const generateChapterSummary = async (chapter) => {
    if (!chapter.content) {
      message.warning('章节无内容')
      return
    }

    setSummaryLoading(true)
    try {
      const prompt = buildSummarySystemPrompt(chapter)
      const result = await chatCompletion(aiConfig, [
        { role: 'user', content: prompt }
      ])
      useStore.getState().updateChapterSummary(chapter.id, result)
      message.success(`"${chapter.title}" 摘要已生成`)
    } catch (err) {
      message.error('生成失败: ' + err.message)
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* 头部 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ margin: 0 }}>
          <BookOutlined style={{ marginRight: 8 }} />
          知识库
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          管理人物、设定、笔记，AI写作时自动使用
        </Text>
      </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        style={{ padding: '0 16px' }}
        items={[
          {
            key: 'characters',
            label: <span><UserOutlined /> 人物 ({knowledge?.characters?.length || 0})</span>,
            children: (
              <div>
                <Button 
                  type="dashed" 
                  block 
                  icon={<PlusOutlined />}
                  onClick={() => openCharacterModal()}
                  style={{ marginBottom: 12 }}
                >
                  添加人物
                </Button>
                {knowledge?.characters?.length === 0 ? (
                  <Empty description="暂无人物" style={{ padding: 20 }} />
                ) : (
                  knowledge?.characters?.map(c => (
                    <CharacterCard 
                      key={c.id} 
                      character={c} 
                      onEdit={openCharacterModal}
                      onDelete={deleteCharacter}
                    />
                  ))
                )}
              </div>
            )
          },
          {
            key: 'world',
            label: <span><GlobalOutlined /> 世界观 ({knowledge?.worldSettings?.length || 0})</span>,
            children: (
              <div>
                <Button 
                  type="dashed" 
                  block 
                  icon={<PlusOutlined />}
                  onClick={() => openWorldModal()}
                  style={{ marginBottom: 12 }}
                >
                  添加设定
                </Button>
                {knowledge?.worldSettings?.length === 0 ? (
                  <Empty description="暂无设定" style={{ padding: 20 }} />
                ) : (
                  knowledge?.worldSettings?.map(s => (
                    <WorldSettingCard 
                      key={s.id} 
                      setting={s}
                      onEdit={openWorldModal}
                      onDelete={deleteWorldSetting}
                    />
                  ))
                )}
              </div>
            )
          },
          {
            key: 'notes',
            label: <span><FileTextOutlined /> 笔记 ({knowledge?.customNotes?.length || 0})</span>,
            children: (
              <div>
                <Button 
                  type="dashed" 
                  block 
                  icon={<PlusOutlined />}
                  onClick={() => openNoteModal()}
                  style={{ marginBottom: 12 }}
                >
                  添加笔记
                </Button>
                {knowledge?.customNotes?.length === 0 ? (
                  <Empty description="暂无笔记" style={{ padding: 20 }} />
                ) : (
                  knowledge?.customNotes?.map(n => (
                    <NoteCard 
                      key={n.id} 
                      note={n}
                      onEdit={openNoteModal}
                      onDelete={deleteCustomNote}
                    />
                  ))
                )}
              </div>
            )
          },
          {
            key: 'summary',
            label: <span><BookOutlined /> 全书摘要</span>,
            children: (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Button 
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={generateGlobalSummary}
                    loading={summaryLoading}
                    style={{ marginRight: 8 }}
                  >
                    AI 生成摘要
                  </Button>
                  <Tooltip title="基于所有章节内容生成全书摘要，用于后续章节的上下文">
                    <Text type="secondary" style={{ fontSize: 12 }}>?</Text>
                  </Tooltip>
                </div>
                <TextArea
                  placeholder="输入或粘贴全书摘要，帮助AI理解故事主线..."
                  value={knowledge?.globalSummary || ''}
                  onChange={(e) => updateGlobalSummary(e.target.value)}
                  autoSize={{ minRows: 6, maxRows: 12 }}
                />
                
                <Divider />
                
                <Title level={5}>写作风格</Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  描述你想要的写作风格，AI会遵循
                </Text>
                <TextArea
                  placeholder="例：文笔优美，多用比喻和象征，心理描写细腻，对白简练有力..."
                  value={knowledge?.writingStyle || ''}
                  onChange={(e) => updateWritingStyle(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />

                <Divider />
                
                <Title level={5}>章节摘要</Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  为每章生成摘要，帮助AI回忆前文
                </Text>
                {chapters.length === 0 ? (
                  <Empty description="暂无章节" style={{ padding: 20 }} />
                ) : (
                  chapters.map(ch => (
                    <Card key={ch.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong>{ch.title}</Text>
                        <Button 
                          size="small" 
                          onClick={() => generateChapterSummary(ch)}
                          loading={summaryLoading}
                        >
                          {ch.summary ? '重新生成' : '生成摘要'}
                        </Button>
                      </div>
                      <Paragraph 
                        style={{ margin: 0, fontSize: 12, color: '#666' }}
                        ellipsis={{ rows: 2 }}
                      >
                        {ch.summary || '暂无摘要'}
                      </Paragraph>
                    </Card>
                  ))
                )}
              </div>
            )
          }
        ]}
      />

      {/* 编辑弹窗 */}
      <Modal
        title={
          editModal.type === 'character' ? '编辑人物' :
          editModal.type === 'world' ? '编辑设定' : '编辑笔记'
        }
        open={editModal.open}
        onOk={() => {
          if (editModal.type === 'character') saveCharacter()
          else if (editModal.type === 'world') saveWorld()
          else saveNote()
        }}
        onCancel={() => setEditModal({ open: false, type: '', data: null })}
        okText="保存"
        cancelText="取消"
      >
        {editModal.type === 'character' && (
          <Form form={characterForm} layout="vertical">
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input placeholder="人物姓名" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <TextArea placeholder="外貌、身份、背景等" autoSize={{ minRows: 2 }} />
            </Form.Item>
            <Form.Item name="traits" label="性格">
              <Input placeholder="如：勇敢、善良、有些固执" />
            </Form.Item>
            <Form.Item name="relationships" label="人物关系">
              <TextArea placeholder="与其他人物的关系" autoSize={{ minRows: 2 }} />
            </Form.Item>
          </Form>
        )}

        {editModal.type === 'world' && (
          <Form form={worldForm} layout="vertical">
            <Form.Item name="key" label="设定名称" rules={[{ required: true }]}>
              <Input placeholder="如：魔法体系、地理环境、政治制度" />
            </Form.Item>
            <Form.Item name="value" label="详细说明" rules={[{ required: true }]}>
              <TextArea placeholder="详细描述这个设定" autoSize={{ minRows: 3 }} />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Select placeholder="选择分类" allowClear>
                <Select.Option value="地理">地理</Select.Option>
                <Select.Option value="历史">历史</Select.Option>
                <Select.Option value="力量体系">力量体系</Select.Option>
                <Select.Option value="社会">社会</Select.Option>
                <Select.Option value="文化">文化</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        )}

        {editModal.type === 'note' && (
          <Form form={noteForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="笔记标题" />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}>
              <TextArea placeholder="详细内容" autoSize={{ minRows: 4 }} />
            </Form.Item>
            <Form.Item name="tagsStr" label="标签">
              <Input placeholder="多个标签用逗号分隔" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
