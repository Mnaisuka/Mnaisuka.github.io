import requests
import js2py
import json
import time
import re

proxies = {
    "http": "127.0.0.1:7890",
    "https": "127.0.0.1:7890",
}

url = 'https://xpazeman.com/tld-mod-list/assets/js/ModSources.js'
response = requests.get(url, proxies=proxies)  # 获取所有作者提供的列表
getlist = js2py.eval_js(
    "function get(){\n"+response.text+"\n return modSources}")
arrlist = json.loads(str(getlist()).replace("'", '"'))
write = []

index = 0
for url in arrlist['list']:
    index = index + 1
    mods = requests.get(url, proxies=proxies).json()
    for info in mods['mods']:
        wdict = {}
        wdict['author'] = mods['author']
        wdict['title'] = info['name']
        wdict['game_ver'] = info['testedon']['tldversion']
        wdict['load_ver'] = info['testedon']['mlversion']
        wdict['download'] = info['downloadURL']
        dependencies = info['dependencies']
        if not dependencies:
            dependencies = "undefined"
        else:
            dependencies = ','.join(dependencies)
        wdict['dependence'] = dependencies
        wdict['detailed'] = info['description']
        wdict['update'] = info['updated']
        wdict['github'] = info['modURL']
        wdict['status'] = info['status']['working']
        write.append(json.dumps(wdict))
    print(index, len(arrlist['list']))
arr_str = '['+(','.join(write))+']'
with open('./game/thelongdark/api/item.json', 'w+') as f:
    f.write(arr_str)


with open('./game/thelongdark/api/item.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)
def getTimestamp(text: str):
    arr = re.findall('(\d+)\D(\d+)\D(\d+)', text)
    return time.mktime(time.strptime(f'{arr[0][0]}-{arr[0][1]}-{arr[0][2]} 00:00:00', '%Y-%m-%d %H:%M:%S'))
item.sort(key=lambda x: getTimestamp(x["update"]), reverse=True)
with open('./game/thelongdark/api/item.json', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))

with open('./game/thelongdark/api/transl.json', 'w+', encoding='UTF-8') as f:#读汉化文件
    transl = json.load(f)
for this in item:
    if not (this['detailed'] in transl):
        transl[this['detailed']] = '[×]'+this['detailed']
        print('创建新节点', this['detailed'])
    if not (this['title'] in transl):
        transl[this['title']] = '[×]'+this['title']
        print('创建新节点', this['title'])
    ...
with open('./game/thelongdark/api/transl.json', 'w+') as f:#写汉化文件
    f.write(json.dumps(transl))
