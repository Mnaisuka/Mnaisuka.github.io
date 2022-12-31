import requests
import js2py
import json
import time
import re,os

proxies = {
    "http":None,
    "https": None,
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
        wdict['title'] = info['name']
        wdict['author'] = mods['author']
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
with open('/game/thelongdark/api/item.json', 'w+') as f:
    f.write(arr_str)
    f.close()

#项目按日期排序
with open('/game/thelongdark/api/item.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)
def getTimestamp(text: str):
    arr = re.findall('(\d+)\D(\d+)\D(\d+)', text)
    return time.mktime(time.strptime(f'{arr[0][0]}-{arr[0][1]}-{arr[0][2]} 00:00:00', '%Y-%m-%d %H:%M:%S'))
item.sort(key=lambda x: getTimestamp(x["update"]), reverse=True)
with open('./game/thelongdark/api/item.json', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))
    f.close()

#根据排序写出文本
if not os.path.exists('./game/thelongdark/api/transl.json'):
    f = open('./game/thelongdark/api/transl.json', 'w+') 
    f.write("{}")
    f.close()
with open('./game/thelongdark/api/transl.json', 'r+', encoding='UTF-8') as f:#读汉化文件
    transl = json.load(f)
    f.close()
for this in item:
    if not (this['title'] in transl):
        transl[this['title']] = '[×]'+this['title']
    if not (this['detailed'] in transl):
        transl[this['detailed']] = '[×]'+this['detailed']
with open('./game/thelongdark/api/transl.json', 'w+') as f:  # 写汉化文件
    f.write(json.dumps(transl))
    f.close()