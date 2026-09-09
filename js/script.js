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

  /* Portfolio filters */
  var filters = document.getElementById('filters');
  var cards = document.querySelectorAll('.portfolio-card');
  var emptyMsg = document.getElementById('portfolioEmpty');

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;

      filters.querySelectorAll('.filter').forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var cat = btn.getAttribute('data-filter');
      var visibleCount = 0;

      cards.forEach(function (card) {
        var match = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });

      if (emptyMsg) emptyMsg.hidden = visibleCount !== 0;
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

    /* Appears automatically every time the page loads */
    window.addEventListener('load', function () {
      setTimeout(openLeadModal, 900);
    });
  }
})();
