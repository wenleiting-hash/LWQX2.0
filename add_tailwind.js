const fs = require('fs');
const path = require('path');

const wxssPath = path.join(__dirname, 'miniprogram', 'app.wxss');
const miniprogramDir = path.join(__dirname, 'miniprogram');

function getWxmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getWxmlFiles(fullPath, fileList);
    } else if (fullPath.endsWith('.wxml')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const wxmlFiles = getWxmlFiles(miniprogramDir);
const classSet = new Set();
const classRegex = /class="([^"]+)"/g;

wxmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const classes = match[1].split(/\s+/);
    classes.forEach(c => {
      if (c && !c.includes('{{') && !c.includes('}}')) {
        classSet.add(c);
      }
    });
  }
});

const existingWxss = fs.readFileSync(wxssPath, 'utf8');
const rules = [];
const spacing = { '0': 0, '1': 8, '2': 16, '3': 24, '4': 32, '5': 40, '6': 48, '8': 64, '10': 80, '12': 96, '16': 128, '20': 160, '24': 192, '32': 256, '40': 320, '48': 384, '64': 512 };

classSet.forEach(c => {
  // If the class is already defined (exactly like .mb-4 {), skip it.
  if (existingWxss.includes(`.${c} {`) || existingWxss.includes(`.${c}{`)) return;
  
  let match;
  
  if ((match = c.match(/^(p|m)(t|r|b|l|x|y)?-([\d]+)$/))) {
    const [, propMap, dir, val] = match;
    const prop = propMap === 'p' ? 'padding' : 'margin';
    const px = spacing[val] !== undefined ? spacing[val] : (val * 8);
    if (!dir) rules.push(`.${c} { ${prop}: ${px}rpx; }`);
    else if (dir === 't') rules.push(`.${c} { ${prop}-top: ${px}rpx; }`);
    else if (dir === 'b') rules.push(`.${c} { ${prop}-bottom: ${px}rpx; }`);
    else if (dir === 'l') rules.push(`.${c} { ${prop}-left: ${px}rpx; }`);
    else if (dir === 'r') rules.push(`.${c} { ${prop}-right: ${px}rpx; }`);
    else if (dir === 'x') rules.push(`.${c} { ${prop}-left: ${px}rpx; ${prop}-right: ${px}rpx; }`);
    else if (dir === 'y') rules.push(`.${c} { ${prop}-top: ${px}rpx; ${prop}-bottom: ${px}rpx; }`);
  }
  else if ((match = c.match(/^(w|h)-([\d]+)$/))) {
    const [, propMap, val] = match;
    const prop = propMap === 'w' ? 'width' : 'height';
    const px = spacing[val] !== undefined ? spacing[val] : (val * 8);
    rules.push(`.${c} { ${prop}: ${px}rpx; }`);
  }
  else if (c === 'min-h-screen') rules.push(`.${c} { min-height: 100vh; }`);
  else if (c === 'w-full') rules.push(`.${c} { width: 100%; }`);
  else if (c === 'h-full') rules.push(`.${c} { height: 100%; }`);
  else if (c === 'w-screen') rules.push(`.${c} { width: 100vw; }`);
  else if (c === 'h-screen') rules.push(`.${c} { height: 100vh; }`);
  else if (c === 'h-px') rules.push(`.${c} { height: 1px; }`);
  else if (c === 'w-px') rules.push(`.${c} { width: 1px; }`);
  else if (c === 'w-1/2') rules.push(`.${c} { width: 50%; }`);
  else if (c === 'w-1/3') rules.push(`.${c} { width: 33.333333%; }`);
  
  else if (c === 'text-jd') rules.push(`.${c} { color: #E2231A; }`);
  else if (c === 'text-gray-700') rules.push(`.${c} { color: #374151; }`);
  
  else if (c === 'bg-red-50') rules.push(`.${c} { background-color: #FEF2F2; }`);
  else if (c === 'bg-orange-50') rules.push(`.${c} { background-color: #FFF7ED; }`);
  else if (c === 'bg-blue-50') rules.push(`.${c} { background-color: #EFF6FF; }`);
  else if (c === 'bg-green-50') rules.push(`.${c} { background-color: #F0FDF4; }`);
  
  else if (c === 'rounded-t-3xl') rules.push(`.${c} { border-top-left-radius: 48rpx; border-top-right-radius: 48rpx; }`);
  else if (c === 'rounded-xl') rules.push(`.${c} { border-radius: 24rpx; }`);
  else if (c === 'rounded-lg') rules.push(`.${c} { border-radius: 16rpx; }`);
  else if (c === 'rounded-md') rules.push(`.${c} { border-radius: 8rpx; }`);
  
  else if (c === 'break-all') rules.push(`.${c} { word-break: break-all; }`);
  else if (c === 'top-0') rules.push(`.${c} { top: 0; }`);
  else if (c === 'bottom-0') rules.push(`.${c} { bottom: 0; }`);
  else if (c === 'bottom-6') rules.push(`.${c} { bottom: 48rpx; }`);
  else if (c === 'left-0') rules.push(`.${c} { left: 0; }`);
  else if (c === 'right-0') rules.push(`.${c} { right: 0; }`);
  else if (c === 'z-50') rules.push(`.${c} { z-index: 50; }`);
  else if (c === 'sticky') rules.push(`.${c} { position: sticky; }`);
});

if (rules.length > 0) {
  const css = '\n\n/* === 自动补充的 Tailwind 类 === */\n' + rules.join('\n');
  fs.appendFileSync(wxssPath, css);
  console.log(`Appended ${rules.length} classes to app.wxss`);
} else {
  console.log('No new classes to append.');
}
