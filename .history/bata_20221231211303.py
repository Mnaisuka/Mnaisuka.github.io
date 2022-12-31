import json,re


with open('D:/Desktop/bata.json', 'r', encoding='UTF-8') as f:
    item = json.load(f)

def ddd(text:str):
    print(re.findall('\d+-\d+-\d+',text),text)

item.sort(key = lambda x:ddd(x["update"]))

""" import time
time.mktime(time.strptime('2019-01-01 00:00:00', '%Y-%m-%d %H:%M:%S')) """



with open('D:/Desktop/Z.JSON', 'w+', encoding='UTF-8') as f:
    f.write(json.dumps(item))



