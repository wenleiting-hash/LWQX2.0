/**
 * 合规性转换工具 - 架构 V2.0
 * 强制封杀敏感词，将现金转化为积分显示
 */

function formatMoneyToPoints(commissionCash) {
  // 按照架构设计，1元 = 1积分 (可按需调整汇率)
  const points = Math.floor(commissionCash * 1);
  return points;
}

module.exports = {
  formatMoneyToPoints
};
