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

// Handle GET requests (checking like status)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_GET['userId'] ?? null;
    $video_id = $_GET['videoId'] ?? null;

    try {
        // Case 1: Get ALL liked video IDs for a user (for liked page)
        if ($user_id && !$video_id) {
            $stmt = $pdo->prepare("SELECT video_id FROM likes WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $likedVideos = $stmt->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode($likedVideos);
            exit();
        }

        // Case 2: Check if user has liked a specific video (for video page)
        if ($user_id && $video_id) {
            $stmt = $pdo->prepare("SELECT id FROM likes WHERE user_id = ? AND video_id = ?");
            $stmt->execute([$user_id, $video_id]);
            $like = $stmt->fetch();

            echo json_encode([
                'active' => $like !== false,
                'count' => 0
            ]);
            exit();
        }

        http_response_code(400);
        echo json_encode(['error' => 'Missing userId parameter']);

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Database query failed',
            'details' => $e->getMessage()
        ]);
    }
}

// Handle POST requests (toggling like status)
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
        // Check if like already exists
        $checkStmt = $pdo->prepare("SELECT id FROM likes WHERE user_id = ? AND video_id = ?");
        $checkStmt->execute([$userId, $videoId]);
        $existingLike = $checkStmt->fetch();

        if ($existingLike) {
            // Unlike: Remove the like
            $deleteStmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND video_id = ?");
            $deleteStmt->execute([$userId, $videoId]);
            $active = false;
        } else {
            // Like: Add the like
            $insertStmt = $pdo->prepare("INSERT INTO likes (user_id, video_id) VALUES (?, ?)");
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
