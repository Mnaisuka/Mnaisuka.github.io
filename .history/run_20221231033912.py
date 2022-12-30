from urllib.request import urlopen, Request
ret = Request("https://yande.re/post?tags=wallpaper+rating%3Asafe+score%3A%3E%3D20")
res = urlopen(ret)
html = res.read().decode('utf-8')
file = open(f'./debug.html', mode='wb+')
file.write(bytes(html,'utf-8'))
file.close()
