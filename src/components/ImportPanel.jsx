import React, { useState } from 'react'
import { Card, Button, Upload, message, Space, Typography, Divider, List, Empty } from 'antd'
import { UploadOutlined, InboxOutlined } from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Dragger } = Upload
const { Text } = Typography

// 导入 Markdown 文件为新章节
export default function ImportPanel() {
  const [importing, setImporting] = useState(false)
  const { project, addChapter, currentVolume, volumes } = useStore()

  if (!project) {
    return (
      <Empty description="请先创建或选择一个作品" />
    )
  }

  const handleImport = async (file) => {
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      // 尝试智能拆分章节
      const chapters = []
      let currentChapter = { title: '', content: '' }
      let chapterIndex = 1
      
      for (const line of lines) {
        // 检测章节标题 (# 开头的行)
        if (line.match(/^#{1,3}\s/)) {
          // 保存上一章
          if (currentChapter.title || currentChapter.content) {
            chapters.push({ ...currentChapter, index: chapterIndex++ })
          }
          // 开始新章
          currentChapter = { title: line.replace(/^#+\s*/, '').trim(), content: '' }
        } else {
          currentChapter.content += line + '\n'
        }
      }
      // 保存最后一章
      if (currentChapter.title || currentChapter.content) {
        chapters.push({ ...currentChapter, index: chapterIndex })
      }

      // 如果没有检测到章节标题，按字数拆分
      if (chapters.length === 0) {
        const chunkSize = 3000
        const totalChunks = Math.ceil(text.length / chunkSize)
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, text.length)
          const chunk = text.substring(start, end)
          chapters.push({
            title: `第${i + 1}章`,
            content: chunk,
            index: i + 1
          })
        }
      }

      // 添加到当前卷
      for (const ch of chapters) {
        addChapter(currentVolume || volumes[0]?.id, {
          title: ch.title || `第${ch.index}章`,
          content: ch.content.trim()
        })
      }

      message.success(`成功导入 ${chapters.length} 个章节`)
    } catch (error) {
      console.error('Import error:', error)
      message.error('导入失败: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const uploadProps = {
    accept: '.md,.txt',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      handleImport(file)
      return false // 阻止默认上传
    }
  }

  return (
    <Card title="导入 Markdown 文件" extra={
      <Space>
        <Text type="secondary">支持 .md 和 .txt 格式</Text>
      </Space>
    }>
      <Divider />
      
      <Dragger {...uploadProps} style={{ padding: 20 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">点击或拖拽 Markdown 文件到此处导入</p>
        <p className="ant-upload-hint">
          文件将智能拆分为章节 (# 标题识别) 或按 3000 字自动分章
        </p>
      </Dragger>

      <Divider />
      
      <Card type="inner" title="导入说明">
        <List
          size="small"
          dataSource={[
            '支持 .md 和 .txt 格式的文本文件',
            '以 # 开头的行识别为章节标题',
            '无标题时自动按 3000 字拆分',
            '导入到当前选中的卷中'
          ]}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </Card>
  )
}