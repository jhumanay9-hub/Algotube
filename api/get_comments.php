<?php
// Handle the Preflight (OPTIONS) request FIRST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:9002");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
    header("Access-Control-Allow-Credentials: true");
    http_response_code(200);
    exit();
}

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:9002");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
header("Access-Control-Allow-Credentials: true");

ob_start();
// Display errors in development (Disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../config/db.php';

if (!isset($_GET['video_id'])) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["message" => "video_id is required."]);
    exit;
}

$video_id = $_GET['video_id'];

try {
    // Join with users table to get username and avatar
    $query = "SELECT c.id, c.user_id, c.text as comment_text, c.invite_link_active, c.created_at,
                     u.username, u.avatar_url
              FROM comments c
              JOIN users u ON c.user_id = u.id
              WHERE c.video_id = :video_id
              ORDER BY c.created_at DESC";

    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':video_id', $video_id, PDO::PARAM_INT);
    $stmt->execute();

    $comments = $stmt->fetchAll();

    ob_clean();
    echo json_encode($comments);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["message" => "Database error.", "error" => $e->getMessage()]);
}
