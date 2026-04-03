<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    die(json_encode(["error" => "GET method required"]));
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

    // Explicit Table Size Check: Yield an empty JSON array if nothing exists instead of crashing clients
    if (empty($videos)) {
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([]);
        exit();
    }

    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode($videos);
    exit();
} catch (\PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "PDO Query Runtime Logic Failed", "details" => $e->getMessage()]));
}
?>
