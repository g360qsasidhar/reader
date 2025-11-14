// SNQR Research Reader - Core Loader (Redirect + Metadata + Mobile Optimisation)

// Global reading direction (false = LTR, true = RTL)
var isRTL = false;

// Current PDF context
var currentPdf = null;
var currentPdfId = null;

// Configuration
var PDF_BASE_PATH  = './reader/';                 // default local PDF folder
var SNQR_META_PATH = './data/reader-index.json';  // metadata JSON (optional)
var SNQR_REDIRECT  = 'https://www.snqrglobal.com';
var SNQR_IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Metadata cache
var SNQR_META_CACHE = null;

// -----------------------------------------------------
// Metadata loader: { title, pages, readerUrl, pdfPath, backUrl }
// -----------------------------------------------------
function fetchSnqrMeta(docId) {
    if (!docId) return Promise.resolve(null);

    if (SNQR_META_CACHE) {
        return Promise.resolve(SNQR_META_CACHE[docId] || null);
    }

    return fetch(SNQR_META_PATH)
        .then(function (resp) {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.json();
        })
        .then(function (data) {
            SNQR_META_CACHE = data || {};
            return SNQR_META_CACHE[docId] || null;
        })
        .catch(function (err) {
            console.warn('SNQR metadata JSON load failed:', err);
            return null;
        });
}

// -----------------------------------------------------
// Back button
// -----------------------------------------------------
function setupBackButton(backUrl) {
    var btn = document.getElementById('backButton');
    if (!btn) return;

    if (backUrl && backUrl.trim() !== '') {
        btn.href = backUrl;
    } else {
        btn.href = 'https://www.snqrglobal.com/research';
    }
}

// -----------------------------------------------------
// Flipbook loader (DearFlip / dFlip)
// -----------------------------------------------------
function loadFlipbook(pdfUrl, rtlMode, page, pdfId) {
    if (!pdfUrl || pdfUrl.trim() === '') {
        console.error('Invalid PDF URL provided to loadFlipbook');
        var container = document.getElementById('flipbookContainer');
        if (container) {
            container.innerHTML =
                '<div style="color: red; padding: 20px; text-align: center;">Invalid PDF URL.</div>';
        }
        return;
    }

    // DearFlip constants (with safe fallbacks)
    var D = window.DFLIP || {};
    var PAGE_MODE = D.PAGE_MODE || {};
    var SINGLE_PAGE_MODE = D.SINGLE_PAGE_MODE || {};

    var pageModeAuto   = PAGE_MODE.AUTO   !== undefined ? PAGE_MODE.AUTO   : 0;
    var pageModeSingle = PAGE_MODE.SINGLE !== undefined ? PAGE_MODE.SINGLE : 1;
    var singlePageAuto = SINGLE_PAGE_MODE.AUTO !== undefined ? SINGLE_PAGE_MODE.AUTO : 0;

    var options = {
        height: '100%',
        backgroundColor: '#2F2D2F',

        duration: 700,
        direction: rtlMode ? 2 : 1, // 1 = LTR, 2 = RTL

        // 3D / WebGL:
        //   desktop => ON (original solid style),
        //   mobile  => OFF (faster, lighter).
        webgl: !SNQR_IS_MOBILE,
        webglShadow: !SNQR_IS_MOBILE,
        soundEnable: !SNQR_IS_MOBILE,

        // Panels / controls
        autoEnableOutline: false,
        autoEnableThumbnail: false,
        overwritePDFOutline: false,
        showDownloadControl: false,
        showPrintControl: false,
        showSearchControl: true,

        // Page mode: single page on mobile, automatic on desktop
        pageMode: SNQR_IS_MOBILE ? pageModeSingle : pageModeAuto,
        singlePageMode: singlePageAuto,

        maxTextureSize: SNQR_IS_MOBILE ? 1400 : 1800,
        minTextureSize: 256,
        rangeChunkSize: 524288, // 512 KB chunks
        zoomRatio: SNQR_IS_MOBILE ? 1.2 : 1.5,
        forceFit: true,
        transparent: false,
        hard: 'none',

        scrollWheel: true,

        zoomChange: function (isZoomed) {
            document.body.style.overflow = isZoomed ? 'hidden' : 'auto';
        },

        openPage: (typeof page === 'number' && page > 0) ? page : 1,
        pdfId: pdfId || pdfUrl,

        onReady: function (book) {
            if (book && typeof book.pageCount !== 'undefined') {
                console.log('PDF loaded: ' + book.pageCount + ' pages');
            } else {
                console.log('PDF loaded.');
            }
        }
    };

    var flipContainer = $('#flipbookContainer');
    flipContainer.empty();

    try {
        flipContainer.flipBook(pdfUrl, options);
    } catch (err) {
        console.error('Error initializing flipbook:', err);
        flipContainer.html(
            '<div style="color: red; padding: 20px; text-align: center;">' +
            'Error loading PDF. Please check the console for details.' +
            '</div>'
        );
        return;
    }

    updatePdfContext(pdfUrl, pdfId);
}

// -----------------------------------------------------
// PDF context & side-panel info
// -----------------------------------------------------
function updatePdfContext(pdfUrl, pdfId) {
    currentPdf   = pdfUrl;
    currentPdfId = pdfId || pdfUrl;

    window.currentPdf   = currentPdf;
    window.currentPdfId = currentPdfId;

    var displayName = '';
    try {
        var urlObj = new URL(pdfUrl, window.location.origin);
        var path   = urlObj.pathname || '';
        var parts  = path.split('/');
        var last   = parts[parts.length - 1] || '';
        displayName = last || urlObj.hostname;
    } catch (e) {
        displayName = pdfUrl.substring(0, 64);
    }

    updatePdfInfoDisplay(displayName);
}

function updatePdfInfoDisplay(pdfName) {
    var infoNodes = document.querySelectorAll('[data-pdf-info]');
    if (!infoNodes || infoNodes.length === 0) return;

    infoNodes.forEach(function (el) {
        if (pdfName) {
            el.textContent = pdfName;
            el.style.display = 'inline';
        } else {
            el.textContent = '';
            el.style.display = 'none';
        }
    });
}

// -----------------------------------------------------
// Bootstrap – enforce ?doc= and load corresponding PDF
// -----------------------------------------------------
$(document).ready(function () {
    var params   = new URLSearchParams(window.location.search);
    var docParam = params.get('doc');           // SNQR ID
    var pageParam = parseInt(params.get('page'), 10);

    // No ?doc= => send user back to main SNQR site
    if (!docParam || !docParam.trim()) {
        window.location.href = SNQR_REDIRECT;
        return;
    }

    var pdfId = docParam.trim();

    // Load metadata (optional)
    fetchSnqrMeta(pdfId).then(function (meta) {
        var pdfUrl;

        if (meta && meta.pdfPath && meta.pdfPath.trim() !== '') {
            pdfUrl = meta.pdfPath;
        } else {
            pdfUrl = PDF_BASE_PATH + pdfId + '.pdf';
        }

        if (meta && meta.backUrl) {
            setupBackButton(meta.backUrl);
        } else {
            setupBackButton('https://www.snqrglobal.com/research');
        }

        currentPdf   = pdfUrl;
        currentPdfId = pdfId;
        window.currentPdf   = currentPdf;
        window.currentPdfId = currentPdfId;

        var storedPageLabelEl = document.getElementById('storedPage');

        function setStoredPageLabel(value) {
            if (!storedPageLabelEl) return;
            storedPageLabelEl.textContent =
                (value !== undefined && value !== null && value !== '') ? value : 'N/A';
        }

        // Explicit ?page= overrides everything
        if (!isNaN(pageParam) && pageParam > 0) {
            setStoredPageLabel('N/A');
            loadFlipbook(pdfUrl, isRTL, pageParam, pdfId);
            return;
        }

        // Otherwise use page memory if available
        if (window.getLastPage) {
            window.getLastPage(pdfId)
                .then(function (storedPage) {
                    var startPage = storedPage || 1;
                    setStoredPageLabel(storedPage || 'N/A');
                    loadFlipbook(pdfUrl, isRTL, startPage, pdfId);
                })
                .catch(function (err) {
                    console.warn('getLastPage failed:', err);
                    setStoredPageLabel('N/A');
                    loadFlipbook(pdfUrl, isRTL, 1, pdfId);
                });
        } else {
            setStoredPageLabel('N/A');
            loadFlipbook(pdfUrl, isRTL, 1, pdfId);
        }
    }).catch(function (err) {
        console.warn('Metadata step failed, using default path:', err);

        var pdfUrl = PDF_BASE_PATH + pdfId + '.pdf';
        setupBackButton('https://www.snqrglobal.com/research');

        currentPdf   = pdfUrl;
        currentPdfId = pdfId;
        window.currentPdf   = currentPdf;
        window.currentPdfId = currentPdfId;

        var storedPageLabelEl = document.getElementById('storedPage');

        function setStoredPageLabel(value) {
            if (!storedPageLabelEl) return;
            storedPageLabelEl.textContent =
                (value !== undefined && value !== null && value !== '') ? value : 'N/A';
        }

        if (!isNaN(pageParam) && pageParam > 0) {
            setStoredPageLabel('N/A');
            loadFlipbook(pdfUrl, isRTL, pageParam, pdfId);
            return;
        }

        if (window.getLastPage) {
            window.getLastPage(pdfId)
                .then(function (storedPage) {
                    var startPage = storedPage || 1;
                    setStoredPageLabel(storedPage || 'N/A');
                    loadFlipbook(pdfUrl, isRTL, startPage, pdfId);
                })
                .catch(function () {
                    setStoredPageLabel('N/A');
                    loadFlipbook(pdfUrl, isRTL, 1, pdfId);
                });
        } else {
            setStoredPageLabel('N/A');
            loadFlipbook(pdfUrl, isRTL, 1, pdfId);
        }
    });
});
