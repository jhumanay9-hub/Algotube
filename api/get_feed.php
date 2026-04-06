<?php
// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS Headers
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "GET method required"]);
    exit();
}

try {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Payload Reduction: Only select columns needed for the UI
    $sql = "SELECT id, user_id, title, description, file_path, thumbnail_path, views, likes, dislikes, created_at
            FROM videos
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit, $offset]);
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
