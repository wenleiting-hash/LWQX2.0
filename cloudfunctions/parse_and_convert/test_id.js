const axios = require('axios');

async function extractTaobaoId(url, depth = 0) {
  if (depth > 3) return null;

  let directMatch = url.match(/[?&]id=(\d{10,15})/i) || 
                    url.match(/\/i(\d{10,15})\.htm/i) ||
                    url.match(/[?&]itemIds?=(\d{10,15})/i); 
  
  if (directMatch && directMatch[1]) {
      return directMatch[1];
  }

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 5000, 
      maxRedirects: 5 
    });

    const finalUrl = res.request?.res?.responseUrl || url;
    console.log('[DEBUG] finalUrl:', finalUrl);
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    const match = finalUrl.match(/[?&]id=(\d{10,15})/i) ||
                  finalUrl.match(/\/i(\d{10,15})\.htm/i) ||
                  finalUrl.match(/[?&]itemIds?=(\d{10,15})/i) ||
                  html.match(/[?&]id=(\d{10,15})/i) ||
                  html.match(/\/i(\d{10,15})\.htm/i) ||
                  html.match(/["']?itemIds?["']?\s*[:=]\s*["']?(\d{10,15})["']?/i) ||
                  html.match(/["']?num_iid["']?\s*[:=]\s*["']?(\d{10,15})["']?/i);

    if (match && match[1]) return match[1];

    const redirectMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/) ||
                          html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) ||
                          html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);

    if (redirectMatch && redirectMatch[1]) {
        let nextUrl = redirectMatch[1];
        if (nextUrl.startsWith('//')) nextUrl = 'https:' + nextUrl;
        return await extractTaobaoId(nextUrl, depth + 1);
    }

    return null;
  } catch (e) {
    console.log('[DEBUG] Error caught:', e.message, 'Status:', e.response?.status);
    if (e.response?.headers?.location) {
      const loc = e.response.headers.location;
      const match = loc.match(/[?&]id=(\d{10,15})/i) || loc.match(/\/i(\d{10,15})\.htm/i) || loc.match(/[?&]itemIds?=(\d{10,15})/i);
      if (match && match[1]) return match[1];
      return await extractTaobaoId(loc, depth + 1);
    }
    return null;
  }
}

(async () => {
    const id1 = await extractTaobaoId('https://e.tb.cn/h.iSG5XTOVQuWBViU?tk=SlBp5b5IStg');
    const id2 = await extractTaobaoId('https://e.tb.cn/h.iRY836l57EbUPVw?tk=2rMQ5b5oE4b');
    console.log('Results:', { id1, id2 });
})();
