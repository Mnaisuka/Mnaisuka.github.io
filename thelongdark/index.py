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
    if not text:
        return text

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

        reply = requests.post(url=url, headers=headers, json=data, timeout=60)
        reply.raise_for_status()

        result = reply.json()["choices"][0]["message"]["content"].strip()
        tl_cache[text] = result
        save_cache()

        return result

    except Exception as e:
        print("翻译失败:", str(e))
        return text


def process_mod(model):
    """
    新数据结构为 list[dict]
    使用 DisplayName 作为展示名
    """

    original_name = model.get("DisplayName") or model.get("Name")
    remarks = original_name.strip() if original_name else ""

    # 翻译显示名
    if original_name:
        model["Name"] = tl(original_name) + f"（{remarks}）"

    # 翻译描述
    if model.get("Description"):
        model["Description"] = tl(model["Description"])

    print(model.get("DisplayName"), model.get("Name"))
    print(model.get("DisplayName"), model.get("Description"))
    print()

    return model


def thelongdark():
    url = "https://tldmods.com/api.json?details"

    response = requests.get(url=url, timeout=60)
    response.raise_for_status()

    mods = response.json()  # 新结构是 list

    updated_mods = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(process_mod, mods)
        updated_mods = list(results)

    with open("./thelongdark/api.json", "w+", encoding="UTF-8") as f:
        json.dump(updated_mods, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    thelongdark()
