<?php
// ==============================================================================
// HYDROWELL - Contact & Quick Inquiry API (Persistent MySQL Backend)
// Endpoint: POST /api/contact.php
// ==============================================================================

require_once __DIR__ . '/db.php';
$conn = get_db_connection();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$contentType = $_SERVER["CONTENT_TYPE"] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $input = $_POST;
}

$name     = trim($input['name'] ?? '');
$phone    = trim($input['phone'] ?? '');
$location = trim($input['location'] ?? '');
$service  = trim($input['service'] ?? 'General Enquiry');
$message  = trim($input['message'] ?? '');

$errors = [];
if (empty($name)) {
    $errors[] = "Please enter your name.";
}

$clean_phone = preg_replace('/[^0-9]/', '', $phone);
if (empty($phone) || strlen($clean_phone) < 10) {
    $errors[] = "Please enter a valid 10-digit phone number.";
}

if (empty($message)) {
    $errors[] = "Please enter your requirement.";
}

if (!empty($errors)) {
    send_json(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors], 400);
}

$stmt = $conn->prepare("INSERT INTO inquiries (name, phone, location, service, message) VALUES (?, ?, ?, ?, ?)");
if (!$stmt) {
    send_json(['success' => false, 'message' => 'Database error preparing inquiry.'], 500);
}

$stmt->bind_param("sssss", $name, $phone, $location, $service, $message);

if ($stmt->execute()) {
    $inquiry_id = $stmt->insert_id;
    $stmt->close();

    $num1 = env_get('WHATSAPP_RECIPIENT_1', '919880701789');
    $num2 = env_get('WHATSAPP_RECIPIENT_2', '919380410134');

    $wa_text = "HYDROWELL — QUICK ENQUIRY\n"
             . "--------------------------\n"
             . "Name: {$name}\n"
             . "Phone: {$phone}\n"
             . "Location: " . (!empty($location) ? $location : "Bengaluru / Karnataka") . "\n"
             . "Service: {$service}\n"
             . "Requirement:\n{$message}\n"
             . "--------------------------\n"
             . "Sri Anantashayana Borewells & Pumps";

    $wa_url_1 = "https://wa.me/" . preg_replace('/[^0-9]/', '', $num1) . "?text=" . urlencode($wa_text);
    $wa_url_2 = "https://wa.me/" . preg_replace('/[^0-9]/', '', $num2) . "?text=" . urlencode($wa_text);

    send_json([
        'success' => true,
        'message' => 'Enquiry submitted successfully! Our engineer will reach out to you.',
        'data' => [
            'id' => $inquiry_id,
            'name' => $name,
            'whatsapp_link_1' => $wa_url_1,
            'whatsapp_link_2' => $wa_url_2
        ]
    ], 201);
} else {
    $stmt->close();
    send_json(['success' => false, 'message' => 'Unable to record enquiry.'], 500);
}
