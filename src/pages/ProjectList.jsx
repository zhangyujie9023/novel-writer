import React, { useState } from 'react'
import { Layout, Typography, Button, Modal, Form, Input, Select, Card, Empty, List, Tag, Popconfirm, message, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, BookOutlined, SettingOutlined } from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Sider, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const GENRES = ['玄幻', '仙侠', '都市', '科幻', '历史', '悬疑', '言情', '武侠', '奇幻', '恐怖', '游戏', '同人', '其他']

export default function ProjectList() {
  const { projects, createProject, deleteProject, selectProject, updateProject } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [form] = Form.useForm()

  const handleCreate = (values) => {
    const projectId = createProject(values.name, values.genre, values.description)
    setShowCreate(false)
    form.resetFields()
    message.success('项目创建成功！')
    // 自动跳转到新创建的项目
    if (projectId) {
      selectProject(projectId)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    form.setFieldsValue(project)
    setShowSettings(true)
  }

  const handleUpdate = (values) => {
    updateProject(editingProject.id, values)
    setShowSettings(false)
    setEditingProject(null)
    form.resetFields()
    message.success('项目信息已更新')
  }

  return (
    <div style={{ height: '100vh', background: '#f5f5f5', display: 'flex' }}>
      {/* 左侧项目列表 */}
      <Sider
        width={300}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', padding: 16 }}
        theme="light"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>📖 我的作品</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setShowCreate(true); form.resetFields() }}
          >
            新建
          </Button>
        </div>

        {projects.length === 0 ? (
          <Empty description="还没有作品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={projects}
            renderItem={(project) => (
              <List.Item
                style={{
                  padding: '12px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: 'none',
                  marginBottom: 4,
                }}
                onClick={() => selectProject(project.id)}
                actions={[
                  <Button
                    key="settings"
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleEdit(project) }}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定删除这个项目吗？"
                    description="删除后无法恢复"
                    onConfirm={(e) => { e?.stopPropagation(); deleteProject(project.id); message.success('已删除') }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<BookOutlined style={{ fontSize: 24, color: '#6366f1' }} />}
                  title={
                    <span style={{ fontWeight: 500 }}>{project.name}</span>
                  }
                  description={
                    <Space size={4} direction="vertical" style={{ width: '100%' }}>
                      <Tag color="blue" style={{ margin: 0 }}>{project.genre || '未分类'}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {project.chapters?.length || 0} 章 · {project.description?.slice(0, 30) || '暂无简介'}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Sider>

      {/* 右侧主内容 */}
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📖</div>
          <Title level={3}>AI 小说写作台</Title>
          <Paragraph type="secondary">
            创建一个新项目，开始你的创作之旅。
            <br />支持 AI 辅助写作、大纲生成、知识库等功能。
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => { setShowCreate(true); form.resetFields() }}
          >
            创建新作品
          </Button>
        </div>
      </Content>

      {/* 新建项目弹窗 */}
      <Modal
        title="📝 新建作品"
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="作品名称" rules={[{ required: true, message: '请输入作品名称' }]}>
            <Input placeholder="例如：星辰大海" />
          </Form.Item>
          <Form.Item name="genre" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择类型" options={GENRES.map(g => ({ label: g, value: g }))} />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <TextArea rows={4} placeholder="简要描述你的故事构思..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目设置弹窗 */}
      <Modal
        title="⚙️ 项目设置"
        open={showSettings}
        onCancel={() => { setShowSettings(false); setEditingProject(null) }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label="作品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="genre" label="类型">
            <Select options={GENRES.map(g => ({ label: g, value: g }))} />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="outline" label="全书大纲">
            <TextArea rows={8} placeholder="在这里编写你的故事大纲..." />
          </Form.Item>
          <Form.Item name="worldSettings" label="世界观设定">
            <TextArea rows={4} placeholder="世界背景、力量体系、社会结构等..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => { setShowSettings(false); setEditingProject(null) }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
