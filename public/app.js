// GIST DYNAMIC SOURCES ENDPOINT
const GIST_SOURCES_URL = "https://gist.githubusercontent.com/greenfields-63/8382753efbedb6e5f1b812aad04233d4/raw/sources.json";
const NEWS_SNAPSHOT_URL = "/api/news-snapshot";

// DEFAULT FALLBACK SOURCES DEFINITION
const DEFAULT_SOURCES = [
  { id: "infobae", name: "Infobae", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Ainfobae.com&hl=es-419&gl=AR&ceid=AR%3Aes-419", language: "es", color: "#E91E63", country: "Argentina" },
  { id: "caixin", name: "Caixin Global", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3ACaixin&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#D32F2F", country: "China" },
  { id: "the_paper", name: "The Paper (澎湃新闻)", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Athepaper.cn&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans", language: "zh", color: "#D32F2F", country: "China" },
  { id: "rtve", name: "RTVE", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Artve.es&hl=es&gl=ES&ceid=ES%3Aes", language: "es", color: "#1565C0", country: "Spain" },
  { id: "scmp", name: "South China Morning Post", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Ascmp.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#C62828", country: "China" },
  { id: "xinhua", name: "Xinhua News", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Axinhuanet.com&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans", language: "zh", color: "#B71C1C", country: "China" },
  { id: "abc_australia", name: "ABC News Australia", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aabc.net.au%2Fnews&hl=en-AU&gl=AU&ceid=AU%3Aen", language: "en", color: "#0097A7", country: "Australia" },
  { id: "sbs", name: "SBS News", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Asbs.com.au%2Fnews&hl=en-AU&gl=AU&ceid=AU%3Aen", language: "en", color: "#5D4037", country: "Australia" },
  { id: "mercopress", name: "MercoPress", feedUrl: "https://en.mercopress.com/rss/", language: "en", color: "#00838F", country: "Global" },
  { id: "reuters", name: "Reuters", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Areuters.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#F57C00", country: "Global" },
  { id: "france24", name: "France 24", feedUrl: "https://www.france24.com/fr/rss", language: "fr", color: "#1565C0", country: "France" },
  { id: "israel_hayom", name: "Israel Hayom", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Aisraelhayom.co.il&hl=he&gl=IL&ceid=IL%3Ahe", language: "he", color: "#C2185B", country: "Israel" },
  { id: "inn", name: "Israel National News", feedUrl: "https://www.israelnationalnews.com/Rss.aspx", language: "en", color: "#1976D2", country: "Israel" },
  { id: "jpost", name: "Jerusalem Post", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3AJerusalem%20Post&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#0288D1", country: "Israel" },
  { id: "times_of_israel", name: "Times of Israel", feedUrl: "https://www.timesofisrael.com/feed/", language: "en", color: "#00796B", country: "Israel" },
  { id: "ynet", name: "Ynet", feedUrl: "https://www.ynet.co.il/Integration/StoryRss1854.xml", language: "he", color: "#D32F2F", country: "Israel" },
  { id: "nhk", name: "NHK News", feedUrl: "https://www3.nhk.or.jp/rss/news/cat0.xml", language: "ja", color: "#0277BD", country: "Japan" },
  { id: "ria", name: "RIA Novosti", feedUrl: "https://ria.ru/export/rss2/index.xml", language: "ru", color: "#1565C0", country: "Russia" },
  { id: "tass", name: "TASS", feedUrl: "https://tass.com/rss/v2.xml", language: "en", color: "#0D47A1", country: "Russia" },
  { id: "al_arabiya", name: "Al Arabiya", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20%22Al%20Arabiya%22&hl=ar&gl=SA&ceid=SA%3Aar", language: "ar", color: "#2E7D32", country: "Saudi Arabia" },
  { id: "al_akhbar", name: "Al-Akhbar", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aal-akhbar.com&hl=ar&gl=LB&ceid=LB%3Aar", language: "ar", color: "#2E7D32", country: "Lebanon" },
  { id: "an_nahar", name: "An-Nahar", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aannahar.com&hl=ar&gl=LB&ceid=LB%3Aar", language: "ar", color: "#1565C0", country: "Lebanon" },
  { id: "bbc", name: "BBC News", feedUrl: "http://feeds.bbci.co.uk/news/rss.xml", language: "en", color: "#880E4F", country: "United Kingdom" },
  { id: "sky", name: "Sky News", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Anews.sky.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#455A64", country: "United Kingdom" },
  { id: "abc", name: "ABC News", feedUrl: "https://abcnews.go.com/abcnews/topstories", language: "en", color: "#0097A7", country: "United States" },
  { id: "ap", name: "Associated Press", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3AAssociated%20Press&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#5D4037", country: "United States" },
  { id: "bloomberg", name: "Bloomberg", feedUrl: "https://feeds.bloomberg.com/politics/news.rss", language: "en", color: "#E65100", country: "United States" },
  { id: "cbs", name: "CBS News", feedUrl: "https://www.cbsnews.com/latest/rss/main", language: "en", color: "#388E3C", country: "United States" },
  { id: "cnbc", name: "CNBC", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Acnbc.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#0082C8", country: "United States" },
  { id: "cnn", name: "CNN", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Acnn.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#B71C1C", country: "United States" },
  { id: "fox", name: "Fox News", feedUrl: "https://moxie.foxnews.com/google-publisher/latest.xml", language: "en", color: "#0D47A1", country: "United States" },
  { id: "amar_ujala", name: "Amar Ujala", feedUrl: "https://www.amarujala.com/rss/india-news.xml", language: "hi", color: "#FF9933", country: "India" },
  { id: "nbc", name: "NBC News", feedUrl: "https://feeds.nbcnews.com/nbcnews/public/news", language: "en", color: "#7B1FA2", country: "United States" }
];

// APP STATE
let ALL_SOURCES = [...DEFAULT_SOURCES].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
let enabledSourceIds = new Set(JSON.parse(localStorage.getItem('newsfeed_enabled_sources') || JSON.stringify(ALL_SOURCES.map(s => s.id))));
let cachedHeadlines = JSON.parse(localStorage.getItem('newsfeed_cached_headlines_v2') || '[]');
let viewMode = localStorage.getItem('newsfeed_view_mode')
  || (window.matchMedia('(max-width: 767px)').matches ? 'tiles' : 'ticker');
let showSignals = localStorage.getItem('newsfeed_show_signals') !== 'false';
let openArticlesTranslated = localStorage.getItem('newsfeed_open_articles_translated') === 'true';
const headlineLanguageOptions = {
  en: 'English',
  es: 'Spanish',
  he: 'Hebrew',
  ar: 'Arabic',
  'zh-CN': 'Chinese (Simplified)',
  ja: 'Japanese',
  ru: 'Russian',
  pt: 'Portuguese',
  fr: 'French',
  none: 'None'
};
const savedHeadlineLanguage = localStorage.getItem('newsfeed_headline_language');
let headlineLanguage = Object.hasOwn(headlineLanguageOptions, savedHeadlineLanguage) ? savedHeadlineLanguage : 'en';
let headlineTranslationRequest = 0;
let selectedFilterId = null;
let selectedFilterCountry = null;
let selectedFilterRegion = null;
let isRefreshing = false;
let newsRefreshTimeout = null;
let lastSnapshotGeneratedAt = localStorage.getItem('newsfeed_last_snapshot_generated_at');
let deferredInstallPrompt = null;

// DOM ELEMENTS
const loadingState = document.getElementById('loading-state');
const headlinesGrid = document.getElementById('headlines-grid');
const emptyState = document.getElementById('empty-state');
const summarySection = document.getElementById('summary-section');
const summaryRegions = document.getElementById('summary-regions');
const summaryStatus = document.getElementById('summary-status');
const summaryUpdated = document.getElementById('summary-updated');
const filterBar = document.getElementById('filter-bar');
const lastUpdatedText = document.getElementById('last-updated-text');
const btnRefresh = document.getElementById('btn-refresh');
const iconRefresh = document.getElementById('icon-refresh');
const btnViewToggle = document.getElementById('btn-view-toggle');
const iconViewTiles = document.getElementById('icon-view-tiles');
const iconViewTicker = document.getElementById('icon-view-ticker');
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnModalClose = document.getElementById('btn-modal-close');
const btnModalApply = document.getElementById('btn-modal-apply');
const btnSelectAll = document.getElementById('btn-select-all');
const btnDeselectAll = document.getElementById('btn-deselect-all');
const sourcesListContainer = document.getElementById('sources-list-container');
const sourcesCountText = document.getElementById('sources-count-text');
const btnInstall = document.getElementById('btn-install');
const signalsSection = document.getElementById('signals-section');
const signalsList = document.getElementById('signals-list');
const showSignalsToggle = document.getElementById('show-signals-toggle');
const translateToEnglishToggle = document.getElementById('translate-to-english');
const openArticleTranslatedToggle = document.getElementById('open-article-translated-toggle');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  updateViewToggleIcons();
  if (translateToEnglishToggle) translateToEnglishToggle.checked = headlineLanguage === 'en';
  renderFilterBar();
  void loadSourcesFromGist().then(() => renderFilterBar());
  void loadSummary();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshNews();
      void loadSummary();
    }
  });
  if (cachedHeadlines.length > 0) {
    if (headlineLanguage === 'en') {
      cachedHeadlines = cachedHeadlines.map(item => applyTranslationToItem(item, 'en'));
    }
    renderHeadlines();
  }
  refreshNews();
  scheduleNextNewsRefresh();

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (btnInstall) {
    btnInstall.classList.toggle('hidden', isStandalone);
    btnInstall.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') btnInstall.classList.add('hidden');
        } catch (error) {
          console.error('PWA install prompt failed:', error);
          window.alert('The install prompt could not be opened. Try your browser’s Install App option.');
        } finally {
          deferredInstallPrompt = null;
        }
        return;
      }

      const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      const instructions = isIOS
        ? 'To install Newsfeed, tap Share in Safari, then choose “Add to Home Screen”.'
        : /android/i.test(window.navigator.userAgent)
          ? 'To install Newsfeed, open your browser menu and choose “Install app” or “Add to Home screen”.'
          : 'Your browser has not offered automatic installation. Check its address-bar install icon or browser menu for “Install app” or “Install this site as an app”.';
      window.alert(instructions);
    });

  }
});

function renderSignals(signals) {
      if (!signalsSection || !signalsList || !Array.isArray(signals)) return;
        const expandedSignalIds = new Set(
          [...signalsList.querySelectorAll('details[open]')].map(card => card.dataset.signalId)
        );
        const previousScrollTop = signalsList.scrollTop;
        signalsList.replaceChildren();
        for (const signal of signals) {
          if (!signal || typeof signal.text !== 'string') continue;

          const card = document.createElement('details');
          card.className = 'rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 sm:p-4';
          card.dataset.signalId = String(signal.id || '');
          card.open = !window.matchMedia('(max-width: 639px)').matches || expandedSignalIds.has(card.dataset.signalId);

          const summary = document.createElement('summary');
          summary.className = 'signal-summary flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium leading-relaxed text-slate-100';
          const preview = document.createElement('span');
          preview.className = 'signal-preview min-w-0 flex-1 group-open:hidden';
          const normalizedText = signal.text.replace(/\s+/g, ' ').trim();
          const firstSentence = normalizedText.match(/^.{1,140}?[.!?](?:\s|$)/)?.[0]?.trim();
          preview.textContent = firstSentence || (normalizedText.length > 140 ? `${normalizedText.slice(0, 137).trimEnd()}…` : normalizedText);
          const prompt = document.createElement('span');
          prompt.className = 'shrink-0 text-xs font-semibold text-amber-300';
          prompt.textContent = card.open ? 'Hide' : 'Read';
          summary.append(preview, prompt);
          card.addEventListener('toggle', () => {
            prompt.textContent = card.open ? 'Hide' : 'Read';
          });
          card.appendChild(summary);

          const content = document.createElement('div');
          content.className = 'mt-3 border-t border-slate-800 pt-3';

          const meta = document.createElement('p');
          meta.className = 'mb-2 text-[11px] font-medium text-slate-400';
          const timestamp = Date.parse(signal.updatedAt || signal.createdAt || '');
          meta.textContent = Number.isFinite(timestamp)
            ? `Posted ${new Date(timestamp).toLocaleString()}`
            : 'Seth’s analysis';

          const text = document.createElement('p');
          text.className = 'whitespace-pre-wrap text-sm leading-relaxed text-slate-100';
          text.textContent = signal.text;
          content.append(meta, text);

          if (Array.isArray(signal.links) && signal.links.length) {
            const links = document.createElement('div');
            links.className = 'mt-3 flex flex-wrap gap-x-4 gap-y-2';
            for (const link of signal.links) {
              if (!link || typeof link.url !== 'string') continue;
              let parsedUrl;
              try {
                parsedUrl = new URL(link.url);
              } catch {
                continue;
              }
              if (parsedUrl.protocol !== 'https:') continue;

              const anchor = document.createElement('a');
              anchor.className = 'text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline';
              anchor.href = parsedUrl.href;
              anchor.target = '_blank';
              anchor.rel = 'noopener noreferrer';
              anchor.textContent = typeof link.title === 'string' && link.title.trim()
                ? link.title.trim()
                : parsedUrl.hostname;
              links.appendChild(anchor);
            }
            if (links.childElementCount) content.appendChild(links);
          }

          card.appendChild(content);
          signalsList.appendChild(card);
        }
        signalsList.scrollTop = previousScrollTop;

        updateSignalsVisibility();
}

function updateSignalsVisibility() {
  if (signalsSection && signalsList) {
    signalsSection.classList.toggle('hidden', !showSignals || signalsList.childElementCount === 0);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (btnInstall) btnInstall.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (btnInstall) btnInstall.classList.add('hidden');
});

// LOAD SOURCES DYNAMICALLY FROM GITHUB GIST
async function loadSourcesFromGist() {
  try {
    const res = await fetch(GIST_SOURCES_URL);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const gistIds = new Set(data.map(source => source.id));
        const supplementalSources = DEFAULT_SOURCES.filter(
          source => ['the_paper', 'rtve', 'abc_australia', 'sbs', 'al_akhbar', 'an_nahar', 'cnbc'].includes(source.id) && !gistIds.has(source.id)
        );
        ALL_SOURCES = [...data, ...supplementalSources]
          .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
        const rawSavedIds = localStorage.getItem('newsfeed_enabled_sources');
        let savedIds = [];
        try {
          savedIds = rawSavedIds ? JSON.parse(rawSavedIds) : [];
        } catch {
          savedIds = [];
        }
        if (!Array.isArray(savedIds)) savedIds = [];
        if (savedIds.length > 0) {
          enabledSourceIds = new Set(savedIds);
          let preferencesChanged = false;
          if (localStorage.getItem('newsfeed_the_paper_enabled_v1') !== 'true') {
            enabledSourceIds.add('the_paper');
            preferencesChanged = true;
            localStorage.setItem('newsfeed_the_paper_enabled_v1', 'true');
          }
          if (localStorage.getItem('newsfeed_rtve_enabled_v1') !== 'true') {
            enabledSourceIds.add('rtve');
            preferencesChanged = true;
            localStorage.setItem('newsfeed_rtve_enabled_v1', 'true');
          }
          if (localStorage.getItem('newsfeed_cnbc_enabled_v1') !== 'true') {
            enabledSourceIds.add('cnbc');
            preferencesChanged = true;
            localStorage.setItem('newsfeed_cnbc_enabled_v1', 'true');
          }
          for (const sourceId of ['abc_australia', 'sbs']) {
            const migrationKey = `newsfeed_${sourceId}_enabled_v1`;
            if (localStorage.getItem(migrationKey) !== 'true') {
              enabledSourceIds.add(sourceId);
              preferencesChanged = true;
              localStorage.setItem(migrationKey, 'true');
            }
          }
          for (const sourceId of ['al_akhbar', 'an_nahar']) {
            const migrationKey = `newsfeed_${sourceId}_enabled_v1`;
            if (localStorage.getItem(migrationKey) !== 'true') {
              enabledSourceIds.add(sourceId);
              preferencesChanged = true;
              localStorage.setItem(migrationKey, 'true');
            }
          }
          if (preferencesChanged) savePreferences();
        } else {
          enabledSourceIds = new Set(ALL_SOURCES.map(s => s.id));
          savePreferences();
        }
      }
    }
  } catch (e) {
    console.warn("Failed to load Gist sources, using fallback defaults:", e);
  }
}

// EVENT LISTENERS
function refreshAll() {
  refreshNews();
}

btnRefresh.addEventListener('click', refreshAll);
if (btnViewToggle) {
  btnViewToggle.addEventListener('click', () => {
    viewMode = viewMode === 'ticker' ? 'tiles' : 'ticker';
    localStorage.setItem('newsfeed_view_mode', viewMode);
    updateViewToggleIcons();
    renderHeadlines();
  });
}

function updateViewToggleIcons() {
  if (!btnViewToggle) return;
  if (viewMode === 'ticker') {
    iconViewTicker.classList.add('hidden');
    iconViewTiles.classList.remove('hidden');
    btnViewToggle.title = "Switch to Tiles View";
  } else {
    iconViewTiles.classList.add('hidden');
    iconViewTicker.classList.remove('hidden');
    btnViewToggle.title = "Switch to Wall St Ticker View";
  }
}

btnSettings.addEventListener('click', openSettingsModal);
btnModalClose.addEventListener('click', closeSettingsModal);
showSignalsToggle.addEventListener('change', () => {
  showSignals = showSignalsToggle.checked;
  localStorage.setItem('newsfeed_show_signals', String(showSignals));
  updateSignalsVisibility();
});
translateToEnglishToggle?.addEventListener('change', () => {
  if (!translateToEnglishToggle) return;
  headlineLanguage = translateToEnglishToggle.checked ? 'en' : 'none';
  localStorage.setItem('newsfeed_headline_language', headlineLanguage);
  const requestId = ++headlineTranslationRequest;
  const targetLanguage = headlineLanguage;
  if (targetLanguage === 'none') {
    cachedHeadlines = cachedHeadlines.map(item => ({
      ...item,
      displayTitle: item.originalTitle,
      isTranslated: false
    }));
    saveHeadlines();
    renderHeadlines();
    return;
  }

  // Synchronously apply existing cached translations immediately
  cachedHeadlines = cachedHeadlines.map(item => applyTranslationToItem(item, 'en'));
  saveHeadlines();
  renderHeadlines();

  const originalHeadlines = cachedHeadlines.map(item => ({
    ...item,
    displayTitle: item.originalTitle,
    isTranslated: false
  }));
  void translateItemsForLanguage(originalHeadlines, targetLanguage)
    .then(translatedHeadlines => {
      if (requestId !== headlineTranslationRequest || targetLanguage !== headlineLanguage) return;
      cachedHeadlines = translatedHeadlines;
      saveHeadlines();
      renderHeadlines();
    })
    .catch(error => console.warn('Could not translate headlines:', error));
});
openArticleTranslatedToggle?.addEventListener('change', () => {
  if (!openArticleTranslatedToggle) return;
  openArticlesTranslated = openArticleTranslatedToggle.checked;
  localStorage.setItem('newsfeed_open_articles_translated', String(openArticlesTranslated));
});
btnModalApply.addEventListener('click', () => {
  closeSettingsModal();
  refreshAll();
});

btnSelectAll.addEventListener('click', () => {
  enabledSourceIds = new Set(ALL_SOURCES.map(s => s.id));
  savePreferences();
  renderSourcesList();
});

btnDeselectAll.addEventListener('click', () => {
  enabledSourceIds = new Set();
  savePreferences();
  renderSourcesList();
});

// REFRESH NEWS FEEDS
async function refreshNews() {
  if (isRefreshing) return;
  isRefreshing = true;
  iconRefresh.classList.add('animate-spin');

  if (cachedHeadlines.length === 0) {
    loadingState.classList.remove('hidden');
    headlinesGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
  }

  const activeSources = ALL_SOURCES.filter(s => enabledSourceIds.has(s.id));
  try {
    const response = await fetch(`${NEWS_SNAPSHOT_URL}?_t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`News snapshot returned HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!snapshot.feeds || typeof snapshot.feeds !== 'object') {
      throw new Error('News snapshot has an invalid format');
    }
    if (Array.isArray(snapshot.signals)) renderSignals(snapshot.signals);

    const allItems = activeSources.flatMap(source => {
      const feed = snapshot.feeds[source.id];
      if (!feed || typeof feed.xml !== 'string') {
        console.warn(`No cached snapshot is available for ${source.name}.`);
        return [];
      }

      const parsed = new DOMParser().parseFromString(feed.xml, 'text/xml');
      if (parsed.querySelector('parsererror')) {
        console.warn(`The cached snapshot for ${source.name} contains invalid RSS.`);
        return [];
      }
      return parseXmlFeed(feed.xml, source);
    });

    cachedHeadlines = filterRecentHeadlines(allItems);
    saveHeadlines();

    loadingState.classList.add('hidden');
    renderFilterBar();
    renderHeadlines();

    if (headlineLanguage === 'en') {
      void translateItemsForLanguage(cachedHeadlines, headlineLanguage)
        .then(updated => {
          if (updated && updated.length) {
            cachedHeadlines = filterRecentHeadlines(updated);
            saveHeadlines();
            renderHeadlines();
          }
        })
        .catch(err => console.warn('Background translation failed:', err));
    }

    const snapshotDate = new Date(snapshot.generatedAt);
    const updatedAt = Number.isNaN(snapshotDate.getTime())
      ? new Date()
      : roundToNearestTenMinutes(snapshotDate);
    lastUpdatedText.textContent = `Snapshot updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (!Number.isNaN(snapshotDate.getTime())) {
      lastSnapshotGeneratedAt = snapshotDate.toISOString();
      localStorage.setItem('newsfeed_last_snapshot_generated_at', lastSnapshotGeneratedAt);
    }
  } catch (err) {
    console.error('Could not load the latest news snapshot:', err);
  } finally {
    isRefreshing = false;
    iconRefresh.classList.remove('animate-spin');
    loadingState.classList.add('hidden');
    renderFilterBar();
    renderHeadlines();
    scheduleNextNewsRefresh();
  }
}

function filterRecentHeadlines(items) {
  const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
  const now = Date.now();
  const seenIds = new Set();
  return items
    .filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      if (item.pubDate == null) return false;
      return item.pubDate >= threeHoursAgo && item.pubDate <= now + 10 * 60 * 1000;
    })
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 250);
}

// Poll twice per 10-minute refresh cycle: at :x9:55 (right after the snapshot
// workers finish) and :x0:20 (a safety retry in case the cron ran late).
function getNextNewsPollTime(now) {
  const candidates = [];
  for (let offset = 0; offset <= 12; offset++) {
    const base = new Date(now + offset * 60 * 1000);
    base.setSeconds(0, 0);
    const minute = base.getMinutes();
    let second = null;
    if (minute % 10 === 9) {
      second = 55;
    } else if (minute % 10 === 0) {
      second = 20;
    }
    if (second === null) continue;
    const at = base.getTime() + second * 1000;
    if (at > now + 500) candidates.push(at);
  }
  candidates.sort((a, b) => a - b);
  return candidates.length ? candidates[0] : now + 60 * 1000;
}

// Snapshots are written a few seconds before the 10-minute mark (:x9:49), so
// round the label to the nearest :x0 boundary for a clean "updated 05:20 PM".
function roundToNearestTenMinutes(date) {
  const stepMs = 10 * 60 * 1000;
  return new Date(Math.round(date.getTime() / stepMs) * stepMs);
}

function scheduleNextNewsRefresh() {
  if (newsRefreshTimeout !== null) clearTimeout(newsRefreshTimeout);
  const now = Date.now();
  const refreshAt = getNextNewsPollTime(now);
  newsRefreshTimeout = setTimeout(() => {
    newsRefreshTimeout = null;
    refreshNews();
  }, Math.max(1000, refreshAt - now));
}

// PARSE RSS XML
function parseXmlFeed(xmlText, source) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = xml.querySelectorAll('item, entry');
  const result = [];

  items.forEach(node => {
    const title = cleanText(node.querySelector('title')?.textContent || '');

    let link = '';
    const alternateLink = node.querySelector('link[rel="alternate"]')?.getAttribute('href');
    if (alternateLink) {
      link = alternateLink;
    } else {
      const firstLink = node.querySelector('link');
      link = firstLink?.getAttribute('href') || firstLink?.textContent || '';
    }

    let pubDateStr = '';
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'pubdate' || tag === 'published' || tag === 'dc:date' || tag === 'updated') {
        pubDateStr = child.textContent;
        break;
      }
    }
    if (!pubDateStr) {
      pubDateStr = node.querySelector('pubDate, published, updated')?.textContent || '';
    }

    const guid = node.querySelector('guid, id')?.textContent || link || title;

    if (title) {
      const pubDate = parseDate(pubDateStr);
      const rawItem = {
        id: `${source.id}_${hashString(guid)}`,
        sourceId: source.id,
        sourceName: source.name,
        sourceColor: source.color,
        language: source.language,
        originalTitle: title,
        displayTitle: title,
        link: link.trim(),
        pubDate: pubDate,
        isTranslated: false
      };
      result.push(applyTranslationToItem(rawItem));
    }
  });

  return normalizeFeedDates(result);
}

function normalizeFeedDates(items) {
  if (items.length === 0) return items;
  const validDates = items.map(i => i.pubDate).filter(d => d != null && !isNaN(d));
  if (validDates.length === 0) return items;

  const now = Date.now();
  const maxDate = Math.max(...validDates);

  if (maxDate > now) {
    const skew = maxDate - now;
    return items.map(item => ({
      ...item,
      pubDate: item.pubDate != null && !isNaN(item.pubDate) ? item.pubDate - skew : null
    }));
  }
  return items;
}

// TRANSLATION ENGINE (Cloudflare Workers AI via /api/translate, cached in localStorage)
const translationCache = JSON.parse(localStorage.getItem('newsfeed_translation_cache') || '{}');
const SERVER_TRANSLATION_TARGET = 'en';
const MAX_CLIENT_TRANSLATION_CACHE = 2000;
let translationFetchInFlight = false;

function saveTranslationCache() {
  try {
    const keys = Object.keys(translationCache);
    if (keys.length > MAX_CLIENT_TRANSLATION_CACHE) {
      const keep = keys.slice(keys.length - Math.floor(MAX_CLIENT_TRANSLATION_CACHE / 2));
      const pruned = {};
      for (const k of keep) pruned[k] = translationCache[k];
      for (const k of keys) {
        if (!pruned[k]) delete translationCache[k];
      }
    }
    localStorage.setItem('newsfeed_translation_cache', JSON.stringify(translationCache));
  } catch (e) {
    console.warn('Could not persist translation cache:', e.message);
  }
}

function translationCacheKey(item, targetLanguage) {
  const normalized = String(item.originalTitle || '').replace(/\s+/g, ' ').trim();
  return `${targetLanguage}_${normalized}`;
}

function applyTranslationToItem(item, targetLanguage = headlineLanguage) {
  if (!item || !item.originalTitle) return item;
  const sourceCode = (item.language || '').toLowerCase().split('-')[0];
  const targetCode = (targetLanguage || '').toLowerCase().split('-')[0];
  if (targetCode !== 'en' || sourceCode === 'en') {
    return { ...item, displayTitle: item.originalTitle, isTranslated: false };
  }
  const key = translationCacheKey(item, targetLanguage);
  const translated = translationCache[key];
  if (translated && translated !== item.originalTitle) {
    return { ...item, displayTitle: translated, isTranslated: true };
  }
  return { ...item, displayTitle: item.originalTitle, isTranslated: false };
}

async function translateItemsForLanguage(items, targetLanguage) {
  if (!items.length) return items;
  const targetCode = (targetLanguage || '').toLowerCase().split('-')[0];

  // Only English is translated server-side; other languages rely on the browser translator.
  if (targetCode !== SERVER_TRANSLATION_TARGET) {
    return items.map(item => ({ ...item, displayTitle: item.originalTitle, isTranslated: false }));
  }

  const pending = [];
  for (const item of items) {
    if (!item.originalTitle) continue;
    const sourceCode = (item.language || '').toLowerCase().split('-')[0];
    if (sourceCode === SERVER_TRANSLATION_TARGET) continue;
    if (translationCache[translationCacheKey(item, targetLanguage)]) continue;
    pending.push(item);
  }

  if (pending.length && !translationFetchInFlight) {
    translationFetchInFlight = true;
    try {
      const CHUNK = 40;
      const chunks = [];
      for (let i = 0; i < pending.length; i += CHUNK) {
        chunks.push(pending.slice(i, i + CHUNK));
      }

      const results = await Promise.all(chunks.map(async (chunk) => {
        const payload = JSON.stringify({
          target: SERVER_TRANSLATION_TARGET,
          items: chunk.map(item => ({
            id: item.id,
            text: item.originalTitle,
            lang: item.language || 'auto'
          }))
        });
        let data = null;
        for (let attempt = 0; attempt < 2 && !data; attempt++) {
          if (attempt) await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              signal: controller.signal
            });
            clearTimeout(timer);
            if (res.ok) data = await res.json();
          } catch (e) {
            console.warn(`Translation attempt ${attempt + 1} failed:`, e.message);
          }
        }
        return { chunk, data };
      }));

      let changed = false;
      for (const { chunk, data } of results) {
        if (!data) continue;
        const translations = data.translations ? data.translations : {};
        for (const item of chunk) {
          const translated = translations[item.id];
          if (typeof translated === 'string' && translated.trim()) {
            translationCache[translationCacheKey(item, targetLanguage)] = cleanText(translated);
            changed = true;
          }
        }
      }
      if (changed) saveTranslationCache();
    } finally {
      translationFetchInFlight = false;
    }
  }

  return items.map(item => {
    const translated = translationCache[translationCacheKey(item, targetLanguage)];
    if (translated && translated !== item.originalTitle) {
      return { ...item, displayTitle: translated, isTranslated: true };
    }
    return { ...item, displayTitle: item.originalTitle, isTranslated: false };
  });
}

// RENDER HEADLINES GRID / TICKER
function renderHeadlines() {
  loadingState.classList.add('hidden');

  let itemsToDisplay = cachedHeadlines;
  if (selectedFilterId) {
    itemsToDisplay = cachedHeadlines.filter(item => item.sourceId === selectedFilterId);
  } else if (selectedFilterRegion) {
    const regionSourceIds = new Set(REGION_SOURCES[selectedFilterRegion] || []);
    itemsToDisplay = cachedHeadlines.filter(item => regionSourceIds.has(item.sourceId));
  } else if (selectedFilterCountry) {
    const countrySourceIds = new Set(
      ALL_SOURCES.filter(source => source.country === selectedFilterCountry).map(source => source.id)
    );
    itemsToDisplay = cachedHeadlines.filter(item => countrySourceIds.has(item.sourceId));
  }

  if (itemsToDisplay.length === 0) {
    headlinesGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  headlinesGrid.classList.remove('hidden');
  headlinesGrid.innerHTML = '';

  // Apply layout mode CSS
  if (viewMode === 'ticker') {
    headlinesGrid.className = 'flex flex-col space-y-2';
  } else {
    headlinesGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  }

  itemsToDisplay.forEach(item => {
    const card = document.createElement('div');
    card.onclick = () => {
      openArticle(item);
    };
    const formattedTime = formatTimestamp(item.pubDate);
    const displayTitle = headlineLanguage === 'none' ? item.originalTitle : (item.displayTitle || item.originalTitle);
    const showTranslation = headlineLanguage !== 'none' && item.isTranslated && item.originalTitle !== item.displayTitle;
    const translationBadge = headlineLanguage === 'zh-CN' ? 'ZH' : headlineLanguage.slice(0, 2).toUpperCase();

    if (viewMode === 'ticker') {
      // Wall Street Compact Ticker Row
      card.className = 'bg-slate-900/80 border border-slate-800/90 hover:border-sky-500/50 hover:bg-slate-800/90 rounded-xl px-4 py-2.5 transition flex items-start sm:items-center justify-between gap-3 group cursor-pointer shadow-sm';
      card.innerHTML = `
        <div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="px-2.5 py-0.5 text-[11px] font-bold text-white rounded shrink-0 shadow-sm" style="background-color: ${item.sourceColor}">
              ${item.sourceName}
            </span>
            <span class="text-xs text-slate-400 font-medium shrink-0 min-w-[55px]">${formattedTime}</span>
            ${showTranslation ? `<span class="px-1.5 py-0.5 text-[9px] font-bold text-sky-300 bg-sky-950 border border-sky-800/60 rounded shrink-0">${translationBadge}</span>` : ''}
          </div>
          <h3 lang="${item.language || 'en'}" class="ticker-headline text-sm font-semibold text-slate-100 group-hover:text-sky-300 transition min-w-0 sm:flex-1" title="${escapeHtml(displayTitle)}">
            ${escapeHtml(displayTitle)}
          </h3>
        </div>
        <svg class="hidden sm:block w-4 h-4 text-slate-600 group-hover:text-sky-400 shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      `;
    } else {
      // Modern Tile / Card Grid
      card.className = 'bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg hover:shadow-sky-500/5 transition flex flex-col justify-between group cursor-pointer';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-1 text-xs font-bold text-white rounded-md shadow-sm" style="background-color: ${item.sourceColor}">
                ${item.sourceName}
              </span>
              <span class="text-xs text-slate-400 font-medium">${formattedTime}</span>
            </div>
            ${showTranslation ? `
              <span class="px-2 py-0.5 text-[10px] font-bold text-sky-300 bg-sky-950 border border-sky-800/60 rounded">
                Translated to ${headlineLanguageOptions[headlineLanguage]}
              </span>
            ` : ''}
          </div>
          <h3 lang="${item.language || 'en'}" class="text-base font-bold text-slate-100 group-hover:text-sky-400 transition leading-snug">
            ${escapeHtml(displayTitle)}
          </h3>
        </div>
        ${showTranslation ? `
          <details class="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400" onclick="event.stopPropagation()">
            <summary class="cursor-pointer text-sky-400 hover:underline font-medium select-none">Original Title</summary>
            <p class="mt-1 font-sans text-slate-300">${escapeHtml(item.originalTitle)}</p>
          </details>
        ` : ''}
      `;
    }

    headlinesGrid.appendChild(card);
  });
}

function getArticleUrl(item, link = item.link, translate = openArticlesTranslated) {
  let articleUrl;
  try {
    articleUrl = new URL(link);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(articleUrl.protocol)) return null;

  const sourceLanguage = (item.language || '').toLowerCase().split('-')[0];
  const targetLanguage = headlineLanguage.toLowerCase().split('-')[0];
  if (!translate || headlineLanguage === 'none' || sourceLanguage === targetLanguage) {
    return articleUrl.href;
  }

  const translatedUrl = new URL('https://translate.google.com/translate');
  translatedUrl.searchParams.set('sl', 'auto');
  translatedUrl.searchParams.set('tl', headlineLanguage);
  translatedUrl.searchParams.set('u', articleUrl.href);
  return translatedUrl.href;
}

function openArticle(item) {
  const articleUrl = getArticleUrl(item, item.link, false);
  if (!articleUrl) return;

  const parsedUrl = new URL(articleUrl);
  const sourceLanguage = (item.language || '').toLowerCase().split('-')[0];
  const targetLanguage = headlineLanguage.toLowerCase().split('-')[0];
  const needsTranslation = openArticlesTranslated &&
    headlineLanguage !== 'none' &&
    sourceLanguage !== targetLanguage;
  const isGoogleNewsArticle = parsedUrl.hostname === 'news.google.com' &&
    /^\/(?:rss\/)?articles\//.test(parsedUrl.pathname);

  if (!needsTranslation || !isGoogleNewsArticle) {
    const targetUrl = getArticleUrl(item);
    if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const articleTab = window.open(articleUrl, '_blank');
  if (!articleTab) return;
  articleTab.opener = null;

  fetch(`/api/resolve-google-news-article?url=${encodeURIComponent(articleUrl)}`, {
    signal: AbortSignal.timeout(8000)
  })
    .then(response => {
      if (!response.ok) throw new Error(`Article URL resolver returned HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const targetUrl = getArticleUrl(item, result.url);
      if (!targetUrl) throw new Error('Article URL resolver returned an invalid URL');
      articleTab.location.replace(targetUrl);
    })
    .catch(error => {
      console.warn('Could not resolve Google News article for translation; leaving the original article link open:', error);
    });
}

// REGIONAL AI BRIEFING
const REGION_SOURCES = {
  'Middle East': ['israel_hayom', 'inn', 'jpost', 'times_of_israel', 'ynet', 'al_arabiya', 'al_akhbar', 'an_nahar'],
  'Europe': ['bbc', 'sky', 'france24', 'rtve'],
  'Russia & CIS': ['ria', 'tass'],
  'Asia': ['caixin', 'scmp', 'xinhua', 'the_paper', 'nhk', 'amar_ujala'],
  'Asia-Pacific': ['abc_australia', 'sbs'],
  'North America': ['abc', 'ap', 'bloomberg', 'cbs', 'cnbc', 'cnn', 'fox', 'nbc'],
  'Latin America': ['infobae'],
  'Global': ['reuters', 'mercopress']
};

async function loadSummary() {
  if (!summarySection) return;
  try {
    const res = await fetch('/api/summary', { cache: 'no-store' });
    if (!res.ok) {
      if (summaryStatus) summaryStatus.textContent = 'Regional briefing is unavailable right now.';
      return;
    }
    const data = await res.json();
    renderSummary(data);
  } catch (error) {
    console.warn('Could not load regional briefing:', error.message);
    if (summaryStatus) summaryStatus.textContent = 'Could not load the regional briefing.';
  }
}

function renderSummary(data) {
  const regions = Array.isArray(data?.regions) ? data.regions : [];
  if (!regions.length) {
    summarySection.classList.add('hidden');
    return;
  }
  summarySection.classList.remove('hidden');
  summaryRegions.innerHTML = '';
  if (summaryStatus) summaryStatus.textContent = '';
  if (summaryUpdated) {
    summaryUpdated.textContent = data.generatedAt
      ? new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  regions.forEach((entry) => {
    if (!entry || typeof entry.region !== 'string') return;
    const details = document.createElement('details');
    details.className = 'rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2';

    const head = document.createElement('summary');
    head.className = 'flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-100';
    const bullets = Array.isArray(entry.bullets) ? entry.bullets : [];

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'h-3.5 w-3.5 text-sky-400 transition-transform duration-200 shrink-0');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'flex items-center gap-2';
    titleSpan.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sky-300 font-bold';
    nameSpan.textContent = entry.region;
    titleSpan.appendChild(nameSpan);

    const countSpan = document.createElement('span');
    countSpan.className = 'text-xs font-normal text-slate-400';
    countSpan.textContent = `${bullets.length + (entry.lead ? 1 : 0)} points`;

    head.append(titleSpan, countSpan);
    details.appendChild(head);

    details.addEventListener('toggle', () => {
      icon.classList.toggle('rotate-90', details.open);
    });

    const body = document.createElement('div');
    body.className = 'mt-2 space-y-2';
    if (entry.lead) {
      const lead = document.createElement('p');
      lead.className = 'text-sm leading-relaxed text-slate-200';
      lead.textContent = entry.lead;
      body.appendChild(lead);
    }
    if (bullets.length) {
      const ul = document.createElement('ul');
      ul.className = 'list-disc space-y-1 pl-5 text-sm text-slate-300';
      bullets.forEach(bullet => {
        const li = document.createElement('li');
        li.textContent = bullet;
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    details.appendChild(body);
    summaryRegions.appendChild(details);
  });
}

// RENDER FILTER BAR (Grouped by region/country with headers and vertical bar separators)
function renderFilterBar() {
  const activeSources = ALL_SOURCES.filter(s => enabledSourceIds.has(s.id));
  filterBar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedFilterId === null && selectedFilterRegion === null ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}`;
  allBtn.textContent = `All (${activeSources.length})`;
  allBtn.onclick = () => {
    selectedFilterId = null;
    selectedFilterCountry = null;
    selectedFilterRegion = null;
    renderFilterBar();
    renderHeadlines();
  };
  filterBar.appendChild(allBtn);

  if (selectedFilterRegion) {
    const regionChip = document.createElement('button');
    regionChip.className = 'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-sky-600 text-white shadow-md';
    regionChip.textContent = `${selectedFilterRegion} ✕`;
    regionChip.onclick = () => {
      selectedFilterRegion = null;
      renderFilterBar();
      renderHeadlines();
    };
    filterBar.appendChild(regionChip);
  }

  if (activeSources.length === 0) return;

  const sep1 = document.createElement('span');
  sep1.className = 'text-slate-600 font-bold mx-1.5 select-none';
  sep1.textContent = '|';
  filterBar.appendChild(sep1);

  const grouped = {};
  activeSources.forEach(source => {
    if (!grouped[source.country]) grouped[source.country] = [];
    grouped[source.country].push(source);
  });

  const countries = Object.keys(grouped).sort();
  countries.forEach((country, cIdx) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'flex items-center space-x-1.5 shrink-0';

    const countryBtn = document.createElement('button');
    const isCountrySelected = selectedFilterCountry === country;
    countryBtn.className = `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${isCountrySelected ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/80 text-sky-300 hover:bg-slate-700'}`;
    countryBtn.textContent = `${country} (${grouped[country].length})`;
    countryBtn.setAttribute('aria-pressed', String(isCountrySelected));
    countryBtn.onclick = () => {
      selectedFilterCountry = isCountrySelected ? null : country;
      selectedFilterId = null;
      selectedFilterRegion = null;
      renderFilterBar();
      renderHeadlines();
    };
    groupDiv.appendChild(countryBtn);

    grouped[country].forEach(source => {
      const btn = document.createElement('button');
      const isSelected = selectedFilterId === source.id;
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${isSelected ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}`;
      btn.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${source.color}"></span>
        <span>${source.name}</span>
      `;
      btn.onclick = () => {
        selectedFilterId = isSelected ? null : source.id;
        selectedFilterCountry = null;
        selectedFilterRegion = null;
        renderFilterBar();
        renderHeadlines();
      };
      groupDiv.appendChild(btn);
    });

    filterBar.appendChild(groupDiv);

    if (cIdx < countries.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'text-slate-600 font-bold mx-2 select-none';
      sep.textContent = '|';
      filterBar.appendChild(sep);
    }
  });
}

// SETTINGS MODAL
function openSettingsModal() {
  showSignalsToggle.checked = showSignals;
  if (translateToEnglishToggle) translateToEnglishToggle.checked = headlineLanguage === 'en';
  if (openArticleTranslatedToggle) openArticleTranslatedToggle.checked = openArticlesTranslated;
  renderSourcesList();
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
    closeSettingsModal();
  }
});

function renderSourcesList() {
  sourcesCountText.textContent = `${enabledSourceIds.size} of ${ALL_SOURCES.length} outlets active`;
  sourcesListContainer.innerHTML = '';

  const grouped = {};
  ALL_SOURCES.forEach(source => {
    if (!grouped[source.country]) grouped[source.country] = [];
    grouped[source.country].push(source);
  });

  Object.keys(grouped).sort().forEach(country => {
    const header = document.createElement('div');
    header.className = 'text-xs font-bold text-sky-400 uppercase tracking-wider px-3 pt-3 pb-1';
    header.textContent = country;
    sourcesListContainer.appendChild(header);

    grouped[country].forEach(source => {
      const isChecked = enabledSourceIds.has(source.id);
      const val = document.createElement('label');
      val.className = 'flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-800 ml-2';

      const langNames = {
        'en': 'English',
        'es': 'Spanish',
        'zh': 'Chinese',
        'fr': 'French',
        'he': 'Hebrew',
        'ja': 'Japanese',
        'ru': 'Russian',
        'ar': 'Arabic',
        'hi': 'Hindi'
      };
      const langDesc = langNames[source.language] || 'English';

      val.innerHTML = `
        <input type="checkbox" value="${source.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700 focus:ring-sky-500">
        <span class="w-3 h-3 rounded-full" style="background-color: ${source.color}"></span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-200">${source.name}</p>
          <p class="text-xs text-slate-400">${langDesc}</p>
        </div>
      `;

      val.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
          enabledSourceIds.add(source.id);
        } else {
          enabledSourceIds.delete(source.id);
        }
        savePreferences();
        sourcesCountText.textContent = `${enabledSourceIds.size} of ${ALL_SOURCES.length} outlets active`;
      });

      sourcesListContainer.appendChild(val);
    });
  });
}

// TIMESTAMP FORMATTER (Exact match to Android logic!)
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const diffMs = now - timestamp;
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes <= 59) {
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  } else {
    const date = new Date(timestamp);
    const nowDate = new Date();

    // Check if same calendar day
    if (nowDate.getFullYear() === date.getFullYear() &&
        nowDate.getMonth() === date.getMonth() &&
        nowDate.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
}

// HELPERS
function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/gi, '').trim();
  let parsed = Date.parse(cleaned);
  if (isNaN(parsed)) return null;

  // Reject dates more than 10 minutes in the future (clock skew tolerance).
  // Do not clamp to now — that makes stale/future-dated headlines appear as "Just now" forever.
  const now = Date.now();
  if (parsed > now + 10 * 60 * 1000) return null;
  if (parsed > now) return now;
  return parsed;
}

function cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function savePreferences() {
  localStorage.setItem('newsfeed_enabled_sources', JSON.stringify(Array.from(enabledSourceIds)));
}

function saveHeadlines() {
  localStorage.setItem('newsfeed_cached_headlines_v2', JSON.stringify(cachedHeadlines));
}
