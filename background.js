
let activeTabId = null;
let activeDomain = null;
let startTime = Date.now();
let interval = null; // Interval for real-time updates

function updateStoredTime() {
    if (!activeDomain || !startTime) return;

    let timeSpent = Math.floor((Date.now() - startTime) / 1000); // Convert ms to secs
    if (timeSpent < 1) return; // Ignore very short times

    chrome.storage.local.get(["timeData"], (result) => {
        let timeData = result.timeData || {};
        timeData[activeDomain] = (timeData[activeDomain] || 0) + timeSpent;

        chrome.storage.local.set({ timeData }, () => {
            console.log(`Updated: ${activeDomain} - ${timeData[activeDomain]} secs`);
        });
    });

    startTime = Date.now(); // Reset timer for the next session
}

// Function to start real-time tracking
function startRealTimeTracking() {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
        updateStoredTime(); // Update storage every second
    }, 1000);
}

// Function to handle tab changes
function handleTabChange(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url) return;

        let url = new URL(tab.url);
        let domain = url.hostname;

        if (activeTabId !== tabId) {
            updateStoredTime(); // Save time for the previous tab
            activeDomain = domain;
            activeTabId = tabId;
            startTime = Date.now();
            startRealTimeTracking(); // Start real-time updates
            console.log(`Switched to: ${domain}`);
        }
    });
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    handleTabChange(activeInfo.tabId);
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        updateStoredTime();
        if (interval) clearInterval(interval);
        activeDomain = null;
        activeTabId = null;
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                handleTabChange(tabs[0].id);
            }
        });
    }
});

// Handle requests for time data from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTimeData") {
        chrome.storage.local.get(["timeData"], (result) => {
            sendResponse(result.timeData || {});
        });
        return true;
    }
});
// function updateTimeData(url, timeSpent) {
//     chrome.storage.local.get("timeData", (data) => {
//         let timeData = data.timeData || [];
        
//         let existingEntry = timeData.find(entry => entry.url === url);
//         if (existingEntry) {
//             existingEntry.timeSpent += timeSpent;
//         } else {
//             timeData.push({ url, timeSpent });
//         }

//         chrome.storage.local.set({ timeData }, () => {
//             console.log("Time data updated:", timeData);
//             chrome.runtime.sendMessage({ action: "updateDashboard" });
//         });
//     });
// }
function saveTimeData(url, timeSpent) {
    chrome.storage.local.get(["timeData"], function (result) {
        let timeData = result.timeData || {};
        timeData[url] = (timeData[url] || 0) + timeSpent; // Add time

        chrome.storage.local.set({ timeData });
    });
}


