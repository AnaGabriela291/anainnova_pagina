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
    '.shield-card, .project-card, .audience-card, .detail-card, .about__media, .about__text, .contact__intro, .contact__form, .hero__text, .hero__media'
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

  /* Project filters */
  var filters = document.getElementById('filters');
  var projects = document.querySelectorAll('.project-card');
  var emptyMsg = document.getElementById('projectsEmpty');

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;

      filters.querySelectorAll('.filter').forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var cat = btn.getAttribute('data-filter');
      var visibleCount = 0;

      projects.forEach(function (card) {
        var match = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('is-hidden', !match);
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

  function openProjectModal(card) {
    var mediaEl = card.querySelector('.project-card__media');
    var mediaMatch = mediaEl && mediaEl.className.match(/project-card__media--(\d)/);

    modalMedia.className = 'project-modal__media' + (mediaMatch ? ' project-modal__media--' + mediaMatch[1] : '');
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

    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeProjectModal);
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeProjectModal();
    });
  }

  /* Process step pills */
  var stepFilters = document.getElementById('stepFilters');
  var stepDesc = document.getElementById('stepDesc');
  var stepText = {
    '1': 'Me cuentas tu idea, tu negocio y qué necesitas. Con eso te armo una propuesta clara, sin letra chica.',
    '2': 'Armo la identidad visual y el diseño de cada pantalla antes de tocar una línea de código, para que apruebes el look primero.',
    '3': 'Desarrollo tu web o pieza final con código limpio, rápido y optimizado para celular.',
    '4': 'Revisamos todo juntos, hacemos los últimos ajustes y entrego el proyecto listo para publicar.'
  };

  if (stepFilters && stepDesc) {
    stepFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;

      stepFilters.querySelectorAll('.filter').forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var step = btn.getAttribute('data-step');
      if (stepText[step]) stepDesc.textContent = stepText[step];
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
})();
