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

ob_start();
require_once dirname(__DIR__) . '/config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$user_a = $data['user_a'] ?? null; // The joiner
$user_b = $data['user_b'] ?? null; // The comment owner

if (!$user_a || !$user_b) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing user_a or user_b"]);
    exit;
}

if ($user_a == $user_b) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Cannot start a private room with yourself"]);
    exit;
}

// Canonical room code generation: sort IDs to ensure consistency
$ids = [$user_a, $user_b];
sort($ids);
$room_code = "private_" . $ids[0] . "_" . $ids[1];

try {
    // Check if room exists — LIMIT 1 for early termination
    $stmt = $pdo->prepare("SELECT room_code FROM private_rooms WHERE room_code = ? LIMIT 1");
    $stmt->execute([$room_code]);
    $existing = $stmt->fetch();

    if (!$existing) {
        // Create new room
        $stmt = $pdo->prepare("INSERT INTO private_rooms (room_code, user_a, user_b) VALUES (?, ?, ?)");
        $stmt->execute([$room_code, $ids[0], $ids[1]]);
    }

    ob_clean();
    echo json_encode(["status" => "success", "room_code" => $room_code]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error", "details" => $e->getMessage()]);
}
?>
