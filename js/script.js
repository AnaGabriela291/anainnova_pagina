(function () {
  'use strict';

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
    document.body.classList.remove('is-locked');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
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

  /* Scroll reveal */
  var revealTargets = document.querySelectorAll(
    '.shield-card, .project-card, .web-project-card, .about__media, .about__text, .contact__intro, .contact__form, .hero__text, .hero__media'
  );
  revealTargets.forEach(function (el) { el.classList.add('reveal'); });

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

  /* Client filters */
  var filters = document.getElementById('filters');
  var clientBlocks = document.querySelectorAll('.client-block');
  var projects = document.querySelectorAll('.project-card');
  var emptyMsg = document.getElementById('projectsEmpty');

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;

      filters.querySelectorAll('.filter').forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var client = btn.getAttribute('data-filter');
      var visibleCount = 0;

      clientBlocks.forEach(function (block) {
        var match = client === 'all' || block.getAttribute('data-client') === client;
        block.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });

      if (emptyMsg) emptyMsg.hidden = visibleCount !== 0;
    });
  }

  /* Project modal */
  var modal = document.getElementById('projectModal');
  var modalMedia = document.getElementById('projectModalMedia');
  var modalTag = document.getElementById('projectModalTag');
  var modalTitle = document.getElementById('projectModalTitle');
  var modalDesc = document.getElementById('projectModalDesc');
  var lastTrigger = null;

  /* Sizes the modal media box to the exact aspect ratio of its image/video (desktop only —
     on mobile CSS handles it with width:100%/height:auto), so there's never empty letterbox
     space around it. */
  function sizeModalMedia(naturalW, naturalH) {
    if (!naturalW || !naturalH) {
      modalMedia.style.width = '';
      modalMedia.style.height = '';
      return;
    }
    var isMobile = window.innerWidth <= 760;
    var maxH = isMobile ? window.innerHeight * 0.5 : Math.min(620, window.innerHeight * 0.82);
    var maxW = isMobile ? (window.innerWidth - 2) : Math.min(window.innerWidth * 0.56, 760);
    var ratio = naturalW / naturalH;
    var w = maxH * ratio;
    var h = maxH;
    if (w > maxW) { w = maxW; h = maxW / ratio; }
    modalMedia.style.width = Math.round(w) + 'px';
    modalMedia.style.height = Math.round(h) + 'px';
  }

  function openProjectModal(card) {
    var imgSrc = card.getAttribute('data-img');
    var videoSrc = card.getAttribute('data-video');
    var isLogo = card.querySelector('.project-card__media--logo') !== null;

    if (videoSrc) {
      modalMedia.className = 'project-modal__media has-video';
      modalMedia.innerHTML = '<video src="' + videoSrc + '" controls preload="metadata"></video>';
      modalMedia.querySelector('video').addEventListener('loadedmetadata', function () {
        sizeModalMedia(this.videoWidth, this.videoHeight);
      });
    } else if (imgSrc) {
      modalMedia.className = 'project-modal__media has-image' + (isLogo ? ' project-modal__media--logo' : '');
      modalMedia.innerHTML = '<img src="' + imgSrc + '" alt="">';
      var modalImg = modalMedia.querySelector('img');
      if (modalImg.complete && modalImg.naturalWidth) {
        sizeModalMedia(modalImg.naturalWidth, modalImg.naturalHeight);
      } else {
        modalImg.addEventListener('load', function () {
          sizeModalMedia(this.naturalWidth, this.naturalHeight);
        });
      }
    } else {
      var mediaEl = card.querySelector('.project-card__media');
      var mediaMatch = mediaEl && mediaEl.className.match(/project-card__media--(\d)/);
      modalMedia.className = 'project-modal__media' + (mediaMatch ? ' project-modal__media--' + mediaMatch[1] : '');
      modalMedia.innerHTML = '';
      modalMedia.style.width = '';
      modalMedia.style.height = '';
    }

    modalTag.textContent = card.getAttribute('data-tag') || '';
    modalTitle.textContent = card.getAttribute('data-title') || card.querySelector('h3').textContent;
    modalDesc.textContent = card.getAttribute('data-desc') || card.querySelector('p').textContent;

    lastTrigger = card;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    modal.querySelector('.project-modal__close').focus();
  }

  function closeProjectModal() {
    var video = modalMedia.querySelector('video');
    if (video) video.pause();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastTrigger) lastTrigger.focus();
  }

  if (modal && projects.length) {
    projects.forEach(function (card) {
      card.addEventListener('click', function () { openProjectModal(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProjectModal(card);
        }
      });
    });

    window.addEventListener('resize', function () {
      if (!modal.classList.contains('is-open')) return;
      var content = modalMedia.querySelector('img, video');
      if (!content) return;
      if (content.tagName === 'IMG') sizeModalMedia(content.naturalWidth, content.naturalHeight);
      else sizeModalMedia(content.videoWidth, content.videoHeight);
    });

    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeProjectModal);
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeProjectModal();
    });
  }

  /* Contact form -> WhatsApp */
  var form = document.getElementById('contactForm');
  var WHATSAPP_NUMBER = '584122128123';

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var nombre = document.getElementById('fNombre').value.trim();
      var servicio = document.getElementById('fServicio').value;
      var mensaje = document.getElementById('fMensaje').value.trim();

      var texto = 'Hola Ana! Soy ' + nombre + '.\n' +
        'Me interesa: ' + servicio + '.\n' +
        mensaje;

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(texto);
      window.open(url, '_blank', 'noopener');
    });
  }

  /* Scale live iframe previews of web projects to fit their card */
  var webPreviews = document.querySelectorAll('.web-project-card__preview');
  var PREVIEW_DESIGN_WIDTH = 1440;

  function scaleWebPreviews() {
    webPreviews.forEach(function (box) {
      var iframe = box.querySelector('iframe');
      if (!iframe) return;
      var scale = box.clientWidth / PREVIEW_DESIGN_WIDTH;
      iframe.style.transform = 'scale(' + scale + ')';
    });
  }

  if (webPreviews.length) {
    scaleWebPreviews();
    window.addEventListener('resize', scaleWebPreviews);
    window.addEventListener('load', scaleWebPreviews);
  }
})();
