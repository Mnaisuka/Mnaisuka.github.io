# -*- coding: utf-8 -*-

import requests

url = 'http://www.baidu.com'
response = requests.get(url)
print(response.encoding)
s=response.content
s.decode('ISO-8859-1')

file = open(f'./debug.text', mode='w+',encoding="utf-8")
file.write(response.text)
file.close()