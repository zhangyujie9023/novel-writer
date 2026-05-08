// 敏感词库 - 支持扩展
// 分级：high(高危-必屏蔽) | medium(中危-建议修改) | low(低危-可选修改)

export const SENSITIVE_WORDS = {
  // 高危词 - 涉政、违规内容
  high: [
    // 政治敏感
    '习近平', '江泽民', '胡锦涛', '邓小平', '毛泽东', '周恩来', '温家宝', '李克强',
    '六四', '天安门', '法轮功', '达赖', '藏独', '疆独', '台独', '港独',
    '反共', '反华', '专制', '独裁', '暴政', '维权', '上访', '拆迁',
    '共产党', '国民党', '民进党', '文革', '反革命',
    
    // 色情低俗
    '强奸', '轮奸', '乱伦', '卖淫', '嫖娼', '约炮', '一夜情',
    '裸聊', '偷拍', '迷奸', '下药',
    
    // 暴力恐怖
    '恐怖袭击', '自杀式', '人肉炸弹', '砍杀', '屠杀', '灭门',
    '制造炸弹', '爆炸装置',
    
    // 违法犯罪
    '贩毒', '吸毒', '制毒', '洗钱', '走私', '偷渡',
  ],

  // 中危词 - 平台审核重点
  medium: [
    // 赌博相关
    '赌博', '赌场', '下注', '押注', '庄家', '开盘', '赌局',
    
    // 暴力血腥
    '肢解', '碎尸', '虐杀', '酷刑', '挖眼', '剥皮',
    
    // 封建迷信
    '算命', '风水', '跳大神', '招魂', '养鬼',
    
    // 广告营销
    '加微信', '加QQ', '私聊', '返利', '红包群', '兼职',
    
    // 其他平台禁忌
    '起点', '纵横', '17K', '飞卢', '晋江文学城',
  ],

  // 低危词 - 建议优化
  low: [
    // 常见敏感场景
    '黑社会', '黑帮', '帮派', '江湖', '道上的',
    '官商勾结', '权钱交易', '贪污', '受贿', '行贿',
    
    // 宗教相关
    '佛教', '道教', '基督教', '伊斯兰教', '真主', '安拉',
    
    // 民族相关
    '回族', '藏族', '维吾尔族', '蒙古族', '朝鲜族',
  ]
}

// 同义词映射（用于检测变形写法）
export const SYNONYMS = {
  '习近平': ['xijinping', 'xi jinping', '大大', '包子'],
  '共产党': ['gongchandang', 'gcd', '共党'],
  '强奸': ['强暴', '强上', '强行发生关系'],
  '赌博': ['dubo', '赌博', '博彩'],
  '吸毒': ['嗑药', '嗑粉', '溜冰'],
}

// 白名单 - 这些词在小说创作中可以正常使用
export const WHITE_LIST = [
  '杀人', '死亡', '死人', '尸体', // 常见小说情节
  '诅咒', '诅咒', '邪恶', '恶魔', // 奇幻元素
  '魔法', '巫术', '妖术', // 奇幻设定
  '道士', '和尚', '尼姑', // 常见角色
]

// 获取所有敏感词（扁平化）
export function getAllSensitiveWords() {
  return [
    ...SENSITIVE_WORDS.high,
    ...SENSITIVE_WORDS.medium,
    ...SENSITIVE_WORDS.low
  ]
}

// 检查文本中的敏感词
export function checkSensitiveWords(text) {
  const results = []
  const allWords = getAllSensitiveWords()
  
  for (const word of allWords) {
    const regex = new RegExp(word, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      // 检查是否在白名单中（上下文判断）
      const start = Math.max(0, match.index - 10)
      const end = Math.min(text.length, match.index + word.length + 10)
      const context = text.slice(start, end)
      
      // 如果在白名单上下文中，跳过
      let isWhitelisted = false
      for (const whiteWord of WHITE_LIST) {
        if (word === whiteWord && context.includes(whiteWord)) {
          // 小说创作场景，允许
          isWhitelisted = true
          break
        }
      }
      
      if (!isWhitelisted) {
        results.push({
          word: match[0],
          index: match.index,
          level: getWordLevel(word),
          suggestion: getSuggestion(word)
        })
      }
    }
  }
  
  return results
}

// 获取敏感词等级
function getWordLevel(word) {
  if (SENSITIVE_WORDS.high.includes(word)) return 'high'
  if (SENSITIVE_WORDS.medium.includes(word)) return 'medium'
  return 'low'
}

// 获取修改建议
function getSuggestion(word) {
  if (SENSITIVE_WORDS.high.includes(word)) {
    return '⚠️ 高危词，必须修改'
  }
  if (SENSITIVE_WORDS.medium.includes(word)) {
    return '⚡ 中危词，建议修改'
  }
  return '💡 低危词，可选修改'
}

// 替换敏感词（用星号）
export function maskSensitiveWords(text, level = 'all') {
  const words = level === 'high' 
    ? SENSITIVE_WORDS.high 
    : level === 'medium'
      ? [...SENSITIVE_WORDS.high, ...SENSITIVE_WORDS.medium]
      : getAllSensitiveWords()
  
  let result = text
  for (const word of words) {
    const regex = new RegExp(word, 'gi')
    result = result.replace(regex, match => '＊'.repeat(match.length))
  }
  return result
}
