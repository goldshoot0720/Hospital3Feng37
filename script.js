const state = {
    records: [],
    editingRecordKey: null
};

const elements = {
    form: document.getElementById("hospitalForm"),
    tableBody: document.querySelector("#hospitalDataTable tbody"),
    mobileCards: document.getElementById("mobileCards"),
    emptyState: document.getElementById("emptyState"),
    searchInput: document.getElementById("searchInput"),
    statusFilter: document.getElementById("statusFilter"),
    submitButton: document.getElementById("submitButton"),
    cancelEditButton: document.getElementById("cancelEditButton"),
    formTitle: document.getElementById("formTitle"),
    formHint: document.getElementById("formHint"),
    totalRecords: document.getElementById("totalRecords"),
    dueSoonCount: document.getElementById("dueSoonCount"),
    overdueCount: document.getElementById("overdueCount"),
    nextDate: document.getElementById("nextDate"),
    todayStatus: document.getElementById("todayStatus"),
    riskStatus: document.getElementById("riskStatus"),
    insightList: document.getElementById("insightList")
};

window.addEventListener("load", () => {
    bindEvents();
    loadTableData();
});

function bindEvents() {
    elements.form.addEventListener("submit", handleFormSubmit);
    elements.searchInput.addEventListener("input", renderDashboard);
    elements.statusFilter.addEventListener("change", renderDashboard);
    elements.cancelEditButton.addEventListener("click", resetFormState);
}

function loadTableData() {
    fetch("select.php")
        .then((response) => response.json())
        .then((data) => {
            state.records = Array.isArray(data) ? data : [];
            renderDashboard();
        })
        .catch(() => {
            state.records = [];
            renderDashboard();
            setInsightMessages([
                "資料目前無法從伺服器載入，請確認 `select.php` 與資料庫連線狀態。",
                "介面仍可輸入新資料，但需先排除後端連線問題才能完成同步。"
            ]);
            elements.todayStatus.textContent = "載入失敗";
            elements.riskStatus.textContent = "請檢查資料源";
        });
}

function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(elements.form);
    const draft = Object.fromEntries(formData.entries());

    const submitLabel = state.editingRecordKey ? "更新中..." : "儲存中...";
    elements.submitButton.textContent = submitLabel;
    elements.submitButton.disabled = true;

    fetch("insert.php", {
        method: "POST",
        body: formData
    })
        .then((response) => response.text())
        .then(() => {
            upsertLocalRecord(draft);
            resetFormState();
            renderDashboard();
        })
        .catch(() => {
            elements.formHint.textContent = "儲存失敗，請確認後端連線或稍後重試。";
        })
        .finally(() => {
            elements.submitButton.disabled = false;
            elements.submitButton.textContent = "儲存紀錄";
        });
}

function upsertLocalRecord(record) {
    const nextRecord = sanitizeRecord(record);
    const index = state.records.findIndex((item) => getRecordKey(item) === (state.editingRecordKey || getRecordKey(nextRecord)));

    if (index >= 0) {
        state.records[index] = nextRecord;
        return;
    }

    state.records.unshift(nextRecord);
}

function renderDashboard() {
    const filteredRecords = getFilteredRecords();
    const analytics = getAnalytics(state.records);

    renderTable(filteredRecords);
    renderCards(filteredRecords);
    renderStats(analytics);
    renderInsights(analytics);
    elements.emptyState.hidden = filteredRecords.length > 0;
}

function renderTable(records) {
    elements.tableBody.innerHTML = "";

    records.forEach((record) => {
        const tr = document.createElement("tr");
        const meta = getRecordMeta(record);

        tr.innerHTML = `
            <td>
                <div class="row-main">
                    <span class="row-title">${escapeHtml(record.hospital)}</span>
                    <span class="row-subtitle">${escapeHtml(record.doctor)}</span>
                </div>
            </td>
            <td>${escapeHtml(record.doctor)}</td>
            <td>${renderDateChip(record.prescription1, "A")}</td>
            <td>${renderDateChip(record.prescription2, "B")}</td>
            <td>${renderDateChip(record.prescription3, "追蹤")}</td>
            <td><span class="status-badge ${meta.statusClass}">${meta.statusLabel}</span></td>
            <td><button type="button" class="table-action" data-edit-key="${escapeHtml(getRecordKey(record))}">編輯</button></td>
        `;

        elements.tableBody.appendChild(tr);
    });

    elements.tableBody.querySelectorAll("[data-edit-key]").forEach((button) => {
        button.addEventListener("click", () => startEdit(button.dataset.editKey));
    });
}

function renderCards(records) {
    elements.mobileCards.innerHTML = "";

    records.forEach((record) => {
        const meta = getRecordMeta(record);
        const article = document.createElement("article");
        article.className = "mobile-card";
        article.innerHTML = `
            <div class="mobile-card-top">
                <div class="row-main">
                    <span class="row-title">${escapeHtml(record.hospital)}</span>
                    <span class="row-subtitle">${escapeHtml(record.doctor)}</span>
                </div>
                <span class="status-badge ${meta.statusClass}">${meta.statusLabel}</span>
            </div>
            <div class="mobile-card-dates">
                ${renderDateChip(record.prescription1, "A")}
                ${renderDateChip(record.prescription2, "B")}
                ${renderDateChip(record.prescription3, "追蹤")}
            </div>
            <div class="mobile-card-footer">
                <span class="row-subtitle">${meta.detail}</span>
                <button type="button" class="table-action" data-edit-key="${escapeHtml(getRecordKey(record))}">編輯</button>
            </div>
        `;

        elements.mobileCards.appendChild(article);
    });

    elements.mobileCards.querySelectorAll("[data-edit-key]").forEach((button) => {
        button.addEventListener("click", () => startEdit(button.dataset.editKey));
    });
}

function renderStats(analytics) {
    elements.totalRecords.textContent = String(analytics.total);
    elements.dueSoonCount.textContent = String(analytics.attention);
    elements.overdueCount.textContent = String(analytics.overdue);
    elements.nextDate.textContent = analytics.nextUpcoming || "-";
    elements.todayStatus.textContent = analytics.total > 0 ? "監測中" : "等待資料";
    elements.riskStatus.textContent = analytics.overdue > 0 ? `${analytics.overdue} 筆需立即處理` : "未偵測到高風險";
}

function renderInsights(analytics) {
    const messages = [];

    if (analytics.total === 0) {
        messages.push("目前尚未有資料，建議先建立本週需要追蹤的院所與醫師排程。");
    } else {
        messages.push(`目前共有 ${analytics.total} 筆紀錄，其中 ${analytics.stable} 筆維持穩定節奏。`);
    }

    if (analytics.overdue > 0) {
        messages.push(`已有 ${analytics.overdue} 筆紀錄逾期，優先處理最接近今天之前的回診或處方日期。`);
    } else {
        messages.push("目前沒有逾期項目，整體追蹤節奏維持在可控範圍。");
    }

    if (analytics.attention > 0) {
        messages.push(`接下來七天內有 ${analytics.attention} 筆即將到期，建議提早安排聯繫與確認。`);
    } else {
        messages.push("未來七天沒有緊迫節點，可將重點放在新增或整理既有資料。");
    }

    setInsightMessages(messages);
}

function setInsightMessages(messages) {
    elements.insightList.innerHTML = messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("");
}

function startEdit(recordKey) {
    const record = state.records.find((item) => getRecordKey(item) === recordKey);

    if (!record) {
        return;
    }

    document.getElementById("hospital").value = record.hospital || "";
    document.getElementById("doctor").value = record.doctor || "";
    document.getElementById("prescription1").value = record.prescription1 || "";
    document.getElementById("prescription2").value = record.prescription2 || "";
    document.getElementById("prescription3").value = record.prescription3 || "";

    state.editingRecordKey = recordKey;
    elements.formTitle.textContent = "編輯診療紀錄";
    elements.formHint.textContent = "你正在編輯現有資料，儲存後畫面會立即更新。";
    elements.submitButton.textContent = "更新紀錄";
    elements.cancelEditButton.hidden = false;
    document.getElementById("record-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFormState() {
    state.editingRecordKey = null;
    elements.form.reset();
    elements.formTitle.textContent = "新增診療紀錄";
    elements.formHint.textContent = "輸入完成後會即時刷新右側紀錄與摘要。";
    elements.submitButton.textContent = "儲存紀錄";
    elements.cancelEditButton.hidden = true;
}

function getFilteredRecords() {
    const keyword = elements.searchInput.value.trim().toLowerCase();
    const statusFilter = elements.statusFilter.value;

    return state.records
        .map(sanitizeRecord)
        .filter((record) => {
            const meta = getRecordMeta(record);
            const matchesKeyword = !keyword
                || record.hospital.toLowerCase().includes(keyword)
                || record.doctor.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === "all" || meta.statusClass === statusFilter;
            return matchesKeyword && matchesStatus;
        })
        .sort((left, right) => getNearestTimestamp(left) - getNearestTimestamp(right));
}

function getAnalytics(records) {
    const metas = records.map((record) => getRecordMeta(sanitizeRecord(record)));
    const nextUpcomingMeta = metas
        .map((meta) => meta.nextTimestamp)
        .filter((timestamp) => Number.isFinite(timestamp))
        .sort((a, b) => a - b)[0];

    return {
        total: records.length,
        overdue: metas.filter((meta) => meta.statusClass === "overdue").length,
        attention: metas.filter((meta) => meta.statusClass === "attention").length,
        stable: metas.filter((meta) => meta.statusClass === "stable").length,
        nextUpcoming: Number.isFinite(nextUpcomingMeta) ? formatDate(new Date(nextUpcomingMeta).toISOString().slice(0, 10)) : "-"
    };
}

function getRecordMeta(record) {
    const timestamps = [record.prescription1, record.prescription2, record.prescription3]
        .map((value) => parseDate(value))
        .filter((date) => date instanceof Date)
        .map((date) => normalizeDate(date).getTime())
        .sort((a, b) => a - b);

    const today = normalizeDate(new Date()).getTime();
    const nextTimestamp = timestamps.find((timestamp) => timestamp >= today);
    const lastTimestamp = timestamps[timestamps.length - 1];
    const daysUntilNext = Number.isFinite(nextTimestamp) ? Math.round((nextTimestamp - today) / 86400000) : null;

    if (!Number.isFinite(nextTimestamp) && Number.isFinite(lastTimestamp) && lastTimestamp < today) {
        return {
            statusClass: "overdue",
            statusLabel: "已逾期",
            nextTimestamp,
            detail: "最後一個追蹤節點已早於今天"
        };
    }

    if (daysUntilNext !== null && daysUntilNext <= 7) {
        return {
            statusClass: "attention",
            statusLabel: "七日內到期",
            nextTimestamp,
            detail: `最近節點還有 ${daysUntilNext} 天`
        };
    }

    return {
        statusClass: "stable",
        statusLabel: "穩定",
        nextTimestamp,
        detail: daysUntilNext === null ? "暫無可判斷日期" : `最近節點還有 ${daysUntilNext} 天`
    };
}

function renderDateChip(value, label) {
    const formatted = value ? formatDate(value) : "未設定";
    return `<span class="date-chip">${escapeHtml(label)} · ${escapeHtml(formatted)}</span>`;
}

function getNearestTimestamp(record) {
    const meta = getRecordMeta(record);
    return Number.isFinite(meta.nextTimestamp) ? meta.nextTimestamp : Number.MAX_SAFE_INTEGER;
}

function getRecordKey(record) {
    return [record.hospital, record.doctor, record.prescription1, record.prescription2, record.prescription3].join("::");
}

function sanitizeRecord(record) {
    return {
        hospital: (record.hospital || "").trim(),
        doctor: (record.doctor || "").trim(),
        prescription1: (record.prescription1 || "").trim(),
        prescription2: (record.prescription2 || "").trim(),
        prescription3: (record.prescription3 || "").trim()
    };
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

function formatDate(value) {
    const date = parseDate(value);

    if (!date) {
        return value || "-";
    }

    return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
