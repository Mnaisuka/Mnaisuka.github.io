from urllib.request import urlopen, Request
from bs4 import BeautifulSoup
ret = Request(
    "https://yande.re/post?tags=wallpaper+rating%3Asafe+score%3A%3E%3D20")
res = urlopen(ret)
html = res.read().decode('utf-8')
soup = BeautifulSoup(html, 'html.parser')
list = soup.find_all('a', class_='largeimg')
index = 0
for name in list:
    if index < 5:
        index = index+1
        print(name.get('href'))
        img = Request(name.get('href'))
        img = urlopen(img)
        file = open('./background/TheLongDark/'+str(index)+'.jpg', mode='wb+')
        file.write(img.read())
        file.close()
