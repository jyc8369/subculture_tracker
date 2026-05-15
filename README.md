# Subculture Tracker

Subculture Tracker는 Wuthering Waves와 Arknights Endfield의 가챠 기록을 자동으로 모아주는 데스크톱 도구입니다. 사용자는 별도의 수동 파싱 없이 가챠 결과를 쉽게 수집하고, 저장된 데이터를 한눈에 확인할 수 있습니다.

## 프로그램 소개

- Wuthering Waves와 Endfield 두 게임의 가챠 기록을 지원
- 자동으로 원본 데이터를 추출하고, 공통 JSON 형식으로 저장
- 웹 기반 인터페이스를 데스크톱 창에서 바로 실행
- 브라우저 없이 간편하게 기록을 불러오고 관리

## 주요 기능

- **자동 수집**: 로그와 API를 통해 가챠 데이터를 자동으로 가져옵니다.
- **통합 저장**: 모든 결과를 `data/` 폴더에 JSON으로 정리합니다.
- **GUI 조회**: 내장 웹뷰로 결과를 편리하게 확인합니다.
- **포터블 실행**: 배포용 exe로 실행 시 별도 설치 없이 바로 사용 가능합니다.
- **로그 기록**: `subculture_tracker.log`에 실행 기록을 남깁니다.

## 사용 방법

1. `run.py`를 실행합니다.
2. 자동으로 열리는 GUI 창에서 원하는 데이터를 선택합니다.
3. 결과가 `data/` 폴더에 `wuwa_*.json` 또는 `endfield_*.json` 형태로 저장됩니다.
4. 저장된 JSON 파일을 다른 도구로 추가 분석할 수 있습니다.

## 설치

Python 환경에서 직접 실행하려면 아래 명령을 실행하세요.

```bash
pip install -r requirements.txt
```

## 실행

```bash
python run.py
```

또는 배포용 실행파일이 있는 경우:

```bash
dist/app/app.exe
```

## 저장 폴더

- `data/`: 수집된 JSON 파일 저장 위치
- `subculture_tracker.log`: 프로그램 실행 로그 저장 파일

## 저장된 결과 형식

모든 수집 결과는 아래와 같은 공통 구조를 따릅니다.

- `id`: 기록을 구분하는 고유값
- `banners`: 뽑기 단위 그룹 목록
  - `bannerName`: 뽑기 이름
  - `items`: 획득 항목 목록
- `items` 항목
  - `type`: 항목 종류
  - `seqId`: 항목 고유 ID
  - `name`: 항목 이름
  - `rarity`: 희귀도
  - `timestamp`: 밀리초 단위 Unix timestamp

## 참고

- `data/` 폴더는 실행 중 생성된 데이터 저장용이며, 배포 시에도 폴더 구조가 유지됩니다.
- `run.py`가 실행 진입점입니다.
- `README.md`는 사용자용 안내 문서입니다.
</content>
