const fs = require('fs');
const path = require('path');

// 尝试引入 xlsx 库
let xlsx;
try {
  xlsx = require('xlsx');
} catch (e) {
  console.error("需要安装 xlsx 库。请在终端执行:\n\nnpm install xlsx\n\n然后重新运行此脚本。");
  process.exit(1);
}

const inputPath = path.resolve(__dirname, 'Documents/小栗鼠3.0-小程序端功能清单.xlsx');
const outputPath = path.resolve(__dirname, 'Documents/小栗鼠3.0-小程序端功能清单.md');

try {
  console.log(`正在读取: ${inputPath}`);
  const workbook = xlsx.readFile(inputPath);
  
  let mdContent = `# 小栗鼠3.0-小程序端功能清单\n\n`;

  // 遍历所有 sheet
  workbook.SheetNames.forEach(sheetName => {
    mdContent += `## ${sheetName}\n\n`;
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) {
      mdContent += `*(空)*\n\n`;
      return;
    }

    // 获取最大列数对齐
    let maxCols = 0;
    data.forEach(row => {
      if (row.length > maxCols) maxCols = row.length;
    });

    // 表头
    const headers = data[0].concat(Array(maxCols - data[0].length).fill(''));
    mdContent += `| ${headers.map(h => (h == null ? '' : String(h).replace(/\|/g, '\\|'))).join(' | ')} |\n`;
    mdContent += `| ${Array(maxCols).fill('---').join(' | ')} |\n`;

    // 数据行
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (row.length === 0) continue; // 跳过空行
      
      row = row.concat(Array(maxCols - row.length).fill(''));
      row = row.map(cell => {
        if (cell == null) return '';
        // 处理单元格中的换行和特殊字符
        return String(cell).replace(/\n/g, '<br>').replace(/\|/g, '\\|');
      });
      mdContent += `| ${row.join(' | ')} |\n`;
    }
    mdContent += `\n`;
  });

  fs.writeFileSync(outputPath, mdContent, 'utf8');
  console.log(`✅ 成功！已生成 Markdown 文件: ${outputPath}`);

} catch (error) {
  console.error("转换出错:", error.message);
}
