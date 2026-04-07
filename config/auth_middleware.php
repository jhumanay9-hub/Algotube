<?php
/**
 * Auth Middleware — JWT Verification
 * Include this at the top of any PHP endpoint that requires authentication.
 *
 * Usage:
 *   require_once __DIR__ . '/../config/auth_middleware.php';
 *   $currentUser = verifyAuth();  // Returns ['user_id' => 1, 'username' => 'admin', ...]
 */

require_once __DIR__ . '/JWT.php';

/**
 * Verifies the JWT from the Authorization header.
 * Returns the decoded payload on success.
 * Exits with 401 on failure.
 */
function verifyAuth(): array {
    $token = getJwtFromHeader();

    if (!$token) {
        http_response_code(401);
        header("Content-Type: application/json");
        echo json_encode(["status" => "error", "message" => "Authentication required"]);
        exit();
    }

    $payload = JWT::decode($token);

    if ($payload === false) {
        http_response_code(401);
        header("Content-Type: application/json");
        echo json_encode(["status" => "error", "message" => "Invalid or expired token"]);
        exit();
    }

    return $payload;
}
?>
