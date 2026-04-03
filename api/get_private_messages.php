<?php
ob_start();
require_once dirname(__DIR__) . '/config/db.php';

$room_code = $_GET['room_code'] ?? null;

if (!$room_code) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing room_code"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT pm.*, u.username, u.avatar_url 
        FROM private_messages pm 
        JOIN users u ON pm.user_id = u.id 
        WHERE pm.room_code = ? 
        ORDER BY pm.created_at ASC
    ");
    $stmt->execute([$room_code]);
    $messages = $stmt->fetchAll();
    
    ob_clean();
    echo json_encode($messages);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
