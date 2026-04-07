<?php
// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle preflight request FIRST (before any other processing)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:9002");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
    header("Access-Control-Allow-Credentials: true");
    http_response_code(200);
    exit();
}

// CORS Headers for actual requests
if (!headers_sent()) {
    header("Access-Control-Allow-Origin: http://localhost:9002");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json");
}

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "GET method required"]);
    exit();
}

try {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;

    // Linear Substring Matching Algorithm
    // Case-insensitive search scanning titles, descriptions, and tags
    if ($search && strlen($search) > 0) {
        // Use PDO prepared statements to prevent SQL injection
        $searchParam = "%" . strtolower($search) . "%";
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
                WHERE LOWER(v.title) LIKE ?
                   OR LOWER(v.description) LIKE ?
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$searchParam, $searchParam, $limit, $offset]);
    } else {
        // Standard feed - no search
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
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
    }

    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Explicit Table Size Check: Yield an empty JSON array if nothing exists
    if (empty($videos)) {
        http_response_code(200);
        echo json_encode([]);
        exit();
    }

    http_response_code(200);
    echo json_encode($videos);
    exit();
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "PDO Query Runtime Logic Failed",
        "details" => $e->getMessage(),
        "sql" => $sql ?? 'unknown'
    ]);
    exit();
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "General Exception",
        "details" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
    exit();
}
?>
