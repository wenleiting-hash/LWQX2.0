// 云函数 cf-get-config：读取 system_config，过滤敏感字段返回前端
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 进程级缓存：7个配置文档在热实例期间只查一次
let _allConfigCache = null;
let _allConfigTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getAllConfigs() {
  const now = Date.now();
  if (_allConfigCache && (now - _allConfigTime) < CACHE_TTL) {
    return _allConfigCache;
  }
  const result = await Promise.all([
    db.collection('30_system_config').doc('taobao_config').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('jd_config').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('operations_config').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('global').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('documentation').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('contact_config').get().catch(() => ({ data: {} })),
    db.collection('30_system_config').doc('community_config').get().catch(() => ({ data: {} }))
  ]);
  _allConfigCache = result;
  _allConfigTime = now;
  return result;
}

exports.main = async (event, context) => {
  const { keys } = event

  try {
    const [tbRes, jdRes, opsRes, globalRes, docRes, contactRes, communityRes] = await getAllConfigs();
    
    // Merge all configs so frontend still sees a unified settings object
    const config = { 
      ...globalRes.data,
      ...tbRes.data, 
      ...jdRes.data,
      ...opsRes.data, // overwrite with ops res if any conflicts
      ...contactRes.data,
    }

    const documentationData = docRes.data.content || '[]'
    
    // 找出唯一生效的社群二维码
    let activeCommunityQrCode = null
    const communityQrCodes = communityRes.data.qrCodes || []
    if (Array.isArray(communityQrCodes)) {
      activeCommunityQrCode = communityQrCodes.find(q => q.status === true)
    }

    // 🔴 安全红线：过滤敏感字段
    delete config.ztk_appkey
    delete config.zhetaokeAppKey
    delete config.taobao_pid
    delete config.taobaoPid
    delete config.jd_appkey
    delete config.jd_secret
    delete config.zjk_appkey

    // 默认前端可见字段（根据 API_Contract.md）
    const allowedConfig = {
      theme_color: config.theme_color,
      nickname_pool: config.nickname_pool,
      service_qrcode_url: config.service_qrcode_url || config.qrCodeUrl || config.qrCode,
      announcement: config.announcement || config.shareText,
      wechatId: config.wechatId,
      phone: config.phone,
      videoShopUrl: config.videoShopUrl,
      documentation: documentationData,
      tutorial_content: config.tutorial_content,
      activeCommunityQrCode: activeCommunityQrCode
    }

    // 如果前端指定了 keys，则进一步过滤以减小传输体积
    let resultData = allowedConfig
    if (keys && Array.isArray(keys) && keys.length > 0) {
      resultData = {}
      keys.forEach(key => {
        if (allowedConfig[key] !== undefined) {
          resultData[key] = allowedConfig[key]
        }
      })
    }

    return {
      code: 0,
      data: resultData
    }
  } catch (err) {
    console.error('获取 system_config 失败:', err)
    return {
      code: -1,
      message: '获取配置失败，请稍后重试'
    }
  }
}
