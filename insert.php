<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$servername = "sql308.infinityfree.com";
$username = "if0_38773595";
$password = "fi0Tagood129";
$dbname = "if0_38773595_feng2025";

// 建立連線
$conn = new mysqli($servername, $username, $password, $dbname);

// 檢查連線
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 取得 POST 資料
$data = [
    'hospital' => $_POST['hospital'] ?? '',
    'doctor' => $_POST['doctor'] ?? '',
    'prescription1' => $_POST['prescription1'] ?? '',
    'prescription2' => $_POST['prescription2'] ?? '',
    'prescription3' => $_POST['prescription3'] ?? ''
];

// 過濾空值
$data = array_filter($data, function($value) {
    return $value !== '';
});

if (empty($data)) {
    echo "無有效資料可儲存";
    exit;
}

// 動態產生欄位與參數
$columns = array_keys($data);
$placeholders = array_fill(0, count($columns), '?');

// INSERT 語法
$query = "INSERT INTO hospital3data3 (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";

// 加入 ON DUPLICATE KEY UPDATE
$updates = [];
foreach ($columns as $col) {
    $updates[] = "$col = VALUES($col)";
}
$query .= " ON DUPLICATE KEY UPDATE " . implode(', ', $updates);

// 預備與綁定
$stmt = $conn->prepare($query);
if (!$stmt) {
    die("Prepare failed: " . $conn->error);
}

$types = str_repeat('s', count($data));
$stmt->bind_param($types, ...array_values($data));

// 執行
if ($stmt->execute()) {
    echo "資料成功儲存（新增或更新）";
} else {
    echo "錯誤：" . $stmt->error;
}

// 關閉
$stmt->close();
$conn->close();
?>
