from urllib.request import urlopen, Request
from bs4 import BeautifulSoup
ret = Request("https://yande.re/post?tags=wallpaper+rating%3Asafe+score%3A%3E%3D20")
res = urlopen(ret)
html = res.read().decode('utf-8')

soup = BeautifulSoup(html, 'html.parser')

list = soup.find_all('a',class_='largeimg')

for name in list :
    print(list[name]['href'])


""" file = open(f'./debug.html', mode='wb+')
file.write(bytes(html,'utf-8'))
file.close() """
#pip install beautifulsoup4

