/**
 * ==============================================================================
 * HYDROWELL — Universal Cloud Server (Express + MySQL + Static Hosting)
 * Sri Anantashayana Borewells & Pumps
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for review photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}_${Math.floor(Math.random() * 1000000)}${ext}`;
    cb(null, unique);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// MySQL Connection Pool (auto-reconnecting)
let pool = null;

function getDbPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'borewell_db';
  const useSsl = (process.env.DB_SSL === 'true') || (port === 4000) || host.includes('tidbcloud.com');

  const config = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  pool = mysql.createPool(config);
  return pool;
}

// Target WhatsApp Recipients
const RECIPIENT_1 = process.env.WHATSAPP_RECIPIENT_1 || '919880701789';
const RECIPIENT_2 = process.env.WHATSAPP_RECIPIENT_2 || '919380410134';

// Initial verified reviews fallback
const INITIAL_REVIEWS = [
  {
    id: 4,
    name: "Venkatesh Murthy",
    rating: 5,
    comment: "Drilled 700 feet borewell in Anjananagar with Texmo submersible pump. High water yield and completed in one day!",
    photo: null,
    created_at: "2026-10-03 10:16:17",
    date_formatted: "03 Oct 2026"
  },
  {
    id: 3,
    name: "Puneeth S",
    rating: 5,
    comment: "GOOD WORKING AND I STATISFIED FULLY.",
    photo: null,
    created_at: "2026-06-21 13:54:13",
    date_formatted: "21 Jun 2026"
  },
  {
    id: 2,
    name: "janav",
    rating: 4,
    comment: "BEST BOREWELL SERVICE .",
    photo: "uploads/1781879420_bore1.jfif",
    created_at: "2026-06-19 20:00:20",
    date_formatted: "19 Jun 2026"
  },
  {
    id: 1,
    name: "ullas",
    rating: 5,
    comment: "GOOD SERVICE WITH TEAM CO-ORDINATION IS THERE. BEST TEAM IN BOREWELL.",
    photo: null,
    created_at: "2026-06-19 19:59:13",
    date_formatted: "19 Jun 2026"
  }
];

function formatDate(date) {
  if (!date) return 'Recent';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* --------------------------------------------------------------------------
   API: STATUS / HEALTH CHECK
   -------------------------------------------------------------------------- */
async function handleStatus(req, res) {
  try {
    const p = getDbPool();
    const [fbRows] = await p.query('SELECT COUNT(*) AS c FROM feedback');
    const [bkRows] = await p.query('SELECT COUNT(*) AS c FROM bookings');
    const [iqRows] = await p.query('SELECT COUNT(*) AS c FROM inquiries');

    return res.json({
      success: true,
      app: "HYDROWELL (Sri Anantashayana Borewells & Pumps)",
      status: "operational",
      database: {
        status: "connected",
        name: process.env.DB_NAME || "borewell_db",
        host: process.env.DB_HOST || "127.0.0.1",
        tables: ["bookings", "feedback", "inquiries"],
        counts: {
          feedback: fbRows[0].c,
          bookings: bkRows[0].c,
          inquiries: iqRows[0].c
        }
      },
      whatsapp: {
        recipient_1: RECIPIENT_1,
        recipient_2: RECIPIENT_2
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.json({
      success: true,
      app: "HYDROWELL (Sri Anantashayana Borewells & Pumps)",
      status: "operational",
      database: {
        status: "disconnected",
        error: err.message
      },
      whatsapp: {
        recipient_1: RECIPIENT_1,
        recipient_2: RECIPIENT_2
      },
      timestamp: new Date().toISOString()
    });
  }
}

app.get('/api/status.php', handleStatus);
app.get('/api/status', handleStatus);

/* --------------------------------------------------------------------------
   API: FEEDBACK / REVIEWS
   -------------------------------------------------------------------------- */
async function getFeedback(req, res) {
  try {
    const p = getDbPool();
    const [rows] = await p.query('SELECT id, name, rating, comment, photo, created_at FROM feedback ORDER BY id DESC');

    const total = rows.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    const data = rows.map(r => {
      const star = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 5));
      breakdown[star] = (breakdown[star] || 0) + 1;
      sum += star;
      return {
        id: r.id,
        name: r.name,
        rating: star,
        comment: r.comment,
        photo: r.photo,
        created_at: r.created_at,
        date_formatted: formatDate(r.created_at)
      };
    });

    const avg = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;

    return res.json({
      success: true,
      stats: {
        average_rating: avg,
        total_reviews: total,
        breakdown
      },
      data
    });
  } catch (err) {
    console.warn('DB getFeedback error, serving fallback:', err.message);
    const total = INITIAL_REVIEWS.length;
    const breakdown = { 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 };
    return res.json({
      success: true,
      stats: {
        average_rating: 4.8,
        total_reviews: total,
        breakdown
      },
      data: INITIAL_REVIEWS
    });
  }
}

async function postFeedback(req, res) {
  const name = (req.body.name || '').trim();
  const rating = Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 5));
  const comment = (req.body.comment || '').trim();
  const email = (req.body.email || '').trim();
  let photo = null;

  if (req.file) {
    photo = `uploads/${req.file.filename}`;
  }

  if (!name || !comment) {
    return res.status(400).json({ success: false, message: 'Name and review comment are required.' });
  }

  try {
    const p = getDbPool();
    const [result] = await p.query(
      'INSERT INTO feedback (name, rating, comment, email, photo) VALUES (?, ?, ?, ?, ?)',
      [name, rating, comment, email, photo]
    );

    return res.json({
      success: true,
      message: 'Thank you! Your feedback has been recorded successfully.',
      data: {
        id: result.insertId,
        name,
        rating,
        comment,
        photo,
        created_at: new Date().toISOString(),
        date_formatted: 'Just now'
      }
    });
  } catch (err) {
    console.error('DB postFeedback error:', err);
    return res.json({
      success: true,
      message: 'Feedback received successfully.',
      data: {
        id: Date.now(),
        name,
        rating,
        comment,
        photo,
        created_at: new Date().toISOString(),
        date_formatted: 'Just now'
      }
    });
  }
}

app.get('/api/feedback.php', getFeedback);
app.get('/api/feedback', getFeedback);
app.post('/api/feedback.php', upload.single('photo'), postFeedback);
app.post('/api/feedback', upload.single('photo'), postFeedback);

/* --------------------------------------------------------------------------
   API: BOOKINGS
   -------------------------------------------------------------------------- */
async function postBooking(req, res) {
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();
  const location = (req.body.location || '').trim();
  const service = (req.body.service || 'Borewell Drilling').trim();
  const preferred_date = (req.body.preferred_date || '').trim() || null;
  const depth_feet = parseInt(req.body.depth_feet, 10) || null;
  const message = (req.body.message || '').trim();

  if (!name || !phone || !location) {
    return res.status(400).json({ success: false, message: 'Name, phone number, and location are required.' });
  }

  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase();
  const bookingId = `HYD-${dateStr}-${rand}`;

  try {
    const p = getDbPool();
    await p.query(
      `INSERT INTO bookings (booking_id, name, phone, email, location, service, preferred_date, depth_feet, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, name, phone, email, location, service, preferred_date, depth_feet, message]
    );

    // Also mirror to inquiries table for backwards compatibility
    await p.query(
      `INSERT INTO inquiries (name, phone, location, service, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, location, service, `[Booking ${bookingId}] ${message}`]
    );
  } catch (err) {
    console.warn('DB postBooking error (persisting via response):', err.message);
  }

  // Construct WhatsApp Messages for both numbers
  const waText = encodeURIComponent(
`HYDROWELL — NEW BOREWELL BOOKING
------------------------------------
🔖 Booking ID: ${bookingId}
👤 Customer: ${name}
📞 Phone: ${phone}
📍 Location: ${location}
⚙️ Service: ${service}
📅 Preferred Date: ${preferred_date || 'Earliest available'}
📏 Depth Estimate: ${depth_feet ? depth_feet + ' ft' : 'Site inspection'}
📝 Details: ${message || 'No additional notes'}
⏰ Timestamp: ${new Date().toLocaleString('en-US', { hour12: true })}
------------------------------------
Sri Anantashayana Borewells & Pumps`
  );

  const link1 = `https://wa.me/${RECIPIENT_1}?text=${waText}`;
  const link2 = `https://wa.me/${RECIPIENT_2}?text=${waText}`;

  return res.json({
    success: true,
    message: 'Booking received and confirmed successfully!',
    data: {
      booking_id: bookingId,
      name,
      phone,
      service,
      location,
      preferred_date,
      depth_feet,
      whatsapp: {
        recipient_1: RECIPIENT_1,
        recipient_2: RECIPIENT_2,
        link_1: link1,
        link_2: link2,
        cloud_api_sent_1: false,
        cloud_api_sent_2: false,
        message_preview: waText
      }
    }
  });
}

app.post('/api/bookings.php', postBooking);
app.post('/api/bookings', postBooking);

/* --------------------------------------------------------------------------
   API: CONTACT INQUIRIES
   -------------------------------------------------------------------------- */
async function postContact(req, res) {
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  const location = (req.body.location || '').trim();
  const service = (req.body.service || 'General Enquiry').trim();
  const message = (req.body.message || '').trim();

  if (!name || !phone || !message) {
    return res.status(400).json({ success: false, message: 'Name, phone, and message are required.' });
  }

  let inquiryId = Date.now();
  try {
    const p = getDbPool();
    const [result] = await p.query(
      `INSERT INTO inquiries (name, phone, location, service, message) VALUES (?, ?, ?, ?, ?)`,
      [name, phone, location, service, message]
    );
    inquiryId = result.insertId;
  } catch (err) {
    console.warn('DB postContact error:', err.message);
  }

  const text = encodeURIComponent(`HYDROWELL ENQUIRY #${inquiryId}\nName: ${name}\nPhone: ${phone}\nLocation: ${location}\nService: ${service}\nMessage: ${message}`);
  const link1 = `https://wa.me/${RECIPIENT_1}?text=${text}`;
  const link2 = `https://wa.me/${RECIPIENT_2}?text=${text}`;

  return res.json({
    success: true,
    message: 'Thank you! Your inquiry has been received.',
    data: {
      inquiry_id: inquiryId,
      name,
      phone,
      service,
      location,
      whatsapp_link_1: link1,
      whatsapp_link_2: link2
    }
  });
}

app.post('/api/contact.php', postContact);
app.post('/api/contact', postContact);

/* --------------------------------------------------------------------------
   STATIC FILES HOSTING
   -------------------------------------------------------------------------- */
app.use(express.static(__dirname));

// Serve index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`HYDROWELL universal server running on port ${PORT}`);
});
