import React, { useState } from 'react'
import { Card, Typography, Collapse, Button, Space, Tag, Modal, Input, message, Empty, Divider, Row, Col } from 'antd'
import {
  BookOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  PlusOutlined,
  FileTextOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import templates from '../data/templates.json'
import useStore from '../stores/useStore'
import { chatCompletion } from '../utils/ai'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

export default function TemplatePanel() {
  const { currentProjectId, projects, updateProject, aiConfig, knowledge } = useStore()
  const project = projects.find(p => p.id === currentProjectId)
  
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customIdea, setCustomIdea] = useState('')

  // 使用模板生成大纲
  const handleUseTemplate = async (template) => {
    if (!project) {
      message.warning('请先选择一个作品项目')
      return
    }

    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  // 确认生成
  const handleConfirmGenerate = async () => {
    if (!selectedTemplate || !project) return

    setGenerating(true)
    try {
      const prompt = `请根据以下爆文模板，为我的小说《${project.name}》生成详细的大纲和开篇章节。

模板信息：
- 模板名称：${selectedTemplate.name}
- 模板描述：${selectedTemplate.description}
- 基调风格：${selectedTemplate.tone}
- 关键元素：${selectedTemplate.keywords.join('、')}

模板大纲结构：
${selectedTemplate.outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

${project.description ? `作品简介：${project.description}` : ''}
${project.genre ? `作品类型：${project.genre}` : ''}

请生成：
1. 完整的故事大纲（2000字左右）
2. 第一章的详细内容（3000字左右）

要求：
- 符合${selectedTemplate.tone}的风格
- 融入模板的关键元素：${selectedTemplate.keywords.join('、')}
- 人物形象鲜明，情节紧凑吸引人
- 开篇要有悬念和爽点`

      const result = await chatCompletion(aiConfig, [{ role: 'user', content: prompt }])
      
      // 保存到项目大纲
      updateProject(currentProjectId, { outline: result })
      message.success('大纲生成完成！请在AI面板查看结果')
      setPreviewOpen(false)
    } catch (err) {
      message.error('生成失败: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // 自定义创意生成
  const handleCustomGenerate = async () => {
    if (!customIdea.trim() || !project) {
      message.warning('请输入你的创意想法')
      return
    }

    setGenerating(true)
    try {
      const prompt = `请根据以下创意，为我的小说《${project.name}》生成大纲和开篇。

创意描述：
${customIdea}

${project.description ? `作品简介：${project.description}` : ''}
${project.genre ? `作品类型：${project.genre}` : ''}

请生成完整的故事大纲和第一章内容，要求情节吸引人、人物形象鲜明。`

      const result = await chatCompletion(aiConfig, [{ role: 'user', content: prompt }])
      updateProject(currentProjectId, { outline: result })
      message.success('生成完成！')
      setCustomOpen(false)
      setCustomIdea('')
    } catch (err) {
      message.error('生成失败: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // 复制模板内容
  const handleCopyTemplate = (template) => {
    const text = `模板：${template.name}
描述：${template.description}
风格：${template.tone}

大纲结构：
${template.outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

关键元素：${template.keywords.join('、')}`
    
    navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  }

  return (
    <div style={{ padding: 16, maxHeight: '100%', overflow: 'auto' }}>
      <Title level={5}>
        <RocketOutlined style={{ marginRight: 8, color: '#6366f1' }} />
        爆文模板库
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        学习经典爆款套路，快速生成大纲和开篇
      </Text>

      <Divider style={{ margin: '12px 0' }} />

      {/* 快捷操作 */}
      <Button 
        type="dashed" 
        block 
        icon={<PlusOutlined />}
        onClick={() => setCustomOpen(true)}
        style={{ marginBottom: 12 }}
      >
        自定义创意生成
      </Button>

      {/* 模板列表 */}
      <Collapse
        accordion
        defaultActiveKey={['玄幻']}
        style={{ background: '#fafafa', border: 'none' }}
      >
        {Object.entries(templates).map(([category, items]) => (
          <Panel
            header={
              <Space>
                <BookOutlined style={{ color: '#6366f1' }} />
                <Text strong>{category}</Text>
                <Tag>{items.length} 个模板</Tag>
              </Space>
            }
            key={category}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {items.map((tpl) => (
                <Card
                  key={tpl.id}
                  size="small"
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleUseTemplate(tpl)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: 13 }}>{tpl.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {tpl.description}
                      </Text>
                      <div style={{ marginTop: 6 }}>
                        <Tag color="purple" style={{ fontSize: 10 }}>{tpl.tone}</Tag>
                        {tpl.keywords.slice(0, 3).map(kw => (
                          <Tag key={kw} style={{ fontSize: 10, background: '#f0f0f0', border: 'none' }}>{kw}</Tag>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyTemplate(tpl)
                      }}
                    />
                  </div>
                </Card>
              ))}
            </Space>
          </Panel>
        ))}
      </Collapse>

      {/* 使用说明 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 使用方法：选择合适的模板，AI 会根据模板结构生成大纲和开篇。
          你可以根据需要进行二次修改。
        </Text>
      </div>

      {/* 预览弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#6366f1' }} />
            {selectedTemplate?.name}
          </Space>
        }
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewOpen(false)}>
            取消
          </Button>,
          <Button 
            key="generate" 
            type="primary" 
            icon={<ThunderboltOutlined />}
            loading={generating}
            onClick={handleConfirmGenerate}
          >
            生成大纲
          </Button>,
        ]}
        width={600}
      >
        {selectedTemplate && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Text type="secondary">模板描述：</Text>
              <Paragraph style={{ margin: '4px 0', fontSize: 13 }}>
                {selectedTemplate.description}
              </Paragraph>
            </div>
            
            <div>
              <Text type="secondary">风格基调：</Text>
              <Tag color="purple" style={{ marginLeft: 8 }}>{selectedTemplate.tone}</Tag>
            </div>
            
            <div>
              <Text type="secondary">关键元素：</Text>
              <div style={{ marginTop: 4 }}>
                {selectedTemplate.keywords.map(kw => (
                  <Tag key={kw} style={{ marginBottom: 4 }}>{kw}</Tag>
                ))}
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }}>大纲结构</Divider>
            
            <div>
              {selectedTemplate.outline.map((item, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <Tag color="blue">{i + 1}</Tag>
                  <Text style={{ fontSize: 13 }}>{item}</Text>
                </div>
              ))}
            </div>

            {project && (
              <div style={{ background: '#f0f5ff', padding: 12, borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  将应用到项目：<Text strong>{project.name}</Text>
                </Text>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* 自定义创意弹窗 */}
      <Modal
        title="自定义创意生成"
        open={customOpen}
        onOk={handleCustomGenerate}
        onCancel={() => setCustomOpen(false)}
        okText="生成"
        cancelText="取消"
        confirmLoading={generating}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>输入你的创意想法：</Text>
          <Input.TextArea
            placeholder="例如：主角是一个普通的大学生，偶然得到了一个系统，可以看到别人的属性和弱点..."
            value={customIdea}
            onChange={e => setCustomIdea(e.target.value)}
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            AI 会根据你的创意生成大纲和开篇章节
          </Text>
        </Space>
      </Modal>
    </div>
  )
}
