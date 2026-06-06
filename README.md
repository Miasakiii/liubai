# 留白 — AI 健康留白系统

> 唯一一个希望你少用的健康 App。

## 项目简介

「留白」是一个 AI 健康留白系统，聚焦现代人最隐蔽的健康问题——**健康焦虑**。

所有健康产品都在做"加法"：加提醒、加指标、加打卡、加社交。但真正让人不健康的，恰恰是"过度关注"本身。留白做减法：帮你从焦虑中解脱，只在真正需要的时候介入。

## 核心特性

- **极简情绪输入** — 5 个表情 + "不想说"选项，3 秒完成
- **AI 温暖回应** — 不追问、不评判、不给建议，只给一个不需要努力的微行动
- **呼吸引导** — 4-7-8 节奏可视化引导
- **白噪音播放** — 雨声、海浪、壁炉、风铃、深夜书店
- **情绪日历** — emoji 热力图 + 温暖的月度总结
- **无压力设计** — 没有打卡、没有排名、没有推送轰炸

## 技术架构

```
前端：单页 Web App（HTML + CSS + JS）
后端：Node.js 轻量服务
AI：  LLM API（通义千问 / GPT / DeepSeek）
存储：LocalStorage（原型阶段）
```

## 快速启动

### 离线模式（无需 API Key）

```bash
cd src
python3 -m http.server 8080
# 打开 http://localhost:8080
```

### 接入真实 AI

```bash
cd src

# 设置 API Key（以通义千问为例）
export AI_API_KEY=your-api-key
export AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export AI_MODEL=qwen-plus

# 启动后端
node server.js &

# 启动前端
python3 -m http.server 8080
```

支持任何 OpenAI 兼容 API（通义千问、GPT、DeepSeek、Moonshot 等）。

## 项目结构

```
liubai/
├── src/
│   ├── index.html          ← Web 原型（4 个页面）
│   └── server.js           ← AI 后端服务
├── docs/
│   ├── PROJECT.md          ← 项目方案
│   ├── INTERACTION.md      ← 交互设计文档
│   ├── PPT_FRAMEWORK.md    ← 答辩 PPT 框架
│   ├── DEMO_SCRIPT.md      ← 演示脚本
│   └── 留白-答辩PPT.pptx   ← 答辩 PPT（10 页）
├── prompt/
│   └── AI_PROMPT.md        ← AI 语气设计（4 套 Prompt）
└── README.md
```

## 设计哲学

- **留白** — 大面积空白不是"没设计"，是"设计本身"
- **呼吸** — 所有动画都有呼吸感，不急不慢
- **克制** — 宁可少一个功能，不多一个按钮
