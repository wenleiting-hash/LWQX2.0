# PRD-07 云函数网关层（后端服务 · P0）

**Author:** 产品经理 (PM) & 首席架构师 (Architect)
**Status:** Draft
**Last Updated:** 2026-04-20
**Target Release:** Phase 1.0 MVP
**全局约束引用:** [PRD-00 总纲与全局约束](./PRD-00-总纲与全局约束.md)

---

## 7.1 问题陈述 (Problem)

### 谁有这个问题？
平台运营者（你）。如果小程序前端直接调用折淘客 API，则 AppKey 会暴露在小程序代码包中，任何人反编译代码包即可盗用你的 AppKey，消耗你的 API 配额，甚至用你的 PID 赚取佣金。

### 有多痛？
- AppKey 一旦泄露，攻击者可以无限调用你的 API 配额（折淘客按调用次数计费），直接导致经济损失。
- PID 泄露意味着攻击者可以用你的推广位生成链接，佣金被窃取。
- 微信小程序代码包可被反编译，任何硬编码的秘钥都等同于公开。

### 不做会怎样？
产品上线即被破解，佣金归零，API 配额耗尽，项目直接死亡。

---

## 7.2 成功指标 (Success Criteria)

| 指标 | 定义 | 目标值 |
| :--- | :--- | :---: |
| 秘钥零暴露 | 小程序代码包内不包含任何第三方 API 的 Key/Secret | 100% |
| 云函数可用率 | 云函数在任意 24 小时内的成功响应率 | ≥ 99% |
| 端到端延迟 | 从小程序发起 callFunction 到收到响应的总时间 | ≤ 3 秒 (P95) |
| 配置热更新生效时间 | B 端修改 PID/AppKey 后，下一次云函数请求即使用新值 | ≤ 1 次请求延迟 |

---

## 7.3 功能需求与验收标准 (Requirements)

### REQ-0701 查券搜索代理函数 (`cf-coupon-search`)

**描述：** 接收前端传入的淘口令/京东短链/关键词，代理调用折淘客搜索/转链 API，返回结构化商品数据。

**调用方式：** `wx.cloud.callFunction({ name: 'cf-coupon-search', data: {...} })`

**入参规格：**

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `query` | string | ✅ | 用户输入内容（淘口令/京东短链/关键词） |
| `query_type` | enum | ✅ | `tkl`（淘口令）/ `jd_link`（京东链接）/ `keyword`（关键词） |
| `platform` | enum | ❌ | `taobao` / `jd`，关键词搜索时用于指定平台，默认 `taobao` |
| `page` | number | ❌ | 分页页码，默认 1 |
| `page_size` | number | ❌ | 每页条数，默认 20，最大 50 |

**出参规格：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | number | 0=成功，1=无结果，-1=系统错误 |
| `message` | string | 错误描述信息 |
| `data.items[]` | array | 商品列表 |
| `data.items[].tao_id` | string | 商品 ID |
| `data.items[].title` | string | 商品标题 |
| `data.items[].image_url` | string | 商品主图 URL |
| `data.items[].original_price` | number | 商品原价 |
| `data.items[].coupon_amount` | number | 优惠券面额 |
| `data.items[].price_after_coupon` | number | 券后价 |
| `data.items[].sales_count` | number | 月销量 |
| `data.items[].shop_name` | string | 店铺名称 |
| `data.items[].platform` | enum | `taobao` / `jd` |
| `data.total` | number | 总结果数（用于分页） |

**验收标准：**
- Given 前端传入 `query_type=tkl` 且 query 为有效淘口令，When 云函数执行，Then 从云数据库读取最新的 AppKey → 调用 ZTK #1 批量高佣转链 API → 返回转链后的商品信息
- Given 前端传入 `query_type=keyword` 且 query 为中文关键词，When 云函数执行，Then 调用 ZTK #2（淘宝）或 #7（京东）全网搜索 API → 返回商品列表
- Given AppKey 无效或过期，When API 返回错误，Then 云函数返回 `{ code: -1, message: "系统维护中，请稍后重试" }`，**不暴露具体错误信息给前端**
- Given API 响应超时（>5秒），When 等待超时，Then 云函数返回 `{ code: -1, message: "查询超时，请重试" }`
- Given 查券成功（返回 code=0 且商品有优惠券），When 云函数执行完毕，Then 自动写入一条脱敏记录到云数据库 `bulletin_logs` 集合（字段规格见 §7.6.2），记录中 `nickname_masked` 使用随机脱敏昵称（如"省钱达人""小*鼠用户"）
- Given 同一 query + query_type + platform 的请求在 **3 分钟**内重复发起，When 云函数执行，Then 优先返回缓存结果（云函数内存缓存）

### REQ-0702 高佣转链代理函数 (`cf-convert-link`)

**描述：** 将商品 ID 转换为带有运营者 PID 的高佣推广链接/淘口令。

**入参规格：**

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `tao_id` | string | ✅ | 商品 ID |
| `platform` | enum | ✅ | `taobao` / `jd` |

**出参规格：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | number | 0=成功 |
| `data.tkl` | string | 淘口令（淘宝场景）如 "￥aBcDeF￥" |
| `data.short_url` | string | 短链接（京东场景） |
| `data.commission_rate` | string | 佣金比例（如 "20.5%"） |

**验收标准：**
- Given 前端传入 `platform=taobao`，When 云函数执行，Then 从云数据库读取 PID + AppKey → 调用 ZTK #1 高佣转链 API → 返回淘口令
- Given 前端传入 `platform=jd`，When 云函数执行，Then 读取京东联盟参数 → 调用 ZTK #1.1 京东转链 API → 返回京东短链
- Given PID 不正确或联盟账号异常，When API 返回失败，Then 返回 `{ code: -1, message: "获取优惠链接失败" }`
- Given 同一 tao_id + platform 的转链请求在 **10 分钟**内重复发起，When 云函数执行，Then 优先返回缓存结果（淘口令/短链不频繁变化）

### REQ-0703 榜单/信息流数据代理函数 (`cf-feed-data`)

**描述：** 统一的信息流数据获取函数，根据传入的数据源类型调用对应的折淘客 API。

**入参规格：**

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `feed_type` | enum | ✅ | 见下方数据源映射表 |
| `platform` | enum | ❌ | `taobao` / `jd`，默认 `taobao` |
| `page` | number | ❌ | 页码，默认 1 |
| `page_size` | number | ❌ | 每页条数，默认 20 |
| `cid` | string | ❌ | 商品分类 ID（榜单筛选用） |

**数据源映射表 (`feed_type` → ZTK API)：**

| feed_type 值 | 对应 ZTK 淘宝接口 | 对应 ZTK 京东接口 | 使用模块 |
| :--- | :---: | :---: | :--- |
| `coupon_hall` | #15 | #16 | 发现-神券大厅 |
| `hot_circle` | #20 | #27 | 发现-发圈王 |
| `nine_nine` | #33/#35 | #34/#36 | 发现-9.9包邮 |
| `ju_hua_suan` | #13 | #14 | 发现-聚划算 |
| `rank_2hour` | #17 | #18 | 榜单-实时爆单 |
| `rank_popularity` | #25 | #32 | 榜单-实时人气 |
| `rank_day` | #24 | #31 | 榜单-全天热卖 |
| `rank_month` | #24 | #31 | 榜单-月度红榜 |
| `today` | #19 | #26 | 发现-今日商品 |
| `high_sales` | #22 | #29 | 发现-超高销量 |
| `high_rating` | #23 | #30 | 发现-超高评分 |
| `high_coupon` | #21 | #28 | 发现-超高券面额 |

**验收标准：**
- Given 前端传入 `feed_type=rank_2hour, platform=taobao`，When 云函数执行，Then 调用 ZTK #17 两小时销量榜 → 返回标准化商品列表
- Given 传入了不存在的 `feed_type`，When 云函数执行，Then 返回 `{ code: -1, message: "无效的数据源类型" }`
- Given 同一 feed_type + platform + page 的请求在 **5 分钟**内重复发起，When 云函数执行，Then 优先返回缓存结果（云函数内存缓存）

### REQ-0704 全局配置读取函数 (`cf-get-config`)

**描述：** 小程序启动时调用，一次性获取所有需要的全局配置项。

**出参规格：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `theme_color` | string | 品牌主题色（默认 `#FF5500`） |
| `service_qrcode_url` | string | 客服二维码图片 URL |
| `service_wechat_id` | string | 客服微信号（fallback 用） |
| `announcement` | object | 公告配置 `{ enabled, title, content }` |
| `bulletin_templates` | array | 弹幕文案模板列表 |

**验收标准：**
- Given 小程序 onLaunch 触发，When 调用 cf-get-config，Then 返回云数据库 `system_config` 集合中的最新配置数据
- Given B 端后台修改了 `theme_color` 值，When 用户下次打开小程序，Then 读取到新的主题色并应用
- Given 配置中 `announcement.enabled = true`，When 小程序首页加载，Then 弹出公告弹窗展示 title 和 content
- Given 云数据库连接失败，When 无法读取配置，Then 使用前端硬编码的默认值兜底（默认主题色、无公告）

### REQ-0705 商品详情代理函数 (`cf-product-detail`)

**描述：** 根据商品 ID 获取完整的商品详情信息（多图、店铺信息、完整价格体系），供商品详情页（PRD-02）使用。

**调用方式：** `wx.cloud.callFunction({ name: 'cf-product-detail', data: {...} })`

**入参规格：**

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `tao_id` | string | ✅ | 商品 ID |
| `platform` | enum | ✅ | `taobao` / `jd` |

**出参规格：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | number | 0=成功，1=商品不存在/已下架，-1=系统错误 |
| `message` | string | 错误描述信息 |
| `data.tao_id` | string | 商品 ID |
| `data.title` | string | 商品标题 |
| `data.images[]` | array | 商品图片列表（多图，首张为主图） |
| `data.original_price` | number | 商品原价 |
| `data.coupon_amount` | number | 优惠券面额（无券时为 0） |
| `data.price_after_coupon` | number | 券后价 |
| `data.sales_count` | number | 月销量 |
| `data.shop_name` | string | 店铺名称 |
| `data.shop_type` | string | 店铺类型（天猫/淘宝/京东自营等） |
| `data.coupon_start_time` | string | 优惠券开始时间 |
| `data.coupon_end_time` | string | 优惠券结束时间 |
| `data.commission_rate` | string | 佣金比例（如 "20.5%"） |
| `data.platform` | enum | `taobao` / `jd` |

**验收标准：**
- Given 前端传入 `platform=taobao` 且 tao_id 有效，When 云函数执行，Then 从云数据库读取 AppKey → 调用 ZTK #37 商品详情 API（淘宝）→ 返回完整商品详情
- Given 前端传入 `platform=jd` 且 tao_id 有效，When 云函数执行，Then 调用 ZTK #38 商品详情 API（京东）→ 返回完整商品详情
- Given 商品不存在或已下架，When API 返回空数据，Then 返回 `{ code: 1, message: "商品不存在或已下架" }`
- Given 同一 tao_id + platform 的请求在 **Session 内**重复发起，When 云函数执行，Then 优先返回缓存结果

---

## 7.4 边界与异常 (Edge Cases)

| 场景 | 系统行为 |
| :--- | :--- |
| **折淘客 API 返回限流 (HTTP 429)** | 云函数内部重试 1 次（间隔 1 秒），仍失败则返回缓存数据或错误码 |
| **云数据库连接失败** | cf-get-config 使用硬编码默认值；其他函数返回系统错误 |
| **AppKey 被折淘客封禁** | 所有依赖该 Key 的函数返回 `{ code: -1 }`，运营者需在 B 端更换 Key |
| **并发请求过高** | 微信云函数自动扩缩容，但需设置最大并发数上限（建议 50）防止成本失控 |

---

## 7.5 非功能性需求 (Non-Functional Requirements)

| 类别 | 要求 |
| :--- | :--- |
| **安全** | 云函数内部绝不 console.log 输出 AppKey/PID 等敏感信息 |
| **性能** | 单次云函数执行时长 ≤ 5 秒，超时自动终止 |
| **幂等性** | 同一请求参数多次调用返回相同结果，不产生副作用（弹幕写入除外） |
| **日志** | 记录每次调用的函数名、feed_type、platform、耗时、返回码，用于问题排查 |
| **成本控制** | 云函数内存配置 256MB，超时 5 秒；云数据库按使用量计费 |
| **缓存策略总览** | cf-coupon-search: 3 分钟；cf-convert-link: 10 分钟；cf-feed-data: 5 分钟；cf-product-detail: Session 内；cf-get-config: 10 分钟 |

---

## 7.6 云数据库集合设计 (Database Schema)

### 7.6.1 `system_config` 集合（全局配置）

> 存储所有可由 B 端动态修改的全局配置项。有且仅有 **一条** 文档。

```json
{
  "_id": "global_config",
  "ztk_appkey": "string (必填)",
  "taobao_pid": "string (必填, 格式 mm_xxx_xxx_xxx)",
  "jd_appkey": "string (选填)",
  "jd_secret": "string (选填)",
  "jd_union_id": "string (选填)",
  "jd_position_id": "string (选填)",
  "theme_color": "string (默认 #FF5500)",
  "nickname_pool": [
    "省钱达人",
    "用户*8848",
    "薅羊毛专家",
    "小*鼠推荐官"
  ],
  "service_qrcode_url": "string (客服二维码图片 URL)",
  "service_wechat_id": "string (客服微信号, fallback)",
  "announcement": {
    "enabled": "boolean (默认 false)",
    "title": "string",
    "content": "string"
  },
  "bulletin_templates": [
    "{nickname}刚刚查券省了{amount}元",
    "{nickname}成功找到{title}的隐藏券",
    "{nickname}领到了{amount}元大额优惠券"
  ],
  "updated_at": "timestamp"
}
```

### 7.6.2 `bulletin_logs` 集合（弹幕记录）

> 存储查券成功事件记录（含种子数据），供查券页弹幕组件读取。

```json
{
  "_id": "自动生成",
  "nickname_masked": "string (脱敏昵称, 如'省钱达人''小*鼠用户''精打细算')",
  "saved_amount": "number (省钱金额 = 原价 - 券后价)",
  "product_title": "string (商品标题, 仅取前6字)",
  "timestamp": "number (事件时间戳 ms)",
  "source": "enum: 'real' | 'seed' (real=真实查券事件, seed=B端手动录入的种子数据)"
}
```

**数据生命周期：**
- 真实事件（source=real）：由 cf-coupon-search 查券成功时自动写入
- 种子数据（source=seed）：由 B 端管理台手动录入
- 前端读取时优先展示最近 2 小时内的真实事件，不足 5 条时用种子数据补足

### 7.6.3 `featured_orders` 集合（精选晒单商品）

> 存储由 B 端运营者手动精选的推荐晒单商品，供晒单模块（PRD-05）Phase 1.0 使用。

```json
{
  "_id": "自动生成",
  "tao_id": "string (商品 ID)",
  "platform": "enum: 'taobao' | 'jd'",
  "title": "string (商品标题)",
  "image_url": "string (商品主图 URL)",
  "original_price": "number (原价)",
  "coupon_amount": "number (券面额)",
  "price_after_coupon": "number (券后价)",
  "recommend_note": "string (运营者推荐语, 选填)",
  "sort_order": "number (排序权重, 越大越靠前, 默认 0)",
  "is_active": "boolean (是否上架展示, 默认 true)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**排序规则：** 优先按 `sort_order` 降序 → 其次按 `created_at` 降序

**索引建议：** `{ is_active: 1, sort_order: -1, created_at: -1 }`

### 7.6.4 `showcase_events_cache` 集合（实时晒单缓存表）

> 存储经过身份匹配后的实时晒单事件，作为晒单模块 (PRD-05) 的直接数据源，减轻对原始订单表的扫描压力。

```json
{
  "_id": "自动生成",
  "tao_id": "string (商品 ID)",
  "platform": "enum: 'taobao' | 'jd'",
  "title": "string (商品标题)",
  "image_url": "string (商品主图 URL)",
  "nickname_masked": "string (来自 nickname_pool 的随机昵称)",
  "saved_amount": "number (省钱金额)",
  "event_timestamp": "timestamp (事件发生时间戳)",
  "is_hot": "boolean (是否设为高权重推荐)"
}
```

**更新机制：**
- 每 5 分钟由同步云函数 `cf-sync-showcase` 运行一次。
- 提取 `tk_orders` 最新成交轨迹 -> 匹配 `nickname_pool` -> 写入本缓存表。
- **生命周期**：仅保留最近 48 小时的记录，过期自动清理。

**索引建议：** `{ event_timestamp: -1, saved_amount: -1 }`
