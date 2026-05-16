# Subculture Tracker 개발 문서

이 문서는 Subculture Tracker 프로젝트의 개발 환경, 구조, 실행 방법, 내부 동작 방식을 자세히 설명합니다.

## 프로젝트 개요

Subculture Tracker는 다음 두 게임의 가챠 기록을 자동으로 수집하여 공통 JSON 형식으로 변환하고, 웹 UI를 통해 결과를 확인하는 도구입니다.

- Wuthering Waves (wuwa)
- Arknights Endfield (endfield)

이 프로젝트는 Windows 환경에서 동작하며, 로컬 게임 로그 및 캐시 파일을 읽어 필요한 토큰/URL을 추출하고, 게임 서버 API를 통해 기록 데이터를 가져옵니다.

## 개발 환경

- Python 3.7 이상
- `requirements.txt`에 정의된 패키지 사용
  - `Flask>=3.0`
  - `requests>=2.0`
  - `beautifulsoup4>=4.0`
  - `pywebview>=3.0`

### 가상환경 생성

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 실행 방법

### 기본 실행

```powershell
python run.py
```

기본 실행 시 `run.py`는 내부 Flask 서버를 생성하고, `pywebview`가 설치되어 있으면 네이티브 GUI 창을 엽니다.

### 개발용 브라우저 모드

```powershell
python run.py -dev
```

`-dev` 옵션을 사용하면 웹뷰 대신 기본 웹 브라우저를 자동으로 열어 UI를 표시합니다. `pywebview`가 설치되지 않은 환경에서도 `-dev` 모드로 실행할 수 있습니다.

## `run.py` 동작 요약

- Windows에서 관리자 권한으로 실행되지 않았을 경우, 자동으로 관리자 권한 재실행을 시도합니다.
- 콘솔을 숨기기 위해 Windows에서 `pythonw.exe`를 재실행할 수 있습니다.
- 실행 시 `lastlog.log` 파일을 생성하여 앱 로그를 기록합니다.
- `backend.web.run(use_browser=dev_mode)`를 호출하여 Flask 서버와 웹 UI를 실행합니다.

## 구조 및 책임 분리

### 루트 파일

- `run.py`
  - 진입점
  - 관리자 권한 확인
  - Windows에서 콘솔 숨김 처리
  - Flask 서버 시작 호출
- `requirements.txt`
  - 프로젝트 의존성 목록
- `app.spec`
  - PyInstaller 빌드 설정
- `build-exe.ps1`
  - PyInstaller를 사용해 실행 파일을 생성하는 스크립트
- `README.md`
  - 최종 사용자용 설명서
- `README_dev.md`
  - 개발자용 문서

### 백엔드 패키지 (`backend/`)

- `backend/web.py`
  - Flask 앱 초기화, API 엔드포인트, 작업 큐, 백그라운드 워커
- `backend/endfield.py`
  - Endfield 데이터 추출, 토큰 검출, API 호출, JSON 저장
- `backend/wuwa.py`
  - Wuthering Waves 로그 검색, URL 추출, 서버 요청, JSON 저장
- `backend/webview.py`
  - `pywebview` 기반 네이티브 창 생성

### 정적 리소스

- `web/`
  - HTML/CSS/JS 정적 UI 파일
  - `web/game/` 폴더에 게임별 트래커 페이지 포함
- `data/`
  - 수집된 결과 JSON 파일과 설정 파일 저장 디렉터리
  - 예시: `wuwa_<profilename>.json`, `endfield_<profilename>.json`, `web-setting.json`

## 백엔드 동작 상세

### `backend/web.py`

#### 실행 환경 설정

- PyInstaller로 빌드된 경우와 소스 실행 시 각각 다른 경로를 사용합니다.
- `web/` 디렉터리를 템플릿 및 정적 파일 폴더로 사용합니다.
- `data/` 폴더는 실행 시 자동 생성됩니다.

#### 작업 큐 및 상태

- `job_queue`: JSON 생성 작업을 백그라운드에서 처리하는 큐
- `job_statuses`: 각 작업의 상태, 결과 파일, 오류 메시지를 저장
- `exporter_worker`: 큐에서 작업을 가져와 `wuwa` 또는 `endfield` 데이터를 처리

#### 주요 API 엔드포인트

- `/`
  - `web/main.html`을 렌더링
- `/game/<path:filename>`
  - `web/game/` 하위 게임 리소스 제공
- `/web/<path:filename>`
  - `web/` 하위 정적 리소스 제공
- `/data/list`
  - `game=wuwa`, `game=endfield`, `game=all` 쿼리 파라미터로 JSON 파일 목록 반환
- `/data/<path:filename>`
  - 실제 파일이 있으면 반환
  - `wuwa_<profilename>.json` 요청 시 내부 `profilename` 검색 로직으로 대체 가능
- `/exporter` (POST)
  - JSON 생성 작업 등록
  - 요청 예시:
    - `game_name=wuwa`, `profilename=USER`, `url=...`, `wait=true`, `timeout=60`
    - `game_name=endfield`, `profilename=USER`, `wait=true`
  - `game_name` 필수
  - `profilename` 필수
  - `url`은 `wuwa`에서 선택 사항이지만, 로그 검색 실패 시 반드시 제공해야 함
- `/exporter/status/<job_id>`
  - 작업 상태 조회

#### `process_export_task` 함수

- `game_name == 'wuwa'`
  - `url`이 없으면 `wuwa.find_latest_url()`로 로그에서 URL 검색
  - `profilename`을 사용해 출력 파일 이름 생성
  - `backend.wuwa.process_url_to_data` 호출
- `game_name == 'endfield'`
  - `profilename`을 사용해 출력 파일 이름 생성
  - `backend.endfield.fetch_endfield_data` 호출

#### 서버 시작 흐름

- `find_free_port()`로 사용 가능한 로컬 포트 찾기
- Flask를 백그라운드 스레드에서 실행
- `-dev` 모드면 시스템 브라우저를 1초 대기 후 자동 오픈
- `pywebview`가 설치되어 있으면 네이티브 창을 띄움
- `pywebview`가 없고 `-dev` 모드이면 브라우저 모드로만 실행
- `pywebview`가 없고 일반 모드이면 예외 발생

## Wuthering Waves(`backend/wuwa.py`) 상세

### 목표

- Wuthering Waves 로그에서 마지막 가챠 기록 URL을 추출
- 해당 URL에서 서버 API를 호출해 기록 데이터를 수집
- 공통 JSON 스키마로 변환하여 `data/wuwa_<profilename>.json`으로 저장

### 설치 경로 및 로그 검색

- Windows 레지스트리 `Steam` 설치 경로를 검색
- 게임 설치 경로 후보 목록 (`Program Files`, `SteamLibrary`, `Epic Games`, `Games`, `Wuthering Waves Game` 등) 사용
- 추가적으로 기본 AppData/LocalLow, AppData/Local, AppData/Roaming, Documents, Saved Games, ProgramData 경로를 탐색

### 로그 파일 찾기

- `.log` 확장자 파일을 재귀 검색
- 최대 깊이 4로 탐색
- 최신 수정 시간 기준 정렬 후 최신 로그부터 검사

### URL 추출

- 로그 텍스트에서 다음 URL 패턴을 정규식으로 검색
  - `https://aki-gm-resources.../aki/gacha/index.html#/record...`
- 마지막 매치를 최신 URL로 간주

### 데이터 수집

- URL에서 해시(#) 이후 쿼리 파라미터를 추출하여 API 호출에 사용할 `player_id`, `resources_id`, `svr_id`, `lang`, `record_id` 등을 파싱
- 고정 POST 엔드포인트: `https://gmserver-api.aki-game2.net/gacha/record/query`
- `cardPoolType` 1~9까지 순회하며 풀별 기록을 수집
- 각 풀에서 반환된 레코드는 중복 제거 없이 수집

### JSON 변환

- 각 기록은 `normalize_wuwa_record()`로 변환
- 공통 스키마
  - `id`: 플레이어 ID
  - `banners`: 배너 목록
    - `bannerName`
    - `items`: 레코드 목록
      - `type`, `seqId`, `name`, `rarity`, `timestamp`
- 파일명: `data/wuwa_<profilename>.json`
- 동일한 `id`를 가진 이전 `wuwa_*.json` 파일은 중복 제거

## Endfield(`backend/endfield.py`) 상세

### 목표

- Endfield 설치 캐시에서 최신 토큰을 추출
- Endfield 웹뷰 API를 호출하여 캐릭터 가챠 기록을 페이징 수집
- 결과를 공통 JSON 스키마로 변환하여 `data/endfield_<profilename>.json`으로 저장

### 토큰 검색

- 기본 데이터 파일 경로: `%LOCALAPPDATA%\\PlatformProcess\\Cache\\data_1`
- 해당 경로가 없으면 `~/AppData/Local/PlatformProcess/Cache/data_1`을 대체 경로로 시도
- 파일 내용을 읽어 `token` 값을 추출
- 여러 패턴을 지원하여 URL 쿼리, JSON 속성, 스크립트 변수 등에서 토큰을 찾음

### API 요청

- 기본 페이지 URL: `https://ef-webview.gryphline.com/page/gacha_char?...`
- `build_request()`에서 페이지 URL 또는 직접 `/api/record/char`형 URL을 분석
- 호출 시 `token`, `server_id`, `pool_type`, `lang` 파라미터를 설정

### 페이징 수집

- `fetch_all_pages()`는 `seq_id` 값을 이어받아 추가 페이지를 반복 요청
- 응답이 빈 레코드거나 `hasMore`가 `False`이면 수집 종료
- 요청 URL 목록과 전체 레코드를 함께 누적

### JSON 변환

- 풀별 `poolId`/`poolName`을 묶어 `banners` 생성
- 각 레코드는 다음 형태로 기록
  - `type`, `seqId`, `name`, `rarity`, `timestamp`
- 전체 구조
  - `id`: 토큰 값
  - `banners`: 풀별 항목 목록
- 파일명: `data/endfield_<profilename>.json`
- 같은 토큰을 가진 중복 파일은 삭제

### 커맨드라인 실행

- `python backend/endfield.py <profilename>` 로 단독 실행 가능
- `main()` 함수는 로그를 출력하고 성공/실패 종료 코드를 반환

## 데이터 파일 형식 예시

```json
{
  "id": "user-or-token",
  "banners": [
    {
      "bannerName": "풀 이름",
      "items": [
        {
          "type": 1,
          "seqId": "123456",
          "name": "캐릭터 이름",
          "rarity": "5",
          "timestamp": 1680000000000
        }
      ]
    }
  ]
}
```

## 디버깅 및 로그

- `lastlog.log`에 백엔드 로그가 남습니다.
- `backend/web.py`는 Flask 요청 로그를 통합하여 `werkzeug` 로그를 동일한 로거 이름으로 출력합니다.
- `backend/endfield.py` 및 `backend/wuwa.py`는 HTTP 요청 실패, JSON 파싱 오류, 파일 I/O 오류를 로깅합니다.

## 패키징

- `build-exe.ps1`을 실행하면 `app.spec`을 이용해 PyInstaller 빌드가 수행됩니다.
- Windows 단일 실행 파일 생성 시, `run.py` 진입점을 그대로 번들링합니다.
- 빌드 옵션
  - `-Clean`: 이전 빌드 결과 삭제 후 새로 빌드
  - `-NoUpx`: UPX 압축을 생략하여 빌드

## 폴더 구조 요약

- `.gitignore`: Git 무시 목록
- `.venv/`: 로컬 Python 가상환경
- `app.spec`: PyInstaller 설정
- `backend/`: 실제 애플리케이션 로직
- `data/`: 출력 JSON 파일 및 설정 저장 디렉터리
- `demo/`: 개발/테스트용 샘플 자료
- `dist/`: 빌드된 배포 결과
- `lastlog.log`: 최근 실행 로그
- `web/`: 정적 웹 UI 리소스

## 추가 개발 참고

- `backend/web.py`의 `/exporter`는 동기 `wait` 옵션과 비동기 작업 큐를 모두 지원하므로, 브라우저와 백그라운드 작업 간 분리 구현이 쉽습니다.
- `wuwa`와 `endfield` 모두 저장 파일 이름에 `profilename`을 사용하므로, 웹 UI에서 동일 `profilename`이 충돌하지 않도록 주의해야 합니다.
- `data/` 폴더에는 수집된 결과 이외에도 `web-setting.json` 같은 설정 파일이 저장될 수 있습니다.
