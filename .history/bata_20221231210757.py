import json


with open('D:/Desktop/bata.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)

item.sort(key = lambda x:x["update"])

with open('D:/Desktop/Z.JSON', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))