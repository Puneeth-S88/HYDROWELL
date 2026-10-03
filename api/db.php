<?php
// ==============================================================================
// HYDROWELL - Database Connection & API Bootstrap
// ==============================================================================

// Set JSON headers and CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($reqMethod === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Load .env file if available
 */
function load_env($file_path) {
    if (!file_exists($file_path)) {
        return;
    }
    $lines = file($file_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            $val = trim($val, '"\''); // strip enclosing quotes
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// Load .env from project root
load_env(__DIR__ . '/../.env');

/**
 * Get environment variable with default fallback
 */
function env_get($key, $default = '') {
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }
    return $default;
}

/**
 * Database connection provider
 */
function get_db_connection() {
    static $conn = null;
    if ($conn !== null) {
        return $conn;
    }

    $host = env_get('DB_HOST', '127.0.0.1');
    $user = env_get('DB_USER', 'root');
    $pass = env_get('DB_PASSWORD', '');
    $name = env_get('DB_NAME', 'borewell_db');
    $port = (int) env_get('DB_PORT', 3306);
    $use_ssl = (strtolower(env_get('DB_SSL', 'false')) === 'true') || ($port === 4000) || (strpos($host, 'tidbcloud.com') !== false);

    mysqli_report(MYSQLI_REPORT_OFF);

    if ($use_ssl) {
        $conn = mysqli_init();
        // Initialize SSL flags for cloud databases (TiDB Cloud, Aiven, AWS RDS, etc.)
        $conn->ssl_set(NULL, NULL, NULL, NULL, NULL);
        $conn->options(MYSQLI_OPT_SSL_VERIFY_SERVER_CERT, false);
        $connected = @$conn->real_connect($host, $user, $pass, $name, $port, NULL, MYSQLI_CLIENT_SSL);
    } else {
        $conn = @new mysqli($host, $user, $pass, $name, $port);
        $connected = !$conn->connect_error;
    }

    if (!$connected || $conn->connect_error) {
        $err = $conn->connect_error ?? mysqli_connect_error();
        error_log("HYDROWELL DB Connection Failed: " . $err);
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Database connection unavailable. Please check database server.",
            "error_code" => "DB_CONNECT_FAILED",
            "details" => (env_get('APP_ENV', 'production') === 'development') ? $err : null
        ]);
        exit();
    }

    $conn->set_charset("utf8mb4");
    return $conn;
}

/**
 * Standard JSON response helper
 */
function send_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Optional WhatsApp Cloud Business API Sender
 */
function dispatch_whatsapp_cloud_api($recipient_phone, $message_text) {
    $token = env_get('WHATSAPP_ACCESS_TOKEN', '');
    $phone_id = env_get('WHATSAPP_PHONE_NUMBER_ID', '');

    if (empty($token) || empty($phone_id)) {
        return false; // API credentials not configured
    }

    $clean_phone = preg_replace('/[^0-9]/', '', $recipient_phone);
    $url = "https://graph.facebook.com/v18.0/$phone_id/messages";

    $payload = [
        "messaging_product" => "whatsapp",
        "to" => $clean_phone,
        "type" => "text",
        "text" => [
            "body" => $message_text
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ($http_code >= 200 && $http_code < 300);
}
