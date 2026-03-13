// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  return {
    success: true,
    assets: {
      points_balance: 0,
      points_frozen: 0
    },
    msg: 'get_user_assets initialized'
  }
}
