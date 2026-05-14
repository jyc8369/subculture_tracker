import json
import os
import re
import requests
import string
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, Optional, Tuple
from urllib.parse import urlparse

PATTERN = re.compile(
    r'https://aki-gm-resources(?:-oversea)?\.aki-game\.(?:net|com)/aki/gacha/index\.html#/record[^\s"]*'
)

GAME_PATH_PATTERNS = [
    "$drive\\SteamLibrary\\steamapps\\common\\Wuthering Waves",
    "$drive\\SteamLibrary\\steamapps\\common\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Program Files (x86)\\Steam\\steamapps\\common\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Program Files (x86)\\Steam\\steamapps\\common\\Wuthering Waves",
    "$drive\\Program Files\\Steam\\steamapps\\common\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Program Files\\Steam\\steamapps\\common\\Wuthering Waves",
    "$drive\\Games\\Steam\\steamapps\\common\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Games\\Steam\\steamapps\\common\\Wuthering Waves",
    "$drive\\Steam\\steamapps\\common\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Steam\\steamapps\\common\\Wuthering Waves",
    "$drive\\Program Files\\Epic Games\\WutheringWavesj3oFh",
    "$drive\\Program Files\\Epic Games\\WutheringWavesj3oFh\\Wuthering Waves Game",
    "$drive\\Program Files (x86)\\Epic Games\\WutheringWavesj3oFh",
    "$drive\\Program Files (x86)\\Epic Games\\WutheringWavesj3oFh\\Wuthering Waves Game",
    "$drive\\Wuthering Waves Game",
    "$drive\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Program Files\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Games\\Wuthering Waves Game",
    "$drive\\Games\\Wuthering Waves\\Wuthering Waves Game",
    "$drive\\Program Files (x86)\\Wuthering Waves\\Wuthering Waves Game",
]

REGISTRY_PATHS = [
    ("HKEY_CURRENT_USER", r"Software\Valve\Steam"),
    ("HKEY_LOCAL_MACHINE", r"SOFTWARE\WOW6432Node\Valve\Steam"),
    ("HKEY_LOCAL_MACHINE", r"SOFTWARE\Valve\Steam"),
]

UNINSTALL_REGISTRY_PATHS = [
    ("HKEY_LOCAL_MACHINE", r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ("HKEY_LOCAL_MACHINE", r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
    ("HKEY_CURRENT_USER", r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
]

if os.name == "nt":
    import winreg


def all_drives() -> Iterator[Path]:
    """Yield all existing Windows drives from A: through Z:."""
    for letter in string.ascii_uppercase:
        drive = Path(f"{letter}:/")
        if drive.exists():
            yield drive


def _read_registry_value(root: int, subkey: str, value_name: str) -> Optional[str]:
    try:
        with winreg.OpenKey(root, subkey) as key:
            return winreg.QueryValueEx(key, value_name)[0]
    except OSError:
        return None


def _enumerate_registry_subkeys(root: int, subkey: str) -> Iterator[str]:
    try:
        with winreg.OpenKey(root, subkey) as key:
            i = 0
            while True:
                try:
                    yield winreg.EnumKey(key, i)
                except OSError:
                    break
                i += 1
    except OSError:
        return


def _get_registry_root(root_name: str) -> Optional[int]:
    return {
        "HKEY_CURRENT_USER": winreg.HKEY_CURRENT_USER,
        "HKEY_LOCAL_MACHINE": winreg.HKEY_LOCAL_MACHINE,
    }.get(root_name)


def _normalize_path(value: Optional[str]) -> Optional[Path]:
    if not value:
        return None
    try:
        return Path(value.strip('"')).expanduser().resolve()
    except Exception:
        return None


def get_steam_paths_from_registry() -> List[Path]:
    """Return Steam installation roots found in the Windows registry."""
    if os.name != "nt":
        return []

    paths: List[Path] = []
    for root_name, key_path in REGISTRY_PATHS:
        root = _get_registry_root(root_name)
        if root is None:
            continue

        for value_name in ("SteamPath", "InstallPath"):
            steam_path = _read_registry_value(root, key_path, value_name)
            install_path = _normalize_path(steam_path)
            if install_path and install_path.exists():
                paths.append(install_path)

    return sorted({p for p in paths if p.exists()})


def get_registry_install_paths() -> List[Path]:
    """Return installed game paths by inspecting Windows Uninstall registry entries."""
    if os.name != "nt":
        return []

    install_paths: List[Path] = []
    for root_name, key_path in UNINSTALL_REGISTRY_PATHS:
        root = _get_registry_root(root_name)
        if root is None:
            continue

        for subkey in _enumerate_registry_subkeys(root, key_path):
            try:
                with winreg.OpenKey(root, f"{key_path}\\{subkey}") as key:
                    display_name = _read_registry_value(root, f"{key_path}\\{subkey}", "DisplayName")
                    if not display_name or "wuthering" not in display_name.lower():
                        continue

                    install_location = _read_registry_value(root, f"{key_path}\\{subkey}", "InstallLocation")
                    if install_location:
                        path = _normalize_path(install_location)
                        if path and path.exists():
                            install_paths.append(path)
                            continue

                    uninstall_string = _read_registry_value(root, f"{key_path}\\{subkey}", "UninstallString")
                    if uninstall_string:
                        candidate = _normalize_path(uninstall_string)
                        if candidate and candidate.exists():
                            install_paths.append(candidate.parent)
            except OSError:
                continue

    return sorted({p for p in install_paths if p.exists()})


def _expand_drive_patterns(patterns: List[str]) -> List[Path]:
    items: List[Path] = []
    for drive in all_drives():
        drive_str = str(drive).rstrip('/\\')
        for pattern in patterns:
            expanded = Path(pattern.replace("$drive", drive_str))
            items.append(expanded)
    return items


def get_game_install_paths() -> List[Path]:
    """Return candidate Wuthering Waves installation directories."""
    paths: List[Path] = []
    paths.extend(get_registry_install_paths())
    paths.extend(get_steam_paths_from_registry())

    for candidate in _expand_drive_patterns(GAME_PATH_PATTERNS):
        if candidate.exists():
            paths.append(candidate)

    return sorted({p for p in paths if p.exists()})


def _default_appdata_search_paths() -> List[Path]:
    home = Path.home()
    candidates = [
        home / "AppData" / "LocalLow",
        home / "AppData" / "Local",
        home / "AppData" / "Roaming",
        home / "Documents",
        home / "Saved Games",
        Path("C:/ProgramData"),
    ]
    return [p for p in candidates if p.exists()]


def _is_log_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() == ".log"


def _iter_files(root: Path, max_depth: int = 4) -> Iterator[Path]:
    if not root.exists():
        return

    queue: List[Tuple[Path, int]] = [(root, 0)]
    while queue:
        current, depth = queue.pop(0)
        if current.is_file():
            if _is_log_file(current):
                yield current
            continue
        if depth >= max_depth:
            continue
        try:
            for child in current.iterdir():
                if child.is_dir():
                    queue.append((child, depth + 1))
                elif child.is_file() and _is_log_file(child):
                    yield child
        except PermissionError:
            continue
        except OSError:
            continue


def get_log_search_paths() -> List[Path]:
    """Return directories to scan for Wuthering Waves log files."""
    paths: List[Path] = []
    paths.extend(get_game_install_paths())
    paths.extend(_default_appdata_search_paths())
    paths.extend(_expand_drive_patterns(["$drive\\Wuthering Waves", "$drive\\Wuthering Waves Game", "$drive\\Games\\Wuthering Waves", "$drive\\Program Files\\Wuthering Waves"]))
    return sorted({p for p in paths if p.exists()})


def find_log_files(search_paths: Optional[List[Path]] = None, max_depth: int = 4) -> List[Path]:
    """Return matching log files from the provided search paths."""
    if search_paths is None:
        search_paths = get_log_search_paths()

    found: List[Path] = []
    for root in search_paths:
        found.extend(_iter_files(root, max_depth=max_depth))

    return sorted({p for p in found}, key=lambda p: p.stat().st_mtime, reverse=True)


def extract_url(log_path: str) -> Optional[str]:
    """Extract the last matching Wuthering Waves gacha URL from a log file."""
    path = Path(log_path)
    if not path.exists() or not path.is_file():
        return None
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None

    matches = PATTERN.findall(text)
    if matches:
        return matches[-1]
    return None


def find_latest_url(search_paths: Optional[List[Path]] = None) -> Optional[str]:
    """Find the latest URL from the newest log files in the search paths."""
    for log_path in find_log_files(search_paths=search_paths):
        url = extract_url(str(log_path))
        if url:
            return url
    return None


def find_latest_url_with_source(search_paths: Optional[List[Path]] = None) -> Optional[Tuple[str, str]]:
    """Return the newest log path and the first URL found in that file."""
    for log_path in find_log_files(search_paths=search_paths):
        url = extract_url(str(log_path))
        if url:
            return str(log_path), url
    return None


def extract_query_params(url: str) -> dict:
    """Extract query parameters from the Wuthering Waves URL fragment."""
    if '#' not in url:
        return {}
    fragment = url.split('#', 1)[1]
    if '?' not in fragment:
        return {}
    query_string = fragment.split('?', 1)[1]
    params = {}
    for param in query_string.split('&'):
        if '=' in param:
            key, value = param.split('=', 1)
            params[key] = value
    return params


def fetch_data_with_post(url: str) -> dict:
    """Fetch gacha records by POSTing to the game server API."""
    params = extract_query_params(url)

    pool_names = {
        1: "공명자 이벤트 튜닝",
        2: "무기 이벤트 튜닝",
        3: "공명자 레귤러 튜닝",
        4: "무기 레귤러 튜닝",
        5: "초보자 튜닝",
        6: "초보자 자유 선택 튜닝",
        7: "캐릭터 새출발 튜닝",
        8: "무기 새출발 튜닝",
        9: "기타",
    }

    post_url = "https://gmserver-api.aki-game2.net/gacha/record/query"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "Origin": "https://aki-gm-resources-oversea.aki-game.net",
        "Referer": "https://aki-gm-resources-oversea.aki-game.net/",
    }

    all_records = {pool_names[i]: [] for i in range(1, 10)}
    print("[wuwa] fetch_data_with_post url:", url)
    print("[wuwa] query params:", params)
    for card_pool_type in range(1, 10):
        post_body = {
            "playerId": params.get('player_id', ''),
            "cardPoolId": params.get('resources_id', ''),
            "cardPoolType": card_pool_type,
            "serverId": params.get('svr_id', ''),
            "languageCode": params.get('lang', 'ko'),
            "recordId": params.get('record_id', ''),
        }
        pool_name = pool_names.get(card_pool_type, f"타입{card_pool_type}")
        print(f"[wuwa] POST cardPoolType={card_pool_type} ({pool_name}) body={post_body}")

        try:
            response = requests.post(post_url, json=post_body, headers=headers, timeout=10)
            print(f"[wuwa] response status={response.status_code}")
            response.raise_for_status()
            data = response.json()
            print(f"[wuwa] response data code={data.get('code')} message={data.get('message')}")
            if data.get('code') == 0 and 'data' in data:
                records = data['data']
                if records:
                    print(f"[wuwa] {pool_name} records={len(records)}")
                    for record in records:
                        record.pop('cardPoolType', None)
                    all_records[pool_name].extend(records)
                else:
                    print(f"[wuwa] {pool_name} no records")
            else:
                print(f"[wuwa] {pool_name} invalid response: {data}")
        except Exception as exc:
            print(f"[wuwa] error for cardPoolType={card_pool_type} ({pool_name}): {exc}")
            traceback.print_exc()

        if card_pool_type < 9:
            time.sleep(1)

    total_records = sum(len(lst) for lst in all_records.values())
    print(f"[wuwa] total records collected={total_records}")
    return all_records


def save_records_to_json(records: dict, filename: Optional[str] = None, metadata: Optional[dict] = None) -> Optional[str]:
    if not records:
        return None

    if metadata is None:
        metadata = {}

    if not filename:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'wuwa_{timestamp}.json'
    elif not filename.lower().endswith('.json'):
        filename = f'{filename}.json'

    os.makedirs(Path(filename).parent or Path('.'), exist_ok=True)
    data_to_save = {
        **metadata,
        'records': records,
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data_to_save, f, ensure_ascii=False, indent=2)

    return filename


def remove_duplicate_wuwa_files(output_dir: str, player_id: str, keep_filename: str) -> None:
    output_path = Path(output_dir)
    if not output_path.exists() or not output_path.is_dir():
        return

    for path in output_path.glob('wuwa_*.json'):
        if path.name == keep_filename:
            continue
        try:
            with path.open('r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            continue

        if data.get('player_id') == player_id:
            try:
                path.unlink()
                print(f"[wuwa] removed duplicate file: {path}")
            except OSError:
                print(f"[wuwa] failed to remove duplicate file: {path}")


def process_url_to_data(output_dir: str = 'data', url: Optional[str] = None, profilename: Optional[str] = None) -> Optional[str]:
    if url is None:
        return None
    if profilename is None:
        raise ValueError("profilename이 지정되어야 합니다.")

    os.makedirs(output_dir, exist_ok=True)
    records = fetch_data_with_post(url)
    if not records or not any(len(lst) for lst in records.values()):
        print("[wuwa] no records were returned from fetch_data_with_post")
        return None

    params = extract_query_params(url)
    player_id = params.get('player_id', 'unknown')
    output_file = os.path.join(output_dir, f'wuwa_{profilename}.json')

    remove_duplicate_wuwa_files(output_dir, player_id, Path(output_file).name)

    metadata = {
        'player_id': player_id,
        'source_url': url,
    }
    saved_file = save_records_to_json(records, output_file, metadata=metadata)
    print(f"[wuwa] saved JSON file: {saved_file}")
    return saved_file


