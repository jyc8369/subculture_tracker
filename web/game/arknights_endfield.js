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

const loadFileData = filename => {
  if (!filename) return;

  state.selectedFile = filename;
  const input = getEl(selectors.profileNameInput);
  if (input) input.value = filename;

  fetch(`/data/${encodeURIComponent(filename)}`)
    .then(response => {
      if (!response.ok) throw new Error('파일을 불러올 수 없습니다.');
      return response.text();
    })
    .then(text => {
      const extension = filename.split('.').pop().toLowerCase();
      if (extension !== 'json') {
        throw new Error('지원되지 않는 파일 형식입니다. JSON 파일을 선택해주세요.');
      }
      const json = JSON.parse(text);
      state.allRows = parseJsonRows(json);
      const jsonSideRailItems = getJsonSideRailItems(json);
      if (jsonSideRailItems) {
        populateSideRailItems(jsonSideRailItems);
        state.selectedBanner = jsonSideRailItems[0].banner;
        state.selectedPoolType = jsonSideRailItems[0].poolType;
      }
      attachSideRailHandlers();
      refreshSideRailPity();
      updateBannerSelection(state.selectedBanner, state.selectedPoolType);
    })
    .catch(error => {
      console.error(error);
      alert(error.message);
    });
};

const populateFileList = files => {
  const dropdown = getEl(selectors.fileDropdown);
  const dropdownLabel = getEl(selectors.fileDropdownLabel);
  const status = getEl(selectors.fileListStatus);
  if (!dropdown || !dropdownLabel) return;

  state.files = files;
  dropdown.innerHTML = files.length
    ? files.map(filename => `
        <div class="dropdown-item" role="option" data-filename="${filename}">${filename}</div>
      `).join('')
    : '<div class="dropdown-empty">일치하는 JSON 파일이 없습니다.</div>';

  if (files.length > 0) {
    state.selectedFile = state.selectedFile || files[0];
    dropdownLabel.textContent = state.selectedFile;
    highlightSelectedFileItem();
  } else {
    dropdownLabel.textContent = '로드할 파일을 선택하세요.';
  }

  if (status) {
    status.textContent = files.length
      ? `발견된 JSON 파일 ${files.length}개`
      : '일치하는 JSON 파일이 없습니다.';
  }
};

const highlightSelectedFileItem = () => {
  const items = document.querySelectorAll('.dropdown-item');
  items.forEach(item => {
    item.classList.toggle('active', item.dataset.filename === state.selectedFile);
  });
};

const toggleFileDropdown = () => {
  const dropdown = getEl(selectors.fileDropdown);
  const toggle = getEl(selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  const isOpen = !dropdown.classList.contains('hidden');
  if (isOpen) {
    closeFileDropdown();
    return;
  }

  const status = getEl(selectors.fileListStatus);
  if (status) {
    status.textContent = '`data/` 폴더의 JSON 파일을 새로 불러오는 중...';
  }

  loadFileList(false);
  dropdown.classList.remove('hidden');
  toggle.setAttribute('aria-expanded', 'true');
};

const closeFileDropdown = () => {
  const dropdown = getEl(selectors.fileDropdown);
  const toggle = getEl(selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  dropdown.classList.add('hidden');
  toggle.setAttribute('aria-expanded', 'false');
};

const handleFileDropdownClick = event => {
  const item = event.target.closest('.dropdown-item');
  if (!item) return;

  state.selectedFile = item.dataset.filename;
  const input = getEl(selectors.profileNameInput);
  if (input) input.value = state.selectedFile;
  getEl(selectors.fileDropdownLabel).textContent = state.selectedFile;
  highlightSelectedFileItem();
  closeFileDropdown();
};

const loadFileList = (autoLoad = true, game = 'endfield') => {
  fetch(`/data/list?game=${encodeURIComponent(game)}`)
    .then(response => response.json())
    .then(files => {
      populateFileList(files);
      if (autoLoad && files.length > 0) {
        loadFileData(state.selectedFile);
      }
    })
    .catch(error => {
      console.error('JSON 파일 목록을 불러오는 중 오류가 발생했습니다.', error);
    });
};

const handleDocumentClick = event => {
  const dropdown = getEl(selectors.fileDropdown);
  const toggle = getEl(selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  if (!toggle.contains(event.target) && !dropdown.contains(event.target)) {
    closeFileDropdown();
  }
};

const handleLoadFileButton = () => {
  if (!state.selectedFile) {
    alert('먼저 파일을 선택해주세요.');
    return;
  }

  loadFileData(state.selectedFile);
};

function handleUpdateInfo() {
  const button = getEl(selectors.updateInfoButton);
  const status = getEl(selectors.updateInfoStatus);
  const profileNameInput = getEl(selectors.profileNameInput);

  if (!button || !status) return;
  if (profileNameInput && profileNameInput.value.trim()) {
    state.selectedFile = profileNameInput.value.trim();
  }
  if (!state.selectedFile) {
    alert('먼저 프로필 파일을 선택하거나 입력해주세요.');
    return;
  }

  button.disabled = true;
  status.textContent = '정보 업데이트 중입니다...';

  fetch('/exporter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_name: 'endfield',
      profilename: state.selectedFile
    })
  })
    .then(response => response.json().then(data => ({ status: response.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        throw new Error(data.error || '업데이트에 실패했습니다.');
      }
      status.textContent = '정보 업데이트가 완료되었습니다.';
      alert('정보 업데이트/생성이 완료되었습니다.');
      console.log('exporter response:', data);
    })
    .catch(error => {
      status.textContent = `오류: ${error.message}`;
      alert(error.message);
    })
    .finally(() => {
      button.disabled = false;
    });
};

const openSettingsModal = () => {
  getEl('#settings-modal').classList.add('show');
};

const closeSettingsModal = () => {
  getEl('#settings-modal').classList.remove('show');
};

const profileNameInput = getEl(selectors.profileNameInput);
const fileToggle = getEl(selectors.fileDropdownToggle);
const fileDropdown = getEl(selectors.fileDropdown);
const loadFileButton = getEl(selectors.loadFileButton);
const status = getEl(selectors.fileListStatus);

const updateInfoButton = getEl(selectors.updateInfoButton);
const updateInfoStatus = getEl(selectors.updateInfoStatus);

if (profileNameInput) {
  profileNameInput.addEventListener('input', event => {
    state.selectedFile = event.target.value.trim();
  });
}
if (fileToggle) fileToggle.addEventListener('click', toggleFileDropdown);
if (fileDropdown) fileDropdown.addEventListener('click', handleFileDropdownClick);
if (loadFileButton) loadFileButton.addEventListener('click', handleLoadFileButton);
if (updateInfoButton) {
  updateInfoButton.addEventListener('click', handleUpdateInfo);
}
document.addEventListener('click', handleDocumentClick);

if (status) status.textContent = '`data/` 폴더의 JSON 파일을 찾는 중...';
if (updateInfoStatus) updateInfoStatus.textContent = '프로필 선택 후 정보를 업데이트하거나 생성합니다.';
loadFileList(true, 'endfield');
