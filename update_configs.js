const fs = require('fs');
const path = require('path');

const cloudFunctionsDir = path.join(__dirname, 'cloudfunctions');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules') processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.json') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Replace collection name
            content = content.replace(/['"`]system_config['"`]/g, "'30_system_config'");
            
            // Fix global_config bug in cf-sync-showcase
            if (fullPath.includes('cf-sync-showcase')) {
                content = content.replace(/\.doc\(['"`]global['"`]\)/g, ".doc('global_config')");
            }
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

processDir(cloudFunctionsDir);
console.log('Done');
