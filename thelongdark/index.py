import requests
import json
import os
import logging
from concurrent.futures import ThreadPoolExecutor


def google_translate_api(raws, source="auto", target="zh-ch", timeout=30):
    for _, m in enumerate(raws):
        if len(m) == 0:
            raws[_] = " "
    url = "https://translate-pa.googleapis.com/v1/translateHtml"
    payload = json.dumps([
        [
            raws,
            source,
            target
        ],
        "wt_lib"
    ])
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "X-Goog-API-Key": "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520",
        "Content-Type": "application/json+protobuf"
    }
    try:
        response = requests.post(url, headers=headers,
                                 data=payload, timeout=timeout)
        response.raise_for_status()

        return response.json()[0]
    except requests.exceptions.RequestException as e:
        return f"Request Error: {e}"


CACHE_FILE = "./thelongdark/transl_cache.json"

# 加载本地缓存
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        tl_cache = json.load(f)
else:
    tl_cache = {}


def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(tl_cache, f, ensure_ascii=False, indent=4)


def thelongdark():
    url = "https://tldmods.net/api.json?details"

    response = requests.get(url=url, timeout=60)
    response.raise_for_status()
    updated_mods = response.json()

    BATCH_SIZE = 100
    to_translate = []
    for mod in updated_mods:
        for key in ['DisplayName', 'Description']:
            original = mod[key]
            if original not in tl_cache:
                to_translate.append(original)
    to_translate = list(set(to_translate))
    for i in range(0, len(to_translate), BATCH_SIZE):
        batch = to_translate[i:i+BATCH_SIZE]
        try:
            results = google_translate_api(batch)
            if isinstance(results, list) and len(results) == len(batch):
                for src, dst in zip(batch, results):
                    tl_cache[src] = dst
                save_cache()
        except Exception:
            logging.exception('批量翻译发生异常')
    for mod in updated_mods:
        for key in ['DisplayName', 'Description']:
            original = mod[key]
            if original in tl_cache:
                mod[key] = tl_cache[original]

    print(updated_mods)

    with open("./thelongdark/api.json", "w+", encoding="UTF-8") as f:
        json.dump(updated_mods, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    thelongdark()
