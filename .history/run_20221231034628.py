from urllib.request import urlopen, Request
from bs4 import BeautifulSoup
ret = Request("https://yande.re/post?tags=wallpaper+rating%3Asafe+score%3A%3E%3D20")
res = urlopen(ret)
html = res.read().decode('utf-8')

soup = BeautifulSoup(html, 'html.parser')



print(
    soup.find_all('img',class_='preview')
)


""" file = open(f'./debug.html', mode='wb+')
file.write(bytes(html,'utf-8'))
file.close() """
#pip install beautifulsoup4

