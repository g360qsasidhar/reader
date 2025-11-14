// SNQR Research Reader - core loader

// Global reading direction (false = LTR, true = RTL)
var isRTL = false;

// Local file configuration (development / VS Code)
var PDF_BASE_PATH   = './reader/';                // Folder where PDFs live
var SNQR_REDIRECT   = 'https://snqrglobal.com';   // Redirect when ?doc is missing

// Current PDF context (URL + ID)
var currentPdf   = null;
var currentPdfId = null;

// -----------------------------------------------------
// Flipbook loader
// -----------------------------------------------------
function loadFlipbook(pdfUrl, rtlMode, page, pdfId) {
    if (!pdfUrl || pdfUrl.trim() === '') {
        console.error('Invalid PDF URL provided to loadFlipbook');
        var container = document.getElementById('flipbookContainer');
        if (container) {
            container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Invalid PDF URL provided.</div>';
        }
        return;
    }

    // Normalise inputs
    var openPage = (typeof page === 'number' && page > 0) ? page : 1;
    var id       = pdfId || pdfUrl;

    // Flipbook options
    var options = {
        height: "100%",
        duration: 700,
        backgroundColor: "#2F2D2F",
        direction: rtlMode ? 2 : 1, // 2 = RTL, 1 = LTR
        zoomChange: function (isZoomed) {
            document.body.style.overflow = isZoomed ? "hidden" : "auto";
        },
        openPage: openPage,
        pdfId: id,
        onReady: function (book) {
            if (book && typeof book.pageCount !== "undefined") {
                console.log("PDF loaded successfully with", book.pageCount, "pages");
            }
        }
    };

    // Clear previous content
    var flipContainer = $("#flipbookContainer");
    flipContainer.empty();

    try {
        flipContainer.flipBook(pdfUrl, options);
    } catch (err) {
        console.error("Error initializing flipbook:", err);
        flipContainer.html(
            '<div style="color: red; padding: 20px; text-align: center;">' +
            'Error loading PDF. Please check the console for details.' +
            '</div>'
        );
        return;
    }

    // Update global context and UI labels
    updatePdfContext(pdfUrl, id);
}

// -----------------------------------------------------
// PDF context & info display
// -----------------------------------------------------
function updatePdfContext(pdfUrl, pdfId) {
    currentPdf   = pdfUrl;
    currentPdfId = pdfId || pdfUrl;

    window.currentPdf   = currentPdf;
    window.currentPdfId = currentPdfId;

    // Derive a display name (e.g., SNQR2025PR001.pdf)
    var displayName = "";
    try {
        var urlObj = new URL(pdfUrl, window.location.origin);
        var path   = urlObj.pathname || "";
        var parts  = path.split("/");
        var last   = parts[parts.length - 1] || "";
        displayName = last || urlObj.hostname;
    } catch (e) {
        displayName = pdfUrl.substring(0, 64);
    }

    updatePdfInfoDisplay(displayName);
}

function updatePdfInfoDisplay(pdfName) {
    var infoNodes = document.querySelectorAll("[data-pdf-info]");
    if (!infoNodes || infoNodes.length === 0) return;

    infoNodes.forEach(function (el) {
        if (pdfName) {
            el.textContent = pdfName;
            el.style.display = "inline";
        } else {
            el.textContent = "";
            el.style.display = "none";
        }
    });
}

// -----------------------------------------------------
// Initial bootstrap - enforce ?doc=SNQR... and load PDF
// -----------------------------------------------------
$(document).ready(function () {
    var urlParams = new URLSearchParams(window.location.search);
    var docParam  = urlParams.get("doc");             // SNQR ID, e.g. SNQR2025PR001
    var pageParam = parseInt(urlParams.get("page"), 10);

    // Enforce presence of ?doc=... ; otherwise redirect to main SNQR site
    if (!docParam || !docParam.trim()) {
        window.location.href = SNQR_REDIRECT;
        return;
    }

    var pdfId  = docParam.trim();
    var pdfUrl = PDF_BASE_PATH + pdfId + ".pdf";

    currentPdf   = pdfUrl;
    currentPdfId = pdfId;
    window.currentPdf   = currentPdf;
    window.currentPdfId = currentPdfId;

    var hasStoredPageElement = !!document.getElementById("storedPage");

    // Helper to set stored page label safely
    function setStoredPageLabel(value) {
        if (!hasStoredPageElement) return;
        var label = document.getElementById("storedPage");
        if (!label) return;
        label.textContent = (value !== undefined && value !== null && value !== "") ? value : "N/A";
    }

    // If ?page= is provided, respect it directly
    if (!isNaN(pageParam) && pageParam > 0) {
        setStoredPageLabel("N/A");
        loadFlipbook(pdfUrl, isRTL, pageParam, pdfId);
        return;
    }

    // Otherwise, try IndexedDB page memory (if available)
    if (window.getLastPage) {
        window.getLastPage(pdfId)
            .then(function (storedPage) {
                var startPage = storedPage || 1;
                setStoredPageLabel(storedPage || "N/A");
                loadFlipbook(pdfUrl, isRTL, startPage, pdfId);
            })
            .catch(function (err) {
                console.warn("getLastPage failed:", err);
                setStoredPageLabel("N/A");
                loadFlipbook(pdfUrl, isRTL, 1, pdfId);
            });
    } else {
        // No page memory API
        setStoredPageLabel("N/A");
        loadFlipbook(pdfUrl, isRTL, 1, pdfId);
    }
});
