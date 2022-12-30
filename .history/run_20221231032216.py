# -*- coding: utf-8 -*-

import requests



def http(url):
    def bytes_to_str(data): 
        return data.decode('utf-8')
    response = requests.get(url)
    response = response.content.decode('ISO-8859-1')
    #print(bytes_to_str(response))
    file = open(f'./debug.text', mode='wb+')
    file.write(response)
    file.close()
http('https://book.sfacg.com/')