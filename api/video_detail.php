<?php
// Force error reporting statically at the top
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once dirname(__DIR__) . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(["error" => "GET method required"]));
}

$video_id = $_GET['id'] ?? null;

if (!$video_id) {
    http_response_code(400);
    exit(json_encode(["error" => "Missing video ID parameter URL ?id="]));
}

try {
    // 1. Fetch Video + Author details (Payload Reduction: Exclude binary or internal paths)
    $vidSql = "
        SELECT 
            v.id, v.user_id, v.title, v.description, v.file_path, v.thumbnail_path, v.views, v.likes, v.dislikes, v.created_at,
            u.username AS author_name, u.avatar_url
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.id = ?
        LIMIT 1
    ";
    $stmt = $pdo->prepare($vidSql);
    $stmt->execute([$video_id]);
    $video = $stmt->fetch();

    if (!$video) {
        http_response_code(404);
        exit(json_encode(["error" => "Video corresponding to ID was not found in MySQL registry."]));
    }

    // 2. Fetch associated comments
    $comSql = "
        SELECT 
            c.id, c.text, c.created_at,
            u.username AS comment_author, u.avatar_url AS comment_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.video_id = ?
        ORDER BY c.created_at DESC
    ";
    $cStmt = $pdo->prepare($comSql);
    $cStmt->execute([$video_id]);
    $comments = $cStmt->fetchAll();

    // Attach comments to the video payload
    $video['comments'] = $comments;

    http_response_code(200);
    echo json_encode($video);
    exit();
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Relational Query failed. Ensure tables are properly structured.", "details" => $e->getMessage()]);
    exit();
} catch (\Error $e) {
    http_response_code(500);
    echo json_encode(["error" => "PHP Fatal Runtime Error", "details" => $e->getMessage()]);
    exit();
}
?>
