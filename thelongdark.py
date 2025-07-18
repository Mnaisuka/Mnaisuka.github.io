import requests
import re
import json
import time
import re
import os

proxies = {"http": None, "https": None}

url = "https://tldmods.com/api.json?details"
response = requests.get(url, proxies=proxies)  # 获取所有作者提供的列表
mods = response.json()


write = []

index = 0

for _, mod in enumerate(mods):
    t = {
        "title": mod,
        "author": mods[mod]["Author"],
        "game_ver": mods[mod]["TestedOn"]["tld"],
        "load_ver": mods[mod]["TestedOn"]["ml"],
        "download": mods[mod]["Download"]["browser_download_url"],
        "dependence": mods[mod]["Description"],
        "update": mods[mod]["Updated"],
        "github": mods[mod]["ModUrl"],
        "status": mods[mod]["Status"]["working"],
    }
    write.append(json.dumps(t))
    print(_, len(mods), mod)

arr_str = "[" + (",".join(write)) + "]"

if os.path.exists("./game/thelongdark/api"):
    print("该目录存在！3")
else:
    print("该目录不存在！3")
    os.makedirs("./game/thelongdark/api")

with open("./game/thelongdark/api/item.json", "w+") as f:
    f.write(arr_str)
    f.close()
# 项目按日期排序
with open("./game/thelongdark/api/item.json", "r", encoding="UTF-8") as f:
    item = json.load(f)


def getTimestamp(text: str):
    arr = re.findall("(\d+)\D(\d+)\D(\d+)", text)
    print("时间戳", text)
    try:
        return time.mktime(
            time.strptime(
                f"{arr[0][0]}-{arr[0][1]}-{arr[0][2]} 00:00:00", "%Y-%m-%d %H:%M:%S"
            )
        )
    except:
        return time.mktime(time.strptime("1970-01-01 00:00:00", "%Y-%m-%d %H:%M:%S"))


try:
    item.sort(key=lambda x: getTimestamp(x["update"]), reverse=True)
    with open("./game/thelongdark/api/item.json", "w+", encoding="UTF-8") as f:
        f.write(json.dumps(item))
        f.close()

    # 根据排序写出文本
    if not os.path.exists("./game/thelongdark/api/transl.json"):
        f = open("./game/thelongdark/api/transl.json", "w+")
        f.write("{}")
        f.close()
    with open(
        "./game/thelongdark/api/transl.json", "r+", encoding="UTF-8"
    ) as f:  # 读汉化文件
        transl = json.load(f)
        f.close()
    for this in item:
        if not (this["title"] in transl):
            transl[this["title"]] = "[×]" + this["title"]
        if not (this["detailed"] in transl):
            transl[this["detailed"]] = "[×]" + this["detailed"]
    with open("./game/thelongdark/api/transl.json", "w+") as f:  # 写汉化文件
        f.write(json.dumps(transl))
        f.close()

except Exception as e:
    print("未知错误",str(e))
