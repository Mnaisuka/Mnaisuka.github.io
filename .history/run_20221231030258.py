# -*- coding: utf-8 -*-

import requests
import json

url = 'http://www.baidu.com'
response = requests.get(url)
print(response.text)

file = open(f'./debug.text', mode='w+')
file.write(response.text)
file.close()