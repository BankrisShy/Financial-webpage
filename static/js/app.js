const API_URL = "https://financial-webpage.onrender.com";

const path = window.location.pathname;
const isAdminPage = path.endsWith("admin.html");
const isDashboardPage = path.endsWith("index.html") || path === "/";
const isTransactionsPage = path.endsWith("transactions.html");
const isCategoriesPage = path.endsWith("categories.html");

const ADMIN_CODE = "210536"; // cambia il codice come vuoi

// ======================
// GESTIONE ADMIN / VIEWER
// ======================
document.addEventListener("DOMContentLoaded", () => {
  const codeInput = document.getElementById("admin-code-input");
  const codeBtn = document.getElementById("admin-code-btn");
  const userNameLabel = document.getElementById("user-name-label");
  const userRoleLabel = document.getElementById("user-role-label");

  let isAdmin = localStorage.getItem("nebula_is_admin") === "true";

  function applyRole() {
    if (userNameLabel && userRoleLabel) {
      if (isAdmin) {
        userNameLabel.textContent = "Admin Nebula";
        userRoleLabel.textContent = "Modalità amministratore";
      } else {
        userNameLabel.textContent = "Benvenuta Contabile Moran";
        userRoleLabel.textContent = "Sola lettura";
      }
    }

    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = isAdmin ? "" : "none";
    });
  }

  applyRole();

  if (codeBtn && codeInput) {
    codeBtn.addEventListener("click", () => {
      const value = codeInput.value.trim();
      if (value === ADMIN_CODE) {
        isAdmin = !isAdmin;
        localStorage.setItem("nebula_is_admin", String(isAdmin));
        codeInput.value = "";
        applyRole();
        alert(isAdmin ? "Modalità admin attivata" : "Modalità viewer attivata");
      } else {
        alert("Codice non valido.");
      }
    });
  }
});

// ======================
// PAGINA ADMIN
// ======================
if (isAdminPage) {
  document.addEventListener("DOMContentLoaded", () => {
    const isAdmin = localStorage.getItem("nebula_is_admin") === "true";
    if (!isAdmin) {
      alert("Accesso admin richiesto. Torno alla dashboard.");
      window.location.href = "index.html";
      return;
    }

    const form = document.getElementById("tx-form");
    const msgBox = document.getElementById("tx-message");

    if (!form || !msgBox) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msgBox.textContent = "";

      const amount = parseFloat(document.getElementById("amount").value);
      const description = document.getElementById("description").value;
      const categoryId = parseInt(
        document.getElementById("category_id").value,
        10
      );
      const dateInput = document.getElementById("date").value;

      if (!amount || !categoryId || !dateInput) {
        msgBox.textContent = "Compila tutti i campi obbligatori.";
        msgBox.style.color = "#f97373";
        return;
      }

      const dateIso = new Date(dateInput).toISOString();

      const payload = {
        amount: amount,
        description: description,
        date: dateIso,
        category_id: categoryId,
      };

      try {
        const res = await fetch(`${API_URL}/api/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Errore API");
        }

        msgBox.textContent = "Transazione salvata ✅";
        msgBox.style.color = "#4ade80";
        form.reset();
      } catch (err) {
        console.error(err);
        msgBox.textContent = "Errore nel salvataggio.";
        msgBox.style.color = "#f97373";
      }
    });
  });
}

// ======================
// PAGINA DASHBOARD
// ======================
if (isDashboardPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("tx-table-body");
    const kpiTotalAmount = document.getElementById("kpi-total-amount");
    const kpiLastUpdate = document.getElementById("kpi-last-update");
    const kpiTotalOps = document.getElementById("kpi-total-ops");
    const kpiInvestments = document.getElementById("kpi-investments");
    const kpiInvestmentsShare = document.getElementById("kpi-investments-share");
    const kpiLifestyle = document.getElementById("kpi-lifestyle");

    if (!tableBody) return;

    try {
      const res = await fetch(`${API_URL}/api/transactions`);
      if (!res.ok) throw new Error("Errore API");
      const data = await res.json();

      tableBody.innerHTML = "";

      let totalAmount = 0;
      let totalOps = data.length;
      let totalInvestments = 0;
      let totalLifestyle = 0;
      let lastDate = null;

      data.forEach((tx) => {
        const tr = document.createElement("tr");

        const date = new Date(tx.date);
        const dateStr = date.toLocaleString("it-IT");

        if (!lastDate || date > lastDate) lastDate = date;

        const amount = tx.amount;
        totalAmount += amount;

        const catName = tx.category?.name || "";
        if (catName.toLowerCase() === "investimenti") {
          totalInvestments += amount;
        }
        if (catName.toLowerCase() === "lifestyle") {
          totalLifestyle += amount;
        }

        const amountStr =
          (amount >= 0 ? "+ " : "- ") +
          "€ " +
          Math.abs(amount).toFixed(2);

        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${tx.description || ""}</td>
          <td>${(tx.category?.icon || "") + " " + catName}</td>
          <td>${amountStr}</td>
        `;

        tableBody.appendChild(tr);
      });

      const fmt = (v) =>
        "€ " +
        v.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      kpiTotalAmount.textContent = fmt(totalAmount);
      kpiTotalOps.textContent = totalOps.toString();
      kpiInvestments.textContent = fmt(totalInvestments);
      kpiLifestyle.textContent = fmt(totalLifestyle);

      const share =
        totalAmount !== 0 ? (totalInvestments / totalAmount) * 100 : 0;
      kpiInvestmentsShare.textContent = `${share.toFixed(1)}% del portafoglio`;

      if (lastDate) {
        kpiLastUpdate.textContent =
          "Aggiornato al " +
          lastDate.toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      } else {
        kpiLastUpdate.textContent = "Nessun dato";
      }

      // Line chart
      const lineCanvas = document.getElementById("line-chart");
      const donutCanvas = document.getElementById("donut-chart");

      if (lineCanvas && data.length > 0) {
        const byDay = {};
        data.forEach((tx) => {
          const d = new Date(tx.date);
          const key = d.toISOString().slice(0, 10);
          byDay[key] = (byDay[key] || 0) + tx.amount;
        });

        const lineLabels = Object.keys(byDay).sort();
        const lineValues = lineLabels.map((d) => byDay[d]);

        new Chart(lineCanvas, {
          type: "line",
          data: {
            labels: lineLabels,
            datasets: [
              {
                label: "Saldo giornaliero",
                data: lineValues,
                borderColor: "#ff4b8b",
                backgroundColor: "rgba(255, 75, 139, 0.25)",
                tension: 0.35,
                fill: true,
              },
            ],
          },
          options: {
            plugins: {
              legend: { labels: { color: "#f5f5f7" } },
            },
            scales: {
              x: {
                ticks: { color: "#9ca3c7" },
                grid: { color: "rgba(148, 163, 184, 0.13)" },
              },
              y: {
                ticks: { color: "#9ca3c7" },
                grid: { color: "rgba(148, 163, 184, 0.13)" },
              },
            },
          },
        });
      }

      // Donut chart
      if (donutCanvas && data.length > 0) {
        const byCat = {};
        data.forEach((tx) => {
          const name = tx.category?.name || "Altro";
          byCat[name] = (byCat[name] || 0) + tx.amount;
        });

        const donutLabels = Object.keys(byCat);
        const donutValues = donutLabels.map((k) => byCat[k]);

        new Chart(donutCanvas, {
          type: "doughnut",
          data: {
            labels: donutLabels,
            datasets: [
              {
                data: donutValues,
                backgroundColor: [
                  "#ff4b8b",
                  "#a855f7",
                  "#22d3ee",
                  "#f97316",
                  "#4ade80",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: "#f5f5f7" },
              },
            },
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// ======================
// PAGINA TRANSAZIONI
// ======================
if (isTransactionsPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.getElementById("tx-table-body-full");
    const form = document.getElementById("tx-filter-form");
    const fromInput = document.getElementById("filter-from-date");
    const toInput = document.getElementById("filter-to-date");
    const catSelect = document.getElementById("filter-category");

    if (!tbody) return;

    let allTx = [];

    try {
      const resCats = await fetch(`${API_URL}/api/categories`);
      if (resCats.ok) {
        const cats = await resCats.json();
        cats.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.name;
          opt.textContent = `${c.icon || ""} ${c.name}`;
          catSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
    }

    async function loadTransactions() {
      try {
        const res = await fetch(`${API_URL}/api/transactions`);
        if (!res.ok) throw new Error("Errore API transazioni");
        allTx = await res.json();
        applyFiltersAndRender();
      } catch (err) {
        console.error(err);
      }
    }

    function applyFiltersAndRender() {
      tbody.innerHTML = "";

      const fromVal = fromInput.value ? new Date(fromInput.value) : null;
      const toVal = toInput.value ? new Date(toInput.value) : null;
      const catVal = catSelect.value;

      const filtered = allTx.filter((tx) => {
        const d = new Date(tx.date);
        if (fromVal && d < fromVal) return false;
        if (toVal && d > new Date(toVal.getTime() + 24 * 60 * 60 * 1000))
          return false;
        const catName = tx.category?.name || "";
        if (catVal && catName !== catVal) return false;
        return true;
      });

      filtered.forEach((tx) => {
        const tr = document.createElement("tr");
        const d = new Date(tx.date);
        const dateStr = d.toLocaleString("it-IT");
        const amountStr =
          (tx.amount >= 0 ? "+ " : "- ") +
          "€ " +
          Math.abs(tx.amount).toFixed(2);
        const catName = tx.category?.name || "";
        const catIcon = tx.category?.icon || "";

        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${tx.description || ""}</td>
          <td>${catIcon} ${catName}</td>
          <td>${amountStr}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        applyFiltersAndRender();
      });
    }

    await loadTransactions();
  });
}

// ======================
// PAGINA CATEGORIE
// ======================
if (isCategoriesPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.getElementById("cat-table-body");
    const form = document.getElementById("cat-form");
    const nameInput = document.getElementById("cat-name");
    const iconInput = document.getElementById("cat-icon");
    const msgBox = document.getElementById("cat-message");

    if (!tbody) return;

    async function loadCategories() {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        if (!res.ok) throw new Error("Errore API categorie");
        const cats = await res.json();

        tbody.innerHTML = "";
        cats.forEach((c) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.icon || ""}</td>
            <td>${c.name}</td>
          `;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msgBox.textContent = "";

        const name = nameInput.value.trim();
        const icon = iconInput.value.trim();

        if (!name) {
          msgBox.textContent = "Il nome della categoria è obbligatorio.";
          msgBox.style.color = "#f97373";
          return;
        }

        try {
          const res = await fetch(`${API_URL}/api/categories`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, icon }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Errore creazione categoria");
          }

          msgBox.textContent = "Categoria creata ✅";
          msgBox.style.color = "#4ade80";
          form.reset();
          await loadCategories();
        } catch (err) {
          console.error(err);
          msgBox.textContent = "Errore nel salvataggio.";
          msgBox.style.color = "#f97373";
        }
      });
    }

    await loadCategories();
  });
}
