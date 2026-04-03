<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: http://localhost:9002');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['userId'] ?? 1;
$video_id = $data['videoId'] ?? null;
$type = $data['type'] ?? '';

if (!$video_id || !in_array($type, ['likes', 'dislikes', 'favorites'])) {
    http_response_code(400);
    die(json_encode(["error" => "Invalid interaction payload"]));
}

try {
    // Current MVP implementation just confirms receipt for the Optimistic UI
    // In a full build, we would upsert into a 'video_interactions' table
    
    // Quick increment for persistent engagement counters
    if ($type === 'likes') {
        $stmt = $pdo->prepare("UPDATE videos SET likes = likes + 1 WHERE id = ?");
        $stmt->execute([$video_id]);
    } else if ($type === 'dislikes') {
        $stmt = $pdo->prepare("UPDATE videos SET dislikes = dislikes + 1 WHERE id = ?");
        $stmt->execute([$video_id]);
    }

    http_response_code(200);
    echo json_encode(["status" => "success", "mesh_synced" => true, "active" => true]);
    exit();
} catch (\PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "Mesh Registry Sync Failure"]));
}
?>
