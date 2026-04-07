<?php
// Handle the Preflight (OPTIONS) request FIRST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:9002");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
    header("Access-Control-Allow-Credentials: true");
    http_response_code(200);
    exit();
}

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:9002");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
header("Access-Control-Allow-Credentials: true");

ob_start();
require_once '../config/db.php';

$room_code = $_GET['room_code'] ?? ($_GET['roomCode'] ?? ($_GET['roomId'] ?? null));

if (!$room_code) {
    ob_clean();
    echo json_encode([]);
    exit;
}

try {
    // Basic participant tracking: Just return the host for now.
    // In a real app, you'd have a 'participants' table updated on join/heartbeat.
    $stmt = $pdo->prepare("SELECT u.username, u.avatar_url FROM users u JOIN watch_parties wp ON u.id = wp.host_id WHERE wp.room_code = ?");
    $stmt->execute([$room_code]);
    $members = $stmt->fetchAll();

    ob_clean();
    echo json_encode($members);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["error" => "Database Error", "details" => $e->getMessage()]);
}
