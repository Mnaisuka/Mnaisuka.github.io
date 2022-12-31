import requests,js2py,json

proxies = {
  "http": "127.0.0.1:7890",
  "https": "127.0.0.1:7890",
}

url = 'https://xpazeman.com/tld-mod-list/assets/js/ModSources.js'
response = requests.get(url,proxies=proxies)#获取所有作者提供的列表
getlist = js2py.eval_js("function get(){\n"+response.text+"\n return modSources}")
arrlist = json.loads(str(getlist()).replace("'",'"'))
print(arrlist['list'])
write = []

index = 0
for url in arrlist['list']:
    index = index +1
    mods = requests.get(url,proxies=proxies).json()
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
    print(index,len(arrlist['list']))
arr_str = '['+(','.join (write))+']'
with open('./game/thelongdark/api/item.json', 'w+') as f:
    f.write(arr_str)
    
    