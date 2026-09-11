document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("timeChart");
  const status = document.getElementById("status");
  const list = document.getElementById("siteList");
  const resetButton = document.getElementById("resetButton");
  let chart = null;
  let renderInProgress = false;
  let renderPending = false;

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  function renderChart(sites, times) {
    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas.getContext("2d"), {
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
  }

  function renderList(sites, times) {
    list.innerHTML = "";

    sites.forEach((site, index) => {
      const item = document.createElement("li");
      item.innerText = `${site}: ${formatTime(times[index])}`;
      list.appendChild(item);
    });
  }

  function renderDashboard() {
    if (renderInProgress) {
      renderPending = true;
      return;
    }

    renderInProgress = true;
    renderPending = false;

    chrome.runtime.sendMessage({ action: "getTimeData" }, (timeData) => {
      renderInProgress = false;

      if (chrome.runtime.lastError) {
        status.innerText = "Unable to load time data.";
      } else {
        const sites = Object.keys(timeData || {});
        const times = sites.map((site) => timeData[site]);

        if (sites.length === 0) {
          status.innerText = "No time data available.";
          list.innerHTML = "";
          if (chart) {
            chart.destroy();
            chart = null;
          }
        } else {
          status.innerText = "";
          renderChart(sites, times);
          renderList(sites, times);
        }
      }

      if (renderPending) {
        renderDashboard();
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.timeData) {
      renderDashboard();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateDashboard") {
      renderDashboard();
    }
  });

  resetButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetTimeData" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        status.innerText = "Unable to reset time data.";
        return;
      }

      renderDashboard();
    });
  });

  renderDashboard();
});
