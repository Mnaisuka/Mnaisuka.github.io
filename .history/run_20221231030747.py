# -*- coding: utf-8 -*-

import requests

url = 'http://www.baidu.com'
response = requests.get(url)
print(bytes(response.text, 'gbk'))

file = open(f'./debug.text', mode='w+',encoding="utf-8")
file.write(response.text)
file.close()