<?php
/**
 * Lightweight JWT (JSON Web Token) implementation for Algotube.
 * No external dependencies — uses native PHP base64/hmac functions.
 * Algorithm: HS256 (HMAC-SHA256)
 */

class JWT {

    // Secret key — in production, move this to an environment variable
    private static function getSecret(): string {
        return defined('JWT_SECRET') ? JWT_SECRET : 'algotube_jwt_secret_key_change_in_production_2024';
    }

    /**
     * Generate a signed JWT from a payload array.
     *
     * @param array $payload Data to encode (user_id, username, etc.)
     * @param int $ttl Token Time-To-Live in seconds (default: 24 hours)
     * @return string The encoded JWT string
     */
    public static function encode(array $payload, int $ttl = 86400): string {
        $header = self::base64UrlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT'
        ]));

        $now = time();
        $payload['iat'] = $now;           // Issued At
        $payload['exp'] = $now + $ttl;    // Expiration Time
        $payload['iss'] = 'algotube';     // Issuer

        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signatureInput = $header . '.' . $payloadEncoded;
        $signature = hash_hmac('sha256', $signatureInput, self::getSecret(), true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return $signatureInput . '.' . $signatureEncoded;
    }

    /**
     * Decode and verify a JWT. Returns payload on success, false on failure.
     *
     * @param string $token The JWT string to decode
     * @return array|false Decoded payload or false if invalid/expired
     */
    public static function decode(string $token): array|false {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        // Verify signature (timing-attack safe via hash_equals)
        $signatureInput = $headerEncoded . '.' . $payloadEncoded;
        $expectedSignature = hash_hmac('sha256', $signatureInput, self::getSecret(), true);
        $providedSignature = self::base64UrlDecode($signatureEncoded);

        if (!hash_equals($expectedSignature, $providedSignature)) {
            return false;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!$payload) {
            return false;
        }

        // Check expiration
        if (isset($payload['exp']) && time() > $payload['exp']) {
            return false;
        }

        return $payload;
    }

    /**
     * Base64 URL-safe encoding (no padding, URL-safe characters).
     */
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL-safe decoding.
     */
    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

/**
 * Helper: Extract JWT from Authorization header.
 * Returns the token string or null if not present.
 */
function getJwtFromHeader(): ?string {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        return $matches[1];
    }

    return null;
}
?>
