/**
 * 塔罗 78 张牌数据
 * 用于「每日塔罗」抽卡与「日运关键词滚筒」。
 * keywords 为该牌涵盖的日运关键词，滚筒会从中再抽出一个作为今日行动词。
 */

export interface TarotCard {
  /** 编号 0~77 */
  id: number;
  /** major | minor */
  arcana: "major" | "minor";
  /** 小阿卡纳花色 */
  suit?: "wands" | "cups" | "swords" | "pentacles";
  /** 大阿卡纳罗马数字/小阿卡纳点数 */
  number: string;
  /** 牌名（中文） */
  name: string;
  /** 一句话释义 */
  meaning: string;
  /** 日运关键词（滚筒用） */
  keywords: string[];
  /** 建议（正位行动建议） */
  advice: string;
}

export function tarotCardSymbol(c: TarotCard): string {
  if (c.arcana === "major") return "✦";
  switch (c.suit) {
    case "wands": return "🔥";
    case "cups": return "💧";
    case "swords": return "⚔️";
    case "pentacles": return "🪙";
    default: return "🂠";
  }
}

const MAJOR: TarotCard[] = [
  { id: 0, arcana: "major", number: "0", name: "愚人", meaning: "新的开始、自由的冒险，带着点天真与勇气。", keywords: ["出发", "勇气", "自由", "未知", "赤子之心"], advice: "今天适合迈出第一步，别害怕未知。" },
  { id: 1, arcana: "major", number: "I", name: "魔术师", meaning: "资源汇聚、心想事成，行动力满格。", keywords: ["创造", "行动", "掌握", "灵感", "开局"], advice: "把你手上的工具用起来，今天就动手。" },
  { id: 2, arcana: "major", number: "II", name: "女祭司", meaning: "直觉与内在智慧，安静地聆听内心。", keywords: ["直觉", "安静", "洞察", "聆听", "内观"], advice: "少说多做，相信你的第一感觉。" },
  { id: 3, arcana: "major", number: "III", name: "皇后", meaning: "丰盛、滋养与温柔，接纳与给予。", keywords: ["丰盛", "温柔", "滋养", "照顾", "美"], advice: "对自己好一点，也照顾身边的人。" },
  { id: 4, arcana: "major", number: "IV", name: "皇帝", meaning: "秩序、稳固与责任，建立规则。", keywords: ["秩序", "稳固", "责任", "掌控", "边界"], advice: "把事项理清，守住你的边界。" },
  { id: 5, arcana: "major", number: "V", name: "教皇", meaning: "传统、指引与学习，寻求权威与共识。", keywords: ["学习", "指引", "传统", "教导", "信念"], advice: "向有经验的人请教，或当一回引路人。" },
  { id: 6, arcana: "major", number: "VI", name: "恋人", meaning: "选择、联结与爱，也象征重要的抉择。", keywords: ["选择", "联结", "心动", "契合", "坦诚"], advice: "面对选择时，听从内心而非杂音。" },
  { id: 7, arcana: "major", number: "VII", name: "战车", meaning: "意志、驱动力与前进，冲过去。", keywords: ["驱动力", "目标", "冲刺", "自律", "胜利"], advice: "今天定好方向，就果断往前走。" },
  { id: 8, arcana: "major", number: "VIII", name: "力量", meaning: "以柔克刚的勇气，温柔而坚定。", keywords: ["勇气", "耐心", "坚韧", "温柔", "自控"], advice: "别硬碰硬，用温柔的方式 hold 住局面。" },
  { id: 9, arcana: "major", number: "IX", name: "隐士", meaning: "独处、内省，寻找属于自己的答案。", keywords: ["独处", "自省", "沉淀", "求索", "静心"], advice: "给自己一段独处时间，答案会更清晰。" },
  { id: 10, arcana: "major", number: "X", name: "命运之轮", meaning: "转机、周期与变化，顺势而为。", keywords: ["转机", "变化", "运气", "顺流", "机遇"], advice: "顺其自然，机会会自己转过来。" },
  { id: 11, arcana: "major", number: "XI", name: "正义", meaning: "公平、因果与平衡，慎思明辨。", keywords: ["公正", "平衡", "决断", "反思", "真相"], advice: "做出负责任的决定，站在公正这一边。" },
  { id: 12, arcana: "major", number: "XII", name: "倒吊人", meaning: "换一个角度看问题，暂时的停顿。", keywords: ["换位", "暂缓", "牺牲", "透视", "接受"], advice: "试着倒过来看，也许有新的答案。" },
  { id: 13, arcana: "major", number: "XIII", name: "死神", meaning: "结束与新生，放下旧的才能迎来新的。", keywords: ["结束", "蜕变", "告别", "释放", "新生"], advice: "该放手的就放下，腾出位置给新生。" },
  { id: 14, arcana: "major", number: "XIV", name: "节制", meaning: "调和、耐心与平衡的节奏。", keywords: ["节制", "调和", "耐心", "适中", "疗愈"], advice: "张弛有度，别走极端。" },
  { id: 15, arcana: "major", number: "XV", name: "恶魔", meaning: "束缚、执念与欲望，看见了就能解开。", keywords: ["觉察", "欲望", "执念", "挣脱", "真实"], advice: "看清是什么在绑着你，解开它。" },
  { id: 16, arcana: "major", number: "XVI", name: "高塔", meaning: "突变的冲击，打破旧结构后的重建。", keywords: ["突变", "释放", "重建", "震撼", "真相"], advice: "变化来得突然，但也清空了旧模式。" },
  { id: 17, arcana: "major", number: "XVII", name: "星星", meaning: "希望、疗愈与信念，微光在前。", keywords: ["希望", "疗愈", "信念", "灵感", "晴天"], advice: "保持相信，星星会为你指路。" },
  { id: 18, arcana: "major", number: "XVIII", name: "月亮", meaning: "朦胧、未知与潜意识，慢慢看清。", keywords: ["朦胧", "直觉", "疑虑", "梦境", "整理"], advice: "看不清就别急着下结论，先安定内心。" },
  { id: 19, arcana: "major", number: "XIX", name: "太阳", meaning: "喜悦、成功与光亮，明朗的一天。", keywords: ["喜悦", "成功", "阳光", "活力", "肯定"], advice: "今天是晒太阳的好日子，大方发光。" },
  { id: 20, arcana: "major", number: "XX", name: "审判", meaning: "觉醒、复盘与重生，重新评估。", keywords: ["复盘", "觉醒", "评判", "转念", "重生"], advice: "回看过去，做一次清醒的自我重估。" },
  { id: 21, arcana: "major", number: "XXI", name: "世界", meaning: "圆满、完成与到达，一个循环的收束。", keywords: ["圆满", "完成", "抵达", "整合", "庆祝"], advice: "一件事即将圆满，值得好好收个尾。" },
];

const WANDS: TarotCard[] = [
  { id: 22, arcana: "minor", suit: "wands", number: "Ace", name: "权杖一", meaning: "创意的火花、出发的信号。", keywords: ["灵感", "启动", "热情", "新火花"], advice: "有想法今天就点燃它。" },
  { id: 23, arcana: "minor", suit: "wands", number: "2", name: "权杖二", meaning: "规划的视野，站高处看未来。", keywords: ["规划", "视野", "权衡", "蓝图"], advice: "停下来看看全局，再做取舍。" },
  { id: 24, arcana: "minor", suit: "wands", number: "3", name: "权杖三", meaning: "扩张与等待回音，眼光放远。", keywords: ["远见", "等待", "扩张", "合作"], advice: "把眼光放远一点，播种后耐心等。" },
  { id: 25, arcana: "minor", suit: "wands", number: "4", name: "权杖四", meaning: "稳固与庆祝，小小的里程碑。", keywords: ["庆祝", "安稳", "归属", "小成"], advice: "为阶段性成果庆祝一下。" },
  { id: 26, arcana: "minor", suit: "wands", number: "5", name: "权杖五", meaning: "竞争与摩擦，观点碰撞。", keywords: ["竞争", "磨合", "碰撞", "争辩"], advice: "分歧是正常的，对事不对人。" },
  { id: 27, arcana: "minor", suit: "wands", number: "6", name: "权杖六", meaning: "胜利与被看见，收获掌声。", keywords: ["认可", "胜利", "被看见", "回报"], advice: "你的努力今天有望被看见。" },
  { id: 28, arcana: "minor", suit: "wands", number: "7", name: "权杖七", meaning: "坚守立场，顶住压力。", keywords: ["坚守", "抵御", "立场", "坚持"], advice: "别退让，守好你的阵地。" },
  { id: 29, arcana: "minor", suit: "wands", number: "8", name: "权杖八", meaning: "快速的进展，消息来得又快又急。", keywords: ["进展", "加速", "消息", "迅捷"], advice: "事情会快起来，跟紧节奏。" },
  { id: 30, arcana: "minor", suit: "wands", number: "9", name: "权杖九", meaning: "最后的坚持，警惕但坚定。", keywords: ["坚持", "警惕", "复原", "耐力"], advice: "快到终点了，再撑一下。" },
  { id: 31, arcana: "minor", suit: "wands", number: "10", name: "权杖十", meaning: "负担过重，扛得太多。", keywords: ["负荷", "取舍", "分担", "松手"], advice: "你扛得有点多，学会分担或放下。" },
  { id: 32, arcana: "minor", suit: "wands", number: "Page", name: "权杖侍从", meaning: "新鲜的探索欲，带着好奇出发。", keywords: ["好奇", "探索", "开始", "新鲜感"], advice: "像个初学者一样去尝试。" },
  { id: 33, arcana: "minor", suit: "wands", number: "Knight", name: "权杖骑士", meaning: "冲劲十足，说走就走。", keywords: ["冲动", "活力", "冒险", "行动派"], advice: "有冲劲好，但别忘了看路。" },
  { id: 34, arcana: "minor", suit: "wands", number: "Queen", name: "权杖皇后", meaning: "自信与魅力，阳光般感染人。", keywords: ["自信", "魅力", "洒脱", "感染力"], advice: "大方展示你的热情与自信。" },
  { id: 35, arcana: "minor", suit: "wands", number: "King", name: "权杖国王", meaning: "领导者气场，果敢有担当。", keywords: ["领导", "果敢", "魄力", "担当"], advice: "站出来，机会属于有担当的人。" },
];

const CUPS: TarotCard[] = [
  { id: 36, arcana: "minor", suit: "cups", number: "Ace", name: "圣杯一", meaning: "情感的新泉涌，爱意与感动。", keywords: ["心动", "感动", "新情感", "柔软"], advice: "打开心，让好的感受流进来。" },
  { id: 37, arcana: "minor", suit: "cups", number: "2", name: "圣杯二", meaning: "心意相通，互相靠近。", keywords: ["联结", "默契", "靠近", "和好"], advice: "主动向在意的人传递善意。" },
  { id: 38, arcana: "minor", suit: "cups", number: "3", name: "圣杯三", meaning: "朋友欢聚、分享快乐。", keywords: ["友谊", "欢聚", "分享", "庆祝"], advice: "约个朋友，快乐要一起才加倍。" },
  { id: 39, arcana: "minor", suit: "cups", number: "4", name: "圣杯四", meaning: "有些倦怠，需要重新感受。", keywords: ["倦怠", "自省", "重新遇见", "停滞"], advice: "如果提不起劲，就休息一下。" },
  { id: 40, arcana: "minor", suit: "cups", number: "5", name: "圣杯五", meaning: "执着于失去，忘了还有的。", keywords: ["遗憾", "回望", "释怀", "珍惜"], advice: "杯子还有三个，别忘了已有的。" },
  { id: 41, arcana: "minor", suit: "cups", number: "6", name: "圣杯六", meaning: "童年与旧时光，温柔的回忆。", keywords: ["回忆", "童真", "怀旧", "纯真"], advice: "允许自己回味一段美好的旧时光。" },
  { id: 42, arcana: "minor", suit: "cups", number: "7", name: "圣杯七", meaning: "选择很多，别被幻想牵着走。", keywords: ["抉择", "幻想", "清醒", "聚焦"], advice: "做梦可以，选一个能落地的。" },
  { id: 43, arcana: "minor", suit: "cups", number: "8", name: "圣杯八", meaning: "转身离开，追寻更深的满足。", keywords: ["放手", "前行", "追寻", "改变"], advice: "若此处给不了你，就起身去别处。" },
  { id: 44, arcana: "minor", suit: "cups", number: "9", name: "圣杯九", meaning: "心愿达成、称心如意。", keywords: ["满足", "愿望", "满足感", "自得"], advice: "今天值得为自己感到满足。" },
  { id: 45, arcana: "minor", suit: "cups", number: "10", name: "圣杯十", meaning: "家和万事兴，圆满的关系。", keywords: ["圆满", "归属", "幸福", "和谐"], advice: "经营好周围的关系，幸福自会降临。" },
  { id: 46, arcana: "minor", suit: "cups", number: "Page", name: "圣杯侍从", meaning: "敏感的想象力，怀着一颗柔软的心。", keywords: ["灵感", "细腻", "渴望", "浪漫"], advice: "把心里的一个柔软念头说出来。" },
  { id: 47, arcana: "minor", suit: "cups", number: "Knight", name: "圣杯骑士", meaning: "浪漫的追求者，心动信号。", keywords: ["浪漫", "追求", "主动", "示好"], advice: "想靠近就主动一点。" },
  { id: 48, arcana: "minor", suit: "cups", number: "Queen", name: "圣杯皇后", meaning: "温柔共情，如水包容。", keywords: ["温柔", "共情", "包容", "滋养"], advice: "用温柔和理解去回应他人。" },
  { id: 49, arcana: "minor", suit: "cups", number: "King", name: "圣杯国王", meaning: "成熟的情感，稳定而体贴。", keywords: ["稳重", "体贴", "情绪稳定", "支持"], advice: "做情绪的掌舵人，体贴而不失分寸。" },
];

const SWORDS: TarotCard[] = [
  { id: 50, arcana: "minor", suit: "swords", number: "Ace", name: "宝剑一", meaning: "清晰的念头，真相被看见。", keywords: ["清晰", "决断", "真相", "想通"], advice: "今天会想得很清楚，别绕弯。" },
  { id: 51, arcana: "minor", suit: "swords", number: "2", name: "宝剑二", meaning: "两难与回避，需要下决心。", keywords: ["两难", "抉择", "静观", "决心"], advice: "蒙上眼睛看不到路，摘下来面对。" },
  { id: 52, arcana: "minor", suit: "swords", number: "3", name: "宝剑三", meaning: "心口一痛，但也是清理。", keywords: ["伤心", "释怀", "面对", "疗愈"], advice: "允许自己难过，然后让它过去。" },
  { id: 53, arcana: "minor", suit: "swords", number: "4", name: "宝剑四", meaning: "歇一歇，恢复能量。", keywords: ["休息", "恢复", "静养", "充电"], advice: "今天适合放慢，给自己充电。" },
  { id: 54, arcana: "minor", suit: "swords", number: "5", name: "宝剑五", meaning: "赢了场面输了人心，收敛锋芒。", keywords: ["退让", "争输赢", "看淡", "和解"], advice: "赢不是全部，别让争执伤了自己。" },
  { id: 55, arcana: "minor", suit: "swords", number: "6", name: "宝剑六", meaning: "过渡与疗愈，划向平静的彼岸。", keywords: ["过渡", "远离", "平静", "疗愈"], advice: "正在离开风浪，平稳就会到来。" },
  { id: 56, arcana: "minor", suit: "swords", number: "7", name: "宝剑七", meaning: "策略与躲闪，量力而行。", keywords: ["策略", "取巧", "审慎", "迂回"], advice: "硬碰不行就智取，但要守住真诚。" },
  { id: 57, arcana: "minor", suit: "swords", number: "8", name: "宝剑八", meaning: "被束缚感，其实枷锁是虚的。", keywords: ["束缚", "视角", "松绑", "自我设限"], advice: "你以为困住的，其实是你想走出来。" },
  { id: 58, arcana: "minor", suit: "swords", number: "9", name: "宝剑九", meaning: "忧虑放大，别信夜里的噪音。", keywords: ["忧虑", "焦虑", "安抚", "看清"], advice: "夜晚让你想多，天亮再看常没那回事。" },
  { id: 59, arcana: "minor", suit: "swords", number: "10", name: "宝剑十", meaning: "触底，也是重启的起点。", keywords: ["触底", "终局", "重启", "卸下"], advice: "最难受的过去了，接下来是重建。" },
  { id: 60, arcana: "minor", suit: "swords", number: "Page", name: "宝剑侍从", meaning: "机敏的好奇，新的讯息。", keywords: ["警觉", "好奇", "新消息", "学习"], advice: "保持敏锐，新信息会带来启发。" },
  { id: 61, arcana: "minor", suit: "swords", number: "Knight", name: "宝剑骑士", meaning: "直来直往，快刀斩乱麻。", keywords: ["爽快", "决断", "冲刺", "行动"], advice: "今天不容拖沓，快、准、稳。" },
  { id: 62, arcana: "minor", suit: "swords", number: "Queen", name: "宝剑皇后", meaning: "理性通透，清醒而独立。", keywords: ["理性", "通透", "独立", "洞察"], advice: "用清醒的头脑看穿表象。" },
  { id: 63, arcana: "minor", suit: "swords", number: "King", name: "宝剑国王", meaning: "沉着冷静，客观公正的判断。", keywords: ["冷静", "公正", "逻辑", "决断"], advice: "不带情绪地做判断，你就是主心骨。" },
];

const PENTACLES: TarotCard[] = [
  { id: 64, arcana: "minor", suit: "pentacles", number: "Ace", name: "星币一", meaning: "实在的开端，可以握住的种子。", keywords: ["机遇", "播种", "实在", "开始"], advice: "今天适合脚踏实地开个好头。" },
  { id: 65, arcana: "minor", suit: "pentacles", number: "2", name: "星币二", meaning: "多任务切换，保持柔韧。", keywords: ["平衡", "周转", "灵活", "协调"], advice: "几头都要顾，学会弹性切换。" },
  { id: 66, arcana: "minor", suit: "pentacles", number: "3", name: "星币三", meaning: "协作与打磨，一起把事做好。", keywords: ["合作", "打磨", "技能", "成就感"], advice: "别单打独斗，多请教多协作。" },
  { id: 67, arcana: "minor", suit: "pentacles", number: "4", name: "星币四", meaning: "紧握不放，学会一点松手。", keywords: ["掌控", "积累", "安全感", "松手"], advice: "握得过紧会累，试着留点空间。" },
  { id: 68, arcana: "minor", suit: "pentacles", number: "5", name: "星币五", meaning: "暂时的匮乏，别独自硬扛。", keywords: ["匮乏", "求助", "低谷", "陪伴"], advice: "觉得难的时候，开口求助不丢人。" },
  { id: 69, arcana: "minor", suit: "pentacles", number: "6", name: "星币六", meaning: "施与受的平衡，分享即可。", keywords: ["分享", "帮助", "给予", "公平"], advice: "有余力就拉别人一把。" },
  { id: 70, arcana: "minor", suit: "pentacles", number: "7", name: "星币七", meaning: "耐心等待，果实正在长。", keywords: ["耐心", "回报", "等待", "评估"], advice: "你种下的正在结果，别急着拔苗。" },
  { id: 71, arcana: "minor", suit: "pentacles", number: "8", name: "星币八", meaning: "反复练习，越做越熟。", keywords: ["练习", "专注", "精进", "匠心"], advice: "今天适合打磨技艺，慢工出细活。" },
  { id: 72, arcana: "minor", suit: "pentacles", number: "9", name: "星币九", meaning: "独立与自足，享受自己挣来的。", keywords: ["自足", "独立", "享受", "成就"], advice: "奖励自己，你值得。" },
  { id: 73, arcana: "minor", suit: "pentacles", number: "10", name: "星币十", meaning: "长久的稳定与传承。", keywords: ["传承", "稳固", "家庭", "长久"], advice: "把基础打牢，幸福会代代相传。" },
  { id: 74, arcana: "minor", suit: "pentacles", number: "Page", name: "星币侍从", meaning: "认真的学习，一步一脚印。", keywords: ["学习", "投入", "小步", "踏实"], advice: "认真学点东西，积少成多。" },
  { id: 75, arcana: "minor", suit: "pentacles", number: "Knight", name: "星币骑士", meaning: "稳扎稳打，靠谱而耐心。", keywords: ["可靠", "坚持", "务实", "耐心"], advice: "慢一点没关系，方向对就好。" },
  { id: 76, arcana: "minor", suit: "pentacles", number: "Queen", name: "星币皇后", meaning: "踏实温厚的经营，安全感。", keywords: ["务实", "照料", "安全感", "丰足"], advice: "把生活打理妥帖，就是对的。" },
  { id: 77, arcana: "minor", suit: "pentacles", number: "King", name: "星币国王", meaning: "财富与稳定，成熟的管理者。", keywords: ["稳重", "富足", "掌控", "管理"], advice: "今天适合安排资源、稳中求进。" },
];

/** 78 张完整牌组 */
export const TAROT_DECK: TarotCard[] = [...MAJOR, ...WANDS, ...CUPS, ...SWORDS, ...PENTACLES];

export function getTarotCard(id: number): TarotCard | undefined {
  return TAROT_DECK.find((c) => c.id === Number(id));
}

export function randomTarotCard(): TarotCard {
  return TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
}

/** 从牌的关键词中抽一个日运关键词 */
export function randomKeyword(c: TarotCard): string {
  return c.keywords[Math.floor(Math.random() * c.keywords.length)];
}