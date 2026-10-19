import requests
import json
import os
import logging
import hashlib
import tempfile
from concurrent.futures import ThreadPoolExecutor


IMAGE_DIR = os.path.join(os.path.dirname(__file__), "assets", "img", "mods")
IMAGE_PUBLIC_PATH = "/thelongdark/assets/img/mods"
MAX_IMAGE_BYTES = 20 * 1024 * 1024
IMAGE_MIME_EXTENSIONS = {
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}


def _local_image_path(filename, content):
    version = hashlib.sha256(content).hexdigest()[:12]
    return f"{IMAGE_PUBLIC_PATH}/{filename}?v={version}"


def _existing_image(url_key):
    if not os.path.isdir(IMAGE_DIR):
        return None

    for filename in os.listdir(IMAGE_DIR):
        if filename.startswith(url_key + "."):
            path = os.path.join(IMAGE_DIR, filename)
            if os.path.isfile(path):
                with open(path, "rb") as image_file:
                    return filename, image_file.read()
    return None


def download_image(url):
    if not url.startswith(("http://", "https://")):
        return url

    url_key = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    temp_path = None
    try:
        os.makedirs(IMAGE_DIR, exist_ok=True)
        with requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            stream=True,
            timeout=(10, 30),
        ) as response:
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
            extension = IMAGE_MIME_EXTENSIONS.get(content_type)
            if not extension:
                raise ValueError(f"unsupported image content type: {content_type or 'missing'}")

            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_IMAGE_BYTES:
                raise ValueError(f"image exceeds {MAX_IMAGE_BYTES} bytes")

            content = bytearray()
            for chunk in response.iter_content(chunk_size=64 * 1024):
                content.extend(chunk)
                if len(content) > MAX_IMAGE_BYTES:
                    raise ValueError(f"image exceeds {MAX_IMAGE_BYTES} bytes")
            if not content:
                raise ValueError("empty image response")

        filename = f"{url_key}{extension}"
        output_path = os.path.join(IMAGE_DIR, filename)
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=IMAGE_DIR, prefix=f".{url_key}-", suffix=".tmp", delete=False
        ) as image_file:
            temp_path = image_file.name
            image_file.write(content)
        os.replace(temp_path, output_path)
        temp_path = None

        for existing in os.listdir(IMAGE_DIR):
            if existing.startswith(url_key + ".") and existing != filename:
                os.remove(os.path.join(IMAGE_DIR, existing))

        return _local_image_path(filename, content)
    except (requests.exceptions.RequestException, OSError, ValueError) as error:
        logging.warning("Could not mirror image %s: %s", url, error)
        existing = _existing_image(url_key)
        if existing:
            filename, content = existing
            logging.warning("Using previously mirrored image for %s", url)
            return _local_image_path(filename, content)
        return url
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def mirror_images(mods):
    urls = {
        image
        for mod in mods
        for image in (mod.get("Images") or [])
        if isinstance(image, str) and image.startswith(("http://", "https://"))
    }
    mirrored = {}
    if urls:
        with ThreadPoolExecutor(max_workers=8) as executor:
            mirrored = dict(zip(urls, executor.map(download_image, urls)))

    for mod in mods:
        images = mod.get("Images") or []
        mod["Images"] = [
            mirrored.get(image, image)
            for image in images
            if isinstance(image, str) and image.strip()
        ]

    local_count = sum(
        image.startswith(IMAGE_PUBLIC_PATH + "/") for image in mirrored.values()
    )
    print(f"Mirrored {local_count} of {len(urls)} unique mod images.")


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
HIGH_QUALITY_MOD_CACHE_FILE = os.path.join(os.path.dirname(__file__), "high_quality_mod_translations.json")

def load_translation_cache(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as cache_file:
        return json.load(cache_file)


tl_cache = load_translation_cache(CACHE_FILE)
high_quality_mod_cache = load_translation_cache(HIGH_QUALITY_MOD_CACHE_FILE)


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
            mod_translation = high_quality_mod_cache.get(mod.get("Name"), {}).get(key)
            if mod_translation is not None:
                continue
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
            mod_translation = high_quality_mod_cache.get(mod.get("Name"), {}).get(key)
            if mod_translation is not None:
                mod[key] = mod_translation
            elif original in tl_cache:
                mod[key] = tl_cache[original]

    mirror_images(updated_mods)

    with open("./thelongdark/api.json", "w+", encoding="UTF-8") as f:
        json.dump(updated_mods, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    thelongdark()
