/* ============================================================
   VOLTX — Shell del panel administrativo
   Sidebar (§3.1), header con buscador global, creación rápida,
   notificaciones, menú de usuario, router por hash y RBAC.
   ============================================================ */
(function (global) {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX;

  var NAV = [
    { sec: 'Operación' },
    { id: 'dashboard',  label: 'Inicio',            icon: 'home' },
    { id: 'clientes',   label: 'CRM y clientes',    icon: 'users' },
    { id: 'solicitudes',label: 'Solicitudes',       icon: 'inbox',     count: function () { return V.all('requests').filter(function (r) { return r.status === 'NEW'; }).length; } },
    { id: 'inspecciones',label:'Inspecciones',      icon: 'search' },
    { id: 'presupuestos',label:'Presupuestos',      icon: 'file' },
    { id: 'proyectos',  label: 'Proyectos',         icon: 'layers' },
    { id: 'ordenes',    label: 'Órdenes de trabajo',icon: 'clipboard', count: function () { return V.overdueWOs().length; } },
    { id: 'agenda',     label: 'Agenda y despacho', icon: 'calendar' },
    { id: 'mapa',       label: 'Mapa operativo',    icon: 'map' },
    { id: 'tecnicos',   label: 'Técnicos y equipos',icon: 'hardhat' },
    { sec: 'Recursos' },
    { id: 'inventario', label: 'Inventario',        icon: 'box',       count: function () { return V.lowStock().length; } },
    { id: 'compras',    label: 'Compras',           icon: 'cart' },
    { id: 'servicios',  label: 'Catálogo de servicios', icon: 'list' },
    { id: 'activos',    label: 'Activos eléctricos',icon: 'bolt' },
    { sec: 'Cliente y dinero' },
    { id: 'facturacion',label: 'Facturación y pagos', icon: 'receipt', count: function () { return V.overdueInvoices().length; } },
    { id: 'mantenimientos', label: 'Mantenimientos',icon: 'wrench' },
    { id: 'documentos', label: 'Documentos',        icon: 'folder' },
    { id: 'incidencias',label: 'Incidencias',       icon: 'alert' },
    { id: 'reportes',   label: 'Reportes',          icon: 'chart' },
    { sec: 'Administración' },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: 'workflow' },
    { id: 'usuarios',   label: 'Usuarios y permisos', icon: 'shield' },
    { id: 'configuracion', label: 'Configuración',  icon: 'settings' },
    { id: 'suscripcion',label: 'Suscripción y plan',icon: 'star' }
  ];

  var views = {};          // registro de vistas: id -> fn(el, param)
  var current = null;

  /* ---------- helpers de página ---------- */
  function pageHeader(o) {
    return (o.crumbs ? '<div class="crumbs">' + o.crumbs.map(function (c, i) {
        return (c.href ? '<a href="' + c.href + '">' + E(c.label) + '</a>' : '<span>' + E(c.label) + '</span>') +
          (i < o.crumbs.length - 1 ? '<span>' + I('chevR', 12) + '</span>' : '');
      }).join('') + '</div>' : '') +
      '<div class="page-h"><div><h1>' + E(o.title) + '</h1>' +
      (o.sub ? '<p class="sub">' + o.sub + '</p>' : '') + '</div>' +
      (o.actions ? '<div class="row gap2 wrap">' + o.actions + '</div>' : '') + '</div>';
  }
  function deny(module) {
    return '<div class="card"><div class="empty"><div class="ico">' + I('lock', 24) + '</div>' +
      '<h4>No tienes acceso a este módulo</h4>' +
      '<p>Tu rol <b>' + E(V.ROLES[V.getSession().role].label) + '</b> no tiene el permiso <code>ver</code> sobre <code>' +
      E(module) + '</code>. Solicita el acceso al administrador de la empresa.</p>' +
      '<a class="btn btn-outline btn-sm mt2" href="#dashboard">Volver al inicio</a></div></div>';
  }

  /* ---------- navegación ---------- */
  function renderNav() {
    var hash = (location.hash || '#dashboard').slice(1).split('/')[0];
    var h = '';
    NAV.forEach(function (n) {
      if (n.sec) { h += '<div class="nav-sec">' + E(n.sec) + '</div>'; return; }
      if (!V.can(n.id, 'ver')) return;
      var c = n.count ? n.count() : 0;
      h += '<a href="#' + n.id + '" class="' + (hash === n.id ? 'on' : '') + '" title="' + E(n.label) + '">' +
        I(n.icon, 17) + '<span>' + E(n.label) + '</span>' + (c > 0 ? '<span class="cnt">' + c + '</span>' : '') + '</a>';
    });
    document.getElementById('nav').innerHTML = h;
  }

  /* ---------- header ---------- */
  function renderHeader() {
    var u = V.me(), t = V.myTenant();
    document.getElementById('lm').innerHTML = I('zap', 17);
    document.getElementById('gsi').innerHTML = I('search', 16);
    document.getElementById('bell').innerHTML = I('bell', 18);
    document.getElementById('burger').innerHTML = I('menu', 20);
    document.getElementById('cico').innerHTML = I('chevL', 16);
    document.getElementById('uav').textContent = V.initials(u.name);
    document.getElementById('uinfo').innerHTML =
      '<span class="small bold">' + E(u.name.split(' ')[0]) + '</span>' +
      '<span class="xs muted">' + E(t.name) + '</span>';

    var unread = V.all('notifications').filter(function (n) { return n.user_id === u.id && !n.read; });
    if (unread.length) document.getElementById('bell').insertAdjacentHTML('beforeend', '<span class="dot"></span>');
  }

  function closeMenus(except) {
    ['createMenu', 'bellMenu', 'userMenu', 'gsr'].forEach(function (id) {
      if (id !== except) document.getElementById(id).innerHTML = '';
    });
  }

  function bindHeader() {
    var u = V.me();

    document.getElementById('create').addEventListener('click', function (e) {
      e.stopPropagation();
      var host = document.getElementById('createMenu');
      if (host.innerHTML) { host.innerHTML = ''; return; }
      closeMenus('createMenu');
      var items = [
        ['clientes', 'crear', 'users', 'Nuevo cliente', function () { location.hash = 'clientes'; setTimeout(function () { views.__newCustomer && views.__newCustomer(); }, 60); }],
        ['solicitudes', 'crear', 'inbox', 'Nueva solicitud', function () { location.hash = 'solicitudes'; setTimeout(function () { views.__newRequest && views.__newRequest(); }, 60); }],
        ['presupuestos', 'crear', 'file', 'Crear presupuesto', function () { location.hash = 'presupuestos/nuevo'; }],
        ['ordenes', 'crear', 'clipboard', 'Crear orden de trabajo', function () { location.hash = 'ordenes'; setTimeout(function () { views.__newWO && views.__newWO(); }, 60); }],
        ['ordenes', 'asignar', 'hardhat', 'Asignar técnico', function () { location.hash = 'agenda'; }],
        ['compras', 'crear', 'cart', 'Registrar compra', function () { location.hash = 'compras'; }],
        ['facturacion', 'crear', 'dollar', 'Registrar pago', function () { location.hash = 'facturacion'; }]
      ].filter(function (i) { return V.can(i[0], i[1]); });
      host.innerHTML = '<div class="menu"><div class="head"><b class="small">Creación rápida</b></div>' +
        items.map(function (i, ix) { return '<button data-ix="' + ix + '">' + I(i[2], 16) + i[3] + '</button>'; }).join('') + '</div>';
      host.querySelectorAll('[data-ix]').forEach(function (b) {
        b.addEventListener('click', function () { host.innerHTML = ''; items[+this.dataset.ix][4](); });
      });
    });

    document.getElementById('bell').addEventListener('click', function (e) {
      e.stopPropagation();
      var host = document.getElementById('bellMenu');
      if (host.innerHTML) { host.innerHTML = ''; return; }
      closeMenus('bellMenu');
      var ns = V.all('notifications').filter(function (n) { return n.user_id === u.id; });
      host.innerHTML = '<div class="menu" style="min-width:330px;max-height:420px;overflow:auto">' +
        '<div class="head spread"><b class="small">Notificaciones</b>' +
        '<button class="xs" id="readall" style="border:0;background:none;color:var(--primary-600);cursor:pointer;width:auto;padding:0">Marcar todas como leídas</button></div>' +
        (ns.length ? ns.map(function (n) {
          var tone = { danger: 'r', warning: 'a', info: 'b', success: 'g' }[n.type] || 'n';
          var col = { r: 'var(--danger)', a: 'var(--warning)', b: 'var(--info)', g: 'var(--success)', n: 'var(--muted)' }[tone];
          return '<a href="' + n.link + '" data-n="' + n.id + '" style="align-items:flex-start;' + (n.read ? 'opacity:.62' : '') + '">' +
            '<span style="color:' + col + ';margin-top:2px">' + I(n.type === 'danger' ? 'alert' : n.type === 'warning' ? 'alert' : 'info', 15) + '</span>' +
            '<span style="min-width:0"><span class="bold small" style="display:block">' + E(n.title) + '</span>' +
            '<span class="xs muted" style="display:block">' + E(n.body) + '</span>' +
            '<span class="xs muted">' + V.frel(n.at) + '</span></span></a>';
        }).join('') : '<div class="empty" style="padding:26px"><p class="small muted">Sin notificaciones.</p></div>') +
        '<div class="sep"></div><a href="#configuracion/notificaciones">' + I('settings', 15) + 'Preferencias de notificación</a></div>';
      host.querySelector('#readall').addEventListener('click', function (ev) {
        ev.stopPropagation();
        ns.forEach(function (n) { n.read = true; }); V.save(); host.innerHTML = ''; refreshChrome();
        UI.toast('Notificaciones marcadas como leídas.', 'ok');
      });
      host.querySelectorAll('[data-n]').forEach(function (a) {
        a.addEventListener('click', function () {
          var n = V.byId('notifications', this.dataset.n); if (n) { n.read = true; V.save(); }
          host.innerHTML = ''; setTimeout(refreshChrome, 30);
        });
      });
    });

    document.getElementById('userbtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var host = document.getElementById('userMenu');
      if (host.innerHTML) { host.innerHTML = ''; return; }
      closeMenus('userMenu');
      var t = V.myTenant();
      host.innerHTML = '<div class="menu" style="min-width:260px">' +
        '<div class="head"><div class="row gap2"><span class="av dark">' + E(V.initials(u.name)) + '</span>' +
        '<span><span class="bold small" style="display:block">' + E(u.name) + '</span>' +
        '<span class="xs muted">' + E(u.email) + '</span></span></div>' +
        '<div class="mt2"><span class="badge b-orange">' + E(V.ROLES[u.role].label) + '</span></div></div>' +
        '<div class="xs muted" style="padding:4px 10px">' + E(t.name) + ' · ' + E(t.currency) + ' · ' + E(t.timezone) + '</div>' +
        '<div class="sep"></div>' +
        '<a href="#configuracion">' + I('settings', 15) + 'Configuración de la empresa</a>' +
        '<a href="#suscripcion">' + I('star', 15) + 'Suscripción y plan</a>' +
        '<a href="#usuarios">' + I('shield', 15) + 'Usuarios y permisos</a>' +
        '<div class="sep"></div>' +
        '<button id="switch">' + I('refresh', 15) + 'Cambiar de perfil / empresa</button>' +
        '<button id="reseed">' + I('refresh', 15) + 'Restablecer datos de la demo</button>' +
        '<div class="sep"></div>' +
        '<button id="lo">' + I('logout', 15) + 'Cerrar sesión</button></div>';
      host.querySelector('#lo').addEventListener('click', function () { V.logout(); location.href = 'login.html'; });
      host.querySelector('#switch').addEventListener('click', function () { location.href = 'login.html'; });
      host.querySelector('#reseed').addEventListener('click', function () {
        UI.confirm({ title: '¿Restablecer la demo?', body: 'Se descartan todos tus cambios y se recargan los datos de ejemplo.', ok: 'Restablecer', danger: true },
          function () { V.reset(); location.reload(); });
      });
    });

    document.addEventListener('click', function () { closeMenus(); });

    /* buscador global */
    var gs = document.getElementById('gs'), gsr = document.getElementById('gsr');
    gs.addEventListener('click', function (e) { e.stopPropagation(); });
    gs.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (q.length < 2) { gsr.innerHTML = ''; return; }
      var res = [];
      function push(list, type, icon2, hash, label, sub) {
        list.slice(0, 4).forEach(function (r) {
          res.push({ icon: icon2, type: type, label: label(r), sub: sub(r), hash: hash(r) });
        });
      }
      push(V.all('customers').filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; }), 'Cliente', 'users',
        function (c) { return '#clientes/' + c.id; }, function (c) { return c.name; }, function (c) { return c.type + ' · ' + c.phone; });
      push(V.all('workOrders').filter(function (w) { return (w.number + ' ' + w.title).toLowerCase().indexOf(q) >= 0; }), 'Orden', 'clipboard',
        function (w) { return '#ordenes/' + w.id; }, function (w) { return w.number + ' — ' + w.title; }, function (w) { return V.WO_STATES[w.status].label; });
      push(V.all('quotes').filter(function (x) { return (x.number + ' ' + V.customerName(x.customer_id)).toLowerCase().indexOf(q) >= 0; }), 'Presupuesto', 'file',
        function (x) { return '#presupuestos/' + x.id; }, function (x) { return x.number; }, function (x) { return V.customerName(x.customer_id) + ' · ' + V.money(V.quoteTotals(x).total); });
      push(V.all('invoices').filter(function (x) { return (x.number + ' ' + V.customerName(x.customer_id)).toLowerCase().indexOf(q) >= 0; }), 'Factura', 'receipt',
        function (x) { return '#facturacion/' + x.id; }, function (x) { return x.number; }, function (x) { return V.customerName(x.customer_id); });
      push(V.all('projects').filter(function (x) { return (x.code + ' ' + x.name).toLowerCase().indexOf(q) >= 0; }), 'Proyecto', 'layers',
        function (x) { return '#proyectos/' + x.id; }, function (x) { return x.name; }, function (x) { return x.code; });
      push(V.all('products').filter(function (x) { return (x.sku + ' ' + x.name).toLowerCase().indexOf(q) >= 0; }), 'Material', 'box',
        function () { return '#inventario'; }, function (x) { return x.name; }, function (x) { return x.sku + ' · ' + V.stockOf(x) + ' en stock'; });

      gsr.innerHTML = res.length
        ? '<div class="gs-results">' + res.map(function (r) {
            return '<a href="' + r.hash + '"><span class="muted">' + I(r.icon, 15) + '</span>' +
              '<span style="min-width:0"><span class="bold" style="display:block">' + E(r.label) + '</span>' +
              '<span class="xs muted">' + E(r.type) + ' · ' + E(r.sub) + '</span></span></a>';
          }).join('') + '</div>'
        : '<div class="gs-results"><div class="empty" style="padding:24px"><p class="small muted">Sin coincidencias para «' + E(q) + '».</p></div></div>';
      gsr.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { gsr.innerHTML = ''; gs.value = ''; }); });
    });
    gs.addEventListener('keydown', function (e) { if (e.key === 'Escape') { gsr.innerHTML = ''; this.blur(); } });

    /* sidebar responsive */
    var shell = document.getElementById('shell');
    document.getElementById('burger').addEventListener('click', function (e) { e.stopPropagation(); shell.classList.toggle('open'); });
    document.getElementById('backdrop').addEventListener('click', function () { shell.classList.remove('open'); });
    document.getElementById('collapse').addEventListener('click', function () {
      shell.classList.toggle('collapsed');
      try { localStorage.setItem('voltx.collapsed', shell.classList.contains('collapsed') ? '1' : '0'); } catch (e) {}
    });
    try { if (localStorage.getItem('voltx.collapsed') === '1') shell.classList.add('collapsed'); } catch (e) {}
    function sizing() { document.getElementById('burger').style.display = window.innerWidth <= 1024 ? 'grid' : 'none'; }
    sizing(); window.addEventListener('resize', sizing);

    /* atajo de teclado */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); gs.focus(); }
    });
  }

  function refreshChrome() {
    renderNav();
    var bell = document.getElementById('bell');
    bell.innerHTML = I('bell', 18);
    var u = V.me();
    if (V.all('notifications').filter(function (n) { return n.user_id === u.id && !n.read; }).length) {
      bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    }
  }

  /* ---------- router ---------- */
  function route() {
    var raw = (location.hash || '#dashboard').slice(1);
    var parts = raw.split('/');
    var id = parts[0] || 'dashboard', param = parts.slice(1).join('/');
    var el = document.getElementById('view');
    document.getElementById('shell').classList.remove('open');
    closeMenus();
    renderNav();
    current = id;

    if (!views[id]) { el.innerHTML = pageHeader({ title: 'Página no encontrada' }) +
      UI.emptyState({ icon: 'search', title: 'Ruta no reconocida', text: 'La ruta #' + E(id) + ' no existe en la aplicación.' }); return; }
    if (V.MODULES.indexOf(id) >= 0 && !V.can(id, 'ver')) { el.innerHTML = deny(id); return; }

    // estado de carga (§18.2)
    el.innerHTML = '<div class="page-h"><div class="skel" style="width:220px;height:26px"></div></div>' + UI.skeleton(4);
    setTimeout(function () {
      try { views[id](el, param); } catch (err) {
        el.innerHTML = pageHeader({ title: 'Error' }) + UI.errorState(err.message);
        if (global.console) console.error(err);
      }
      el.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }, 90);
  }

  function start() {
    var s = V.getSession();
    if (!s) { location.href = 'login.html'; return; }
    var u = V.me();
    if (!u) { V.logout(); location.href = 'login.html'; return; }
    if (u.role === 'tecnico') { location.href = 'tecnico.html'; return; }
    if (u.role === 'cliente') { location.href = 'cliente.html'; return; }
    renderHeader(); bindHeader(); renderNav();
    window.addEventListener('hashchange', route);
    route();
  }

  global.APP = {
    views: views, start: start, route: route, pageHeader: pageHeader,
    refreshChrome: refreshChrome, reload: function () { route(); }, NAV: NAV
  };
})(window);
