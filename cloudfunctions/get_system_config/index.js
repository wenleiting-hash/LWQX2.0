const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取说明文档
    const docRes = await db.collection('system_config').doc('documentation').get().catch(() => ({ data: null }));
    // 获取运营配置
    const opsRes = await db.collection('system_config').doc('operations_config').get().catch(() => ({ data: null }));
    
    let documentation = null;
    if (docRes.data && docRes.data.content) {
      try {
        documentation = typeof docRes.data.content === 'string' ? JSON.parse(docRes.data.content) : docRes.data.content;
      } catch (e) {
        console.error('解析文档内容失败:', e);
      }
    }

    return {
      success: true,
      data: {
        documentation: documentation,
        operations_config: opsRes.data || null
      }
    };
  } catch (err) {
    console.error('获取系统配置失败:', err);
    return {
      success: false,
      msg: err.message
    };
  }
};
