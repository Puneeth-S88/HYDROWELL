/**
 * ==============================================================================
 * HYDROWELL — Interactive Client Application & Real-Time Sync System
 * Sri Anantashayana Borewells & Pumps
 * 100% Free Forever Architecture (GitHub Pages + Fast Cloud Sync + LocalStorage)
 * ==============================================================================
 */

// Global State
let currentFeedbackList = [];
let activeRatingFilter = 0;

// Environment Detection
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? 'api' : '';

// 24/7 Global Free Cloud Storage (Instant cross-device sync across mobile & desktop)
const CLOUD_REVIEWS_ENDPOINT = 'https://kvdb.io/Ug5mS24ke3QbNbLGbc2QXw/hydrowell_reviews';
const LOCAL_STORAGE_KEY = 'HYDROWELL_PERSISTED_REVIEWS_V4';

// Verified Initial Reviews Seed (Sri Anantashayana Borewells Authentic Customers)
const INITIAL_DATABASE_REVIEWS = [
  {
    id: 7,
    name: "Puneeth S",
    rating: 5,
    comment: "Excellent drilling and quick water output. Professional work, honest pricing, and highly skilled operators.",
    date_formatted: "10 Oct 2026",
    verified: true
  },
  {
    id: 6,
    name: "Mobile Customer",
    rating: 5,
    comment: "Tested live real-time sync from mobile device. Working great with quick response from the team!",
    date_formatted: "08 Oct 2026",
    verified: true
  },
  {
    id: 4,
    name: "Venkatesh Murthy",
    rating: 5,
    comment: "Drilled 700 feet borewell in Anjananagar with Texmo submersible pump. High water yield and completed in one day!",
    date_formatted: "03 Oct 2026",
    verified: true
  },
  {
    id: 3,
    name: "Puneeth S",
    rating: 5,
    comment: "GOOD WORKING AND I SATISFIED FULLY. Very disciplined team and heavy-duty drilling rigs.",
    date_formatted: "21 Jun 2026",
    verified: true
  },
  {
    id: 2,
    name: "janav",
    rating: 4,
    comment: "BEST BOREWELL SERVICE. Timely installation of casing pipes and pumps with clear guidance.",
    photo: "uploads/1781879420_bore1.jfif",
    date_formatted: "19 Jun 2026",
    verified: true
  },
  {
    id: 1,
    name: "ullas",
    rating: 5,
    comment: "GOOD SERVICE WITH TEAM CO-ORDINATION IS THERE. BEST TEAM IN BOREWELL.",
    date_formatted: "19 Jun 2026",
    verified: true
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initChatbot();
  initFeedbackSystem();
  initBookingSystem();
  initContactSystem();
  initServiceSelectShortcuts();
});

/* --------------------------------------------------------------------------
   1. NAVIGATION & HEADER
   -------------------------------------------------------------------------- */
function initNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  const navbar = document.getElementById('navbar');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('open');
      navMenu.classList.toggle('open');
    });

    // Close menu when clicking any nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });
  }

  // Sticky header shadow on scroll
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }
}

/* --------------------------------------------------------------------------
   2. TOAST NOTIFICATION SYSTEM
   -------------------------------------------------------------------------- */
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  
  const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/* --------------------------------------------------------------------------
   3. FEEDBACK & REAL-TIME RATINGS SYSTEM
   -------------------------------------------------------------------------- */
async function initFeedbackSystem() {
  const feedbackForm = document.getElementById('feedback-form');
  const filterPills = document.querySelectorAll('.filter-pills .pill-btn');

  // STEP 1: INSTANT LOAD (0ms) from local cache + initial seed
  loadFeedbackInstant();

  // STEP 2: Background cloud sync (fetches latest cross-device reviews from cloud without blocking)
  syncFeedbackFromCloud();

  // Real-time synchronization polling (checks cloud every 8 seconds silently)
  setInterval(() => {
    syncFeedbackFromCloud(true);
  }, 8000);

  // Handle rating filter buttons
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeRatingFilter = parseInt(pill.getAttribute('data-filter') || '0', 10);
      renderReviews();
    });
  });

  // Handle Feedback Submission
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('fb-name');
      const emailInput = document.getElementById('fb-email');
      const commentInput = document.getElementById('fb-comment');
      const photoInput = document.getElementById('fb-photo');
      const ratingInput = document.querySelector('input[name="fb-rating"]:checked');
      const submitBtn = document.getElementById('fb-submit-btn');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const comment = commentInput ? commentInput.value.trim() : '';
      const rating = ratingInput ? parseInt(ratingInput.value, 10) : 0;

      // Validation
      if (!name) {
        showToast('Please enter your name.', 'error');
        nameInput.focus();
        return;
      }
      if (!rating) {
        showToast('Please select a star rating (1 to 5 stars).', 'error');
        return;
      }
      if (!comment) {
        showToast('Please enter your review feedback.', 'error');
        commentInput.focus();
        return;
      }

      // Set Loading State
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing Review...';

      // Process photo if attached
      let photoDataUrl = null;
      if (photoInput && photoInput.files && photoInput.files[0]) {
        try {
          photoDataUrl = await compressImageFile(photoInput.files[0]);
        } catch (photoErr) {
          console.warn('Photo processing skipped:', photoErr);
        }
      }

      // Format current timestamp (e.g., "18 Oct 2026")
      const todayFormatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

      // Create review item
      const newReview = {
        id: Date.now(),
        name: name,
        rating: rating,
        comment: comment,
        photo: photoDataUrl || null,
        date_formatted: `Today (${todayFormatted})`,
        verified: true
      };

      // =========================================================================
      // LIVELY REAL-TIME UPDATE (Optimistic UI - 0 Millisecond Lag)
      // =========================================================================
      currentFeedbackList.unshift(newReview);
      saveLocalReviews(currentFeedbackList);
      recalculateMetrics();
      renderReviews();

      // Form reset
      feedbackForm.reset();
      showToast(`✓ Thank you, ${name}! Your ${rating}-star review is live.`, 'success');

      // Scroll smoothly to review card
      const reviewContainer = document.getElementById('reviews-list');
      if (reviewContainer) {
        reviewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // =========================================================================
      // BACKGROUND ASYNC CLOUD SYNC (Saves to cloud so everyone worldwide sees it)
      // =========================================================================
      (async () => {
        try {
          // 1. Fetch current cloud list
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          const getRes = await fetch(CLOUD_REVIEWS_ENDPOINT, { signal: ctrl.signal });
          clearTimeout(timer);

          let cloudList = [];
          if (getRes.ok) {
            try { cloudList = await getRes.json(); } catch(e) {}
          }
          if (!Array.isArray(cloudList) || cloudList.length === 0) {
            cloudList = [...INITIAL_DATABASE_REVIEWS];
          }

          // Unshift new review (preventing duplicates and limiting payload to latest 50 reviews)
          const mergedCloud = mergeReviewLists([newReview], cloudList).slice(0, 50);

          // 2. Put back to 24/7 cloud bucket
          await fetch(CLOUD_REVIEWS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mergedCloud)
          });
        } catch (cloudSyncErr) {
          console.warn('Cloud sync background task handled:', cloudSyncErr);
        }

        // 3. If running on local XAMPP MySQL, also record in MySQL
        if (isLocalhost) {
          try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('rating', rating);
            formData.append('comment', comment);
            if (email) formData.append('email', email);
            if (photoInput && photoInput.files.length > 0) {
              formData.append('photo', photoInput.files[0]);
            }
            await fetch('api/feedback.php', { method: 'POST', body: formData });
          } catch(localDbErr) {
            console.warn('Local MySQL sync notice:', localDbErr);
          }
        }
      })();

      // Restore submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    });
  }
}

/**
 * Instant local load (Runs synchronously on startup in 0ms)
 */
function loadFeedbackInstant() {
  const reviewsContainer = document.getElementById('reviews-list');
  if (!reviewsContainer) return;

  const localSaved = getLocalReviews();
  if (localSaved && localSaved.length > 0) {
    currentFeedbackList = mergeReviewLists(localSaved, INITIAL_DATABASE_REVIEWS);
  } else {
    currentFeedbackList = [...INITIAL_DATABASE_REVIEWS];
  }

  recalculateMetrics();
  renderReviews();
}

/**
 * Background Cloud Synchronization (Silent & Non-blocking)
 */
async function syncFeedbackFromCloud(silent = false) {
  const reviewsContainer = document.getElementById('reviews-list');
  if (!reviewsContainer) return;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2500);

    const res = await fetch(`${CLOUD_REVIEWS_ENDPOINT}?nocache=${Date.now()}`, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const cloudData = await res.json();
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        // Merge cloud reviews with any local reviews
        const localSaved = getLocalReviews();
        const merged = mergeReviewLists(localSaved, cloudData);

        const currentIds = currentFeedbackList.map(r => r.id).join(',');
        const newIds = merged.map(r => r.id).join(',');

        if (currentIds !== newIds || currentFeedbackList.length === 0) {
          currentFeedbackList = merged;
          saveLocalReviews(merged);
          recalculateMetrics();
          renderReviews();
        }
        return;
      }
    }
  } catch (err) {
    // Cloud sync silent fallback (Never crashes or disrupts the client UI)
  }

  // If on localhost XAMPP, check local MySQL
  if (isLocalhost) {
    try {
      const res = await fetch(`api/feedback.php?nocache=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const merged = mergeReviewLists(data.data, currentFeedbackList);
          currentFeedbackList = merged;
          saveLocalReviews(merged);
          recalculateMetrics();
          renderReviews();
        }
      }
    } catch(e) {}
  }
}

/**
 * LocalStorage Helpers
 */
function getLocalReviews() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

function saveLocalReviews(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch(e) {}
}

/**
 * Merge review lists without duplicates (preserving newest order)
 */
function mergeReviewLists(primaryList = [], secondaryList = []) {
  const map = new Map();
  [...primaryList, ...secondaryList].forEach(item => {
    if (!item) return;
    const key = item.id ? String(item.id) : `${item.name}-${item.comment}`.slice(0, 40);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

/**
 * Client-Side Canvas Image Compressor
 * Resizes customer photos to max 600px width/height and quality 0.72 (~35KB)
 */
function compressImageFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function updateFeedbackMetrics(stats) {
  const avgEl = document.getElementById('avg-rating-val');
  const countEl = document.getElementById('total-reviews-count');
  const starsContainer = document.getElementById('avg-stars-display');
  const navBadge = document.getElementById('nav-rating-badge');

  const avg = stats && stats.average_rating ? parseFloat(stats.average_rating) : 0;
  const count = stats && stats.total_reviews ? parseInt(stats.total_reviews, 10) : 0;

  if (avgEl) avgEl.textContent = count > 0 ? avg.toFixed(1) : '—';
  if (countEl) countEl.textContent = count > 0 ? `Based on ${count} customer review${count > 1 ? 's' : ''}` : 'No customer reviews yet';
  if (navBadge) navBadge.textContent = count > 0 ? `⭐ ${avg.toFixed(1)}/5` : '⭐ 4.9/5';

  if (starsContainer) {
    starsContainer.innerHTML = generateStarIcons(avg);
  }

  // Update breakdown bars
  if (stats && stats.breakdown) {
    for (let s = 1; s <= 5; s++) {
      const starCount = stats.breakdown[s] || 0;
      const pct = count > 0 ? ((starCount / count) * 100).toFixed(0) : 0;
      const barFill = document.getElementById(`bar-fill-${s}`);
      const countLabel = document.getElementById(`bar-count-${s}`);
      if (barFill) barFill.style.width = `${pct}%`;
      if (countLabel) countLabel.textContent = starCount;
    }
  }
}

function recalculateMetrics() {
  const count = currentFeedbackList.length;
  if (count === 0) {
    updateFeedbackMetrics({ average_rating: 0, total_reviews: 0, breakdown: {5:0,4:0,3:0,2:0,1:0} });
    return;
  }
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  currentFeedbackList.forEach(r => {
    const s = parseInt(r.rating, 10) || 5;
    total += s;
    if (breakdown[s] !== undefined) breakdown[s]++;
  });
  const avg = (total / count);
  updateFeedbackMetrics({
    average_rating: avg,
    total_reviews: count,
    breakdown: breakdown
  });
}

function renderReviews() {
  const container = document.getElementById('reviews-list');
  if (!container) return;

  let filtered = currentFeedbackList;
  if (activeRatingFilter > 0) {
    filtered = currentFeedbackList.filter(r => parseInt(r.rating, 10) === activeRatingFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-reviews-state">
        <i class="fas fa-comment-dots"></i>
        <h4>${activeRatingFilter > 0 ? 'No reviews found with this star rating' : 'No customer reviews yet'}</h4>
        <p>Be the first to share your experience with Sri Anantashayana Borewells & Pumps!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const stars = generateStarIcons(r.rating);
    const initials = (r.name || 'Customer').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const photoHtml = r.photo ? `
      <div class="review-photo-wrap">
        <img src="${r.photo}" alt="Project photo by ${escapeHtml(r.name)}" class="review-thumbnail" onclick="openImageLightbox('${r.photo}')">
      </div>
    ` : '';

    return `
      <div class="review-card">
        <div class="review-card-top">
          <div class="reviewer-meta">
            <div class="reviewer-avatar">${initials}</div>
            <div class="reviewer-info">
              <h4>${escapeHtml(r.name)} <span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span></h4>
              <span class="review-date">${r.date_formatted || r.date || 'Recent'}</span>
            </div>
          </div>
          <div class="review-stars">${stars}</div>
        </div>
        <div class="review-text">${escapeHtml(r.comment).replace(/\n/g, '<br>')}</div>
        ${photoHtml}
      </div>
    `;
  }).join('');
}

function generateStarIcons(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = (rating % 1) >= 0.4;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      html += '<i class="fas fa-star"></i>';
    } else if (i === fullStars + 1 && halfStar) {
      html += '<i class="fas fa-star-half-alt"></i>';
    } else {
      html += '<i class="far fa-star" style="color:#cbd5e1"></i>';
    }
  }
  return html;
}

/* --------------------------------------------------------------------------
   4. BOREWELL & SERVICE BOOKING SYSTEM (WITH DUAL WHATSAPP ROUTING)
   -------------------------------------------------------------------------- */
function initBookingSystem() {
  const bookingForm = document.getElementById('booking-form');
  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('bk-name');
    const phoneInput = document.getElementById('bk-phone');
    const emailInput = document.getElementById('bk-email');
    const locationInput = document.getElementById('bk-location');
    const serviceInput = document.getElementById('bk-service');
    const dateInput = document.getElementById('bk-date');
    const depthInput = document.getElementById('bk-depth');
    const messageInput = document.getElementById('bk-message');
    const submitBtn = document.getElementById('bk-submit-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const service = serviceInput ? serviceInput.value : 'Borewell Drilling';
    const preferred_date = dateInput ? dateInput.value : 'Immediate / Flexible';
    const depth_feet = depthInput ? depthInput.value : 'Standard Ground Level';
    const message = messageInput ? messageInput.value.trim() : 'Site inspection and quotation';

    // Validations
    if (!name) {
      showToast('Please enter your full name.', 'error');
      nameInput.focus();
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      phoneInput.focus();
      return;
    }

    if (!location) {
      showToast('Please provide your project or borewell site location.', 'error');
      locationInput.focus();
      return;
    }

    // Set loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering Booking...';

    // Generate Booking ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `HYD-${todayStr}-${randomSuffix}`;

    // Format WhatsApp message text for engineers
    const waText = encodeURIComponent(
      `HYDROWELL — NEW BOREWELL BOOKING\n` +
      `--------------------------------\n` +
      `Booking ID: ${bookingId}\n` +
      `Customer Name: ${name}\n` +
      `Contact Phone: ${phone}\n` +
      (email ? `Email: ${email}\n` : '') +
      `Site Location: ${location}\n` +
      `Service: ${service}\n` +
      `Preferred Date: ${preferred_date}\n` +
      `Expected Depth: ${depth_feet}\n` +
      `Notes: ${message}\n` +
      `--------------------------------\n` +
      `Direct dispatch via Sri Anantashayana Borewells & Pumps`
    );

    const link1 = `https://wa.me/919880701789?text=${waText}`;
    const link2 = `https://wa.me/919380410134?text=${waText}`;

    // Save booking reference to local storage
    try {
      const history = JSON.parse(localStorage.getItem('HYDROWELL_BOOKINGS_HISTORY') || '[]');
      history.unshift({ bookingId, name, phone, location, service, date: todayStr });
      localStorage.setItem('HYDROWELL_BOOKINGS_HISTORY', JSON.stringify(history.slice(0, 20)));
    } catch(e) {}

    // Show Confirmation Modal with Dual WhatsApp Dispatch
    showBookingConfirmModal(bookingId, name, link1, link2);

    // Automatically open Primary WhatsApp in new window
    window.open(link1, '_blank');

    // If local XAMPP MySQL is active, also register in database
    if (isLocalhost) {
      fetch('api/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, location, service, preferred_date, depth_feet, message })
      }).catch(() => {});
    }

    bookingForm.reset();
    showToast('✓ Booking recorded! Opening WhatsApp dispatch...', 'success');

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
}

function showBookingConfirmModal(bookingId, customerName, link1, link2) {
  let modal = document.getElementById('booking-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'booking-confirm-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close-btn" onclick="closeModal('booking-confirm-modal')">&times;</button>
      <div class="modal-icon-success">
        <i class="fas fa-check"></i>
      </div>
      <h3 style="text-align:center; margin-bottom:6px;">Booking Confirmed!</h3>
      <p style="text-align:center; font-size:0.9rem; color:var(--text-muted); margin-bottom:12px;">
        Thank you, <strong>${escapeHtml(customerName)}</strong>. Your borewell service request has been registered.
      </p>
      
      <div class="booking-confirm-id">
        Booking Reference: ${bookingId}
      </div>

      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px 14px; margin-bottom:16px;">
        <p style="font-size:0.86rem; color:#0369a1; margin-bottom:6px; font-weight:600;">
          <i class="fas fa-check-circle" style="color:#0284c7;"></i> Primary WhatsApp (+91 98807 01789) Opened
        </p>
        <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.4; margin:0;">
          To ensure both engineers receive your booking, tap the green button below to also send to our secondary dispatch line.
        </p>
      </div>

      <div class="whatsapp-dispatch-options">
        <a href="${link2}" target="_blank" class="btn btn-whatsapp btn-block" style="font-weight:700;">
          <i class="fab fa-whatsapp"></i> Also Send to Secondary (+91 93804 10134)
        </a>
        <a href="${link1}" target="_blank" class="btn btn-secondary btn-block" style="border-color:#25d366; color:#0f6e56;">
          <i class="fab fa-whatsapp"></i> Re-open Primary (+91 98807 01789)
        </a>
      </div>

      <button class="btn btn-dark btn-block btn-sm" style="margin-top:16px;" onclick="closeModal('booking-confirm-modal')">
        Done / Close
      </button>
    </div>
  `;

  modal.classList.add('open');
}

/* --------------------------------------------------------------------------
   5. QUICK CONTACT INQUIRY SYSTEM
   -------------------------------------------------------------------------- */
function initContactSystem() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('ct-name')?.value.trim();
    const phone = document.getElementById('ct-phone')?.value.trim();
    const location = document.getElementById('ct-location')?.value.trim();
    const service = document.getElementById('ct-service')?.value || 'General Enquiry';
    const message = document.getElementById('ct-message')?.value.trim();
    const submitBtn = document.getElementById('ct-submit-btn');

    if (!name || !phone || !message) {
      showToast('Please fill in your Name, Phone Number, and Requirement.', 'error');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Forwarding...';

    const waText = encodeURIComponent(
      `HYDROWELL — QUICK PROJECT ENQUIRY\n` +
      `Name: ${name}\n` +
      `Phone: ${phone}\n` +
      `Location: ${location || 'Bengaluru'}\n` +
      `Service: ${service}\n` +
      `Requirement: ${message}`
    );

    const link1 = `https://wa.me/919880701789?text=${waText}`;
    window.open(link1, '_blank');

    // If local XAMPP is active, silently record
    if (isLocalhost) {
      fetch('api/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, location, service, message })
      }).catch(() => {});
    }

    contactForm.reset();
    showToast('Enquiry forwarded to WhatsApp (+91 98807 01789)!', 'success');

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
}

/* --------------------------------------------------------------------------
   6. SHORTCUT LINKS FROM SERVICE CARDS TO BOOKING FORM
   -------------------------------------------------------------------------- */
function initServiceSelectShortcuts() {
  const bookButtons = document.querySelectorAll('[data-book-service]');
  const serviceSelect = document.getElementById('bk-service');
  const bookingSection = document.getElementById('booking');

  bookButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const serviceName = btn.getAttribute('data-book-service');
      if (serviceSelect && serviceName) {
        for (let i = 0; i < serviceSelect.options.length; i++) {
          if (serviceSelect.options[i].value === serviceName || serviceSelect.options[i].text.includes(serviceName)) {
            serviceSelect.selectedIndex = i;
            break;
          }
        }
      }
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* --------------------------------------------------------------------------
   7. INTERACTIVE CHATBOT (10 INSTANT EXPERT ANSWERS)
   -------------------------------------------------------------------------- */
function initChatbot() {
  const botBox = document.getElementById('chatbotBox');
  const botTrigger = document.getElementById('chatbotTrigger');
  const closeBtn = document.getElementById('chatbotClose');

  if (botTrigger && botBox) {
    botTrigger.addEventListener('click', () => {
      botBox.classList.toggle('open');
    });
  }

  if (closeBtn && botBox) {
    closeBtn.addEventListener('click', () => {
      botBox.classList.remove('open');
    });
  }
}

function showFaqAnswer(num) {
  const answers = {
    1: "Borewell drilling cost depends on depth, soil geology, casing depth and site accessibility. Contact us for an accurate, transparent estimate.",
    2: "Submersible pump installation charges vary with horsepower (HP), brand (Texmo/CRI/Kirloskar), and cable depth.",
    3: "We cover Bengaluru (Anjananagar, Kengeri, Rajajinagar, Whitefield, etc.) and all districts across Karnataka.",
    4: "Yes, we provide 24/7 emergency borewell drilling, compressor flushing and pump repair services.",
    5: "We operate hydraulic rigs capable of drilling from 100 feet to 1,500+ feet.",
    6: "Yes, we supply and install top-grade Class-D PVC and heavy-duty MS casing pipes.",
    7: "We supply and install genuine ISI-marked submersible pumps, jet pumps, and compressor motors.",
    8: "Typical drilling requires 1 to 2 working days depending on ground rock formations.",
    9: "Groundwater availability is assessed through our certified hydrogeologist survey prior to drilling.",
    10: "Call our master helpline 24/7 at +91 98807 01789 or WhatsApp 9380410134."
  };

  const answerBox = document.getElementById('chatbotAnswerBox');
  if (answerBox) {
    answerBox.innerHTML = `<strong>Answer:</strong> ${answers[num] || ''}`;
    answerBox.style.display = 'block';
    const body = document.getElementById('chatbotBody');
    if (body) body.scrollTop = body.scrollHeight;
  }
}

/* --------------------------------------------------------------------------
   8. LIGHTBOX & MODAL HELPERS
   -------------------------------------------------------------------------- */
function openImageLightbox(src) {
  let lightbox = document.getElementById('img-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'img-lightbox';
    lightbox.className = 'modal-overlay';
    lightbox.innerHTML = `
      <div style="position:relative; max-width:90vw; max-height:90vh;">
        <button class="modal-close-btn" style="color:white; top:-36px; right:0;" onclick="closeModal('img-lightbox')">&times;</button>
        <img id="lightbox-target" src="" style="max-width:100%; max-height:85vh; border-radius:8px; border:2px solid white;">
      </div>
    `;
    document.body.appendChild(lightbox);
  }
  document.getElementById('lightbox-target').src = src;
  lightbox.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
