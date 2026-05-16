const I18N = {
  defaultLang: 'ko',
  currentLang: null,
  available: ['ko', 'en'],
  languages: {
    ko: '한국어',
    en: 'English'
  },
  translations: {
    ko: {
      mainTitle: 'Subculture Tracker',
      introLabel: '소개',
      heroIntro: '서브컬쳐 게임의 가챠와 관련된 정보를 한눈에 확인할 수 있는 트래커입니다.',
      heroPill1: '천장 확인',
      heroPill2: '기록 확인',
      heroPill3: '통계 분석',
      trackerHeading: '게임 선택',
      gameAvailable: '사용 가능',
      gameSoon: '곧 출시',
      open: '오픈하기',
      ready: '준비 중',
      settings: '설정',
      close: '모달 닫기',
      select: '선택',
      characterEvent: 'CHARACTER EVENT',
      sideRailHeading: '튜닝 배너',
      homeAria: '홈',
      profileFilename: '프로필 파일 이름',
      profilePlaceholder: '예: example.json',
      gameDescriptionWuwa: '튜닝 기록 조회',
      gameDescriptionEndfield: '새로 생성된 페이지로 이동합니다.',
      gameDescriptionZZZ: '동일한 카드 템플릿을 재사용해 게임별 대시보드를 계속 추가할 수 있습니다.',
      updateInfoButton: '정보 업데이트 / 생성',
      updateInfoStatus: '프로필 선택 후 정보를 업데이트하거나 생성합니다.',
      profileFileSelect: '프로필 파일 선택',
      loadFileButton: '선택된 파일 불러오기',
      searchPlaceholder: '검색하기',
      noFileSelected: '선택된 파일이 없습니다.',
      fileListLoading: 'data/ 폴더의 JSON 파일을 찾는 중...',
      fileListReloading: 'data/ 폴더의 JSON 파일을 새로 불러오는 중...',
      filesFound: '발견된 JSON 파일 {count}개',
      noFilesFound: '일치하는 JSON 파일이 없습니다.',
      characterEvent: 'CHARACTER EVENT',
      totalPulls: '총 뽑기 수',
      totalStars: '총 별의 소리',
      pulls5: '5✦ 뽑은 횟수',
      pulls6: '6✦ 뽑은 횟수',
      history: 'History',
      drawRecords: '뽑기 기록',
      roundNo: '회차 No.',
      itemName: '항목 이름',
      grade: '등급',
      timeUtc: '시간 (UTC+9)',
      profilePrompt: '먼저 프로필 이름을 입력해주세요.',
      selectFileFirst: '먼저 파일을 선택해주세요.',
      updateInfoPending: '정보를 업데이트하는 중입니다...',
      updateInfoDone: '정보 업데이트가 완료되었습니다.',
      updateInfoError: '정보 업데이트 중 오류가 발생했습니다.',
      noUpdateFeature: '정보 업데이트 기능이 설정되지 않았습니다.',
      fileTypeError: '지원되지 않는 파일 형식입니다. JSON 파일을 선택해주세요.',
      cannotLoadFile: '파일을 불러올 수 없습니다.',
      jsonListError: 'JSON 파일 목록을 불러오는 중 오류가 발생했습니다.',
      languageLabel: '언어'
    },
    en: {
      mainTitle: 'Subculture Tracker',
      introLabel: 'About',
      heroIntro: 'A tracker to view gacha-related information for subculture games at a glance.',
      heroPill1: 'Pity Check',
      heroPill2: 'History',
      heroPill3: 'Analytics',
      trackerHeading: 'Select Game',
      gameAvailable: 'Available',
      gameSoon: 'Coming Soon',
      open: 'Open',
      ready: 'Coming Soon',
      settings: 'Settings',
      close: 'Close modal',
      select: 'Select',
      characterEvent: 'CHARACTER EVENT',
      sideRailHeading: 'Tuning Banner',
      homeAria: 'Home',
      profileFilename: 'Profile file name',
      profilePlaceholder: 'Ex: example.json',
      gameDescriptionWuwa: 'View tuning records',
      gameDescriptionEndfield: 'Navigate to the newly-created page.',
      gameDescriptionZZZ: 'The same card template can be reused to add more game dashboards.',
      updateInfoButton: 'Update / Create Info',
      updateInfoStatus: 'Select a profile and update or create its info.',
      profileFileSelect: 'Choose profile file',
      loadFileButton: 'Load selected file',
      searchPlaceholder: 'Search',
      noFileSelected: 'No file selected.',
      fileListLoading: 'Searching JSON files in data/ folder...',
      fileListReloading: 'Reloading JSON files in data/ folder...',
      filesFound: '{count} JSON files found',
      noFilesFound: 'No matching JSON files found.',
      characterEvent: 'CHARACTER EVENT',
      totalPulls: 'Total Pulls',
      totalStars: 'Total Stars',
      pulls5: '5✦ Pulls',
      pulls6: '6✦ Pulls',
      history: 'History',
      drawRecords: 'Draw Records',
      roundNo: 'Round No.',
      itemName: 'Item Name',
      grade: 'Grade',
      timeUtc: 'Time (UTC+9)',
      profilePrompt: 'Please enter a profile name first.',
      selectFileFirst: 'Please select a file first.',
      updateInfoPending: 'Updating information...',
      updateInfoDone: 'Profile {profile} info has been updated.',
      updateInfoError: 'An error occurred while updating information.',
      noUpdateFeature: 'Update info feature is not configured.',
      fileTypeError: 'Unsupported file format. Please choose a JSON file.',
      cannotLoadFile: 'Unable to load the file.',
      jsonListError: 'An error occurred while loading the JSON file list.',
      languageLabel: 'Language'
    }
  },
  t(key, vars = {}) {
    const translation = this.translations[this.currentLang] && this.translations[this.currentLang][key];
    if (!translation) return key;
    return String(translation).replace(/\{([^}]+)\}/g, (_, name) => {
      return typeof vars[name] !== 'undefined' ? vars[name] : '';
    });
  },
  applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = this.t(key);
      if (text !== null) el.textContent = text;
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (typeof el.placeholder !== 'undefined') {
        el.placeholder = this.t(key);
      }
    });

    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      el.setAttribute('aria-label', this.t(key));
    });
  },
  setLanguage(lang) {
    if (!this.available.includes(lang)) {
      lang = this.defaultLang;
    }
    this.currentLang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('scTrackerLang', lang);
    this.applyTranslations();
    const select = document.getElementById('language-select');
    if (select) {
      select.value = lang;
    }
  },
  init() {
    const savedLang = localStorage.getItem('scTrackerLang');
    const browserLang = navigator.language ? navigator.language.slice(0, 2) : this.defaultLang;
    const lang = savedLang || (this.available.includes(browserLang) ? browserLang : this.defaultLang);
    this.populateLanguageSelect();
    this.setLanguage(lang);
  },
  populateLanguageSelect() {
    const select = document.getElementById('language-select');
    if (!select) return;
    select.innerHTML = this.available
      .map(code => `<option value="${code}">${this.languages[code] || code}</option>`)
      .join('');
    select.addEventListener('change', event => {
      this.setLanguage(event.target.value);
    });
  }
};

window.i18n = I18N;
window.addEventListener('DOMContentLoaded', () => I18N.init());
