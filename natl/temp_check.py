import pathlib, re
text = pathlib.Path('tab_script.js').read_text(encoding='utf-8')
cleaned = re.sub(r'//.*|/\*.*?\*/|"(?:\\\\.|[^\\\"])*"|\'(?:\\\\.|[^\\\'])*\'|`(?:\\\\.|[^\\`])*`', '', text, flags=re.S)
print('counts', cleaned.count('{'), cleaned.count('}'))
