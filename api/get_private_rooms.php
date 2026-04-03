<?php
ob_start();
require_once dirname(__DIR__) . '/config/db.php';

$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing user_id"]);
    exit;
}

try {
    // Fetch rooms where this user is either user_a or user_b
    $stmt = $pdo->prepare("SELECT room_code, user_a, user_b FROM private_rooms WHERE user_a = ? OR user_b = ?");
    $stmt->execute([$user_id, $user_id]);
    $rooms = $stmt->fetchAll();
    
    ob_clean();
    echo json_encode($rooms);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
