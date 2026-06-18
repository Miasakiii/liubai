# 留白 — AI 健康留白系统

> 唯一一个希望你少用的健康 App。

## 项目简介

「留白」是一个 AI 健康留白系统，聚焦现代人最隐蔽的健康问题——**健康焦虑**。

所有健康产品都在做"加法"：加提醒、加指标、加打卡、加社交。但真正让人不健康的，恰恰是"过度关注"本身。留白做减法：帮你从焦虑中解脱，只在真正需要的时候介入。

## 核心特性

- **极简情绪输入** — 5 个表情 + "不想说"选项，3 秒完成
- **AI 温暖回应** — 不追问、不评判、不给建议，只给一个不需要努力的微行动
- **呼吸引导** — 4-7-8 / 方形呼吸 / 生理叹息，3 种节奏可视化
- **白噪音播放** — 雨声、海浪、壁炉、风铃、深夜书店
- **情绪日历** — emoji 热力图 + 温暖的月度总结
- **今日一句** — 每天打开随机展示一句温暖的话
- **情绪歌单** — 根据情绪推荐歌曲，跳转外部播放器
- **天气感知** — 接入天气 API，AI 回应结合当前天气
- **内容收藏** — 收藏喜欢的句子和推荐
- **节气关怀** — 二十四节气专属温暖文案
- **晚安模式** — 晚 10 点后自动切换深色安静界面
- **情绪树洞** — 写下心情，只对自己可见
- **漂流瓶** — 匿名写一句话，每天扔 1 个捡 3 个
- **社群暗示** — "今天有 327 人也选择了听雨声"，安静陪伴
- **情绪温度计** — 首页显示本周情绪温度（0-100°）
- **月度回顾** — 每月 1 日自动生成温暖回顾
- **情绪趋势** — 饼图 + 折线图，本周/本月维度，温暖文字解读
- **7 天留白练习** — 引导式冥想/呼吸课程，每天 2 分钟
- **情绪日记** — 500 字长文书写，AI 温暖回应
- **云端同步** — 数据自动同步到 Supabase，换设备不丢失
- **原生 Android APP** — Capacitor 构建，独立安装使用
- **无压力设计** — 没有打卡、没有排名、没有推送轰炸

## 技术架构

```text
前端：单页 Web App（HTML + CSS + JS 原生 ES Modules）
后端：Node.js 轻量服务（PM2 进程管理）
AI：  LLM API（通义千问 / GPT / DeepSeek）
存储：LocalStorage + Supabase 云端同步（匿名登录，无需注册）
部署：Nginx 反向代理 + Let's Encrypt HTTPS
移动端：Capacitor 原生 Android 打包
```

### 模块化结构

```text
src/
├── index.html              ← 纯 HTML 结构（5 个页面 + 5 个底部导航）
├── styles/
│   └── main.css            ← 全部样式（含趋势/练习/日记页面）
├── js/
│   ├── config.js           ← API 地址、Supabase 配置、Storage key
│   ├── storage.js          ← LocalStorage 读写 + 云端同步
│   ├── supabase.js         ← Supabase 客户端、匿名登录、数据迁移
│   ├── data.js             ← 静态数据（情绪、歌单、节气、离线文案）
│   ├── ui.js               ← 页面切换、日历、晚安模式
│   ├── features.js         ← 呼吸引导、音频、树洞、漂流瓶、社群暗示
│   ├── features2.js        ← 趋势图表、7 天练习、情绪日记
│   ├── ai.js               ← AI 回应、天气、月度回顾
│   └── app.js              ← 主入口、事件绑定、初始化
├── server.js               ← AI 后端服务
└── audio/                  ← 白噪音音频文件
```

## 快速启动

### 一键启动（Windows）

```bash
start.bat
```

### 手动启动

```bash
# 离线模式（无需 API Key）
cd src
python -m http.server 8080

# 接入真实 AI（.env 已配置）
cd src
node server.js &        # AI 后端（端口 3001）
python -m http.server 8080  # 前端（端口 8080）
```

### 云端同步（Supabase）

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 执行 `docs/SUPABASE_SCHEMA.sql`
3. 在 Authentication → Providers 启用 **Anonymous sign-ins**
4. 复制 `src/js/config.example.js` 为 `src/js/config.js`
5. 在 `config.js` 填入你的 Project URL 和 anon key

## 服务器部署

```bash
# 上传代码到服务器
scp -r src/* root@your-server:/www/wwwroot/liubai/src/
scp src/server.js root@your-server:/www/wwwroot/liubai/src/

# SSH 连接服务器
ssh root@your-server

# 安装依赖并启动
cd /www/wwwroot/liubai
npm install
pm2 start src/server.js --name liubai-api
pm2 save
```

Nginx 配置参考 `deploy/nginx.conf`。

## 构建 Android APK

```bash
# 安装 Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 初始化 Capacitor
npx cap init "留白" com.liubai.app --web-dir src

# 添加 Android 平台
npx cap add android

# 同步代码并构建
npx cap sync android
cd android
./gradlew assembleDebug

# APK 输出路径
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 设计哲学

- **留白** — 大面积空白不是"没设计"，是"设计本身"
- **呼吸** — 所有动画都有呼吸感，不急不慢
- **克制** — 宁可少一个功能，不多一个按钮

## 许可证

MIT
