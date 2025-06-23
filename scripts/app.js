// scripts/app.js
import projects from './projects-data.js';

//! Параллакс эффект фона
let isScrolling = false;
window.addEventListener('scroll', () => {
  if (!isScrolling) {
    window.requestAnimationFrame(() => {
      const scrolled = window.pageYOffset;
      const parallaxSpeed = 0.3;
      const video = document.querySelector('.hero-video');
      if (video) {
        video.style.transform = `translate(-50%, -${50 + scrolled * parallaxSpeed}%)`;
      }
      isScrolling = false;
    });
    isScrolling = true;
  }
});

//! Ленивая предзагрузка видео
class VideoLoader {
  constructor() { this.loadedCount = 0; }
  preloadAllVideos() {
    return new Promise(resolve => {
      const els = Array.from(document.querySelectorAll('video[data-src]'));
      if (!els.length) return resolve();
      els.forEach(v => {
        const tmp = document.createElement('video');
        tmp.src = v.dataset.src;
        tmp.preload = 'auto';
        tmp.addEventListener('loadeddata', () => {
          v.src = v.dataset.src;
          v.removeAttribute('data-src');
          if (++this.loadedCount === els.length) resolve();
        });
      });
    });
  }
}

//! Анимация process-карточек
class ScrollAnimator {
  constructor() {
    this.observer = new IntersectionObserver(this.onIntersect, { threshold: 0.1 });
  }
  onIntersect = entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.style.animationPlayState = 'running';
    });
  }
  init() {
    document.querySelectorAll('.process-card').forEach(card => {
      card.style.animationPlayState = 'paused';
      this.observer.observe(card);
    });
  }
}

//! Основной менеджер портфолио
class PortfolioManager {
  constructor() {
    this.grid = document.querySelector('.portfolio-grid');
    this.paginationContainer = document.querySelector('.pagination');
    this.modal = document.querySelector('.modal');
    this.modalContent = this.modal.querySelector('.modal-content');
    this.modalVideo = this.modal.querySelector('.modal-video');
    this.loading = this.modal.querySelector('.loading');
    this.projects = projects;
    this.currentCategory = 'Motion design';
    this.perPage = 15;
    this.currentPage = 1;
  }

  init() {
    this.setupFilters();
    this.render();
  }

  setupFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
      if (btn.dataset.category === this.currentCategory) btn.classList.add('active');
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.category;
        this.currentPage = 1;
        this.render();
      });
    });
  }

    render() {
    const filtered = this.projects.filter(p => p.category === this.currentCategory);
    const totalPages = Math.ceil(filtered.length / this.perPage);
    const start = (this.currentPage - 1) * this.perPage;
    const pageItems = filtered.slice(start, start + this.perPage);

    this.grid.innerHTML = '';
    pageItems.forEach(p => {
        const origIdx = this.projects.indexOf(p);    // <-- здесь
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        item.dataset.index = origIdx;                 // <-- и здесь

      let mediaHTML;
      if (Array.isArray(p.gallery)) {
        mediaHTML = `
          <div class="media-wrapper gallery-preview">
            <img src="${p.preview}" class="portfolio-preview" />
            <span class="gallery-icon">🖼️</span>
          </div>`;
      } else if (p.preview) {
        mediaHTML = `
          <div class="media-wrapper">
            <img class="portfolio-preview"
                 src="${p.preview}"
                 loading="lazy"
                 data-src="${p.video}">
            <video class="preload-video"
                   data-src="${p.video}"
                   style="display:none;"></video>
          </div>`;
      } else {
        mediaHTML = `
          <div class="media-wrapper">
            <video class="portfolio-preview"
                   muted loop playsinline
                   preload="metadata"
                   src="${p.video}">
            </video>
          </div>`;
      }

      item.innerHTML = mediaHTML;
      item.addEventListener('click', () => this.openModal(item));
      this.grid.appendChild(item);
    });

    this.addHoverPreload();
    this.setupModalClose();
    this.renderPagination(totalPages);
  }

  renderPagination(totalPages) {
    this.paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.textContent = '« Prev';
    prev.disabled = this.currentPage === 1;
    prev.addEventListener('click', () => this.changePage(this.currentPage - 1));
    this.paginationContainer.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === this.currentPage) btn.classList.add('active');
      btn.addEventListener('click', () => this.changePage(i));
      this.paginationContainer.appendChild(btn);
    }

    const next = document.createElement('button');
    next.textContent = 'Next »';
    next.disabled = this.currentPage === totalPages;
    next.addEventListener('click', () => this.changePage(this.currentPage + 1));
    this.paginationContainer.appendChild(next);
  }

  changePage(page) {
    this.currentPage = page;
    this.render();
  }

  addHoverPreload() {
    this.grid.querySelectorAll('.portfolio-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const v = item.querySelector('video');
        if (v?.dataset.src && !v.src) {
          v.src = v.dataset.src;
          v.removeAttribute('data-src');
        }
      }, { once: true });
    });
  }

  setupModalClose() {
    this.modal.querySelectorAll('.close-btn').forEach(btn =>
      btn.addEventListener('click', () => this.closeModal())
    );
    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) this.closeModal();
    });
  }

async openModal(item) {
  const idx = +item.dataset.index;
  const p = this.projects[idx];

  // Сбросим все
  this.modalContent.innerHTML = '';
  this.modalContent.classList.remove('gallery-mode');    // убираем, если было
  this.modalContent.classList.remove('video-mode');

  this.modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Кнопка закрыть
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => this.closeModal());
  this.modalContent.append(closeBtn);

  if (Array.isArray(p.gallery)) {
    // Галерея
    this.modalContent.classList.add('gallery-mode');

    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'gallery-container';

    p.gallery.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'gallery-image';
      galleryContainer.append(img);
    });

    this.modalContent.append(galleryContainer);
    return;
  }

  // Видео-режим
  this.modalContent.classList.add('video-mode');
  this.showLoading();
  this.modalContent.append(this.modalVideo);
  try {
    await this.loadVideo(p.video);
    await this.modalVideo.play();
    this.modalVideo.controls = true;
    this.modalVideo.muted = false;
  } catch {
    this.modalVideo.controls = true;
  } finally {
    this.hideLoading();
  }
}


  loadVideo(src) {
    return new Promise((res, rej) => {
      this.modalVideo.src = src;
      this.modalVideo.muted = true;
      this.modalVideo.playsInline = true;
      const onL = () => { this.modalVideo.removeEventListener('loadeddata', onL); res(); };
      const onE = () => { this.modalVideo.removeEventListener('error', onE); rej(); };
      this.modalVideo.addEventListener('loadeddata', onL);
      this.modalVideo.addEventListener('error', onE);
      this.modalVideo.load();
    });
  }

  showLoading() { this.loading.classList.add('active'); }
  hideLoading() { this.loading.classList.remove('active'); }

  closeModal() {
    this.modal.classList.remove('open');
    this.modalVideo.pause();
    this.modalVideo.currentTime = 0;
    this.modalVideo.controls = false;
    document.body.style.overflow = '';
  }
}

//! EmailJS форма
class FormHandler {
  constructor() {
    this.form = document.getElementById('contactForm');
    this.success = document.querySelector('.success-message');
    this.error = document.querySelector('.error-message');
  }
  init() {
    emailjs.init('fmY8Hg46PZYlVKj4C');
    this.form.addEventListener('submit', e => this.onSubmit(e));
  }
  async onSubmit(e) {
    e.preventDefault();
    if (!this.form.checkValidity()) {
      this.form.reportValidity();
      return;
    }
    const btn = this.form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Отправка...';
    const data = {
      name: this.form.name.value,
      email: this.form.email.value,
      contact: this.form.contact.value,
      message: this.form.message.value,
      date: new Date().toLocaleString()
    };
    try {
      await emailjs.send('service_i45e25w','template_jt8idty', data);
      this.show(this.success);
      this.form.reset();
    } catch {
      this.show(this.error);
    } finally {
      btn.disabled = false; btn.textContent = 'Отправить';
    }
  }
  show(el) {
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

//! Cursor trail effect
class CursorTrail {
  constructor() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'cursor-trail';
    document.body.append(this.cursor);

    this.mouseX = this.mouseY = this.posX = this.posY = 0;
    this.lastSpawn = 0;
    this.spawnInterval = 20;

    document.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this.loop();
  }

  loop() {
    const now = performance.now();
    const dx = this.mouseX - this.posX;
    const dy = this.mouseY - this.posY;
    this.posX += dx * 0.2;
    this.posY += dy * 0.2;
    this.cursor.style.transform = `translate(${this.posX}px, ${this.posY}px)`;

    if (Math.hypot(dx, dy) > 0.1 && now - this.lastSpawn > this.spawnInterval) {
      this.spawn();
      this.lastSpawn = now;
    }

    requestAnimationFrame(() => this.loop());
  }

  spawn() {
    const p = document.createElement('div');
    p.className = 'trail-particle';
    const angle = Math.atan2(this.mouseY - this.posY, this.mouseX - this.posX);
    const variance = Math.PI / 8;
    const randAngle = angle + (Math.random() - 0.5) * variance;
    const distance = 15 + Math.random() * 20;
    p.style.setProperty('--tx', `${Math.cos(randAngle) * distance}px`);
    p.style.setProperty('--ty', `${Math.sin(randAngle) * distance}px`);
    p.style.left = `${this.posX}px`;
    p.style.top = `${this.posY}px`;
    document.body.append(p);
    setTimeout(() => p.remove(), 800);
  }
}

//! Инициализация всего приложения
window.addEventListener('DOMContentLoaded', () => {
  new ScrollAnimator().init();
  new PortfolioManager().init();
  new FormHandler().init();

  const loader = new VideoLoader();
  Promise.all([
    loader.preloadAllVideos(),
    new Promise(r => window.addEventListener('load', r))
  ]).then(() =>
    setTimeout(() => document.querySelector('.preloader').classList.add('loaded'), 500)
  );

  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href'))
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
  );

  new CursorTrail();
});
