from urllib.request import urlopen, Request
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'}
ret = Request("https://yande.re/post?tags=wallpaper+rating%3Asafe+score%3A%3E%3D20", headers=headers)
res = urlopen(ret)
html = res.read().decode('utf-8')
file = open(f'./debug.html', mode='wb+')
file.write(bytes(html,'utf-8'))
file.close()
