const fs = require('fs');
const path = require('path');

const cloudFunctionsDir = path.join(__dirname, 'cloudfunctions');

const replacements = {
    "['\"`]admin_users['\"`]": "'30_users'",
    "['\"`]users['\"`]": "'30_members'",
    "['\"`]tk_orders['\"`]": "'30_orders'",
    "['\"`]task_logs['\"`]": "'30_task_logs'",
    "['\"`]daily_stats['\"`]": "'30_daily_stats'",
    "['\"`]showcase_events_cache['\"`]": "'30_showcase_events_cache'"
};

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules') processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            for (const [pattern, replacement] of Object.entries(replacements)) {
                const regex = new RegExp(pattern, 'g');
                content = content.replace(regex, replacement);
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
