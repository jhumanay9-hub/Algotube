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

// Error Logging: MUST be at the very top before any output
error_reporting(E_ALL);
ini_set('display_errors', 1);

ob_start();
require_once dirname(__DIR__) . '/config/db.php';

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:9002");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Parameter Check: Validate and sanitize user_id
$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["error" => "Missing user_id parameter"]);
    exit;
}

// Validate user_id is numeric
if (!is_numeric($user_id)) {
    ob_clean();
    http_response_code(400);
    echo json_encode(["error" => "Invalid user_id: must be a number"]);
    exit;
}

try {
    // Database Validation: Use correct column names for the actual table structure
    // Table private_rooms has: creator_id, invited_id, room_token (NOT user_a, user_b, room_code)
    $stmt = $pdo->prepare("
        SELECT
            room_token as room_code,
            creator_id as user_a,
            invited_id as user_b,
            status
        FROM private_rooms
        WHERE creator_id = ? OR invited_id = ?
    ");
    $stmt->execute([$user_id, $user_id]);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ensure we always return a valid JSON array (even if empty)
    if (!is_array($rooms)) {
        $rooms = [];
    }

    ob_clean();
    http_response_code(200);
    echo json_encode($rooms);
    exit;
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        "error" => "Database Error",
        "message" => $e->getMessage()
    ]);
    exit;
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        "error" => "General Exception",
        "message" => $e->getMessage()
    ]);
    exit;
}
?>
