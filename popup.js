document.addEventListener("DOMContentLoaded", () => {
  loadTimeData();
});

function loadTimeData() {
  chrome.runtime.sendMessage({ action: "getTimeData" }, timeData => {
    if (chrome.runtime.lastError) {
      return;
    }

    const timeList = document.getElementById("timeList");
    timeList.innerHTML = "";

    if (!timeData || Object.keys(timeData).length === 0) {
      timeList.innerHTML = "<li>No activity recorded</li>";
      return;
    }

    Object.keys(timeData).forEach(domain => {
      const time = timeData[domain];
      const listItem = document.createElement("li");
      listItem.textContent = `${domain} - ${formatTime(time)}`;
      timeList.appendChild(listItem);
    });
  });
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

document.getElementById("resetButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "resetTimeData" }, response => {
    if (chrome.runtime.lastError || !response?.success) {
      return;
    }

    loadTimeData();
  });
});

document.getElementById("openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
