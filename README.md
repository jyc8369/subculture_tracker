# Subculture Tracker

Client.log 파일에서 가챠 데이터를 추출하고 분석하는 도구입니다.

## 기능

- **URL 추출**: UTF-8로 작성된 Client.log 파일에서 가챠 URL을 자동 추출
- **HTML 파싱**: 추출된 URL에서 가챠 데이터를 구조화하여 분석
- **웹 대시보드**: Flask 기반 웹 인터페이스로 데이터 시각화


## 설치 및 실행

### 요구사항
- Python 3.7+
- Flask
- BeautifulSoup4
- requests

### 설치
```bash
pip install flask beautifulsoup4 requests
```

### 웹 앱 실행
```bash
python app.py
```

브라우저에서 http://127.0.0.1:5000 에 접속하여 사용하세요.

## 사용법

1. Client.log 파일을 업로드
2. 파싱된 가챠 데이터를 확인

## 파일 구조

- `app.py`: Flask 웹 서버 및 메인 로직
- `parser.py`: URL 추출 및 HTML 파싱 모듈
- `data_exporter.py`: 데이터 내보내기 모듈
- `web/`: 웹 템플릿 및 스타일 파일</content>