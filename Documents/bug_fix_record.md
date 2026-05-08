# LWQX 3.0 Bug 修复与项目归档记录

## 1. 待部署云函数清单
经过对项目 `cloudfunctions` 目录的扫描，项目中包含22个云函数。初始阶段和核心业务流最关键的需要优先部署以下云函数：

**核心业务/用户端（建议全部一键上传并部署）：**
- `cf-get-config` / `get_system_config`: 系统级全局配置。
- `cf-feed-data` / `get_discover_feed` / `get_ttl_feed`: 首页与发现页的信息流加载。
- `cf-coupon-search`: 核心查券逻辑（探针触发后调用）。
- `cf-convert-link` / `parse_and_convert`: 淘宝/京东等链接转链解析。
- `cf-product-detail`: 商品详情获取。
- `cf-get-showcase` / `cf-sync-showcase`: 首页推荐坑位。
- `update_user_profile`, `get_user_assets`, `get_user_stats`: 用户信息与资产积分模块。
- `claim_order`, `get_orders`, `sync_tk_orders`, `fix_old_orders`: 订单同步与找回模块。
- `expire_points`, `generate_promo_link`: 杂项与推广功能。

**管理端：**
- `admin_api`, `cf-admin-api`

*建议：在微信开发者工具中，右键 `cloudfunctions` 文件夹，选择【同步云函数列表】，然后将上述核心函数右键选择【上传并部署：云端安装依赖(不上传node_modules)】。*

## 2. 小程序端空白页面 Bug 排查过程

### 现象
用微信开发者工具打开小程序端，首页（`pages/index/index`）显示为空白页面。

### 排查步骤
1. **环境检查**：检查 `app.js`，当前配置的云环境为 `cloud1-9ggm1mvv7a25a4cb`。若该环境未在开发者工具中选中或不存在，会导致请求卡死。
2. **样式解析缺失**：检查 `app.wxss` 发现，小程序试图使用 TailwindCSS 的原子类（例如 `pt-10`, `px-4`, `min-h-screen`, `mb-8` 等），但 `app.wxss` 里只“纯手工提纯”了一小部分类。大量样式类并未被定义，可能导致高度塌陷或文字不可见，从而在视觉上呈现“空白”。
3. **Npm 依赖**：检查了 `miniprogram/package.json`，暂无三方库依赖，排除了未构建 npm 导致的白屏（目前并没有使用 Vant 或其他需要构建 npm 的组件）。
4. **生命周期异常**：首页 `index.js` `onLoad` 和 `onShow` 执行了 `checkClipboard`，调用了 `../../utils/clipboard` 等。如果这些方法抛出未捕获的错误或阻断渲染，也可能导致白屏。

### 修复计划
1. [ ] 确认并在开发者工具中正确切换云开发环境。
2. [x] 补全 `app.wxss` 中缺失的基础样式（已手工追加高度、内边距、背景色、文字大小、flex布局等50多个 Tailwind 类）。
3. [x] 修复 `community.wxss` 编译错误：微信小程序不支持在 class 名称中使用反斜杠（如 `left-1\/2`）。已全局替换项目中使用的 `/` 类名（如 `1/2` 改为 `half`，`/80` 改为 `-80`），消除 WXSS 编译报错导致的全局白屏。
4. [ ] 调试 `pages/index/index`，查看 Console 中是否有其他具体的报错信息。
