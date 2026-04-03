<?php
ob_start();
require_once dirname(__DIR__) . '/config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$comment_id = $data['comment_id'] ?? null;
$user_id = $data['user_id'] ?? null;
$active = $data['active'] ?? 0;

if (!$comment_id || !$user_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing comment_id or user_id"]);
    exit;
}

try {
    // Only the owner of the comment can toggle the invite
    $stmt = $pdo->prepare("UPDATE comments SET invite_link_active = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$active ? 1 : 0, $comment_id, $user_id]);
    
    ob_clean();
    echo json_encode(["status" => "success"]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
