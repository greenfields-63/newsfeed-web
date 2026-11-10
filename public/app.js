// GIST DYNAMIC SOURCES ENDPOINT
const GIST_SOURCES_URL = "https://gist.githubusercontent.com/greenfields-63/8382753efbedb6e5f1b812aad04233d4/raw/sources.json";
const RENDER_BACKEND_URL = "https://worldcup-odds-backend.onrender.com";
const NEWS_SNAPSHOT_URL = "/api/news-snapshot";
const SIGNALS_API_URL = `${RENDER_BACKEND_URL}/api/signals`;

// DEFAULT FALLBACK SOURCES DEFINITION
const DEFAULT_SOURCES = [
  { id: "infobae", name: "Infobae", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Ainfobae.com&hl=es-419&gl=AR&ceid=AR%3Aes-419", language: "es", color: "#E91E63", country: "Argentina" },
  { id: "caixin", name: "Caixin Global", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3ACaixin&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#D32F2F", country: "China" },
  { id: "scmp", name: "South China Morning Post", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Ascmp.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#C62828", country: "China" },
  { id: "xinhua", name: "Xinhua News", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Axinhuanet.com&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans", language: "zh", color: "#B71C1C", country: "China" },
  { id: "mercopress", name: "MercoPress", feedUrl: "https://en.mercopress.com/rss/", language: "en", color: "#00838F", country: "Global" },
  { id: "reuters", name: "Reuters", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Areuters.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#F57C00", country: "Global" },
  { id: "israel_hayom", name: "Israel Hayom", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Aisraelhayom.co.il&hl=he&gl=IL&ceid=IL%3Ahe", language: "he", color: "#C2185B", country: "Israel" },
  { id: "inn", name: "Israel National News", feedUrl: "https://www.israelnationalnews.com/Rss.aspx", language: "en", color: "#1976D2", country: "Israel" },
  { id: "jpost", name: "Jerusalem Post", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3AJerusalem%20Post&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#0288D1", country: "Israel" },
  { id: "times_of_israel", name: "Times of Israel", feedUrl: "https://www.timesofisrael.com/feed/", language: "en", color: "#00796B", country: "Israel" },
  { id: "ynet", name: "Ynet", feedUrl: "https://www.ynet.co.il/Integration/StoryRss1854.xml", language: "he", color: "#D32F2F", country: "Israel" },
  { id: "nhk", name: "NHK News", feedUrl: "https://www3.nhk.or.jp/rss/news/cat0.xml", language: "ja", color: "#0277BD", country: "Japan" },
  { id: "ria", name: "RIA Novosti", feedUrl: "https://ria.ru/export/rss2/index.xml", language: "ru", color: "#1565C0", country: "Russia" },
  { id: "tass", name: "TASS", feedUrl: "https://tass.com/rss/v2.xml", language: "en", color: "#0D47A1", country: "Russia" },
  { id: "al_arabiya", name: "Al Arabiya", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20%22Al%20Arabiya%22&hl=ar&gl=SA&ceid=SA%3Aar", language: "ar", color: "#2E7D32", country: "Saudi Arabia" },
  { id: "bbc", name: "BBC News", feedUrl: "http://feeds.bbci.co.uk/news/rss.xml", language: "en", color: "#880E4F", country: "United Kingdom" },
  { id: "sky", name: "Sky News", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Anews.sky.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#455A64", country: "United Kingdom" },
  { id: "abc", name: "ABC News", feedUrl: "https://abcnews.go.com/abcnews/topstories", language: "en", color: "#0097A7", country: "United States" },
  { id: "ap", name: "Associated Press", feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20source%3AAssociated%20Press&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#5D4037", country: "United States" },
  { id: "bloomberg", name: "Bloomberg", feedUrl: "https://feeds.bloomberg.com/politics/news.rss", language: "en", color: "#E65100", country: "United States" },
  { id: "cbs", name: "CBS News", feedUrl: "https://www.cbsnews.com/latest/rss/main", language: "en", color: "#388E3C", country: "United States" },
  { id: "cnn", name: "CNN", feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Acnn.com&hl=en-US&gl=US&ceid=US%3Aen", language: "en", color: "#B71C1C", country: "United States" },
  { id: "fox", name: "Fox News", feedUrl: "https://moxie.foxnews.com/google-publisher/latest.xml", language: "en", color: "#0D47A1", country: "United States" },
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
let isRefreshing = false;
let deferredInstallPrompt = null;

// DOM ELEMENTS
const loadingState = document.getElementById('loading-state');
const headlinesGrid = document.getElementById('headlines-grid');
const emptyState = document.getElementById('empty-state');
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
const headlineLanguageSelect = document.getElementById('headline-language');
const openArticleTranslatedToggle = document.getElementById('open-article-translated-toggle');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  updateViewToggleIcons();
  await loadSourcesFromGist();
  renderFilterBar();
  refreshSignals();
  setInterval(refreshSignals, 5 * 60 * 1000);
  if (cachedHeadlines.length > 0) {
    renderHeadlines();
  }
  refreshNews();

  // Auto-refresh every 5 minutes
  setInterval(refreshNews, 5 * 60 * 1000);

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

async function refreshSignals() {
      if (!signalsSection || !signalsList || !showSignals) {
        updateSignalsVisibility();
        return;
      }

      try {
        const response = await fetch(SIGNALS_API_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const signals = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.signals)
            ? payload.signals
            : null;
        if (!signals) throw new Error('Invalid signals response');

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
          preview.className = 'signal-preview min-w-0 flex-1';
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
      } catch (error) {
        signalsSection.classList.add('hidden');
        if (!/HTTP 404/.test(error.message || '')) {
          console.warn('Seth’s Signals could not be loaded:', error.message);
        }
      }
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
        ALL_SOURCES = data.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
        const savedIds = JSON.parse(localStorage.getItem('newsfeed_enabled_sources') || '[]');
        if (savedIds.length > 0) {
          enabledSourceIds = new Set(savedIds);
        } else {
          enabledSourceIds = new Set(ALL_SOURCES.map(s => s.id));
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
  refreshSignals();
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
  if (showSignals) refreshSignals();
});
headlineLanguageSelect.addEventListener('change', () => {
  headlineLanguage = Object.hasOwn(headlineLanguageOptions, headlineLanguageSelect.value)
    ? headlineLanguageSelect.value
    : 'en';
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

  const originalHeadlines = cachedHeadlines.map(item => ({
    ...item,
    displayTitle: item.originalTitle,
    isTranslated: false
  }));
  cachedHeadlines = originalHeadlines;
  renderHeadlines();
  translateItemsForLanguage(originalHeadlines, targetLanguage).then(translatedHeadlines => {
    if (requestId !== headlineTranslationRequest || targetLanguage !== headlineLanguage) return;
    cachedHeadlines = translatedHeadlines;
    saveHeadlines();
    renderHeadlines();
  });
});
openArticleTranslatedToggle.addEventListener('change', () => {
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
  if (activeSources.length === 0) {
    cachedHeadlines = [];
    saveHeadlines();
    renderHeadlines();
    isRefreshing = false;
    iconRefresh.classList.remove('animate-spin');
    return;
  }

  try {
    const response = await fetch(NEWS_SNAPSHOT_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`News snapshot returned HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!snapshot.feeds || typeof snapshot.feeds !== 'object') {
      throw new Error('News snapshot has an invalid format');
    }

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

    let translationRequestId = ++headlineTranslationRequest;
    let translationLanguage = headlineLanguage;
    let translatedItems = await translateItemsForLanguage(allItems, translationLanguage);
    while (translationLanguage !== headlineLanguage || translationRequestId !== headlineTranslationRequest) {
      translationRequestId = ++headlineTranslationRequest;
      translationLanguage = headlineLanguage;
      translatedItems = await translateItemsForLanguage(allItems, translationLanguage);
    }

    // Filter within last 3 hours, sort strictly chronological descending, take up to 100
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
    const seenIds = new Set();
    const sortedHeadlines = translatedItems
      .filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return item.pubDate >= threeHoursAgo;
      })
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 250);

    cachedHeadlines = sortedHeadlines;
    saveHeadlines();

    const snapshotDate = new Date(snapshot.generatedAt);
    const updatedAt = Number.isNaN(snapshotDate.getTime()) ? new Date() : snapshotDate;
    lastUpdatedText.textContent = `Snapshot updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    console.error('Could not load the latest news snapshot:', err);
  } finally {
    isRefreshing = false;
    iconRefresh.classList.remove('animate-spin');
    loadingState.classList.add('hidden');
    renderFilterBar();
    renderHeadlines();
  }
}

// PARSE RSS XML
function parseXmlFeed(xmlText, source) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = xml.querySelectorAll('item, entry');
  const result = [];

  items.forEach(node => {
    const title = cleanText(node.querySelector('title')?.textContent || '');
    let link = node.querySelector('link')?.textContent || node.querySelector('link')?.getAttribute('href') || '';

    let pubDateStr = '';
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'pubdate' || tag === 'published' || tag === 'dc:date') {
        pubDateStr = child.textContent;
        break;
      }
    }
    if (!pubDateStr) {
      pubDateStr = node.querySelector('pubDate')?.textContent || '';
    }

    const guid = node.querySelector('guid, id')?.textContent || link || title;

    if (title) {
      const pubDate = parseDate(pubDateStr);
      result.push({
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
      });
    }
  });

  return normalizeFeedDates(result);
}

function normalizeFeedDates(items) {
  if (items.length === 0) return items;
  const now = Date.now();
  const maxDate = Math.max(...items.map(i => i.pubDate));

  if (maxDate > now) {
    const skew = maxDate - now;
    return items.map(item => ({
      ...item,
      pubDate: item.pubDate - skew
    }));
  }
  return items;
}

// TRANSLATION ENGINE (Google Translate Free GTX Endpoint + LocalStorage Cache)
const translationCache = JSON.parse(localStorage.getItem('newsfeed_translation_cache') || '{}');

async function translateItemIfNeeded(item, targetLanguage) {
  if (!item.originalTitle) return item;
  const sourceLanguage = item.language.toLowerCase().split('-')[0];
  const targetLanguageCode = targetLanguage.toLowerCase().split('-')[0];
  if (targetLanguage === 'none' || sourceLanguage === targetLanguageCode) {
    return { ...item, displayTitle: item.originalTitle, isTranslated: false };
  }

  const cacheKey = `${item.language}_${targetLanguage}_${item.originalTitle}`;
  if (translationCache[cacheKey]) {
    return {
      ...item,
      displayTitle: translationCache[cacheKey],
      isTranslated: translationCache[cacheKey] !== item.originalTitle
    };
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(item.language)}&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(item.originalTitle)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Headline translation request failed with HTTP ${res.status}.`);
      return { ...item, displayTitle: item.originalTitle, isTranslated: false };
    }
    const data = await res.json();
    if (data && data[0] && Array.isArray(data[0])) {
      const translated = cleanText(data[0].map(x => x[0]).join(''));
      if (translated && translated.toLowerCase() !== item.originalTitle.toLowerCase()) {
        translationCache[cacheKey] = translated;
        localStorage.setItem('newsfeed_translation_cache', JSON.stringify(translationCache));
        return {
          ...item,
          displayTitle: translated,
          isTranslated: true
        };
      }
      if (translated) {
        return { ...item, displayTitle: translated, isTranslated: false };
      }
    }
  } catch (e) {
    console.warn(`Could not translate headline to ${headlineLanguageOptions[targetLanguage] || targetLanguage}:`, e.message);
  }

  return { ...item, displayTitle: item.originalTitle, isTranslated: false };
}

async function translateItemsForLanguage(items, targetLanguage) {
  if (targetLanguage === 'none') {
    return items.map(item => ({ ...item, displayTitle: item.originalTitle, isTranslated: false }));
  }

  const results = await Promise.allSettled(items.map(item => translateItemIfNeeded(item, targetLanguage)));
  return results.map((result, index) => (
    result.status === 'fulfilled'
      ? result.value
      : { ...items[index], displayTitle: items[index].originalTitle, isTranslated: false }
  ));
}

// RENDER HEADLINES GRID / TICKER
function renderHeadlines() {
  loadingState.classList.add('hidden');

  let itemsToDisplay = cachedHeadlines;
  if (selectedFilterId) {
    itemsToDisplay = cachedHeadlines.filter(item => item.sourceId === selectedFilterId);
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
          <h3 class="ticker-headline text-sm font-semibold text-slate-100 group-hover:text-sky-300 transition min-w-0 sm:flex-1" title="${escapeHtml(displayTitle)}">
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
          <h3 class="text-base font-bold text-slate-100 group-hover:text-sky-400 transition leading-snug">
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

  const articleTab = window.open('about:blank', '_blank');
  if (!articleTab) return;
  articleTab.opener = null;

  fetch(`/api/resolve-google-news-article?url=${encodeURIComponent(articleUrl)}`)
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
      console.warn('Could not resolve Google News article; opening the original link without Google Translate:', error);
      articleTab.location.replace(articleUrl);
    });
}

// RENDER FILTER BAR (Grouped by region/country with headers and vertical bar separators)
function renderFilterBar() {
  const activeSources = ALL_SOURCES.filter(s => enabledSourceIds.has(s.id));
  filterBar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedFilterId === null ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}`;
  allBtn.textContent = `All (${activeSources.length})`;
  allBtn.onclick = () => {
    selectedFilterId = null;
    renderFilterBar();
    renderHeadlines();
  };
  filterBar.appendChild(allBtn);

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

    const label = document.createElement('span');
    label.className = 'text-[10px] font-extrabold text-sky-400 uppercase tracking-wider mr-1';
    label.textContent = country + ':';
    groupDiv.appendChild(label);

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
  headlineLanguageSelect.value = headlineLanguage;
  openArticleTranslatedToggle.checked = openArticlesTranslated;
  renderSourcesList();
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

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

      let langDesc = 'English';
      if (source.language === 'he') langDesc = 'Hebrew ➔ Translated to EN';
      if (source.language === 'ar') langDesc = 'Arabic ➔ Translated to EN';
      if (source.language === 'ja') langDesc = 'Japanese ➔ Translated to EN';
      if (source.language === 'zh') langDesc = 'Chinese ➔ Translated to EN';
      if (source.language === 'ru') langDesc = 'Russian ➔ Translated to EN';
      if (source.language === 'es') langDesc = 'Spanish ➔ Translated to EN';

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
  if (!dateStr) return Date.now();
  const cleaned = dateStr.replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/gi, '').trim();
  let parsed = Date.parse(cleaned);
  if (isNaN(parsed)) return Date.now();

  // Clamp future dates (server timestamp bugs like year 2026) to current time
  const now = Date.now();
  if (parsed > now) {
    parsed = now;
  }
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
