import json
import re
import time


with open('D:/Desktop/bata.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)


def ddd(text: str):
    arr = re.findall('(\d+)\D(\d+)\D(\d+)', text)
    print(arr, text)

    time.mktime(time.strptime(f'{arr[0]}-{arr[1]}-{arr[2]} 00:00:00', '%Y-%m-%d %H:%M:%S'))

    return text


item.sort(key=lambda x: ddd(x["update"]))


with open('D:/Desktop/Z.JSON', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))
