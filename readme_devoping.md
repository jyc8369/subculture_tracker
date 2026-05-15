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
- `README.md`: `readme_devoping.md`로 안내하는 파일
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

# 이 프로젝트에서 공통적으로 사용하는 Json 양식

이 문서는 프로젝트에서 사용하는 기본 JSON 스키마를 설명합니다. 실제 데이터는 다음과 같은 형태로 구성됩니다.

- `id`: 데이터를 식별하는 고유값. 예를 들어 플레이어 ID, 토큰, 혹은 사용자 식별자.
- `banners`: 뱃지 또는 뽑기 그룹 목록.
  - 각 `banner` 객체는 `bannerName`과 `items`를 포함.
- `items`: 해당 뱃지에서 획득한 아이템 목록.

아래 예시는 실제 구조를 문서화한 것이며, 내부 JSON 값은 그대로 참고하십시오.

```json
{
  "id": "12345678",
  "banners": [
    {
      "bannerName": "이벤트 임시 뽑기",
      "items": [
        {
          "type": 1,
          "seqId": "499",
          "name": "에스텔라",
          "rarity": "5",
          "timestamp": 1778374719795
        },
        {
          "type" : 1,
          "seqId": "498",
          "name": "플루라이트",
          "rarity": "4",
          "timestamp": 1778374700000
        }
      ]
    },
    {
      "bannerName": "상시 뽑기",
      "items": [
        {
          "type": 1,
          "seqId": "373",
          "name": "아케쿠리",
          "rarity": "5",
          "timestamp": 1778300000000
        }
      ]
    }
  ]
}
```

## 필드 설명
- `id`: 게임의 UID 또는 Player_ID 또는 Token
- `banners`: 뽑기 단위 그룹 배열.
  - `bannerName`: 해당 뽑기의 이름.
  - `items`: 뽑기에서 획득한 항목 목록.
- `type`: 항목 종류.
  - `1`: 캐릭터
  - `2`: 무기
  - `3`: 방어구
  - `4`: 기타
- `seqId`: 항목 고유 ID. 문자열로 저장.
- `name`: 항목 이름.
- `rarity`: 희귀도. 문자열 형태로 저장.
- `timestamp`: Unix timestamp, 밀리초 단위.

## 추가 참고
- `items` 배열은 0개 이상일 수 있음.
- `banners` 배열도 0개 이상일 수 있음.
- `name`이나 `rarity`는 상황에 따라 null 또는 빈 문자열이 될 수 있음.
- `timestamp`는 밀리초 단위로 변환하여 저장해야 함.
