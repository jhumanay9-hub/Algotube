<?php
ob_start();
require_once '../config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$video_id = $data['video_id'] ?? null;
$host_id = $data['host_id'] ?? null;
$room_name = $data['name'] ?? 'Main Lobby';

if (!$video_id || !$host_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing video_id or host_id"]);
    exit;
}

// Generate unique room code
$room_code = strtoupper(str_replace(' ', '_', $room_name)) . '_' . rand(1000, 9999);

try {
    $stmt = $pdo->prepare("INSERT INTO watch_parties (video_id, room_code, host_id, status) VALUES (?, ?, ?, 'active')");
    $stmt->execute([$video_id, $room_code, $host_id]);
    
    ob_clean();
    echo json_encode(["status" => "success", "room_code" => $room_code]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
