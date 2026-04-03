<?php
ob_start();
header('Content-Type: application/json');
require_once dirname(__DIR__) . '/config/db.php';

// Parameters
$type = $_GET['type'] ?? 'public'; // public, party, private
$id = $_GET['id'] ?? null; // video_id for public, room_code for party/private

if (!$id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing ID (video_id or room_code)"]);
    exit;
}

try {
    $results = [];
    
    if ($type === 'public') {
        // Fetch comments for a specific video
        $stmt = $pdo->prepare("
            SELECT c.id, c.user_id, c.text as content, c.invite_link_active, c.created_at, 
                   u.username, u.avatar_url 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.video_id = ? 
            ORDER BY c.created_at DESC
        ");
        $stmt->execute([$id]);
        $results = $stmt->fetchAll();
    } 
    elseif ($type === 'party') {
        // Fetch messages for a watch party room
        $stmt = $pdo->prepare("
            SELECT rm.id, rm.user_id, rm.content, rm.created_at, 
                   u.username, u.avatar_url 
            FROM room_messages rm 
            JOIN users u ON rm.user_id = u.id 
            WHERE rm.room_code = ? 
            ORDER BY rm.created_at ASC
        ");
        $stmt->execute([$id]);
        $results = $stmt->fetchAll();
    } 
    elseif ($type === 'private') {
        // Fetch messages for a 1-on-1 private mesh
        $stmt = $pdo->prepare("
            SELECT pm.id, pm.user_id, pm.content, pm.created_at, 
                   u.username, u.avatar_url 
            FROM private_messages pm 
            JOIN users u ON pm.user_id = u.id 
            WHERE pm.room_code = ? 
            ORDER BY pm.created_at ASC
        ");
        $stmt->execute([$id]);
        $results = $stmt->fetchAll();
    }

    ob_clean();
    echo json_encode($results);

} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
