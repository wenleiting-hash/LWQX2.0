# 🔌 小栗鼠 LWQX 3.0 — 前后端 API 接口契约

| 字段 | 内容 |
| :--- | :--- |
| **版本** | v1.1 |
| **更新日期** | 2026-04-27 |
| **维护角色** | 🏗️ Architect Agent |
| **依据文档** | 蓝图 §三、§七.2、PRD-07 |

> 📌 **本文档是前后端的唯一接口依据**。Cloud Engineer 按此编写云函数，MiniApp/Admin Engineer 按此调用。任何变更必须先更新本文并经 Architect 审批。

---

## 统一调用入口

所有云函数调用**必须通过 `utils/api.js` 封装层**，禁止页面直接写 `wx.cloud.callFunction`。

```javascript
// utils/api.js — 统一调用层（蓝图 §七.2）
const callCloud = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    if (res.result.code !== 0) {
      wx.showToast({ title: res.result.message, icon: 'none' })
      return null
    }
    return res.result.data
  } catch (err) {
    wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    return null
  }
}

module.exports = {
  searchCoupon: (params) => callCloud('cf-coupon-search', params),
  convertLink: (params) => callCloud('cf-convert-link', params),
  getFeedData: (params) => callCloud('cf-feed-data', params),
  getConfig: (keys) => callCloud('cf-get-config', { keys }),
  getProductDetail: (tao_id, platform) => callCloud('cf-product-detail', { tao_id, platform }),
}
```

---

## 统一响应格式

### 成功
```json
{
  "code": 0,
  "data": { ... }
}
```

### 失败
```json
{
  "code": -1,
  "message": "用户友好文案（严禁暴露技术细节）"
}
```

### 全局错误码

| code | 含义 | 前端处理 |
| :---: | :--- | :--- |
| `0` | 成功 | 取 `data` 渲染 |
| `-1` | 服务端通用错误 | Toast `message` |
| `-2` | 请求超时 | Toast "查询超时，请重试" |
| `-3` | 无结果 | 展示空状态占位图 |
| `-4` | 参数校验失败 | Toast `message` |

---

## API 1: `cf-coupon-search` — 优惠券搜索

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-07 REQ-0701 |
| **前端调用** | `api.searchCoupon(params)` |
| **触发场景** | 首页搜索框、剪贴板探针、分类筛选 |

### 入参

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `query` | string | ✅ | — | 搜索内容（淘口令/关键词/商品链接） |
| `query_type` | string | ✅ | — | `"tkl"` / `"keyword"` / `"url"` |
| `platform` | string | ❌ | `"auto"` | `"taobao"` / `"jd"` / `"auto"` |
| `page` | number | ❌ | `1` | 页码 |
| `page_size` | number | ❌ | `20` | 每页数量（最大 50） |

### 出参 `data`

| 字段 | 类型 | 说明 |
| :--- | :---: | :--- |
| `items` | array | 商品列表（见 **商品对象 Item**） |
| `total` | number | 总结果数 |
| `page` | number | 当前页码 |

### 商品对象 `Item`（全局统一，所有返回商品列表的接口共用）

| 字段 | 类型 | 必有 | 说明 |
| :--- | :---: | :---: | :--- |
| `tao_id` | string | ✅ | 商品 ID |
| `title` | string | ✅ | 商品标题 |
| `image_url` | string | ✅ | 商品主图 |
| `original_price` | number | ✅ | 原价 |
| `coupon_amount` | number | ✅ | 优惠券面额 |
| `coupon_price` | number | ✅ | 券后价 |
| `platform` | string | ✅ | `"taobao"` / `"jd"` |
| `shop_name` | string | ✅ | 店铺名 |
| `sales_num` | number | ✅ | 销量 |
| `commission_rate` | number | ❌ | 佣金比率（仅云函数内部使用，**不返回前端**） |

### 底层 API 映射逻辑 (ZTK)

云函数 `cf-coupon-search` 会根据 `query_type` 和 `platform` 动态分发到不同的折淘客底层 API：

| 查询类型 (`query_type`) | 平台 (`platform`) | 折淘客底层接口验证 | 接口地址 |
| :--- | :--- | :--- | :--- |
| **`keyword`** (关键词搜索) | `taobao` 或 `auto` | **全网搜索商品API接口** (淘券查询) | `https://api.zhetaoke.com:10003/api/api_quanwang.ashx` |
| **`keyword`** (关键词搜索) | `jd` | **全网搜索商品API接口** (京券查询) | `http://api.zhetaoke.com:20000/api/api_quanwang.ashx` |
| **`tkl` / `url`** (解析查券) | `taobao` | **批量高佣转链API** (自带解析能力) | `https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian_tkl_piliang.ashx` |

> 📌 **注：** 京东链接的直达跳转逻辑在客户端直接唤起京东小程序拦截，不走此接口；因此该接口目前的链接/口令解析模式主要针对淘宝。

### 前端调用示例

```javascript
const api = require('../../utils/api')

// 关键词搜索
const data = await api.searchCoupon({
  query: '运动鞋',
  query_type: 'keyword',
  platform: 'auto',
  page: 1,
  page_size: 20
})
if (data) {
  this.setData({ productList: data.items, total: data.total })
}
```

---

## API 2: `cf-convert-link` — 高佣转链

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-07 REQ-0702 |
| **前端调用** | `api.convertLink(params)` |
| **触发场景** | 商品详情页点击"领券"按钮 |

### 入参

| 参数 | 类型 | 必填 | 说明 |
| :--- | :---: | :---: | :--- |
| `tao_id` | string | ✅ | 商品 ID |
| `platform` | string | ✅ | `"taobao"` / `"jd"` |

### 出参 `data`

| 字段 | 类型 | 说明 |
| :--- | :---: | :--- |
| `coupon_click_url` | string | 领券链接（淘宝/京东通用） |
| `tkl` | string | 淘口令（仅淘宝，京东为空） |
| `short_url` | string | 短链（仅京东，淘宝为空） |
| `coupon_price` | number | 券后价 |
| `original_price` | number | 原价 |

### 前端调用示例

```javascript
const data = await api.convertLink({
  tao_id: '655789123',
  platform: 'taobao'
})
if (data) {
  // 复制淘口令到剪贴板
  wx.setClipboardData({ data: data.tkl })
  // 打开领券链接
  // wx.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(data.coupon_click_url)}` })
}
```

---

## API 3: `cf-feed-data` — 榜单/信息流

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-07 REQ-0703 |
| **前端调用** | `api.getFeedData(params)` |
| **触发场景** | 发现页金刚入口、热榜 Tab 切换 |

### 入参

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `feed_type` | string | ✅ | — | 信息流类型（见枚举表） |
| `platform` | string | ❌ | `"both"` | `"taobao"` / `"jd"` / `"both"` |
| `page` | number | ❌ | `1` | 页码 |
| `page_size` | number | ❌ | `20` | 每页数量 |
| `cid` | string | ❌ | `""` | 分类 ID（可选筛选） |

### `feed_type` 枚举

| 值 | 含义 | 适用平台 |
| :--- | :--- | :---: |
| `hot_2h` | 2 小时热销 | 淘宝/京东 |
| `realtime` | 实时线报 | 淘宝/京东 |
| `all_day` | 全天精选 | 淘宝/京东 |
| `monthly` | 月度好物 | 淘宝/京东 |
| `pyq` | 朋友圈好物 | 淘宝/京东 |
| `jd_self` | 京东自营 | 仅京东 |
| `jd_good_store` | 京东好店 | 仅京东 |
| `jd_pingou` | 京东拼购 | 仅京东 |
| `jd_delivery` | 京东配送 | 仅京东 |
| `coupon_hall` | 优惠券大厅 | 淘宝/京东 |
| `cheap_99` | 9.9 包邮 | 淘宝/京东 |
| `cheap_199` | 19.9 包邮 | 淘宝/京东 |
| `juhuasuan` | 聚划算 | 淘宝/京东 |
| `brand` | 品牌精选 | 淘宝/京东 |

### 出参 `data`

同 `cf-coupon-search`，返回 `{ items: Item[], total, page }`。

### 前端调用示例

```javascript
const data = await api.getFeedData({
  feed_type: 'hot_2h',
  platform: 'taobao',
  page: 1,
  page_size: 20
})
if (data) {
  this.setData({ feedList: data.items })
}
```

---

## API 4: `cf-get-config` — 全局配置读取

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-07 §7.6.1 |
| **前端调用** | `api.getConfig(keys)` |
| **触发场景** | App.onLaunch、需要读取配置的任意页面 |

### 入参

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `keys` | array\<string\> | ❌ | 全部返回 | 指定需要的配置项 |

### 出参 `data`（前端可见字段）

| 字段 | 类型 | 说明 |
| :--- | :---: | :--- |
| `theme_color` | string | 品牌主色 |
| `nickname_pool` | array\<string\> | 昵称池 |
| `service_qrcode_url` | string | 客服二维码 URL |
| `announcement` | object | 公告配置 `{ enabled, title, content }` |
| `review_mode` | object | 审核模式 `{ enabled, reason }` |

> 🔴 **`ztk_appkey`、`taobao_pid`、`jd_appkey`、`jd_secret` 严禁出现在此响应中**

### 前端调用示例

```javascript
// App.onLaunch 中
const config = await api.getConfig(['theme_color', 'announcement', 'review_mode'])
if (config) {
  this.globalData.config = config
  if (config.review_mode.enabled) {
    // 进入审核降级模式
  }
}
```

---

## API 5: `cf-product-detail` — 商品详情

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-02 |
| **前端调用** | `api.getProductDetail(tao_id, platform)` |
| **触发场景** | 商品详情页 `onLoad` |

### 入参

| 参数 | 类型 | 必填 | 说明 |
| :--- | :---: | :---: | :--- |
| `tao_id` | string | ✅ | 商品 ID |
| `platform` | string | ✅ | `"taobao"` / `"jd"` |

### 出参 `data`

| 字段 | 类型 | 说明 |
| :--- | :---: | :--- |
| `tao_id` | string | 商品 ID |
| `title` | string | 商品标题 |
| `image_url` | string | 商品主图 |
| `images` | array\<string\> | 详情图列表 |
| `original_price` | number | 原价 |
| `coupon_amount` | number | 优惠券面额 |
| `coupon_price` | number | 券后价 |
| `platform` | string | 平台 |
| `shop_name` | string | 店铺名 |
| `sales_num` | number | 销量 |
| `coupon_start_time` | string | 券有效期开始 |
| `coupon_end_time` | string | 券有效期结束 |
| `coupon_remain` | number | 券剩余数量 |
| `description` | string | 商品描述/卖点 |

### 前端调用示例

```javascript
// pages/detail/detail.js
onLoad(options) {
  const { tao_id, platform } = options
  this.loadDetail(tao_id, platform)
},
async loadDetail(tao_id, platform) {
  const data = await api.getProductDetail(tao_id, platform)
  if (data) {
    this.setData({ detail: data })
  }
}
```

---

## API 6: `cf-sync-showcase` — 晒单定时同步（无前端调用）

| 字段 | 说明 |
| :--- | :--- |
| **对应 PRD** | PRD-07 §7.6.4 |
| **前端调用** | ❌ 无，定时触发器自动执行 |
| **触发方式** | 定时触发器（每 5 分钟） |

### 执行流程

```
1. 读取 system_config.ztk_appkey
2. 调用折淘客 open_dingdanchaxun2 获取最近 10 分钟订单
3. 从 system_config.nickname_pool 随机取昵称
4. 组装 showcase_events_cache 记录写入
5. 清理 expire_at < Date.now() 的过期记录
```

### 前端读取晒单数据

晒单数据不通过云函数接口读取，**前端直接查询集合**（通过 `utils/api.js` 封装）：

```javascript
// utils/api.js 补充
getShowcaseEvents: async (limit = 20) => {
  const db = wx.cloud.database()
  const res = await db.collection('showcase_events_cache')
    .orderBy('event_timestamp', 'desc')
    .limit(limit)
    .get()
  return res.data
}
```

---

## 发现页 (Discover) 接口调用清单（基于折淘客接口开发表）

根据《折淘客接口开发表.md》，发现页从上到下的功能区域与实际折淘客（ZTK）API 调用映射如下。

**核心设计原则**：发现页所有列表数据（包括金刚区分类列表和底部信息流）均通过云函数 `cf-feed-data` 统一代理调用折淘客 `api_all.ashx` 接口。

### 1. 顶部区域：商品查询（全网查券搜索框）
- **触发**：输入商品关键词进行搜索
- **映射接口**：`cf-coupon-search` ➜ **全网搜索商品API接口** (`api_quanwang.ashx`)
  - **淘券查询**：`https://api.zhetaoke.com:10003/api/api_quanwang.ashx`
  - **京券查询**：`http://api.zhetaoke.com:20000/api/api_quanwang.ashx`
  - **参数验证**：`q={keyword}`
- **说明**：发现页顶部的搜索纯粹是为了“找商品”，只处理普通关键词搜索（传递 `query_type: 'keyword'`），**不需要像首页那样做淘口令/京东链接的智能解析**。它会跳转到 `/pages/search-result/search-result` 获取纯列表结果。

### 2. 中部区域：金刚位（8 大分类）
金刚区的点击行为会路由到 `/pages/categorylist/categorylist`，由该页面根据 `title` 映射为 `feed_type` 并调用 `cf-feed-data` ➜ **折淘客 `api_all.ashx`**。

| 页面栏目 (title) | 映射的 feed_type | 折淘客底层 API | 平台及传参 | 实际底层接口调用地址 |
| :--- | :--- | :--- | :--- | :--- |
| **淘宝特卖** | `taoqianggou` | **淘抢购商品API** | 淘宝：`jt=taoqianggou` | `https://api.zhetaoke.com:10001/api/api_all.ashx` |
| **品牌精选** | `pinpai` | **精选品牌商品API** | 淘宝：`pinpai=1`<br>京东：`pinpai=1` | 淘：`https://api.zhetaoke.com:10001/api/api_all.ashx`<br>京：`http://api.zhetaoke.com:20000/api/api_all.ashx` |
| **天猫优选** | `tmall` | **天猫商品API** | 淘宝：`tj=tmall` | `https://api.zhetaoke.com:10001/api/api_all.ashx` |
| **京东自营** | `jd_zy` | **京东自营商品API** | 京东：`owner=g`<br>*(云函数已修正)* | `http://api.zhetaoke.com:20000/api/api_all.ashx` |
| **聚划算** | `ju_hua_suan` | **聚划算商品API** | 淘宝：`jt=juhuasuan` | `https://api.zhetaoke.com:10001/api/api_all.ashx` |
| **京东配送** | `jd_ps` | **京东配送商品API** | 京东：`deliveryType=1`<br>*(云函数已修正)* | `http://api.zhetaoke.com:20000/api/api_all.ashx` |
| **神券大厅** | `coupon_hall` | **全站领券商品API接口** | 淘宝：默认<br>京东：默认 | 淘：`https://api.zhetaoke.com:10001/api/api_all.ashx`<br>京：`http://api.zhetaoke.com:20000/api/api_all.ashx` |
| **特价专区** | `tejia` | **9.9/19.9元商品API** | 淘宝：`price=0.0-9.9`<br>京东：`price=0.0-9.9` | 淘：`https://api.zhetaoke.com:10001/api/api_all.ashx`<br>京：`http://api.zhetaoke.com:20000/api/api_all.ashx` |

### 3. 底部区域：热推信息流 (今日热推 / 朋友圈热推)
发现页底部的默认信息流列表直接调用 `cf-feed-data`。

- **触发**：页面 `onLoad`、下拉刷新、触底加载
- **前端传参**：`feed_type: 'hot_circle'`，`platform: 'taobao' | 'jd'`
- **映射接口**：`cf-feed-data` ➜ **朋友圈火爆商品API** (`api_all.ashx`)
- **接口地址**：
  - 淘宝：`https://api.zhetaoke.com:10001/api/api_all.ashx`
  - 京东：`http://api.zhetaoke.com:20000/api/api_all.ashx`
- **参数验证**：
  - 淘宝/京东：`tag=1`
  - 页码/分页：`page={page}&page_size=20`

---

## 接口调用关系图

```
┌─────────────────────────────────────────────────────┐
│                    前端页面层                         │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ 首页     │ 发现     │ 热榜     │ 详情     │ 晒单      │
│ index    │ discover │ rankings │ detail   │ community │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────┐
│              utils/api.js 统一调用层                  │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ search   │ getFeed  │ getFeed  │ convert  │ 直接查询   │
│ Coupon   │ Data     │ Data     │ Link +   │ showcase  │
│          │          │          │ Detail   │ _cache    │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────┐
│              wx.cloud.callFunction                   │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│cf-coupon │cf-feed   │cf-get    │cf-convert│cf-product│
│-search   │-data     │-config   │-link     │-detail   │
└──────────┴──────────┴────┬─────┴──────────┴──────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │system_config│  ← 所有云函数从这里读密钥
                    │  _id:global │
                    └─────────────┘
```

---

## 文档状态

| 状态 | 日期 | 操作人 |
| :--- | :--- | :--- |
| **✅ v1.0 创建** | **2026-04-21** | **🏗️ Architect Agent** |
| **✅ v1.1 更新** | **2026-04-27** | **🏗️ Architect Agent** | 补充发现页接口映射清单与路由规范 |
