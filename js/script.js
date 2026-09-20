(function () {
  'use strict';

  var WHATSAPP_NUMBER = '584122128123';

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Mobile nav */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  var scrim = document.getElementById('navScrim');

  function closeNav() {
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    scrim.classList.remove('is-open');
    document.body.classList.remove('is-locked');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      scrim.classList.toggle('is-open', isOpen);
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('is-locked', isOpen);
    });

    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    scrim.addEventListener('click', closeNav);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* Stagger reveal delays within groups, so items cascade in one after another */
  var STAGGER_STEP_MS = 90;
  function stagger(groupSelector, itemSelector) {
    document.querySelectorAll(groupSelector).forEach(function (group) {
      var items = itemSelector ? group.querySelectorAll(itemSelector) : [group];
      items.forEach(function (el, i) {
        el.style.setProperty('--reveal-delay', (i * STAGGER_STEP_MS) + 'ms');
      });
    });
  }
  stagger('.hero__text', '.hero-stagger');
  stagger('.services-grid', '.service-card');
  stagger('.proyectos__category-grid', '.portfolio-card, .social-card, .web-card, .video-card');
  stagger('.timeline', '.timeline__step');
  stagger('.about__list', 'li');

  /* Scroll reveal */
  var revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Animated stat counters */
  var counters = document.querySelectorAll('[data-count-to]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';

    if (reduceMotion) {
      el.textContent = prefix + String(target).padStart(2, '0') + suffix;
      return;
    }

    var duration = 1400;
    var start = null;

    function tick(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(eased * target);
      el.textContent = prefix + String(value).padStart(2, '0') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var counterIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) { counterIo.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* Card carousels — arrows + dots adapt to however many cards the track holds */
  var carouselRefreshers = [];

  function setupCarousel(root) {
    var viewport = root.querySelector('[data-carousel-viewport]');
    var track = root.querySelector('[data-carousel-track]');
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var dotsBox = root.querySelector('[data-carousel-dots]');
    var slides = Array.prototype.slice.call(track ? track.children : []);
    if (!viewport || !slides.length) return;

    var dots = [];
    /* Where we are heading, so quick repeat clicks don't read a scroll still in flight */
    var targetIndex = 0;

    /* Distance from one card to the next, gap included */
    function step() {
      if (slides.length > 1) return slides[1].offsetLeft - slides[0].offsetLeft;
      return slides[0].offsetWidth;
    }
    function maxScroll() { return viewport.scrollWidth - viewport.clientWidth; }
    function perView() {
      var s = step();
      return s > 0 ? Math.max(1, Math.round(viewport.clientWidth / s)) : 1;
    }
    function positions() { return Math.max(1, slides.length - perView() + 1); }
    function currentIndex() {
      var s = step();
      return s > 0 ? Math.round(viewport.scrollLeft / s) : 0;
    }

    function goTo(index) {
      targetIndex = Math.max(0, Math.min(index, positions() - 1));
      var target = Math.min(targetIndex * step(), maxScroll());
      if (viewport.scrollTo) {
        viewport.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        viewport.scrollLeft = target;
      }
    }

    function buildDots() {
      if (!dotsBox) return;
      var count = positions();
      if (dots.length === count) return;
      dotsBox.innerHTML = '';
      dots = [];
      for (var i = 0; i < count; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Ir a la posición ' + (i + 1));
        (function (index) {
          dot.addEventListener('click', function () { goTo(index); });
        })(i);
        dotsBox.appendChild(dot);
        dots.push(dot);
      }
    }

    function sync() {
      /* Hidden by a filter: nothing to measure yet */
      if (!viewport.clientWidth) return;

      var scrollable = maxScroll() > 1;
      root.classList.toggle('is-static', !scrollable);
      if (!scrollable) return;

      buildDots();

      if (prev) prev.disabled = viewport.scrollLeft <= 1;
      if (next) next.disabled = viewport.scrollLeft >= maxScroll() - 1;

      /* Scrolling has settled by now (the handler is debounced), so trust the real position */
      targetIndex = Math.max(0, Math.min(currentIndex(), positions() - 1));

      var active = Math.min(targetIndex, dots.length - 1);
      dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === active); });
    }

    if (prev) prev.addEventListener('click', function () { goTo(targetIndex - 1); });
    if (next) next.addEventListener('click', function () { goTo(targetIndex + 1); });

    viewport.addEventListener('scroll', function () {
      window.clearTimeout(viewport._syncTimer);
      viewport._syncTimer = window.setTimeout(sync, 80);
    });
    window.addEventListener('resize', sync);

    carouselRefreshers.push(sync);
    sync();
  }

  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);

  /* Portfolio filters — toggle whole category blocks */
  var filters = document.getElementById('filters');
  var categoryBlocks = document.querySelectorAll('.proyectos__category');

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      if (btn.classList.contains('is-active')) return;

      filters.querySelectorAll('.filter').forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var cat = btn.getAttribute('data-filter');

      categoryBlocks.forEach(function (block) {
        block.style.opacity = 0;
      });

      setTimeout(function () {
        categoryBlocks.forEach(function (block) {
          var match = cat === 'all' || block.getAttribute('data-cat-group') === cat;
          block.classList.toggle('is-hidden', !match);
          block.style.opacity = '';
        });
        /* Tracks measure as 0 while hidden — re-measure once they are back */
        carouselRefreshers.forEach(function (refresh) { refresh(); });
      }, reduceMotion ? 0 : 200);
    });
  }

  /* Project modal (image/video lightbox for social-card and video-card items) */
  var projectModal = document.getElementById('projectModal');
  var projectModalMedia = document.getElementById('projectModalMedia');
  var projectModalTitle = document.getElementById('projectModalTitle');
  var projectModalDesc = document.getElementById('projectModalDesc');
  var projectCards = document.querySelectorAll('.social-card, .video-card');

  function sizeProjectModalMedia(naturalW, naturalH) {
    if (!naturalW || !naturalH) {
      projectModalMedia.style.width = '';
      projectModalMedia.style.height = '';
      return;
    }
    var isMobile = window.innerWidth <= 760;
    var maxH = isMobile ? window.innerHeight * 0.5 : Math.min(620, window.innerHeight * 0.82);
    var maxW = isMobile ? (window.innerWidth - 2) : Math.min(window.innerWidth * 0.56, 760);
    var ratio = naturalW / naturalH;
    var w = maxH * ratio;
    var h = maxH;
    if (w > maxW) { w = maxW; h = maxW / ratio; }
    projectModalMedia.style.width = Math.round(w) + 'px';
    projectModalMedia.style.height = Math.round(h) + 'px';
  }

  function openProjectModal(card) {
    var imgSrc = card.getAttribute('data-img');
    var videoSrc = card.getAttribute('data-video');

    projectModalTag.textContent = card.classList.contains('video-card') ? 'Video' : 'Redes Sociales';

    if (videoSrc) {
      projectModalMedia.innerHTML = '<video src="' + videoSrc + '" controls autoplay playsinline></video>';
      var modalVideo = projectModalMedia.querySelector('video');
      modalVideo.addEventListener('loadedmetadata', function () {
        sizeProjectModalMedia(this.videoWidth, this.videoHeight);
      });
    } else {
      projectModalMedia.innerHTML = '<img src="' + imgSrc + '" alt="">';
      var modalImg = projectModalMedia.querySelector('img');
      if (modalImg.complete && modalImg.naturalWidth) {
        sizeProjectModalMedia(modalImg.naturalWidth, modalImg.naturalHeight);
      } else {
        modalImg.addEventListener('load', function () {
          sizeProjectModalMedia(this.naturalWidth, this.naturalHeight);
        });
      }
    }

    projectModalTitle.textContent = card.getAttribute('data-title') || '';
    projectModalDesc.textContent = card.getAttribute('data-desc') || '';

    projectModal.classList.add('is-open');
    projectModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    projectModal.querySelector('.project-modal__close').focus();
  }

  function closeProjectModal() {
    var video = projectModalMedia.querySelector('video');
    if (video) video.pause();
    projectModal.classList.remove('is-open');
    projectModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  }

  if (projectModal && projectCards.length) {
    projectCards.forEach(function (card) {
      card.addEventListener('click', function () { openProjectModal(card); });
    });

    projectModal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeProjectModal);
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && projectModal.classList.contains('is-open')) closeProjectModal();
    });

    window.addEventListener('resize', function () {
      if (!projectModal.classList.contains('is-open')) return;
      var content = projectModalMedia.querySelector('img, video');
      if (!content) return;
      if (content.tagName === 'VIDEO') sizeProjectModalMedia(content.videoWidth, content.videoHeight);
      else sizeProjectModalMedia(content.naturalWidth, content.naturalHeight);
    });
  }

  /* Contact form -> WhatsApp */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var nombre = document.getElementById('fNombre').value.trim();
      var correo = document.getElementById('fCorreo').value.trim();
      var servicio = document.getElementById('fServicio').value;
      var mensaje = document.getElementById('fMensaje').value.trim();

      var texto = 'Hola Ana! Soy ' + nombre + '.\n' +
        'Me interesa: ' + servicio + '.\n' +
        (correo ? 'Mi correo: ' + correo + '.\n' : '') +
        mensaje;

      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });
  }

  /* Lead popup modal */
  var leadModal = document.getElementById('leadModal');
  var leadForm = document.getElementById('leadForm');
  var leadServices = document.getElementById('leadServices');
  var leadNeed = document.getElementById('lNeed');

  function openLeadModal() {
    leadModal.classList.add('is-open');
    leadModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
  }

  function closeLeadModal() {
    leadModal.classList.remove('is-open');
    leadModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  }

  if (leadModal) {
    leadModal.querySelectorAll('[data-lead-close]').forEach(function (el) {
      el.addEventListener('click', closeLeadModal);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && leadModal.classList.contains('is-open')) closeLeadModal();
    });

    if (leadServices) {
      leadServices.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          leadServices.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          leadNeed.value = btn.getAttribute('data-service');
        });
      });
    }

    if (leadForm) {
      leadForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = document.getElementById('lName').value.trim();
        var phone = document.getElementById('lPhone').value.trim();
        var email = document.getElementById('lEmail').value.trim();
        var need = document.getElementById('lNeed').value;
        var details = document.getElementById('lDetails').value.trim();

        var texto = 'Hola Ana! Soy ' + name + '.\n' +
          'Me interesa: ' + need + '.\n' +
          'Mi teléfono: ' + phone + '.\n' +
          'Mi correo: ' + email + '.\n' +
          details;

        window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
        closeLeadModal();
      });
    }

    /* Se muestra una sola vez por visita: recargar la pagina no lo repite */
    var LEAD_VISTO = "anainnova:lead-visto";

    function leadYaMostrado() {
      /* En navegacion privada o con el almacenamiento bloqueado esto puede fallar */
      try { return sessionStorage.getItem(LEAD_VISTO) === "1"; } catch (e) { return false; }
    }
    function marcarLeadMostrado() {
      try { sessionStorage.setItem(LEAD_VISTO, "1"); } catch (e) {}
    }

    function programarLead() {
      if (leadYaMostrado()) return;
      setTimeout(function () {
        marcarLeadMostrado();
        openLeadModal();
      }, 900);
    }

    /* Si la pagina ya termino de cargar, "load" no vuelve a dispararse */
    if (document.readyState === "complete") programarLead();
    else window.addEventListener("load", programarLead);
  }
})();
