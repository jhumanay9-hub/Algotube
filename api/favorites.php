<?php
// Universal CORS Header Fix - MUST be at the very top
header("Access-Control-Allow-Origin: http://localhost:9002");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle the Preflight (OPTIONS) request specifically
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/db.php';

// Handle GET requests (checking favorite status)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_GET['userId'] ?? null;
    $video_id = $_GET['videoId'] ?? null;

    if ($user_id && $video_id) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM favorites WHERE user_id = ? AND video_id = ? LIMIT 1");
            $stmt->execute([$user_id, $video_id]);
            $favorite = $stmt->fetch();

            echo json_encode([
                'active' => $favorite !== false,
                'count' => 0
            ]);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'error' => 'Database query failed',
                'details' => $e->getMessage()
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId or videoId parameter']);
    }
}

// Handle POST requests (toggling favorite status)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // JSON Body Handling - Read from php://input
    $input = json_decode(file_get_contents("php://input"), true);
    $userId = $input['userId'] ?? null;
    $videoId = $input['videoId'] ?? null;

    if (!$userId || !$videoId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId or videoId']);
        exit();
    }

    try {
        // Check if favorite already exists
        $checkStmt = $pdo->prepare("SELECT id FROM favorites WHERE user_id = ? AND video_id = ? LIMIT 1");
        $checkStmt->execute([$userId, $videoId]);
        $existingFavorite = $checkStmt->fetch();

        if ($existingFavorite) {
            // Remove favorite
            $deleteStmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND video_id = ?");
            $deleteStmt->execute([$userId, $videoId]);
            $active = false;
        } else {
            // Add favorite
            $insertStmt = $pdo->prepare("INSERT INTO favorites (user_id, video_id) VALUES (?, ?)");
            $insertStmt->execute([$userId, $videoId]);
            $active = true;
        }

        echo json_encode(['active' => $active, 'success' => true]);
        exit();

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Database operation failed',
            'details' => $e->getMessage()
        ]);
    }
}
?>
