<?php
// ==============================================================================
// HYDROWELL - Feedback API (Persistent MySQL Backend)
// Endpoints:
//   GET  /api/feedback.php - Get all reviews + dynamic statistics
//   POST /api/feedback.php - Submit a new review
// ==============================================================================

require_once __DIR__ . '/db.php';
$conn = get_db_connection();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // --------------------------------------------------------------------------
    // 1. GET: Fetch all reviews and calculate live metrics
    // --------------------------------------------------------------------------
    $sql = "SELECT id, name, email, rating, comment, photo, created_at 
            FROM feedback 
            WHERE status = 'approved' OR status IS NULL OR status = ''
            ORDER BY created_at DESC, id DESC";

    $result = $conn->query($sql);
    $reviews = [];
    $total_stars = 0;
    $breakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $r = (int) $row['rating'];
            if ($r < 1) $r = 1;
            if ($r > 5) $r = 5;

            $total_stars += $r;
            $breakdown[$r] = ($breakdown[$r] ?? 0) + 1;

            // Format photo url
            $photo_url = null;
            if (!empty($row['photo'])) {
                $photo_url = 'uploads/' . basename($row['photo']);
            }

            // Humanized time
            $created_time = strtotime($row['created_at']);
            $time_ago = $created_time ? date('d M Y', $created_time) : 'Recent';

            $reviews[] = [
                'id' => (int) $row['id'],
                'name' => htmlspecialchars($row['name'] ?? 'Verified Customer', ENT_QUOTES, 'UTF-8'),
                'rating' => $r,
                'comment' => htmlspecialchars($row['comment'] ?? '', ENT_QUOTES, 'UTF-8'),
                'photo' => $photo_url,
                'created_at' => $row['created_at'],
                'date_formatted' => $time_ago
            ];
        }
    }

    $total_count = count($reviews);
    $average_rating = $total_count > 0 ? round($total_stars / $total_count, 1) : 0;

    send_json([
        'success' => true,
        'stats' => [
            'average_rating' => $average_rating,
            'total_reviews' => $total_count,
            'breakdown' => $breakdown
        ],
        'data' => $reviews
    ]);

} elseif ($method === 'POST') {
    // --------------------------------------------------------------------------
    // 2. POST: Validate, sanitize and persist new review in database
    // --------------------------------------------------------------------------

    // Support both multipart/form-data and application/json
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?? [];
        $name = trim($input['name'] ?? '');
        $rating = (int) ($input['rating'] ?? 0);
        $comment = trim($input['comment'] ?? '');
        $email = trim($input['email'] ?? '');
        $photoName = '';
    } else {
        $name = trim($_POST['name'] ?? '');
        $rating = (int) ($_POST['rating'] ?? 0);
        $comment = trim($_POST['comment'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $photoName = '';
    }

    // Validation
    $errors = [];
    if (empty($name)) {
        $errors[] = "Please provide your name.";
    } elseif (mb_strlen($name) > 100) {
        $errors[] = "Name must not exceed 100 characters.";
    }

    if ($rating < 1 || $rating > 5) {
        $errors[] = "Please select a rating between 1 and 5 stars.";
    }

    if (empty($comment)) {
        $errors[] = "Please provide your review comments.";
    } elseif (mb_strlen($comment) > 2000) {
        $errors[] = "Review comments must not exceed 2000 characters.";
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

    // Handle optional file upload safely
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['photo'];
        $allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime_type, $allowed_types)) {
            send_json(['success' => false, 'message' => 'Invalid image format. Allowed formats: JPG, PNG, WEBP.'], 400);
        }

        if ($file['size'] > 5 * 1024 * 1024) { // 5MB max
            send_json(['success' => false, 'message' => 'Image size must be less than 5MB.'], 400);
        }

        $upload_dir = __DIR__ . '/../uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safe_filename = time() . '_' . bin2hex(random_bytes(6)) . '.' . strtolower($extension);
        $destination = $upload_dir . $safe_filename;

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            $photoName = $safe_filename;
        }
    }

    // Prepared statement to prevent SQL Injection
    $stmt = $conn->prepare("INSERT INTO feedback (name, rating, comment, photo, email, status) VALUES (?, ?, ?, ?, ?, 'approved')");
    if (!$stmt) {
        error_log("Prepare failed in feedback.php: " . $conn->error);
        send_json(['success' => false, 'message' => 'Server error preparing feedback record.'], 500);
    }

    $stmt->bind_param("sisss", $name, $rating, $comment, $photoName, $email);

    if ($stmt->execute()) {
        $insert_id = $stmt->insert_id;
        $stmt->close();

        // Query the freshly inserted record
        $photo_url = !empty($photoName) ? 'uploads/' . $photoName : null;

        send_json([
            'success' => true,
            'message' => 'Thank you! Your feedback has been recorded successfully.',
            'data' => [
                'id' => $insert_id,
                'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                'rating' => $rating,
                'comment' => htmlspecialchars($comment, ENT_QUOTES, 'UTF-8'),
                'photo' => $photo_url,
                'created_at' => date('Y-m-d H:i:s'),
                'date_formatted' => 'Just now'
            ]
        ], 201);
    } else {
        error_log("Execute failed in feedback.php: " . $stmt->error);
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to save feedback. Please try again.'], 500);
    }
} else {
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
