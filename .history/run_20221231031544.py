# -*- coding: utf-8 -*-

import requests

url = 'http://www.baidu.com'
response = requests.get(url)
print(response.encoding)
response=response.content
response.decode('ISO-8859-1')

file = open(f'./debug.text', mode='wb+')
file.write(response)
file.close()
