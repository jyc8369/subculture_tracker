# Subculture Tracker 개발 문서

이 문서는 Subculture Tracker 프로젝트의 개발 환경, 구조, 실행 방법을 정리한 개발자용 안내서입니다.

## 프로젝트 개요

Subculture Tracker는 Wuthering Waves와 Arknights Endfield의 가챠 기록을 자동으로 수집하고, 공통 JSON 형식으로 변환하여 웹 인터페이스로 확인할 수 있게 하는 도구입니다.

## 개발 환경

- Python 3.7 이상
- `requirements.txt`에 정의된 패키지 사용
  - Flask
  - requests
  - beautifulsoup4
  - pywebview

### 가상환경 생성

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 실행 방법

개발 중에는 `run.py`를 실행하여 앱을 시작합니다.

```powershell
python run.py
```

실행 후에는 프로그램이 내부 Flask 서버를 띄우고, 웹뷰 또는 브라우저에서 UI를 표시합니다.

## 주요 파일 및 역할

### 루트 파일

- `run.py`
  - 프로그램 진입점
  - Windows 관리자 권한 실행 및 콘솔 숨김 처리
  - `backend.web` 모듈을 호출하여 서버 시작
- `requirements.txt`
  - 현재 프로젝트에서 사용하는 Python 패키지 목록
- `app.spec`
  - PyInstaller 빌드 설정 파일
- `build-exe.ps1`
  - PyInstaller를 사용한 실행 파일 생성 스크립트
- `README.md`
  - 최종 사용자용 설명서
- `README_dev.md`
  - 개발자용 문서

### 백엔드 패키지 (`backend/`)

- `backend/web.py`
  - Flask 서버와 API 엔드포인트 정의
  - 작업(job) 큐를 사용한 백그라운드 데이터 수집 처리
  - `/data/list`, `/data/<filename>`, `/exporter` 등 웹 요청 처리
- `backend/endfield.py`
  - Endfield용 데이터 수집 및 JSON 변환 로직
  - 로컬 데이터 파일에서 토큰 추출, Endfield API 호출 등
- `backend/wuwa.py`
  - Wuthering Waves 로그에서 기록 URL 추출
  - 게임 설치 경로, 레지스트리, 드라이브 탐색 로직
  - URL로부터 JSON 결과를 내려받아 `data/`로 저장
- `backend/webview.py`
  - pywebview 기반 웹 창 제어 및 웹뷰 통합 기능

### 정적 리소스

- `web/`
  - 웹 UI HTML/CSS/JavaScript 파일
  - `web/game/` 하위에 게임별 트래커 페이지 포함
- `data/`
  - 실행 중 생성되는 출력 JSON 파일과 설정 파일 저장 디렉터리
  - 예: `wuwa_*.json`, `endfield_*.json`, `web-setting.json`

## 개발 및 디버깅

- 로그 파일
  - `lastlog.log`에 실행 기록과 오류 로그가 저장됩니다.
- 코드 수정 후 즉시 반영
  - `run.py`를 재시작하면 최신 코드로 실행됩니다.
- 백엔드 작업 흐름
  - 브라우저(또는 웹뷰)에서 `/exporter` 요청을 받으면 작업 큐에 등록
  - 별도 워커 스레드가 `wuwa` 또는 `endfield` 수집을 실행

## 패키징

Windows용 단일 실행 파일을 만들려면 `build-exe.ps1`을 사용합니다.

```powershell
.uild-exe.ps1
```

옵션:

- `-Clean`: 이전 빌드 아티팩트 삭제 후 빌드
- `-NoUpx`: UPX 압축 없이 빌드

`build-exe.ps1`은 `app.spec`을 사용하여 `run.py`를 PyInstaller로 번들링합니다.

## 폴더 구조 요약

- `.gitignore`: Git 무시 목록
- `.venv/`: 로컬 Python 가상환경
- `app.spec`: PyInstaller 설정
- `backend/`: 실제 애플리케이션 로직
- `data/`: 출력 데이터 및 설정 저장용 폴더
- `demo/`: 개발 또는 테스트용 자료(샘플 등)
- `dist/`: 빌드된 배포 결과
- `lastlog.log`: 최근 실행 로그
- `web/`: 정적 웹 리소스

## 참고 사항

- `README.md`는 최종 사용자/설치 안내용이며, `README_dev.md`는 개발자 관점에서 작성되었습니다.
- 현재 코드베이스에서는 `parser.py`나 `data_exporter.py`가 루트에 존재하지 않습니다.
- 백엔드 모듈 이름과 `run.py` 진입점이 일치하도록 수정 작업 시 주의하십시오.
