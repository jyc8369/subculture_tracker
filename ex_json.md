# 이 프로젝트에서 공통적으로 사용하는 Json 양식

```json
{
  "response": {
    "hasMore": false,
    "records": [
      {
        "poolId": "special_1_2_1",
        "poolName": "봄의 천둥, 만물의 소생",
        "records": [
          {
            "charId": "chr_0021_whiten",
            "charName": "에스텔라",
            "rarity": 4,
            "time": 1778374719795,
            "seqId": "499"
          },
          {
            "charId": "chr_0022_bounda",
            "charName": "플루라이트",
            "rarity": 4,
            "time": 1778374719795,
            "seqId": "498"
          }
        ]
      },
      {
        "poolId": "special_1_1_2",
        "poolName": "울프펄",
        "records": [
          {
            "charId": "chr_0019_karin",
            "charName": "아케쿠리",
            "rarity": 4,
            "time": 1776008954258,
            "seqId": "373"
          }
        ]
      }
    ]
  }
}
```

- `poolId`, `poolName`은 gacha 풀 구분용
- `records` 내부 객체는 개별 가챠 결과
- `time`은 숫자 타입(밀리초 기준 타임스탬프)
- `profilename`은 파일명 `endfield_<profilename>.json`에만 저장됩니다
