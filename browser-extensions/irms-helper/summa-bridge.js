window.postMessage({ type: "SUMMA_IRMS_EXTENSION_READY" }, window.location.origin);

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;

  if (event.data?.type === "SUMMA_IRMS_EXTENSION_PROBE") {
    window.postMessage({ type: "SUMMA_IRMS_EXTENSION_READY" }, window.location.origin);
    return;
  }
  if (!["SUMMA_IRMS_LOOKUP", "SUMMA_IRMS_SEARCH_ENTITIES"].includes(event.data?.type)) return;

  try {
    if (!chrome.runtime?.id) {
      throw new Error("Extension context invalidated");
    }

    chrome.runtime.sendMessage({
      type: event.data.type,
      requestId: event.data.requestId,
      pib: event.data.pib,
      filters: event.data.filters
    }).then((response) => {
      if (response?.ok === false) {
        window.postMessage({
          type: "SUMMA_IRMS_ERROR",
          requestId: event.data.requestId,
          message: response.message
        }, window.location.origin);
      }
    }).catch(() => {
      window.postMessage({
        type: "SUMMA_IRMS_ERROR",
        requestId: event.data.requestId,
        message: "Ekstenzija je osvježena. Osvježite i stranicu programa pa pokušajte ponovo."
      }, window.location.origin);
    });
  } catch {
    window.postMessage({
      type: "SUMMA_IRMS_ERROR",
      requestId: event.data.requestId,
      message: "Ekstenzija je osvježena. Osvježite i stranicu programa pa pokušajte ponovo."
    }, window.location.origin);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (["SUMMA_IRMS_RESULT", "SUMMA_IRMS_ENTITIES_RESULT", "SUMMA_IRMS_ERROR"].includes(message?.type)) {
    window.postMessage(message, window.location.origin);
  }
});
