<?php
// Base CORS Headers and Error Reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle placeholders for InfinityFree deployment
$host = "your_infinityfree_sql_host"; // e.g., sql123.epizy.com
$user = "your_infinityfree_sql_username";
$pass = "your_infinityfree_sql_password";
$dbname = "your_infinityfree_sql_db_name";

if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *'); // Flexible for production
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Basic PDO Connection logic
$dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "Database connection failed", "hint" => "Check placeholders in api/db.php"]));
}
