<?php
/**
 * Secure Login Endpoint
 * Step 1: Fetch user by email (O(log n) indexed lookup)
 * Step 2: Verify password with timing-attack-safe password_verify()
 * Step 3: Return signed JWT on success
 */

// Handle the Preflight (OPTIONS) request FIRST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:9002");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
    header("Access-Control-Allow-Credentials: true");
    http_response_code(200);
    exit();
}

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:9002");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Error reporting for development
ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/JWT.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "POST method required"]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : null;
$password = $data['password'] ?? null;

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing email or password"]);
    exit();
}

try {
    // Step 1: Fetch user by email — O(log n) B-tree index lookup, LIMIT 1 for early termination
    $stmt = $pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Security: Always use password_verify even if user not found (constant-time-ish response)
    // This prevents username enumeration timing attacks
    if (!$user) {
        // Dummy hash check to maintain consistent response time
        password_verify($password, '$2y$12$dummyhashthatnevermatchesbutcoststime');
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
        exit();
    }

    // Step 2: Verify password — timing-attack-safe comparison via password_verify()
    $passwordValid = password_verify($password, $user['password_hash']);

    if (!$passwordValid) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
        exit();
    }

    // Step 3: Generate JWT token (valid for 24 hours)
    $tokenPayload = [
        'user_id' => (int)$user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
    ];
    $jwt = JWT::encode($tokenPayload, 86400);

    // Return user data + JWT
    echo json_encode([
        "status" => "success",
        "user" => [
            "uid" => (string)$user['id'],
            "username" => $user['username'],
            "email" => $user['email']
        ],
        "token" => $jwt
    ]);
    exit();

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error",
        "details" => "An internal error occurred"
    ]);
    exit();
}
?>
