<?php
// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS Headers - Allow Next.js dev server
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: http://localhost:9002');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/../config/db.php';

try {
    // Fetch all videos with author information
    // Maps database columns to expected frontend keys
    $sql = "SELECT
                v.id,
                v.user_id,
                v.title,
                v.description,
                v.file_path,
                v.thumbnail_path,
                v.views,
                v.likes,
                v.dislikes,
                v.created_at,
                u.username AS author_name,
                u.avatar_url
            FROM videos v
            JOIN users u ON v.user_id = u.id
            ORDER BY v.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ensure we always return an array (even if empty)
    if (!is_array($videos)) {
        $videos = [];
    }

    http_response_code(200);
    echo json_encode($videos);
    exit();
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database query failed",
        "details" => $e->getMessage()
    ]);
    exit();
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "General exception",
        "details" => $e->getMessage()
    ]);
    exit();
}
?>
