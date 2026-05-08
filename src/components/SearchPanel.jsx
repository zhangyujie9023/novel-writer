import React, { useState, useEffect, useRef } from 'react'
import { Modal, Input, List, Typography, Tag, Space, Empty, Spin, Button, Divider } from 'antd'
import { SearchOutlined, FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Text, Paragraph } = Typography

export default function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { searchContent, selectChapter, volumes, chapters, setView } = useStore()
  const inputRef = useRef(null)

  // 弹窗打开时自动聚焦
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  const handleSearch = (value) => {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    // 使用 setTimeout 避免阻塞 UI
    setTimeout(() => {
      const res = searchContent(value)
      setResults(res)
      setLoading(false)
    }, 50)
  }

  const handleJump = (result) => {
    selectChapter(result.chapterId)
    // 确保切到编辑器视图
    useStore.setState({ view: 'editor' })
    onClose()
  }

  // 获取章节所在卷名
  const getVolumeName = (volumeId) => {
    if (!volumeId) return '无卷'
    const vol = volumes.find(v => v.id === volumeId)
    return vol?.name || '无卷'
  }

  // 高亮匹配内容
  const highlightMatch = (text, q) => {
    if (!text || !q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text.slice(0, 100) + (text.length > 100 ? '...' : '')
    const start = Math.max(0, idx - 30)
    const end = Math.min(text.length, idx + q.length + 70)
    const prefix = start > 0 ? '...' : ''
    const suffix = end < text.length ? '...' : ''
    const before = text.slice(start, idx)
    const match = text.slice(idx, idx + q.length)
    const after = text.slice(idx + q.length, end)
    return (
      <>
        {prefix}{before}<mark style={{ background: '#fef08a', padding: '0 2px' }}>{match}</mark>{after}{suffix}
      </>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <SearchOutlined />
          <span>全文搜索</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input
        ref={inputRef}
        placeholder="输入关键词搜索章节标题和内容..."
        prefix={<SearchOutlined style={{ color: '#999' }} />}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        allowClear
        size="large"
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin /> 搜索中...
        </div>
      ) : query && results.length === 0 ? (
        <Empty description={`未找到"${query}"相关内容`} style={{ padding: 24 }} />
      ) : results.length > 0 ? (
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
            找到 {results.length} 个结果
          </Text>
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item
                key={item.chapterId}
                style={{ 
                  cursor: 'pointer', 
                  borderRadius: 8, 
                  marginBottom: 4,
                  transition: 'background 0.2s',
                }}
                className="search-result-item"
                onClick={() => handleJump(item)}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FileTextOutlined style={{ color: '#6366f1' }} />
                    <Text strong style={{ fontSize: 14 }}>{item.chapterTitle}</Text>
                    <Tag color={item.volumeId ? 'blue' : 'default'} style={{ fontSize: 11 }}>
                      {getVolumeName(item.volumeId)}
                    </Tag>
                    <Tag color={item.matchType === 'title' ? 'green' : item.matchType === 'both' ? 'purple' : 'default'} style={{ fontSize: 11 }}>
                      {item.matchType === 'title' ? '标题匹配' : item.matchType === 'both' ? '标题+内容' : '内容匹配'}
                    </Tag>
                  </div>
                  {item.preview && (
                    <Paragraph 
                      style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.6 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {highlightMatch(item.preview, query)}
                    </Paragraph>
                  )}
                </div>
              </List.Item>
            )}
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
          <style>{`
            .search-result-item:hover { background: #f5f5f5; }
          `}</style>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <Text type="secondary">输入关键词开始搜索</Text>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持搜索章节标题和正文内容
          </Text>
        </div>
      )}
    </Modal>
  )
}
