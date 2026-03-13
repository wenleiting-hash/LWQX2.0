// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  return {
    success: true,
    data: [], // TTL 商品列表占位
    msg: 'get_ttl_feed initialized'
  }
}
