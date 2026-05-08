const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'images', 'tabbar');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

let svgs = {};
files.forEach(f => {
  svgs[f.replace('.svg', '')] = fs.readFileSync(path.join(dir, f), 'utf-8');
});

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>TabBar 图标 SVG转PNG 工具</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #f5f5f5; text-align: center; color: #333; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 20px; max-width: 800px; margin-left: auto; margin-right: auto; }
  .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); width: 140px; }
  .card h4 { margin: 0 0 10px 0; font-size: 14px; font-weight: normal; color: #666; }
  canvas { display: block; margin: 0 auto; border-radius: 8px; background: #fafafa; border: 1px dashed #ddd; width: 81px; height: 81px; }
  button { background: #FF6200; color: white; border: none; padding: 12px 24px; border-radius: 100px; cursor: pointer; font-size: 18px; font-weight: bold; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(255,98,0,0.3); }
  button:hover { opacity: 0.9; }
</style>
</head>
<body>
  <h1>TabBar 高清图标生成器</h1>
  <p style="color: #666; margin-bottom: 30px;">由于微信小程序限制，此工具会将下载的 SVG 高质量渲染为标准尺寸（81x81）透明背景的 PNG</p>
  
  <button onclick="downloadAll()">⚡ 一键打包下载全部 10 个 PNG 图标</button>
  
  <p style="margin-top: 10px; font-size: 13px; color: #999;">如果浏览器弹窗拦截，请选择"允许下载多个文件"。<br>下载后，请将这 10 个图片直接拖入 /miniprogram/images/tabbar 目录覆盖旧文件。</p>
  
  <div class="grid" id="grid"></div>

<script>
  const svgs = ${JSON.stringify(svgs)};
  const grid = document.getElementById('grid');
  const pngUrls = {};

  Object.keys(svgs).forEach(name => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h4>' + name + '.png</h4>';
    
    const canvas = document.createElement('canvas');
    // Set actual resolution to 162x162, display as 81x81
    canvas.width = 162;
    canvas.height = 162;
    canvas.style.width = '81px';
    canvas.style.height = '81px';
    card.appendChild(canvas);
    
    grid.appendChild(card);

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgData = svgs[name];
    const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      ctx.clearRect(0, 0, 162, 162);
      ctx.drawImage(img, 16, 16, 130, 130); 
      pngUrls[name] = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  function downloadAll() {
    const names = Object.keys(pngUrls);
    if(names.length === 0) {
      alert("图标尚未加载完成，请稍等一秒再点击");
      return;
    }
    
    let delay = 0;
    names.forEach((name) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = pngUrls[name];
        a.download = name + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, delay);
      delay += 300; 
    });
  }
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'convert.html'), html);
console.log('HTML tool generated at convert.html');
