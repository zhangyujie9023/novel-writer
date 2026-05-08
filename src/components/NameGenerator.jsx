import React, { useState } from 'react'
import { Card, Button, Select, Input, Space, Tag, message, Typography, Divider, Row, Col, Tooltip } from 'antd'
import {
  UserOutlined,
  EnvironmentOutlined,
  BulbOutlined,
  TeamOutlined,
  CopyOutlined,
  SaveOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons'
import useStore from '../stores/useStore'
import { chatCompletion } from '../utils/ai'

const { Title, Text } = Typography

// 名称风格配置
const NAME_STYLES = {
  玄幻: {
    character: {
      male: ['叶', '楚', '林', '萧', '陈', '秦', '苏', '唐', '古', '龙'],
      female: ['月', '雪', '烟', '雨', '梦', '灵', '瑶', '琳', '霜', '芸'],
      middle: ['天', '玄', '灵', '云', '风', '雷', '星', '月', '神', '魔'],
      suffix: ['尘', '云', '风', '轩', '辰', '影', '炎', '冰', '空', '羽']
    },
    place: ['苍', '玄', '天', '灵', '神', '魔', '龙', '凤', '虚', '幻'],
    placeSuffix: ['大陆', '界', '域', '山', '海', '城', '谷', '峰', '岛', '渊'],
    technique: ['天', '神', '魔', '龙', '凤', '雷', '火', '冰', '暗', '光'],
    techniqueSuffix: ['诀', '经', '功', '法', '术', '典', '录', '剑', '掌', '指']
  },
  武侠: {
    character: {
      male: ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴'],
      female: ['芳', '蓉', '琳', '娟', '秀', '梅', '兰', '竹', '菊', '莲'],
      middle: ['云', '风', '龙', '虎', '鹤', '剑', '刀', '峰', '涛', '松'],
      suffix: ['清', '风', '云', '天', '明', '峰', '山', '海', '江', '河']
    },
    place: ['华山', '嵩山', '泰山', '衡山', '恒山', '峨眉', '武当', '少林', '昆仑', '天山'],
    placeSuffix: ['派', '门', '帮', '会', '庄', '府', '宫', '阁', '楼', '院'],
    technique: ['九阳', '九阴', '降龙', '打狗', '六脉', '一阳', '独孤', '太极', '八卦', '形意'],
    techniqueSuffix: ['神功', '剑法', '刀法', '掌法', '指法', '内功', '心法', '拳法', '腿法', '步法']
  },
  都市: {
    character: {
      male: ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴'],
      female: ['雨', '雪', '婷', '慧', '琳', '芳', '静', '洁', '颖', '佳'],
      middle: ['志', '建', '国', '华', '明', '强', '文', '武', '军', '峰'],
      suffix: ['伟', '强', '明', '华', '军', '杰', '龙', '飞', '鹏', '宇']
    },
    place: ['中心', '商业', '金融', '科技', '文化', '体育', '公园', '广场', '大厦', '花园'],
    placeSuffix: ['区', '街', '路', '大道', '小区', '广场', '中心', '公园', '大厦', '酒店'],
    technique: ['太极', '咏春', '截拳', '散打', '泰拳', '柔道', '空手道', '跆拳道', '拳击', '摔跤'],
    techniqueSuffix: ['社', '馆', '俱乐部', '培训', '学校', '中心', '工作室', '道场', '武馆', '会馆']
  },
  西幻: {
    character: {
      prefixes: ['艾', '菲', '雷', '罗', '卡', '萨', '亚', '莫', '德', '伊'],
      suffixes: ['尔', '斯', '德', '恩', '克', '斯', '亚', '特', '尔', '斯']
    },
    place: ['艾泽拉斯', '诺森德', '外域', '潘达利亚', '破碎群岛', '赞达拉', '库尔提拉斯', '吉尔尼斯', '洛丹伦', '暴风城'],
    placeSuffix: ['王国', '帝国', '联邦', '共和国', '公国', '王国', '帝国', '联邦', '共和国', '公国'],
    technique: ['火焰', '冰霜', '奥术', '暗影', '神圣', '自然', '毁灭', '痛苦', '恶魔', '神圣'],
    techniqueSuffix: ['魔法', '咒语', '法术', '仪式', '契约', '结界', '领域', '禁咒', '神术', '邪术']
  }
}

export default function NameGenerator() {
  const { aiConfig, knowledge, addCharacter, addWorldSetting, addCustomNote } = useStore()
  
  const [type, setType] = useState('character') // character | place | technique | faction
  const [style, setStyle] = useState('玄幻')
  const [gender, setGender] = useState('male')
  const [count, setCount] = useState(5)
  const [customKeywords, setCustomKeywords] = useState('')
  const [results, setResults] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  // 生成随机名称
  const generateRandomName = () => {
    const styleConfig = NAME_STYLES[style]
    if (!styleConfig) return ''

    switch (type) {
      case 'character': {
        const charConfig = styleConfig.character
        if (style === '西幻') {
          const prefix = charConfig.prefixes[Math.floor(Math.random() * charConfig.prefixes.length)]
          const suffix = charConfig.suffixes[Math.floor(Math.random() * charConfig.suffixes.length)]
          return prefix + suffix
        }
        const family = charConfig[gender === 'male' ? 'male' : 'female'][Math.floor(Math.random() * 10)]
        const middle = charConfig.middle[Math.floor(Math.random() * 10)]
        const suffix = charConfig.suffix[Math.floor(Math.random() * 10)]
        return family + middle + suffix
      }
      case 'place': {
        const prefix = styleConfig.place[Math.floor(Math.random() * styleConfig.place.length)]
        const suffix = styleConfig.placeSuffix[Math.floor(Math.random() * styleConfig.placeSuffix.length)]
        return prefix + suffix
      }
      case 'technique': {
        const prefix = styleConfig.technique[Math.floor(Math.random() * styleConfig.technique.length)]
        const suffix = styleConfig.techniqueSuffix[Math.floor(Math.random() * styleConfig.techniqueSuffix.length)]
        return prefix + suffix
      }
      default:
        return ''
    }
  }

  // AI 增强生成
  const generateWithAI = async () => {
    if (!aiConfig.ollamaUrl && aiConfig.provider === 'ollama') {
      message.warning('请先配置 AI 服务')
      return
    }

    setLoading(true)
    try {
      const typeNames = {
        character: '角色名',
        place: '地名',
        technique: '功法名',
        faction: '门派名'
      }

      const prompt = `请为一个${style}风格的小说生成${count}个${typeNames[type]}。
要求：
1. 名称要有${style}风格的韵味和意境
2. ${gender !== 'any' ? `适合${gender === 'male' ? '男性' : '女性'}` : '不限性别'}
3. ${customKeywords ? `包含这些元素：${customKeywords}` : ''}
4. 每个名称附上一句话的解释，说明其含义和意境
5. 直接列出名称，格式为：名称 - 含义

只输出名称列表，不要其他废话。`

      const result = await chatCompletion(aiConfig, [{ role: 'user', content: prompt }])
      
      // 解析结果
      const lines = result.split('\n').filter(l => l.trim())
      const names = lines.map(line => {
        const match = line.match(/^[\d\.、\s]*([^\s\-—]+)\s*[\-—:：]\s*(.+)$/)
        if (match) {
          return { name: match[1].trim(), meaning: match[2].trim(), favorite: false }
        }
        // 简单格式
        const parts = line.split(/[\-—:：]/)
        if (parts.length >= 2) {
          return { name: parts[0].trim(), meaning: parts.slice(1).join('-').trim(), favorite: false }
        }
        return { name: line.replace(/^[\d\.、\s]+/, '').trim(), meaning: '', favorite: false }
      }).filter(n => n.name.length > 0 && n.name.length < 20)

      setResults(names)
      message.success(`生成了 ${names.length} 个名称`)
    } catch (err) {
      message.error('生成失败: ' + err.message)
      // 失败时使用随机生成
      const fallback = Array.from({ length: count }, () => ({
        name: generateRandomName(),
        meaning: '随机生成',
        favorite: false
      }))
      setResults(fallback)
    } finally {
      setLoading(false)
    }
  }

  // 快速随机生成（不用 AI）
  const generateQuick = () => {
    const names = Array.from({ length: count }, () => ({
      name: generateRandomName(),
      meaning: '随机组合',
      favorite: false
    }))
    setResults(names)
  }

  // 复制到剪贴板
  const handleCopy = (name) => {
    navigator.clipboard.writeText(name)
    message.success('已复制')
  }

  // 收藏/取消收藏
  const toggleFavorite = (index) => {
    setResults(prev => prev.map((item, i) => 
      i === index ? { ...item, favorite: !item.favorite } : item
    ))
  }

  // 保存到知识库
  const saveToKnowledge = (item) => {
    if (type === 'character') {
      addCharacter({
        name: item.name,
        description: item.meaning,
        gender: gender === 'male' ? '男' : gender === 'female' ? '女' : '未知'
      })
      message.success('已保存到人物档案')
    } else if (type === 'place') {
      addWorldSetting({
        key: item.name,
        value: item.meaning,
        type: '地名'
      })
      message.success('已保存到世界观设定')
    } else {
      addCustomNote({
        title: item.name,
        content: item.meaning,
        type: type === 'technique' ? '功法' : '门派'
      })
      message.success('已保存到自定义笔记')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Title level={5}>
        <BulbOutlined style={{ marginRight: 8, color: '#6366f1' }} />
        起名助手
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        快速生成角色名、地名、功法名等，支持 AI 智能生成
      </Text>

      <Divider style={{ margin: '12px 0' }} />

      {/* 配置区 */}
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Row gutter={8}>
          <Col span={12}>
            <Text style={{ fontSize: 12 }}>类型</Text>
            <Select
              value={type}
              onChange={setType}
              style={{ width: '100%' }}
              options={[
                { label: '👤 角色名', value: 'character' },
                { label: '🌍 地名', value: 'place' },
                { label: '⚡ 功法名', value: 'technique' },
              ]}
            />
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: 12 }}>风格</Text>
            <Select
              value={style}
              onChange={setStyle}
              style={{ width: '100%' }}
              options={[
                { label: '🌟 玄幻', value: '玄幻' },
                { label: '⚔️ 武侠', value: '武侠' },
                { label: '🏙️ 都市', value: '都市' },
                { label: '🏰 西幻', value: '西幻' },
              ]}
            />
          </Col>
        </Row>

        {type === 'character' && (
          <div>
            <Text style={{ fontSize: 12 }}>性别</Text>
            <Select
              value={gender}
              onChange={setGender}
              style={{ width: '100%' }}
              options={[
                { label: '👨 男性', value: 'male' },
                { label: '👩 女性', value: 'female' },
                { label: '👤 不限', value: 'any' },
              ]}
            />
          </div>
        )}

        <div>
          <Text style={{ fontSize: 12 }}>生成数量</Text>
          <Select
            value={count}
            onChange={setCount}
            style={{ width: '100%' }}
            options={[3, 5, 8, 10].map(n => ({ label: `${n} 个`, value: n }))}
          />
        </div>

        <div>
          <Text style={{ fontSize: 12 }}>自定义关键词（可选）</Text>
          <Input
            placeholder="如：冷、傲、剑、火..."
            value={customKeywords}
            onChange={e => setCustomKeywords(e.target.value)}
            allowClear
          />
        </div>
      </Space>

      {/* 操作按钮 */}
      <Space style={{ width: '100%', marginTop: 12 }} direction="vertical">
        <Button
          type="primary"
          block
          icon={<BulbOutlined />}
          onClick={generateWithAI}
          loading={loading}
        >
          AI 智能生成
        </Button>
        <Button
          block
          icon={<ReloadOutlined />}
          onClick={generateQuick}
        >
          快速随机生成（不需要 AI）
        </Button>
      </Space>

      {/* 结果展示 */}
      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Divider style={{ margin: '8px 0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>生成结果</Text>
          </Divider>
          
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {results.map((item, index) => (
              <Card
                key={index}
                size="small"
                style={{
                  background: item.favorite ? '#fff7e6' : '#fafafa',
                  borderLeft: `3px solid ${item.favorite ? '#faad14' : '#6366f1'}`
                }}
                bodyStyle={{ padding: '8px 12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>{item.name}</Text>
                    {item.meaning && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        - {item.meaning}
                      </Text>
                    )}
                  </div>
                  <Space size={4}>
                    <Tooltip title={item.favorite ? '取消收藏' : '收藏'}>
                      <Button
                        type="text"
                        size="small"
                        icon={item.favorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                        onClick={() => toggleFavorite(index)}
                      />
                    </Tooltip>
                    <Tooltip title="复制">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(item.name)}
                      />
                    </Tooltip>
                    <Tooltip title="保存到知识库">
                      <Button
                        type="text"
                        size="small"
                        icon={<SaveOutlined style={{ color: '#52c41a' }} />}
                        onClick={() => saveToKnowledge(item)}
                      />
                    </Tooltip>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* 使用提示 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 提示：点击「保存到知识库」可以将名称保存到人物档案或世界观设定中，方便后续写作时查阅。
        </Text>
      </div>
    </div>
  )
}
