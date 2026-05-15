const formatTimeValue = value => {
  if (!value) return '';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return String(value);
  return new Date(timestamp).toLocaleString('ko-KR', {
    hour12: false,
    timeZone: 'Asia/Seoul'
  });
};

const parseJsonRows = json => {
  if (!json || !Array.isArray(json.banners)) return [];

  return json.banners.flatMap(banner => {
    const bannerName = banner.bannerName || '튜닝 배너';
    if (!Array.isArray(banner.items)) return [];

    return banner.items.map(item => ({
      cardPoolType: bannerName,
      resourceType: item.seqId || item.type || '',
      name: item.name || '',
      count: 1,
      qualityLevel: Number(item.rarity || item.qualityLevel || 0),
      time: formatTimeValue(item.timestamp || item.time || item.ts || '')
    }));
  });
};

const getJsonSideRailItems = json => {
  if (!json || !Array.isArray(json.banners)) return [];

  return json.banners.map((banner, index) => ({
    title: banner.bannerName || `튜닝 배너 ${index + 1}`,
    banner: banner.bannerName || `튜닝 배너 ${index + 1}`,
    poolType: banner.bannerName || String(index + 1)
  }));
};

const calcTotalStars = rows => {
  const totalPulls = Array.isArray(rows)
    ? rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
    : 0;
  return totalPulls * 160;
};

const fileLabel = filename => {
  const match = String(filename).match(/^wuwa_(.+)\.json$/i);
  return match ? match[1] : String(filename).replace(/\.json$/i, '');
};

const onUpdateInfo = selectedFile => {
  if (!selectedFile) {
    throw new Error('먼저 파일을 선택해주세요.');
  }

  const match = selectedFile.match(/^wuwa_(.+)\.json$/i);
  const profilename = match ? match[1] : selectedFile.replace(/\.json$/i, '');

  return fetch('/exporter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      game_name: 'wuwa',
      profilename
    })
  })
    .then(response => response.json().then(data => {
      if (!response.ok) {
        throw new Error(data.error || '정보 업데이트에 실패했습니다.');
      }
      return `프로필 ${profilename} 정보가 업데이트되었습니다.`;
    }));
};

const wutheringWavesConfig = {
  gameName: 'wuwa',
  dataListQuery: 'wuwa',
  profilePlaceholder: '예: wuwa_example.json',
  parseJsonRows,
  getJsonSideRailItems,
  calcTotalStars,
  fileLabel,
  onUpdateInfo,
  pityTopQuality: 5,
  pityNextQuality: 4,
  pityTopThreshold: 80,
  pityNextThreshold: 10,
  pityTopLabel: '5✦ 천장',
  pityNextLabel: '4✦ 천장'
};

initCommonTracker(wutheringWavesConfig);
