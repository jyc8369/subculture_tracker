import argparse
import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs, unquote, urlparse

import requests

DEFAULT_URL = "https://ef-webview.gryphline.com/page/gacha_char?server_id=2&platform=Windows&channel=6&subChannel=6&lang=ko-kr&server=2"
DEFAULT_OUTPUT = "gacha_char_data.json"
DEFAULT_TIMEOUT = 30
DATA_RELATIVE_PATH = Path("PlatformProcess") / "Cache" / "data_1"
POOL_TYPE_SEQUENCE = [
    "E_CharacterGachaPoolType_Special",
    "E_CharacterGachaPoolType_Joint",
    "E_CharacterGachaPoolType_Standard",
    "E_CharacterGachaPoolType_Beginner",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

TOKEN_PATTERNS = [
    re.compile(r"[?&]token=(?P<value>[^&#\s\"<>]+)", re.IGNORECASE),
    re.compile(r'"token"\s*:\s*"(?P<value>[^"\\]+(?:\\.[^"\\]*)*)"', re.IGNORECASE),
    re.compile(r'token\s*[:=]\s*"(?P<value>[^"\\]+(?:\\.[^"\\]*)*)"', re.IGNORECASE),
    re.compile(r'token\s*[:=]\s*(?P<value>[A-Za-z0-9%._\-+/=]{10,})', re.IGNORECASE),
]


def parse_page_url(url: str) -> dict[str, str]:
    parsed = urlparse(url)
    params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
    if "u8_token" in params:
        params["token"] = params.pop("u8_token")
    if "server" in params and "server_id" not in params:
        params["server_id"] = params.pop("server")
    return params


def _read_file_bytes_with_windows_sharing(data_path: Path) -> bytes:
    if os.name != "nt":
        return data_path.read_bytes()

    import msvcrt
    import ctypes
    from ctypes import wintypes

    GENERIC_READ = 0x80000000
    FILE_SHARE_READ = 0x00000001
    FILE_SHARE_WRITE = 0x00000002
    FILE_SHARE_DELETE = 0x00000004
    OPEN_EXISTING = 3
    FILE_ATTRIBUTE_NORMAL = 0x80
    INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

    CreateFileW = ctypes.windll.kernel32.CreateFileW
    CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    CreateFileW.restype = wintypes.HANDLE

    handle = CreateFileW(
        str(data_path),
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )

    if handle == INVALID_HANDLE_VALUE:
        error_code = ctypes.GetLastError()
        raise OSError(error_code, f"Could not open file with shared read access: {data_path}")

    try:
        fd = msvcrt.open_osfhandle(handle, os.O_RDONLY)
    except OSError:
        ctypes.windll.kernel32.CloseHandle(handle)
        raise

    with os.fdopen(fd, "rb") as f:
        return f.read()


def extract_token_from_data_file(data_path: Path) -> Optional[str]:
    if not data_path.exists():
        return None
    if not data_path.is_file():
        return None

    try:
        raw_bytes = _read_file_bytes_with_windows_sharing(data_path)
    except PermissionError as exc:
        raise RuntimeError(f"Cannot read data file due to permission error: {data_path}") from exc
    except OSError as exc:
        raise RuntimeError(f"Cannot read data file: {data_path}") from exc

    content = raw_bytes.decode("utf-8", errors="replace")
    return find_latest_token(content)


def find_latest_token(content: str) -> Optional[str]:
    best_value = None
    best_index = -1

    for pattern in TOKEN_PATTERNS:
        for match in pattern.finditer(content):
            if not match or not match.group("value"):
                continue
            index = match.start()
            if index >= best_index:
                best_index = index
                best_value = match.group("value")

    if not best_value:
        return None

    normalized = unescape_token(best_value)
    if re.search(r"%[0-9A-Fa-f]{2}", normalized):
        try:
            normalized = unquote(normalized)
        except Exception:
            pass

    return normalized


def unescape_token(value: str) -> str:
    try:
        return bytes(value, "utf-8").decode("unicode_escape")
    except Exception:
        return value


def get_default_data_path() -> Path:
    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        path = Path(local_app_data) / DATA_RELATIVE_PATH
        if path.exists():
            return path

    fallback_path = Path.home() / "AppData" / "Local" / "PlatformProcess" / "Cache" / "data_1"
    if fallback_path.exists():
        return fallback_path

    raise RuntimeError(
        "Could not determine data file path. "
        "Set LOCALAPPDATA or ensure AppData\\Local\\PlatformProcess\\Cache\\data_1 exists."
    )


def remove_duplicate_endfield_files(output_dir: str, token: str, keep_filename: str) -> None:
    path = Path(output_dir)
    if not path.exists() or not path.is_dir():
        return

    for json_file in path.glob('endfield_*.json'):
        if json_file.name == keep_filename:
            continue

        try:
            data = json.loads(json_file.read_text(encoding='utf-8'))
        except Exception:
            continue

        existing_id = data.get('id')
        existing_token = data.get('token')
        if any(str(value) == str(token) for value in (existing_id, existing_token) if value is not None):
            try:
                json_file.unlink()
                print(f"[endfield] removed duplicate file: {json_file}")
            except OSError:
                print(f"[endfield] failed to remove duplicate file: {json_file}")


def build_request(url: str, token: str, pool_type: Optional[str] = None) -> tuple[str, dict[str, str]]:
    parsed = urlparse(url)
    if parsed.path.startswith("/api/record/char") or parsed.path.startswith("/api/record/char/pool"):
        params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        if token:
            params["token"] = token
        return url.split("?")[0], params

    if parsed.path.startswith("/page/gacha_char"):
        params = parse_page_url(url)
        server_id = params.get("server_id")
        lang = params.get("lang", "ko-kr")
        if not server_id:
            raise RuntimeError("URL must include server_id parameter.")

        api_url = "https://ef-webview.gryphline.com/api/record/char"
        query = {
            "lang": lang,
            "pool_type": pool_type or "E_CharacterGachaPoolType_Special",
            "token": token,
            "server_id": server_id,
        }
        return api_url, query

    raise RuntimeError(
        "Unsupported URL. Use a page URL like /page/gacha_char or a direct /api/record/char URL."
    )


def normalize_item(item: dict[str, Any], pool_type: Optional[str] = None) -> dict[str, Any]:
    time_value = item.get("gachaTs")
    if isinstance(time_value, str) and time_value.isdigit():
        time_value = int(time_value)
    elif isinstance(time_value, str):
        try:
            time_value = int(float(time_value))
        except Exception:
            pass

    return {
        "poolId": item.get("poolId"),
        "poolName": item.get("poolName"),
        "charName": item.get("charName"),
        "rarity": item.get("rarity"),
        "timestamp": time_value,
        "seqId": item.get("seqId"),
    }


def extract_from_json(response_json: dict[str, Any], pool_type: Optional[str] = None) -> dict[str, Any]:
    data = response_json.get("data", {})
    items = data.get("list", [])
    next_seq_id = None
    if items:
        last_item = items[-1]
        next_seq_id = last_item.get("seqId")
    return {
        "code": response_json.get("code"),
        "msg": response_json.get("msg"),
        "hasMore": data.get("hasMore"),
        "next_seq_id": next_seq_id,
        "records": [normalize_item(item, pool_type=pool_type) for item in items],
    }


def fetch_all_pages(api_url: str, params: dict[str, str], timeout: int, pool_type: Optional[str] = None) -> dict[str, Any]:
    params = params.copy()
    all_records: list[dict[str, Any]] = []
    requested_urls: list[str] = []
    previous_seq_id = None
    response_json = {}

    while True:
        response = requests.get(api_url, headers=HEADERS, params=params, timeout=timeout)
        response.raise_for_status()

        try:
            response_json = response.json()
        except ValueError as exc:
            content_type = response.headers.get("Content-Type", "<unknown>")
            body_preview = response.text[:512]
            raise RuntimeError(
                "Response is not valid JSON. "
                f"Status={response.status_code}, Content-Type={content_type}, "
                f"BodyPreview={body_preview!r}"
            ) from exc

        extracted = extract_from_json(response_json, pool_type=pool_type)
        requested_urls.append(response.request.url)
        all_records.extend(extracted["records"])

        if not extracted["records"]:
            break

        next_seq_id = extracted["next_seq_id"]
        if not next_seq_id or next_seq_id == previous_seq_id:
            break

        if extracted["hasMore"] is False:
            break

        previous_seq_id = next_seq_id
        params["seq_id"] = str(next_seq_id)

    return {
        "requested_urls": requested_urls,
        "code": response_json.get("code"),
        "msg": response_json.get("msg"),
        "hasMore": response_json.get("data", {}).get("hasMore"),
        "records": all_records,
    }


def fetch_endfield_data(profilename: str) -> str:
    data_path = get_default_data_path()
    token = extract_token_from_data_file(data_path)
    if not token:
        raise RuntimeError(f"Could not read token from data file: {data_path}")

    grouped = []
    groups: dict[tuple[Optional[str], Optional[str]], dict[str, Any]] = {}
    for pool_type in POOL_TYPE_SEQUENCE:
        api_url, params = build_request(DEFAULT_URL, token, pool_type=pool_type)
        result = fetch_all_pages(api_url, params, timeout=DEFAULT_TIMEOUT, pool_type=pool_type)

        if not result.get("records"):
            continue

        for record in result["records"]:
            key = (pool_type, record.get("poolId"), record.get("poolName"))
            if key not in groups:
                groups[key] = {
                    "poolId": record.get("poolId"),
                    "poolName": record.get("poolName"),
                    "records": [],
                }
                grouped.append(groups[key])
            groups[key]["records"].append({
                "type": 1,
                "seqId": record.get("seqId"),
                "name": record.get("charName"),
                "rarity": str(record.get("rarity")) if record.get("rarity") is not None else None,
                "timestamp": record.get("timestamp"),
            })

    banners = [
        {
            "bannerName": group["poolName"],
            "items": group["records"],
        }
        for group in grouped
    ]

    output_data = {
        "id": token,
        "banners": banners,
    }

    output_path = Path("data") / f"endfield_{profilename}.json"
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    remove_duplicate_endfield_files(str(output_path.parent), token, output_path.name)

    output_path.write_text(json.dumps(output_data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(output_path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch gacha results from ef-webview JSON API and save a single JSON file.")
    parser.add_argument("profilename", help="Profile name to save file as endfield_<profilename>.json")
    args = parser.parse_args()

    try:
        fetch_endfield_data(profilename=args.profilename)
        return 0
    except Exception as exc:
        print(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
