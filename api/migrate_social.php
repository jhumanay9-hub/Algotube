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
header('Content-Type: application/json');

// Use absolute pathing for safety
require_once dirname(__DIR__) . '/config/db.php';

try {
    // 1. Add invite_link_active to comments if missing
    $pdo->exec("ALTER TABLE comments ADD COLUMN IF NOT EXISTS invite_link_active TINYINT(1) DEFAULT 0");

    // 2. Create private_rooms table if missing
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS private_rooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_code VARCHAR(100) NOT NULL UNIQUE,
            user_a INT NOT NULL,
            user_b INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    // 3. Create private_messages table if missing
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS private_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_code VARCHAR(100) NOT NULL,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    ob_clean();
    echo json_encode(["status" => "success", "message" => "SQL Mesh Updated Successfully. Social Layer Infrastructure is ONLINE."]);
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Mesh Migration Failed", "details" => $e->getMessage()]);
}
?>
