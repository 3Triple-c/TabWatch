document.addEventListener("DOMContentLoaded", function () {
  const ctx = document.getElementById("timeChart").getContext("2d");

  function formatTime(seconds) {
    let hrs = Math.floor(seconds / 3600);
    let mins = Math.floor((seconds % 3600) / 60);
    let secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  function updateDashboard() {
    chrome.storage.local.get(["timeData"], result => {
      let timeData = result.timeData || {};
      let sites = Object.keys(timeData);
      let times = Object.values(timeData);

      if (sites.length === 0) {
        document.getElementById("status").innerText = "No time data available.";
        return;
      }

      document.getElementById("status").innerText = "";

      // Create Chart.js instance
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: sites,
          datasets: [
            {
              label: "Time Spent (seconds)",
              data: times,
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true },
          },
        },
      });

      // Update list of websites and time spent
      let list = document.getElementById("siteList");
      list.innerHTML = "";
      sites.forEach((site, index) => {
        let item = document.createElement("li");
        item.innerText = `${site}: ${formatTime(times[index])}`;
        list.appendChild(item);
      });
    });
  }

  updateDashboard();
});
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.timeData) {
    // Check if time data was updated
    console.log("Time data changed, updating chart...");
    updateChart();
  }
});

// Function to update chart dynamically
async function updateChart() {
  let storedData = await chrome.storage.local.get("timeData");
  let timeData = storedData.timeData || [];

  if (timeData.length === 0) {
    console.log("No time data available.");
    return;
  }

}
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.timeData) {
    console.log("Storage changed, updating chart...");
    updateChart();
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateDashboard") {
    console.log("Dashboard received update signal");
    updateChart(); // Refresh the chart dynamically
  }
});
// Reload dashboard when user returns to it
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
      location.reload();
  }
});


document.getElementById("resetButton").addEventListener("click", () => {
  chrome.storage.local.set({ timeData: {} }, () => {
    console.log("Time data reset");
    loadTimeData();
  });
});
