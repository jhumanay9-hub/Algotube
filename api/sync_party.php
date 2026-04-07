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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $room_code = $data['room_code'] ?? ($data['roomId'] ?? $room_code);
    $host_id = $data['host_id'] ?? ($data['userId'] ?? null);
    $current_time = $data['current_time'] ?? 0;
    $is_paused = $data['is_paused'] ?? true;

    if (!$room_code || !$host_id) {
        ob_clean();
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing room_code or host_id"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE watch_parties SET `current_time` = ?, is_paused = ? WHERE room_code = ? AND host_id = ?");
        $stmt->execute([$current_time, $is_paused ? 1 : 0, $room_code, $host_id]);

        ob_clean();
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        ob_clean();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
    }
} else {
    // GET request
    if (!$room_code) {
        ob_clean();
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing room_code"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT host_id, `current_time`, is_paused FROM watch_parties WHERE room_code = ? LIMIT 1");
        $stmt->execute([$room_code]);
        $state = $stmt->fetch();

        ob_clean();
        echo json_encode($state ? $state : null);
    } catch (PDOException $e) {
        ob_clean();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
    }
}
