import json


with open('./game/thelongdark/api/item.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)
print(item)

print("\n\n")

item.sort(key = lambda x:x["update"])

print(item)