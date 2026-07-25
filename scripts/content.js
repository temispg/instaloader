// =============================================================
// Insta Saver — content script
// Detects Instagram menus (stories + feed posts/reels) by button
// TEXT, injects a download button, and uses Instagram's API
// (via the background script) to fetch the exact media.
// =============================================================

(function () {
  "use strict";

  const UI_STRINGS = {
    en: {
      buttonStory: "Download Story",
      buttonPostAll: "Download All Media",
      buttonPostCurrent: "Download Current",
      buttonPostSingle: "Download",
      buttonReel: "Download Reel",
      statusDownloading: "Downloading...",
      statusDownloadedSingle: "Downloaded \u2713",
      statusDownloadedMulti: (count, total) => `Downloaded ${count}/${total} \u2713`,
      statusFailedRetry: "Failed - retry",
      statusReelNotFound: "Reel not found!",
    },
    es: {
      buttonStory: "Descargar historia",
      buttonPostAll: "Descargar todo",
      buttonPostCurrent: "Descargar actual",
      buttonPostSingle: "Descargar",
      buttonReel: "Descargar reel",
      statusDownloading: "Descargando...",
      statusDownloadedSingle: "Descargado \u2713",
      statusDownloadedMulti: (count, total) => `Descargado ${count}/${total} \u2713`,
      statusFailedRetry: "Fallo - reintentar",
      statusReelNotFound: "No se encontro el reel",
    },
    pl: {
      buttonStory: "Pobierz relacje",
      buttonPostAll: "Pobierz wszystko",
      buttonPostCurrent: "Pobierz biezacy",
      buttonPostSingle: "Pobierz",
      buttonReel: "Pobierz rolkę",
      statusDownloading: "Pobieranie...",
      statusDownloadedSingle: "Pobrano \u2713",
      statusDownloadedMulti: (count, total) => `Pobrano ${count}/${total} \u2713`,
      statusFailedRetry: "Blad - sprobuj ponownie",
      statusReelNotFound: "Nie znaleziono rolki",
    },
    de: {
      buttonStory: "Story herunterladen",
      buttonPostAll: "Alle Medien herunterladen",
      buttonPostCurrent: "Aktuelles herunterladen",
      buttonPostSingle: "Herunterladen",
      buttonReel: "Reel herunterladen",
      statusDownloading: "Wird heruntergeladen...",
      statusDownloadedSingle: "Heruntergeladen \u2713",
      statusDownloadedMulti: (count, total) => `Heruntergeladen ${count}/${total} \u2713`,
      statusFailedRetry: "Fehlgeschlagen - erneut versuchen",
      statusReelNotFound: "Reel nicht gefunden",
    },
    uk: {
      buttonStory: "Завантажити історію",
      buttonPostAll: "Завантажити всі медіа",
      buttonPostCurrent: "Завантажити поточне",
      buttonPostSingle: "Завантажити",
      buttonReel: "Завантажити рілс",
      statusDownloading: "Завантаження...",
      statusDownloadedSingle: "Завантажено \u2713",
      statusDownloadedMulti: (count, total) => `Завантажено ${count}/${total} \u2713`,
      statusFailedRetry: "Помилка - спробуйте ще раз",
      statusReelNotFound: "Рілс не знайдено",
    },
    sv: {
      buttonStory: "Ladda ner story",
      buttonPostAll: "Ladda ner alla medier",
      buttonPostCurrent: "Ladda ner aktuell",
      buttonPostSingle: "Ladda ner",
      buttonReel: "Ladda ner reel",
      statusDownloading: "Laddar ner...",
      statusDownloadedSingle: "Nedladdad \u2713",
      statusDownloadedMulti: (count, total) => `Nedladdad ${count}/${total} \u2713`,
      statusFailedRetry: "Misslyckades - forsok igen",
      statusReelNotFound: "Reel hittades inte",
    },
    no: {
      buttonStory: "Last ned story",
      buttonPostAll: "Last ned alle medier",
      buttonPostCurrent: "Last ned gjeldende",
      buttonPostSingle: "Last ned",
      buttonReel: "Last ned reel",
      statusDownloading: "Laster ned...",
      statusDownloadedSingle: "Nedlastet \u2713",
      statusDownloadedMulti: (count, total) => `Nedlastet ${count}/${total} \u2713`,
      statusFailedRetry: "Mislyktes - prov igjen",
      statusReelNotFound: "Fant ikke reel",
    },
    nl: {
      buttonStory: "Story downloaden",
      buttonPostAll: "Alle media downloaden",
      buttonPostCurrent: "Huidige downloaden",
      buttonPostSingle: "Downloaden",
      buttonReel: "Reel downloaden",
      statusDownloading: "Downloaden...",
      statusDownloadedSingle: "Gedownload \u2713",
      statusDownloadedMulti: (count, total) => `Gedownload ${count}/${total} \u2713`,
      statusFailedRetry: "Mislukt - opnieuw proberen",
      statusReelNotFound: "Reel niet gevonden",
    },
    ru: {
      buttonStory: "Скачать историю",
      buttonPostAll: "Скачать все медиа",
      buttonPostCurrent: "Скачать текущее",
      buttonPostSingle: "Скачать",
      buttonReel: "Скачать рилс",
      statusDownloading: "Загрузка...",
      statusDownloadedSingle: "Загружено \u2713",
      statusDownloadedMulti: (count, total) => `Загружено ${count}/${total} \u2713`,
      statusFailedRetry: "Ошибка - попробуйте снова",
      statusReelNotFound: "Рилс не найден",
    },
    fr: {
      buttonStory: "Telecharger la story",
      buttonPostAll: "Telecharger tous les medias",
      buttonPostCurrent: "Telecharger l'actuel",
      buttonPostSingle: "Telecharger",
      buttonReel: "Telecharger le reel",
      statusDownloading: "Telechargement...",
      statusDownloadedSingle: "Telecharge \u2713",
      statusDownloadedMulti: (count, total) => `Telecharge ${count}/${total} \u2713`,
      statusFailedRetry: "Echec - reessayer",
      statusReelNotFound: "Reel introuvable",
    },
    ptbr: {
      buttonStory: "Baixar story",
      buttonPostAll: "Baixar toda a midia",
      buttonPostCurrent: "Baixar atual",
      buttonPostSingle: "Baixar",
      buttonReel: "Baixar reel",
      statusDownloading: "Baixando...",
      statusDownloadedSingle: "Baixado \u2713",
      statusDownloadedMulti: (count, total) => `Baixado ${count}/${total} \u2713`,
      statusFailedRetry: "Falhou - tente novamente",
      statusReelNotFound: "Reel nao encontrado",
    },
    ja: {
      buttonStory: "ストーリーをダウンロード",
      buttonPostAll: "すべてをダウンロード",
      buttonPostCurrent: "現在の項目をダウンロード",
      buttonPostSingle: "ダウンロード",
      buttonReel: "リールをダウンロード",
      statusDownloading: "ダウンロード中...",
      statusDownloadedSingle: "ダウンロード済み \u2713",
      statusDownloadedMulti: (count, total) => `ダウンロード済み ${count}/${total} \u2713`,
      statusFailedRetry: "失敗 - 再試行",
      statusReelNotFound: "リールが見つかりません",
    },
    zhcn: {
      buttonStory: "下载快拍",
      buttonPostAll: "下载全部媒体",
      buttonPostCurrent: "下载当前内容",
      buttonPostSingle: "下载",
      buttonReel: "下载 Reels",
      statusDownloading: "正在下载...",
      statusDownloadedSingle: "已下载 \u2713",
      statusDownloadedMulti: (count, total) => `已下载 ${count}/${total} \u2713`,
      statusFailedRetry: "失败 - 重试",
      statusReelNotFound: "未找到 Reels",
    },
  };

  const CANCEL_MARKER_TEXTS = [
    "cancel",
    "cancelar",
    "anuluj",
    "abbrechen",
    "скасувати",
    "avbryt",
    "annuleren",
    "отмена",
    "annuler",
    "キャンセル",
    "取消",
  ];

  // Texts that appear in story menus
  const STORY_MARKER_TEXTS = [
    "report inappropriate",
    "report",
    "about this account",
    "reportar contenido inapropiado",
    "reportar",
    "informacion sobre esta cuenta",
    "zglos niestosowny post",
    "zglos",
    "informacje o tym koncie",
    "als unangemessen melden",
    "melden",
    "infos zu diesem konto",
    "поскаржитися на неприйнятні матеріали",
    "поскаржитися",
    "про цей обліковий запис",
    "anmal olampligt innehall",
    "anmal",
    "om det har kontot",
    "rapporter som upassende",
    "rapporter",
    "om denne kontoen",
    "rapporteren als ongepast",
    "rapporteren",
    "over dit account",
    "пожаловаться на неуместный контент",
    "пожаловаться",
    "об аккаунте",
    "signaler comme inapproprie",
    "signaler",
    "a propos de ce compte",
    "denunciar conteudo inadequado",
    "denunciar",
    "sobre essa conta",
    "不適切な投稿を報告",
    "報告する",
    "このアカウントについて",
    "举报不当内容",
    "举报",
    "账户简介",
  ];

  // Texts that appear in feed post/reel menus
  const POST_MARKER_TEXTS = [
    "report",
    "go to post",
    "about this account",
    "not interested",
    "share to",
    "copy link",
    "embed",
    "unfollow",
    "add to favorites",
    "remove from favorites",
    "reportar",
    "deja de seguir",
    "agregar a favoritos",
    "ir a la publicacion",
    "compartir en",
    "copiar enlace",
    "insertar",
    "informacion sobre esta cuenta",
    "cancelar",
    "zglos",
    "przestan obserwowac",
    "dodaj do ulubionych",
    "przejdz do posta",
    "udostepnij",
    "kopiuj link",
    "kod osadzania",
    "informacje o tym koncie",
    "anuluj",
    "melden",
    "nicht mehr folgen",
    "zu favoriten hinzufugen",
    "beitrag ansehen",
    "teilen in",
    "link kopieren",
    "einbetten",
    "infos zu diesem konto",
    "abbrechen",
    "поскаржитися",
    "не стежити",
    "додати у вибране",
    "перейти до допису",
    "поширити в",
    "копіювати посилання",
    "вставити",
    "про цей обліковий запис",
    "скасувати",
    "anmal",
    "sluta folja",
    "lagg till i favoriter",
    "ga till inlagget",
    "dela pa",
    "kopiera lanken",
    "badda in",
    "om det har kontot",
    "avbryt",
    "rapporter",
    "slutt a folge",
    "legg til i favoritter",
    "ga til innlegg",
    "del her",
    "kopier lenke",
    "bygg inn",
    "om denne kontoen",
    "rapporteren",
    "niet meer volgen",
    "toevoegen aan favorieten",
    "naar bericht gaan",
    "delen via",
    "link kopieren",
    "insluiten",
    "over dit account",
    "annuleren",
    "пожаловаться",
    "отменить подписку",
    "добавить в избранное",
    "перейти к публикации",
    "поделиться",
    "копировать ссылку",
    "вставить на сайт",
    "об аккаунте",
    "отмена",
    "signaler",
    "ne plus suivre",
    "ajouter aux favoris",
    "acceder a la publication",
    "partager sur",
    "copier le lien",
    "integrer",
    "a propos de ce compte",
    "annuler",
    "denunciar",
    "deixar de seguir",
    "adicionar aos favoritos",
    "ir para o post",
    "compartilhar",
    "copiar link",
    "incorporar",
    "sobre essa conta",
    "報告する",
    "フォローをやめる",
    "お気に入りに追加",
    "投稿へ移動",
    "シェア先",
    "リンクをコピー",
    "埋め込み",
    "このアカウントについて",
    "キャンセル",
    "举报",
    "取关",
    "加入特别关注",
    "打开帖子",
    "分享到",
    "复制链接",
    "内嵌",
    "账户简介",
    "取消",
  ];

  const REEL_REPORT_MARKER_TEXTS = [
    "report",
    "reportar",
    "report inappropriate",
    "reportar contenido inapropiado",
    "zglos niestosowny post",
    "zglos",
    "als unangemessen melden",
    "melden",
    "поскаржитися на неприйнятні матеріали",
    "поскаржитися",
    "anmal olampligt innehall",
    "anmal",
    "rapporter som upassende",
    "rapporter",
    "rapporteren als ongepast",
    "rapporteren",
    "пожаловаться на неуместный контент",
    "пожаловаться",
    "signaler comme inapproprie",
    "signaler",
    "denunciar conteudo inadequado",
    "denunciar",
    "不適切な投稿を報告",
    "報告する",
    "举报不当内容",
    "举报",
  ];

  const REEL_GOTO_POST_MARKER_TEXTS = [
    "go to post",
    "ir a la publicacion",
    "przejdz do posta",
    "beitrag ansehen",
    "перейти до допису",
    "ga till inlagget",
    "ga til innlegg",
    "naar bericht gaan",
    "перейти к публикации",
    "acceder a la publication",
    "ir para o post",
    "投稿へ移動",
    "打开帖子",
  ];
  const REEL_COPY_LINK_MARKER_TEXTS = [
    "copy link",
    "copiar enlace",
    "kopiuj link",
    "link kopieren",
    "копіювати посилання",
    "kopiera lanken",
    "kopier lenke",
    "link kopieren",
    "копировать ссылку",
    "copier le lien",
    "copiar link",
    "リンクをコピー",
    "复制链接",
  ];

  // Menu items that ONLY appear in post menus (never in reel menus).
  // "Embed" is definitively post-exclusive — reels cannot be embedded.
  // Used to disambiguate on feed / For You pages where the URL lacks /p/.
  const POST_EXCLUSIVE_MARKER_TEXTS = [
    "embed",
    "insertar",
    "kod osadzania",
    "einbetten",
    "вставити",
    "badda in",
    "bygg inn",
    "insluiten",
    "вставить на сайт",
    "integrer",
    "incorporar",
    "埋め込み",
    "内嵌",
  ];

  function normalizeMenuText(text) {
    return (text || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/…/g, "...");
  }

  function getUiLang() {
    const htmlLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (htmlLang.startsWith("es")) return "es";
    if (htmlLang.startsWith("pl")) return "pl";
    if (htmlLang.startsWith("de")) return "de";
    if (htmlLang.startsWith("uk")) return "uk";
    if (htmlLang.startsWith("sv")) return "sv";
    if (htmlLang.startsWith("nb") || htmlLang.startsWith("nn") || htmlLang.startsWith("no")) return "no";
    if (htmlLang.startsWith("nl")) return "nl";
    if (htmlLang.startsWith("ru")) return "ru";
    if (htmlLang.startsWith("fr")) return "fr";
    if (htmlLang.startsWith("pt-br")) return "ptbr";
    if (htmlLang.startsWith("pt")) return "ptbr";
    if (htmlLang.startsWith("ja")) return "ja";
    if (htmlLang.startsWith("zh-cn") || htmlLang.startsWith("zh-hans") || htmlLang.startsWith("zh-sg") || htmlLang.startsWith("zh")) return "zhcn";

    return "en";
  }

  function t(key, ...args) {
    const dict = UI_STRINGS[getUiLang()] || UI_STRINGS.en;
    const value = dict[key] || UI_STRINGS.en[key] || key;
    return typeof value === "function" ? value(...args) : value;
  }

  // ---------------------------------------------------------------
  // 1. Parse info from the current URL / page context
  // ---------------------------------------------------------------

  function getStoryInfo() {
    // URL format: /stories/USERNAME/STORY_PK/
    const match = window.location.pathname.match(/\/stories\/([^\/]+)(?:\/(\d+))?/);
    if (!match) return null;
    return {
      username: match[1],
      storyId: match[2] || "",
    };
  }

  function getPostShortcode() {
    // Check URL first: /p/SHORTCODE/ or /reel/SHORTCODE/
    const urlMatch = window.location.pathname.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];

    // If on feed/explore, find the shortcode from the closest visible post link
    // Look for <a> tags with /p/ or /reel/ href near the menu
    return null;
  }

  function findPostShortcodeFromMenu(menuContainer) {
    // When a post menu opens on the feed, the post's <article> or link
    // with /p/SHORTCODE/ should be in the DOM. Try URL first.
    const fromUrl = getPostShortcode();
    if (fromUrl) return fromUrl;

    // For feed pages, find the most recently focused/visible post.
    // Look for <a> elements with /p/ or /reel/ hrefs that are visible.
    const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
    let bestLink = null;
    let bestTop = Infinity;
    const viewportCenter = window.innerHeight / 2;

    for (const link of links) {
      const rect = link.getBoundingClientRect();
      // Find the link closest to the center of the viewport
      const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (dist < bestTop) {
        bestTop = dist;
        bestLink = link;
      }
    }

    if (bestLink) {
      const match = bestLink.getAttribute("href").match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (match) return match[1];
    }

    return null;
  }

  function findReelShortcodeFromMenu(menuContainer) {
    // Reel menus contain an <a> "Go to post" with href="/reel/SHORTCODE/"
    const links = menuContainer.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    for (const link of links) {
      const m = link.getAttribute("href").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
    // Fallback: the URL changes with each reel in the feed
    const urlMatch = window.location.pathname.match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    return null;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }

  // ---------------------------------------------------------------
  // 2. Download via background script (API-based)
  // ---------------------------------------------------------------

  function sendMessage(payload) {
    return new Promise((resolve) => {
      try {
        if (!chrome.runtime || !chrome.runtime.id) {
          console.warn("[Insta Saver] Extension context not available.");
          return resolve({ success: false, error: "Extension context lost" });
        }
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[Insta Saver] sendMessage:", chrome.runtime.lastError.message);
            return resolve({ success: false, error: chrome.runtime.lastError.message });
          }
          resolve(response || { success: false });
        });
      } catch (err) {
        console.warn("[Insta Saver] sendMessage threw:", err);
        resolve({ success: false, error: err.message });
      }
    });
  }

  function downloadCurrentStory() {
    const info = getStoryInfo();
    if (!info) {
      return Promise.resolve({ success: false, error: "Not on a story page" });
    }
    return sendMessage({
      action: "downloadStory",
      username: info.username,
      storyId: info.storyId,
      csrftoken: getCsrfToken(),
    });
  }

  function downloadPost(shortcode, type = "post") {
    if (!shortcode) {
      return Promise.resolve({ success: false, error: "Could not find post" });
    }
    return sendMessage({
      action: "downloadPost",
      shortcode: shortcode,
      type: type,
      csrftoken: getCsrfToken(),
    });
  }

  function downloadPostSingle(shortcode, index, type = "post") {
    if (!shortcode) {
      return Promise.resolve({ success: false, error: "Could not find post" });
    }
    return sendMessage({
      action: "downloadPostSingle",
      shortcode: shortcode,
      index: index,
      type: type,
      csrftoken: getCsrfToken(),
    });
  }

  function findBestVisibleArticle() {
    const articles = document.querySelectorAll("article");
    let bestArticle = null;
    let bestDist = Infinity;
    const yCentre = window.innerHeight / 2;

    for (const article of articles) {
      const rect = article.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - yCentre);
      if (dist < bestDist) {
        bestDist = dist;
        bestArticle = article;
      }
    }

    return bestArticle;
  }

  function detectCarouselDotsCount(article) {
    if (!article) return 0;

    const allDivs = article.querySelectorAll("div");
    for (const container of allDivs) {
      const kids = Array.from(container.children);
      if (kids.length < 2 || kids.length > 20) continue;

      let allSmall = true;
      for (const kid of kids) {
        const rect = kid.getBoundingClientRect();
        if (rect.width > 14 || rect.height > 14 || rect.width < 2) {
          allSmall = false;
          break;
        }
      }
      if (!allSmall) continue;

      const classMap = {};
      for (const kid of kids) {
        const className = kid.className;
        classMap[className] = (classMap[className] || 0) + 1;
      }

      const entries = Object.entries(classMap);
      if (entries.length !== 2) continue;

      const hasSingleActiveClass = entries.some(([, count]) => count === 1);
      if (hasSingleActiveClass) return kids.length;
    }

    return 0;
  }

  // Fallback carousel detection: count <li> slide elements that have
  // translateX transforms AND contain media (img/video) inside a <ul>.
  // Instagram carousels use this specific structure; plain grids don't.
  function detectCarouselFromList(root) {
    if (!root) return 0;
    const uls = root.querySelectorAll("ul");
    for (const ul of uls) {
      const lis = Array.from(ul.querySelectorAll(":scope > li"));
      if (lis.length < 2) continue;

      let mediaCount = 0;
      for (const li of lis) {
        // Only count <li>'s that use translateX (carousel slide positioning)
        const transform = li.style.transform || "";
        const hasTranslate = /translateX\(/.test(transform);
        if (hasTranslate && li.querySelector("img, video")) {
          mediaCount++;
        }
      }

      if (mediaCount >= 2) return mediaCount;
    }
    return 0;
  }

  // Detect carousel from the presence of prev OR next navigation buttons.
  // Instagram may only render the "Next" button on the first slide and only
  // "Go back" on subsequent slides, so either one alone confirms a carousel.
  function detectCarouselFromButtons(root) {
    if (!root) return false;
    const buttons = root.querySelectorAll('button[aria-label]');
    let hasNext = false;
    let hasPrev = false;
    for (const btn of buttons) {
      const label = btn.getAttribute("aria-label").toLowerCase();
      if (label === "next" || label === "go forward") hasNext = true;
      if (label === "go back" || label === "previous") hasPrev = true;
    }
    return hasNext || hasPrev;
  }

  function getPostMediaCount() {
    const article = findBestVisibleArticle();

    // Strategy 1: dot indicators inside the article
    const dotsCount = detectCarouselDotsCount(article);
    if (dotsCount > 1) return dotsCount;

    // Strategy 2: count <li> slides with translateX inside the article
    const articleSlides = detectCarouselFromList(article);
    if (articleSlides > 1) return articleSlides;

    // Strategy 3: carousel nav buttons inside the article
    if (article && detectCarouselFromButtons(article)) return 2;

    // Strategy 4: document-wide scan ONLY when no <article> exists
    // (e.g., on dedicated /p/SHORTCODE/ pages)
    if (!article) {
      const docSlides = detectCarouselFromList(document);
      if (docSlides > 1) return docSlides;

      if (detectCarouselFromButtons(document)) return 2;
    }

    return 1;
  }

  // Detect which carousel slide is currently active (0-based index).
  // Uses multiple strategies depending on context.
  function getCarouselIndex() {
    // Strategy 1: URL param (works on post pages opened from profile)
    const params = new URLSearchParams(window.location.search);
    const imgIndex = params.get("img_index");
    if (imgIndex) return Math.max(0, parseInt(imgIndex, 10) - 1);

    // Strategy 2: dot indicators in the feed / FYP
    const bestArticle = findBestVisibleArticle();
    const dotIndex = getCarouselIndexFromDots(bestArticle);
    if (dotIndex !== null) return dotIndex;

    // Strategy 3: <li> transform-based detection
    // The visible slide is the one with translateX closest to 0.
    const searchRoot = bestArticle || document;
    const liIndex = getCarouselIndexFromTransforms(searchRoot);
    if (liIndex !== null) return liIndex;

    return 0;
  }

  // Detect active carousel index from dot indicators (original strategy)
  function getCarouselIndexFromDots(root) {
    if (!root) return null;

    const allDivs = root.querySelectorAll("div");
    for (const container of allDivs) {
      const kids = Array.from(container.children);
      if (kids.length < 2 || kids.length > 20) continue;

      let allSmall = true;
      for (const kid of kids) {
        const kr = kid.getBoundingClientRect();
        if (kr.width > 14 || kr.height > 14 || kr.width < 2) {
          allSmall = false;
          break;
        }
      }
      if (!allSmall) continue;

      const classMap = {};
      for (const kid of kids) {
        const cn = kid.className;
        classMap[cn] = (classMap[cn] || 0) + 1;
      }

      const entries = Object.entries(classMap);
      if (entries.length !== 2) continue;

      let activeClass = null;
      for (const [cn, count] of entries) {
        if (count === 1) { activeClass = cn; break; }
      }
      if (!activeClass) continue;

      for (let i = 0; i < kids.length; i++) {
        if (kids[i].className === activeClass) return i;
      }
    }

    return null;
  }

  // Detect active carousel index from <li> translateX transforms.
  // The currently visible slide has translateX closest to 0.
  function getCarouselIndexFromTransforms(root) {
    if (!root) return null;
    const uls = root.querySelectorAll("ul");
    for (const ul of uls) {
      const lis = Array.from(ul.querySelectorAll(":scope > li"));
      if (lis.length < 2) continue;

      // Filter <li> elements that contain actual media
      const mediaLis = lis.filter(li => li.querySelector("img, video"));
      if (mediaLis.length < 2) continue;

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < mediaLis.length; i++) {
        const transform = mediaLis[i].style.transform;
        const m = transform && transform.match(/translateX\(([^)]+)px\)/);
        if (m) {
          const dist = Math.abs(parseFloat(m[1]));
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
      }
      return bestIdx;
    }
    return null;
  }

  // ---------------------------------------------------------------
  // 3. Menu Detection & Injection
  // ---------------------------------------------------------------

  function classifyMenu(node) {
    // Returns { type: "story"|"post"|"reel", el } or null
    if (!(node instanceof HTMLElement)) return null;

    const candidates = [node, ...node.querySelectorAll("div")];

    for (const el of candidates) {
      // Gather ALL clickable menu items: <button>, [role="button"], [role="link"]
      // Instagram now uses <div role="button"> instead of <button> for most menus.
      const items = el.querySelectorAll(
        ':scope > button, :scope > [role="button"], :scope > [role="link"]'
      );
      if (items.length < 2) continue;

      const texts = Array.from(items).map((item) =>
        normalizeMenuText(item.textContent)
      );

      const hasCancel = texts.some((t) => CANCEL_MARKER_TEXTS.includes(t));

      // --- Story / Post detection (menus with a Cancel item) ---
      if (hasCancel) {
        const isStory = texts.some((t) =>
          STORY_MARKER_TEXTS.some((m) => t.includes(m))
        );
        const isPost = texts.some((t) =>
          POST_MARKER_TEXTS.some((m) => t.includes(m))
        );
        if (isStory && getStoryInfo()) return { type: "story", el };
        if (isPost) return { type: "post", el };
        if (isStory) return { type: "story", el };
      }

      // --- URL-based post detection (fallback when Cancel is absent) ---
      const urlPath = window.location.pathname;
      const isPostUrl = /\/p\/[A-Za-z0-9_-]+/.test(urlPath);
      const isReelUrl = /\/reel[s]?\/[A-Za-z0-9_-]+/.test(urlPath);

      if (isPostUrl) {
        const hasPostMarkers = texts.some((t) =>
          POST_MARKER_TEXTS.some((m) => t.includes(m))
        );
        if (hasPostMarkers) return { type: "post", el };
      }

      // --- Reel detection (role-based menus without Cancel) ---
      if (items.length >= 3) {
        const hasReport = texts.some((t) =>
          REEL_REPORT_MARKER_TEXTS.some((m) => t.includes(m))
        );
        const hasGoToPost = texts.some((t) =>
          REEL_GOTO_POST_MARKER_TEXTS.some((m) => t.includes(m))
        );
        const hasCopyLink = texts.some((t) =>
          REEL_COPY_LINK_MARKER_TEXTS.some((m) => t.includes(m))
        );
        if (hasReport && (hasGoToPost || hasCopyLink)) {
          // Disambiguate: if URL says /p/ it's a post, not a reel
          if (isPostUrl) return { type: "post", el };

          // On a dedicated /reel/SHORTCODE/ page the content is always a
          // reel, regardless of DOM structure (Instagram may wrap it in
          // <article>) or menu text variations.
          if (isReelUrl) return { type: "reel", el };

          // Post-exclusive menu items ("Embed" and translations) never
          // appear in reel menus — their presence confirms a post.
          const hasPostExclusive = texts.some((t) =>
            POST_EXCLUSIVE_MARKER_TEXTS.some((m) => t.includes(m))
          );
          if (hasPostExclusive) return { type: "post", el };

          // On feed / For You pages the URL has no /p/ shortcode, but posts
          // are always rendered inside an <article> element.  The full-screen
          // reel player does NOT use <article>, so this reliably separates
          // inline feed posts from reels.
          if (el.closest("article")) return { type: "post", el };

          return { type: "reel", el };
        }
      }
    }
    return null;
  }

  function injectButton(menuContainer, type) {
    if (menuContainer.querySelector(`[data-insta-saver]`)) return;

    if (type === "reel") {
      // Reel menus use div[role="button"] items — different injection path
      injectReelButton(menuContainer);
      return;
    }

    // Find menu items: both <button> and role-based elements
    const items = menuContainer.querySelectorAll(
      ':scope > button, :scope > [role="button"], :scope > [role="link"]'
    );
    if (items.length === 0) return;

    let cancelItem = null;
    for (const item of items) {
      if (CANCEL_MARKER_TEXTS.includes(normalizeMenuText(item.textContent))) {
        cancelItem = item;
        break;
      }
    }

    const template = cancelItem || items[0];
    // Reference node for insertion: Cancel button, or last item as fallback
    const refNode = cancelItem || items[items.length - 1];

    if (type === "story") {
      // Single button for stories
      const dlBtn = createDownloadBtn(template, t("buttonStory"), () => {
        if (!getStoryInfo()) return Promise.resolve({ success: false, error: "Not a story page" });
        return downloadCurrentStory();
      });
      insertBefore(menuContainer, dlBtn, refNode);
    } else {
      // Two buttons for posts: "Download Current" and "Download All Media"
      const currentBtn = createDownloadBtn(template, t("buttonPostCurrent"), () => {
        const shortcode = findPostShortcodeFromMenu(menuContainer);
        if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
        const idx = getCarouselIndex();
        return downloadPostSingle(shortcode, idx, "post");
      });

      const mediaCount = getPostMediaCount();
      console.log("[Insta Saver] Detected media count for post:", mediaCount);
      if (mediaCount <= 1) {
        const singleBtn = createDownloadBtn(template, t("buttonPostSingle"), () => {
          const shortcode = findPostShortcodeFromMenu(menuContainer);
          if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
          const idx = getCarouselIndex();
          return downloadPostSingle(shortcode, idx, "post");
        });
        insertBefore(menuContainer, singleBtn, refNode);
        return;
      }

      const allBtn = createDownloadBtn(template, t("buttonPostAll"), () => {
        const shortcode = findPostShortcodeFromMenu(menuContainer);
        if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
        return downloadPost(shortcode, "post");
      });

      // Insert both before reference node (current first, then all)
      insertBefore(menuContainer, allBtn, refNode);
      insertBefore(menuContainer, currentBtn, allBtn);
    }
  }

  function injectReelButton(menuContainer) {
    // Find a role="button" div to use as template
    const templateItem = menuContainer.querySelector('[role="button"]');
    if (!templateItem) return;

    const dlBtn = templateItem.cloneNode(true);
    dlBtn.setAttribute("data-insta-saver", "true");

    // Set the text in the deeply nested span
    setNestedText(dlBtn, t("buttonReel"));
    styleReelButton(dlBtn, "#00c853");

    dlBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      setNestedText(dlBtn, t("statusDownloading"));

      const shortcode = findReelShortcodeFromMenu(menuContainer);
      if (!shortcode) {
        setNestedText(dlBtn, t("statusReelNotFound"));
        styleReelButton(dlBtn, "#ff5252");
        setTimeout(() => {
          setNestedText(dlBtn, t("buttonReel"));
          styleReelButton(dlBtn, "#00c853");
        }, 2500);
        return;
      }

      downloadPost(shortcode, "reel").then((response) => {
        if (response && response.success) {
          setNestedText(dlBtn, t("statusDownloadedSingle"));
          styleReelButton(dlBtn, "#00c853");
        } else {
          const err = (response && response.error) || "Unknown error";
          console.warn("[Insta Saver] Reel download failed:", err);
          setNestedText(dlBtn, t("statusFailedRetry"));
          styleReelButton(dlBtn, "#ff5252");
        }
        setTimeout(() => {
          setNestedText(dlBtn, t("buttonReel"));
          styleReelButton(dlBtn, "#00c853");
        }, 2500);
      });
    });

    // Insert before the last item ("About this account")
    const items = menuContainer.querySelectorAll(
      ':scope > [role="button"], :scope > [role="link"]'
    );
    const lastItem = items[items.length - 1];
    if (lastItem) {
      menuContainer.insertBefore(dlBtn, lastItem);
    } else {
      menuContainer.appendChild(dlBtn);
    }
  }

  function setNestedText(el, text) {
    // Reel menu items have deeply nested spans; find the innermost text span
    const spans = el.querySelectorAll("span");
    for (let i = spans.length - 1; i >= 0; i--) {
      if (spans[i].children.length === 0 && spans[i].textContent.trim()) {
        spans[i].textContent = text;
        return;
      }
    }
    // Fallback: first leaf span
    for (const span of spans) {
      if (span.children.length === 0) {
        span.textContent = text;
        return;
      }
    }
  }

  function styleReelButton(el, color) {
    const spans = el.querySelectorAll("span");
    for (const span of spans) {
      span.style.color = color;
      span.style.fontWeight = "600";
    }
  }

  // Set the visible label on a download button, handling both plain <button>
  // elements (textContent) and role-based <div> items with nested spans.
  function setButtonLabel(el, text) {
    const spans = el.querySelectorAll("span");
    if (spans.length > 0) {
      setNestedText(el, text);
    } else {
      el.textContent = text;
    }
  }

  // Apply color styling to a download button and any nested spans.
  function setButtonColor(el, color) {
    el.style.color = color;
    el.style.fontWeight = "600";
    const spans = el.querySelectorAll("span");
    for (const span of spans) {
      span.style.color = color;
      span.style.fontWeight = "600";
    }
  }

  function createDownloadBtn(template, label, downloadFn) {
    const dlBtn = template.cloneNode(true);
    dlBtn.setAttribute("data-insta-saver", "true");
    dlBtn.setAttribute("tabindex", "0");

    setButtonLabel(dlBtn, label);
    setButtonColor(dlBtn, "#00c853");

    dlBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      setButtonLabel(dlBtn, t("statusDownloading"));

      downloadFn().then((response) => {
        if (response && response.success) {
          const count = response.downloaded || 1;
          const total = response.total || 1;
          const successText = total > 1
            ? t("statusDownloadedMulti", count, total)
            : t("statusDownloadedSingle");
          setButtonLabel(dlBtn, successText);
          setButtonColor(dlBtn, "#00c853");
        } else {
          const err = (response && response.error) || "Unknown error";
          console.warn("[Insta Saver] Download failed:", err);
          setButtonLabel(dlBtn, t("statusFailedRetry"));
          setButtonColor(dlBtn, "#ff5252");
        }
        setTimeout(() => {
          setButtonLabel(dlBtn, label);
          setButtonColor(dlBtn, "#00c853");
        }, 2500);
      });
    });

    return dlBtn;
  }

  function insertBefore(container, newNode, refNode) {
    if (refNode) {
      container.insertBefore(newNode, refNode);
    } else {
      container.appendChild(newNode);
    }
  }

  // ---------------------------------------------------------------
  // 4. MutationObserver — start when body is available
  // ---------------------------------------------------------------

  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const result = classifyMenu(node);
          if (result) injectButton(result.el, result.type);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log("[Insta Saver] Content script loaded — stories + posts.");
  }

  if (document.body) {
    setupObserver();
  } else {
    document.addEventListener("DOMContentLoaded", setupObserver);
  }
})();
