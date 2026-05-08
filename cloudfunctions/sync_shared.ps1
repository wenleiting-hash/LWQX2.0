# 云函数共享模块同步脚本
# 微信云函数不支持跨目录 require，部署前运行此脚本将 _shared/ 下的文件复制到各云函数目录

$shared = "e:\WorkProject\XLS\cloudfunctions\_shared"
$targets = @(
    "cf-coupon-search",
    "cf-feed-data"
)

foreach ($target in $targets) {
    $dest = "e:\WorkProject\XLS\cloudfunctions\$target"
    Write-Host "Syncing shared modules to $target..." -ForegroundColor Cyan
    Copy-Item "$shared\mapToItem.js" "$dest\mapToItem.js" -Force
}

Write-Host "`nDone! Shared modules synced to $($targets.Count) cloud functions." -ForegroundColor Green
