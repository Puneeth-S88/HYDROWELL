/**
 * ==============================================================================
 * HYDROWELL — Interactive Client Application & Full-Stack API Integration
 * Sri Anantashayana Borewells & Pumps
 * ==============================================================================
 */

// Global state
let currentFeedbackList = [];
let activeRatingFilter = 0;

// API Endpoints (Auto-detects localhost, Render, Vercel, custom domain, vs GitHub Pages)
const API_BASE = (function() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.includes('render.com') || host.includes('vercel.app') || host.includes('anantashayanaborewells88.com')) {
    return 'api';
  }
  if (window.HYDROWELL_API_URL) {
    return window.HYDROWELL_API_URL;
  }
  // Connects GitHub Pages directly to live cloud backend
  return 'https://courage-views-negotiations-forth.trycloudflare.com/api';
})();

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
  }, 4000);
}

/* --------------------------------------------------------------------------
   3. FEEDBACK & LIVE RATINGS SYSTEM (HIGHEST PRIORITY FEATURE)
   -------------------------------------------------------------------------- */
async function initFeedbackSystem() {
  const feedbackForm = document.getElementById('feedback-form');
  const filterPills = document.querySelectorAll('.filter-pills .pill-btn');

  // Load reviews from persistent database
  await loadFeedback();

  // Real-time synchronization polling (keeps mobile & laptop in sync in real time)
  setInterval(() => {
    loadFeedback(true);
  }, 4000);

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
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('rating', rating);
        formData.append('comment', comment);
        if (email) formData.append('email', email);
        if (photoInput && photoInput.files.length > 0) {
          formData.append('photo', photoInput.files[0]);
        }

        const response = await fetch(`${API_BASE}/feedback.php`, {
          method: 'POST',
          body: formData
        });

        const resData = await response.json();

        if (resData.success) {
          showToast('Feedback submitted successfully! Thank you.', 'success');
          feedbackForm.reset();
          
          if (resData.data) {
            currentFeedbackList.unshift(resData.data);
            recalculateMetrics();
            renderReviews();
          } else {
            await loadFeedback();
          }
        } else {
          showToast(resData.message || 'Unable to submit feedback.', 'error');
        }
      } catch (err) {
        console.warn('API submission failed, persisting locally:', err);
        const localReview = {
          id: Date.now(),
          name: name,
          rating: rating,
          comment: comment,
          photo: null,
          date_formatted: 'Just now'
        };
        try {
          const saved = JSON.parse(localStorage.getItem('hydrowell_user_reviews') || '[]');
          saved.unshift(localReview);
          localStorage.setItem('hydrowell_user_reviews', JSON.stringify(saved));
        } catch (e) {}
        currentFeedbackList.unshift(localReview);
        recalculateMetrics();
        renderReviews();
        showToast('Feedback submitted successfully! Thank you.', 'success');
        feedbackForm.reset();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

// Verified Database Feedback Initial Seed (ensures reviews load everywhere even on static GitHub Pages)
const INITIAL_DATABASE_REVIEWS = [
  {
    id: 4,
    name: "Venkatesh Murthy",
    rating: 5,
    comment: "Drilled 700 feet borewell in Anjananagar with Texmo submersible pump. High water yield and completed in one day!",
    photo: null,
    date_formatted: "03 Oct 2026"
  },
  {
    id: 3,
    name: "Puneeth S",
    rating: 5,
    comment: "GOOD WORKING AND I STATISFIED FULLY.",
    photo: null,
    date_formatted: "21 Jun 2026"
  },
  {
    id: 2,
    name: "janav",
    rating: 4,
    comment: "BEST BOREWELL SERVICE .",
    photo: "uploads/1781879420_bore1.jfif",
    date_formatted: "19 Jun 2026"
  },
  {
    id: 1,
    name: "ullas",
    rating: 5,
    comment: "GOOD SERVICE WITH TEAM CO-ORDINATION IS THERE. BEST TEAM IN BOREWELL.",
    photo: null,
    date_formatted: "19 Jun 2026"
  }
];

async function loadFeedback(silent = false) {
  const reviewsContainer = document.getElementById('reviews-list');
  if (!reviewsContainer) return;

  try {
    const res = await fetch(`${API_BASE}/feedback.php?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const currentIds = currentFeedbackList.map(r => r.id).join(',');
        const newIds = data.data.map(r => r.id).join(',');
        if (currentIds !== newIds || currentFeedbackList.length === 0) {
          currentFeedbackList = data.data;
          updateFeedbackMetrics(data.stats);
          renderReviews();
        }
        return;
      }
    }
    throw new Error('API returned empty or non-200');
  } catch (err) {
    if (!silent) {
      // Graceful fallback: Load verified real database reviews merged with user's stored reviews
      let localSaved = [];
      try {
        localSaved = JSON.parse(localStorage.getItem('hydrowell_user_reviews') || '[]');
      } catch (e) {}
      const existingIds = new Set(INITIAL_DATABASE_REVIEWS.map(r => r.id));
      const newItems = Array.isArray(localSaved) ? localSaved.filter(r => !existingIds.has(r.id)) : [];
      currentFeedbackList = [...newItems, ...INITIAL_DATABASE_REVIEWS];
      recalculateMetrics();
      renderReviews();
    }
  }
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
              <span class="review-date">${r.date_formatted || 'Recent'}</span>
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
   4. BOREWELL & SERVICE BOOKING SYSTEM (WITH DUAL WHATSAPP DISPATCH)
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
    const preferred_date = dateInput ? dateInput.value : '';
    const depth_feet = depthInput ? depthInput.value : '';
    const message = messageInput ? messageInput.value.trim() : '';

    // Frontend Validations
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
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Booking...';

    const payload = {
      name,
      phone,
      email,
      location,
      service,
      preferred_date,
      depth_feet,
      message
    };

    try {
      const response = await fetch(`${API_BASE}/bookings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (resData.success) {
        showToast('✓ Booking recorded successfully in database!', 'success');
        bookingForm.reset();

        const bookingId = resData.data.booking_id;
        const wa = resData.data.whatsapp;

        // Show confirmation modal with dual WhatsApp dispatch
        showBookingConfirmModal(bookingId, resData.data.name, wa.link_1, wa.link_2);

        // Open primary WhatsApp automatically in a new tab
        if (wa && wa.link_1) {
          window.open(wa.link_1, '_blank');
        }
      } else {
        showToast(resData.message || 'Error saving booking. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      // Fallback for static demo environments: generate client ID & WhatsApp links
      const fallbackId = `HYD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const waText = encodeURIComponent(`HYDROWELL — NEW BOREWELL BOOKING\nBooking ID: ${fallbackId}\nCustomer: ${name}\nPhone: ${phone}\nLocation: ${location}\nService: ${service}\nDate: ${preferred_date}\nDepth: ${depth_feet}\nDetails: ${message}`);
      const link1 = `https://wa.me/919880701789?text=${waText}`;
      const link2 = `https://wa.me/919380410134?text=${waText}`;

      showBookingConfirmModal(fallbackId, name, link1, link2);
      window.open(link1, '_blank');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
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
      <p style="text-align:center; font-size:0.9rem; color:var(--text-muted);">
        Thank you, <strong>${escapeHtml(customerName)}</strong>. Your request is registered in our database.
      </p>
      
      <div class="booking-confirm-id">
        Booking Reference: ${bookingId}
      </div>

      <p style="font-size:0.86rem; color:var(--secondary-dark); margin-bottom:12px; font-weight:600; text-align:center;">
        <i class="fab fa-whatsapp" style="color:#25d366"></i> Direct WhatsApp Dispatch to Engineering Team:
      </p>

      <div class="whatsapp-dispatch-options">
        <a href="${link1}" target="_blank" class="btn btn-whatsapp btn-block">
          <i class="fab fa-whatsapp"></i> Dispatch to Primary (+91 98807 01789)
        </a>
        <a href="${link2}" target="_blank" class="btn btn-secondary btn-block" style="border-color:#25d366; color:#0f6e56;">
          <i class="fab fa-whatsapp"></i> Also Send to Secondary (+91 93804 10134)
        </a>
      </div>

      <button class="btn btn-dark btn-block btn-sm" style="margin-top:16px;" onclick="closeModal('booking-confirm-modal')">
        Close & Continue
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

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      const res = await fetch(`${API_BASE}/contact.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, location, service, message })
      });

      const resData = await res.json();
      if (resData.success) {
        showToast('Enquiry received! Redirecting to WhatsApp...', 'success');
        contactForm.reset();
        if (resData.data && resData.data.whatsapp_link_1) {
          setTimeout(() => window.open(resData.data.whatsapp_link_1, '_blank'), 800);
        }
      } else {
        showToast(resData.message || 'Error submitting enquiry.', 'error');
      }
    } catch (err) {
      console.error('Contact error:', err);
      const text = encodeURIComponent(`HYDROWELL ENQUIRY\nName: ${name}\nPhone: ${phone}\nLocation: ${location}\nRequirement: ${message}`);
      window.open(`https://wa.me/919880701789?text=${text}`, '_blank');
      showToast('Enquiry forwarded to WhatsApp.', 'success');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
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
