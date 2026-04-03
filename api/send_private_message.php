<?php
ob_start();
require_once dirname(__DIR__) . '/config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$room_code = $data['room_code'] ?? null;
$user_id = $data['user_id'] ?? null;
$content = $data['content'] ?? null;

if (!$room_code || !$user_id || !$content) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing room_code, user_id or content"]);
    exit;
}

try {
    // Basic verification: room must exist
    $stmt = $pdo->prepare("SELECT id FROM private_rooms WHERE room_code = ?");
    $stmt->execute([$room_code]);
    if (!$stmt->fetch()) {
        ob_clean();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Room not found"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO private_messages (room_code, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$room_code, $user_id, $content]);
    
    ob_clean();
    echo json_encode(["status" => "success"]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
