import json
import re
import time


with open('D:/Desktop/bata.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)


def getTimestamp(text: str):
    arr = re.findall('(\d+)\D(\d+)\D(\d+)', text)
    print(arr, text)
    print(time.mktime(time.strptime(f'{arr[0][0]}-{arr[0][1]}-{arr[0][2]} 00:00:00', '%Y-%m-%d %H:%M:%S')))
    
    return text
item.sort(key=lambda x: getTimestamp(x["update"]), reverse=True)




with open('D:/Desktop/Z.JSON', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))
