# -*- coding: utf-8 -*-

import requests

url = 'http://www.baidu.com'
response = requests.get(url)
print(response.encoding)
response=response.content
response.decode('ISO-8859-1')

def bin2str(binary):
    return ''.join(chr(int(binary[i*8:i*8+8],2)) for i in range(len(binary)//8))

print(bin2str(response))

file = open(f'./debug.text', mode='wb+')
file.write(response)
file.close()
