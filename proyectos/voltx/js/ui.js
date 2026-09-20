/* ============================================================
   VOLTX — Design system en runtime
   Componentes obligatorios §4.4 (botones, tablas, modal, drawer,
   toast, stepper, uploader, galería, firma, kanban, calendario,
   mapa, timeline, empty/skeleton/error).
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- iconos (lineales, estilo Lucide) ---------- */
  var P = {
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/>',
    files: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    layers: '<path d="m12.83 2.18 8.34 4.17a1 1 0 0 1 0 1.3l-8.34 4.17a2 2 0 0 1-1.66 0L2.83 7.65a1 1 0 0 1 0-1.3l8.34-4.17a2 2 0 0 1 1.66 0Z"/><path d="m2.83 12.35 8.34 4.17a2 2 0 0 0 1.66 0l8.34-4.17"/><path d="m2.83 17.35 8.34 4.17a2 2 0 0 0 1.66 0l8.34-4.17"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    map: '<path d="M14.1 4.1 20 2v16l-5.9 2.1a2 2 0 0 1-1.3 0L9.2 18.9a2 2 0 0 0-1.3 0L4 20V4l3.9-1.4a2 2 0 0 1 1.3 0l3.6 1.5a2 2 0 0 0 1.3 0Z"/><path d="M9 3v15M15 6v15"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a8 8 0 0 0-16 0v2Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
    bar: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
    bell: '<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.4 13.92 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 5.92-2.74 7.33"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevU: '<path d="m18 15-6-6-6 6"/>',
    arrowL: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M14.54 3.46 21 10l-6.46 6.54"/><path d="M3 12h18"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    trend: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    star: '<path d="M11.5 2.5 14 8l6 .9-4.3 4.2 1 6-5.2-2.8L6.3 19l1-6L3 8.9 9 8Z"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<path d="m15.5 7.5 3 3L22 7l-3-3"/><path d="m18.5 10.5-8 8"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'
  };

  function icon(name, size, cls) {
    var d = P[name] || P.info;
    return '<svg class="' + (cls || '') + '" width="' + (size || 16) + '" height="' + (size || 16) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* ---------- escape ---------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- toast ---------- */
  function toast(msg, kind) {
    var host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    var ic = kind === 'err' ? 'alert' : kind === 'ok' ? 'checkCircle' : 'info';
    el.innerHTML = '<span class="tc">' + icon(ic, 17) + '</span><span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .25s';
      setTimeout(function () { el.remove(); }, 260); }, 3400);
  }

  /* ---------- modal ---------- */
  var openLayers = [];
  function closeTop() {
    var l = openLayers.pop();
    if (l && l.el) l.el.remove();
    if (!openLayers.length) document.body.style.overflow = '';
  }
  function closeAll() { while (openLayers.length) closeTop(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openLayers.length) closeTop(); });

  function modal(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'overlay';
    wrap.innerHTML =
      '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-h"><div><h3>' + esc(opts.title) + '</h3>' +
          (opts.subtitle ? '<p class="small muted mt2">' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
          '<button class="icon-btn" data-close aria-label="Cerrar">' + icon('x', 18) + '</button></div>' +
        '<div class="modal-b">' + (opts.body || '') + '</div>' +
        (opts.footer === null ? '' : '<div class="modal-f">' + (opts.footer || '<button class="btn btn-outline" data-close>Cerrar</button>') + '</div>') +
      '</div>';
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) closeTop(); });
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeTop();
    });
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    openLayers.push({ el: wrap });
    if (opts.onMount) opts.onMount(wrap);
    var f = wrap.querySelector('input,select,textarea,button:not([data-close])');
    if (f) try { f.focus(); } catch (e) {}
    return wrap;
  }

  function drawer(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'drawer-wrap';
    wrap.innerHTML =
      '<div class="drawer ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-h"><div style="min-width:0">' +
          (opts.eyebrow ? '<div class="xs muted bold" style="text-transform:uppercase;letter-spacing:.06em">' + esc(opts.eyebrow) + '</div>' : '') +
          '<h3 class="truncate">' + esc(opts.title) + '</h3>' +
          (opts.subtitle ? '<p class="small muted mt2">' + opts.subtitle + '</p>' : '') + '</div>' +
          '<button class="icon-btn" data-close aria-label="Cerrar">' + icon('x', 18) + '</button></div>' +
        '<div class="modal-b">' + (opts.body || '') + '</div>' +
        (opts.footer ? '<div class="modal-f">' + opts.footer + '</div>' : '') +
      '</div>';
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) closeTop(); });
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeTop(); });
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    openLayers.push({ el: wrap });
    if (opts.onMount) opts.onMount(wrap);
    return wrap;
  }

  function confirm(opts, cb) {
    modal({
      title: opts.title || '¿Confirmas la acción?',
      body: '<p>' + esc(opts.body || 'Esta acción no se puede deshacer.') + '</p>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button>' +
              '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" id="cfm">' +
              esc(opts.ok || 'Confirmar') + '</button>',
      onMount: function (w) {
        w.querySelector('#cfm').addEventListener('click', function () { closeTop(); cb && cb(); });
      }
    });
  }

  function prompt(opts, cb) {
    modal({
      title: opts.title,
      body: '<div class="field"><label for="pv">' + esc(opts.label || '') + '</label>' +
        (opts.textarea ? '<textarea class="textarea" id="pv" placeholder="' + esc(opts.placeholder || '') + '">' + esc(opts.value || '') + '</textarea>'
                       : '<input class="input" id="pv" value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '">') +
        (opts.hint ? '<span class="hint">' + esc(opts.hint) + '</span>' : '') + '</div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="pok">' + esc(opts.ok || 'Guardar') + '</button>',
      onMount: function (w) {
        w.querySelector('#pok').addEventListener('click', function () {
          var v = w.querySelector('#pv').value.trim();
          if (opts.required && !v) { toast('Este campo es obligatorio.', 'err'); return; }
          closeTop(); cb && cb(v);
        });
      }
    });
  }

  /* ---------- badges ---------- */
  function badge(map, key) {
    var d = (map || {})[key];
    if (!d) return '<span class="badge b-gray">' + esc(key || '—') + '</span>';
    return '<span class="badge ' + d.badge + '">' + esc(d.label) + '</span>';
  }

  function avatar(name, cls) {
    return '<span class="av ' + (cls || '') + '" title="' + esc(name) + '">' + esc(VOLTX.initials(name)) + '</span>';
  }

  /* ---------- tabla con búsqueda, filtros, orden, paginación ---------- */
  function table(host, cfg) {
    var state = {
      q: '', page: 1, per: cfg.per || 10,
      sort: cfg.sort || null, dir: cfg.dir || 'asc',
      filters: {}
    };
    (cfg.filters || []).forEach(function (f) { state.filters[f.key] = f.value || ''; });

    function filtered() {
      var rows = cfg.rows();
      if (state.q) {
        var q = state.q.toLowerCase();
        rows = rows.filter(function (r) { return String(cfg.search(r)).toLowerCase().indexOf(q) >= 0; });
      }
      (cfg.filters || []).forEach(function (f) {
        var v = state.filters[f.key];
        if (v) rows = rows.filter(function (r) { return f.match(r, v); });
      });
      if (state.sort) {
        var col = cfg.cols.filter(function (c) { return c.key === state.sort; })[0];
        if (col) {
          rows = rows.slice().sort(function (a, b) {
            var av = col.sortVal ? col.sortVal(a) : (a[col.key] || ''),
                bv = col.sortVal ? col.sortVal(b) : (b[col.key] || '');
            if (av < bv) return state.dir === 'asc' ? -1 : 1;
            if (av > bv) return state.dir === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
      return rows;
    }

    function render() {
      var rows = filtered();
      var pages = Math.max(1, Math.ceil(rows.length / state.per));
      if (state.page > pages) state.page = pages;
      var slice = rows.slice((state.page - 1) * state.per, state.page * state.per);

      var h = '<div class="card">';
      // toolbar
      h += '<div class="tbl-toolbar">';
      if (cfg.search) {
        h += '<div class="search">' + icon('search', 15) +
             '<input class="input" data-q placeholder="' + esc(cfg.placeholder || 'Buscar…') + '" value="' + esc(state.q) + '"></div>';
      }
      (cfg.filters || []).forEach(function (f) {
        h += '<select class="select" data-f="' + f.key + '" style="width:auto;min-width:130px">' +
             '<option value="">' + esc(f.label) + '</option>' +
             f.options.map(function (o) {
               return '<option value="' + esc(o.value) + '"' + (state.filters[f.key] === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
             }).join('') + '</select>';
      });
      if (cfg.exportName) {
        h += '<button class="btn btn-outline btn-sm" data-export>' + icon('download', 14) + ' Exportar</button>';
      }
      if (cfg.actions) h += '<div style="margin-left:auto" class="row gap2">' + cfg.actions + '</div>';
      h += '</div>';

      if (!rows.length) {
        h += (cfg.empty || emptyState({ icon: 'inbox', title: 'Sin resultados',
              text: state.q || Object.keys(state.filters).some(function (k) { return state.filters[k]; })
                ? 'Ningún registro coincide con los filtros aplicados.' : 'Todavía no hay registros en este módulo.' }));
      } else {
        h += '<div class="tbl-wrap"><table class="tbl"><thead><tr>';
        cfg.cols.forEach(function (c) {
          h += '<th class="' + (c.right ? 'right ' : '') + (c.sortable !== false ? 'sortable' : '') + '"' +
               (c.sortable !== false ? ' data-sort="' + c.key + '"' : '') + '>' + esc(c.label) +
               (state.sort === c.key ? ' ' + (state.dir === 'asc' ? '↑' : '↓') : '') + '</th>';
        });
        h += '</tr></thead><tbody>';
        slice.forEach(function (r) {
          h += '<tr class="' + (cfg.onRow ? 'clickable' : '') + '" data-id="' + esc(r.id) + '">';
          cfg.cols.forEach(function (c) {
            h += '<td class="' + (c.right ? 'right' : '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>';
          });
          h += '</tr>';
        });
        h += '</tbody></table></div>';
        h += '<div class="tbl-foot"><span class="small muted">' + rows.length + ' registro' + (rows.length === 1 ? '' : 's') +
             ' · página ' + state.page + ' de ' + pages + '</span><div class="pager">';
        h += '<button data-p="' + (state.page - 1) + '" ' + (state.page === 1 ? 'disabled' : '') + '>' + icon('chevL', 14) + '</button>';
        var from = Math.max(1, state.page - 2), to = Math.min(pages, from + 4);
        for (var i = from; i <= to; i++) h += '<button data-p="' + i + '" class="' + (i === state.page ? 'on' : '') + '">' + i + '</button>';
        h += '<button data-p="' + (state.page + 1) + '" ' + (state.page === pages ? 'disabled' : '') + '>' + icon('chevR', 14) + '</button>';
        h += '</div></div>';
      }
      h += '</div>';
      host.innerHTML = h;

      var qi = host.querySelector('[data-q]');
      if (qi) {
        qi.addEventListener('input', function () { state.q = this.value; state.page = 1; render();
          var n = host.querySelector('[data-q]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
      }
      host.querySelectorAll('[data-f]').forEach(function (s) {
        s.addEventListener('change', function () { state.filters[this.dataset.f] = this.value; state.page = 1; render(); });
      });
      host.querySelectorAll('[data-sort]').forEach(function (th) {
        th.addEventListener('click', function () {
          var k = this.dataset.sort;
          if (state.sort === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
          else { state.sort = k; state.dir = 'asc'; }
          render();
        });
      });
      host.querySelectorAll('[data-p]').forEach(function (b) {
        b.addEventListener('click', function () { state.page = +this.dataset.p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      });
      var ex = host.querySelector('[data-export]');
      if (ex) ex.addEventListener('click', function () {
        VOLTX.download(cfg.exportName + '.csv', VOLTX.toCSV(filtered(), cfg.cols.filter(function (c) { return c.export !== false; })
          .map(function (c) { return { label: c.label, value: c.exportVal || function (r) { return c.sortVal ? c.sortVal(r) : r[c.key]; } }; })));
        toast('Exportación generada.', 'ok');
      });
      if (cfg.onRow) {
        host.querySelectorAll('tbody tr').forEach(function (tr) {
          tr.addEventListener('click', function (e) {
            if (e.target.closest('button,a,input,select')) return;
            cfg.onRow(tr.dataset.id);
          });
        });
      }
      if (cfg.afterRender) cfg.afterRender(host);
    }
    render();
    return { render: render, state: state };
  }

  /* ---------- estados ---------- */
  function emptyState(o) {
    return '<div class="empty"><div class="ico">' + icon(o.icon || 'inbox', 24) + '</div>' +
      '<h4>' + esc(o.title || 'Sin datos') + '</h4><p>' + esc(o.text || '') + '</p>' +
      (o.action ? '<div class="mt2">' + o.action + '</div>' : '') + '</div>';
  }
  function skeleton(rows) {
    var h = '<div class="card"><div class="card-b col">';
    for (var i = 0; i < (rows || 5); i++) h += '<div class="skel" style="width:' + (100 - i * 7) + '%"></div>';
    return h + '</div></div>';
  }
  function errorState(msg) {
    return '<div class="err-state">' + icon('alert', 17) + '<div><b>No se pudo cargar la información.</b><br>' + esc(msg || '') + '</div></div>';
  }

  /* ---------- KPI ---------- */
  function kpi(o) {
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + esc(o.label) + '</span>' +
      '<span class="kpi-ico">' + icon(o.icon || 'chart', 16) + '</span></div>' +
      '<div class="kpi-val">' + o.value + '</div>' +
      (o.sub ? '<div class="kpi-sub ' + (o.trend || '') + '">' + o.sub + '</div>' : '') + '</div>';
  }

  /* ---------- gráficos simples ---------- */
  function donut(segments, size, label) {
    size = size || 140;
    var total = segments.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var r = size / 2 - 12, c = 2 * Math.PI * r, off = 0;
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<g transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')">';
    segments.forEach(function (s) {
      var len = (s.value / total) * c;
      svg += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + s.color +
        '" stroke-width="16" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '"/>';
      off += len;
    });
    svg += '</g></svg>';
    return '<div class="donut">' + svg + '<div class="mid"><div style="font-size:22px;font-weight:700;color:var(--black)">' +
      total + '</div><div class="xs muted">' + esc(label || '') + '</div></div></div>';
  }
  function bars(data, fmt) {
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var h = '<div class="bars">';
    data.forEach(function (d) {
      var pct = Math.round((d.value / max) * 100);
      h += '<div class="b" title="' + esc(d.label + ': ' + (fmt ? fmt(d.value) : d.value)) + '" style="height:100%">' +
           '<i style="height:' + pct + '%"></i></div>';
    });
    h += '</div><div class="row" style="justify-content:space-between;margin-top:6px">' +
      data.map(function (d) { return '<span class="xs muted" style="flex:1;text-align:center">' + esc(d.label) + '</span>'; }).join('') + '</div>';
    return h;
  }
  function sparkArea(values, w, hgt, color) {
    w = w || 300; hgt = hgt || 70; color = color || '#E85D04';
    var max = Math.max.apply(null, values) || 1, min = Math.min.apply(null, values);
    var span = (max - min) || 1;
    var pts = values.map(function (v, i) {
      return [(i / (values.length - 1)) * w, hgt - ((v - min) / span) * (hgt - 8) - 4];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + w + ' ' + hgt + ' L0 ' + hgt + ' Z';
    var id = 'g' + Math.random().toString(36).slice(2, 7);
    return '<svg viewBox="0 0 ' + w + ' ' + hgt + '" width="100%" height="' + hgt + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".22"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* ---------- timeline ---------- */
  function timeline(items) {
    if (!items.length) return emptyState({ icon: 'clock', title: 'Sin actividad', text: 'Todavía no se ha registrado actividad en este registro.' });
    return '<div class="tl">' + items.map(function (i) {
      return '<div class="tl-item"><div class="tl-dot ' + (i.tone || '') + '">' + icon(i.icon || 'clock', 13) + '</div>' +
        '<div class="tl-body"><div class="t">' + i.text + '</div><div class="m">' + esc(i.meta || '') + '</div></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- firma ---------- */
  function signaturePad(canvas) {
    var ctx = canvas.getContext('2d');
    var drawing = false, dirty = false;
    function resize() {
      var rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    }
    setTimeout(resize, 0);
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function start(e) { e.preventDefault(); drawing = true; dirty = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    function end() { drawing = false; }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return {
      clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
      isEmpty: function () { return !dirty; }
    };
  }

  /* ---------- uploader ---------- */
  function uploader(el, onAdd) {
    el.addEventListener('click', function () { toast('Demo: la carga real de archivos requiere el object storage S3 del backend.'); onAdd && onAdd(); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove('over'); });
    });
    el.addEventListener('drop', function () { onAdd && onAdd(); });
  }

  /* ---------- calendario mensual ---------- */
  function monthGrid(year, month, eventsFor, opts) {
    opts = opts || {};
    var first = new Date(year, month, 1);
    var startDow = (first.getDay() + 6) % 7; // lunes primero
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevDays = new Date(year, month, 0).getDate();
    var cells = [];
    for (var i = startDow - 1; i >= 0; i--) cells.push({ d: new Date(year, month - 1, prevDays - i), out: true });
    for (var d = 1; d <= daysInMonth; d++) cells.push({ d: new Date(year, month, d), out: false });
    while (cells.length % 7) cells.push({ d: new Date(year, month + 1, cells.length - startDow - daysInMonth + 1), out: true });

    var t = VOLTX.today().getTime();
    var h = '<div class="cal">' + ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(function (x) { return '<div class="dow">' + x + '</div>'; }).join('');
    cells.forEach(function (c) {
      var evs = eventsFor(c.d) || [];
      h += '<div class="day ' + (c.out ? 'out' : '') + ' ' + (c.d.getTime() === t ? 'today' : '') + '" data-date="' + VOLTX.ymd(c.d) + '">' +
        '<div class="dn">' + c.d.getDate() + '</div>' +
        evs.slice(0, opts.max || 3).map(function (e) {
          return '<span class="ev ' + e.cls + '" draggable="true" data-ev="' + esc(e.id) + '" title="' + esc(e.title) + '">' + esc(e.label) + '</span>';
        }).join('') +
        (evs.length > (opts.max || 3) ? '<span class="xs muted" style="display:block;margin-top:3px">+' + (evs.length - (opts.max || 3)) + ' más</span>' : '') +
        '</div>';
    });
    return h + '</div>';
  }

  /* ---------- copiar ---------- */
  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copiado al portapapeles.', 'ok'); });
    else toast('No se pudo copiar.', 'err');
  }

  /* ---------- imprimir documento ---------- */
  function printDoc(title, html) {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast('El navegador bloqueó la ventana de impresión.', 'err'); return; }
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="css/voltx.css"></head><body style="background:#fff">' + html +
      '<div class="no-print center" style="padding:24px"><button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar PDF</button></div>' +
      '</body></html>');
    w.document.close();
  }

  global.UI = {
    icon: icon, esc: esc, toast: toast, modal: modal, drawer: drawer, confirm: confirm, prompt: prompt,
    closeTop: closeTop, closeAll: closeAll, badge: badge, avatar: avatar, table: table,
    emptyState: emptyState, skeleton: skeleton, errorState: errorState, kpi: kpi,
    donut: donut, bars: bars, sparkArea: sparkArea, timeline: timeline,
    signaturePad: signaturePad, uploader: uploader, monthGrid: monthGrid, copy: copy, printDoc: printDoc
  };
})(window);
