const axios = require('axios');

async function scrape() {
  const url = 'https://e.tb.cn/h.iRhuGMD0BlmxTQh?tk=QZj45bmvZTl';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Chrome/114.0.0.0 Mobile Safari/537.36'
      },
      timeout: 10000,
      maxRedirects: 10
    });
    
    const finalUrl = res.request.res.responseUrl || url;
    console.log("Final URL:", finalUrl);
    
    let html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    
    const idMatch = finalUrl.match(/[?&]id=(\d+)/i) || 
                  finalUrl.match(/\/i(\d+)\.htm/i) ||
                  finalUrl.match(/[?&]itemIds?=(\d+)/i) ||
                  html.match(/[?&]id=(\d+)/i) || 
                  html.match(/\/i(\d+)\.htm/i);
    
    console.log("ID Match:", idMatch ? idMatch[1] : "None");

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log("Title Match:", titleMatch ? titleMatch[1].trim() : "None");
    
    const jsonTitleMatch = html.match(/[\"']?title["']?\s*:\s*["']([^"']+)["']/i);
    console.log("JSON Title Match:", jsonTitleMatch ? jsonTitleMatch[1] : "None");
    
  } catch (err) {
    if (err.response && err.response.headers && err.response.headers.location) {
      console.log("Redirect Location:", err.response.headers.location);
    } else {
      console.error("Error:", err.message);
    }
  }
}

scrape();
