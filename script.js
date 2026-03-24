let editingIndex = null;
let allRows = [];
let sortDirection = "asc";
let toastTimer = null;

const form = document.getElementById("hospitalForm");
const tableBody = document.querySelector("#hospitalDataTable tbody");
const submitButton = document.getElementById("submitButton");
const searchInput = document.getElementById("searchInput");
const sortButton = document.getElementById("sortButton");
const mobileCards = document.getElementById("mobileCards");
const emptyState = document.getElementById("emptyState");
const formStatus = document.getElementById("formStatus");
const toast = document.getElementById("toast");
const fields = [
    document.getElementById("hospital"),
    document.getElementById("doctor"),
    document.getElementById("prescription1"),
    document.getElementById("prescription2"),
    document.getElementById("prescription3")
];

window.onload = function () {
    bindEvents();
    loadTableData();
};

function bindEvents() {
    form.addEventListener("submit", handleSubmit);
    searchInput.addEventListener("input", renderRows);
    sortButton.addEventListener("click", toggleSort);

    fields.forEach((field) => {
        field.addEventListener("input", () => {
            field.classList.remove("invalid");
            if (formStatus.classList.contains("error")) {
                setFormStatus("請輸入完整資料後送出。", "");
            }
        });
    });
}

function loadTableData() {
    fetch("select.php")
        .then((response) => response.json())
        .then((data) => {
            allRows = Array.isArray(data) ? data : [];
            renderRows();
        })
        .catch((error) => {
            console.error("載入資料失敗：", error);
            setFormStatus("資料載入失敗，請稍後重試。", "error");
            showToast("資料載入失敗，請檢查後端連線。", "error");
        });
}

function renderRows() {
    const keyword = searchInput.value.trim().toLowerCase();
    const visibleRows = allRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => {
            const hospital = String(row.hospital || "").toLowerCase();
            const doctor = String(row.doctor || "").toLowerCase();
            return !keyword || hospital.includes(keyword) || doctor.includes(keyword);
        })
        .sort((left, right) => compareDates(left.row.prescription3, right.row.prescription3));

    if (sortDirection === "desc") {
        visibleRows.reverse();
    }

    tableBody.innerHTML = "";
    mobileCards.innerHTML = "";

    visibleRows.forEach(({ row, index }) => {
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td>${escapeHtml(row.hospital)}</td>
            <td>${escapeHtml(row.doctor)}</td>
            <td>${escapeHtml(row.prescription1)}</td>
            <td>${escapeHtml(row.prescription2)}</td>
            <td>${escapeHtml(row.prescription3)}</td>
            <td><button type="button" class="table-action">編輯</button></td>
        `;

        newRow.querySelector(".table-action").addEventListener("click", () => startEdit(index));

        const card = document.createElement("article");
        card.className = "mobile-card";
        card.innerHTML = `
            <h3>${escapeHtml(row.hospital)}</h3>
            <p>醫師：${escapeHtml(row.doctor)}</p>
            <p>處方簽一：${escapeHtml(row.prescription1)}</p>
            <p>處方簽二：${escapeHtml(row.prescription2)}</p>
            <p>回診日期：${escapeHtml(row.prescription3)}</p>
            <button type="button" class="table-action">編輯</button>
        `;
        card.querySelector(".table-action").addEventListener("click", () => startEdit(index));
        mobileCards.appendChild(card);
    });

    emptyState.hidden = visibleRows.length > 0;
}

function handleSubmit(event) {
    event.preventDefault();

    const values = getFormValues();
    if (!validateForm(values)) {
        return;
    }

    submitButton.disabled = true;
    setFormStatus(editingIndex !== null ? "更新中..." : "新增中...", "");

    const formData = new FormData();
    formData.append("hospital", values.hospital);
    formData.append("doctor", values.doctor);
    formData.append("prescription1", values.prescription1);
    formData.append("prescription2", values.prescription2);
    formData.append("prescription3", values.prescription3);

    updateLocalRow(values);

    fetch("insert.php", {
        method: "POST",
        body: formData
    })
        .then((response) => response.text())
        .then(() => {
            loadTableData();
            form.reset();
            editingIndex = null;
            submitButton.textContent = "新增";
            setFormStatus("資料已成功送出。", "success");
            showToast("儲存成功", "success");
        })
        .catch((error) => {
            console.error("資料送出失敗：", error);
            setFormStatus("資料送出失敗，請稍後重試。", "error");
            showToast("儲存失敗", "error");
        })
        .finally(() => {
            submitButton.disabled = false;
        });
}

function validateForm(values) {
    let firstInvalidField = null;

    fields.forEach((field) => field.classList.remove("invalid"));

    Object.entries(values).forEach(([key, value], index) => {
        if (!value) {
            fields[index].classList.add("invalid");
            if (!firstInvalidField) {
                firstInvalidField = fields[index];
            }
        }
    });

    if (values.prescription1 && values.prescription2 && values.prescription1 > values.prescription2) {
        document.getElementById("prescription1").classList.add("invalid");
        document.getElementById("prescription2").classList.add("invalid");
        firstInvalidField = firstInvalidField || document.getElementById("prescription1");
        setFormStatus("處方簽一日期不能晚於處方簽二日期。", "error");
        return focusInvalid(firstInvalidField);
    }

    if (values.prescription2 && values.prescription3 && values.prescription2 > values.prescription3) {
        document.getElementById("prescription2").classList.add("invalid");
        document.getElementById("prescription3").classList.add("invalid");
        firstInvalidField = firstInvalidField || document.getElementById("prescription2");
        setFormStatus("回診日期不能早於處方簽二日期。", "error");
        return focusInvalid(firstInvalidField);
    }

    if (firstInvalidField) {
        setFormStatus("請完整填寫所有欄位。", "error");
        return focusInvalid(firstInvalidField);
    }

    return true;
}

function focusInvalid(field) {
    field.focus();
    showToast("請先修正表單內容。", "error");
    return false;
}

function updateLocalRow(values) {
    if (editingIndex !== null) {
        allRows[editingIndex] = values;
    } else {
        allRows.push(values);
    }
}

function startEdit(index) {
    editingIndex = index;
    fillForm(allRows[index]);
}

function fillForm(rowData) {
    document.getElementById("hospital").value = rowData.hospital || "";
    document.getElementById("doctor").value = rowData.doctor || "";
    document.getElementById("prescription1").value = rowData.prescription1 || "";
    document.getElementById("prescription2").value = rowData.prescription2 || "";
    document.getElementById("prescription3").value = rowData.prescription3 || "";
    submitButton.textContent = "更新";
    setFormStatus("已帶入資料，可以直接更新。", "");
    document.getElementById("hospital").focus();
}

function toggleSort() {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    sortButton.dataset.sort = sortDirection;
    sortButton.textContent = sortDirection === "asc" ? "日期排序：舊到新" : "日期排序：新到舊";
    renderRows();
}

function compareDates(a, b) {
    const timeA = new Date(a || "9999-12-31").getTime();
    const timeB = new Date(b || "9999-12-31").getTime();
    return timeA - timeB;
}

function getFormValues() {
    return {
        hospital: document.getElementById("hospital").value.trim(),
        doctor: document.getElementById("doctor").value.trim(),
        prescription1: document.getElementById("prescription1").value.trim(),
        prescription2: document.getElementById("prescription2").value.trim(),
        prescription3: document.getElementById("prescription3").value.trim()
    };
}

function setFormStatus(message, type) {
    formStatus.textContent = message;
    formStatus.className = `form-status${type ? ` ${type}` : ""}`;
}

function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.hidden = false;
    toast.textContent = message;
    toast.className = `toast ${type}`;

    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 2400);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
