<?php
/**
 * Secure Registration Endpoint
 * Algorithm: BCrypt with cost factor 12
 * Never stores raw passwords — hashes before database insertion.
 * Returns a signed JWT on successful registration.
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
$username = isset($data['username']) ? trim($data['username']) : null;
$email = isset($data['email']) ? trim($data['email']) : null;
$password = $data['password'] ?? null;

// Input validation
if (!$username || !$email || !$password) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing username, email, or password"]);
    exit();
}

// Email format validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email format"]);
    exit();
}

// Username sanitization: alphanumeric + underscores only
$username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
if (strlen($username) < 3 || strlen($username) > 50) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Username must be 3-50 alphanumeric characters"]);
    exit();
}

// Password strength check
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters"]);
    exit();
}

try {
    // Check if email already exists — O(log n) lookup via unique index, LIMIT 1 for early exit
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Email already registered"]);
        exit();
    }

    // BCrypt Hashing with cost factor 12 (computationally expensive, resistant to brute-force)
    $hashOptions = ['cost' => 12];
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, $hashOptions);

    if ($passwordHash === false) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Password hashing failed"]);
        exit();
    }

    // Insert user with hashed password — NEVER store raw passwords
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$username, $email, $passwordHash]);
    $userId = (int)$pdo->lastInsertId();

    // Generate JWT token (valid for 24 hours)
    $tokenPayload = [
        'user_id' => $userId,
        'username' => $username,
        'email' => $email,
    ];
    $jwt = JWT::encode($tokenPayload, 86400);

    // Return user data + JWT
    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "user" => [
            "uid" => (string)$userId,
            "username" => $username,
            "email" => $email
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
