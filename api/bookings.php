<?php
// ==============================================================================
// HYDROWELL - Borewell & Services Booking API (Persistent MySQL Backend)
// Endpoints:
//   POST /api/bookings.php - Create a new booking, persist to DB, format dual WhatsApp
//   GET  /api/bookings.php - Retrieve bookings list
// ==============================================================================

require_once __DIR__ . '/db.php';
$conn = get_db_connection();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // --------------------------------------------------------------------------
    // 1. GET: Fetch bookings list
    // --------------------------------------------------------------------------
    $sql = "SELECT id, booking_id, name, phone, email, location, service, preferred_date, depth_feet, message, status, created_at 
            FROM bookings 
            ORDER BY id DESC LIMIT 100";
    
    $result = $conn->query($sql);
    $bookings = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $bookings[] = [
                'id' => (int) $row['id'],
                'booking_id' => $row['booking_id'],
                'name' => htmlspecialchars($row['name'], ENT_QUOTES, 'UTF-8'),
                'phone' => htmlspecialchars($row['phone'], ENT_QUOTES, 'UTF-8'),
                'email' => htmlspecialchars($row['email'] ?? '', ENT_QUOTES, 'UTF-8'),
                'location' => htmlspecialchars($row['location'], ENT_QUOTES, 'UTF-8'),
                'service' => htmlspecialchars($row['service'], ENT_QUOTES, 'UTF-8'),
                'preferred_date' => $row['preferred_date'],
                'depth_feet' => htmlspecialchars($row['depth_feet'] ?? '', ENT_QUOTES, 'UTF-8'),
                'message' => htmlspecialchars($row['message'] ?? '', ENT_QUOTES, 'UTF-8'),
                'status' => $row['status'],
                'created_at' => $row['created_at']
            ];
        }
    }

    send_json([
        'success' => true,
        'count' => count($bookings),
        'data' => $bookings
    ]);

} elseif ($method === 'POST') {
    // --------------------------------------------------------------------------
    // 2. POST: Process, validate, save booking and generate WhatsApp notification
    // --------------------------------------------------------------------------

    // Support both JSON body and POST form data
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $input = $_POST;
    }

    $name           = trim($input['name'] ?? '');
    $phone          = trim($input['phone'] ?? '');
    $email          = trim($input['email'] ?? '');
    $location       = trim($input['location'] ?? '');
    $service        = trim($input['service'] ?? 'Borewell Drilling');
    $preferred_date = trim($input['preferred_date'] ?? date('Y-m-d'));
    $depth_feet     = trim($input['depth_feet'] ?? 'Standard');
    $message        = trim($input['message'] ?? '');

    // Validation
    $errors = [];
    if (empty($name)) {
        $errors[] = "Please provide your full name.";
    } elseif (mb_strlen($name) > 100) {
        $errors[] = "Name cannot exceed 100 characters.";
    }

    // Phone validation
    $cleaned_phone = preg_replace('/[^0-9]/', '', $phone);
    if (empty($phone) || strlen($cleaned_phone) < 10) {
        $errors[] = "Please enter a valid 10-digit mobile number.";
    }

    if (empty($location)) {
        $errors[] = "Please provide your project or borewell site location.";
    }

    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Please provide a valid email address.";
    }

    if (!empty($errors)) {
        send_json([
            'success' => false,
            'message' => implode(' ', $errors),
            'errors' => $errors
        ], 400);
    }

    // Generate unique Booking ID: HYD-YYYYMMDD-XXXX
    $datePart = date('Ymd');
    $randomPart = strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
    $booking_id = "HYD-{$datePart}-{$randomPart}";

    // 1. Insert into bookings table
    $stmt = $conn->prepare("INSERT INTO bookings (booking_id, name, phone, email, location, service, preferred_date, depth_feet, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')");
    if (!$stmt) {
        error_log("Prepare bookings failed: " . $conn->error);
        send_json(['success' => false, 'message' => 'Internal server error preparing booking.'], 500);
    }

    $stmt->bind_param("sssssssss", $booking_id, $name, $phone, $email, $location, $service, $preferred_date, $depth_feet, $message);
    
    if (!$stmt->execute()) {
        error_log("Execute bookings failed: " . $stmt->error);
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to save booking. Please try again.'], 500);
    }
    $stmt->close();

    // 2. Also mirror into inquiries table for backward compatibility
    $inq_message = "Booking: {$service} | Depth: {$depth_feet} | Date: {$preferred_date} | Notes: {$message}";
    $stmt_inq = $conn->prepare("INSERT INTO inquiries (name, phone, location, service, message) VALUES (?, ?, ?, ?, ?)");
    if ($stmt_inq) {
        $stmt_inq->bind_param("sssss", $name, $phone, $location, $service, $inq_message);
        $stmt_inq->execute();
        $stmt_inq->close();
    }

    // 3. Format WhatsApp booking notification for BOTH target numbers
    $num1 = env_get('WHATSAPP_RECIPIENT_1', '919880701789');
    $num2 = env_get('WHATSAPP_RECIPIENT_2', '919380410134');

    $wa_text = "HYDROWELL — NEW BOREWELL BOOKING\n"
             . "------------------------------------\n"
             . "🔖 Booking ID: {$booking_id}\n"
             . "👤 Customer: {$name}\n"
             . "📞 Phone: {$phone}\n"
             . "📍 Location: {$location}\n"
             . "⚙️ Service: {$service}\n"
             . "📅 Preferred Date: {$preferred_date}\n"
             . "📏 Depth Estimate: {$depth_feet}\n"
             . (!empty($message) ? "📝 Details: {$message}\n" : "")
             . "⏰ Timestamp: " . date('d M Y, h:i A') . "\n"
             . "------------------------------------\n"
             . "Sri Anantashayana Borewells & Pumps";

    $wa_url_1 = "https://wa.me/" . preg_replace('/[^0-9]/', '', $num1) . "?text=" . urlencode($wa_text);
    $wa_url_2 = "https://wa.me/" . preg_replace('/[^0-9]/', '', $num2) . "?text=" . urlencode($wa_text);

    // Optional background Cloud API dispatch
    $cloud_api_sent_1 = dispatch_whatsapp_cloud_api($num1, $wa_text);
    $cloud_api_sent_2 = dispatch_whatsapp_cloud_api($num2, $wa_text);

    send_json([
        'success' => true,
        'message' => 'Booking received and confirmed successfully!',
        'data' => [
            'booking_id' => $booking_id,
            'name' => $name,
            'phone' => $phone,
            'service' => $service,
            'location' => $location,
            'preferred_date' => $preferred_date,
            'depth_feet' => $depth_feet,
            'whatsapp' => [
                'recipient_1' => $num1,
                'recipient_2' => $num2,
                'link_1' => $wa_url_1,
                'link_2' => $wa_url_2,
                'cloud_api_sent_1' => $cloud_api_sent_1,
                'cloud_api_sent_2' => $cloud_api_sent_2,
                'message_preview' => $wa_text
            ]
        ]
    ], 201);

} else {
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
