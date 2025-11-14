// SNQR Research Reader - UI & panel behaviour

$(document).ready(function () {
    // -------------------------------------------------
    // Unified Panel Management
    // -------------------------------------------------
    var panelAutoHideTimer = null;
    var isPanelOpen = false;

    function openUnifiedPanel() {
        var panel    = $("#unifiedPanel");
        var toggleBtn = $("#toggleUnifiedPanelBtn");
        var body     = $("body");

        isPanelOpen = true;
        panel.addClass("open");
        body.addClass("panel-open");

        toggleBtn
            .html('<i class="fas fa-times"></i>')
            .attr("title", "Close Control Panel");

        startAutoHideTimer();
    }

    function closeUnifiedPanel() {
        var panel    = $("#unifiedPanel");
        var toggleBtn = $("#toggleUnifiedPanelBtn");
        var body     = $("body");

        isPanelOpen = false;
        panel.removeClass("open");
        body.removeClass("panel-open");

        toggleBtn
            .html('<i class="fas fa-bars"></i>')
            .attr("title", "Open Control Panel");

        clearAutoHideTimer();
    }

    function toggleUnifiedPanel() {
        if (isPanelOpen) {
            closeUnifiedPanel();
        } else {
            openUnifiedPanel();
        }
    }

    function startAutoHideTimer() {
        clearAutoHideTimer();
        panelAutoHideTimer = setTimeout(function () {
            if (isPanelOpen) {
                closeUnifiedPanel();
            }
        }, 5000);
    }

    function clearAutoHideTimer() {
        if (panelAutoHideTimer) {
            clearTimeout(panelAutoHideTimer);
            panelAutoHideTimer = null;
        }
    }

    function resetAutoHideTimer() {
        if (isPanelOpen) {
            startAutoHideTimer();
        }
    }

    // Button wiring
    $("#toggleUnifiedPanelBtn").on("click", function () {
        toggleUnifiedPanel();
    });

    $("#closeUnifiedPanelBtn").on("click", function () {
        closeUnifiedPanel();
    });

    // Keep panel open while interacting with it
    $("#unifiedPanel")
        .on("mouseenter focusin", function () {
            clearAutoHideTimer();
        })
        .on("mouseleave focusout", function () {
            startAutoHideTimer();
        });

    // Click outside closes the panel
    $(document).on("click", function (event) {
        var panel    = $("#unifiedPanel");
        var toggleBtn = $("#toggleUnifiedPanelBtn");

        if (
            isPanelOpen &&
            !panel.is(event.target) && panel.has(event.target).length === 0 &&
            !toggleBtn.is(event.target) && toggleBtn.has(event.target).length === 0
        ) {
            closeUnifiedPanel();
        }
    });

    // Keyboard shortcuts
    $(document).on("keydown", function (event) {
        // Ctrl/Cmd + K → toggle
        if ((event.ctrlKey || event.metaKey) && event.key === "k") {
            event.preventDefault();
            toggleUnifiedPanel();
        }

        // Esc → close
        if (event.key === "Escape" && isPanelOpen) {
            closeUnifiedPanel();
        }
    });

    // Ensure panel starts closed
    $("#unifiedPanel").removeClass("open");
    $("body").removeClass("panel-open");

    // -------------------------------------------------
    // Layout density (UI only)
    // -------------------------------------------------
    $(".panel-toggle-btn").on("click", function () {
        var density = $(this).data("density") || "comfortable";

        $(".panel-toggle-btn").removeClass("active");
        $(this).addClass("active");

        $("body").attr("data-density", density);
        resetAutoHideTimer();
    });

    // -------------------------------------------------
    // Reading Direction Toggle (RTL / LTR)
    // -------------------------------------------------
    $("#toggleDirectionBtn").on("click", function () {
        if (typeof isRTL === "undefined") {
            window.isRTL = false;
        }

        isRTL = !isRTL;

        var pdfUrl = window.currentPdf || null;
        var pdfId  = window.currentPdfId || null;

        if (!pdfUrl) {
            console.warn("No currentPdf set when toggling direction.");
            return;
        }

        // Try to use stored page if available
        if (window.getLastPage && pdfId) {
            window.getLastPage(pdfId)
                .then(function (storedPage) {
                    var page = storedPage || 1;
                    var label = $("#storedPage");
                    if (label.length) {
                        label.text(storedPage || "N/A");
                    }
                    loadFlipbook(pdfUrl, isRTL, page, pdfId);
                })
                .catch(function () {
                    var label = $("#storedPage");
                    if (label.length) {
                        label.text("N/A");
                    }
                    loadFlipbook(pdfUrl, isRTL, 1, pdfId);
                });
        } else {
            loadFlipbook(pdfUrl, isRTL, 1, pdfId);
        }

        resetAutoHideTimer();

        // Update tooltip
        if (isRTL) {
            $(this).attr("title", "Switch to LTR");
        } else {
            $(this).attr("title", "Switch to RTL");
        }
    });
});
