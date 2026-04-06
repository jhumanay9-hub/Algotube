<?php
// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS Headers
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: http://localhost:9002');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if (!isset($_FILES['video']) || empty($_FILES['video']['name'])) {
    http_response_code(400);
    echo json_encode(["error" => "No file received"]);
    exit();
}

$uploadDirectory = dirname(__DIR__) . '/uploads/videos';
if (!is_dir($uploadDirectory)) {
    if (!mkdir($uploadDirectory, 0777, true)) {
        http_response_code(500);
        echo json_encode(["error" => "Upload directory missing"]);
        exit();
    }
}

$user_id = $_POST['user_id'] ?? 1;
$title = $_POST['title'] ?? 'Untitled Video';
$description = $_POST['description'] ?? '';

$file = $_FILES['video'];
$tmp_name = $file['tmp_name'];
$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

$finalFilename = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME)) . '_' . time() . '.' . $extension;
$destination = $uploadDirectory . '/' . $finalFilename;

if (move_uploaded_file($tmp_name, $destination)) {
    $publicPath = '/Algotube/uploads/videos/' . $finalFilename;

    try {
        $stmt = $pdo->prepare("INSERT INTO videos (user_id, title, description, file_path) VALUES (?, ?, ?, ?)");
        $stmt->execute([$user_id, $title, $description, $publicPath]);

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "video" => [
                "id" => $pdo->lastInsertId(),
                "file_path" => $publicPath
            ]
        ]);
        exit();
    } catch (\PDOException $e) {
        if (file_exists($destination)) {
            unlink($destination);
        }
        http_response_code(500);
        echo json_encode([
            "error" => "Database insertion failed",
            "details" => $e->getMessage()
        ]);
        exit();
    }
} else {
    http_response_code(500);
    echo json_encode([
        "error" => "Failed to move file to upload directory",
        "tmp_name" => $tmp_name,
        "destination" => $destination
    ]);
    exit();
}
?>
