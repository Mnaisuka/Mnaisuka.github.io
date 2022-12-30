# -*- coding: utf-8 -*-

import requests
import json

url = 'http://www.baidu.com'
response = requests.get(url)

print(response.content.decode('gbk'))

file = open(f'./debug.text', mode='w+',encoding="utf-8")
file.write(response.text)
file.close()