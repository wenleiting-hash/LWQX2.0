# 🔍 LWQX 3.0 项目审计与优化报告

> **审计日期**: 2026-04-30  
> **状态**: ✅ 全部修复完成 (21/21)  
> **涉及文件**: 云函数 10 个 + MiniApp 11 个

---

## 一、审计范围

| 层级 | 覆盖内容 |
|------|----------|
| MiniApp 前端 | 10 个页面 + `api.js` + `app.js` |
| 云函数后端 | 8 个 `cf-*` 函数 |
| 数据交互链路 | 前端 → API 层 → 云函数 → 云数据库 |

---

## 二、发现的 21 个问题

### 🔴 关键 Bug（6 个）

#### Bug #1: `cf-login` 返回格式不匹配
- **位置**: `cloudfunctions/cf-login/index.js`
- **现象**: 返回 `{ success: true, openid }` 但 `api.js` 的 `callCloudFunction` 要求 `{ code: 0, data }`
- **影响**: `API.login()` 永远 reject，mine 页拿不到 openid
- **修复**: 统一返回 `{ code: 0, data: { openid, isNewUser } }`

#### Bug #2: `favorite.js` / `history.js` 跳转参数错误
- **位置**: `miniprogram/pages/favorite/favorite.js:77-86`、`history.js:89-98`
- **现象**: 使用 `?id=${id}&source=jd` 跳转，但 `detail.js` 不识别 `id` 和 `source` 参数
- **修复**: 改为 `globalData._navItem` 中转 + URL 仅传 `tao_id` 和 `platform`

#### Bug #3: `community.js` 跳转参数错位
- **位置**: `miniprogram/pages/community/community.js:124`
- **现象**: 使用 `?query=${taoid}&type=url` 但 detail 页不识别这些参数
- **修复**: 改为 `?tao_id=${taoid}&platform=...`

#### Bug #4: `cf-user-assets` 收藏查重字段不匹配
- **位置**: `cloudfunctions/cf-user-assets/index.js:84-87, 123-126, 147-149`
- **现象**: 用 `'item.id'` 查询但实际数据里字段名是 `tao_id`
- **影响**: 收藏功能完全失效（加了查不到，删不掉）
- **修复**: `'item.id'` → `'item.tao_id'`（三处）

#### Bug #5: `discover.js` onPageScroll 参数错误
- **位置**: `miniprogram/pages/discover/discover.js:170-183`
- **现象**: `e.scrollHeight` 不存在，微信 onPageScroll 回调只有 `scrollTop`
- **修复**: 删除无效的预加载逻辑，`require` 移到文件顶部

#### Bug #6: `detail.js` 转链字段不匹配
- **位置**: `miniprogram/pages/detail/detail.js:190`
- **现象**: 检查 `res.converted_url` 但云函数返回的是 `res.tkl` / `res.short_url`
- **影响**: 转链复制永远弹"没有找到可用专属链接"
- **修复**: 改为 `res.tkl || res.short_url || res.click_url`

---

### 🟡 架构/代码质量（6 个）

#### #7: `mapToItem` 函数在 3 个云函数中完全重复
- **涉及**: `cf-coupon-search`、`cf-feed-data`、`cf-product-detail`
- **修复**: 提取到 `_shared/mapToItem.js`，部署前通过 `sync_shared.ps1` 同步

#### #8: 每个云函数每次都读 DB 获取配置
- **涉及**: 5 个云函数
- **修复**: 进程级缓存（5 分钟 TTL），热实例期间不重复读取

#### #9: `app.js` 和 `mine.js` 双重登录逻辑
- **现象**: `app.js` 直接 `wx.cloud.callFunction`，`mine.js` 用 `API.login()`
- **修复**: 统一走 API 层

#### #10: `app.js` 和 `mine.js` 双重 getConfig
- **现象**: 两处获取完全相同的配置，写入同一个 `globalData.systemConfig`
- **修复**: 删除 `mine.js` 的 `fetchConfig()`

#### #11: `search-result.js` 硬编码 mock 推荐数据
- **修复**: 改为 `API.getFeedData()` 获取真实推荐

#### #12: `history.js` deleteItem 数据污染
- **现象**: 删除足迹时同时写入 `footprints` 和 `browse_history`
- **修复**: 只写 `footprints`

---

### 🟢 性能优化（7 个）

#### #13: `cf-sync-showcase` N+1 逐条查重
- **现象**: 100 条订单 = 100 次 `db.where().count()`
- **修复**: 一次性预取已有 ID 到 Set，内存比对（100 次 → 1 次 DB 查询）

#### #14: `cf-user-assets.syncFootprints` N+1 逐条查重
- **现象**: 20 条足迹 = 最多 40 次 DB 操作
- **修复**: 批量预取 + `Promise.all` 并行写入（40 次 → 1 次查询 + N 次并行写入）

#### #15: `mine.js` onShow 每次切 tab 全量同步
- **修复**: 5 分钟节流

#### #16: URL 传整个 JSON 对象（截断风险）
- **风险**: 微信 `navigateTo` URL 限制约 10KB，超大 JSON 会截断导致白屏
- **修复**: 全部 8 个页面改为 `globalData._navItem` 中转

#### #17: `cf-get-config` 每次 7 个并行 DB 读取
- **修复**: 进程级缓存，热实例 5 分钟内只查一次

#### #18: `cf-coupon-search` 阻塞式写搜索日志
- **修复**: `await db.add()` → `db.add().catch()` 异步不等待

#### #19: `discover.js` 函数内动态 require
- **修复**: 移到文件顶部 `import { API } from '../../utils/api'`

---

### 🔵 安全风险（2 个）

#### #20: `cf-convert-link` 返回 debug 信息
- **现象**: 京东转链失败返回 `debug_url` 和 `debug_res`，可能泄露 API 密钥
- **修复**: 移除 debug 字段

#### #21: `cf-coupon-search` 双重 URL 编码
- **现象**: 手动 `encodeURIComponent` + axios 自动编码 = 双重编码
- **修复**: 移除手动编码

---

## 三、优化模式总结

### 模式 1：进程级配置缓存

```javascript
const _configCache = {};
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedConfig(docId) {
  const now = Date.now();
  if (_configCache[docId] && (now - _configCache[docId].time) < CACHE_TTL) {
    return _configCache[docId].data;
  }
  const res = await db.collection('30_system_config').doc(docId).get().catch(() => ({ data: {} }));
  _configCache[docId] = { data: res.data, time: now };
  return res.data;
}
```

### 模式 2：N+1 查重消除

```javascript
// 一次性预取
const existingIds = new Set();
const existRes = await db.collection('target')
  .field({ tao_id: true }).limit(100).get();
existRes.data.forEach(d => existingIds.add(d.tao_id));

// 内存比对
for (const item of items) {
  if (existingIds.has(String(itemId))) continue;
  // ...写入
}
```

### 模式 3：globalData 页面中转

```javascript
// 发送方
getApp().globalData._navItem = detailItem;
wx.navigateTo({ url: `/pages/detail/detail?tao_id=${id}&platform=${platform}` });

// 接收方（三级降级）
const app = getApp();
if (app.globalData._navItem) {         // 1. 优先 globalData
  item = app.globalData._navItem;
  app.globalData._navItem = null;
} else if (options.item) {             // 2. 兼容旧 JSON 传参
  item = JSON.parse(decodeURIComponent(options.item));
} else if (options.tao_id) {           // 3. 降级 API 拉取
  this.fetchDetail(options.tao_id, options.platform);
}
```

### 模式 4：API 层网络重试

```javascript
const attempt = (retriesLeft) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data, config: { env: envId } })
      .then(/* 正常处理 */)
      .catch(err => {
        if (retriesLeft > 0 && err.errMsg?.includes('timeout')) {
          return attempt(retriesLeft - 1).then(resolve).catch(reject);
        }
        reject(new Error('网络连接异常'));
      });
  });
};
```

### 模式 5：云函数共享模块

```
cloudfunctions/
  _shared/
    mapToItem.js              ← 单一维护点
  cf-coupon-search/
    mapToItem.js              ← 部署前从 _shared 复制
  cf-feed-data/
    mapToItem.js
  sync_shared.ps1             ← 部署前运行
```

---

## 四、修改文件清单

### 云函数（8 个需部署 + 2 个新建）

| 文件 | 改动内容 |
|------|----------|
| `cf-login/index.js` | 返回格式统一为 `{ code: 0, data }` |
| `cf-user-assets/index.js` | 收藏字段修复 + syncFootprints 批量优化 |
| `cf-convert-link/index.js` | 移除 debug 泄露 + 配置缓存 |
| `cf-coupon-search/index.js` | 移除双重编码 + 日志异步 + 配置缓存 + 共享 mapToItem |
| `cf-feed-data/index.js` | 配置缓存 + 共享 mapToItem |
| `cf-product-detail/index.js` | 配置缓存 |
| `cf-get-config/index.js` | 7 文档批量缓存 |
| `cf-sync-showcase/index.js` | 批量预取去 N+1 |
| `_shared/mapToItem.js` | **新建** 共享商品映射模块 |
| `sync_shared.ps1` | **新建** 部署前共享模块同步脚本 |

### MiniApp（11 个文件）

| 文件 | 改动内容 |
|------|----------|
| `utils/api.js` | 网络超时自动重试 |
| `app.js` | 统一 API 层登录 + `_navItem` 初始化 |
| `pages/detail/detail.js` | 转链字段修复 + globalData 接收 + JD 跳转小程序 |
| `pages/mine/mine.js` | 删除重复 fetchConfig + 同步节流 |
| `pages/discover/discover.js` | 删除无效 onPageScroll + import 规范 + globalData 中转 |
| `pages/index/index.js` | globalData 中转 |
| `pages/search-result/search-result.js` | 移除 mock + globalData 中转 |
| `pages/rankings/rankings.js` | globalData 中转 |
| `pages/favorite/favorite.js` | 跳转修复 + globalData 中转 |
| `pages/history/history.js` | 跳转修复 + 删除数据污染 + globalData 中转 |
| `pages/community/community.js` | 跳转参数修复 |

---

## 五、部署注意事项

1. **部署云函数前**运行同步脚本：
   ```powershell
   cd e:\WorkProject\XLS
   powershell .\cloudfunctions\sync_shared.ps1
   ```

2. **需要重新部署的 8 个云函数**：
   - `cf-login`
   - `cf-user-assets`
   - `cf-convert-link`
   - `cf-coupon-search`
   - `cf-feed-data`
   - `cf-product-detail`
   - `cf-get-config`
   - `cf-sync-showcase`

3. MiniApp 端需要在微信开发者工具中重新上传代码并提交审核

---

## 六、后续建议

- 配置缓存 TTL 可根据实际后台配置修改频率调整（当前 5 分钟）
- `mapToItem` 共享模块如后续扩展，可考虑引入构建工具自动化同步
- 建议定期检查云函数调用量和数据库读取量，验证缓存实际命中率
