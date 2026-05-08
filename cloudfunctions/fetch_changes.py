import json
log_path = r'C:\Users\wlt\.gemini\antigravity\brain\1147ba05-6ada-4b0e-8e21-1b84e738d313\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            d = json.loads(line)
            if 'tool_calls' in d:
                for c in d['tool_calls']:
                    if c['name'] == 'multi_replace_file_content' and 'cf-get-showcase' in c['args'].get('TargetFile', ''):
                        print(json.dumps(c['args']['ReplacementChunks']))
        except Exception as e:
            pass
