const https = require('https');
const fs = require('fs');
const path = require('path');

const icons = [
  { name: 'home', icon: 'search' },
  { name: 'discover', icon: 'compass' },
  { name: 'order', icon: 'receipt-text' },
  { name: 'search', icon: 'camera' },
  { name: 'mine', icon: 'user' }
];

const inactiveColor = '999999';
const activeColor = 'FF6200';

const dir = path.join(__dirname, 'images', 'tabbar');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(dest, data);
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  for (let item of icons) {
    const inactiveUrl = `https://api.iconify.design/lucide/${item.icon}.svg?color=%23${inactiveColor}&width=48&height=48&stroke-width=1.5`;
    const activeUrl = `https://api.iconify.design/lucide/${item.icon}.svg?color=%23${activeColor}&width=48&height=48&stroke-width=2.5`;
    
    await download(inactiveUrl, path.join(dir, `${item.name}.svg`));
    await download(activeUrl, path.join(dir, `${item.name}_active.svg`));
    console.log(`Downloaded ${item.name}.svg`);
  }
}
run();
