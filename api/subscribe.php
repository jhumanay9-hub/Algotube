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

// Handle POST requests (subscribe/unsubscribe)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // JSON Body Handling - Read from php://input
    $input = json_decode(file_get_contents("php://input"), true);
    $followerId = $input['follower_id'] ?? $input['userId'] ?? null;
    $creatorId = $input['creator_id'] ?? $input['videoId'] ?? null;

    if (!$followerId || !$creatorId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing follower_id or creator_id']);
        exit();
    }

    try {
        // Check if subscription already exists
        $checkStmt = $pdo->prepare("SELECT id FROM subscriptions WHERE follower_id = ? AND creator_id = ?");
        $checkStmt->execute([$followerId, $creatorId]);
        $existingSub = $checkStmt->fetch();

        if ($existingSub) {
            // Unsubscribe: Remove the subscription
            $deleteStmt = $pdo->prepare("DELETE FROM subscriptions WHERE follower_id = ? AND creator_id = ?");
            $deleteStmt->execute([$followerId, $creatorId]);
            $subscribed = false;
        } else {
            // Subscribe: Add the subscription
            $insertStmt = $pdo->prepare("INSERT INTO subscriptions (follower_id, creator_id) VALUES (?, ?)");
            $insertStmt->execute([$followerId, $creatorId]);
            $subscribed = true;
        }

        echo json_encode(['subscribed' => $subscribed, 'success' => true]);
        exit();

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Database operation failed',
            'details' => $e->getMessage()
        ]);
    }
}

// Handle GET requests (check subscription status or get subscriptions)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $followerId = $_GET['follower_id'] ?? $_GET['user_id'] ?? null;
    $creatorId = $_GET['creator_id'] ?? null;

    try {
        // Case 1: Check if follower is subscribed to a specific creator
        if ($followerId && $creatorId) {
            $stmt = $pdo->prepare("SELECT id FROM subscriptions WHERE follower_id = ? AND creator_id = ?");
            $stmt->execute([$followerId, $creatorId]);
            $sub = $stmt->fetch();

            echo json_encode([
                'subscribed' => $sub !== false
            ]);
            exit();
        }

        // Case 2: Get all subscriptions for a follower
        if ($followerId) {
            $stmt = $pdo->prepare("
                SELECT s.creator_id, u.username, u.avatar_url, u.email
                FROM subscriptions s
                JOIN users u ON s.creator_id = u.id
                WHERE s.follower_id = ?
                ORDER BY s.created_at DESC
            ");
            $stmt->execute([$followerId]);
            $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode($subscriptions);
            exit();
        }

        http_response_code(400);
        echo json_encode(['error' => 'Missing follower_id parameter']);

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Database query failed',
            'details' => $e->getMessage()
        ]);
    }
}
?>
