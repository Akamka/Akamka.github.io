// Параллакс эффект для фонового видео
let isScrolling = false;

window.addEventListener('scroll', () => {
    if (!isScrolling) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const parallaxSpeed = 0.3;
            const video = document.querySelector('.hero-video');
            if (video) {
                video.style.transform = 
                    `translate(-50%, -${50 + (scrolled * parallaxSpeed)}%)`;
            }
            isScrolling = false;
        });
        isScrolling = true;
    }
});

// Система ленивой загрузки медиа
class VideoLoader {
    constructor() {
        this.videos = [];
        this.loadedCount = 0;
    }

    preloadAllVideos() {
        return new Promise((resolve) => {
            const videoElements = Array.from(document.querySelectorAll('video[data-src]'));
            if (videoElements.length === 0) resolve();

            videoElements.forEach(video => {
                const tempVideo = document.createElement('video');
                tempVideo.src = video.dataset.src;
                tempVideo.preload = "auto";
                
                tempVideo.addEventListener('loadeddata', () => {
                    video.src = video.dataset.src;
                    video.removeAttribute('data-src');
                    this.loadedCount++;
                    
                    if (this.loadedCount === videoElements.length) {
                        resolve();
                    }
                });
            });
        });
    }
}








// В класс PortfolioManager
class ScrollAnimator {
    constructor() {
        this.observer = new IntersectionObserver(this.handleIntersect, {
            threshold: 0.1
        });
    }

    handleIntersect = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }

    init() {
        document.querySelectorAll('.process-card').forEach(card => {
            card.style.animationPlayState = 'paused';
            this.observer.observe(card);
        });
    }
}



// Инициализация в DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... остальной код ...
    new ScrollAnimator().init();
});



// Управление портфолио и модальным окном
class PortfolioManager {
    constructor() {
        this.grid = document.querySelector('.portfolio-grid');
        this.modal = document.querySelector('.modal');
        this.modalVideo = this.modal.querySelector('.modal-video');
        this.loading = this.modal.querySelector('.loading');
        this.projects = projects; // Используем импортированный массив
    }


    init() {
        this.createItems();
        this.initModal();
        this.addHoverPreload();
    }

    createItems() {
        this.grid.innerHTML = '';
        projects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'portfolio-item';
            
            const mediaContent = project.preview ? 
                `<div class="media-wrapper">
                    <img class="portfolio-preview" 
                         src="${project.preview}" 
                         alt="${project.title}"
                         loading="lazy"
                         data-src="${project.video}">
                    <video class="preload-video" 
                           data-src="${project.video}" 
                           style="display:none;">
                    </video>
                </div>` :
                `<video class="portfolio-preview" 
                       muted 
                       loop 
                       playsinline 
                       data-src="${project.video}">
                </video>`;

            item.innerHTML = `
                ${mediaContent}
                <div class="portfolio-info">
                    <h3>${project.title}</h3>
                    <p>${project.tools}</p>
                </div>
            `;
            
            this.grid.appendChild(item);
        });
    }

    initModal() {
        const closeBtns = this.modal.querySelectorAll('.close-btn');

        this.grid.querySelectorAll('.portfolio-item').forEach(item => {
            item.addEventListener('click', () => this.openModal(item));
        });

        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    async openModal(item) {
        const videoElement = item.querySelector('video');
        const videoSrc = videoElement?.dataset.src || videoElement?.src;
        
        if (!videoSrc) {
            console.error('Video source not found');
            return;
        }

        this.showLoading();
        this.modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        try {
            await this.loadVideo(videoSrc);
            await this.playVideo();
            
            // Добавляем элементы управления
            this.modalVideo.controls = true;
            this.modalVideo.muted = false; // Разрешаем звук
            
            // Добавляем обработчики для кнопок управления
            this.addVideoControls();
        } catch (error) {
            this.handleVideoError(error);
        } finally {
            this.hideLoading();
        }
    }

    addVideoControls() {
        // Создаем кастомные элементы управления
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'video-controls';
        
        const playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'video-control';
        playPauseBtn.innerHTML = '⏯';
        
        const muteBtn = document.createElement('button');
        muteBtn.className = 'video-control';
        muteBtn.innerHTML = '🔊';

        // Добавляем обработчики
        playPauseBtn.addEventListener('click', () => {
            this.modalVideo.paused ? this.modalVideo.play() : this.modalVideo.pause();
        });

        muteBtn.addEventListener('click', () => {
            this.modalVideo.muted = !this.modalVideo.muted;
            muteBtn.innerHTML = this.modalVideo.muted ? '🔇' : '🔊';
        });

        // Добавляем элементы в DOM
        controlsContainer.appendChild(playPauseBtn);
        controlsContainer.appendChild(muteBtn);
        this.modalContent.appendChild(controlsContainer);
    }

    closeModal() {
        this.modal.classList.remove('open');
        this.modalVideo.pause();
        this.modalVideo.currentTime = 0;
        document.body.style.overflow = '';
        
        // Удаляем кастомные элементы управления
        const controls = this.modal.querySelector('.video-controls');
        if (controls) controls.remove();
    }


    showLoading() {
        this.loading.classList.add('active');
        this.modalVideo.controls = false;
    }

    hideLoading() {
        this.loading.classList.remove('active');
    }

    loadVideo(src) {
        return new Promise((resolve, reject) => {
            this.modalVideo.src = src;
            this.modalVideo.muted = true;
            this.modalVideo.playsInline = true;

            const handleLoadedData = () => {
                this.modalVideo.removeEventListener('loadeddata', handleLoadedData);
                resolve();
            };

            const handleError = (error) => {
                this.modalVideo.removeEventListener('error', handleError);
                reject(error);
            };

            this.modalVideo.addEventListener('loadeddata', handleLoadedData);
            this.modalVideo.addEventListener('error', handleError);
            
            this.modalVideo.load();
        });
    }

    async playVideo() {
        try {
            await this.modalVideo.play();
        } catch (error) {
            this.modalVideo.controls = true;
            throw error;
        }
    }

    handleVideoError(error) {
        console.error('Video error:', error);
        this.modalVideo.controls = true;
    }

    closeModal() {
        this.modal.classList.remove('open');
        this.modalVideo.pause();
        this.modalVideo.currentTime = 0;
        this.modalVideo.controls = false;
        document.body.style.overflow = '';
    }

    addHoverPreload() {
        this.grid.querySelectorAll('.portfolio-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const media = item.querySelector('video');
                if (media?.dataset.src && !media.src) {
                    media.src = media.dataset.src;
                    media.removeAttribute('data-src');
                }
            }, { once: true });
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.querySelector('.preloader');
    
    const portfolioManager = new PortfolioManager();
    portfolioManager.init();

    const videoLoader = new VideoLoader();
    
    // Предзагрузка всех ресурсов
    Promise.all([
        videoLoader.preloadAllVideos(),
        new Promise(resolve => window.addEventListener('load', resolve))
    ]).then(() => {
        // Искусственная задержка для плавности
        setTimeout(() => {
            preloader.classList.add('loaded');
        }, 500);
    });

    // Остальная инициализация...
    
    
    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    new ThemeManager();
});












//Форма для отправки
// Инициализация EmailJS (замените значения на свои)
//Форма для отправки
emailjs.init('fmY8Hg46PZYlVKj4C');

class FormHandler {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.success = document.querySelector('.success-message'); // Исправлен класс
        this.error = document.querySelector('.error-message'); // Исправлен класс
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault(); // Важно: предотвращаем перезагрузку
        
        // Добавим проверку валидности формы
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const templateParams = {
            name: this.form.name.value,
            email: this.form.email.value,
            contact: this.form.contact.value,
            message: this.form.message.value,
            date: new Date().toLocaleString()
        };

        try {
            // Добавим индикатор загрузки
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Отправка...';

            const response = await emailjs.send(
                'service_i45e25w',
                'template_jt8idty',
                templateParams
            );
            
            this.showStatus(this.success);
            this.form.reset();
        } catch (err) {
            console.error('Ошибка отправки:', err);
            this.showStatus(this.error);
        } finally {
            if (this.form.querySelector('button[type="submit"]')) {
                const submitBtn = this.form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Отправить';
            }
        }
    }

    showStatus(element) {
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
        
        // Плавная прокрутка к сообщению
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Инициализация после полной загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    new FormHandler().init();
});