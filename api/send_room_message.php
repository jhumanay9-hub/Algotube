<?php
ob_start();
require_once '../config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$room_code = $data['room_code'] ?? ($data['roomId'] ?? null);
$user_id = $data['user_id'] ?? ($data['userId'] ?? null);
$content = $data['content'] ?? null;

if (!$user_id || !$content || !$room_code) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO room_messages (room_code, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$room_code, $user_id, $content]);

    ob_clean();
    echo json_encode(["status" => "success"]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
