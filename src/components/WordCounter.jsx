import React, { useState, useEffect, useMemo } from 'react'
import { Card, Typography, Progress, Space, Tag, Button, Modal, Input, List, Statistic, Row, Col, Divider, message } from 'antd'
import {
  EditOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  AimOutlined,
  HistoryOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import useStore from '../stores/useStore'

const { Title, Text } = Typography

// 模拟存储（实际应用中应该用后端或本地存储）
const WRITING_HISTORY_KEY = 'novel-writer-history'

// 计算中文字数（更准确）
function countChineseWords(text) {
  if (!text) return 0
  // 匹配中文、英文单词、数字，分别计数
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (text.match(/[a-zA-Z]+/g) || []).reduce((sum, w) => sum + w.length, 0)
  const numbers = (text.match(/\d+/g) || []).reduce((sum, n) => sum + n.length, 0)
  return chinese + english + numbers
}

export default function WordCounter() {
  const { chapters, currentProjectId, projects } = useStore()
  const project = projects.find(p => p.id === currentProjectId)
  
  const [targetModalOpen, setTargetModalOpen] = useState(false)
  const [dailyTarget, setDailyTarget] = useState(2000)
  const [sessionStart, setSessionStart] = useState(null)
  const [sessionWords, setSessionWords] = useState(0)
  const [history, setHistory] = useState([])

  // 计算总字数
  const totalWords = useMemo(() => {
    return chapters.reduce((sum, ch) => sum + (ch.wordCount || ch.content?.length || 0), 0)
  }, [chapters])

  // 今日字数
  const todayWords = useMemo(() => {
    const today = new Date().toDateString()
    const todayHistory = history.find(h => h.date === today)
    return todayHistory?.words || 0
  }, [history])

  // 今日进度
  const todayProgress = Math.min(100, Math.round((todayWords / dailyTarget) * 100))

  // 会话时长（分钟）
  const sessionMinutes = sessionStart 
    ? Math.round((Date.now() - sessionStart) / 60000) 
    : 0

  // 加载历史记录
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WRITING_HISTORY_KEY)
      if (raw) {
        setHistory(JSON.parse(raw))
      }
    } catch (e) {
      console.error('加载写作历史失败:', e)
    }
    setSessionStart(Date.now())
  }, [])

  // 保存今日字数
  const saveTodayWords = (words) => {
    const today = new Date().toDateString()
    const newHistory = history.filter(h => h.date !== today)
    newHistory.push({
      date: today,
      words: words,
      timestamp: Date.now()
    })
    setHistory(newHistory)
    localStorage.setItem(WRITING_HISTORY_KEY, JSON.stringify(newHistory))
  }

  // 开始新会话
  const startNewSession = () => {
    const currentTotal = totalWords
    setSessionStart(Date.now())
    setSessionWords(0)
    message.success('开始新的写作会话')
  }

  // 完成会话
  const finishSession = () => {
    if (sessionMinutes > 0) {
      const newTodayWords = todayWords + sessionWords
      saveTodayWords(newTodayWords)
      message.success(`本次写作 ${sessionWords} 字，今日累计 ${newTodayWords} 字`)
    }
  }

  // 计算效率（字/小时）
  const wordsPerHour = sessionMinutes > 0 
    ? Math.round((sessionWords / sessionMinutes) * 60) 
    : 0

  return (
    <div style={{ padding: 16 }}>
      <Title level={5}>
        <EditOutlined style={{ marginRight: 8, color: '#6366f1' }} />
        写作统计
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        追踪每日字数，激励持续创作
      </Text>

      <Divider style={{ margin: '12px 0' }} />

      {/* 今日目标 */}
      <Card 
        size="small" 
        style={{ marginBottom: 12, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#fff', opacity: 0.9 }}>今日目标</Text>
            <Button 
              size="small" 
              type="link" 
              style={{ color: '#fff', padding: 0 }}
              onClick={() => setTargetModalOpen(true)}
            >
              设置
            </Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>{todayWords}</Text>
            <Text style={{ color: '#fff', opacity: 0.7 }}>/ {dailyTarget} 字</Text>
          </div>
          <Progress 
            percent={todayProgress} 
            strokeColor="#fff"
            trailColor="rgba(255,255,255,0.2)"
            showInfo={false}
            style={{ marginTop: 8 }}
          />
          {todayProgress >= 100 && (
            <div style={{ marginTop: 8 }}>
              <Tag icon={<TrophyOutlined />} color="gold">🎉 目标达成！</Tag>
            </div>
          )}
        </div>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="总字数"
              value={totalWords}
              prefix={<EditOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="本会话"
              value={sessionWords}
              prefix={<FireOutlined />}
              valueStyle={{ fontSize: 20, color: '#6366f1' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="时长"
              value={sessionMinutes}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 效率统计 */}
      <Card size="small" title="写作效率" style={{ marginBottom: 12 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="本会话速度"
              value={wordsPerHour}
              suffix="字/小时"
              valueStyle={{ fontSize: 18 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="章节平均"
              value={chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0}
              suffix="字/章"
              valueStyle={{ fontSize: 18 }}
            />
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Button 
          block 
          type="primary" 
          icon={<AimOutlined />}
          onClick={finishSession}
          disabled={sessionWords === 0}
        >
          完成本次写作
        </Button>
        <Button 
          block 
          icon={<PlusOutlined />}
          onClick={startNewSession}
        >
          开始新会话
        </Button>
      </Space>

      {/* 历史记录 */}
      <Divider style={{ margin: '16px 0 8px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <HistoryOutlined style={{ marginRight: 4 }} />
          最近记录
        </Text>
      </Divider>

      {history.length > 0 ? (
        <List
          size="small"
          dataSource={history.slice(-7).reverse()}
          renderItem={item => (
            <List.Item style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Text style={{ fontSize: 12 }}>{new Date(item.date).toLocaleDateString()}</Text>
                <Text strong style={{ fontSize: 12 }}>{item.words} 字</Text>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>暂无历史记录</Text>
        </div>
      )}

      {/* 设置目标弹窗 */}
      <Modal
        title="设置每日目标"
        open={targetModalOpen}
        onOk={() => {
          setTargetModalOpen(false)
          message.success('目标已设置')
        }}
        onCancel={() => setTargetModalOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>每日字数目标</Text>
          <Input
            type="number"
            value={dailyTarget}
            onChange={e => setDailyTarget(parseInt(e.target.value) || 2000)}
            suffix="字"
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            建议：新人作者 2000-4000 字，签约作者 4000-8000 字，全职作者 8000+ 字
          </Text>
        </Space>
      </Modal>

      {/* 提示 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 小贴士：保持每日稳定更新比偶尔爆发更重要。建议设置可达成的目标，建立写作习惯。
        </Text>
      </div>
    </div>
  )
}
