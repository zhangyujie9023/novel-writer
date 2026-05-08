import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Typography, Button, Space, Tooltip, message } from 'antd'
import { CopyOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Text } = Typography

const MAX_HISTORY = 50

const ChapterEditor = forwardRef(function ChapterEditor({ }, ref) {
  const { editorContent, updateChapterContent, currentChapterId, chapters } = useStore()
  const textareaRef = useRef(null)
  // 使用 ref 存储历史，避免闭包问题
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const currentChapter = chapters.find(c => c.id === currentChapterId)

  const pushHistory = useCallback((newContent) => {
    const history = historyRef.current
    const idx = historyIndexRef.current
    // 避免重复记录相同内容
    if (history[idx] === newContent) return
    // 删除当前位置之后的历史，插入新内容
    historyRef.current = [...history.slice(0, idx + 1), newContent]
    historyIndexRef.current = Math.min(historyRef.current.length - 1, MAX_HISTORY - 1)
  }, [])

  useImperativeHandle(ref, () => ({
    insertAtCursor: (text) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      const newValue = value.substring(0, start) + text + value.substring(end)
      updateChapterContent(newValue)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length
        textarea.focus()
      }, 0)
    },
    appendToEnd: (text) => {
      const sep = editorContent ? '\n\n' : ''
      updateChapterContent(editorContent + sep + text)
    },
    replaceAll: (text) => {
      updateChapterContent(text)
    },
  }), [editorContent])

  const handleChange = (e) => {
    updateChapterContent(e.target.value)
  }

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1
      updateChapterContent(historyRef.current[historyIndexRef.current])
    }
  }

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1
      updateChapterContent(historyRef.current[historyIndexRef.current])
    }
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const value = e.target.value
      const newValue = value.substring(0, start) + '    ' + value.substring(end)
      updateChapterContent(newValue)
      setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4 }, 0)
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      pushHistory(editorContent)
      message.success('已保存')
    }
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault()
      handleUndo()
    }
    if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault()
      handleRedo()
    }
  }

  const handleCopy = () => {
    if (editorContent) {
      navigator.clipboard.writeText(editorContent)
      message.success('已复制到剪贴板')
    }
  }

  if (!currentChapterId) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✏️</div>
          <Text type="secondary">选择或创建一个章节开始写作</Text>
        </div>
      </div>
    )
  }

  const wordCount = editorContent.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <Space>
          <Text strong style={{ color: '#4f46e5' }}>{currentChapter?.title || '未命名章节'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{wordCount.toLocaleString()} 字</Text>
        </Space>
        <Space>
          <Tooltip title={canUndo ? '撤销 Ctrl+Z' : '无可撤销'}>
            <Button type="text" size="small" icon={<UndoOutlined />} onClick={handleUndo} disabled={!canUndo} />
          </Tooltip>
          <Tooltip title={canRedo ? '重做 Ctrl+Y' : '无重做'}>
            <Button type="text" size="small" icon={<RedoOutlined />} onClick={handleRedo} disabled={!canRedo} />
          </Tooltip>
          <Tooltip title="复制全文"><Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopy} /></Tooltip>
        </Space>
      </div>

      <textarea
        ref={textareaRef}
        value={editorContent}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => pushHistory(editorContent)}
        className="editor-textarea"
        placeholder="在这里开始写作..."
        style={{
          flex: 1,
          padding: '20px 32px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: 16,
          lineHeight: 1.9,
          fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
          background: '#fffef8',
          color: '#333',
        }}
      />

      <div style={{ padding: '4px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999', background: '#fafafa' }}>
        <span>Ctrl+S 保存 · Tab 缩进 · Ctrl+Z 撤销</span>
        <span>{wordCount.toLocaleString()} 字</span>
      </div>
    </div>
  )
})

export default ChapterEditor
