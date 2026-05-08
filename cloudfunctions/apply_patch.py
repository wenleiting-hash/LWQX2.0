import json
log_path = r'C:\Users\wlt\.gemini\antigravity\brain\1147ba05-6ada-4b0e-8e21-1b84e738d313\.system_generated\logs\overview.txt'

chunks_to_apply = []
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            d = json.loads(line)
            if 'tool_calls' in d:
                for c in d['tool_calls']:
                    if c['name'] == 'multi_replace_file_content' and 'cf-get-showcase' in c['args'].get('TargetFile', ''):
                        chunks = c['args']['ReplacementChunks']
                        if isinstance(chunks, str):
                            chunks = json.loads(chunks)
                        chunks_to_apply.append(chunks)
        except Exception as e:
            pass

if chunks_to_apply:
    target_file = r'e:\WorkProject\XLS\cloudfunctions\cf-get-showcase\index.js'
    with open(target_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will just apply the last one which has the dailyStats change
    for chunk in chunks_to_apply[-1]:
        content = content.replace(chunk['TargetContent'], chunk['ReplacementContent'])
    
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Applied patches to cf-get-showcase.")
