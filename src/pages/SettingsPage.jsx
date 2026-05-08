import React, { useState, useEffect } from 'react'
import { Layout, Typography, Button, Space, Tabs, Card, Input, Select, Divider, message, Tag, Popconfirm, Empty, Spin } from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ApiOutlined,
  DatabaseOutlined,
  RobotOutlined,
  GlobalOutlined,
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ThunderboltOutlined,
  BookOutlined,
} from '@ant-design/icons'
import useStore from '../stores/useStore'
import { MODEL_CONFIGS, chatCompletion, buildGlobalSummaryPrompt, buildSummarySystemPrompt } from '../utils/ai'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// === 子组件：AI 配置 ===
function AIConfigSection() {
  const { aiConfig, setAIConfig } = useStore()
  const [tempConfig, setTempConfig] = useState(aiConfig)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    try {
      if (tempConfig.provider === 'ollama') {
        const res = await fetch(`${tempConfig.ollamaUrl || 'http://localhost:11434'}/api/tags`, {
          signal: AbortSignal.timeout(5000)
        })
        if (res.ok) {
          message.success('Ollama 连接成功！')
        } else {
          message.error('Ollama 连接失败')
        }
      } else {
        await chatCompletion(tempConfig, [{ role: 'user', content: 'Hi' }])
        message.success('API 连接成功！')
      }
    } catch (err) {
      message.error('连接失败: ' + err.message)
    } finally {
      setTesting(false)
    }
  }

  const saveConfig = () => {
    setAIConfig(tempConfig)
    message.success('AI 配置已保存')
  }

  return (
    <div>
      <Card title="🔧 模型提供商" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Select
            value={tempConfig.provider}
            onChange={(v) => setTempConfig({ ...tempConfig, provider: v })}
            style={{ width: '100%' }}
            size="large"
            options={[
              { label: '🤖 Ollama（本地免费，需安装）', value: 'ollama' },
              { label: '🔑 OpenAI（GPT-4，需 API Key）', value: 'openai' },
              { label: '🔮 DeepSeek（国产，性价比高）', value: 'deepseek' },
              { label: '⚙️ 自定义 OpenAI 兼容接口', value: 'custom' },
            ]}
          />

          {tempConfig.provider === 'ollama' && (
            <>
              <div>
                <Text strong>Ollama 服务地址</Text>
                <Input
                  placeholder="http://localhost:11434"
                  value={tempConfig.ollamaUrl}
                  onChange={(e) => setTempConfig({ ...tempConfig, ollamaUrl: e.target.value })}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>选择模型</Text>
                <Select
                  value={tempConfig.ollamaModel}
                  onChange={(v) => setTempConfig({ ...tempConfig, ollamaModel: v })}
                  style={{ width: '100%', marginTop: 4 }}
                  options={MODEL_CONFIGS.ollama.models.map(m => ({
                    label: `${m.name} — ${(m.contextWindow/1000).toFixed(0)}K 上下文`,
                    value: m.id,
                  }))}
                  showSearch
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  提示：在终端运行 <code>ollama pull qwen2.5:14b</code> 下载更多模型
                </Text>
              </div>
            </>
          )}

          {tempConfig.provider === 'openai' && (
            <>
              <div>
                <Text strong>API Key</Text>
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
                  value={tempConfig.openaiModel}
                  onChange={(v) => setTempConfig({ ...tempConfig, openaiModel: v })}
                  style={{ width: '100%', marginTop: 4 }}
                  options={MODEL_CONFIGS.openai.models.map(m => ({
                    label: `${m.name} — ${(m.contextWindow/1000).toFixed(0)}K 上下文`,
                    value: m.id,
                  }))}
                />
              </div>
            </>
          )}

          {tempConfig.provider === 'deepseek' && (
            <>
              <div>
                <Text strong>API Key</Text>
                <Input.Password
                  placeholder="sk-..."
                  value={tempConfig.deepseekApiKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, deepseekApiKey: e.target.value })}
                  style={{ marginTop: 4 }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  获取地址：<a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>
                </Text>
              </div>
              <div>
                <Text strong>模型</Text>
                <Select
                  value={tempConfig.deepseekModel}
                  onChange={(v) => setTempConfig({ ...tempConfig, deepseekModel: v })}
                  style={{ width: '100%', marginTop: 4 }}
                  options={MODEL_CONFIGS.deepseek.models.map(m => ({
                    label: m.name,
                    value: m.id,
                  }))}
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
                />
              </div>
              <div>
                <Text strong>API Key</Text>
                <Input.Password
                  placeholder="..."
                  value={tempConfig.customApiKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, customApiKey: e.target.value })}
                />
              </div>
              <div>
                <Text strong>模型名称</Text>
                <Input
                  placeholder="model-name"
                  value={tempConfig.customModel}
                  onChange={(e) => setTempConfig({ ...tempConfig, customModel: e.target.value })}
                />
              </div>
            </>
          )}

          <Divider />
          
          <div>
            <Text strong>温度（创造性）</Text>
            <Select
              value={tempConfig.temperature}
              onChange={(v) => setTempConfig({ ...tempConfig, temperature: v })}
              style={{ width: '100%', marginTop: 4 }}
              options={[
                { label: '0.5 — 保守稳定，适合大纲生成', value: 0.5 },
                { label: '0.7 — 平衡', value: 0.7 },
                { label: '0.8 — 推荐，适合创作', value: 0.8 },
                { label: '1.0 — 更有创意，可能跑题', value: 1.0 },
              ]}
            />
          </div>

          <div>
            <Text strong>上下文记忆模式</Text>
            <Select
              value={tempConfig.contextMode || 'auto'}
              onChange={(v) => setTempConfig({ ...tempConfig, contextMode: v })}
              style={{ width: '100%', marginTop: 4 }}
              options={[
                { label: '📖 仅本章 — 最快，只看当前章节', value: 'chapter' },
                { label: '📚 智能摘要 — 推荐，使用前文摘要', value: 'auto' },
                { label: '📚📚 完整上下文 — 最完整，消耗更多 token', value: 'full' },
              ]}
            />
          </div>

          <Divider />

          <Space>
            <Button onClick={testConnection} loading={testing}>
              测试连接
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveConfig}>
              保存配置
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

// === 子组件：知识库管理 ===
function KnowledgeSection() {
  const {
    knowledge,
    addCharacter, updateCharacter, deleteCharacter,
    addWorldSetting, updateWorldSetting, deleteWorldSetting,
    addCustomNote, updateCustomNote, deleteCustomNote,
    updateGlobalSummary, updateWritingStyle,
    chapters, currentProjectId, projects, aiConfig
  } = useStore()

  const [activeTab, setActiveTab] = useState('characters')
  const [editModal, setEditModal] = useState({ open: false, type: '', data: null })
  const [summaryLoading, setSummaryLoading] = useState(false)

  const project = projects.find(p => p.id === currentProjectId)

  // 人物表单
  const [charForm, setCharForm] = useState({})
  useEffect(() => {
    if (editModal.type === 'character' && editModal.data) {
      setCharForm(editModal.data)
    } else {
      setCharForm({ name: '', description: '', traits: '', relationships: '' })
    }
  }, [editModal])

  const saveCharacter = () => {
    if (!charForm.name?.trim()) {
      message.error('请输入人物姓名')
      return
    }
    if (editModal.data) {
      updateCharacter(editModal.data.id, charForm)
    } else {
      addCharacter(charForm)
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('人物已保存')
  }

  // 世界观表单
  const [worldForm, setWorldForm] = useState({})
  useEffect(() => {
    if (editModal.type === 'world' && editModal.data) {
      setWorldForm(editModal.data)
    } else {
      setWorldForm({ key: '', value: '', category: '' })
    }
  }, [editModal])

  const saveWorld = () => {
    if (!worldForm.key?.trim() || !worldForm.value?.trim()) {
      message.error('请填写完整')
      return
    }
    if (editModal.data) {
      updateWorldSetting(editModal.data.id, worldForm)
    } else {
      addWorldSetting(worldForm)
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('设定已保存')
  }

  // 笔记表单
  const [noteForm, setNoteForm] = useState({})
  useEffect(() => {
    if (editModal.type === 'note' && editModal.data) {
      setNoteForm(editModal.data)
    } else {
      setNoteForm({ title: '', content: '', tagsStr: '' })
    }
  }, [editModal])

  const saveNote = () => {
    if (!noteForm.title?.trim() || !noteForm.content?.trim()) {
      message.error('请填写完整')
      return
    }
    const tags = noteForm.tagsStr?.split(/[,，]/).map(t => t.trim()).filter(Boolean) || []
    if (editModal.data) {
      updateCustomNote(editModal.data.id, { ...noteForm, tags })
    } else {
      addCustomNote({ ...noteForm, tags })
    }
    setEditModal({ open: false, type: '', data: null })
    message.success('笔记已保存')
  }

  // 生成摘要
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

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: 'characters',
            label: <span><UserOutlined /> 人物档案 {knowledge?.characters?.length > 0 && <Tag color="blue">{knowledge.characters.length}</Tag>}</span>,
            children: (
              <div>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setEditModal({ open: true, type: 'character', data: null })} style={{ marginBottom: 16 }}>
                  添加人物
                </Button>
                {knowledge?.characters?.length === 0 ? (
                  <Empty description="还没有人物档案" />
                ) : (
                  knowledge?.characters?.map(c => (
                    <Card key={c.id} size="small" style={{ marginBottom: 8 }}
                      actions={[
                        <EditOutlined key="edit" onClick={() => setEditModal({ open: true, type: 'character', data: c })} />,
                        <Popconfirm key="del" title="确定删除？" onConfirm={() => deleteCharacter(c.id)}>
                          <DeleteOutlined style={{ color: '#ff4d4f' }} />
                        </Popconfirm>
                      ]}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                          {c.name?.charAt(0) || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Title level={5} style={{ margin: 0 }}>{c.name}</Title>
                          {c.description && <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }} ellipsis={{ rows: 2 }}>{c.description}</Paragraph>}
                          {c.traits && <Tag color="blue" style={{ marginTop: 4 }}>{c.traits}</Tag>}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )
          },
          {
            key: 'world',
            label: <span><GlobalOutlined /> 世界观 {knowledge?.worldSettings?.length > 0 && <Tag color="green">{knowledge.worldSettings.length}</Tag>}</span>,
            children: (
              <div>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setEditModal({ open: true, type: 'world', data: null })} style={{ marginBottom: 16 }}>
                  添加设定
                </Button>
                {knowledge?.worldSettings?.length === 0 ? (
                  <Empty description="还没有世界观设定" />
                ) : (
                  knowledge?.worldSettings?.map(s => (
                    <Card key={s.id} size="small" style={{ marginBottom: 8 }}
                      actions={[
                        <EditOutlined key="edit" onClick={() => setEditModal({ open: true, type: 'world', data: s })} />,
                        <Popconfirm key="del" title="确定删除？" onConfirm={() => deleteWorldSetting(s.id)}>
                          <DeleteOutlined style={{ color: '#ff4d4f' }} />
                        </Popconfirm>
                      ]}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>{s.key}</Text>
                        {s.category && <Tag>{s.category}</Tag>}
                      </div>
                      <Paragraph style={{ margin: '8px 0 0', fontSize: 12 }} ellipsis={{ rows: 2 }}>{s.value}</Paragraph>
                    </Card>
                  ))
                )}
              </div>
            )
          },
          {
            key: 'notes',
            label: <span><BookOutlined /> 笔记 {knowledge?.customNotes?.length > 0 && <Tag>{knowledge.customNotes.length}</Tag>}</span>,
            children: (
              <div>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setEditModal({ open: true, type: 'note', data: null })} style={{ marginBottom: 16 }}>
                  添加笔记
                </Button>
                {knowledge?.customNotes?.length === 0 ? (
                  <Empty description="还没有笔记" />
                ) : (
                  knowledge?.customNotes?.map(n => (
                    <Card key={n.id} size="small" style={{ marginBottom: 8 }}
                      actions={[
                        <EditOutlined key="edit" onClick={() => setEditModal({ open: true, type: 'note', data: n })} />,
                        <Popconfirm key="del" title="确定删除？" onConfirm={() => deleteCustomNote(n.id)}>
                          <DeleteOutlined style={{ color: '#ff4d4f' }} />
                        </Popconfirm>
                      ]}
                    >
                      <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{n.title}</Title>
                      <Paragraph style={{ margin: 0, fontSize: 12 }} ellipsis={{ rows: 2 }}>{n.content}</Paragraph>
                      {n.tags?.length > 0 && <div style={{ marginTop: 4 }}>{n.tags.map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}</div>}
                    </Card>
                  ))
                )}
              </div>
            )
          },
          {
            key: 'summary',
            label: <span><ThunderboltOutlined /> 全书摘要</span>,
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<ThunderboltOutlined />} onClick={generateGlobalSummary} loading={summaryLoading}>
                    AI 生成摘要
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12}}>基于所有章节内容生成</Text>
                </Space>
                <TextArea
                  placeholder="输入或粘贴全书故事摘要，帮助 AI 理解故事主线..."
                  value={knowledge?.globalSummary || ''}
                  onChange={(e) => updateGlobalSummary(e.target.value)}
                  autoSize={{ minRows: 8, maxRows: 20 }}
                  style={{ marginBottom: 16 }}
                />

                <Divider />

                <Title level={5}>✏️ 写作风格</Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  描述你想要的写作风格，AI 会遵循
                </Text>
                <TextArea
                  placeholder="例：文笔优美，多用比喻和象征；心理描写细腻；对话简练有力；节奏紧凑..."
                  value={knowledge?.writingStyle || ''}
                  onChange={(e) => updateWritingStyle(e.target.value)}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                />

                <Divider />

                <Title level={5}>📖 章节摘要管理</Title>
                {chapters.length === 0 ? (
                  <Empty description="暂无章节" />
                ) : (
                  chapters.map(ch => (
                    <Card key={ch.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>{ch.title}</Text>
                      </div>
                      <Paragraph style={{ margin: 0, fontSize: 12, color: '#666' }} ellipsis={{ rows: 2 }}>
                        {ch.summary || '暂无摘要（在编辑器中点击"生成摘要"按钮）'}
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
      {editModal.type === 'character' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditModal({ open: false, type: '', data: null })}>
          <Card style={{ width: 400 }} onClick={e => e.stopPropagation()} title={editModal.data ? '编辑人物' : '添加人物'}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div><Text strong>姓名 *</Text><Input value={charForm.name} onChange={e => setCharForm({ ...charForm, name: e.target.value })} style={{ marginTop: 4 }} /></div>
              <div><Text strong>描述</Text><TextArea value={charForm.description} onChange={e => setCharForm({ ...charForm, description: e.target.value })} autoSize={{ minRows: 2 }} style={{ marginTop: 4 }} /></div>
              <div><Text strong>性格特点</Text><Input value={charForm.traits} onChange={e => setCharForm({ ...charForm, traits: e.target.value })} style={{ marginTop: 4 }} /></div>
              <div><Text strong>人物关系</Text><TextArea value={charForm.relationships} onChange={e => setCharForm({ ...charForm, relationships: e.target.value })} autoSize={{ minRows: 2 }} style={{ marginTop: 4 }} /></div>
              <Space><Button onClick={() => setEditModal({ open: false, type: '', data: null })}>取消</Button><Button type="primary" onClick={saveCharacter}>保存</Button></Space>
            </Space>
          </Card>
        </div>
      )}

      {editModal.type === 'world' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditModal({ open: false, type: '', data: null })}>
          <Card style={{ width: 400 }} onClick={e => e.stopPropagation()} title={editModal.data ? '编辑设定' : '添加设定'}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div><Text strong>设定名称 *</Text><Input placeholder="如：魔法体系、地理环境" value={worldForm.key} onChange={e => setWorldForm({ ...worldForm, key: e.target.value })} style={{ marginTop: 4 }} /></div>
              <div><Text strong>详细说明 *</Text><TextArea value={worldForm.value} onChange={e => setWorldForm({ ...worldForm, value: e.target.value })} autoSize={{ minRows: 3 }} style={{ marginTop: 4 }} /></div>
              <div><Text strong>分类</Text><Select value={worldForm.category} onChange={v => setWorldForm({ ...worldForm, category: v })} style={{ width: '100%', marginTop: 4 }} allowClear options={[{value:'地理'},{value:'历史'},{value:'力量体系'},{value:'社会'},{value:'文化'},{value:'其他'}]} /></div>
              <Space><Button onClick={() => setEditModal({ open: false, type: '', data: null })}>取消</Button><Button type="primary" onClick={saveWorld}>保存</Button></Space>
            </Space>
          </Card>
        </div>
      )}

      {editModal.type === 'note' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditModal({ open: false, type: '', data: null })}>
          <Card style={{ width: 400 }} onClick={e => e.stopPropagation()} title={editModal.data ? '编辑笔记' : '添加笔记'}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div><Text strong>标题 *</Text><Input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} style={{ marginTop: 4 }} /></div>
              <div><Text strong>内容 *</Text><TextArea value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} autoSize={{ minRows: 4 }} style={{ marginTop: 4 }} /></div>
              <div><Text strong>标签</Text><Input placeholder="多个标签用逗号分隔" value={noteForm.tagsStr} onChange={e => setNoteForm({ ...noteForm, tagsStr: e.target.value })} style={{ marginTop: 4 }} /></div>
              <Space><Button onClick={() => setEditModal({ open: false, type: '', data: null })}>取消</Button><Button type="primary" onClick={saveNote}>保存</Button></Space>
            </Space>
          </Card>
        </div>
      )}
    </div>
  )
}

// === 主页面 ===
export default function SettingsPage() {
  const { currentProjectId, projects } = useStore()
  const project = projects.find(p => p.id === currentProjectId)

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部栏 */}
      <Layout.Header style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => useStore.setState({ view: 'editor' })}>
            返回编辑
          </Button>
          <Title level={4} style={{ margin: 0 }}>⚙️ 设置</Title>
          {project && <Tag color="purple">{project.name}</Tag>}
        </Space>
      </Layout.Header>

      {/* 内容区 */}
      <Layout.Content style={{ padding: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <Tabs
          defaultActiveKey="ai"
          size="large"
          items={[
            {
              key: 'ai',
              label: <span><RobotOutlined /> AI 配置</span>,
              children: <AIConfigSection />
            },
            {
              key: 'knowledge',
              label: <span><DatabaseOutlined /> 知识库</span>,
              children: <KnowledgeSection />
            },
          ]}
        />
      </Layout.Content>
    </Layout>
  )
}
