<?php
header('Content-Type: application/json; charset=utf-8');

$servername = "sql308.infinityfree.com";
$username = "if0_38773595";
$password = "fi0Tagood129";
$dbname = "if0_38773595_feng2025";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error], JSON_UNESCAPED_UNICODE));
}

$conn->set_charset("utf8mb4");

// Modify the SQL query to include ORDER BY prescription1
$sql = "SELECT * FROM hospital3data3 ORDER BY prescription1";  // Default is ASC (ascending order)
$result = $conn->query($sql);

$hospital_data = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $hospital_data[] = $row;
    }
}

echo json_encode($hospital_data, JSON_UNESCAPED_UNICODE);

$conn->close();
?>
