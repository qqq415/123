/**
 * 酒吧酒单
 * ------------------------------------------------------------------
 * 每款酒都是一个「写作引子」：除了基础的分类、酒精度、口味，还提供
 * 明确的关键词（keywords）、中等篇幅的氛围说明（description，帮助理解
 * 该写什么）、以及写作提示（writingPrompt）。
 * 像素风配图由 PixelDrink 组件根据 glass / palette / garnish 程序化绘制。
 */

export type DrinkCategory =
  | "fruit" // 水果酒
  | "spirit" // 烈酒
  | "sake" // 清酒
  | "flower" // 花酿
  | "mead" // 果酒（蜜酿）
  | "beer"; // 啤酒

export interface DrinkPalette {
  /** 酒液主色 */
  liquid: string;
  /** 酒液深色（底部/阴影） */
  liquidDark: string;
  /** 酒液浅色（高光/上部） */
  liquidLight: string;
  /** 杯壁描边色 */
  glass: string;
  /** 泡沫/奶盖色（可选） */
  foam?: string;
}

export type GlassType =
  | "rocks" // 古典矮杯
  | "wine" // 高脚葡萄酒杯
  | "martini" // 马天尼三角杯
  | "flute" // 长笛香槟杯
  | "mug" // 啤酒扎杯
  | "highball" // 直身高球杯
  | "cup" // 小盏/清酒杯
  | "shot"; // 烈酒杯

export type GarnishType =
  | "none"
  | "cherry"
  | "lemon"
  | "lime"
  | "orange"
  | "mint"
  | "berry"
  | "flower"
  | "umbrella"
  | "salt"
  | "ice"
  | "bubble"
  | "petal";

export interface Drink {
  slug: string;
  name: string;
  category: DrinkCategory;
  abv: number; // 酒精度 %
  taste: string; // 一句话口味
  keywords: string[];
  description: string; // 中等篇幅氛围/风味介绍，帮助理解并据此写作
  writingPrompt: string; // 写作提示
  glass: GlassType;
  palette: DrinkPalette;
  garnish: GarnishType;
  fill: number; // 0~1 杯内酒液填充高度
}

export const DRINK_CATEGORIES: {
  id: DrinkCategory;
  label: string;
  hint: string;
}[] = [
  { id: "fruit", label: "水果酒", hint: "新鲜、酸甜、微醺的果香" },
  { id: "spirit", label: "烈酒", hint: "直接、浓烈、像一句真话" },
  { id: "sake", label: "清酒", hint: "温润、米香、安静的余韵" },
  { id: "flower", label: "花酿", hint: "花香、柔美、缓慢绽开" },
  { id: "mead", label: "果酒", hint: "蜂蜜与果实的醇厚" },
  { id: "beer", label: "啤酒", hint: "麦香、气泡、放松的夜晚" },
];

const GLASS_WARM = "#7C5A46";

export const DRINKS: Drink[] = [
  // ---------------- 水果酒 ----------------
  {
    slug: "sunset-canned",
    name: "日落罐头",
    category: "fruit",
    abv: 6,
    taste: "黄桃与杏子的甜，尾调一抹夏天的酸",
    keywords: ["黄昏", "夏天", "黄桃", "收尾", "舍不得"],
    description:
      "把一整罐夏天的黄昏泡进酒里。入口是熟透黄桃和杏子的甜，像傍晚六点半晒在手臂上的阳光，咽下去之后才浮起一点点柠檬酸，提醒你白天真的要结束了。它不烈，更像一种温柔的告别：冰过的杯壁挂着水珠，空气里有晚饭的香味和楼下小孩的喊叫。适合写那些『明明很平常，却突然想记住』的傍晚，写一件正在结束、而你舍不得它结束的小事。",
    writingPrompt: "写一个让你舍不得天黑的傍晚，或一次安静的告别。",
    glass: "highball",
    palette: {
      liquid: "#F2913D",
      liquidDark: "#D96B22",
      liquidLight: "#FBC46A",
      glass: GLASS_WARM,
    },
    garnish: "orange",
    fill: 0.72,
  },
  {
    slug: "berry-static",
    name: "浆果静电",
    category: "fruit",
    abv: 8,
    taste: "莓果爆开，舌头上有细小的噼啪感",
    keywords: ["心跳", "暗恋", "莓果", "紧张", "触电"],
    description:
      "覆盆子、黑莓和野草莓压碎后混在一起，颜色是深到发紫的红。刚入口是甜的，紧接着酸意和气泡一起在舌尖炸开，像冬天毛衣上的静电，又像靠近喜欢的人时那种没由来的紧张。它让普通的一句话变得过分清晰，让一次对视被记得很久。适合写暗恋、写心跳漏拍、写那些你明明没喝多少却开始脸红的时刻。",
    writingPrompt: "写一次让你心跳加速、却说不清原因的靠近。",
    glass: "martini",
    palette: {
      liquid: "#C0335B",
      liquidDark: "#8C1E40",
      liquidLight: "#E06087",
      glass: GLASS_WARM,
    },
    garnish: "berry",
    fill: 0.66,
  },
  {
    slug: "green-apple-amnesia",
    name: "青苹果失忆",
    category: "fruit",
    abv: 7,
    taste: "青苹果的清爽酸，带一点想重新开始的涩",
    keywords: ["重新开始", "删除", "青苹果", "清晨", "原谅"],
    description:
      "清脆的青苹果味，酸得让人一下子清醒，像一觉睡到自然醒、窗外有光的那种早晨。酒里加了一点点涩口的白葡萄，尝起来像『把昨天翻篇』时心里那点不舍——不是不记得，而是决定不再带在身上。适合写给自己的和解、写一次删除或清空、写原谅某个人（很可能就是你自己）之后的轻。",
    writingPrompt: "写一件你决定放下、并在清晨重新开始的事。",
    glass: "wine",
    palette: {
      liquid: "#9BBF3A",
      liquidDark: "#6E8C22",
      liquidLight: "#C6DE74",
      glass: GLASS_WARM,
    },
    garnish: "lime",
    fill: 0.62,
  },
  {
    slug: "passionfruit-crossing",
    name: "百香果渡口",
    category: "fruit",
    abv: 9,
    taste: "百香果的热带酸甜，浓郁得像要出发",
    keywords: ["出发", "远方", "热带", "选择", "行李"],
    description:
      "百香果浓郁的酸甜里混着芒果和一点菠萝，味道热、亮、直接，像站在渡口闻到的水汽和对岸飘来的音乐。它让人想立刻收拾行李，也让人意识到：每一次出发都意味着把某些东西留在身后。适合写关于选择和远方的心情，写一次犹豫很久的出发、一个没说出口的『等我回来』。",
    writingPrompt: "写你站在某个『渡口』上，最终决定跨过去的那一刻。",
    glass: "highball",
    palette: {
      liquid: "#E8A33D",
      liquidDark: "#B9741E",
      liquidLight: "#F6CE6E",
      glass: GLASS_WARM,
    },
    garnish: "umbrella",
    fill: 0.74,
  },
  {
    slug: "cherry-train",
    name: "樱桃末班车",
    category: "fruit",
    abv: 10,
    taste: "黑樱桃的甜与杏仁的微苦，夜归的味道",
    keywords: ["夜归", "末班车", "樱桃", "疲惫", "一个人"],
    description:
      "黑樱桃的甜裹着一点点杏仁的苦，像末班车上靠窗的位置，城市的灯一格一格从脸上滑过去。它不劝你开心，只是陪你安静地坐完这一程，承认今天有点累、有点孤单，但也没那么糟。适合写夜归、写下班后的放空、写一个人吃饭坐车却忽然温柔起来的瞬间。",
    writingPrompt: "写一次夜归路上，你和自己安静相处的时刻。",
    glass: "rocks",
    palette: {
      liquid: "#8E2440",
      liquidDark: "#5E1429",
      liquidLight: "#B8486A",
      glass: GLASS_WARM,
    },
    garnish: "cherry",
    fill: 0.6,
  },

  // ---------------- 烈酒 ----------------
  {
    slug: "honest-on-fire",
    name: "坦白着火",
    category: "spirit",
    abv: 45,
    taste: "威士忌的烟熏与焦糖，烈得像把真话烧出来",
    keywords: ["真话", "勇气", "烟熏", "摊牌", "炽热"],
    description:
      "纯饮的重泥煤威士忌，入口先是灼热，然后是烟熏、焦糖和一点点海水的咸。它不替你遮掩，几杯下去，平时绕着走的话开始变得简单：喜欢、抱歉、我撑不住了、其实我一直记得。烈，但诚实。适合写一次摊牌、一句憋了很久的真话，写那种『说出口可能会烧伤谁，但不说会烧掉自己』的时刻。",
    writingPrompt: "写一句你一直没敢说出口的真话，让它在纸上着火。",
    glass: "rocks",
    palette: {
      liquid: "#B5651D",
      liquidDark: "#7A3F12",
      liquidLight: "#D98C3E",
      glass: GLASS_WARM,
    },
    garnish: "ice",
    fill: 0.5,
  },
  {
    slug: "midnight-clause",
    name: "午夜条款",
    category: "spirit",
    abv: 40,
    taste: "伏特加干净冷冽，几乎无味，却让一切变清楚",
    keywords: ["决定", "清醒", "冷", "边界", "深夜"],
    description:
      "伏特加冷得像一份刚打印好的合同，干净、没有甜味，也没有退路。在最安静的深夜，它帮你把混乱的情绪一条条理清：这是我能给的，这是我的底线，这条到此为止。它不浪漫，却给人一种冷峻的力量。适合写关于边界和决定的文字，写一次清醒的拒绝或承诺。",
    writingPrompt: "写你在深夜给自己定下的一条『条款』或底线。",
    glass: "martini",
    palette: {
      liquid: "#CFE3EC",
      liquidDark: "#9FBFCB",
      liquidLight: "#EAF4F8",
      glass: GLASS_WARM,
    },
    garnish: "lemon",
    fill: 0.64,
  },
  {
    slug: "old-gunpowder",
    name: "旧火药",
    category: "spirit",
    abv: 50,
    taste: "朗姆的浓烈甘醇，带焦糖与一点危险",
    keywords: ["冒险", "叛逆", "火药", "旧事", "点燃"],
    description:
      "黑朗姆浓得几乎能点燃，焦糖和糖蜜的甜下面藏着明显的灼热，像压在抽屉最底层的旧火药，也像年轻时干过的那些蠢事。它提醒你：有些危险其实很迷人，有些伤疤是主动换来的。适合写叛逆、写一次冒险或冲动，写给当年那个不管不顾的自己。",
    writingPrompt: "写一次你明知危险、还是点燃了『火药』的经历。",
    glass: "rocks",
    palette: {
      liquid: "#7B3F16",
      liquidDark: "#4E260C",
      liquidLight: "#A8602A",
      glass: GLASS_WARM,
    },
    garnish: "orange",
    fill: 0.5,
  },
  {
    slug: "absinthe-awakening",
    name: "苦艾苏醒",
    category: "spirit",
    abv: 60,
    taste: "茴香与草药的苦，奇异、迷离、像梦的边缘",
    keywords: ["幻觉", "灵感", "苦艾", "梦", "觉醒"],
    description:
      "深绿色的苦艾酒，茴香和草药的味道古怪而强烈，加水之后会变得浑浊，像清醒和梦境之间那层雾。它曾是画家和诗人深夜的燃料，让寻常的房间开始变形、让念头长出翅膀。适合写灵感乍现、写一个模糊却强烈的梦，写在理智边缘看见的美。",
    writingPrompt: "写一个似梦非梦、让你醒来还记着的画面。",
    glass: "wine",
    palette: {
      liquid: "#5E7B3A",
      liquidDark: "#3B5320",
      liquidLight: "#8FA860",
      glass: GLASS_WARM,
    },
    garnish: "mint",
    fill: 0.6,
  },
  {
    slug: "tequila-sunburn",
    name: "龙舌兰晒伤",
    category: "spirit",
    abv: 43,
    taste: "龙舌兰的植物辛香，咸、烈、带阳光的灼痛",
    keywords: ["夏天", "灼痛", "冲动", "盐", "成长"],
    description:
      "一口龙舌兰，配盐和青柠，先是咸和酸，然后灼热顺着喉咙烧下去，像海边玩了一天后肩上的晒伤——当时只觉得痛快，第二天才发现红了一片。它和年轻、冲动、不计后果有关，也和那种疼过一次才学会的小心有关。适合写一次痛快后的代价，写成长里那些『笑着挨下』的伤。",
    writingPrompt: "写一次像晒伤一样：当时痛快、事后发疼的经历。",
    glass: "shot",
    palette: {
      liquid: "#E3C24A",
      liquidDark: "#B8942A",
      liquidLight: "#F2DE84",
      glass: GLASS_WARM,
    },
    garnish: "salt",
    fill: 0.56,
  },

  // ---------------- 清酒 ----------------
  {
    slug: "first-snow-sake",
    name: "初雪微温",
    category: "sake",
    abv: 14,
    taste: "温润米香，清淡柔和，像落下的第一片雪",
    keywords: ["初雪", "安静", "米香", "等待", "温柔"],
    description:
      "温热的清酒，米香柔和，入口几乎没有攻击性，暖意却慢慢落到胃里。窗外是今年的第一场雪，安静得能听见雪压在枝头的声音。它适合那些不喧哗的情绪：等待某个人回家、和老朋友沉默对坐、或者只是允许自己什么都不做。适合写安静、写陪伴、写细小而确定的温暖。",
    writingPrompt: "写一个安静到能听见雪声的场景，和其中的暖意。",
    glass: "cup",
    palette: {
      liquid: "#EFE7D6",
      liquidDark: "#CBBFA8",
      liquidLight: "#FAF6EC",
      glass: GLASS_WARM,
    },
    garnish: "petal",
    fill: 0.7,
  },
  {
    slug: "moonlit-junmai",
    name: "月光纯米",
    category: "sake",
    abv: 15,
    taste: "纯米的干净旨味，冷冽中有淡淡回甘",
    keywords: ["月光", "孤独", "纯粹", "夜", "清醒"],
    description:
      "冰镇的纯米酒，干净、克制，像深夜独自走在没什么人的街上，月光把影子拉得很长。它不甜腻，却有一丝回甘，仿佛承认：孤独并不可耻，反而让人更接近自己。适合写一个人度过的夜晚、写独处时想清楚的事，写那种冷清却自由的心情。",
    writingPrompt: "写一个你独自和月光待在一起的夜晚，以及想明白的事。",
    glass: "cup",
    palette: {
      liquid: "#E7EDF2",
      liquidDark: "#BCC9D4",
      liquidLight: "#F7FAFC",
      glass: GLASS_WARM,
    },
    garnish: "ice",
    fill: 0.68,
  },
  {
    slug: "rain-on-tatami",
    name: "榻榻米雨声",
    category: "sake",
    abv: 13,
    taste: "清爽顺滑，带一点点雨后青草般的清新",
    keywords: ["雨", "午后", "回忆", "青草", "慢"],
    description:
      "口感顺滑的清酒，味道淡而清，像午后一场不急着停的雨打在屋檐和榻榻米上。人在这种时候容易想起很久以前的事：旧教室、外婆家的午后、某个已经模糊的人。它让时间慢下来。适合写回忆、写雨天、写那些被雨声泡软的旧事。",
    writingPrompt: "写一个雨天，和它带回来的一段旧回忆。",
    glass: "cup",
    palette: {
      liquid: "#E4EAD8",
      liquidDark: "#BDC7A8",
      liquidLight: "#F4F8EA",
      glass: GLASS_WARM,
    },
    garnish: "mint",
    fill: 0.66,
  },
  {
    slug: "plum-blossom-night",
    name: "梅见夜",
    category: "sake",
    abv: 12,
    taste: "梅酒的酸甜与清酒的温和，像久别重逢",
    keywords: ["重逢", "梅子", "好久不见", "夜谈", "想念"],
    description:
      "梅酒和清酒调和，酸甜被米香托着，不张扬，像多年未见的朋友深夜坐下来，第一句『好久不见』之后，竟一点也不生疏。它适合写重逢、写隔了很久的联系、写那种以为淡了、其实一直都在的感情。",
    writingPrompt: "写一次久别重逢，和那句『好久不见』之后的心情。",
    glass: "wine",
    palette: {
      liquid: "#D9A44A",
      liquidDark: "#A87528",
      liquidLight: "#ECC87E",
      glass: GLASS_WARM,
    },
    garnish: "berry",
    fill: 0.6,
  },

  // ---------------- 花酿 ----------------
  {
    slug: "osmanthus-letter",
    name: "桂花来信",
    category: "flower",
    abv: 11,
    taste: "桂花清甜，香气像一封迟到的信",
    keywords: ["桂花", "秋天", "书信", "想念", "迟到"],
    description:
      "桂花酿的甜是清甜，不腻，香气会先于味道到达，像秋天忽然闻到桂花香时、毫无预兆想起的那个人。它让人有写信的冲动，想把近况、把没说出口的想念，一行一行写下来，哪怕不知道会不会寄出去。适合写思念、写书信、写秋天里一次温柔的牵挂。",
    writingPrompt: "写一封你也许不会寄出的信，给某个想念的人。",
    glass: "flute",
    palette: {
      liquid: "#E8B93E",
      liquidDark: "#B88820",
      liquidLight: "#F6D878",
      glass: GLASS_WARM,
    },
    garnish: "flower",
    fill: 0.72,
  },
  {
    slug: "rose-stutter",
    name: "玫瑰结巴",
    category: "flower",
    abv: 12,
    taste: "玫瑰的花香，甜中带一点点说不清的涩",
    keywords: ["玫瑰", "情话", "笨拙", "脸红", "爱"],
    description:
      "玫瑰酿闻起来浪漫，喝起来却没有那么顺滑，带着一点花瓣的涩，像一个不擅长甜言蜜语的人，结结巴巴地说了半句情话，反而比任何漂亮句子都动人。它写的不是完美的爱情，而是笨拙的真心。适合写爱、写脸红、写那些没说完整却被听懂的话。",
    writingPrompt: "写一次笨拙却真诚的表白，或一句没说完的情话。",
    glass: "martini",
    palette: {
      liquid: "#D86A7E",
      liquidDark: "#A84055",
      liquidLight: "#EE9AAB",
      glass: GLASS_WARM,
    },
    garnish: "petal",
    fill: 0.64,
  },
  {
    slug: "jasmine-low-tide",
    name: "茉莉退潮",
    category: "flower",
    abv: 10,
    taste: "茉莉清香淡雅，平静得像潮水退去",
    keywords: ["茉莉", "平静", "释然", "退潮", "放下"],
    description:
      "茉莉的香很轻，喝下去心里那种翻涌的东西也慢慢退了，像潮水离开沙滩，留下平整、安静、还带着湿气的一片。它适合写情绪平复之后的状态：哭过、争过、纠结过，终于松了一口气。适合写释然、写放下、写风暴过后的平静。",
    writingPrompt: "写一场情绪『退潮』之后，你心里平静下来的样子。",
    glass: "flute",
    palette: {
      liquid: "#DDE6C0",
      liquidDark: "#B4C08C",
      liquidLight: "#F0F5DE",
      glass: GLASS_WARM,
    },
    garnish: "flower",
    fill: 0.7,
  },
  {
    slug: "peach-blossom-debt",
    name: "桃花欠",
    category: "flower",
    abv: 13,
    taste: "桃花与水蜜桃的甜，像一句欠下的约定",
    keywords: ["桃花", "约定", "亏欠", "春天", "缘分"],
    description:
      "桃花酿是粉嫩的甜，入口软，回味却有一点点怅然，像春天一起看过花的人、当时随口许下『明年再来』，后来却再没见过。它关于那些没有兑现的约定和说不清谁欠谁的缘分，轻，却一直放在心上。适合写遗憾、写约定、写生命里短暂开过又谢的人。",
    writingPrompt: "写一个没能兑现的约定，和它在你心里留下的颜色。",
    glass: "wine",
    palette: {
      liquid: "#F2A7B8",
      liquidDark: "#CE748A",
      liquidLight: "#FBD0DB",
      glass: GLASS_WARM,
    },
    garnish: "petal",
    fill: 0.62,
  },
  {
    slug: "chrysanthemum-autumn",
    name: "东篱秋色",
    category: "flower",
    abv: 11,
    taste: "菊花的清雅微甘，带一点草木的闲适",
    keywords: ["菊花", "闲适", "秋天", "归隐", "自得"],
    description:
      "菊花酿清雅、微甘，有一点点草木的气息，像忙了一整年之后，终于允许自己慢下来、什么都不争的那个秋天。它和『采菊东篱下』的心境有关：不必赢过谁，能安静地过好自己的日子，已经很好。适合写闲适、写给生活做减法、写一种自得的平静。",
    writingPrompt: "写你想象中『退下来、慢下来』之后的一个秋日。",
    glass: "cup",
    palette: {
      liquid: "#E4B93E",
      liquidDark: "#B38720",
      liquidLight: "#F4D878",
      glass: GLASS_WARM,
    },
    garnish: "flower",
    fill: 0.66,
  },

  // ---------------- 果酒（蜜酿） ----------------
  {
    slug: "honey-glacier",
    name: "蜂蜜冰川",
    category: "mead",
    abv: 12,
    taste: "蜂蜜的醇厚甜，尾调冰凉清爽",
    keywords: ["蜂蜜", "甜", "治愈", "冰川", "被安慰"],
    description:
      "蜜酒醇厚、温热的甜，冰镇之后又变得清冽，像在很难过的一天被人轻轻抱了一下，也像夏天看到冰川时心里那种安静的震撼。它不复杂，只是直白地给你一点甜。适合写被安慰的时刻、写自我疗愈、写给自己的一点奖励和温柔。",
    writingPrompt: "写一个你被『一点甜』治愈的时刻。",
    glass: "wine",
    palette: {
      liquid: "#E9B949",
      liquidDark: "#B98820",
      liquidLight: "#F6D98A",
      glass: GLASS_WARM,
    },
    garnish: "ice",
    fill: 0.6,
  },
  {
    slug: "fig-violet-dusk",
    name: "无花果紫暮",
    category: "mead",
    abv: 13,
    taste: "无花果的绵密甘甜，带紫罗兰般的暮意",
    keywords: ["无花果", "黄昏", "成熟", "温柔", "秘密"],
    description:
      "无花果和蜂蜜酿出的酒绵密、甘甜，颜色是傍晚的紫，像一天将尽时那种柔软的疲惫，也像一个只在熟人间才肯说的秘密。它关于成熟：不再急着证明什么，能温和地承接自己的好与不好。适合写黄昏、写成熟、写一个被妥善保管的秘密。",
    writingPrompt: "写一个在黄昏说出口、或被你珍藏的秘密。",
    glass: "martini",
    palette: {
      liquid: "#7E4E8C",
      liquidDark: "#552E63",
      liquidLight: "#A878B8",
      glass: GLASS_WARM,
    },
    garnish: "berry",
    fill: 0.64,
  },
  {
    slug: "applewood-ember",
    name: "苹果木余烬",
    category: "mead",
    abv: 14,
    taste: "烤苹果与蜂蜜的暖甜，带一点烟熏",
    keywords: ["冬夜", "篝火", "烤苹果", "陪伴", "余温"],
    description:
      "烤苹果、蜂蜜和一点点橡木烟熏的味道，温暖、厚实，像冬夜里快要熄灭的火堆，大家谁都没走，只是把杯子握得更紧。它关于陪伴和余温：热闹过后剩下的那几个人，反而更重要。适合写冬夜、写老友、写热闹散场后还留在身边的温暖。",
    writingPrompt: "写热闹过后，仍陪你守着『余烬』的人或时刻。",
    glass: "rocks",
    palette: {
      liquid: "#C06A2E",
      liquidDark: "#8A4618",
      liquidLight: "#DD9558",
      glass: GLASS_WARM,
    },
    garnish: "orange",
    fill: 0.56,
  },
  {
    slug: "pear-bell-tower",
    name: "雪梨钟声",
    category: "mead",
    abv: 12,
    taste: "雪梨的清甜润口，柔和得像远处钟声",
    keywords: ["雪梨", "钟声", "思念", "润", "远方"],
    description:
      "雪梨蜜酒清、润、微甜，喝下去喉咙很舒服，像黄昏远处传来的钟声，一下一下，不急，却让想家的人忽然安静。它适合写清淡而绵长的思念，写远方的家人、写一句『最近还好吗』。适合写思念、写问候、写温柔的牵挂。",
    writingPrompt: "写一句你想对远方的人说的问候，和想起他时的声音。",
    glass: "flute",
    palette: {
      liquid: "#E8DD9A",
      liquidDark: "#C2B268",
      liquidLight: "#F7EFC6",
      glass: GLASS_WARM,
    },
    garnish: "petal",
    fill: 0.7,
  },
  {
    slug: "pomegranate-vow",
    name: "石榴誓言",
    category: "mead",
    abv: 14,
    taste: "石榴的浓郁酸甜与蜂蜜的厚，郑重而热烈",
    keywords: ["石榴", "誓言", "认真", "红", "承诺"],
    description:
      "石榴和蜂蜜酿出的酒浓郁、酸甜分明，颜色郑重得像一句认真说出口的承诺。它不轻浮，喝的时候会让人想认真对待点什么：一段关系、一个目标、一个对自己的约定。适合写誓言、写承诺、写那种愿意为此负责的郑重心情。",
    writingPrompt: "写一个你愿意认真兑现的承诺，对别人或对自己。",
    glass: "wine",
    palette: {
      liquid: "#B02E3E",
      liquidDark: "#7C1826",
      liquidLight: "#D45A68",
      glass: GLASS_WARM,
    },
    garnish: "berry",
    fill: 0.6,
  },

  // ---------------- 啤酒 ----------------
  {
    slug: "rooftop-wheat",
    name: "天台麦浪",
    category: "beer",
    abv: 5,
    taste: "小麦啤的柔滑，香蕉与丁香的清香，顺口",
    keywords: ["天台", "放松", "朋友", "麦浪", "夏夜"],
    description:
      "小麦啤柔滑、泡沫绵密，带一点点香蕉和丁香的香气，非常顺口，像下班后和朋友爬到天台，风一吹，整天的紧绷都松了。它不追求复杂，只负责让你放松下来、笑出来。适合写朋友、写夏夜、写卸下一天疲惫的轻松时刻。",
    writingPrompt: "写一个和朋友在天台放松、把疲惫交给风的夜晚。",
    glass: "mug",
    palette: {
      liquid: "#F2C14A",
      liquidDark: "#D99A28",
      liquidLight: "#FBDF8E",
      glass: GLASS_WARM,
      foam: "#FBF6EA",
    },
    garnish: "bubble",
    fill: 0.8,
  },
  {
    slug: "stout-night-cap",
    name: "黑啤睡帽",
    category: "beer",
    abv: 7,
    taste: "世涛的咖啡与黑巧，醇厚微苦，像睡前故事",
    keywords: ["黑夜", "咖啡", "独处", "睡前", "醇厚"],
    description:
      "深色世涛浓郁、绵密，有咖啡和黑巧克力的味道，一点点苦，最后是暖的，像睡前给自己戴上的一顶柔软睡帽。它适合一天结束时独处：回味今天发生的事，和自己道一声晚安。适合写睡前的思绪、写独处、写一个温柔收尾的一天。",
    writingPrompt: "写你入睡前回想今天时，最想留住的一个瞬间。",
    glass: "mug",
    palette: {
      liquid: "#3A2A24",
      liquidDark: "#211612",
      liquidLight: "#5C463C",
      glass: GLASS_WARM,
      foam: "#E8DCCB",
    },
    garnish: "bubble",
    fill: 0.8,
  },
  {
    slug: "ipa-summer-lightning",
    name: "苦夏闪电",
    category: "beer",
    abv: 6,
    taste: "IPA 明显的啤酒花苦，柑橘松针香，爽快",
    keywords: ["夏天", "痛快", "雷雨", "苦后回甘", "释放"],
    description:
      "IPA 有明显的苦和浓郁的柑橘、松针香气，像盛夏一场突如其来的雷阵雨，先是刺眼的闪电和闷雷，随后大雨倾盆，把闷热冲得一干二净，留下清凉。它关于先苦后爽的释放。适合写痛快、写情绪的宣泄、写一场来得急、去得快的心情风暴。",
    writingPrompt: "写一次像夏日雷雨一样、来得急又让人痛快的情绪释放。",
    glass: "mug",
    palette: {
      liquid: "#D8922E",
      liquidDark: "#A8651A",
      liquidLight: "#F0BC62",
      glass: GLASS_WARM,
      foam: "#FBF6EA",
    },
    garnish: "bubble",
    fill: 0.8,
  },
  {
    slug: "cherry-blush-ale",
    name: "樱桃脸红艾尔",
    category: "beer",
    abv: 4,
    taste: "樱桃果酸与淡啤的清爽，微甜、易脸红",
    keywords: ["樱桃", "微醺", "脸红", "轻松", "可爱"],
    description:
      "加了樱桃的淡色艾尔，果酸清爽、微微甜，度数不高，却很容易喝着喝着就脸红起来。它没有负担，像和喜欢的人轻松聊天，说着说着就笑了、脸也烫了。适合写轻松可爱的微醺时刻、写简单的快乐、写一点点心动。",
    writingPrompt: "写一个让你轻松笑出来、又悄悄脸红的微醺时刻。",
    glass: "mug",
    palette: {
      liquid: "#C85A52",
      liquidDark: "#9A3832",
      liquidLight: "#E38A80",
      glass: GLASS_WARM,
      foam: "#FBEAE6",
    },
    garnish: "cherry",
    fill: 0.8,
  },
  {
    slug: "pilsner-after-work",
    name: "下班皮尔森",
    category: "beer",
    abv: 4.5,
    taste: "干净清爽的麦香与淡淡苦，第一口最解乏",
    keywords: ["下班", "解乏", "日常", "第一口", "小确幸"],
    description:
      "皮尔森干净、清爽，麦香里有恰到好处的一点点苦，最妙的是忙完一天后的第一口，仿佛所有疲惫都随那口气松掉。它关于日常里最朴素的奖赏：不必特别，能安心停下来就很好。适合写日常、写下班、写生活中那些小小的确定的幸福。",
    writingPrompt: "写忙碌一天后，那一口让你觉得『值了』的放松。",
    glass: "mug",
    palette: {
      liquid: "#E8B73E",
      liquidDark: "#C08E22",
      liquidLight: "#F6DA86",
      glass: GLASS_WARM,
      foam: "#FBF6EA",
    },
    garnish: "bubble",
    fill: 0.82,
  },
];

export function getDrink(slug?: string | null): Drink | undefined {
  if (!slug) return undefined;
  return DRINKS.find((d) => d.slug === slug);
}

export function getCategoryLabel(id: DrinkCategory): string {
  return DRINK_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function listDrinks(): Drink[] {
  return DRINKS;
}

/** 一句话标签（用于卡片） */
export function drinkTagline(d: Drink): string {
  return d.taste;
}

/** 写作提示（对外统一命名） */
export function drinkPrompt(d: Drink): string {
  return d.writingPrompt;
}

/** 像素渲染所需的视觉描述 */
export function drinkVisual(d: Drink): {
  glass: GlassType;
  garnish: GarnishType;
  fill: number;
  colors: DrinkPalette;
} {
  return {
    glass: d.glass,
    garnish: d.garnish,
    fill: d.fill,
    colors: d.palette,
  };
}

/** 分类中文名 */
export function drinkCategoryLabel(d: Drink): string {
  return getCategoryLabel(d.category);
}

/** AICG 配图 URL（生成图存于 /bar-images/<slug>.png） */
export function drinkImage(d: Drink): string {
  return `/bar-images/${d.slug}.png`;
}

/** 酒吧氛围背景图 URL */
export function barBackgroundImage(): string {
  return "/bar-bg.jpg";
}
