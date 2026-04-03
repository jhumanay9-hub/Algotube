<?php
ob_start();
require_once '../config/db.php';

$video_id = $_GET['video_id'] ?? null;
$user_id = $_GET['user_id'] ?? null;

if (!$video_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["error" => "video_id is required"]);
    exit;
}

try {
    // Get active watch parties for this video
    $stmt = $pdo->prepare("SELECT room_code, host_id, status FROM watch_parties WHERE video_id = ? AND status = 'active'");
    $stmt->execute([$video_id]);
    $watch_parties = $stmt->fetchAll();

    // Get pending invitations for this user
    $invitations = [];
    if ($user_id) {
        $stmt = $pdo->prepare("SELECT room_code, sender_id, status FROM invitations WHERE receiver_id = ? AND status = 'pending'");
        $stmt->execute([$user_id]);
        $invitations = $stmt->fetchAll();
    }

    ob_clean();
    echo json_encode([
        "watch_parties" => $watch_parties,
        "invitations" => $invitations
    ]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["error" => "Database Error", "details" => $e->getMessage()]);
}
