import os
import json

base_dir = r'C:\Users\wlt\.gemini\antigravity\brain'
for conv in os.listdir(base_dir):
    log_path = os.path.join(base_dir, conv, '.system_generated', 'logs', 'overview.txt')
    if os.path.exists(log_path):
        with open(log_path, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    d = json.loads(line)
                    if 'tool_calls' in d:
                        for c in d['tool_calls']:
                            if c['name'] == 'write_to_file':
                                target = c['args'].get('TargetFile', '')
                                if 'cf-get-showcase' in target or 'cf-coupon-search' in target:
                                    print('Found write in', conv, target)
                                    with open('recovered_' + target.split('\\')[-2] + '.js', 'w', encoding='utf-8') as outf:
                                        outf.write(c['args']['CodeContent'])
                except:
                    pass
