# 微信小程序导航栏适配指南

## 概述

本指南介绍了如何正确处理微信小程序的导航栏设计，确保符合微信规范并适配不同机型。

## 核心要点

### 1. 胶囊按钮安全区域

微信小程序右上角的"胶囊按钮"（包含三个点菜单和关闭按钮）是系统级组件，具有最高层级，**无法被前端代码覆盖或移动**。

#### 关键参数
- **胶囊宽度**：约 87px（实际可见）
- **安全预留宽度**：95px（建议值，包含间距）
- **胶囊高度**：约 32px
- **右边距**：约 8px

#### 设计要求
✅ **必须做**：
- 在导航栏右侧预留至少 **95×32** 像素的空白区域
- 确保页面标题、功能按钮不与胶囊重叠
- 使用 `padding-right` 为内容区域预留空间

❌ **禁止做**：
- 不要在右上角放置任何可点击元素
- 不要试图覆盖或隐藏胶囊按钮
- 不要假设胶囊位置固定（不同机型可能略有差异）

#### Figma 设计提示
在 Figma 设计时，添加提示词：
```
WeChat Mini Program navigation bar safe area
top-right capsule button placeholder
```

### 2. 状态栏与标题栏高度

微信小程序顶部由两部分组成：

```
┌─────────────────────────────────┐
│    状态栏 (Status Bar)            │  ← 显示时间、信号等系统信息
├─────────────────────────────────┤
│    标题栏 (Title Bar)             │  ← 自定义导航栏内容
└─────────────────────────────────┘
```

#### 高度计算公式

```javascript
总导航栏高度 = 状态栏高度 + 标题栏高度
```

其中：
- **状态栏高度**：根据不同机型动态变化
- **标题栏高度**：通常固定为 **44px** 或 **48px**

#### 常见机型状态栏高度

| 机型类型 | 状态栏高度 | 示例 |
|---------|-----------|------|
| iPhone X 及以上（刘海屏/灵动岛） | **44px** | iPhone 14 Pro, iPhone 13 |
| iPhone 8 及以下 | **20px** | iPhone SE, iPhone 8 |
| 普通安卓 | **24-28px** | 小米、OPPO、vivo |
| 华为刘海屏 | **36-40px** | 华为 P40, Mate 40 |

#### 实际开发中的获取方式

**微信小程序环境**（真实环境）：
```javascript
const systemInfo = wx.getSystemInfoSync();
const statusBarHeight = systemInfo.statusBarHeight || 44;
```

**Web 预览环境**（本项目）：
```javascript
// 使用固定值模拟 iPhone X 系列
const statusBarHeight = 44;
```

### 3. 自适应布局建议

#### Figma 设计技巧

使用 **Auto Layout（自动布局）**：

```
导航栏容器 (Auto Layout - Vertical)
├─ 状态栏占位 (Height: Auto, 根据设备动态)
│  └─ Padding Top: var(--status-bar-height)
│
└─ 标题栏内容 (Height: 44px, Fixed)
   ├─ 左侧内容区
   │  └─ Logo + 标题
   │
   └─ 右侧安全区 (Width: 95px, 空白预留)
```

#### CSS 实现

```css
.navbar {
  /* 状态栏高度通过 padding-top 动态设置 */
  padding-top: var(--status-bar-height);
}

.title-bar {
  /* 标题栏固定高度 */
  height: 44px;
  
  /* 右侧预留胶囊按钮空间 */
  padding-right: 103px; /* 95px 胶囊 + 8px 间距 */
}
```

## 实现方案

### MiniProgramNavBar 组件

本项目提供了一个标准的导航栏组件：

```tsx
import { MiniProgramNavBar } from "./components/MiniProgramNavBar";

// 使用示例
<MiniProgramNavBar 
  backgroundColor="bg-brand-primary" 
  textColor="text-white"
>
  <h1>页面标题</h1>
</MiniProgramNavBar>
```

#### 组件特性

✅ **自动处理**：
- 状态栏高度适配（默认 44px）
- 胶囊按钮安全区域预留（95px）
- 标题栏固定高度（44px）
- 支持自定义背景色和文字颜色

✅ **调试模式**：
```tsx
<MiniProgramNavBar showCapsulePlaceholder={true}>
  {/* 显示胶囊按钮占位符，便于设计验证 */}
</MiniProgramNavBar>
```

### 页面应用示例

#### 1. 首页（橙色导航栏）

```tsx
<MiniProgramNavBar backgroundColor="bg-brand-primary" textColor="text-white">
  <div className="flex items-center gap-3">
    <img src={logo} className="w-10 h-10" />
    <div>
      <h1>轻省惠选</h1>
      <p>全网隐藏优惠一键查</p>
    </div>
  </div>
</MiniProgramNavBar>
```

#### 2. 发现页 / 订单页（白色导航栏）

```tsx
<MiniProgramNavBar backgroundColor="bg-white" textColor="text-gray-900">
  <h1 className="text-lg font-bold">发现好物</h1>
</MiniProgramNavBar>
```

#### 3. 个人中心（橙色导航栏）

```tsx
<MiniProgramNavBar backgroundColor="bg-brand-primary" textColor="text-white">
  <h1 className="text-base font-semibold">个人中心</h1>
</MiniProgramNavBar>
```

## 设计检查清单

在将设计稿交付开发前，请确认：

- [ ] 导航栏右侧预留了 **95px** 宽度的空白区域
- [ ] 页面标题、Logo 距离右侧至少 **8px** 边距
- [ ] 导航栏顶部预留了状态栏高度（建议 **44px**）
- [ ] 标题栏内容区域高度为 **44px**
- [ ] 所有页面导航栏高度保持一致
- [ ] 考虑了不同背景色下的文字对比度

## 常见问题

### Q1: 为什么不能直接使用固定的总高度？
**A**: 不同机型的状态栏高度不同，固定高度会导致：
- iPhone X 系列：内容被刘海遮挡
- 安卓手机：状态栏与内容重叠
- 使用动态高度才能适配所有机型

### Q2: 胶囊按钮的位置会变化吗？
**A**: 会的。不同机型、不同微信版本的胶囊位置可能略有差异。因此：
- 不要依赖精确的像素定位
- 预留足够的安全区域（95px）
- 使用百分比或 padding 而非固定坐标

### Q3: Web 预览环境如何模拟不同机型？
**A**: 本项目使用固定值（44px）模拟 iPhone X 系列。真实环境应通过 `wx.getSystemInfoSync()` 动态获取。

### Q4: 如何在 Figma 中验证设计？
**A**: 使用以下方法：
1. 创建 **375×812** 的 iPhone X 画板
2. 顶部添加 **44px** 高的状态栏（灰色占位）
3. 右上角添加 **95×32** 的胶囊占位（红色虚线框）
4. 确保所有内容不超出安全区域

## 相关文件

- `/src/app/components/MiniProgramNavBar.tsx` - 导航栏组件
- `/src/app/components/Home.tsx` - 首页使用示例
- `/src/app/components/Discover.tsx` - 发现页使用示例
- `/src/app/components/Orders.tsx` - 订单页使用示例
- `/src/app/components/Profile.tsx` - 个人中心使用示例

## 参考资源

- [微信小程序官方设计指南](https://developers.weixin.qq.com/miniprogram/design/)
- [wx.getSystemInfoSync 文档](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/system-info/wx.getSystemInfoSync.html)
- [微信小程序自定义导航栏](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/custom-tabbar.html)

---

© 2026 佳友栈老温 - 轻省惠选
