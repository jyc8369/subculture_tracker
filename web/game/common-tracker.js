const commonGetEl = selector => document.querySelector(selector);

const normalizeCommonTrackerConfig = config => {
  if (!config || typeof config !== 'object') {
    throw new Error('common-tracker config object is required.');
  }

  const defaultSelectors = {
    profileNameInput: '#profile-name-input',
    fileDropdownToggle: '#file-dropdown-toggle',
    fileDropdown: '#file-dropdown',
    fileDropdownLabel: '#file-dropdown-label',
    loadFileButton: '#load-file-button',
    fileListStatus: '#file-list-status'
  };

  config.selectors = {
    ...defaultSelectors,
    ...(config.selectors || {})
  };

  config.state = config.state || {
    selectedFile: '',
    files: [],
    allRows: []
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

  if (typeof config.onFileLoaded !== 'function') {
    throw new Error('config.onFileLoaded must be a function.');
  }

  return config;
};

const initCommonTracker = config => {
  config = normalizeCommonTrackerConfig(config);

  const profileNameInput = commonGetEl(config.selectors.profileNameInput);
  const fileToggle = commonGetEl(config.selectors.fileDropdownToggle);
  const fileDropdown = commonGetEl(config.selectors.fileDropdown);
  const loadFileButton = commonGetEl(config.selectors.loadFileButton);
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

  document.addEventListener('click', event => handleDocumentClick(event, config));

  if (status) {
    status.textContent = '`data/` 폴더의 JSON 파일을 찾는 중...';
  }

  loadFileList(config, true);
};

const updateFileSelectionUI = config => {
  const label = commonGetEl(config.selectors.fileDropdownLabel);
  const input = commonGetEl(config.selectors.profileNameInput);

  if (label) label.textContent = config.state.selectedFile || '선택된 파일이 없습니다.';
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
        <div class="dropdown-item" role="option" data-filename="${filename}">${filename}</div>
      `).join('')
    : '<div class="dropdown-empty">일치하는 JSON 파일이 없습니다.</div>';

  if (files.length > 0) {
    config.state.selectedFile = config.state.selectedFile || files[0];
    dropdownLabel.textContent = config.state.selectedFile;
    highlightSelectedFileItem(config);
  } else {
    dropdownLabel.textContent = '로드할 파일을 선택하세요.';
  }

  if (status) {
    status.textContent = files.length
      ? `발견된 JSON 파일 ${files.length}개`
      : '일치하는 JSON 파일이 없습니다.';
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
      console.error('JSON 파일 목록을 불러오는 중 오류가 발생했습니다.', error);
    });
};

const loadFileData = (filename, config) => {
  if (!filename) return;

  config.state.selectedFile = filename;
  updateFileSelectionUI(config);

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
      config.onFileLoaded(rows, sideRailItems, json, config);
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
    status.textContent = '`data/` 폴더의 JSON 파일을 새로 불러오는 중...';
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
    alert('먼저 파일을 선택해주세요.');
    return;
  }

  loadFileData(config.state.selectedFile, config);
};
