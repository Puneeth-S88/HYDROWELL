# HYDROWELL — Sri Anantashayana Borewells & Pumps

**Professional Full-Stack Groundwater Engineering & Borewell Management Platform**

HYDROWELL is a production-ready, full-stack web application designed for **Sri Anantashayana Borewells & Pumps**, operating across Bengaluru and Karnataka for over 25 years. The platform features an end-to-end service booking system, dual WhatsApp notification dispatch, persistent MySQL database storage, and a real-time customer feedback engine visible to all visitors.

---

## 🌟 Key Features

* **Modern Engineering UI / UX**: Clean, professional design system built on **Light Blue, White, and Slate Grey** with high-contrast accessibility.
* **100% Fully Responsive**: Pixel-perfect presentation optimized for:
  * Mobile: `320px`, `375px`, `390px`, `414px`, `430px`
  * Tablet: `768px`, `820px`, `1024px`
  * Desktop & Laptop: `1280px`, `1366px`, `1440px`, `1920px`
* **Persistent MySQL Database**:
  * Direct backend communication without manual phpMyAdmin dependency.
  * Real-time persistence for bookings, reviews, and inquiries in database `borewell_db`.
  * **Zero reliance on `localStorage` / `sessionStorage`** for primary storage.
* **Full-Stack Borewell Booking Engine**:
  * Comprehensive validation (name, 10-digit Indian mobile number, site location, depth requirement, service).
  * Auto-generates unique, traceable booking references (e.g. `HYD-20261003-XXXX`).
  * Persists records directly to MySQL tables `bookings` and `inquiries`.
* **Dual-Recipient WhatsApp Dispatch**:
  * Automatically prepares clean, itemized booking notifications.
  * Targets **both required lines**:
    1. Primary Company Number: `+91 98807 01789`
    2. Dispatch Number: `+91 93804 10134`
  * Optional Meta WhatsApp Cloud Business API support for automated background dispatch.
* **Database-Backed Customer Feedback System**:
  * Live aggregate statistics (average rating, verified customer count, star distribution breakdown).
  * Reviews submitted by any visitor are stored permanently in the database and immediately visible to every subsequent visitor.
  * Built-in protection against **XSS**, HTML injection, and SQL injection via parameterized prepared statements (`mysqli`).
  * Optional customer photo uploads.
* **Interactive Borewell Knowledge Assistant**:
  * Instant access to top 10 frequent customer inquiries (costs, pump types, casing grades, geological point surveys).
* **Multi-Language Support**:
  * Integrated multi-language selector (English, Kannada, Hindi, Telugu, Tamil, Malayalam).
* **Zero Video Bloat**:
  * Video section completely removed in favor of high-performance, lightweight engineering cards and responsive interactive flows.

---

## 🏛️ System Architecture

```text
                           HYDROWELL FRONTEND
                    (HTML5 · Responsive CSS3 · Vanilla JS)
                                     │
                                     ▼
                               REST API LAYER
                        (/api/bookings.php, /api/feedback.php, /api/contact.php)
                                     │
                                     ▼
                            MySQL DATABASE ENGINE
                                (borewell_db)
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
             bookings            feedback            inquiries
                 │
                 ▼
      DUAL WHATSAPP DISPATCH
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Primary Number      Secondary Number
(+91 98807 01789)   (+91 93804 10134)
```

---

## 🗄️ Database Structure (`borewell_db`)

The database consists of three structured relational tables:

1. **`bookings`**
   * `id` (INT AUTO_INCREMENT PRIMARY KEY)
   * `booking_id` (VARCHAR UNIQUE, e.g. `HYD-20261003-F219`)
   * `name` (VARCHAR 100)
   * `phone` (VARCHAR 20)
   * `email` (VARCHAR 120)
   * `location` (VARCHAR 200)
   * `service` (VARCHAR 100)
   * `preferred_date` (VARCHAR 50)
   * `depth_feet` (VARCHAR 50)
   * `message` (TEXT)
   * `status` (VARCHAR 50, default `'confirmed'`)
   * `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

2. **`feedback`**
   * `id` (INT AUTO_INCREMENT PRIMARY KEY)
   * `name` (VARCHAR 100)
   * `email` (VARCHAR 120)
   * `rating` (INT 1–5)
   * `comment` (TEXT)
   * `photo` (VARCHAR 255)
   * `status` (VARCHAR 20, default `'approved'`)
   * `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

3. **`inquiries`**
   * `id` (INT AUTO_INCREMENT PRIMARY KEY)
   * `name` (VARCHAR 100)
   * `phone` (VARCHAR 20)
   * `location` (VARCHAR 150)
   * `service` (VARCHAR 100)
   * `message` (TEXT)
   * `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

---

## 🚀 Installation & Local Setup

### Prerequisites
* **Web Server**: Apache / Nginx / XAMPP / PHP Built-in Server
* **PHP**: Version 7.4 or 8.x (`mysqli` and `curl` extensions enabled)
* **Database**: MySQL 5.7+ or MariaDB 10.4+

### Step-by-Step Instructions

#### 1. Clone Repository
```bash
git clone https://github.com/Puneeth-S88/HYDROWELL.git
cd HYDROWELL
```

#### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Edit `.env` with your database credentials:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=borewell_db
DB_USER=root
DB_PASSWORD=

WHATSAPP_RECIPIENT_1=919880701789
WHATSAPP_RECIPIENT_2=919380410134
```

#### 3. Initialize the Database
Ensure MySQL is running, then apply the SQL schema:
```bash
mysql -u root -p borewell_db < database/schema.sql
```
*(If the database `borewell_db` does not exist yet, the script creates it automatically).*

#### 4. Serve the Application
* **Option A: With XAMPP / WampServer**
  * Copy or symlink the project folder into your web root (e.g. `C:\xampp\htdocs\`).
  * Open `http://localhost/` in your browser.

* **Option B: With PHP Built-in Server**
  ```bash
  php -S 127.0.0.1:8000
  ```
  Open `http://127.0.0.1:8000` in your browser.

#### 5. Verify API Health
Open:
```text
http://localhost/api/status.php
```
You will receive a JSON response confirming database connectivity and table counts.

---

## 🌐 24/7 Cloud Deployment (No Laptop or XAMPP Required)

The backend and database can run 24/7/365 completely free in the cloud without needing your personal laptop or XAMPP:

### 1. Free Cloud MySQL Database (TiDB Cloud Serverless)
1. Go to [https://tidbcloud.com](https://tidbcloud.com) and click **"Continue with GitHub"** using your GitHub account.
2. Click **Create Cluster** (Free Serverless tier — 5 GB storage, 50M queries/month free forever, no credit card required).
3. Open the built-in **SQL Editor** tab, paste the contents of [`database/schema.sql`](file:///c:/Users/Comp/OneDrive/Desktop/ASB%21%21%21/database/schema.sql), and click **Run**.
4. In the **Connect** tab, copy your `DB_HOST`, `DB_PORT` (4000), `DB_USER`, and `DB_PASSWORD`.

### 2. Deploy Backend (Option A: Render Web Service)
1. Go to [https://render.com](https://render.com) and sign in with GitHub.
2. Click **New +** > **Web Service**, select `Puneeth-S88/HYDROWELL`.
3. Render will auto-detect the `Dockerfile` or `render.yaml`.
4. In the **Environment Variables** section, add:
   * `DB_HOST`: your cloud database host
   * `DB_PORT`: `4000` (or 3306)
   * `DB_USER`: your cloud database username
   * `DB_PASSWORD`: your cloud database password
   * `DB_NAME`: `borewell_db` (or cluster DB name)
   * `DB_SSL`: `true`
5. Click **Deploy Web Service**. Your backend is now live 24/7!

### 3. Deploy Backend (Option B: Vercel)
1. Go to [https://vercel.com](https://vercel.com) and click **Add New Project**.
2. Import `Puneeth-S88/HYDROWELL`.
3. Add the same database environment variables in Project Settings.
4. Click **Deploy**.

---

## 🔒 Security & Code Standards

* **SQL Injection**: All database operations utilize parameterized queries (`prepare()`, `bind_param()`, `execute()`).
* **Cross-Site Scripting (XSS)**: Inputs and displayed values are sanitized with strict character escaping (`htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`).
* **Credentials Protection**: `.env` is excluded in `.gitignore`. Secrets are never committed to version control.
* **Upload Sanitization**: File uploads are restricted to `jpg`, `png`, and `webp` formats with unique randomized filenames.

---

## 📞 Contact Information

* **Company**: Sri Anantashayana Borewells & Pumps
* **Primary Phone**: +91 98807 01789
* **WhatsApp Dispatch**: +91 98807 01789 / +91 93804 10134
* **Office & Yard**: Anjananagar, Magadi Main Road, Near Bindu Amulya Apartment, Vishwaneedam Post, Bengaluru - 560091
* **Hours**: Open 24 Hours / 7 Days
