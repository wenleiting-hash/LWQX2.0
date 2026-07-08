const axios = require('./cloudfunctions/cf-coupon-search/node_modules/axios');

const APP_KEY = 'a7aad6e6abd844048f7c7f860a04e041';
const SID = '188691';
const PID = 'mm_90082353_3406100203_116256050392'; // Dummy PID for testing
const RELATION_ID = '3336176218'; // Dummy relation_id for testing

const query = '【淘宝】https://e.tb.cn/h.iwXwIOQ?tk=ujd35lB4l2l MF937 恐龙骨架头套儿童毛绒玩具帽子愚人节搞怪装扮恐龙骨骼架面具';

async function test()
{
  console.log('=== User Input ===');
  console.log(query);
  console.log('\n==================================');

  // Step 1
  let isItemResolved = false;
  let itemId = '';

  const batchParams = {
    appkey: APP_KEY,
    sid: SID,
    pid: PID,
    relation_id: RELATION_ID,
    tkl: query,
    signurl: 5
  };
  console.log('\n[第一步] 批量高佣转链 API (open_gaoyongzhuanlian_tkl_piliang.ashx)');
  console.log('请求参数:', JSON.stringify(batchParams, null, 2));

  try {
    const res = await axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian_tkl_piliang.ashx', { params: batchParams });
    console.log('响应状态:', res.data.status);
    if (res.data.status === 200 && res.data.content && res.data.content.length > 0) {
      console.log('响应内容 (截取商品名):', res.data.content[0].title);
      console.log('完整产品信息:', JSON.stringify(res.data.content[0], null, 2).substring(0, 300) + '...');
      isItemResolved = true;
    } else {
      console.log('未找到商品数据', res.data);
    }
  } catch (e) {
    console.log('接口异常', e.message);
  }

  if (!isItemResolved) {
    // Step 2
    const parseParams = {
      appkey: APP_KEY,
      sid: SID,
      pid: PID,
      content: query,
      type: 1
    };
    console.log('\n[第二步] 智能解析商品 ID (open_shangpin_id.ashx)');
    console.log('请求参数:', JSON.stringify(parseParams, null, 2));

    try {
      const res = await axios.get('https://api.zhetaoke.com:10001/api/open_shangpin_id.ashx', { params: parseParams });
      console.log('响应数据:', JSON.stringify(res.data, null, 2));
      if (res.data && res.data.status === 200 && res.data.item_id) {
        itemId = res.data.item_id;
        console.log('提取成功! itemId =', itemId);
      }
    } catch (e) {
      console.log('解析异常', e.message);
    }

    if (itemId) {
      // Step 3
      const params3 = {
        appkey: APP_KEY,
        sid: SID,
        pid: PID,
        relation_id: RELATION_ID,
        num_iid: itemId,
        signurl: 5
      };
      console.log('\n[第三步] 精准查询高佣和隐藏券 (open_gaoyongzhuanlian.ashx)');
      console.log('请求参数:', JSON.stringify(params3, null, 2));

      try {
        const res = await axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian.ashx', { params: params3 });
        console.log('响应状态:', res.data.status);
        if (res.data.status === 200) {
          const it = Array.isArray(res.data.content) ? res.data.content[0] : res.data;
          if (it && it.title) {
            console.log('响应内容 (截取商品名):', it.title);
            console.log('优惠券信息: 券后价', it.quanhou_jiage, '原价', it.size);
            isItemResolved = true;
          }
        } else {
          console.log('接口返回无数据:', res.data);
        }
      } catch (e) {
        console.log('高佣接口异常', e.message);
      }
    }
  }

  if (!isItemResolved) {
    // Step 4
    const searchParams = {
      appkey: APP_KEY,
      sid: SID,
      pid: PID,
      q: query,
      page: 1,
      page_size: 20,
      sort: 'new'
    };
    console.log('\n[第四步] 全网模糊兜底搜索 (api_quanwang.ashx)');
    console.log('请求参数:', JSON.stringify(searchParams, null, 2));

    try {
      const res = await axios.get('https://api.zhetaoke.com:10003/api/api_quanwang.ashx', { params: searchParams });
      console.log('响应状态:', res.data.status);
      if (res.data.status === 200 && res.data.content) {
        console.log('搜索到的结果数量:', res.data.content.length);
        if (res.data.content.length > 0) {
          console.log('第一条商品标题:', res.data.content[0].title);
        }
      }
    } catch (e) {
      console.log('全网搜索异常', e.message);
    }
  }
}

test();
