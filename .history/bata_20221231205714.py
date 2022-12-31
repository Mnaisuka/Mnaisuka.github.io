import json


with open('./game/thelongdark/api/item.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)


item.sort(key = lambda x:x["update"])

#result = sorted(item.items(), key=lambda x:x['update'])

print(result)