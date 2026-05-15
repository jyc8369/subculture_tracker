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
          "type": 1
          "seqId": "499",
          "name": "에스텔라",
          "rarity": "5",
          "timestamp": 1778374719795
        },
        {
          "type" : 1 
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
          "type": 1
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
