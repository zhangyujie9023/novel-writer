import React, { useState, useMemo } from 'react'
import { Card, Button, Input, Typography, Space, Tag, Alert, Progress, List, Divider, Empty, Tooltip } from 'antd'
import {
  WarningOutlined,
  SearchOutlined,
  ClearOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons'
import { checkSensitiveWords, maskSensitiveWords } from '../data/sensitiveWords'

const { TextArea } = Input
const { Title, Text, Paragraph } = Typography

export default function SensitiveChecker() {
  const [text, setText] = useState('')
  const [showMasked, setShowMasked] = useState(false)
  const [checking, setChecking] = useState(false)

  // 检测结果
  const results = useMemo(() => {
    if (!text.trim()) return []
    return checkSensitiveWords(text)
  }, [text])

  // 统计
  const stats = useMemo(() => {
    const high = results.filter(r => r.level === 'high').length
    const medium = results.filter(r => r.level === 'medium').length
    const low = results.filter(r => r.level === 'low').length
    return { high, medium, low, total: results.length }
  }, [results])

  // 执行检测
  const handleCheck = () => {
    if (!text.trim()) return
    setChecking(true)
    setTimeout(() => setChecking(false), 500)
  }

  // 导出报告
  const handleExport = () => {
    if (results.length === 0) return
    
    const report = `# 敏感词检测报告

检测时间：${new Date().toLocaleString()}

## 检测结果统计
- 高危词：${stats.high} 个 ⚠️
- 中危词：${stats.medium} 个 ⚡
- 低危词：${stats.low} 个 💡
- 总计：${stats.total} 个

## 详细列表

${results.map((r, i) => `${i + 1}. 【${r.level === 'high' ? '高危' : r.level === 'medium' ? '中危' : '低危'}】"${r.word}" - ${r.suggestion}`).join('\n')}

## 原文（带标记）

${maskSensitiveWords(text)}
`
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `敏感词检测报告_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清空
  const handleClear = () => {
    setText('')
  }

  // 计算安全分（100分制）
  const safetyScore = useMemo(() => {
    if (!text.trim()) return 100
    const score = 100 - stats.high * 30 - stats.medium * 10 - stats.low * 3
    return Math.max(0, score)
  }, [text, stats])

  // 安全分颜色
  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <Title level={5}>
        <WarningOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
        敏感词检测
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        检测小说中的敏感词，帮助规避平台审核风险
      </Text>

      <Divider style={{ margin: '12px 0' }} />

      {/* 输入区 */}
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <TextArea
          placeholder="粘贴或输入需要检测的章节内容..."
          value={text}
          onChange={e => setText(e.target.value)}
          autoSize={{ minRows: 6, maxRows: 15 }}
          style={{ fontSize: 13 }}
        />

        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleCheck}
            loading={checking}
          >
            开始检测
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            清空
          </Button>
          {results.length > 0 && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出报告
            </Button>
          )}
        </Space>
      </Space>

      {/* 结果区 */}
      {text.trim() && (
        <div style={{ marginTop: 16 }}>
          {/* 安全分 */}
          <Card size="small" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>内容安全评分</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Progress
                    percent={safetyScore}
                    strokeColor={getScoreColor(safetyScore)}
                    showInfo={false}
                    style={{ flex: 1 }}
                  />
                  <Text strong style={{ fontSize: 24, color: getScoreColor(safetyScore) }}>
                    {safetyScore}
                  </Text>
                </div>
              </div>
              <div>
                <Space direction="vertical" size={2}>
                  <Tag color="red">高危 {stats.high}</Tag>
                  <Tag color="orange">中危 {stats.medium}</Tag>
                  <Tag color="gold">低危 {stats.low}</Tag>
                </Space>
              </div>
            </div>
          </Card>

          {/* 风险提示 */}
          {stats.high > 0 && (
            <Alert
              message="⚠️ 发现高危敏感词！"
              description="高危词可能导致作品被屏蔽、账号被封禁，请务必修改后再发布。"
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          {stats.high === 0 && stats.medium > 0 && (
            <Alert
              message="⚡ 存在中危敏感词"
              description="中危词可能触发平台审核，建议修改以降低风险。"
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          {stats.total === 0 && (
            <Alert
              message="✅ 未检测到敏感词"
              description="当前内容通过了基础敏感词检测，可以放心发布。"
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {/* 敏感词列表 */}
          {results.length > 0 && (
            <Card size="small" title={`检测到 ${results.length} 个敏感词`}>
              <List
                size="small"
                dataSource={results}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      <Tag color={item.level === 'high' ? 'red' : item.level === 'medium' ? 'orange' : 'gold'}>
                        {item.level === 'high' ? '高危' : item.level === 'medium' ? '中危' : '低危'}
                      </Tag>
                      <Text code style={{ background: '#fff1f0', padding: '2px 6px', borderRadius: 4 }}>
                        {item.word}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.suggestion}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 遮罩预览 */}
          {results.length > 0 && (
            <Card 
              size="small" 
              title="遮罩预览"
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={showMasked ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowMasked(!showMasked)}
                >
                  {showMasked ? '显示原文' : '显示遮罩'}
                </Button>
              }
              style={{ marginTop: 12 }}
            >
              <Paragraph
                style={{ 
                  fontSize: 12, 
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflow: 'auto',
                  background: '#fafafa',
                  padding: 8,
                  borderRadius: 4,
                }}
              >
                {showMasked ? maskSensitiveWords(text) : text}
              </Paragraph>
            </Card>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 提示：本工具提供基础敏感词检测，但无法覆盖所有平台规则。
          建议发布前再次人工审核，特别是涉及政治、色情、暴力等敏感内容。
        </Text>
      </div>
    </div>
  )
}
