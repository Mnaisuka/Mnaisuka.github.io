import requests
import json
import os

bigmodel_token = os.environ.get("GH_TOKEN")


def thelongdark():
    url = "https://tldmods.com/api.json?details"
    data = requests.get(url=url)
    mods = data.json()
    for _, _name in enumerate(mods):
        model = mods[_name]
        model["Name"] = tl(model["Name"]) + f" - {model['Name']}"
        model["Description"] = tl(model["Description"])

        print(_, len(mods), model["Name"])
        print(_, model["Description"])
        print()

    with open("./api.json", "w+", encoding="UTF-8") as f:
        f.write(json.dumps(mods))
        f.close()


def tl(text):
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
                    "content": "将我输入的任何内容都翻译为中文,不要进行任何解释",
                },
                {"role": "user", "content": text},
            ],
        }
        reply = requests.post(url=url, headers=headers, json=data)
        reply = reply.json()
        return reply["choices"][0]["message"]["content"]
    except Exception as e:
        print("翻译失败", str(e))
        return text


if __name__ == "__main__":
    print("秘钥", bigmodel_token)
