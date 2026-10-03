<?php
// ==============================================================================
// HYDROWELL - System & Database Health Check Endpoint
// Endpoint: GET /api/status.php
// ==============================================================================

require_once __DIR__ . '/db.php';

try {
    $conn = get_db_connection();
    $resTables = $conn->query("SHOW TABLES");
    $tables = [];
    if ($resTables) {
        while ($row = $resTables->fetch_array()) {
            $tables[] = $row[0];
        }
    }

    $feedbackCount = 0;
    $resFb = $conn->query("SELECT COUNT(*) AS c FROM feedback");
    if ($resFb && $r = $resFb->fetch_assoc()) $feedbackCount = (int)$r['c'];

    $bookingsCount = 0;
    $resBk = $conn->query("SELECT COUNT(*) AS c FROM bookings");
    if ($resBk && $r = $resBk->fetch_assoc()) $bookingsCount = (int)$r['c'];

    $inquiriesCount = 0;
    $resInq = $conn->query("SELECT COUNT(*) AS c FROM inquiries");
    if ($resInq && $r = $resInq->fetch_assoc()) $inquiriesCount = (int)$r['c'];

    send_json([
        'success' => true,
        'app' => 'HYDROWELL (Sri Anantashayana Borewells & Pumps)',
        'status' => 'operational',
        'database' => [
            'status' => 'connected',
            'name' => env_get('DB_NAME', 'borewell_db'),
            'host' => env_get('DB_HOST', '127.0.0.1'),
            'tables' => $tables,
            'counts' => [
                'feedback' => $feedbackCount,
                'bookings' => $bookingsCount,
                'inquiries' => $inquiriesCount
            ]
        ],
        'whatsapp' => [
            'recipient_1' => env_get('WHATSAPP_RECIPIENT_1', '919880701789'),
            'recipient_2' => env_get('WHATSAPP_RECIPIENT_2', '919380410134')
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    send_json([
        'success' => false,
        'status' => 'degraded',
        'error' => $e->getMessage()
    ], 500);
}
