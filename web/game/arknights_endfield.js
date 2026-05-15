const state = {
  allRows: [],
  selectedBanner: '튜닝 배너 1',
  selectedPoolType: '1',
  selectedFile: '',
  files: [],
  currentDisplayRows: [],
  searchInput: null
};

const selectors = {
  bannerTitle: '.tracker-card .section-heading h2',
  recordBody: '#record-tbody',
  recordCount: '#record-count',
  searchInput: '#search-input',
  sideRailItems: '.side-rail-item',
  profileNameInput: '#profile-name-input',
  fileDropdownToggle: '#file-dropdown-toggle',
  fileDropdown: '#file-dropdown',
  fileDropdownLabel: '#file-dropdown-label',
  loadFileButton: '#load-file-button',
  updateInfoButton: '#update-info-button',
  updateInfoStatus: '#update-info-status',
  fileListStatus: '#file-list-status'
};

const getEl = selector => document.querySelector(selector);

const formatTime = value => {
  if (!value) return '';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return String(value);
  return new Date(timestamp).toLocaleString('ko-KR', {
    hour12: false,
    timeZone: 'Asia/Seoul'
  });
};

const parseJsonRows = json => {
  if (json && json.response && Array.isArray(json.response.records)) {
    return json.response.records.flatMap(pool => {
      if (!Array.isArray(pool.records)) return [];
      const poolKey = String(pool.poolId || pool.poolType || pool.poolName || '');
      return pool.records.map(item => ({
        cardPoolType: poolKey,
        resourceType: item.charId || item.resourceId || '',
        name: item.charName || item.name || '',
        count: 1,
        qualityLevel: Number(item.rarity || item.qualityLevel || 0),
        time: formatTime(item.gachaTs || item.time || item.timestamp || '')
      }));
    });
  }

  const records = json.records || {};
  return Object.entries(records).flatMap(([category, items]) => {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      cardPoolType: category,
      resourceType: item.resourceType || '',
      name: item.name || '',
      count: Number(item.count) || 0,
      qualityLevel: Number(item.qualityLevel) || 0,
      time: item.time || ''
    }));
  });
};

const getJsonSideRailItems = json => {
  if (!json || typeof json !== 'object') return null;
  if (Array.isArray(json.side_rail_items) && json.side_rail_items.length > 0) {
    return json.side_rail_items.map((item, index) => ({
      title: item.title || item.banner || String(item || ''),
      banner: item.banner || item.title || String(item || ''),
      poolType: String(item.poolId || item.poolType || item.pool_type || item.pool || index + 1)
    }));
  }
  if (Array.isArray(json.side_rail_titles) && json.side_rail_titles.length > 0) {
    return json.side_rail_titles.map((title, index) => ({
      title: String(title || ''),
      banner: String(title || ''),
      poolType: String(index + 1)
    }));
  }
  if (json.records && typeof json.records === 'object') {
    return Object.keys(json.records).map((category, index) => ({
      title: String(category),
      banner: String(category),
      poolType: String(category)
    }));
  }

  if (json.response && Array.isArray(json.response.records)) {
    return json.response.records.map(pool => ({
      title: String(pool.poolName || pool.poolId || pool.poolType || ''),
      banner: String(pool.poolId || pool.poolType || pool.poolName || ''),
      poolType: String(pool.poolId || pool.poolType || pool.poolName || '')
    }));
  }
  return null;
};

const normalizeRow = ([cardPoolType, resourceType, name, count, qualityLevel, time]) => ({
  cardPoolType,
  resourceType,
  name,
  count: Number(count),
  qualityLevel: Number(qualityLevel),
  time
});

const getBannerPityCounts = (rows, banner) => {
  if (!Array.isArray(rows)) return { pity5: '??/80', pity4: '??/10' };
  const categoryRows = rows.filter(row => String(row.cardPoolType) === String(banner));
  if (categoryRows.length === 0) return { pity5: '??/80', pity4: '??/10' };

  const sorted = [...categoryRows].sort((a, b) => new Date(a.time) - new Date(b.time));
  let since5 = 0;
  let since4 = 0;
  let found5 = false;
  let found4 = false;

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const item = sorted[i];
    if (!found5) {
      if (item.qualityLevel >= 5) {
        found5 = true;
      } else {
        since5 += 1;
      }
    }
    if (!found4) {
      if (item.qualityLevel >= 4) {
        found4 = true;
      } else {
        since4 += 1;
      }
    }
    if (found5 && found4) break;
  }

  return {
    pity5: `${since5}/80`,
    pity4: `${since4}/10`
  };
};

const filterRowsByPoolType = (rows, poolType, banner) => {
  if (!poolType && !banner) return rows;
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const numericRows = rows.some(row => /^\d+$/.test(String(row.cardPoolType)));
  if (numericRows && poolType) {
    return rows.filter(row => String(row.cardPoolType) === String(poolType));
  }

  if (!numericRows) {
    if (banner) {
      return rows.filter(row => String(row.cardPoolType) === String(banner));
    }
    if (poolType) {
      return rows.filter(row => String(row.cardPoolType) === String(poolType));
    }
  }

  return rows;
};

const renderRecords = rows => {
  const tbody = getEl(selectors.recordBody);
  const countSpan = getEl(selectors.recordCount);

  state.searchInput = state.searchInput || getEl(selectors.searchInput);
  state.currentDisplayRows = rows;

  const updateTable = () => {
    const query = state.searchInput.value.trim().toLowerCase();
    const displayRows = state.currentDisplayRows.filter(row => row.name.toLowerCase().includes(query));

    tbody.innerHTML = displayRows
      .map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td class="record-name quality-${row.qualityLevel}">${row.name}</td>
          <td>${row.qualityLevel}✦</td>
          <td>${row.time}</td>
        </tr>
      `)
      .join('');

    countSpan.textContent = displayRows.length;
  };

  if (state.searchInput.dataset.listener !== 'true') {
    state.searchInput.addEventListener('input', updateTable);
    state.searchInput.dataset.listener = 'true';
  }

  updateTable();
};

const updateBannerSelection = (banner, poolType) => {
  state.selectedBanner = banner;
  state.selectedPoolType = String(poolType);

  document.querySelectorAll(selectors.sideRailItems).forEach(button => {
    button.classList.toggle('active', button.dataset.poolType === state.selectedPoolType);
  });

  const bannerTitle = getEl(selectors.bannerTitle);
  if (bannerTitle) bannerTitle.textContent = banner;

  const filteredRows = filterRowsByPoolType(state.allRows, state.selectedPoolType, banner);
  renderStats(filteredRows);
  renderRecords(filteredRows);
};

const attachSideRailHandlers = () => {
  document.querySelectorAll(selectors.sideRailItems).forEach(button => {
    button.addEventListener('click', () => {
      updateBannerSelection(button.dataset.banner, button.dataset.poolType);
    });
  });
};

const populateSideRailItems = items => {
  const list = getEl('.side-rail-list');
  if (!list) return;
  if (!Array.isArray(items) || items.length === 0) return;

  list.innerHTML = items.map((item, index) => {
    const title = item.title || item.banner || `튜닝 배너 ${index + 1}`;
    const banner = item.banner || title;
    const poolType = String(item.poolType || item.pool_type || index + 1);
    const activeClass = index === 0 ? ' active' : '';
    const { pity5, pity4 } = getBannerPityCounts(state.allRows, banner);

    return `
      <button class="side-rail-item${activeClass}" type="button" data-banner="${banner}" data-pool-type="${poolType}">
        <span class="side-rail-item-title">${title}</span>
        <div class="banner-note-group">
          <div class="banner-note">
            <p class="banner-note-value">${pity5}</p>
            <p class="banner-note-label">5✦ 천장</p>
          </div>
          <div class="banner-note">
            <p class="banner-note-value">${pity4}</p>
            <p class="banner-note-label">4✦ 천장</p>
          </div>
        </div>
      </button>`;
  }).join('');
};

const refreshSideRailPity = () => {
  document.querySelectorAll('.side-rail-item').forEach(button => {
    const banner = button.dataset.banner;
    const { pity5, pity4 } = getBannerPityCounts(state.allRows, banner);
    const values = button.querySelectorAll('.banner-note-value');
    if (values.length >= 1) values[0].textContent = pity5;
    if (values.length >= 2) values[1].textContent = pity4;
  });
};

const renderStats = rows => {
  const totalPulls = rows.reduce((sum, row) => sum + (row.count || 0), 0);
  const totalStars = totalPulls * 500;
  const fiveStars = rows.filter(row => row.qualityLevel === 5).length;
  const fourStars = rows.filter(row => row.qualityLevel === 4).length;

  const statCards = document.querySelectorAll('.stat-card strong');
  if (statCards.length < 4) return;

  statCards[0].textContent = totalPulls;
  statCards[1].textContent = totalStars;
  statCards[2].textContent = fiveStars;
  statCards[3].textContent = fourStars;
};

const handleCommonFileLoaded = (rows, sideRailItems) => {
  state.allRows = rows;
  if (sideRailItems && sideRailItems.length > 0) {
    populateSideRailItems(sideRailItems);
    state.selectedBanner = sideRailItems[0].banner;
    state.selectedPoolType = sideRailItems[0].poolType;
  }
  attachSideRailHandlers();
  refreshSideRailPity();
  updateBannerSelection(state.selectedBanner, state.selectedPoolType);
};

const gameConfig = {
  gameName: 'endfield',
  dataListQuery: 'endfield',
  profilePlaceholder: '예: endfield_example.json',
  state,
  selectors,
  parseJsonRows,
  getJsonSideRailItems,
  onFileLoaded: handleCommonFileLoaded
};

initCommonTracker(gameConfig);
