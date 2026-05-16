const commonGetEl = selector => document.querySelector(selector);
const t = key => (window.i18n && typeof window.i18n.t === 'function' ? window.i18n.t(key) : key);

const defaultSelectors = {
  profileNameInput: '#profile-name-input',
  fileDropdownToggle: '#file-dropdown-toggle',
  fileDropdown: '#file-dropdown',
  fileDropdownLabel: '#file-dropdown-label',
  loadFileButton: '#load-file-button',
  updateInfoButton: '#update-info-button',
  fileListStatus: '#file-list-status',
  updateInfoStatus: '#update-info-status',
  recordBody: '#record-tbody',
  recordCount: '#record-count',
  searchInput: '#search-input',
  bannerTitle: '.tracker-card .section-heading h2',
  sideRailList: '.side-rail-list'
};

const normalizeCommonTrackerConfig = config => {
  if (!config || typeof config !== 'object') {
    throw new Error('common-tracker config object is required.');
  }

  config.selectors = {
    ...defaultSelectors,
    ...(config.selectors || {})
  };

  config.state = {
    selectedFile: '',
    files: [],
    allRows: [],
    currentDisplayRows: [],
    selectedBanner: '',
    selectedPoolType: '',
    searchInput: null,
    ...config.state
  };

  if (!config.dataListQuery) {
    config.dataListQuery = config.gameName || 'wuwa';
  }

  if (typeof config.parseJsonRows !== 'function') {
    throw new Error('config.parseJsonRows must be a function.');
  }

  if (typeof config.getJsonSideRailItems !== 'function') {
    throw new Error('config.getJsonSideRailItems must be a function.');
  }

  if (typeof config.calcTotalStars !== 'function') {
    throw new Error('config.calcTotalStars must be a function.');
  }

  config.fileLabel = typeof config.fileLabel === 'function'
    ? config.fileLabel
    : filename => filename;

  return config;
};

const initCommonTracker = config => {
  config = normalizeCommonTrackerConfig(config);

  const profileNameInput = commonGetEl(config.selectors.profileNameInput);
  const fileToggle = commonGetEl(config.selectors.fileDropdownToggle);
  const fileDropdown = commonGetEl(config.selectors.fileDropdown);
  const loadFileButton = commonGetEl(config.selectors.loadFileButton);
  const updateInfoButton = commonGetEl(config.selectors.updateInfoButton);
  const status = commonGetEl(config.selectors.fileListStatus);

  if (profileNameInput) {
    if (config.profilePlaceholder) {
      profileNameInput.placeholder = config.profilePlaceholder;
    }

    profileNameInput.addEventListener('input', event => {
      config.state.selectedFile = event.target.value.trim();
    });
  }

  if (fileToggle) fileToggle.addEventListener('click', () => toggleFileDropdown(config));
  if (fileDropdown) fileDropdown.addEventListener('click', event => handleFileDropdownClick(event, config));
  if (loadFileButton) loadFileButton.addEventListener('click', () => handleLoadFileButton(config));
  if (updateInfoButton) updateInfoButton.addEventListener('click', () => handleUpdateInfoButton(config));

  document.addEventListener('click', event => handleDocumentClick(event, config));

  if (status) {
    status.textContent = t('fileListLoading');
  }

  loadFileList(config, true);
};

const updateFileSelectionUI = config => {
  const label = commonGetEl(config.selectors.fileDropdownLabel);
  const input = commonGetEl(config.selectors.profileNameInput);

  if (label) {
    label.textContent = config.state.selectedFile
      ? config.fileLabel(config.state.selectedFile)
      : t('noFileSelected');
  }
  if (input) input.value = config.state.selectedFile || '';
};

const populateFileList = (files, config) => {
  const dropdown = commonGetEl(config.selectors.fileDropdown);
  const dropdownLabel = commonGetEl(config.selectors.fileDropdownLabel);
  const status = commonGetEl(config.selectors.fileListStatus);

  if (!dropdown || !dropdownLabel) return;

  config.state.files = files;
  dropdown.innerHTML = files.length
    ? files.map(filename => `
        <div class="dropdown-item" role="option" data-filename="${filename}">${config.fileLabel(filename)}</div>
      `).join('')
    : `<div class="dropdown-empty">${t('noFilesFound')}</div>`;

  if (files.length > 0) {
    config.state.selectedFile = config.state.selectedFile || files[0];
    dropdownLabel.textContent = config.fileLabel(config.state.selectedFile);
    highlightSelectedFileItem(config);
  } else {
    dropdownLabel.textContent = t('noFileSelected');
  }

  if (status) {
    status.textContent = files.length
      ? t('filesFound', { count: files.length })
      : t('noFilesFound');
  }
};

const highlightSelectedFileItem = config => {
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.filename === config.state.selectedFile);
  });
};

const loadFileList = (config, autoLoad = true) => {
  fetch(`/data/list?game=${encodeURIComponent(config.dataListQuery)}`)
    .then(response => response.json())
    .then(files => {
      populateFileList(files, config);
      if (autoLoad && files.length > 0) {
        loadFileData(config.state.selectedFile, config);
      }
    })
    .catch(error => {
      console.error(t('jsonListError'), error);
      const status = commonGetEl(config.selectors.fileListStatus);
      if (status) status.textContent = t('jsonListError');
    });
};

const loadFileData = (filename, config) => {
  if (!filename) return;

  config.state.selectedFile = filename;
  updateFileSelectionUI(config);

  fetch(`/data/${encodeURIComponent(filename)}`)
    .then(response => {
      if (!response.ok) throw new Error(t('cannotLoadFile'));
      return response.text();
    })
    .then(text => {
      const extension = filename.split('.').pop().toLowerCase();
      if (extension !== 'json') {
        throw new Error(t('fileTypeError'));
      }

      const json = JSON.parse(text);
      const canonicalFilename = typeof config.canonicalizeFilename === 'function'
        ? config.canonicalizeFilename(filename, json)
        : filename;

      if (canonicalFilename !== filename) {
        config.state.selectedFile = canonicalFilename;
        updateFileSelectionUI(config);
      }

      const rows = config.parseJsonRows(json);
      config.state.allRows = rows;
      const sideRailItems = config.getJsonSideRailItems(json);
      const fileLoadedHandler = typeof config.onFileLoaded === 'function'
        ? config.onFileLoaded
        : handleCommonFileLoaded;

      fileLoadedHandler(rows, sideRailItems, json, config);
    })
    .catch(error => {
      console.error(error);
      alert(error.message);
    });
};

const handleFileDropdownClick = (event, config) => {
  const item = event.target.closest('.dropdown-item');
  if (!item) return;

  config.state.selectedFile = item.dataset.filename;
  updateFileSelectionUI(config);
  highlightSelectedFileItem(config);
  closeFileDropdown(config);
};

const toggleFileDropdown = config => {
  const dropdown = commonGetEl(config.selectors.fileDropdown);
  const toggle = commonGetEl(config.selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  const isOpen = !dropdown.classList.contains('hidden');
  if (isOpen) {
    closeFileDropdown(config);
    return;
  }

  const status = commonGetEl(config.selectors.fileListStatus);
  if (status) {
    status.textContent = t('fileListReloading');
  }

  loadFileList(config, false);
  dropdown.classList.remove('hidden');
  toggle.setAttribute('aria-expanded', 'true');
};

const closeFileDropdown = config => {
  const dropdown = commonGetEl(config.selectors.fileDropdown);
  const toggle = commonGetEl(config.selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  dropdown.classList.add('hidden');
  toggle.setAttribute('aria-expanded', 'false');
};

const handleDocumentClick = (event, config) => {
  const dropdown = commonGetEl(config.selectors.fileDropdown);
  const toggle = commonGetEl(config.selectors.fileDropdownToggle);
  if (!dropdown || !toggle) return;

  if (!toggle.contains(event.target) && !dropdown.contains(event.target)) {
    closeFileDropdown(config);
  }
};

const handleLoadFileButton = config => {
  if (!config.state.selectedFile) {
    alert(t('selectFileFirst'));
    return;
  }

  loadFileData(config.state.selectedFile, config);
};

const handleUpdateInfoButton = config => {
  const status = commonGetEl(config.selectors.updateInfoStatus);

  if (typeof config.onUpdateInfo === 'function') {
    if (status) {
      status.textContent = t('updateInfoPending');
    }

    Promise.resolve(config.onUpdateInfo(config.state.selectedFile, config.state, config))
      .then(message => {
        if (status) {
          status.textContent = typeof message === 'string'
            ? message
            : t('updateInfoDone');
        }
      })
      .catch(error => {
        console.error(error);
        if (status) {
          status.textContent = t('updateInfoError');
        }
        alert(error && error.message ? error.message : String(error));
      });
    return;
  }

  if (!config.state.selectedFile) {
    alert(t('profilePrompt'));
    return;
  }

  if (status) {
    status.textContent = t('noUpdateFeature');
  }
};

const getPityThresholds = config => ({
  topQuality: config.pityTopQuality || 5,
  nextQuality: config.pityNextQuality || 4,
  topThreshold: config.pityTopThreshold || 80,
  nextThreshold: config.pityNextThreshold || 10,
  topLabel: config.pityTopLabel || `${config.pityTopQuality || 5}✦ 천장`,
  nextLabel: config.pityNextLabel || `${config.pityNextQuality || 4}✦ 천장`
});

const getBannerPityCounts = (rows, banner, config) => {
  const {
    topQuality,
    nextQuality,
    topThreshold,
    nextThreshold
  } = getPityThresholds(config);

  if (!Array.isArray(rows)) {
    return {
      pityTop: `??/${topThreshold}`,
      pityNext: `??/${nextThreshold}`
    };
  }

  const categoryRows = rows.filter(row => String(row.cardPoolType) === String(banner));
  if (categoryRows.length === 0) {
    return {
      pityTop: `??/${topThreshold}`,
      pityNext: `??/${nextThreshold}`
    };
  }

  const sorted = [...categoryRows].sort((a, b) => new Date(a.time) - new Date(b.time));
  let sinceTop = 0;
  let sinceNext = 0;
  let foundTop = false;
  let foundNext = false;

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const item = sorted[i];
    if (!foundTop) {
      if (Number(item.qualityLevel) >= topQuality) {
        foundTop = true;
      } else {
        sinceTop += 1;
      }
    }
    if (!foundNext) {
      if (Number(item.qualityLevel) >= nextQuality) {
        foundNext = true;
      } else {
        sinceNext += 1;
      }
    }
    if (foundTop && foundNext) break;
  }

  return {
    pityTop: `${sinceTop}/${topThreshold}`,
    pityNext: `${sinceNext}/${nextThreshold}`
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

const renderRecords = (rows, config) => {
  const tbody = commonGetEl(config.selectors.recordBody);
  const countSpan = commonGetEl(config.selectors.recordCount);

  config.state.searchInput = config.state.searchInput || commonGetEl(config.selectors.searchInput);
  config.state.currentDisplayRows = rows;

  const updateTable = () => {
    const query = config.state.searchInput.value.trim().toLowerCase();
    const displayRows = config.state.currentDisplayRows.filter(row => String(row.name || '').toLowerCase().includes(query));

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

    if (countSpan) countSpan.textContent = displayRows.length;
  };

  if (config.state.searchInput && config.state.searchInput.dataset.listener !== 'true') {
    config.state.searchInput.addEventListener('input', updateTable);
    config.state.searchInput.dataset.listener = 'true';
  }

  updateTable();
};

const renderStats = (rows, config) => {
  const totalPulls = Array.isArray(rows)
    ? rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
    : 0;
  const totalStars = config.calcTotalStars(rows);
  const topQuality = config.pityTopQuality || 5;
  const nextQuality = config.pityNextQuality || 4;
  const topCount = Array.isArray(rows) ? rows.filter(row => Number(row.qualityLevel) === topQuality).length : 0;
  const nextCount = Array.isArray(rows) ? rows.filter(row => Number(row.qualityLevel) === nextQuality).length : 0;

  const statCards = document.querySelectorAll('.stat-card strong');
  if (statCards.length < 4) return;

  statCards[0].textContent = totalPulls;
  statCards[1].textContent = totalStars;
  statCards[2].textContent = topCount;
  statCards[3].textContent = nextCount;
};

const updateBannerSelection = (banner, poolType, config) => {
  if (!banner && !poolType) {
    banner = config.state.selectedBanner;
    poolType = config.state.selectedPoolType;
  }

  config.state.selectedBanner = banner || config.state.selectedBanner;
  config.state.selectedPoolType = String(poolType || config.state.selectedPoolType);

  document.querySelectorAll('.side-rail-item').forEach(button => {
    button.classList.toggle('active', button.dataset.poolType === config.state.selectedPoolType);
  });

  const bannerTitle = commonGetEl(config.selectors.bannerTitle);
  if (bannerTitle && config.state.selectedBanner) bannerTitle.textContent = config.state.selectedBanner;

  const filteredRows = filterRowsByPoolType(config.state.allRows, config.state.selectedPoolType, config.state.selectedBanner);
  renderStats(filteredRows, config);
  renderRecords(filteredRows, config);
};

const attachSideRailHandlers = config => {
  document.querySelectorAll('.side-rail-item').forEach(button => {
    button.addEventListener('click', () => {
      updateBannerSelection(button.dataset.banner, button.dataset.poolType, config);
    });
  });
};

const populateSideRailItems = (items, config) => {
  const list = commonGetEl(config.selectors.sideRailList);
  if (!list) return;

  if (!Array.isArray(items) || items.length === 0) {
    list.innerHTML = '<div class="side-rail-empty">로드할 배너가 없습니다.</div>';
    return;
  }

  list.innerHTML = items.map((item, index) => {
    const title = item.title || item.banner || `배너 ${index + 1}`;
    const banner = item.banner || title;
    const poolType = String(item.poolType || item.pool_type || index + 1);
    const activeClass = index === 0 ? ' active' : '';
    const { pityTop, pityNext } = getBannerPityCounts(config.state.allRows, banner, config);
    const { topLabel, nextLabel } = getPityThresholds(config);

    return `
      <button class="side-rail-item${activeClass}" type="button" data-banner="${banner}" data-pool-type="${poolType}">
        <span class="side-rail-item-title">${title}</span>
        <div class="banner-note-group">
          <div class="banner-note">
            <p class="banner-note-value">${pityTop}</p>
            <p class="banner-note-label">${topLabel}</p>
          </div>
          <div class="banner-note">
            <p class="banner-note-value">${pityNext}</p>
            <p class="banner-note-label">${nextLabel}</p>
          </div>
        </div>
      </button>`;
  }).join('');
};

const refreshSideRailPity = config => {
  document.querySelectorAll('.side-rail-item').forEach(button => {
    const banner = button.dataset.banner;
    const { pityTop, pityNext } = getBannerPityCounts(config.state.allRows, banner, config);
    const values = button.querySelectorAll('.banner-note-value');
    if (values.length >= 1) values[0].textContent = pityTop;
    if (values.length >= 2) values[1].textContent = pityNext;
  });
};

const handleCommonFileLoaded = (rows, sideRailItems, json, config) => {
  config.state.allRows = rows || [];
  config.state.currentDisplayRows = rows || [];

  const items = Array.isArray(sideRailItems) ? sideRailItems : [];
  populateSideRailItems(items, config);

  if (items.length > 0) {
    config.state.selectedBanner = items[0].banner;
    config.state.selectedPoolType = items[0].poolType;
  } else {
    config.state.selectedBanner = '';
    config.state.selectedPoolType = '';
  }

  attachSideRailHandlers(config);
  refreshSideRailPity(config);
  updateBannerSelection(config.state.selectedBanner, config.state.selectedPoolType, config);
};

const openSettingsModal = () => {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('show');
};

const closeSettingsModal = () => {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.remove('show');
};

window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
