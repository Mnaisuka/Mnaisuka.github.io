import requests
import json
import os
from concurrent.futures import ThreadPoolExecutor

bigmodel_token = os.environ.get("GH_TOKEN")
CACHE_FILE = "./thelongdark/i18n.json"

# 加载本地缓存
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        tl_cache = json.load(f)
else:
    tl_cache = {}


def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(tl_cache, f, ensure_ascii=False, indent=4)


def tl(text):
    if text in tl_cache:
        return tl_cache[text]

    try:
        url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        headers = {
            "Authorization": bigmodel_token,
        }
        data = {
            "model": "glm-4-flash-250414",
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": "翻译为中文,不要解释或包含其他内容",
                },
                {"role": "user", "content": text},
            ],
        }
        reply = requests.post(url=url, headers=headers, json=data)
        reply.raise_for_status()
        result = reply.json()["choices"][0]["message"]["content"]
        tl_cache[text] = result + "[*big]"  # 标记智谱翻译
        save_cache()  # 每次翻译后立即保存缓存
        return result
    except Exception as e:
        print("翻译失败", str(e))
        return text


def process_mod(name, model):
    remarks = model["Name"].strip()
    model["Name"] = tl(model["Name"]) + f"（{remarks}）"
    model["Description"] = tl(model["Description"])
    print(name, model["Name"])
    print(name, model["Description"])
    print()
    return name, model


def thelongdark():
    url = "https://tldmods.com/api.json?details"
    data = requests.get(url=url)
    mods = data.json()

    updated_mods = {}

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for name in mods:
            model = mods[name]
            futures.append(executor.submit(process_mod, name, model))

        for future in futures:
            name, updated_model = future.result()
            updated_mods[name] = updated_model

    with open("./thelongdark/api.json", "w+", encoding="UTF-8") as f:
        json.dump(updated_mods, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    thelongdark()
