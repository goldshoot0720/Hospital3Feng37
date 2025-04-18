let editingRow = null; // 用來跟踪正在編輯的行

// 頁面加載後自動載入資料
window.onload = function () {
    loadTableData();
};

// 載入資料到表格
function loadTableData() {
    fetch('select.php')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('hospitalDataTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // 清空表格內容

            data.forEach(row => {
                const newRow = tableBody.insertRow();
                newRow.innerHTML = `
                    <td>${row.hospital}</td>
                    <td>${row.doctor}</td>
                    <td>${row.prescription1}</td>
                    <td>${row.prescription2}</td>
                    <td>${row.prescription3}</td>
                    <td><button onclick="editRow(this)">編輯</button></td>
                `;
            });
        })
        .catch(error => {
            console.error('載入資料失敗：', error);
        });
}

// 表單提交處理
document.getElementById('hospitalForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const hospital = document.getElementById('hospital').value.trim();
    const doctor = document.getElementById('doctor').value.trim();
    const prescription1 = document.getElementById('prescription1').value.trim();
    const prescription2 = document.getElementById('prescription2').value.trim();
    const prescription3 = document.getElementById('prescription3').value.trim();

    const table = document.getElementById('hospitalDataTable').getElementsByTagName('tbody')[0];

    // 判斷是否處於編輯狀態
    if (editingRow) {
        const cells = editingRow.getElementsByTagName('td');
        cells[0].textContent = hospital;
        cells[1].textContent = doctor;
        cells[2].textContent = prescription1;
        cells[3].textContent = prescription2;
        cells[4].textContent = prescription3;
        editingRow = null;
    } else {
        const newRow = table.insertRow();
        newRow.innerHTML = `
            <td>${hospital}</td>
            <td>${doctor}</td>
            <td>${prescription1}</td>
            <td>${prescription2}</td>
            <td>${prescription3}</td>
            <td><button onclick="editRow(this)">編輯</button></td>
        `;
    }

    // 傳送資料到 insert.php
    const formData = new FormData();
    formData.append('hospital', hospital);
    formData.append('doctor', doctor);
    formData.append('prescription1', prescription1);
    formData.append('prescription2', prescription2);
    formData.append('prescription3', prescription3);

    fetch('insert.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => {
        console.log(result);
        loadTableData(); // ✅ 成功寫入後重新載入資料
    })
    .catch(error => {
        console.error('資料送出失敗：', error);
    });

    // 清空表單與按鈕文字
    document.getElementById('hospitalForm').reset();
    document.querySelector('form button').textContent = "新增";
});

// 編輯行資料
function editRow(button) {
    const row = button.parentElement.parentElement;
    const cells = row.getElementsByTagName('td');

    document.getElementById('hospital').value = cells[0].textContent;
    document.getElementById('doctor').value = cells[1].textContent;
    document.getElementById('prescription1').value = cells[2].textContent;
    document.getElementById('prescription2').value = cells[3].textContent;
    document.getElementById('prescription3').value = cells[4].textContent;

    editingRow = row;
    document.querySelector('form button').textContent = "更新";
}
