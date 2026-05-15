import logging
import os
import re
import json
import sys
import time
import threading
import socket
import queue
import uuid
from pathlib import Path

import webview
from flask import Flask, render_template, send_from_directory, request, jsonify

import endfield
import wuwa


# ------------------------------------------------------------------
# 관리자 권한 자동 실행 (Windows 전용)
# ------------------------------------------------------------------
if os.name == 'nt':
    import ctypes

    def is_admin():
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            return False

    def run_as_admin():
        script = os.path.abspath(sys.argv[0])
        params = ' '.join([f'"{arg}"' for arg in sys.argv[1:]])
        try:
            ctypes.windll.shell32.ShellExecuteW(
                None, 'runas', sys.executable, f'"{script}" {params}', None, 1
            )
            sys.exit(0)
        except Exception:
            return False

    if not is_admin():
        if not run_as_admin():
            raise RuntimeError('관리자 권한으로 실행할 수 없습니다.')


# ------------------------------------------------------------------
# Flask 앱 초기화
# ------------------------------------------------------------------
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = Path(sys._MEIPASS)
    PROJECT_ROOT = Path(sys.argv[0]).resolve().parent
else:
    BUNDLE_DIR = Path(__file__).resolve().parent
    PROJECT_ROOT = BUNDLE_DIR

TEMPLATE_FOLDER = BUNDLE_DIR / 'web'
STATIC_FOLDER = BUNDLE_DIR / 'web'
DATA_DIR = PROJECT_ROOT / 'data'
SETTINGS_FILE = DATA_DIR / 'web-setting.json'

DATA_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(
    __name__,
    template_folder=str(TEMPLATE_FOLDER),
    static_folder=str(STATIC_FOLDER),
)

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# 유틸리티 함수
# ------------------------------------------------------------------
def save_settings(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def handle_wuwa(data):
    return {"result": "wuwa", "data": data}


def find_free_port(host: str = '127.0.0.1') -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, 0))
        return sock.getsockname()[1]


job_queue: queue.Queue[dict] = queue.Queue()
job_statuses: dict[str, dict[str, object]] = {}
job_lock = threading.Lock()


def create_export_job(payload: dict[str, object]) -> str:
    job_id = uuid.uuid4().hex
    with job_lock:
        job_statuses[job_id] = {
            "status": "pending",
            "result": None,
            "error": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
    job_queue.put({"job_id": job_id, "payload": payload})
    return job_id


def update_job_status(job_id: str, **fields: object) -> None:
    with job_lock:
        job = job_statuses.get(job_id)
        if not job:
            return
        job.update(fields)
        job["updated_at"] = time.time()


def process_export_task(task: dict[str, object]) -> str:
    payload = task["payload"]
    game_name = payload.get("game_name")
    if game_name == "wuwa":
        url = payload.get("url") or wuwa.find_latest_url()
        if not url:
            raise RuntimeError("로그에서 URL을 찾을 수 없습니다.")

        profilename = payload.get("profilename")
        if not profilename:
            raise ValueError("profilename을 JSON으로 제공해야 합니다.")

        output_dir = payload.get("output_dir", "data")
        return wuwa.process_url_to_data(output_dir=output_dir, url=url, profilename=profilename)

    if game_name == "endfield":
        profilename = payload.get("profilename")
        if not profilename:
            raise ValueError("profilename을 JSON으로 제공해야 합니다.")

        return endfield.fetch_endfield_data(profilename=profilename)

    raise ValueError(f"지원하지 않는 게임: {game_name}")


def exporter_worker() -> None:
    while True:
        task = job_queue.get()
        job_id = task["job_id"]
        update_job_status(job_id, status="running", error=None, result=None)

        try:
            created_file = process_export_task(task)
            update_job_status(job_id, status="done", result=created_file)
            logger.info("[exporter worker] job %s completed: %s", job_id, created_file)
        except Exception as exc:
            update_job_status(job_id, status="failed", error=str(exc))
            logger.exception("[exporter worker] job %s failed", job_id)
        finally:
            job_queue.task_done()


worker_thread = threading.Thread(target=exporter_worker, daemon=True)
worker_thread.start()


# ------------------------------------------------------------------
# 웹 라우트
# ------------------------------------------------------------------
@app.route('/')
def home():
    return render_template('main.html')


@app.route('/game/<path:filename>')
def serve_game_files(filename):
    return send_from_directory(str(STATIC_FOLDER / 'game'), filename)


@app.route('/data/list')
def get_data_file_list():
    data_dir = DATA_DIR
    game = request.args.get('game', 'wuwa').lower()
    if game == 'endfield':
        pattern = re.compile(r'^endfield_.*\.json$')
    elif game == 'wuwa':
        pattern = re.compile(r'^wuwa_.*\.json$')
    else:
        pattern = re.compile(r'^(?:wuwa_|endfield_).+\.json$')

    files = sorted([filename for filename in os.listdir(data_dir) if pattern.match(filename)])
    return jsonify(files)


@app.route('/data/<path:filename>')
def serve_data_files(filename):
    data_dir = DATA_DIR
    filepath = data_dir / filename
    if filepath.is_file():
        return send_from_directory(str(data_dir), filename)

    match = re.match(r'^wuwa_(.+)\.json$', filename)
    if match:
        requested_profilename = match.group(1)
        for candidate in os.listdir(data_dir):
            if not candidate.startswith('wuwa_') or not candidate.endswith('.json'):
                continue
            candidate_path = data_dir / candidate
            try:
                with candidate_path.open('r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get('profilename') == requested_profilename:
                    return send_from_directory(str(data_dir), candidate)
            except Exception:
                continue

    return send_from_directory(str(data_dir), filename)

# JSON 파일 생성
@app.route('/exporter', methods=['POST'])
def exporter():
    try:
        payload = request.get_json(silent=True) or request.form.to_dict()
        logger.debug("[exporter] payload: %s", payload)

        game_name = payload.get("game_name")
        if not game_name:
            raise ValueError("game_name을 JSON으로 제공해야 합니다.")

        if game_name not in {"wuwa", "endfield"}:
            raise ValueError(f"지원하지 않는 게임: {game_name}")

        if game_name == "wuwa":
            if not (payload.get("url") or wuwa.find_latest_url()):
                raise ValueError("로그에서 URL을 찾을 수 없습니다.")
            if not payload.get("profilename"):
                raise ValueError("profilename을 JSON으로 제공해야 합니다.")

        if game_name == "endfield":
            if not payload.get("profilename"):
                raise ValueError("profilename을 JSON으로 제공해야 합니다.")

        job_id = create_export_job(payload)
        logger.info("[exporter] queued job %s", job_id)
        return jsonify({"job_id": job_id, "status": "pending"})

    except Exception as e:
        logger.exception("[exporter] request failed")
        return jsonify({"error": str(e)}), 400


@app.route('/exporter/status/<job_id>')
def exporter_status(job_id):
    with job_lock:
        job = job_statuses.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    return jsonify(job)


# ------------------------------------------------------------------
# 애플리케이션 진입점
# ------------------------------------------------------------------
if __name__ == '__main__':
    port = find_free_port()
    url = f'http://127.0.0.1:{port}/'

    def run_flask():
        logger.info('[app] starting Flask server on %s', url)
        app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False, threaded=True)

    server_thread = threading.Thread(target=run_flask, daemon=True)
    server_thread.start()

    logger.info('[app] creating GUI window for %s', url)
    webview.create_window(
        'Subculture Tracker',
        url,
        width=1200,
        height=800,
        resizable=False,
    )
    logger.info('[app] starting GUI event loop')
    webview.start()