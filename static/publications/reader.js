const reader = document.querySelector("[data-pdf-reader]");

if (reader) {
  const canvas = reader.querySelector("[data-reader-canvas]");
  const context = canvas.getContext("2d");
  const pageInput = reader.querySelector("[data-reader-page]");
  const pageTotal = reader.querySelector("[data-reader-total]");
  const previousButton = reader.querySelector("[data-reader-prev]");
  const nextButton = reader.querySelector("[data-reader-next]");
  const loadingMessage = reader.querySelector("[data-reader-loading]");
  const errorMessage = reader.querySelector("[data-reader-error]");
  const fullscreenButton = reader.querySelector("[data-reader-fullscreen]");
  let pdf;
  let pageNumber = Number(reader.dataset.initialPage) || 1;
  let zoom = 1;
  let currentRender;
  let renderSequence = 0;
  let progressSaveTimer;
  let lastSavedPage = pageNumber;
  const progressStatus = reader.querySelector("[data-reader-progress-status]");

  const showError = (error) => {
    console.error("Unable to load the digital edition", error);
    loadingMessage.hidden = true;
    errorMessage.hidden = false;
    previousButton.disabled = true;
    nextButton.disabled = true;
  };

  const updateControls = () => {
    pageInput.value = String(pageNumber);
    pageInput.max = String(pdf.numPages);
    pageTotal.textContent = String(pdf.numPages);
    previousButton.disabled = pageNumber <= 1;
    nextButton.disabled = pageNumber >= pdf.numPages;
  };

  const saveProgress = () => {
    const progressUrl = reader.dataset.progressUrl;
    if (!progressUrl || pageNumber === lastSavedPage) return;
    window.clearTimeout(progressSaveTimer);
    progressSaveTimer = window.setTimeout(async () => {
      const pageToSave = pageNumber;
      try {
        const response = await fetch(progressUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": reader.querySelector('input[name="csrfmiddlewaretoken"]').value,
          },
          body: JSON.stringify({page: pageToSave}),
          credentials: "same-origin",
        });
        if (!response.ok || response.redirected) {
          throw new Error(`Progress save failed with status ${response.status}`);
        }
        lastSavedPage = pageToSave;
        progressStatus.textContent = "Reading progress saved.";
        if (pageNumber !== pageToSave) saveProgress();
      } catch (error) {
        console.error("Unable to save reading progress", error);
        progressStatus.textContent = "Reading progress could not be saved. It will try again when you change pages.";
      }
    }, 800);
  };

  const renderPage = async () => {
    const sequence = ++renderSequence;
    currentRender?.cancel();
    const page = await pdf.getPage(pageNumber);
    if (sequence !== renderSequence) return;

    const baseViewport = page.getViewport({scale: 1});
    const availableWidth = Math.max(240, canvas.parentElement.clientWidth - 40);
    const scale = (availableWidth / baseViewport.width) * zoom;
    const viewport = page.getViewport({scale});
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    currentRender = page.render({
      canvasContext: context,
      viewport,
      transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
    });
    try {
      await currentRender.promise;
    } catch (error) {
      if (error.name !== "RenderingCancelledException") throw error;
    }
    if (sequence === renderSequence) {
      updateControls();
      saveProgress();
    }
  };

  const goToPage = (nextPage) => {
    if (!pdf) return;
    pageNumber = Math.max(1, Math.min(pdf.numPages, Number(nextPage) || 1));
    renderPage().catch(showError);
  };

  const loadReader = async () => {
    try {
      const pdfjs = await import("./vendor/pdfjs/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = reader.dataset.workerUrl;
      pdf = await pdfjs.getDocument({
        url: reader.dataset.pdfUrl,
        withCredentials: true,
      }).promise;
      pageNumber = Math.max(1, Math.min(pdf.numPages, pageNumber));
      loadingMessage.hidden = true;
      pageTotal.textContent = String(pdf.numPages);
      await renderPage();
    } catch (error) {
      showError(error);
    }
  };

  previousButton.addEventListener("click", () => goToPage(pageNumber - 1));
  nextButton.addEventListener("click", () => goToPage(pageNumber + 1));
  pageInput.addEventListener("change", () => goToPage(pageInput.value));
  reader.querySelector("[data-reader-zoom-in]").addEventListener("click", () => {
    zoom = Math.min(2.5, zoom * 1.2);
    renderPage().catch(showError);
  });
  reader.querySelector("[data-reader-zoom-out]").addEventListener("click", () => {
    zoom = Math.max(0.5, zoom / 1.2);
    renderPage().catch(showError);
  });
  reader.querySelector("[data-reader-fit]").addEventListener("click", () => {
    zoom = 1;
    renderPage().catch(showError);
  });
  reader.querySelector("[data-reader-print]").addEventListener("click", () => window.print());
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await reader.requestFullscreen();
    } catch (error) {
      console.error("Unable to enter reader fullscreen mode", error);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen";
  });
  document.addEventListener("keydown", (event) => {
    if (!pdf || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === "ArrowLeft" || event.key === "PageUp") goToPage(pageNumber - 1);
    if (event.key === "ArrowRight" || event.key === "PageDown") goToPage(pageNumber + 1);
    if (event.key === "+" || event.key === "=") reader.querySelector("[data-reader-zoom-in]").click();
    if (event.key === "-") reader.querySelector("[data-reader-zoom-out]").click();
  });
  window.addEventListener("resize", () => {
    if (pdf) renderPage().catch(showError);
  });

  loadReader();
}
