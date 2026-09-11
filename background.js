const ACTIVE_SESSION_KEY = "activeSession";
const TIME_DATA_KEY = "timeData";

let trackingQueue = Promise.resolve();

function getDomain(url) {
    if (!url) return null;

    try {
        const parsedUrl = new URL(url);
        if (!/^https?:$/.test(parsedUrl.protocol)) return null;
        return parsedUrl.hostname || null;
    } catch {
        return null;
    }
}

async function getActiveSession() {
    const result = await chrome.storage.local.get(ACTIVE_SESSION_KEY);
    return result[ACTIVE_SESSION_KEY] || null;
}

async function saveActiveSession(session) {
    if (session) {
        await chrome.storage.local.set({ [ACTIVE_SESSION_KEY]: session });
    } else {
        await chrome.storage.local.remove(ACTIVE_SESSION_KEY);
    }
}

async function recordElapsedTime(session) {
    if (!session?.domain || !session.startTime) return;

    const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
    if (elapsedSeconds < 1) return;

    const result = await chrome.storage.local.get(TIME_DATA_KEY);
    const timeData = result[TIME_DATA_KEY] || {};
    timeData[session.domain] = (timeData[session.domain] || 0) + elapsedSeconds;

    await chrome.storage.local.set({
        [TIME_DATA_KEY]: timeData,
        [ACTIVE_SESSION_KEY]: {
            ...session,
            startTime: Date.now(),
        },
    });
}

async function stopTracking() {
    const session = await getActiveSession();
    if (!session) return;

    await recordElapsedTime(session);
    await saveActiveSession(null);
}

async function startTracking(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        const window = await chrome.windows.get(tab.windowId);

        // Only track the tab the user is actually viewing.
        if (!tab.active || !window.focused) {
            return;
        }

        const domain = getDomain(tab.url);
        const currentSession = await getActiveSession();

        if (
            currentSession?.tabId === tabId &&
            currentSession?.domain === domain &&
            currentSession?.windowId === tab.windowId
        ) {
            return;
        }

        if (currentSession) {
            await recordElapsedTime(currentSession);
        }

        if (!domain) {
            await saveActiveSession(null);
            return;
        }

        await saveActiveSession({
            tabId,
            windowId: tab.windowId,
            domain,
            startTime: Date.now(),
        });
    } catch (error) {
        console.error("Unable to start tracking:", error);
    }
}

function queueTracking(operation) {
    trackingQueue = trackingQueue
        .then(operation, operation)
        .catch((error) => {
            console.error("Tracking operation failed:", error);
        });

    return trackingQueue;
}

function trackFocusedTab(windowId) {
    return queueTracking(async () => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            await stopTracking();
            return;
        }

        const tabs = await chrome.tabs.query({
            active: true,
            windowId,
        });

        if (tabs[0]?.id != null) {
            await startTracking(tabs[0].id);
        } else {
            await stopTracking();
        }
    });
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
    queueTracking(() => startTracking(tabId));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
        queueTracking(() => startTracking(tabId));
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    trackFocusedTab(windowId);
});

chrome.runtime.onStartup.addListener(() => {
    queueTracking(async () => {
        const window = await chrome.windows.getLastFocused({ populate: false });
        if (window?.id == null || window.id === chrome.windows.WINDOW_ID_NONE) {
            await stopTracking();
            return;
        }

        const tabs = await chrome.tabs.query({
            active: true,
            windowId: window.id,
        });

        if (tabs[0]?.id != null) {
            await startTracking(tabs[0].id);
        } else {
            await stopTracking();
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "resetTimeData") {
        queueTracking(async () => {
            const session = await getActiveSession();

            await chrome.storage.local.set({ [TIME_DATA_KEY]: {} });

            if (session) {
                await saveActiveSession({
                    ...session,
                    startTime: Date.now(),
                });
            }

            sendResponse({ success: true });
        }).catch((error) => {
            console.error("Unable to reset time data:", error);
            sendResponse({ success: false });
        });

        return true;
    }

    if (message.action !== "getTimeData") return;

    queueTracking(async () => {
        const window = await chrome.windows.getLastFocused({ populate: false });

        if (window?.id == null || window.id === chrome.windows.WINDOW_ID_NONE) {
            await stopTracking();
        } else {
            const tabs = await chrome.tabs.query({
                active: true,
                windowId: window.id,
            });

            if (tabs[0]?.id != null) {
                await startTracking(tabs[0].id);
            } else {
                await stopTracking();
            }
        }

        const result = await chrome.storage.local.get(TIME_DATA_KEY);
        sendResponse(result[TIME_DATA_KEY] || {});
    }).catch((error) => {
        console.error("Unable to read time data:", error);
        sendResponse({});
    });

    return true;
});
