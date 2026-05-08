# 📦 小栗鼠 LWQX 3.0 — 数据库字段级 Schema

| 字段 | 内容 |
| :--- | :--- |
| **版本** | v3.0 |
| **更新日期** | 2026-04-27 |
| **维护角色** | 🏗️ Architect Agent |
| **依据文档** | 历史数据兼容原则、PRD-07 §7.6、PRD-08 §8.4~§8.6、PRD-00 |

> 📌 本文档是**全体工程师的数据契约**。为了兼容历史数据并保持统一的命名规范，所有集合统一使用 `30_` 前缀。

---

## 1. `30_system_config` — 全局配置 (历史兼容)

> 🔴 **安全红线**：标记为 `🔒` 的字段**严禁返回前端**，`cf-get-config` 必须过滤。

| 字段名 | 类型 | 必填 | 默认值 | 安全 | 说明 |
| :--- | :---: | :---: | :--- | :---: | :--- |
| `_id` | string | ✅ | `"global_config"` | — | 固定文档 ID，整个集合只有一条记录 |
| `ztk_appkey` | string | ✅ | `""` | 🔒 | 折淘客 API 密钥 |
| `taobao_pid` | string | ✅ | `""` | 🔒 | 淘宝联盟推广位 PID (格式 mm_xxx_xxx_xxx) |
| `jd_appkey` | string | ❌ | `""` | 🔒 | 京东联盟 AppKey（预留） |
| `jd_secret` | string | ❌ | `""` | 🔒 | 京东联盟 Secret（预留） |
| `jd_union_id` | string | ❌ | `""` | 🔒 | 京东联盟 Union ID（预留，转链必需） |
| `jd_position_id` | string | ❌ | `""` | 🔒 | 京东联盟推广位 ID（预留，转链必需） |
| `theme_color` | string | ✅ | `"#FF5500"` | — | 品牌主色，前端可读 |
| `nickname_pool` | array\<string\> | ✅ | `["省钱达人", ...]` | — | 脱敏昵称池，弹幕/晒单随机抽取 |
| `service_qrcode_url` | string | ❌ | `""` | — | 客服微信二维码图片 URL |
| `service_wechat_id` | string | ❌ | `""` | — | 客服微信号（二维码加载失败时 fallback） |
| `announcement` | object | ✅ | `{}` | — | 全局公告配置 |
| `bulletin_templates` | array\<string\> | ✅ | `["..."]` | — | 弹幕文案模板列表 |
| `review_mode` | object | ✅ | `{}` | — | 微信审核模式开关 |

---

## 2. `30_users` — 后台管理系统用户表 (历史兼容)

> 历史数据中记录为管理员用户表（相当于原 `admin_users`）。支持三级角色权限。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 管理员内部 ID |
| `username` | string | ✅ | — | 登录账号（唯一） |
| `password` | string | ✅ | — | 登录密码（bcrypt 加密存储） |
| `display_name` | string | ✅ | — | 后台显示名称 |
| `role` | string | ✅ | `"operator"` | 角色：`"super_admin"` / `"admin"` / `"operator"` |
| `status` | number | ✅ | `1` | 账号状态：`1`=启用 / `0`=禁用 |

---

## 3. `30_orders` — 原始订单大盘 (历史兼容)

> 历史数据中记录为订单表（相当于原 `tk_orders`）。用于统计/对账。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `order_id` | string | ✅ | — | 原始订单号 |
| `product_title` | string | ✅ | — | 商品标题 |
| `platform` | string | ✅ | — | `"taobao"` / `"jd"` |
| `actual_paid` | number | ✅ | — | 实付金额 |
| `commission` | number | ❌ | `0` | 佣金金额 |
| `order_status` | string | ✅ | — | `"pending"` / `"settled"` / `"refunded"` |

---

## 4. `30_members` — 平台基础用户表 (历史兼容)

> 历史数据中记录为小程序端用户信息表（相当于原 `users`），有历史数据积累。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | — | 微信 OpenID，主键 |
| `union_id` | string | ❌ | `""` | UnionID（跨应用识别，预留） |
| `session_key` | string | ❌ | `""` | 会话密钥（🔒 严禁返回前端） |
| `status` | number | ✅ | `1` | 用户状态：`1`=正常 / `0`=冻结 |
| `created_at` | string | ✅ | ISO8601 | 首次访问时间 |

---

## 5. `30_search_queries` — 平台查券数据分析表 (历史兼容)

> 用于记录用户查券日志，后续用于查看哪些商品没有优惠，做数据分析。
> **说明**：原表仅支持淘宝链接的查询，现在也支持京东商品链接的查券，通过 `platform` 字段（`"taobao"` / `"jd"`）区分平台。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `appid` | string | ❌ | — | 小程序 AppID |
| `openid` | string | ✅ | — | 查券用户 OpenID |
| `queryContent` | string | ✅ | — | 查券口令/链接原文 |
| `platform` | string | ✅ | `"taobao"` | 平台类型 (`"taobao"` / `"jd"`) |
| `resultGoodsId` | string | ✅ | — | 查券结果商品 ID |
| `resultTitle` | string | ✅ | — | 查券结果商品标题 |
| `originalPrice` | number | ✅ | — | 原价 |
| `finalPrice` | number | ✅ | — | 券后价 |
| `couponAmount` | number | ✅ | `0` | 优惠券面额 |
| `rebateAmount` | number | ❌ | `0` | 返利预估金额 |
| `searchTime` | string | ✅ | — | 查券时间 (e.g. "Mon Apr 20...") |

---

## 6. `30_bulletin_logs` — 弹幕事件日志 [新增]

> 来源：查券页实时弹幕效果。包含真实的查券弹幕事件与 B 端录入的种子弹幕。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `nickname_masked` | string | ✅ | — | 脱敏昵称 |
| `saved_amount` | number | ✅ | — | 省钱金额 |
| `product_title` | string | ✅ | — | 商品标题 |
| `timestamp` | number | ✅ | — | 事件时间戳（毫秒级） |
| `source` | string | ✅ | `"real"` | `"real"`=真实事件 / `"seed"`=种子数据 |

---

## 7. `30_task_logs` — 定时任务执行日志表 (历史兼容)

> 记录云端定时任务的执行状态。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 日志记录 ID |
| `task_id` | string | ✅ | — | 任务标识 |
| `status` | string | ✅ | `"running"` | `"running"` / `"success"` / `"failed"` |

---

## 8. `30_tasks` — 调度任务记录表 (历史兼容)

> 记录云端调度的任务配置。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 任务 ID |
| `name` | string | ✅ | — | 任务名称 |
| `is_active` | boolean | ✅ | `true` | 是否启用 |

---

## 9. `30_login_logs` — 小程序用户登陆日志表 (历史兼容)

> 记录小程序用户的登录轨迹。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 日志 ID |
| `openid` | string | ✅ | — | 登录用户 OpenID |
| `loginTime` | string | ✅ | — | 登录时间 |

---

## 10. `30_ai_contents` — 小红书数据表 (历史兼容)

> 历史数据集，目前暂未使用。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `content` | string | ❌ | `""` | 笔记内容 / 抓取数据 |

---

## 11. `30_featured_orders` — 精选商品 [新增]

> B 端运营者手动精选的推荐晒单商品。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `tao_id` | string | ✅ | — | 商品 ID |
| `title` | string | ✅ | — | 商品标题 |

---

## 12. `30_showcase_events_cache` — 实时晒单缓存表 [新增]

> 来源：完全新增的晒单数据表，主要以订单数据（`30_orders`）为基础进行提取展示。
> `cf-sync-showcase` 定时同步，48 小时生命周期。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 文档 ID |
| `tao_id` | string | ✅ | — | 商品 ID |
| `nickname_masked` | string | ✅ | — | 脱敏昵称 |
| `saved_amount` | number | ✅ | — | 省钱金额 |
| `event_timestamp` | number | ✅ | — | 事件时间戳（毫秒） |

---

## 13. `30_daily_stats` — 每日数据看板 [新增]

> 用于后台数据大盘统计。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | `"YYYY-MM-DD"` | 日期字符串 |
| `amount` | number | ✅ | `0` | 当日累计预估佣金总和 |
| `count` | number | ✅ | `0` | 当日活跃订单笔数 |

---

## 14. `30_admin_operation_logs` — 后台操作审计日志 [新增]

> 记录管理员的敏感操作。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 日志 ID |
| `admin_id` | string | ✅ | — | 操作者 ID |
| `action` | string | ✅ | — | 操作类型 |

---

## 15. `30_user_favorites` — 小程序用户收藏表 [新增]

> 记录小程序用户的收藏夹商品。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 收藏记录 ID |
| `openid` | string | ✅ | — | 收藏者微信 OpenID |
| `item` | object | ✅ | — | 收藏的商品详情数据对象 |
| `create_time` | date | ✅ | db.serverDate() | 收藏时间 |

---

## 16. `30_user_footprints` — 小程序用户足迹表 [新增]

> 记录小程序用户的找券/浏览历史足迹（从本地缓存云端化）。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `_id` | string | ✅ | 自动生成 | 足迹记录 ID |
| `openid` | string | ✅ | — | 用户微信 OpenID |
| `item` | object | ✅ | — | 足迹的商品摘要数据 |
| `timestamp` | number | ✅ | — | 浏览时间戳（本地或云端合并排序用） |
| `create_time` | date | ✅ | db.serverDate() | 落库同步时间 |

---

## 文档状态

| 状态 | 日期 | 操作人 |
| :--- | :--- | :--- |
| v1.0 创建 | 2026-04-21 | 🏗️ Architect Agent |
| v2.0 全量重构 | 2026-04-23 | 🏗️ Architect Agent |
| **✅ v3.0 历史数据兼容重构** | **2026-04-27** | **🏗️ Architect Agent** |

### v3.0 变更摘要
1. **全局统一规范**：所有集合统一加上 `30_` 前缀，严格兼容云数据库中的历史集合。
2. **重定向核心表**：
   - 原 `admin_users` 重定向至 `30_users` (小程序端用户信息表，现作为 admin_users 逻辑)。
   - 原 `tk_orders` 重定向至 `30_orders`。
   - 原 `users` 重定向至 `30_members`。
   - 原 `system_config` 重定向至 `30_system_config`。
   - 原 `task_logs` 重定向至 `30_task_logs`。
3. **功能解耦与新增表**：
   - 明确 `30_search_queries` 为数据分析专用表（用于分析哪些商品无优惠等），并增加 `platform` 字段兼容京东链路。
   - 重新独立 `30_bulletin_logs` 作为查券弹幕的数据源。
   - 明确 `30_showcase_events_cache` 为全新引入的晒单数据表，严格基于订单数据提取展示。
4. **补全历史表**：补充文档记录了 `30_login_logs`、`30_tasks` 和 `30_ai_contents`。
5. **新增表对齐**：对于新增模块（精选订单、每日看板、审计日志、用户资产），同样采用 `30_` 前缀以保持集合命名的高度统一，包含 `30_user_favorites` 和 `30_user_footprints`。
