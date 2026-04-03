<?php
ob_start();
require_once '../config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$video_id = $data['video_id'] ?? ($data['videoId'] ?? null);
$user_id = $data['user_id'] ?? ($data['userId'] ?? null);
$content = $data['content'] ?? null;

if (!$user_id || !$content || !$video_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO comments (video_id, user_id, text) VALUES (?, ?, ?)");
    $stmt->execute([$video_id, $user_id, $content]);

    ob_clean();
    echo json_encode(["status" => "success"]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
