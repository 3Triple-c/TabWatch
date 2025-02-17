
document.addEventListener("DOMContentLoaded", () => {
  loadTimeData();
});

function loadTimeData() {
  chrome.runtime.sendMessage({ action: "getTimeData" }, timeData => {
    let timeList = document.getElementById("timeList");
    timeList.innerHTML = ""; // Clear previous entries

    if (!timeData || Object.keys(timeData).length === 0) {
      timeList.innerHTML = "<li>No activity recorded</li>";
      return;
    }

    Object.keys(timeData).forEach(domain => {
      let time = timeData[domain];
      let listItem = document.createElement("li");
      listItem.textContent = `${domain} - ${formatTime(time)}`;
      timeList.appendChild(listItem);
    });

    console.log("Stored Time Data:", timeData);
  });
}

function formatTime(seconds) {
  let hours = Math.floor(seconds / 3600);
  let mins = Math.floor((seconds % 3600) / 60);
  let secs = seconds % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

document.getElementById("resetButton").addEventListener("click", () => {
  chrome.storage.local.set({ timeData: {} }, () => {
    console.log("Time data reset");
    loadTimeData();
  });
});
document.getElementById("openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
