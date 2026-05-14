import os
import re
import json
import sys
import time

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
app = Flask(
    __name__,
    template_folder=os.path.join(os.getcwd(), 'web'),
    static_folder=os.path.join(os.getcwd(), 'web'),
)

SETTINGS_FILE = os.path.join(os.getcwd(), 'data', 'web-setting.json')


# ------------------------------------------------------------------
# 유틸리티 함수
# ------------------------------------------------------------------
def save_settings(data):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def handle_wuwa(data):
    return {"result": "wuwa", "data": data}


# ------------------------------------------------------------------
# 웹 라우트
# ------------------------------------------------------------------
@app.route('/')
def home():
    return render_template('main.html')


@app.route('/game/<path:filename>')
def serve_game_files(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'web', 'game'), filename)


@app.route('/data/list')
def get_data_file_list():
    data_dir = os.path.join(os.getcwd(), 'data')
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
    data_dir = os.path.join(os.getcwd(), 'data')
    filepath = os.path.join(data_dir, filename)
    if os.path.isfile(filepath):
        return send_from_directory(data_dir, filename)

    match = re.match(r'^wuwa_(.+)\.json$', filename)
    if match:
        requested_profilename = match.group(1)
        for candidate in os.listdir(data_dir):
            if not candidate.startswith('wuwa_') or not candidate.endswith('.json'):
                continue
            candidate_path = os.path.join(data_dir, candidate)
            try:
                with open(candidate_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get('profilename') == requested_profilename:
                    return send_from_directory(data_dir, candidate)
            except Exception:
                continue

    return send_from_directory(data_dir, filename)

# JSON 파일 생성
@app.route('/exporter', methods=['POST'])
def exporter():
    try:
        payload = request.get_json(silent=True) or request.form.to_dict()
        print("[exporter] payload:", payload)

        game_name = payload.get("game_name")
        if not game_name:
            raise ValueError("game_name을 JSON으로 제공해야 합니다.")

        if game_name == "wuwa":
            url = payload.get("url") or wuwa.find_latest_url()
            print("[exporter] url:", url)
            if not url:
                return jsonify({"error": "로그에서 URL을 찾을 수 없습니다."}), 400

            profilename = payload.get("profilename")
            if not profilename:
                raise ValueError("profilename을 JSON으로 제공해야 합니다.")

            output_dir = payload.get("output_dir", "data")
            print(f"[exporter] output_dir={output_dir}, profilename={profilename}")

            created_file = wuwa.process_url_to_data(output_dir=output_dir, url=url, profilename=profilename)
            print("[exporter] created_file:", created_file)
            if not created_file:
                return jsonify({"error": "데이터를 가져오거나 저장하지 못했습니다."}), 500

            return jsonify({
                "gamename": game_name,
                "profilename": profilename,
            })

        if game_name == "endfield":
            profilename = payload.get("profilename")
            if not profilename:
                raise ValueError("profilename을 JSON으로 제공해야 합니다.")

            created_file = endfield.fetch_endfield_data(profilename=profilename)
            print("[exporter] endfield created_file:", created_file)
            if not created_file:
                return jsonify({"error": "endfield 데이터를 가져오거나 저장하지 못했습니다."}), 500

            return jsonify({
                "gamename": game_name,
                "profilename": profilename,
            })

        raise ValueError(f"지원하지 않는 게임: {game_name}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400


# ------------------------------------------------------------------
# 애플리케이션 진입점
# ------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True)