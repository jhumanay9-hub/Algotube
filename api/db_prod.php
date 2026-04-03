<?php
/**
 * AlgoTube Production Database Configuration
 * -----------------------------------------
 * Fill in your InfinityFree MySQL credentials below.
 */

// Deployment Placeholders
$prod_host = "sqlxxx.infinityfree.com"; // Found in InfinityFree Client Area
$prod_user = "if0_xxxxxxx";            // Your vPanel username
$prod_pass = "your_password";         // Your vPanel password
$prod_name = "if0_xxxxxxx_algotube";   // The database name you created

// CORS & Headers
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *'); 
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
}

// Connection Logic
$dsn = "mysql:host=$prod_host;dbname=$prod_name;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $prod_user, $prod_pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    die(json_encode([
        "status" => "error",
        "message" => "Database Connection Failed",
        "debug" => "Confirm your InfinityFree credentials in api/db_prod.php"
    ]));
}
