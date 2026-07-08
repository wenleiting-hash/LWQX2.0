# Coupon Search Refactoring Plan

## Goals
Refactor the coupon search logic for Taobao and JD based on precise API field definitions, specifically treating `size` as the discounted price and `quanhou_jiage` as the price after coupon.

## Phases

### [ ] Phase 1: Clarify Field Definitions
- Taobao & JD API:
  - `size` = 折扣价 (Discounted Price)
  - `quanhou_jiage` = 券后价 (Price After Coupon)
- Condition for Coupon:
  - `size > quanhou_jiage` -> 发现优惠券 (Found Coupon)
  - `size <= quanhou_jiage` -> 暂无更多优惠 (No More Discount)

### [x] Phase 2: Refactor JD Logic
- Adjust JD response mapping:
  - Extract `size` and `quanhou_jiage`
  - Determine `hasCoupon = size > quanhou_jiage`
  - Set `couponAmount = size - quanhou_jiage` (or keep raw coupon_info_money if available)
  - Set JD specific prompt message:
    - If hasCoupon: "恭喜该商品发现优惠券。"
    - Else: "抱歉该商品暂无更多优惠"

### [x] Phase 3: Refactor Taobao Logic
- Adjust Taobao response mapping:
  - Extract `size` and `quanhou_jiage` from `taobaoItem`
  - Determine `hasCoupon = size > quanhou_jiage`
  - Set Taobao specific prompt message:
    - If hasCoupon: "恭喜该商品发现优惠券。"
    - Else: "抱歉该商品暂无更多优惠"

### [x] Phase 4: Apply Code Changes
- Replace the incorrect logic in `cf-coupon-search/index.js` with the planned logic.
- Ensure fallback logic gracefully handles missing values for `size` or `quanhou_jiage`.
