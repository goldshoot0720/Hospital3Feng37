<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

$servername = "sql308.infinityfree.com";
$username = "if0_38773595";
$password = "fi0Tagood129";
$dbname = "if0_38773595_feng2025";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error], JSON_UNESCAPED_UNICODE));
}

$conn->set_charset("utf8mb4");

$hospital = $_POST['hospital'] ?? '';
$doctor = $_POST['doctor'] ?? '';
$prescription1 = $_POST['prescription1'] ?? '';
$prescription2 = $_POST['prescription2'] ?? '';
$prescription3 = $_POST['prescription3'] ?? '';

if ($hospital === '' || $doctor === '' || $prescription1 === '' || $prescription2 === '' || $prescription3 === '') {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields."], JSON_UNESCAPED_UNICODE);
    exit;
}

$query = "DELETE FROM hospital3data3
          WHERE hospital = ?
          AND doctor = ?
          AND prescription1 = ?
          AND prescription2 = ?
          AND prescription3 = ?
          LIMIT 1";

$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    die(json_encode(["error" => "Prepare failed: " . $conn->error], JSON_UNESCAPED_UNICODE));
}

$stmt->bind_param("sssss", $hospital, $doctor, $prescription1, $prescription2, $prescription3);
$stmt->execute();

echo json_encode([
    "success" => $stmt->affected_rows > 0
], JSON_UNESCAPED_UNICODE);

$stmt->close();
$conn->close();
?>
