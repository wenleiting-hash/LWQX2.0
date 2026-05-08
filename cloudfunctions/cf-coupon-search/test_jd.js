const axios = require('axios');

async function testJd() {
  try {
    const materialId = encodeURIComponent('https://item.jd.com/100012043978.html');
    const res = await axios.get('http://api.zhetaoke.com:20000/api/open_jing_union_open_promotion_byunionid_get.ashx', {
      params: {
        appkey: 'a7aad6e6abd844048f7c7f860a04e041',
        materialId: materialId, 
        unionId: '1002340578'
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testJd();
