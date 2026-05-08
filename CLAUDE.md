# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**小栗鼠 (LWQX)** - A WeChat Mini Program for discovering hidden coupons/deals from Taobao and JD.com through clipboard-based search. The system uses a CPS (Cost Per Sale) affiliate model via 折淘客 (ZheTaoKe) API aggregation.

**Architecture**: Mini Program + Admin Dashboard + Serverless Cloud Functions (Tencent CloudBase)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mini Program | Native WeChat miniprogram framework, no npm dependencies |
| Admin Panel | React 18, Vite, Ant Design 6, Tailwind CSS 4, Radix UI, React Router 7 |
| Cloud Functions | Node.js, Tencent CloudBase SDK |
| Database | CloudBase (MongoDB-like document store) |
| External API | 折淘客 (ZheTaoKe) API for Taobao/JD coupon aggregation |

## Directory Structure

```
├── miniprogram/           # WeChat Mini Program frontend
│   ├── pages/            # 5 tabBar pages + sub-pages
│   │   ├── index/       # 首页 - Clipboard capture & search
│   │   ├── discover/    # 发现 - Product feed matrix
│   │   ├── rankings/    # 榜单 - Hot product rankings
│   │   ├── community/   # 晒单 - Social proof feed
│   │   └── mine/        # 我的 - Profile & settings
│   ├── components/      # Reusable components
│   └── utils/api.js     # Cloud function caller wrapper
├── cloudfunctions/       # Serverless cloud functions
│   ├── admin_api/       # Admin panel API gateway (all admin actions)
│   ├── cf-get-config/   # Fetch system config (filtered for frontend)
│   ├── cf-coupon-search/# Search coupons (keyword/TKL/URL)
│   ├── cf-product-detail/
│   ├── cf-feed-data/    # Product feeds (14 feed types)
│   ├── cf-convert-link/ # Affiliate link conversion
│   ├── cf-get-showcase/ # Real-time showcase events
│   ├── cf-login/        # Silent login, OpenID retrieval
│   ├── sync_tk_orders/  # Sync Taobao orders
│   └── sync_jd_orders/  # Sync JD orders
├── admin/               # React admin dashboard
│   └── src/
│       ├── app/        # Pages & components
│       │   ├── pages/ # Dashboard, configs, orders, tasks, etc.
│       │   └── routes.tsx
│       └── services/api/index.ts  # Admin API calls
├── Documents/           # PRD, design specs, API mappings
└── openspec/            # OpenSpec workflow templates
```

## Development Commands

### Admin Panel
```bash
cd admin
pnpm install
pnpm dev      # Start Vite dev server
pnpm build    # Production build
```

### Mini Program
- Open `miniprogram/` directory in **WeChat DevTools**
- Cloud environment ID: `cloud1-9ggm1mvv7a25a4cb`

### Cloud Functions
- Deploy via WeChat DevTools or CloudBase CLI
- Each function is in its own folder under `cloudfunctions/`

## Key Architecture Patterns

### Config-Driven Features
Frontend reads configuration from `cf-get-config`, which merges and filters:
- `taobao_config` - Taobao API credentials (sensitive fields removed)
- `jd_config` - JD API credentials
- `operations_config` - Runtime config (QR codes, share text, subsidy keywords)
- `global` - Global settings

### Admin API Gateway Pattern
All admin actions go through `admin_api` cloud function with an `action` parameter:
```javascript
// Example: admin/src/services/api/index.ts
api.post('', { action: 'get_operations_config' })
api.post('', { action: 'update_operations_config', data: configData })
```

### Mini Program API Wrapper
All mini program cloud calls go through `utils/api.js`:
```javascript
API.getConfig()                    // System config
API.searchCoupon({ query, platform })  // Coupon search
API.getFeedData({ feed_type, platform }) // Product feeds
API.convertLink({ tao_id, platform })   // Affiliate conversion
API.getProductDetail({ tao_id })  // Product details
```

## Database Collections (CloudBase)

| Collection | Purpose |
|------------|---------|
| `30_system_config` | System configs (taobao_config, jd_config, operations_config, global) |
| `30_users` | Admin users (username, password, role) |
| `tk_orders` | Taobao order records |
| `jd_orders` | JD order records |

## Current Branch

- **Working branch**: `LWQX3.0`
- **Main branch**: `main`

## Related Documentation

- [DESIGN.md](DESIGN.md) - Design system (colors, typography, components)
- [Documents/UI_API_Mapping.md](Documents/UI_API_Mapping.md) - Page-to-API mapping
- [Documents/PRD/](Documents/PRD/) - Product requirements
