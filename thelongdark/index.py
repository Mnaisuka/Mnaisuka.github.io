
import hashlib
import json
import logging
import os
import tempfile
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests


# ============================================================
# 一、基础路径与全局配置
# ============================================================

# 获取当前 Python 文件所在的绝对目录。
# __file__ 表示当前脚本文件的路径。
# 这样无论从哪个目录运行脚本，都不会因为当前工作目录不同而找错文件。
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 本地模组图片的保存目录。
# os.path.join 会根据当前操作系统自动组合路径。
IMAGE_DIR = os.path.join(BASE_DIR, "assets", "img", "mods")

# 图片在网站上的公开访问路径。
# 这里是网站 URL 路径，不是 Windows 或 Linux 的本地磁盘路径。
IMAGE_PUBLIC_PATH = "/thelongdark/assets/img/mods"

# 图片备用代理接口。
# 当原始图片地址下载失败时，使用代理服务器获取图片。
IMAGE_PROXY_URL = "https://mnaisuka.ccwu.cc/img?url="

# 单张图片允许下载的最大字节数。
# 20 * 1024 * 1024 = 20 MiB。
# 下载过程中也会实时检查，避免服务器未提供 Content-Length 时无限下载。
MAX_IMAGE_BYTES = 20 * 1024 * 1024

# 图片 MIME 类型与文件扩展名的对应关系。
# 优先根据服务器返回的 Content-Type 判断图片格式。
# 使用白名单可以避免将任意未知格式的数据保存为图片文件。
IMAGE_MIME_EXTENSIONS = {
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}

# 模组 API 地址。
# 保留原有接口，不改变数据来源。
MOD_API_URL = "https://tldmods.net/api.json?details"

# 翻译缓存文件。
# 使用绝对路径，避免从其他工作目录启动时创建错误的缓存文件。
CACHE_FILE = os.path.join(BASE_DIR, "transl_cache.json")

# 高质量模组翻译缓存。
# 此缓存优先级高于普通机器翻译缓存。
HIGH_QUALITY_MOD_CACHE_FILE = os.path.join(
    BASE_DIR,
    "high_quality_mod_translations.json",
)

# 最终生成的模组 API JSON 文件。
OUTPUT_FILE = os.path.join(BASE_DIR, "api.json")

# 正常 API 约有 307 条记录。低于 300 条时先停止更新，防止异常响应覆盖旧文件。
MIN_EXPECTED_MODS = 300

# 记录异常 API 原始响应，便于判断数据是在上游就不完整，还是后续处理造成的。
RAW_RESPONSE_FILE = os.path.join(BASE_DIR, "api_debug_response.json")

# 每次提交给翻译接口的文本数量。
# 数值越大，请求次数通常越少，但单次请求的数据量也越大。
BATCH_SIZE = 100

# 图片下载的最大并发线程数。
# 每个线程独立处理一张图片，避免串行下载耗时过长。
IMAGE_WORKERS = 8

# 网络请求的默认超时时间。
# 元组中的第一个数字是连接超时，第二个数字是读取超时。
REQUEST_TIMEOUT = (10, 30)

# 配置日志格式。
# INFO 用于显示运行进度，WARNING 用于记录可恢复的问题，
# ERROR 用于记录失败，EXCEPTION 还会输出异常堆栈。
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


# ============================================================
# 二、通用 JSON 文件读写函数
# ============================================================

def atomic_write_json(path, data, indent=4):
    """
    将 Python 数据安全地写入 JSON 文件。

    参数：
        path:
            最终 JSON 文件的完整路径。

        data:
            需要保存的 Python 对象，例如字典或列表。

        indent:
            JSON 缩进空格数，用于控制文件的可读性。

    处理流程：
        1. 确保目标目录存在。
        2. 在目标目录中创建临时文件。
        3. 将完整 JSON 内容写入临时文件。
        4. 刷新 Python 缓冲区，并尽可能同步写入磁盘。
        5. 使用 os.replace() 替换目标文件。

    为什么不直接 open(path, "w")？

        直接使用写入模式打开已有文件，会立即截断原文件。
        如果程序在写入过程中被强制关闭，原文件可能只剩下一部分 JSON。

        临时文件加 os.replace() 可以避免大多数此类问题。
        临时文件与目标文件位于同一目录，也有利于保证替换操作的原子性。

    注意：
        原子替换不等于所有硬件、文件系统和断电情况下都绝对不会丢失数据。
    """

    # 获取目标文件所在目录。
    # 例如 /project/thelongdark/api.json 对应 /project/thelongdark。
    directory = os.path.dirname(os.path.abspath(path))

    # 如果目录不存在则创建；如果已经存在则不报错。
    os.makedirs(directory, exist_ok=True)

    # 默认没有创建临时文件，因此使用 None 作为初始状态。
    temp_path = None

    try:
        # 使用 UTF-8 编码创建临时文件。
        # delete=False 是为了在关闭文件后继续通过 os.replace() 使用它。
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=directory,
            prefix=".json-",
            suffix=".tmp",
            delete=False,
        ) as temp_file:

            # 记录临时文件路径，以便失败时删除。
            temp_path = temp_file.name

            # ensure_ascii=False 保留中文，不将其转换为 \uXXXX。
            # indent 控制缩进，便于人工查看和排查问题。
            json.dump(
                data,
                temp_file,
                ensure_ascii=False,
                indent=indent,
            )

            # 补充结尾换行，方便使用文本编辑器查看。
            temp_file.write("\n")

            # 将 Python 缓冲区中的内容推送给操作系统。
            temp_file.flush()

            # 尽可能请求操作系统将文件数据同步到磁盘。
            # 某些文件系统或设备仍可能有额外的缓存机制。
            os.fsync(temp_file.fileno())

        # 临时文件已经关闭，现在用完整文件替换目标文件。
        # 如果目标文件不存在，则相当于将临时文件移动到目标位置。
        os.replace(temp_path, path)

        # 替换成功后，临时文件路径已经不再存在。
        # 将变量重置，避免 finally 再尝试删除。
        temp_path = None

    finally:
        # 如果写入或替换失败，尽量清理遗留的临时文件。
        # 清理失败不应该覆盖最初发生的异常。
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                logging.warning(
                    "无法清理临时 JSON 文件：%s",
                    temp_path,
                )


def log_mod_stats(stage, mods):
    """输出条目数、重复名称和完全重复记录，辅助定位数据异常。"""
    if not isinstance(mods, list):
        logging.warning("[%s] 数据不是列表：%s", stage, type(mods).__name__)
        return

    valid_mods = [mod for mod in mods if isinstance(mod, dict)]
    names = [mod.get("Name") for mod in valid_mods if mod.get("Name")]
    name_counts = Counter(names)
    duplicate_names = {
        name: count for name, count in name_counts.items() if count > 1
    }

    object_counts = Counter(
        json.dumps(mod, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        for mod in valid_mods
    )
    exact_duplicates = sum(count - 1 for count in object_counts.values() if count > 1)

    logging.info(
        "[%s] 总条目=%s，有效字典=%s，缺失/空 Name=%s，重复 Name 组=%s，完全重复多余条目=%s",
        stage,
        len(mods),
        len(valid_mods),
        sum(not mod.get("Name") for mod in valid_mods),
        len(duplicate_names),
        exact_duplicates,
    )

    if duplicate_names:
        logging.warning("[%s] 重复 Name（最多显示 30 组）：%s", stage, dict(list(duplicate_names.items())[:30]))


def save_debug_response(response):
    """保存异常 API 的原始响应，避免只能从处理后的数据猜原因。"""
    try:
        with open(RAW_RESPONSE_FILE, "wb") as debug_file:
            debug_file.write(response.content)
        logging.warning("已保存 API 原始响应：%s（%s 字节）", RAW_RESPONSE_FILE, len(response.content))
    except OSError:
        logging.exception("保存 API 原始响应失败：%s", RAW_RESPONSE_FILE)


def load_translation_cache(path):
    """
    读取 JSON 翻译缓存。

    正常情况下，缓存文件应当是字典：
        {
            "原文": "译文"
        }

    如果文件不存在，则返回空字典。

    如果 JSON 格式损坏：
        1. 输出异常日志。
        2. 尝试将损坏文件改名为 .corrupt。
        3. 返回空字典，允许程序继续运行。

    如果文件内容不是字典，也视为无效缓存。

    注意：
        如果损坏文件无法恢复或备份失败，日志会明确记录。
        此时返回空字典只是为了允许当前运行继续，不能保证原缓存可以恢复。
    """

    # 缓存不存在通常意味着第一次运行，或尚未生成缓存。
    if not os.path.isfile(path):
        logging.info("缓存文件不存在，将创建新缓存：%s", path)
        return {}

    try:
        # 使用 UTF-8 读取缓存，避免中文乱码。
        with open(path, "r", encoding="utf-8") as cache_file:
            cache = json.load(cache_file)

        # 防止缓存文件虽然是合法 JSON，却不是字典。
        # 例如文件中意外写入了 []、null 或普通字符串。
        if not isinstance(cache, dict):
            raise ValueError("缓存 JSON 的根节点必须是字典")

        # 返回正常加载的缓存。
        return cache

    except (OSError, UnicodeError, json.JSONDecodeError, ValueError):
        # logging.exception 会自动附带当前异常的堆栈信息。
        logging.exception("读取缓存失败：%s", path)

        # 损坏缓存备份文件的命名规则。
        # 例如 transl_cache.json.corrupt。
        backup_path = path + ".corrupt"

        try:
            # 只有源文件仍然存在时才尝试备份。
            if os.path.isfile(path):
                # 不覆盖已有备份，避免第二次损坏时丢失旧文件。
                if os.path.exists(backup_path):
                    logging.error(
                        "损坏缓存备份文件已存在，未覆盖：%s",
                        backup_path,
                    )
                else:
                    os.replace(path, backup_path)
                    logging.warning(
                        "已将损坏缓存备份至：%s",
                        backup_path,
                    )

        except OSError:
            # 备份失败不应该阻止后续流程执行。
            logging.exception("备份损坏缓存失败：%s", path)

        # 返回空缓存，使程序仍能尝试重新翻译。
        return {}


def save_cache():
    """
    保存普通翻译缓存。

    tl_cache 是脚本运行期间使用的全局缓存字典。
    每完成一个有效翻译批次，就调用此函数保存。

    采用原子写入，避免直接覆盖文件造成缓存被截断。
    """

    atomic_write_json(CACHE_FILE, tl_cache, indent=4)


# ============================================================
# 三、本地图片缓存函数
# ============================================================

def _local_image_path(filename, content):
    """
    生成图片的公开访问地址，并附加内容版本参数。

    参数：
        filename:
            本地图片文件名。

        content:
            图片的二进制内容。

    返回示例：
        /thelongdark/assets/img/mods/abc123.jpg?v=abcdef123456

    为什么需要版本参数？

        浏览器、代理或 CDN 可能会缓存图片。
        如果图片内容发生变化，但文件名不变，浏览器可能继续显示旧图片。

        这里取图片内容 SHA-256 的前 12 位作为版本标识。
        图片内容变化后，版本参数也会变化，减少旧缓存造成的问题。

    注意：
        这个版本参数只用于缓存更新，不代表图片内容已经通过安全验证。
    """

    # 对图片二进制内容计算 SHA-256。
    version = hashlib.sha256(content).hexdigest()[:12]

    # 返回网站使用的公开路径，而不是本地磁盘路径。
    return f"{IMAGE_PUBLIC_PATH}/{filename}?v={version}"


def _existing_image(url_key):
    """
    查找某个远程 URL 之前下载的本地图片。

    参数：
        url_key:
            根据原始 URL 计算出的固定哈希标识。

    文件名示例：
        0123456789abcdef01234567.jpg
        0123456789abcdef01234567.webp

    同一个 URL 可能返回不同格式的图片。
    因此，查找时使用 url_key + "." 作为文件名前缀。

    找到图片后，返回：
        (文件名, 图片二进制内容)

    如果没有找到，返回 None。

    读取文件失败时，记录警告并继续查找其他候选文件。
    """

    # 图片目录不存在，说明没有可复用的本地图片。
    if not os.path.isdir(IMAGE_DIR):
        return None

    try:
        # 获取图片目录下的文件名列表。
        filenames = os.listdir(IMAGE_DIR)

    except OSError:
        logging.exception("无法读取本地图片目录：%s", IMAGE_DIR)
        return None

    # 遍历与该 URL 哈希匹配的文件。
    for filename in filenames:
        if not filename.startswith(url_key + "."):
            continue

        # 组合完整本地路径。
        path = os.path.join(IMAGE_DIR, filename)

        # 忽略目录、符号链接等非普通文件对象。
        if not os.path.isfile(path):
            continue

        try:
            # 二进制读取，不能使用普通文本模式。
            # 图片文件可能包含任意字节序列。
            with open(path, "rb") as image_file:
                content = image_file.read()

            # 空文件不作为有效缓存。
            if not content:
                logging.warning("发现空图片缓存：%s", path)
                continue

            # 返回文件名和图片内容。
            return filename, content

        except OSError:
            # 单个文件读取失败，不应阻止检查其他文件。
            logging.exception("读取图片缓存失败：%s", path)

    # 所有候选文件均未找到可用内容。
    return None


# ============================================================
# 四、图片下载与本地镜像
# ============================================================


def download_image(url):
    """
    下载单张图片，并在失败时使用备用代理。

    下载顺序：
        1. 直接下载原始图片。
        2. 原始下载失败时，通过备用代理下载。
        3. 两次下载均失败时，使用已有的本地图片缓存。
        4. 没有可用缓存时，返回原始 URL。

    下载成功后：
        - 检查图片 MIME 类型。
        - 检查图片大小。
        - 使用临时文件保存，避免破坏已有图片。
        - 根据原始 URL 的哈希值生成本地文件名。
        - 清理同一 URL 对应的旧格式图片。
        - 返回本地公开访问路径。
    """

    # 非字符串内容不参与下载。
    if not isinstance(url, str):
        return url

    # 只处理 HTTP 和 HTTPS 图片地址。
    if not url.startswith(("http://", "https://")):
        return url

    # 根据原始 URL 生成固定标识。
    # 无论直接下载还是通过代理下载，都使用相同文件名。
    url_key = hashlib.sha256(
        url.encode("utf-8")
    ).hexdigest()[:24]

    # 确保本地图片目录存在。
    try:
        os.makedirs(IMAGE_DIR, exist_ok=True)
    except OSError:
        logging.exception("无法创建图片目录：%s", IMAGE_DIR)

        # 如果连目录都无法创建，尝试返回之前的缓存。
        existing = _existing_image(url_key)

        if existing:
            filename, content = existing
            return _local_image_path(filename, content)

        return url

    # 两种下载方式：
    # 第一个是原始图片地址，第二个是备用代理地址。
    #
    # 使用 requests 的 params 参数构建代理请求，
    # 会自动对原始 URL 进行 URL 编码，
    # 避免原始 URL 中的 &、?、# 等字符破坏代理参数。
    download_sources = [
        ("原始地址", url, None),
        (
            "备用代理",
            IMAGE_PROXY_URL,
            {"url": url},
        ),
    ]

    # 记录最后一次下载失败的原因，方便输出日志。
    last_error = None

    # 临时文件路径。
    # 每次下载成功前都使用独立临时文件，避免直接破坏旧图片。
    temp_path = None

    try:
        # 依次尝试原始地址和备用代理。
        for source_name, request_url, params in download_sources:

            # 每一种来源都独立处理。
            # 一种来源失败后继续尝试下一种。
            try:
                logging.info(
                    "尝试通过%s下载图片：%s",
                    source_name,
                    url,
                )

                # 发起 HTTP 请求。
                # stream=True 允许分块读取，减少一次性加载大文件的风险。
                with requests.get(
                    request_url,
                    params=params,
                    headers={
                        "User-Agent": "Mozilla/5.0",
                    },
                    stream=True,
                    timeout=REQUEST_TIMEOUT,
                ) as response:

                    # HTTP 状态码不是成功状态时抛出异常。
                    response.raise_for_status()

                    # 获取响应的 MIME 类型。
                    # 去掉分号后面的参数，并统一转换为小写。
                    content_type = response.headers.get(
                        "Content-Type",
                        "",
                    ).split(";", 1)[0].strip().lower()

                    # 只接受已配置的图片格式。
                    # 如果代理返回 JSON 错误信息或 HTML 错误页面，
                    # 不会将这些内容误保存为图片。
                    extension = IMAGE_MIME_EXTENSIONS.get(
                        content_type
                    )

                    if not extension:
                        raise ValueError(
                            "不支持的图片类型："
                            f"{content_type or '未提供 Content-Type'}"
                        )

                    # 检查服务器声明的图片大小。
                    content_length = response.headers.get(
                        "Content-Length"
                    )

                    if content_length:
                        try:
                            declared_size = int(content_length)

                            if declared_size < 0:
                                raise ValueError(
                                    "Content-Length 不能为负数"
                                )

                        except ValueError as error:
                            # 响应头不规范时不直接信任它。
                            # 后续仍会检查实际下载大小。
                            logging.warning(
                                "%s返回的 Content-Length 无效：%s",
                                source_name,
                                error,
                            )

                        else:
                            if declared_size > MAX_IMAGE_BYTES:
                                raise ValueError(
                                    "图片超过大小限制："
                                    f"{MAX_IMAGE_BYTES} 字节"
                                )

                    # 使用 bytearray 累积图片的二进制内容。
                    content = bytearray()

                    # 每次读取 64 KiB，避免一次性读取整个响应。
                    for chunk in response.iter_content(
                        chunk_size=64 * 1024
                    ):
                        if not chunk:
                            continue

                        content.extend(chunk)

                        # 实时限制图片大小。
                        # 即使服务器未提供 Content-Length，
                        # 也不会无限制地累积响应内容。
                        if len(content) > MAX_IMAGE_BYTES:
                            raise ValueError(
                                "图片超过大小限制："
                                f"{MAX_IMAGE_BYTES} 字节"
                            )

                    # 空响应不是有效图片。
                    if not content:
                        raise ValueError("下载结果为空")

                # 响应已经成功读取并关闭。
                # 使用原始 URL 的哈希值构造统一文件名。
                filename = f"{url_key}{extension}"
                output_path = os.path.join(
                    IMAGE_DIR,
                    filename,
                )

                # 将下载结果先写入同目录下的临时文件。
                # 下载和校验完成前，不覆盖正式图片文件。
                with tempfile.NamedTemporaryFile(
                    mode="wb",
                    dir=IMAGE_DIR,
                    prefix=f".{url_key}-",
                    suffix=".tmp",
                    delete=False,
                ) as image_file:

                    temp_path = image_file.name

                    # 写入完整的图片二进制内容。
                    image_file.write(content)

                    # 刷新缓冲区。
                    image_file.flush()

                    # 请求操作系统同步文件数据。
                    os.fsync(image_file.fileno())

                # 临时文件关闭后，再替换正式图片文件。
                # 即使之前的图片格式不同，也只在新文件写入完成后替换。
                os.replace(
                    temp_path,
                    output_path,
                )

                # 替换成功后，临时路径已经不存在。
                temp_path = None

                logging.info(
                    "图片下载成功，来源：%s，文件：%s",
                    source_name,
                    output_path,
                )

                # 删除同一个 URL 以前保存的其他格式图片。
                # 例如之前是 JPG，这次代理返回 WEBP。
                try:
                    for existing_filename in os.listdir(IMAGE_DIR):

                        # 保留当前成功生成的文件。
                        if existing_filename == filename:
                            continue

                        # 仅处理同一个 URL 哈希对应的文件。
                        if not existing_filename.startswith(
                            url_key + "."
                        ):
                            continue

                        existing_path = os.path.join(
                            IMAGE_DIR,
                            existing_filename,
                        )

                        # 只删除普通文件，不删除目录。
                        if os.path.isfile(existing_path):
                            try:
                                os.remove(existing_path)

                            except OSError:
                                logging.warning(
                                    "无法删除旧图片：%s",
                                    existing_path,
                                    exc_info=True,
                                )

                except OSError:
                    # 清理失败不影响已经下载成功的图片。
                    logging.warning(
                        "无法清理旧图片文件",
                        exc_info=True,
                    )

                # 返回本地公开 URL，并附加内容版本号。
                return _local_image_path(
                    filename,
                    content,
                )

            except (
                requests.exceptions.RequestException,
                OSError,
                ValueError,
            ) as error:

                # 记录当前来源失败的原因。
                last_error = error

                logging.warning(
                    "%s下载失败：%s；原因：%s",
                    source_name,
                    url,
                    error,
                )

                # 继续尝试下一种下载来源。
                # 原始地址失败时，会自动进入备用代理分支。
                continue

            finally:
                # 每次下载尝试结束后，清理未完成的临时文件。
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)

                    except OSError:
                        logging.warning(
                            "无法清理临时图片文件：%s",
                            temp_path,
                            exc_info=True,
                        )

                    temp_path = None

    finally:
        # 两种来源均尝试完成后，再统一处理缓存回退。
        # 此处的 finally 主要保证整个下载尝试流程有明确的结束位置。
        pass

    # 原始地址和备用代理均失败，尝试使用以前下载成功的图片。
    logging.warning(
        "原始地址和备用代理均无法下载图片：%s；最后错误：%s",
        url,
        last_error,
    )

    existing = _existing_image(url_key)

    if existing:
        filename, content = existing

        logging.info(
            "使用之前的本地图片缓存：%s",
            url,
        )

        return _local_image_path(
            filename,
            content,
        )

    # 没有任何可用的本地图片时，保留原始 URL。
    return url


def mirror_images(mods):
    """
    批量下载模组图片，并将模组数据中的远程图片 URL 替换为本地路径。

    参数：
        mods:
            模组数据列表，每个模组可以包含 Images 字段。

    原始数据示例：
        {
            "Name": "ExampleMod",
            "Images": [
                "https://example.com/image.jpg"
            ]
        }

    替换后：
        {
            "Name": "ExampleMod",
            "Images": [
                "/thelongdark/assets/img/mods/xxxx.jpg?v=xxxx"
            ]
        }

    优化点：
        1. 只下载 HTTP/HTTPS 图片。
        2. 同一个 URL 在一次运行中只下载一次。
        3. 使用线程池提高批量下载效率。
        4. 单张图片失败不会导致整个图片批次中止。
        5. 忽略空字符串和无效图片字段。
    """

    # 收集所有唯一的远程图片 URL。
    # 使用集合去重，避免不同模组引用同一张图片时重复下载。
    urls = {
        image
        for mod in mods
        if isinstance(mod, dict)
        for image in (
            mod.get("Images")
            if isinstance(mod.get("Images"), list)
            else []
        )
        if isinstance(image, str)
        and image.startswith(("http://", "https://"))
    }

    # 保存远程 URL 到本地 URL 的映射关系。
    mirrored = {}

    if urls:
        logging.info(
            "开始镜像 %s 个唯一模组图片地址",
            len(urls),
        )

        # 创建固定数量的工作线程。
        # 不要为每张图片创建一个独立线程，以免线程数量过多。
        with ThreadPoolExecutor(
            max_workers=IMAGE_WORKERS,
        ) as executor:

            # 保存每个任务对应的原始 URL。
            # 这样即使某个任务异常，也能准确记录是哪张图片失败。
            future_to_url = {
                executor.submit(download_image, url): url
                for url in sorted(urls)
            }

            # 按任务完成顺序读取结果。
            # 与直接调用 executor.map() 相比，这里更方便独立处理异常。
            for future in as_completed(future_to_url):
                url = future_to_url[future]

                try:
                    # 取得 download_image() 返回的本地 URL 或原始 URL。
                    mirrored[url] = future.result()

                except Exception:
                    # 兜底处理未预料到的异常。
                    # 正常情况下 download_image() 已经处理了常见下载异常。
                    logging.exception(
                        "图片任务出现未预料到的异常：%s",
                        url,
                    )

                    # 保留原始 URL，避免异常导致图片地址被丢弃。
                    mirrored[url] = url

    # 将下载结果回填到各模组数据。
    for mod in mods:

        # 防止 Images 缺失、为 None 或数据类型错误。
        # 非列表类型不直接迭代，避免将字符串拆成单个字符。
        images = mod.get("Images")

        if not isinstance(images, list):
            mod["Images"] = []
            continue

        new_images = []

        for image in images:

            # 只保留非空字符串。
            # 去除首尾空白仅用于判断是否为空，正常 URL 不做改写。
            if not isinstance(image, str) or not image.strip():
                continue

            # 已下载的远程地址替换为本地地址。
            # 非远程地址或失败的下载则保留原始值。
            new_images.append(
                mirrored.get(image, image)
            )

        # 更新模组图片字段。
        mod["Images"] = new_images

    # 统计成功映射为本地公开路径的唯一图片数量。
    local_count = sum(
        isinstance(image, str)
        and image.startswith(IMAGE_PUBLIC_PATH + "/")
        for image in mirrored.values()
    )

    # 输出统计结果。
    logging.info(
        "图片镜像完成：%s / %s 个唯一远程图片地址已使用本地路径",
        local_count,
        len(urls),
    )


# ============================================================
# 五、Google 翻译接口
# ============================================================

def google_translate_api(
    raws,
    source="auto",
    target="zh-ch",
    timeout=30,
):
    """
    调用 Google Translate 网页端使用的翻译接口。

    参数：
        raws:
            字符串列表，每个元素是一段待翻译文本。

        source:
            源语言代码。
            auto 表示自动识别源语言。

        target:
            目标语言代码。
            zh-ch 沿用原代码的简体中文参数。

        timeout:
            请求超时时间，单位为秒。

    返回：
        成功：
            翻译结果列表，顺序应与输入文本一致。

        失败：
            返回以 Request Error: 开头的错误字符串。

    注意：
        这是网页端使用的非正式接口，并非稳定的官方付费翻译 API。
        接口行为、请求参数和访问限制可能发生变化。
    """

    # 参数必须是列表。
    # 如果误传字符串，后续处理会将其错误地当作字符序列。
    if not isinstance(raws, list):
        return "Request Error: raws 必须是字符串列表"

    # 空列表无需发起网络请求。
    if not raws:
        return []

    # 校验每一个待翻译元素。
    if not all(isinstance(item, str) for item in raws):
        return "Request Error: raws 中的每个元素都必须是字符串"

    # 复制输入列表，避免修改调用方传入的原始列表。
    texts = [
        item if item else " "
        for item in raws
    ]

    # Google 翻译网页端的翻译接口。
    url = "https://translate-pa.googleapis.com/v1/translateHtml"

    # 按照原接口需要的 JSON 结构构造请求数据。
    # 第一部分包含文本列表、源语言和目标语言。
    # 第二部分是接口使用的调用标识。
    payload = [
        [
            texts,
            source,
            target,
        ],
        "wt_lib",
    ]

    # 设置请求头。
    # User-Agent 模拟常见桌面浏览器。
    # X-Goog-API-Key 保留原脚本使用的接口密钥。
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/138.0.0.0 Safari/537.36"
        ),
        "X-Goog-API-Key": (
            "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520"
        ),
        "Content-Type": "application/json+protobuf",
    }

    try:
        # 发送 POST 请求。
        # json=payload 会自动将 Python 数据序列化为 JSON。
        # 不必手动调用 json.dumps() 再传入 data 参数。
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout,
        )

        # 对 HTTP 错误状态抛出异常。
        response.raise_for_status()

        # 解析响应 JSON。
        result = response.json()

        # 原有接口预期响应的第一个元素为翻译结果列表。
        if not isinstance(result, list) or not result:
            raise ValueError("翻译接口返回了意外的 JSON 结构")

        translations = result[0]

        # 翻译结果必须是列表。
        if not isinstance(translations, list):
            raise ValueError("翻译接口未返回结果列表")

        # 检查返回数量是否与输入数量一致。
        # 数量不一致时不能直接与原文逐项配对。
        if len(translations) != len(texts):
            raise ValueError(
                "翻译结果数量与输入文本数量不一致："
                f"输入 {len(texts)} 条，返回 {len(translations)} 条"
            )

        # 检查结果元素类型。
        if not all(
            isinstance(item, str)
            for item in translations
        ):
            raise ValueError("翻译结果中存在非字符串元素")

        # 返回完整翻译列表。
        return translations

    except (
        requests.exceptions.RequestException,
        ValueError,
        json.JSONDecodeError,
    ) as error:

        # 网络错误、HTTP 错误、JSON 解析错误或响应结构异常
        # 都通过统一的错误返回值交给调用方处理。
        logging.error(
            "Google 翻译请求失败：%s",
            error,
            exc_info=True,
        )

        return f"Request Error: {error}"


# ============================================================
# 六、加载全局翻译缓存
# ============================================================

# 读取普通机器翻译缓存。
# 结构为：
# {
#     "原文": "机器翻译结果"
# }
tl_cache = load_translation_cache(CACHE_FILE)

# 读取高质量模组翻译缓存。
# 结构为：
# {
#     "模组名称": {
#         "DisplayName": "人工修订后的名称",
#         "Description": "人工修订后的描述"
#     }
# }
high_quality_mod_cache = load_translation_cache(
    HIGH_QUALITY_MOD_CACHE_FILE
)


# ============================================================
# 七、主流程：获取、翻译、镜像并输出模组数据
# ============================================================

def thelongdark():
    """
    执行完整的模组数据更新流程。

    步骤：
        1. 从模组 API 获取最新数据。
        2. 校验 API 返回的数据结构。
        3. 查找尚未缓存的待翻译文本。
        4. 分批请求 Google 翻译接口。
        5. 将有效结果保存到普通翻译缓存。
        6. 优先使用高质量翻译覆盖普通翻译。
        7. 下载并镜像模组图片。
        8. 安全写入最终 api.json。

    高质量翻译优先级：
        高质量模组翻译缓存
            >
        普通翻译缓存
            >
        API 返回的原始文本
    """

    started_at = time.perf_counter()
    logging.info("=" * 60)
    logging.info("开始更新模组数据；run_id=%s，event=%s，commit=%s",
                 os.getenv("GITHUB_RUN_ID", "local"),
                 os.getenv("GITHUB_EVENT_NAME", "local"),
                 os.getenv("GITHUB_SHA", "unknown"))
    logging.info("脚本路径：%s", os.path.abspath(__file__))
    logging.info("输出路径：%s", os.path.abspath(OUTPUT_FILE))
    logging.info("API 地址：%s", MOD_API_URL)

    # 第一步：请求 API，并记录响应耗时、大小和服务端信息。
    request_started = time.perf_counter()
    try:
        response = requests.get(MOD_API_URL, timeout=60)
        request_elapsed = time.perf_counter() - request_started
        logging.info("API HTTP=%s，耗时=%.2fs，响应=%s 字节",
                     response.status_code, request_elapsed, len(response.content))
        logging.info("API 最终 URL=%s，Content-Type=%s，Date=%s，重定向次数=%s",
                     response.url, response.headers.get("Content-Type", ""),
                     response.headers.get("Date", ""), len(response.history))
        response.raise_for_status()
        updated_mods = response.json()
    except (requests.exceptions.RequestException, ValueError, json.JSONDecodeError):
        logging.exception("获取或解析模组 API 失败；旧 api.json 不会被覆盖")
        return

    # API 的正常返回值应当是模组字典组成的列表。
    # 如果结构异常，直接停止，防止后续流程误写文件。
    if not isinstance(updated_mods, list):
        save_debug_response(response)
        logging.error("API 根节点不是列表（实际类型=%s），取消更新", type(updated_mods).__name__)
        return

    log_mod_stats("API 原始数据", updated_mods)
    if len(updated_mods) < MIN_EXPECTED_MODS:
        save_debug_response(response)
        logging.error("API 仅返回 %s 条，低于安全阈值 %s；取消更新以保护现有 api.json",
                      len(updated_mods), MIN_EXPECTED_MODS)
        return

    # 过滤掉不符合预期的数据项。
    # 避免后续访问 mod.get() 时因为元素类型错误而崩溃。
    invalid_count = sum(
        not isinstance(mod, dict)
        for mod in updated_mods
    )

    if invalid_count:
        logging.warning(
            "API 数据中存在 %s 个非字典模组条目，已跳过",
            invalid_count,
        )

        updated_mods = [
            mod
            for mod in updated_mods
            if isinstance(mod, dict)
        ]

    logging.info("过滤非字典条目后剩余 %s 条（过滤 %s 条）",
                 len(updated_mods), invalid_count)
    log_mod_stats("过滤后", updated_mods)
    if len(updated_mods) < MIN_EXPECTED_MODS:
        logging.error("有效模组仅 %s 条，低于安全阈值 %s；取消更新",
                      len(updated_mods), MIN_EXPECTED_MODS)
        return

    # --------------------------------------------------------
    # 第二步：收集需要翻译的文本
    # --------------------------------------------------------

    # 使用集合去重，避免相同原文被重复提交给翻译接口。
    to_translate = set()

    # 需要翻译的字段。
    # 保留原有字段名称，确保最终 JSON 结构不变。
    translation_keys = (
        "DisplayName",
        "Description",
    )

    for mod in updated_mods:

        # 模组名称用于查询高质量翻译缓存。
        mod_name = mod.get("Name")

        # 高质量翻译缓存的结构不正确时，不应使整个程序崩溃。
        mod_translations = high_quality_mod_cache.get(
            mod_name,
            {},
        ) if isinstance(mod_name, str) else {}

        # 只接受字典形式的模组翻译数据。
        if not isinstance(mod_translations, dict):
            mod_translations = {}

        for key in translation_keys:

            # 安全读取字段，避免 KeyError。
            original = mod.get(key)

            # 非字符串内容不提交翻译。
            # None、数字、列表等类型可能是 API 的特殊数据。
            if not isinstance(original, str):
                continue

            # 空文本无需翻译。
            if not original.strip():
                continue

            # 如果高质量缓存已经存在该字段，则跳过普通翻译。
            # 这里检查的是 None，而不是字符串真假值，
            # 因此保留原代码对缓存值的优先级判断方式。
            if mod_translations.get(key) is not None:
                continue

            # 普通缓存中不存在原文时，才需要调用翻译接口。
            if original not in tl_cache:
                to_translate.add(original)

    # 将集合转换为有序列表。
    # 排序不是功能必需，但可以让每次执行的批次顺序更稳定，
    # 方便比较日志和排查翻译问题。
    to_translate = sorted(to_translate)

    logging.info(
        "共有 %s 条唯一文本需要翻译",
        len(to_translate),
    )

    # --------------------------------------------------------
    # 第三步：分批翻译并保存缓存
    # --------------------------------------------------------

    # 将待翻译文本切分成多个批次。
    # 每批最多 BATCH_SIZE 条，避免单次请求过大。
    for start in range(
        0,
        len(to_translate),
        BATCH_SIZE,
    ):

        # 当前批次的起始位置到结束位置。
        batch = to_translate[
            start:start + BATCH_SIZE
        ]

        logging.info(
            "正在翻译第 %s-%s 条文本，共 %s 条",
            start + 1,
            start + len(batch),
            len(to_translate),
        )

        try:
            # 调用翻译 API。
            results = google_translate_api(batch)

            # API 失败时会返回错误字符串。
            # 只有结果为列表且数量正确时，才写入缓存。
            if (
                not isinstance(results, list)
                or len(results) != len(batch)
            ):
                logging.error(
                    "当前翻译批次失败或结果不完整，"
                    "不会将错误结果写入缓存"
                )
                continue

            # 检查当前批次的所有翻译结果。
            # 如果结果类型不正确，则不保存该批次。
            if not all(
                isinstance(result, str)
                for result in results
            ):
                logging.error(
                    "当前翻译批次包含无效结果，已跳过保存"
                )
                continue

            # 将原文与译文配对保存。
            # zip 会按照两个列表的对应位置逐项配对。
            for src, dst in zip(batch, results):

                # 空译文不覆盖缓存，防止有效结果被空值替换。
                # 原文可能是单个空格等特殊情况，因此这里不强制
                # 将所有空白字符转换为其他文本。
                if not dst.strip():
                    logging.warning(
                        "翻译结果为空，保留原有缓存：%s",
                        src[:80],
                    )
                    continue

                # 保存当前翻译结果。
                tl_cache[src] = dst

            # 每批成功后立即保存缓存。
            # 即使后续批次失败，前面已完成的翻译也可以保留。
            save_cache()

        except Exception:
            # 单个批次出现意外异常时，记录完整堆栈并继续下一批。
            # 这样不会因为某一批失败而直接丢失整个更新流程。
            logging.exception(
                "批量翻译第 %s 批时发生异常",
                start // BATCH_SIZE + 1,
            )

    # --------------------------------------------------------
    # 第四步：将翻译结果应用到模组数据
    # --------------------------------------------------------

    for mod in updated_mods:

        # 使用模组名称查询高质量翻译。
        mod_name = mod.get("Name")

        mod_translations = high_quality_mod_cache.get(
            mod_name,
            {},
        ) if isinstance(mod_name, str) else {}

        # 防止高质量缓存内容不是预期的字典。
        if not isinstance(mod_translations, dict):
            mod_translations = {}

        for key in translation_keys:

            # 原始字段可能不存在，因此使用 get()。
            original = mod.get(key)

            # 高质量翻译的优先级最高。
            mod_translation = mod_translations.get(key)

            if mod_translation is not None:

                # 仅当译文为字符串时才覆盖原文。
                # 避免缓存中的错误数据将原字段改成列表或数字。
                if isinstance(mod_translation, str):
                    mod[key] = mod_translation

                else:
                    logging.warning(
                        "高质量翻译缓存的字段类型错误："
                        "模组=%s，字段=%s",
                        mod_name,
                        key,
                    )

                # 无论高质量缓存值是否为字符串，
                # 都不再使用普通缓存覆盖它。
                # 这样可以保持高质量缓存的优先级。
                continue

            # 如果原文是字符串，且普通翻译缓存中有对应译文，
            # 则使用普通翻译结果。
            if (
                isinstance(original, str)
                and original in tl_cache
            ):

                translation = tl_cache[original]

                # 再次检查缓存内容，避免损坏的缓存覆盖原始文本。
                if isinstance(translation, str):
                    mod[key] = translation

                else:
                    logging.warning(
                        "普通翻译缓存的值不是字符串：%s",
                        original[:80],
                    )

    # --------------------------------------------------------
    # 第五步：下载模组图片并替换为本地路径
    # --------------------------------------------------------

    # 图片镜像与文本翻译相互独立。
    # 即使某些图片下载失败，download_image() 也会尽量返回
    # 旧缓存路径或原始 URL。
    log_mod_stats("翻译后、图片镜像前", updated_mods)
    try:
        mirror_images(updated_mods)

    except Exception:
        # 防止意外的图片处理错误阻止最终 JSON 输出。
        # 此时可能存在部分图片未完成镜像的情况。
        logging.exception("图片镜像过程中发生未预料到的异常")

    log_mod_stats("图片镜像后、写入前", updated_mods)
    if len(updated_mods) < MIN_EXPECTED_MODS:
        logging.error("处理后条目数异常下降：%s；取消写入", len(updated_mods))
        return

    # --------------------------------------------------------
    # 第六步：安全输出最终模组 API 文件
    # --------------------------------------------------------

    try:
        # 使用原子写入，避免直接覆盖 api.json 导致文件损坏。
        # indent=2 保留原有输出格式。
        atomic_write_json(
            OUTPUT_FILE,
            updated_mods,
            indent=2,
        )

    except OSError:
        # 输出失败时记录异常。
        # 原有 api.json 通常仍会保留，因为采用了临时文件替换方式。
        logging.exception(
            "写入最终模组 API 文件失败：%s",
            OUTPUT_FILE,
        )
        return

    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as output_file:
            saved_mods = json.load(output_file)
        log_mod_stats("重新读取输出文件", saved_mods)
        logging.info("输出文件大小：%s 字节", os.path.getsize(OUTPUT_FILE))
        if not isinstance(saved_mods, list) or len(saved_mods) != len(updated_mods):
            logging.error("写入后条目数不一致：内存=%s，文件=%s；请检查文件是否被其他任务覆盖",
                          len(updated_mods),
                          len(saved_mods) if isinstance(saved_mods, list) else type(saved_mods).__name__)
            return
    except (OSError, json.JSONDecodeError):
        logging.exception("写入后重新读取 api.json 校验失败")
        return

    logging.info("更新完成；最终条目=%s，耗时=%.2fs，文件=%s",
                 len(saved_mods) if isinstance(saved_mods, list) else "非列表",
                 time.perf_counter() - started_at,
                 OUTPUT_FILE)


# ============================================================
# 八、程序入口
# ============================================================

if __name__ == "__main__":

    # 只有直接执行当前脚本时才运行主流程。
    # 如果其他 Python 文件导入本模块，则不会自动开始更新。
    try:
        thelongdark()

    except KeyboardInterrupt:
        # 允许使用 Ctrl+C 主动终止程序。
        # 不将正常的用户中断显示为完整异常堆栈。
        logging.warning("用户手动中断了更新任务")

    except Exception:
        # 最外层兜底处理未被内部捕获的异常。
        # 输出完整堆栈，方便定位意外问题。
        logging.exception("程序发生未处理的异常")
