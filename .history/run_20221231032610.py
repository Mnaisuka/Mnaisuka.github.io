from urllib.request import urlopen, Request
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'}
ret = Request("https://book.sfacg.com/signin/", headers=headers)
res = urlopen(ret)
html = res.read().decode('utf-8')
file = open(f'./debug.html', mode='wb+')
file.write(html)
file.close()
