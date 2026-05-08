import json
log_path = r'C:\Users\wlt\.gemini\antigravity\brain\3b1b6cd3-4d22-427b-a58a-7dffb8fdef84\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            d = json.loads(line)
            if 'tool_calls' in d:
                for c in d['tool_calls']:
                    if c['name'] == 'write_to_file' and 'cf-get-showcase' in c['args'].get('TargetFile', '') and 'index.js' in c['args'].get('TargetFile', ''):
                        with open('cf-get-showcase/index.js', 'w', encoding='utf-8') as outf:
                            outf.write(c['args']['CodeContent'])
        except Exception as e:
            pass
