import json
import re,os
import time


with open('./game/thelongdark/api/item.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)


def getTimestamp(text: str):
    arr = re.findall('(\d+)\D(\d+)\D(\d+)', text)
    return time.mktime(time.strptime(f'{arr[0][0]}-{arr[0][1]}-{arr[0][2]} 00:00:00', '%Y-%m-%d %H:%M:%S'))


item.sort(key=lambda x: getTimestamp(x["update"]), reverse=True)
with open('./game/thelongdark/api/item.json', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))

with open('./game/thelongdark/api/transl.json', 'r+', encoding='UTF-8') as f:#读汉化文件
    if not f.read():
        transl = json.loads("{}")
    else:
        print(f)
        transl = json.load(f)

for this in item:
    if not (this['title'] in transl):
        transl[this['title']] = '[×]'+this['title']
        print('创建新节点', this['title'])
    if not (this['detailed'] in transl):
        transl[this['detailed']] = '[×]'+this['detailed']
        print('创建新节点', this['detailed'])
with open('./game/thelongdark/api/transl.json', 'w+') as f:  # 写汉化文件
    f.write(json.dumps(transl))
