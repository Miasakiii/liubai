import { today } from './storage.js';

// ============ 情绪映射 ============
export const MOOD = {
  great:   { e: '😊', label: '很好' },
  good:    { e: '🙂', label: '还好' },
  neutral: { e: '😐', label: '一般' },
  low:     { e: '😔', label: '不好' },
  bad:     { e: '😫', label: '很累' },
  skip:    { e: '🌙', label: '不说' }
};

export const AUDIO_ICONS = {
  '雨声': '🌧', '海浪': '🌊', '壁炉': '🔥', '风铃': '🎐', '深夜书店': '📚'
};

// ============ 今日一句 ============
export const DAILY_QUOTES = [
  '今天的风，好像有点甜。',
  '不好不坏，也是一种状态。',
  '有些天就是用来浪费的。',
  '不用每天都很好。"还好"已经很努力了。',
  '今天的你，不需要被定义。',
  '给自己三分钟。什么都不用想。',
  '就这样。挺好的。',
  '不想说话的时候，沉默也是一种回答。',
  '不用给自己的心情找原因。它在就好。',
  '去接杯水吧。站着喝，别坐着。',
  '今天的任务只有一个：活着。其他都算赚到。',
  '累了就休息。不是偷懒，是必要的。',
  '你不是机器。机器都需要充电。',
  '坏情绪不是你的错。它只是来了。',
  '你已经做得比你以为的多了。',
  '有些天就是比较难。但你会过来的。',
  '平凡的一天，也是只属于你的一天。',
  '好日子不用多。有一条就够记住这个月了。',
  '不想动的话，就坐着。坐着也是一种休息。',
  '做完就去睡。明天的事明天再说。'
];

export function getTodayQuote() {
  const todayKey = today();
  const stored = localStorage.getItem('liubai_quote');
  if (stored) {
    try {
      const { date, index } = JSON.parse(stored);
      if (date === todayKey && DAILY_QUOTES[index]) return DAILY_QUOTES[index];
    } catch {}
  }
  const seed = todayKey.split('-').reduce((a, b) => a + parseInt(b), 0);
  const index = seed % DAILY_QUOTES.length;
  localStorage.setItem('liubai_quote', JSON.stringify({ date: todayKey, index }));
  return DAILY_QUOTES[index];
}

// ============ 情绪歌单 ============
export const MOOD_SONGS = {
  great: [
    { name: '稻香', artist: '周杰伦', query: '稻香 周杰伦' },
    { name: '倔强', artist: '五月天', query: '倔强 五月天' },
    { name: '小幸运', artist: '田馥甄', query: '小幸运 田馥甄' }
  ],
  good: [
    { name: '风吹麦浪', artist: '李健', query: '风吹麦浪 李健' },
    { name: '成都', artist: '赵雷', query: '成都 赵雷' },
    { name: '平凡之路', artist: '朴树', query: '平凡之路 朴树' }
  ],
  neutral: [
    { name: '安和桥', artist: '宋冬野', query: '安和桥 宋冬野' },
    { name: '南山南', artist: '马頔', query: '南山南 马頔' },
    { name: '理想三旬', artist: '陈鸿宇', query: '理想三旬 陈鸿宇' }
  ],
  low: [
    { name: '晴天', artist: '周杰伦', query: '晴天 周杰伦' },
    { name: '后来', artist: '刘若英', query: '后来 刘若英' },
    { name: '平凡之路', artist: '朴树', query: '平凡之路 朴树' }
  ],
  bad: [
    { name: '夜空中最亮的星', artist: '逃跑计划', query: '夜空中最亮的星 逃跑计划' },
    { name: '海阔天空', artist: 'Beyond', query: '海阔天空 Beyond' },
    { name: '倔强', artist: '五月天', query: '倔强 五月天' }
  ],
  skip: [
    { name: '平凡之路', artist: '朴树', query: '平凡之路 朴树' },
    { name: '安和桥', artist: '宋冬野', query: '安和桥 宋冬野' }
  ]
};

export function getRandomSong(mood) {
  const list = MOOD_SONGS[mood] || MOOD_SONGS.neutral;
  return list[Math.floor(Math.random() * list.length)];
}

// ============ 呼吸类型 ============
export const BREATH_TYPES = {
  '478': {
    name: '4-7-8 呼吸',
    phases: [
      { text: '吸 …', ms: 4000 },
      { text: '屏住 …', ms: 7000 },
      { text: '呼 …', ms: 8000 }
    ],
    rounds: 3,
    circleDuration: 19
  },
  'box': {
    name: '方形呼吸',
    phases: [
      { text: '吸 …', ms: 4000 },
      { text: '屏住 …', ms: 4000 },
      { text: '呼 …', ms: 4000 },
      { text: '屏住 …', ms: 4000 }
    ],
    rounds: 4,
    circleDuration: 16
  },
  'sigh': {
    name: '生理叹息',
    phases: [
      { text: '吸 …', ms: 2000 },
      { text: '再吸一点 …', ms: 1000 },
      { text: '慢慢呼出来 …', ms: 4000 }
    ],
    rounds: 3,
    circleDuration: 7
  }
};

// ============ 音频 URL ============
export const AUDIO_URLS = {
  '雨声': 'audio/雨声.mp3',
  '海浪': 'audio/海浪.mp3',
  '壁炉': 'audio/壁炉.mp3',
  '风铃': 'audio/风铃.mp3',
  '深夜书店': 'audio/深夜书店.mp3',
};

// ============ 漂流瓶数据 ============
export const DRIFT_ANON_TAGS = [
  '某个也醒着的人', '某个路过的人', '某个也在听雨的人',
  '某个今天也不太好的人', '某个刚刚做完呼吸的人',
  '某个还在加班的人', '某个早起的人', '某个还没睡的人',
];

export const DRIFT_CONTENT_POOL = [
  '今天也辛苦了。', '明天会好的。', '你已经很棒了。',
  '深呼吸，没事的。', '今天也好好吃饭了吗？',
  '偶尔停下来也没关系。', '雨会停的。',
  '谢谢你还在坚持。', '今天也辛苦了，早点休息。',
  '世界很大，但此刻只需要安静。', '给自己一个拥抱吧。',
  '不开心的事，睡一觉就过去了。', '你值得被温柔对待。',
  '慢慢来，比较快。', '今天的月亮很好看。',
  '喝杯热水吧。', '你不是一个人。',
  '明天也要好好的。', '一切都会好起来的。',
  '累了就休息，不用勉强。', '今天的风很舒服。',
  '你已经很努力了。', '相信自己。',
  '生活总有不期而遇的温暖。', '愿你被世界温柔以待。',
];

// ============ 节气数据 ============
export const SEASONS = {
  '1-5': { name: '小寒', text: '冷到不想动，那就别动了。' },
  '1-20': { name: '大寒', text: '最冷的时候，春天就不远了。' },
  '2-3': { name: '立春', text: '立春了。不用急着变好，慢慢来。' },
  '2-18': { name: '雨水', text: '下雨了。今天可以慢一点。' },
  '3-5': { name: '惊蛰', text: '春雷响了。万物在苏醒，你也可以慢慢来。' },
  '3-20': { name: '春分', text: '昼夜平分。给自己一点平衡就好。' },
  '4-4': { name: '清明', text: '天清地明。适合发呆，适合想念。' },
  '4-19': { name: '谷雨', text: '谷雨过后，夏天就不远了。再撑一撑。' },
  '5-5': { name: '立夏', text: '立夏了。热了就少穿点，累了就少做点。' },
  '5-20': { name: '小满', text: '小满就好，不必大满。今天慢慢来。' },
  '6-5': { name: '芒种', text: '忙的时候，也别忘了喝口水。' },
  '6-21': { name: '夏至', text: '今天最长。多出来的光，留给自己。' },
  '7-6': { name: '小暑', text: '热到什么都不想做，那就什么都不做。' },
  '7-22': { name: '大暑', text: '最热的时候，照顾好自己。' },
  '8-7': { name: '立秋', text: '秋天来了。适合慢下来。' },
  '8-22': { name: '处暑', text: '暑气渐消。晚风会凉一点。' },
  '9-7': { name: '白露', text: '白露了。早起记得加件衣服。' },
  '9-22': { name: '秋分', text: '又是平分的一天。不多不少，刚刚好。' },
  '10-8': { name: '寒露', text: '天凉了。喝杯热的吧。' },
  '10-23': { name: '霜降', text: '霜降了。照顾好自己的小世界。' },
  '11-7': { name: '立冬', text: '冬天来了。适合窝着，适合发呆。' },
  '11-22': { name: '小雪', text: '下雪了。今天的安静，刚刚好。' },
  '12-6': { name: '大雪', text: '大雪的日子，什么都不用做。' },
  '12-21': { name: '冬至', text: '冬至了。今天最长的夜，明天会亮得更早。' }
};

// ============ 离线回应库 ============
export const OFFLINE_RESPONSES = {
  great: [
    { text: '嘿，看起来今天状态不错。\n\n趁着心情好，出门走走吧。不用走远，楼下的风就够。\n\n好天气别浪费。去吧。', action: 'none' },
    { text: '嗯，今天挺好。\n\n把这个感觉记住。下次不好的时候，想想今天。\n\n好了，去做你的事吧。', action: 'none' },
    { text: '好日子不用多。有一条就够记住这个月了。\n\n去见一个想见的人吧。不用约，直接去。\n\n去吧。', action: 'none' }
  ],
  good: [
    { text: '还好就好。\n\n去接杯水吧。站着喝，别坐着。\n\n就这样。下午见。', action: 'none' },
    { text: '不好不坏，也是一种不错。\n\n站起来伸个懒腰，把肩膀松一松。\n\n够了，去忙吧。', action: 'none' },
    { text: '今天没什么特别的。但你来了，这就够了。\n\n给自己三分钟。什么都不用想。\n\n就这样。', action: 'none' }
  ],
  neutral: [
    { text: '不说话也没关系。\n\n我帮你留了一段安静。90 秒，什么都不用做。\n\n听就行。', action: 'audio:雨声' },
    { text: '不想说就不说。\n\n深呼吸三次，跟着节奏：吸……屏住……呼。\n\n好了，今天的沉默就留在这里。', action: 'breathe' },
    { text: '不想说话的时候，沉默也是一种回答。\n\n去看看窗外。天在，云在，你也在。\n\n就这样吧。', action: 'none' }
  ],
  low: [
    { text: '嗯，不太好也没关系。\n\n不用解释原因。\n\n我帮你留了一段雨声。90 秒，什么都不用做，听就行。', action: 'audio:雨声' },
    { text: '今天有点沉吧。\n\n站起来走到窗边，看 30 秒远处。我等你。\n\n回来了？嗯，今天的"不好"就留在这里。明天见。', action: 'none' },
    { text: '今天的不好，就留在今天。\n\n你不需要振作。现在这样就够好了。\n\n明天见。', action: 'none' }
  ],
  bad: [
    { text: '今天挺累的吧。\n\n别撑了。深呼吸三次，跟着这个节奏：吸……屏住……呼。\n\n做完就去休息。明天的事明天再说。晚安。', action: 'breathe' },
    { text: '嗯，我看到了。\n\n不需要解释，不需要坚强。\n\n听一段海浪声吧。什么都不用想。90 秒就好。', action: 'audio:海浪' },
    { text: '累了就休息。不是偷懒，是必要的。\n\n你不是机器。机器都需要充电。\n\n去做就去睡。明天的事明天再说。', action: 'audio:壁炉' }
  ],
  skip: [
    { text: '好的，不说也行。\n\n今天就安静待一会儿。\n\n我在这里，不走。明天见。', action: 'none' },
    { text: '嗯。\n\n有时候什么都不想说，就是一种回答。\n\n去忙你的吧。', action: 'none' },
    { text: '嗯，那就待一会儿。\n\n有些感受不需要被说出来。它在就好。\n\n就这样。', action: 'none' }
  ]
};
