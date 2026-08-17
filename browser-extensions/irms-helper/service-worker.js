const pendingKey = (tabId) => `irms-pending-${tabId}`;
const IRMS_MIN_REQUEST_INTERVAL_MS = 10000;
const IRMS_LAST_REQUEST_KEY = "irms-last-request-at";
let throttleChain = Promise.resolve();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitForIrmsRequestSlot() {
  const scheduled = throttleChain.then(async () => {
    const stored = await chrome.storage.session.get(IRMS_LAST_REQUEST_KEY);
    const lastRequestAt = Number(stored[IRMS_LAST_REQUEST_KEY] || 0);
    const waitMs = Math.max(0, IRMS_MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (waitMs > 0) await delay(waitMs);
    await chrome.storage.session.set({ [IRMS_LAST_REQUEST_KEY]: Date.now() });
  });
  throttleChain = scheduled.catch(() => undefined);
  return scheduled;
}

async function savePending(tabId, pending) {
  await chrome.storage.session.set({ [pendingKey(tabId)]: pending });
}

async function getPending(tabId) {
  const key = pendingKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return stored[key];
}

async function removePending(tabId) {
  await chrome.storage.session.remove(pendingKey(tabId));
}

async function startReader(tabId) {
  const pending = await getPending(tabId);
  if (!pending) return;
  await chrome.tabs.sendMessage(tabId, {
    type: pending.mode === "entities" ? "SUMMA_IRMS_SEARCH_ENTITIES_START" : "SUMMA_IRMS_START",
    pib: pending.pib,
    filters: pending.filters
  }).catch(() => undefined);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SUMMA_IRMS_SEARCH_ENTITIES" && sender.tab?.id) {
    const filters = message.filters && typeof message.filters === "object" ? message.filters : {};
    const params = new URLSearchParams();
    const allowed = [
      "tradeClassificationCode", "legalStatusId", "municipalityId", "taxpayerStatusId",
      "registrationDate", "fullName", "companyName", "identificationNumber",
      "registrationNumber", "page", "perPage"
    ];
    for (const key of allowed) {
      const value = String(filters[key] ?? "").trim();
      if (!value) continue;
      params.set(key === "companyName" ? "fullName" : key, value);
    }
    if (!params.has("page")) params.set("page", "1");
    if (!params.has("perPage")) params.set("perPage", "100");

    waitForIrmsRequestSlot().then(() => chrome.tabs.create({
      active: true,
      url: `https://irms.tax.gov.me/public/search-register/business-entities?${params}`
    })).then(async (tab) => {
      if (!tab.id) {
        sendResponse({ ok: false, message: "IRMS tab nije mogao biti otvoren." });
        return;
      }
      await savePending(tab.id, {
        mode: "entities",
        filters,
        requesterTabId: sender.tab.id,
        requestId: message.requestId
      });
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false, message: "IRMS tab nije mogao biti otvoren." }));
    return true;
  }

  if (message?.type === "SUMMA_IRMS_LOOKUP" && sender.tab?.id) {
    const pib = String(message.pib ?? "").trim();
    if (!/^\d{8}$/.test(pib)) {
      sendResponse({ ok: false, message: "PIB mora imati tačno 8 cifara." });
      return;
    }

    waitForIrmsRequestSlot().then(() => chrome.tabs.create({
      active: true,
      url: `https://irms.tax.gov.me/public/search-register?summaPib=${encodeURIComponent(pib)}`
    })).then(async (tab) => {
      if (!tab.id) {
        sendResponse({ ok: false, message: "IRMS tab nije mogao biti otvoren." });
        return;
      }
      await savePending(tab.id, {
        pib,
        requesterTabId: sender.tab.id,
        requestId: message.requestId
      });
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false, message: "IRMS tab nije mogao biti otvoren." }));
    return true;
  }

  if (message?.type === "SUMMA_IRMS_READER_READY" && sender.tab?.id) {
    startReader(sender.tab.id);
    return;
  }

  if (["SUMMA_IRMS_RESULT", "SUMMA_IRMS_ENTITIES_RESULT", "SUMMA_IRMS_ERROR"].includes(message?.type) && sender.tab?.id) {
    const irmsTabId = sender.tab.id;
    getPending(irmsTabId).then((pending) => {
      if (!pending) return;
      chrome.tabs.sendMessage(pending.requesterTabId, {
        type: message.type,
        requestId: pending.requestId,
        data: message.data,
        message: message.message
      }).finally(async () => {
        await removePending(irmsTabId).catch(() => undefined);
        chrome.tabs.remove(irmsTabId).catch(() => undefined);
      });
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.startsWith("https://irms.tax.gov.me/public/search-register")) {
    startReader(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  getPending(tabId).then((pending) => {
    if (!pending) return;
    removePending(tabId).catch(() => undefined);
    chrome.tabs.sendMessage(pending.requesterTabId, {
      type: "SUMMA_IRMS_ERROR",
      requestId: pending.requestId,
      message: "IRMS tab je zatvoren prije završetka pretrage."
    }).catch(() => undefined);
  });
});
