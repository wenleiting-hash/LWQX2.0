# Design System: LWQX 3.0 (小栗鼠导购极速版)
**Project Title:** 纯净全网优惠辅助工具小程序
**Project Architecture:** 5-Tab 扁平架构 (首页/发现/榜单/社区/我的)

## 1. Visual Theme & Atmosphere
**“克制、聚焦、高刺激” (Restrained, Focused, High-Stimulus)**
小栗鼠 3.0 的视觉语言彻底摈弃了传统返利 App “复杂、冗余、强引导注册” 的重资产风格，转向类似 Google Search 的**“纯粹工具”**氛围。首屏大面积留白以突显核心搜索入口；而在Feed流和商品卡片上，则使用高对比度的红黄渐变和醒目的“省钱标签”来营造** FOMO（错失恐惧）**的购物刺激感。整体传递出“即来即用、查完即走、买完即省”的轻薄体验。

## 2. Color Palette & Roles

*   **Primary Brand (活力栗橙)** - `#FF5500` 到 `#FF3300` 的渐变
    *   *功能*: 绝对的视觉焦点。用于【查券】主按钮、价格高亮、核心操作以及渐变背景（Navbar的沉浸式橙色渐变）。
*   **Secondary Brand (京东专属红)** - `#E4393C`
    *   *功能*: 用于区分京东生态数据。如京东的“满减/PLUS”特殊角标渲染，与淘宝的橙色形成明显平台区隔。
*   **Background (极简冰灰)** - `#F7F7F7` 或 `#F5F5F5`
    *   *功能*: 全局底层背景色。用来将白色的内容卡片（Cards）衬托出清爽的层次感。
*   **Surface (纯净白)** - `#FFFFFF`
    *   *功能*: 商品卡片、底部导航栏和弹窗的主容器色。
*   **Text (深邃黑/次要灰)** - `#111827` (Text-Gray-900) / `#6B7280` (Text-Gray-500)
    *   *功能*: 文本层级控制。标题和现价采用高对比度颜色，原价和状态说明使用次要灰。

## 3. Typography Rules

*   **Font Family**: 优先使用微信小程序系统原生无衬线字体 (`-apple-system`, `BlinkMacSystemFont`, `PingFang SC`, `Helvetica Neue`, `sans-serif`)。
*   **Weight & Hierarchy**:
    *   **大宗金额 (Price)**: `font-bold` 或 `font-black` (700-900)，伴随 `text-lg` 或更大，构成绝对视觉核心。
    *   **商品标题 (Title)**: `font-medium` (500) 配合 `line-clamp-2` (两行截断)，保证卡片高度一致。
    *   **描述小字 (Specs/Stats)**: `font-normal` (400) 配合 `text-[10px]` 到 `text-xs`，用于展示“已售量”、“时效”等辅助数据。

## 4. Component Stylings

*   **Buttons (按钮主体)**: 
    *   **主功能键（如查券、领券购买）**: 饱满的长条圆角矩形 (`rounded-lg` 或 `rounded-xl`)，无描边，填充 `Primary Brand`。点击交互带有极短促的缩小回弹 (`active:scale-95`)以增强敲击手感。
    *   **Tab 胶囊键**: 在榜单和发现页的横向导航使用小巧的药丸状 (`rounded-full`)，未选中状态为低饱和度背景，选中后背景反转并投影。
*   **Cards/Containers (商品与动态卡片)**: 
    *   **圆角与质感**: 温润的边缘 (`rounded-xl` / 12px-16px)，纯白背景 (`bg-white`)。
    *   **深度**: 极其克制的边缘阴影 (`shadow-sm`)，甚至直接使用 `border-gray-100` 微距描边替代阴影，以保障信息流滚动时的极致顺滑。
*   **Badges (特殊标签/提示)**: 
    *   **省钱提示/角标**: 微型药丸 (`rounded-full`)或平滑多边形，采用对应平台的背景色配合小字体（如 `text-[9px]`）进行修饰。例如京东的 `[PLUS再省]` 或 `[京贴]`。

## 5. Layout Principles

*   **统一安全区域**: 底部留足 `pb-24` (约 96px) 或 `pb-safe`，防止微信底部原生控制条/全面屏黑线遮挡核心交互，适配异形屏。
*   **首页 (Home) - 居中阵列**: 聚焦视觉重心，顶部极简 Logo，中心直接大面积承载搜索与剪贴板识别流，下半区展示 3 步教程横幅。没有任何让人分心的其它入口。
*   **信息流区 (Discover/Rankings) - 双列瀑布流 / 卡片堆叠**:
    *   发现页使用标准化 `grid-cols-2` 瀑布流，图片容器比例 `aspect-square`（1:1 或带轻微长高），保持节奏紧凑。
    *   热榜页使用横向卡片布局（左图 24x24，右详情），强调整体数据的对比（排名/销量/火爆指数）。
*   **全屏详情推入 (Detail Full-Screen Transition)**: 
    *   摒弃原有的 Half-Bottom-Sheet，点击商品后直接由右至左或者自下而上推入**完整全屏**层（带有顶部原生后退条）。全屏化让京东复杂的 `PLUS`、`满减`、`叠加券` 计算逻辑得到从容展现。
*   **动态交互 (Micro-interactions)**:
    *   所有的 Toast 提示必须带有明确的物理反馈（如："正在全网搜寻原款..."）。
    *   盲盒弹幕流（Community）采用交替呼吸显隐，模拟真实电商系统的出单吞吐动作。
