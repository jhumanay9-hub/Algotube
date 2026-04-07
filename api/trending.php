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
header("Content-Type: application/json");

// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "GET method required"]);
    exit();
}

try {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;

    // Weighted Scoring Algorithm:
    // Score = (Likes * 2) + Views + (HoursSinceUpload * -0.5)
    // Uses TIMESTAMPDIFF for server-side time calculation
    // LOWER() ensures case-insensitive matching in search
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
                u.avatar_url,
                ((v.likes * 2) + v.views + (TIMESTAMPDIFF(HOUR, v.created_at, NOW()) * -0.5)) AS trending_score
            FROM videos v
            JOIN users u ON v.user_id = u.id
            ORDER BY trending_score DESC
            LIMIT ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit]);
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($videos)) {
        echo json_encode([]);
        exit();
    }

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
        "error" => "General Exception",
        "details" => $e->getMessage()
    ]);
    exit();
}
?>
