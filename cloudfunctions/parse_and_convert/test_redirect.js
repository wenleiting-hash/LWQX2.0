const axios = require('axios');

async function debugRedirect(url, depth = 0) {
  if (depth > 5) return console.log("Max depth reached.");
  console.log(`\n--- Depth ${depth} ---`);
  console.log('Fetching:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    console.log('Status:', res.status);
    console.log('Headers location:', res.headers.location);
    console.log('Response URL:', res.request?.res?.responseUrl || url);
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    
    // Test matchers
    const match = 
        html.match(/[?&]id=(\d{10,15})/i) ||
        html.match(/\/i(\d{10,15})\.htm/i) ||
        html.match(/["']?itemIds?["']?\s*[:=]\s*["']?(\d{10,15})["']?/i) ||
        html.match(/["']?num_iid["']?\s*[:=]\s*["']?(\d{10,15})["']?/i);
    console.log('Found ID match in HTML:', match ? match[1] : null);

    const redirectMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/) ||
        html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) ||
        html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
    console.log('Found script redirect in HTML:', redirectMatch ? redirectMatch[1] : null);

    if (res.status >= 300 && res.headers.location) {
        let nextLoc = res.headers.location;
        if (nextLoc.startsWith('//')) nextLoc = 'https:' + nextLoc;
        return debugRedirect(nextLoc, depth + 1);
    }
    
    if (redirectMatch && redirectMatch[1]) {
        let nextUrl = redirectMatch[1];
        if (nextUrl.startsWith('//')) nextUrl = 'https:' + nextUrl;
        return debugRedirect(nextUrl, depth + 1);
    }

    // print a snippet of HTML
    console.log('HTML Snippet:', html.substring(0, 500));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

debugRedirect('https://e.tb.cn/h.iSG5XTOVQuWBViU?tk=SlBp5b5IStg');
