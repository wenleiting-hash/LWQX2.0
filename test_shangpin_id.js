const axios = require('axios');
const APP_KEY = 'a7aad6e6abd844048f7c7f860a04e041';
const SID = '62699';
const query = 'tk=ujd35IB4l2I MF937 恐龙骨架头套儿童毛绒玩具帽子愚人节搞怪装扮恐龙骨骼架面具';
axios.get('https://api.zhetaoke.com:10001/api/open_shangpin_id.ashx', {
  params: { appkey: APP_KEY, sid: SID, content: query, type: 1 }
}).then(res => console.log(res.data)).catch(console.error);
