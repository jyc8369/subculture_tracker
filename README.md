# Subculture Tracker

가챠 기록 데이터 수집 및 시각화를 위한 도구입니다. 주로 Wuthering Waves와 Arknights Endfield의 가챠 데이터를 추출하여 JSON 파일로 저장하고, 웹 인터페이스에서 확인할 수 있습니다.

## 기능

- **Wuthering Waves 데이터 수집** (`wuwa.py`)
  - 로그에서 WWA 가챠 기록 URL 추출
  - 외부 API에서 가챠 기록을 가져와 JSON으로 변환
- **Endfield 데이터 수집** (`endfield.py`)
  - Endfield 웹뷰 JSON API 호출
  - 뱃지/아이템 데이터를 정리하여 JSON 파일로 저장
- **웹 대시보드** (`app.py`, `web/`)
  - Flask 기반 UI 제공
  - 저장된 JSON 데이터를 목록화하고 선택하여 로드
  - 웹에서 결과를 확인할 수 있는 SPA 형태 구성

## 요구사항

- Python 3.7+
- `requirements.txt`에 정의된 패키지

### 설치
```bash
pip install -r requirements.txt
```

## 실행

```bash
python app.py
```

웹 브라우저에서 `http://127.0.0.1:5000`에 접속합니다.

## 사용법

1. `app.py`를 실행합니다.
2. 웹 UI를 통해 데이터를 내보내거나 저장된 JSON 파일을 선택합니다.
3. `data/` 폴더에 생성된 `wuwa_*.json` 또는 `endfield_*.json` 파일을 확인합니다.

## 루트 파일 설명

- `app.py`: Flask 웹 서버 및 라우트 정의
- `endfield.py`: Endfield 가챠 기록 추출 및 JSON 파일 저장 로직
- `wuwa.py`: Wuthering Waves 가챠 URL 검사 및 데이터 추출 로직
- `requirements.txt`: 필요한 Python 패키지 목록
- `README.md`: 이 문서
- `ex_json.md`: 공통 JSON 스키마 및 필드 설명
- `test.html`: 테스트 목적의 HTML 파일
- `.gitignore`: Git 무시 설정

## 폴더 설명

- `data/`
  - 웹 설정 파일 및 수집된 JSON 데이터 저장 위치
  - 예: `wuwa_*.json`, `endfield_*.json`, `web-setting.json`
- `web/`
  - HTML, CSS, JavaScript 정적 리소스
  - `web/game/` 아래에 게임별 트래커 페이지가 있음
- `alpha_dev/`
  - 추가 개발 관련 파일 및 보조 자료
- `.venv/`
  - 로컬 Python 가상환경 (생성된 경우)

## 참고

- 실제 코드 구조에 따라, `parser.py`와 `data_exporter.py` 파일은 현재 루트에 존재하지 않습니다.
- `app.py`는 Flask 앱을 실행하고 `/exporter` 엔드포인트로 `wuwa`와 `endfield` 데이터를 처리합니다.
- `ex_json.md`는 프로젝트에서 통용되는 JSON 필드 규칙을 설명합니다.
</content>