/* ============================================================
   VOLTX — PWA del técnico §8
   Mi día · ejecución de orden · checklist · materiales ·
   tiempos · evidencias · firma · modo sin conexión.
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX;
  var app = document.getElementById('app'), nav = document.getElementById('nav');
  var me, tec;

  /* ---------- arranque ---------- */
  var s = V.getSession();
  if (!s) { location.href = 'login.html'; }
  me = V.me();
  if (!me) { V.logout(); location.href = 'login.html'; }
  if (me.role !== 'tecnico') {
    // permite inspeccionar la PWA desde otros roles usando el primer técnico
    tec = V.all('technicians')[0];
  } else {
    tec = V.byId('technicians', me.technician_id) || V.all('technicians')[0];
  }

  function myWOs() {
    return V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(tec.id) >= 0; });
  }
  function head(title, sub, back) {
    return '<header class="mob-head">' +
      '<div class="spread">' +
      (back ? '<button class="icon-btn" id="back" style="color:#fff">' + I('arrowL', 20) + '</button>'
            : '<div class="row gap2"><span class="logo-mark" style="background:var(--primary-600);color:#fff">' + I('zap', 15) + '</span>' +
              '<span class="logo-txt" style="color:#fff;font-size:15px">VOL<em style="color:var(--primary-500)">TX</em></span></div>') +
      '<div class="row gap2">' +
      '<button class="icon-btn" id="offline" style="color:#9CA3AF" title="Estado de conexión">' + I('refresh', 18) + '</button>' +
      '<button class="icon-btn" id="prof" style="color:#fff">' + I('user', 18) + '</button></div></div>' +
      '<h2 class="mt4" style="font-size:22px">' + E(title) + '</h2>' +
      (sub ? '<p class="small" style="color:#9CA3AF;margin-top:4px">' + sub + '</p>' : '') +
      '</header>';
  }
  function bindHead() {
    var b = document.getElementById('back');
    if (b) b.addEventListener('click', function () { history.back(); });
    document.getElementById('prof').addEventListener('click', function () {
      UI.modal({ title: tec.name, subtitle: tec.level + ' · ' + tec.zone,
        body: '<div class="col">' +
          row('Horario', E(tec.schedule)) + row('Vehículo', E(tec.vehicle)) +
          row('Especialidades', (tec.skills || []).join(', ') || '—') +
          row('Órdenes completadas', tec.kpi.completadas) + row('Puntualidad', tec.kpi.puntualidad + '%') +
          row('Valoración', tec.kpi.rating + ' / 5') +
          '<div class="banner banner-brand mt4">' + I('pin', 15) +
          '<div><b>Geolocalización:</b> activa solo durante la jornada (07:00–18:00) y con una orden en curso. ' +
          '<label class="check mt2"><input type="checkbox" checked><span>Doy mi consentimiento</span></label></div></div>' +
          '</div>',
        footer: '<button class="btn btn-ghost" id="lo">Cerrar sesión</button><button class="btn btn-outline" data-close>Cerrar</button>',
        onMount: function (m) { m.querySelector('#lo').addEventListener('click', function () { V.logout(); location.href = 'login.html'; }); } });
    });
    document.getElementById('offline').addEventListener('click', function () {
      var on = navigator.onLine;
      UI.modal({ title: 'Modo sin conexión',
        body: '<div class="banner banner-' + (on ? 'success' : 'warn') + '">' + I(on ? 'checkCircle' : 'alert', 16) +
          '<div><b>' + (on ? 'Conectado' : 'Sin conexión') + '.</b> ' +
          (on ? 'Los cambios se sincronizan al instante.' : 'Los cambios se guardan en el dispositivo y se sincronizan al recuperar la señal.') + '</div></div>' +
          '<div class="col mt4">' + row('Órdenes del día en caché', myWOs().filter(function (w) { return V.ymd(w.start) === V.ymd(V.today()); }).length) +
          row('Cambios pendientes de sincronizar', '0') + row('Última sincronización', V.hm(new Date())) + '</div>' +
          '<button class="btn btn-outline btn-block mt4" id="sy">Sincronizar ahora</button>',
        onMount: function (m) { m.querySelector('#sy').addEventListener('click', function () { UI.toast('Sincronización completada.', 'ok'); UI.closeTop(); }); } });
    });
  }
  function row(k, v) { return '<div class="spread"><span class="small muted">' + E(k) + '</span><b class="small">' + v + '</b></div>'; }

  function renderNav(active) {
    var pend = myWOs().filter(function (w) { return ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; }).length;
    nav.className = 'mob-nav';
    nav.innerHTML = [
      ['dia', 'home', 'Mi día'], ['ordenes', 'clipboard', 'Órdenes'], ['materiales', 'box', 'Materiales'], ['perfil', 'user', 'Perfil']
    ].map(function (n) {
      return '<a href="#' + n[0] + '" class="' + (active === n[0] ? 'on' : '') + '">' + I(n[1], 19) +
        '<span>' + n[2] + (n[0] === 'ordenes' && pend ? ' (' + pend + ')' : '') + '</span></a>';
    }).join('');
  }

  /* ---------- 8.1 Mi día ---------- */
  function viewDia() {
    var hoy = myWOs().filter(function (w) { return V.ymd(w.start) === V.ymd(V.today()); })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var activa = myWOs().filter(function (w) { return ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PAUSED'].indexOf(w.status) >= 0; })[0];
    var hrs = hoy.reduce(function (a, w) { return a + w.estimated; }, 0);

    var h = head('Hola, ' + tec.name.split(' ')[0],
      V.DOWS[new Date().getDay()] + ' ' + V.fdate(new Date(), true) + ' · ' + hoy.length + ' trabajo(s) · ' + hrs + ' h estimadas');
    h += '<div class="mob-body">';

    if (activa) {
      h += '<div class="card" style="border-color:var(--primary-600);border-width:1.5px"><div class="card-b">' +
        '<div class="spread"><span class="badge b-orange">' + E(V.WO_STATES[activa.status].label) + '</span>' +
        '<span class="xs muted">' + E(activa.number) + '</span></div>' +
        '<h3 class="mt2" style="font-size:16px">' + E(activa.title) + '</h3>' +
        '<p class="xs muted mt2">' + E(V.customerName(activa.customer_id)) + ' · ' + E(V.siteName(activa.site_id)) + '</p>' +
        '<a href="#orden/' + activa.id + '" class="btn btn-primary btn-block mt4">Continuar el trabajo</a>' +
        '</div></div>';
    }

    if (!hoy.length) {
      h += UI.emptyState({ icon: 'calendar', title: 'Sin trabajos para hoy', text: 'Revisa la pestaña Órdenes para ver los próximos días.' });
    } else {
      hoy.forEach(function (w) {
        var late = ['CLOSED', 'CANCELLED', 'COMPLETED'].indexOf(w.status) < 0 && new Date(w.end) < new Date();
        var site = V.byId('sites', w.site_id) || {};
        var chk = (w.checklist || []), dn = chk.filter(function (c) { return c.done; }).length;
        h += '<a href="#orden/' + w.id + '" class="wo-card p-' + w.priority + '" style="display:block;text-decoration:none;color:inherit">' +
          '<div class="spread"><div class="row gap2"><b class="mono">' + V.hm(w.start) + '</b>' +
          UI.badge(V.PRIORITIES, w.priority) + (late ? '<span class="badge b-red">Retrasado</span>' : '') + '</div>' +
          UI.badge(V.WO_STATES, w.status) + '</div>' +
          '<div class="bold mt2">' + E(w.title) + '</div>' +
          '<div class="xs muted mt2">' + E(w.number) + ' · ' + E(V.WO_TYPES[w.type]) + ' · ' + w.estimated + ' h</div>' +
          '<div class="row gap2 mt2 small"><span class="muted">' + I('user', 13) + '</span>' + E(V.customerName(w.customer_id)) + '</div>' +
          '<div class="row gap2 mt2 xs muted"><span>' + I('pin', 13) + '</span><span>' + E(site.address || V.siteName(w.site_id)) + '</span></div>' +
          (chk.length ? '<div class="mt2"><div class="spread xs muted"><span>Checklist</span><span>' + dn + '/' + chk.length + '</span></div>' +
            '<div class="bar mt2 ' + (dn === chk.length ? 'g' : '') + '"><i style="width:' + (dn / chk.length * 100) + '%"></i></div></div>' : '') +
          '</a>';
      });
    }

    /* mañana */
    var man = myWOs().filter(function (w) { return V.ymd(w.start) === V.ymd(V.addDays(V.today(), 1)); });
    if (man.length) {
      h += '<h4 class="mt6 mb2">Mañana</h4>' + man.map(function (w) {
        return '<a href="#orden/' + w.id + '" class="file-row" style="text-decoration:none;margin-bottom:8px">' +
          '<span class="file-ico">' + I('clock', 15) + '</span>' +
          '<span style="min-width:0"><b class="small" style="display:block;color:var(--text)">' + E(w.title) + '</b>' +
          '<span class="xs muted">' + V.hm(w.start) + ' · ' + E(V.customerName(w.customer_id)) + '</span></span>' +
          '<span style="margin-left:auto" class="muted">' + I('chevR', 15) + '</span></a>';
      }).join('');
    }

    h += '</div>';
    app.innerHTML = h;
    bindHead(); renderNav('dia');
  }

  /* ---------- lista de órdenes ---------- */
  function viewOrdenes() {
    var all = myWOs().sort(function (a, b) { return new Date(b.start) - new Date(a.start); });
    var h = head('Mis órdenes', all.length + ' orden(es) asignadas');
    h += '<div class="mob-body">';
    h += '<div class="seg mb4" id="fl" style="width:100%;display:flex">' +
      [['act', 'Activas'], ['hoy', 'Hoy'], ['all', 'Todas']].map(function (f, i) {
        return '<button data-f="' + f[0] + '" class="' + (i === 0 ? 'on' : '') + '" style="flex:1">' + f[1] + '</button>';
      }).join('') + '</div><div id="lst"></div></div>';
    app.innerHTML = h;
    bindHead(); renderNav('ordenes');

    function draw(f) {
      var rows = all;
      if (f === 'act') rows = all.filter(function (w) { return ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; });
      if (f === 'hoy') rows = all.filter(function (w) { return V.ymd(w.start) === V.ymd(V.today()); });
      document.getElementById('lst').innerHTML = rows.length ? rows.map(function (w) {
        return '<a href="#orden/' + w.id + '" class="wo-card p-' + w.priority + '" style="display:block;text-decoration:none;color:inherit">' +
          '<div class="spread"><b class="xs">' + E(w.number) + '</b>' + UI.badge(V.WO_STATES, w.status) + '</div>' +
          '<div class="bold mt2">' + E(w.title) + '</div>' +
          '<div class="xs muted mt2">' + V.fdate(w.start) + ' ' + V.hm(w.start) + ' · ' + E(V.customerName(w.customer_id)) + '</div></a>';
      }).join('') : UI.emptyState({ icon: 'inbox', title: 'Sin órdenes', text: 'No hay órdenes que coincidan con este filtro.' });
    }
    draw('act');
    app.querySelectorAll('#fl button').forEach(function (b) {
      b.addEventListener('click', function () {
        app.querySelectorAll('#fl button').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on'); draw(this.dataset.f);
      });
    });
  }

  /* ---------- 8.2 Ejecución de la orden ---------- */
  function viewOrden(id) {
    var w = V.byId('workOrders', id);
    if (!w) { app.innerHTML = head('Orden', '', true) + '<div class="mob-body">' + UI.errorState('La orden no existe o no está asignada a ti.') + '</div>'; bindHead(); return; }
    var site = V.byId('sites', w.site_id) || {}, cus = V.byId('customers', w.customer_id) || {};
    var chk = w.checklist || [], dn = chk.filter(function (c) { return c.done; }).length;
    var minutos = (w.timeEntries || []).reduce(function (a, t) { return a + (t.min || 0); }, 0);
    var abierto = (w.timeEntries || []).filter(function (t) { return !t.to; })[0];

    var h = head(w.title, E(w.number) + ' · ' + E(V.WO_TYPES[w.type]), true);
    h += '<div class="mob-body">';

    h += '<div class="row gap2 wrap mb4">' + UI.badge(V.WO_STATES, w.status) + UI.badge(V.PRIORITIES, w.priority) +
      '<span class="chip">' + V.hm(w.start) + '–' + V.hm(w.end) + '</span>' +
      '<span class="chip">' + w.estimated + ' h est.</span></div>';

    /* cliente y sitio */
    h += '<div class="card mb4"><div class="card-b">' +
      '<div class="row gap2"><span class="av">' + E(V.initials(cus.name)) + '</span>' +
      '<div style="min-width:0"><b class="small" style="display:block">' + E(cus.name) + '</b>' +
      '<span class="xs muted">' + E(V.siteName(w.site_id)) + '</span></div></div>' +
      '<p class="small mt4">' + I('pin', 13) + ' ' + E(site.address || '—') + '</p>' +
      (site.access ? '<p class="xs muted mt2">' + I('key', 12) + ' ' + E(site.access) + '</p>' : '') +
      '<div class="row gap2 mt4">' +
      (cus.phone ? '<a class="btn btn-outline btn-sm" href="tel:' + E(cus.phone.replace(/\s/g, '')) + '">' + I('phone', 14) + ' Llamar</a>' : '') +
      (cus.whatsapp ? '<a class="btn btn-outline btn-sm" href="https://wa.me/' + cus.whatsapp.replace(/\D/g, '') + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
      '<a class="btn btn-outline btn-sm" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(site.address || '') + '" target="_blank" rel="noopener">' + I('nav', 14) + ' Navegar</a>' +
      '</div></div></div>';

    /* alcance y riesgos */
    h += '<div class="card mb4"><div class="card-h"><h3>Alcance y riesgos</h3></div><div class="card-b">' +
      '<p class="small">' + E(w.description || 'Sin descripción registrada.') + '</p>' +
      '<div class="banner banner-warn mt4">' + I('alert', 15) +
      '<div><b>Antes de empezar:</b> corte y verificación de ausencia de tensión, EPP completo, señalización del área y bloqueo del tablero.</div></div>' +
      '</div></div>';

    /* tiempos */
    h += '<div class="card mb4"><div class="card-h"><h3>Tiempos</h3><span class="small muted">' +
      Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min</span></div><div class="card-b">' +
      ((w.timeEntries || []).length ? (w.timeEntries || []).map(function (t) {
        return '<div class="spread small" style="padding:5px 0;border-bottom:1px solid var(--border)">' +
          '<span><span class="chip">' + E(t.type) + '</span></span>' +
          '<span class="mono muted">' + V.hm(t.from) + ' – ' + (t.to ? V.hm(t.to) : 'en curso') + '</span></div>';
      }).join('') : '<p class="small muted">Sin registros.</p>') + '</div></div>';

    /* checklist */
    h += '<div class="card mb4"><div class="card-h"><h3>Checklist</h3><span class="small muted">' + dn + '/' + chk.length + '</span></div><div class="card-b">' +
      (chk.length ? chk.map(function (c, i) {
        return '<div class="chk-item ' + (c.done ? 'done' : '') + '"><input type="checkbox" data-c="' + i + '"' + (c.done ? ' checked' : '') + '>' +
          '<label style="flex:1">' + E(c.text) + (c.required ? ' <span class="req">*</span>' : '') + '</label></div>';
      }).join('') : '<p class="small muted">Esta orden no tiene checklist.</p>') +
      (chk.length ? '<div class="bar mt4 ' + (dn === chk.length ? 'g' : '') + '"><i style="width:' + (dn / chk.length * 100) + '%"></i></div>' : '') +
      '</div></div>';

    /* materiales */
    h += '<div class="card mb4"><div class="card-h"><h3>Materiales</h3>' +
      '<button class="btn btn-ghost btn-sm" id="addmat">' + I('plus', 14) + '</button></div><div class="card-b">' +
      ((w.materials || []).length ? (w.materials || []).map(function (m, i) {
        var p = V.byId('products', m.product_id) || {};
        return '<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--border)">' +
          '<span style="min-width:0"><b class="small" style="display:block">' + E(p.name || '—') + '</b>' +
          '<span class="xs muted">Planificado: ' + m.planned + ' ' + E(p.unit || '') + '</span></span>' +
          '<span class="row gap1"><button class="btn btn-outline btn-sm btn-icon" data-m="' + i + '" data-d="-1">−</button>' +
          '<b class="mono" style="min-width:26px;text-align:center">' + m.used + '</b>' +
          '<button class="btn btn-outline btn-sm btn-icon" data-m="' + i + '" data-d="1">+</button></span></div>';
      }).join('') : '<p class="small muted">Sin materiales planificados.</p>') + '</div></div>';

    /* mediciones y notas */
    h += '<div class="card mb4"><div class="card-h"><h3>Mediciones y notas</h3></div><div class="card-b col">' +
      '<div class="field"><label for="obs">Observaciones del trabajo</label>' +
      '<textarea class="textarea" id="obs" placeholder="Tensiones medidas, hallazgos, condiciones del sitio…">' + E(w.observations || '') + '</textarea></div>' +
      '<div class="field"><label for="rec">Trabajo adicional sugerido</label>' +
      '<textarea class="textarea" id="rec" style="min-height:64px" placeholder="Lo que recomiendas y se debe presupuestar aparte">' + E(w.recommendations || '') + '</textarea></div>' +
      '<button class="btn btn-outline btn-sm" id="savenotes">Guardar notas</button>' +
      '<button class="btn btn-ghost btn-sm" id="extra">' + I('plus', 14) + ' Proponer cambio de alcance</button>' +
      '</div></div>';

    /* evidencias */
    h += '<div class="card mb4"><div class="card-h"><h3>Evidencias</h3><span class="small muted">' + (w.photos || []).length + '</span></div><div class="card-b">' +
      ['antes', 'durante', 'despues'].map(function (tag) {
        var ph = (w.photos || []).filter(function (p) { return p.tag === tag; });
        return '<div class="mb4"><div class="spread mb2"><b class="xs" style="text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">' +
          (tag === 'despues' ? 'Después' : tag) + '</b>' +
          '<button class="btn btn-outline btn-sm" data-ph="' + tag + '">' + I('camera', 13) + ' Foto</button></div>' +
          (ph.length ? '<div class="gallery">' + ph.map(function (p) { return '<div class="ph">' + I('camera', 16) + '</div>'; }).join('') + '</div>'
                     : '<p class="xs muted">Sin fotos.</p>') + '</div>';
      }).join('') + '</div></div>';

    /* firma */
    h += '<div class="card mb4"><div class="card-h"><h3>Firma del cliente</h3></div><div class="card-b">' +
      (w.signature
        ? '<div class="banner banner-success">' + I('pen', 15) + '<div><b>' + E(w.signature.name) + '</b><br><span class="xs">' + V.fdatetime(w.signature.at) + '</span></div></div>'
        : '<p class="small muted mb2">Necesaria para completar la orden.</p>' +
          '<canvas class="sign-pad" id="pad" height="150"></canvas>' +
          '<div class="field mt2"><label for="sn">Nombre de quien firma</label><input class="input" id="sn" placeholder="Nombre y apellido"></div>' +
          '<div class="row gap2 mt2"><button class="btn btn-outline btn-sm" id="clr">Limpiar</button>' +
          '<button class="btn btn-secondary btn-sm grow" id="savesign">Guardar firma</button></div>') +
      '</div></div>';

    /* historial */
    h += '<div class="card mb4"><div class="card-h"><h3>Historial</h3></div><div class="card-b">' +
      UI.timeline((w.history || []).slice().reverse().map(function (hh) {
        return { icon: 'refresh', tone: ['CLOSED', 'COMPLETED'].indexOf(hh.status) >= 0 ? 'g' : '',
                 text: '<b>' + E((V.WO_STATES[hh.status] || {}).label || hh.status) + '</b>' + (hh.note ? ' — ' + E(hh.note) : ''),
                 meta: V.userName(hh.by) + ' · ' + V.fdatetime(hh.at) };
      })) + '</div></div>';

    h += '</div>';

    /* CTA principal según estado */
    var cta = ctaFor(w);
    if (cta) h += '<div class="sticky-cta"><button class="btn btn-primary btn-lg btn-block" id="cta">' + I(cta.icon, 17) + ' ' + E(cta.label) + '</button>' +
      (w.status === 'IN_PROGRESS' ? '<button class="btn btn-ghost btn-sm btn-block mt2" id="pause">' + I('pause', 14) + ' Pausar trabajo</button>' : '') +
      '</div>';

    app.innerHTML = h;
    bindHead(); renderNav('ordenes');

    /* firma */
    var pad = document.getElementById('pad'), sig = pad ? UI.signaturePad(pad) : null;
    if (pad) {
      document.getElementById('clr').addEventListener('click', function () { sig.clear(); });
      document.getElementById('savesign').addEventListener('click', function () {
        var n = document.getElementById('sn').value.trim();
        if (!n) { UI.toast('Indica el nombre de quien firma.', 'err'); return; }
        if (sig.isEmpty()) { UI.toast('Falta la firma en el recuadro.', 'err'); return; }
        V.update('workOrders', w.id, { signature: { name: n, at: new Date().toISOString() } });
        V.logActivity('work_order', w.id, 'Capturó la firma del cliente (' + n + ')', 'doc');
        UI.toast('Firma guardada.', 'ok'); viewOrden(id);
      });
    }

    /* checklist */
    app.querySelectorAll('[data-c]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        w.checklist[+this.dataset.c].done = this.checked;
        V.update('workOrders', w.id, { checklist: w.checklist });
        viewOrden(id);
      });
    });

    /* materiales +/- */
    app.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +this.dataset.m, d = +this.dataset.d;
        w.materials[i].used = Math.max(0, (w.materials[i].used || 0) + d);
        V.update('workOrders', w.id, { materials: w.materials });
        viewOrden(id);
      });
    });
    document.getElementById('addmat').addEventListener('click', function () {
      UI.modal({ title: 'Agregar material consumido',
        body: '<div class="field"><label for="pp">Material</label><select class="select" id="pp">' +
          V.all('products').map(function (p) { return '<option value="' + p.id + '">' + E(p.sku + ' — ' + p.name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field mt4"><label for="qq">Cantidad usada</label><input class="input" id="qq" type="number" step="0.01" value="1"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          w.materials = (w.materials || []).concat([{ product_id: m.querySelector('#pp').value,
            planned: 0, used: +m.querySelector('#qq').value || 0, warehouse_id: 'wh_2' }]);
          V.update('workOrders', w.id, { materials: w.materials });
          UI.closeTop(); UI.toast('Material agregado.', 'ok'); viewOrden(id);
        }); } });
    });

    /* fotos */
    app.querySelectorAll('[data-ph]').forEach(function (b) {
      b.addEventListener('click', function () {
        var tag = this.dataset.ph;
        w.photos = (w.photos || []).concat([{ tag: tag, name: tag + '-' + ((w.photos || []).length + 1) + '.jpg' }]);
        V.update('workOrders', w.id, { photos: w.photos });
        UI.toast('Foto agregada (demo: la cámara real requiere el dispositivo).', 'ok'); viewOrden(id);
      });
    });

    /* notas */
    document.getElementById('savenotes').addEventListener('click', function () {
      V.update('workOrders', w.id, { observations: document.getElementById('obs').value.trim(),
        recommendations: document.getElementById('rec').value.trim() });
      UI.toast('Notas guardadas.', 'ok');
    });
    document.getElementById('extra').addEventListener('click', function () {
      UI.modal({ title: 'Proponer cambio de alcance',
        body: '<p class="small muted mb4">La administración calculará el precio y el cliente deberá aprobarlo antes de ejecutarse.</p>' +
          '<div class="field"><label for="cd">Trabajo adicional detectado</label><textarea class="textarea" id="cd"></textarea></div>' +
          '<div class="field mt4"><label for="ch">Horas estimadas</label><input class="input" id="ch" type="number" step="0.5" value="1"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Enviar propuesta</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          var d = m.querySelector('#cd').value.trim();
          if (!d) { UI.toast('Describe el trabajo adicional.', 'err'); return; }
          V.insert('comments', { entity: 'work_order', entity_id: w.id, user_id: V.getSession().user_id,
            text: 'Propuesta de cambio de alcance (' + m.querySelector('#ch').value + ' h): ' + d, visible: false, at: new Date().toISOString() });
          V.logActivity('work_order', w.id, 'Propuso un cambio de alcance', 'update');
          V.all('users').filter(function (u) { return ['coordinador', 'owner'].indexOf(u.role) >= 0; })
            .forEach(function (u) { V.notify(u.id, 'warning', 'Cambio de alcance propuesto', w.number + ': ' + d, '#ordenes/' + w.id); });
          UI.closeTop(); UI.toast('Propuesta enviada a la administración.', 'ok');
        }); } });
    });

    /* CTA */
    var c = document.getElementById('cta');
    if (c) c.addEventListener('click', function () {
      var r = V.woTransition(w.id, cta.to, cta.note || '');
      if (!r.ok) { UI.toast(r.error, 'err'); return; }
      if (cta.to === 'ON_SITE') {
        var te = (w.timeEntries || []).filter(function (t) { return t.type === 'viaje' && !t.to; })[0];
        if (te) { te.to = new Date().toISOString(); te.min = Math.round((new Date(te.to) - new Date(te.from)) / 60000); }
        V.update('workOrders', w.id, { timeEntries: w.timeEntries || [] });
      }
      if (cta.to === 'EN_ROUTE') {
        w.timeEntries = (w.timeEntries || []).concat([{ type: 'viaje', from: new Date().toISOString(), to: null, min: null }]);
        V.update('workOrders', w.id, { timeEntries: w.timeEntries });
      }
      if (cta.to === 'IN_PROGRESS' && !abierto) {
        w.timeEntries = (w.timeEntries || []).concat([{ type: 'trabajo', from: new Date().toISOString(), to: null, min: null }]);
        V.update('workOrders', w.id, { timeEntries: w.timeEntries });
      }
      if (cta.to === 'COMPLETED') {
        (w.timeEntries || []).forEach(function (t) {
          if (!t.to) { t.to = new Date().toISOString(); t.min = Math.round((new Date(t.to) - new Date(t.from)) / 60000); }
        });
        V.update('workOrders', w.id, { timeEntries: w.timeEntries, result: w.observations || 'Trabajo ejecutado según el alcance.' });
        V.woTransition(w.id, 'REVIEW', 'Enviada a validación');
        V.all('users').filter(function (u) { return ['coordinador', 'owner'].indexOf(u.role) >= 0; })
          .forEach(function (u) { V.notify(u.id, 'info', 'Orden completada', w.number + ' espera validación.', '#ordenes/' + w.id); });
        UI.modal({ title: '¡Trabajo completado!',
          body: '<div class="center col" style="align-items:center;gap:10px">' +
            '<span class="kpi-ico" style="width:52px;height:52px;background:var(--success-bg);color:var(--success)">' + I('checkCircle', 26) + '</span>' +
            '<h3>' + E(w.number) + '</h3><p class="small muted">Se envió el informe al cliente y la orden pasó a validación. ' +
            'Los materiales consumidos ya descontaron del inventario.</p></div>',
          footer: '<button class="btn btn-primary btn-block" data-close>Volver a mi día</button>',
          onMount: function (m) { m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) location.hash = 'dia'; }); } });
        return;
      }
      UI.toast('Estado actualizado: ' + V.WO_STATES[cta.to].label + '.', 'ok');
      viewOrden(id);
    });
    var pb = document.getElementById('pause');
    if (pb) pb.addEventListener('click', function () {
      UI.prompt({ title: 'Pausar el trabajo', label: 'Motivo de la pausa', required: true, placeholder: 'Falta de material, espera del cliente…' }, function (v) {
        (w.timeEntries || []).forEach(function (t) {
          if (!t.to && t.type === 'trabajo') { t.to = new Date().toISOString(); t.min = Math.round((new Date(t.to) - new Date(t.from)) / 60000); }
        });
        V.update('workOrders', w.id, { timeEntries: w.timeEntries });
        var r = V.woTransition(w.id, 'PAUSED', v);
        if (!r.ok) { UI.toast(r.error, 'err'); return; }
        UI.toast('Trabajo pausado.', 'ok'); viewOrden(id);
      });
    });
  }

  function ctaFor(w) {
    switch (w.status) {
      case 'ASSIGNED': return { to: 'EN_ROUTE', label: 'Iniciar viaje', icon: 'truck' };
      case 'SCHEDULED': return { to: 'ASSIGNED', label: 'Asumir la orden', icon: 'check', note: 'Asumida por el técnico' };
      case 'EN_ROUTE': return { to: 'ON_SITE', label: 'Llegué al sitio', icon: 'pin' };
      case 'ON_SITE': return { to: 'IN_PROGRESS', label: 'Iniciar trabajo', icon: 'play' };
      case 'IN_PROGRESS': return { to: 'COMPLETED', label: 'Completar y enviar', icon: 'checkCircle' };
      case 'PAUSED': return { to: 'IN_PROGRESS', label: 'Reanudar trabajo', icon: 'play' };
      default: return null;
    }
  }

  /* ---------- materiales del vehículo ---------- */
  function viewMateriales() {
    var wh = V.all('warehouses').filter(function (x) { return x.type === 'vehiculo'; })[0] || V.all('warehouses')[0];
    var prods = V.all('products').filter(function (p) { return (p.stock[wh.id] || 0) > 0; });
    var h = head('Materiales', 'Existencias en ' + E(wh.name));
    h += '<div class="mob-body">';
    h += '<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px" class="mb4">' +
      UI.kpi({ label: 'SKU en vehículo', value: prods.length, icon: 'box' }) +
      UI.kpi({ label: 'Valor', value: V.money(prods.reduce(function (a, p) { return a + p.stock[wh.id] * p.cost; }, 0)), icon: 'dollar' }) +
      '</div>';
    h += '<div class="card mt4"><div class="card-h"><h3>Mi inventario</h3></div><div class="card-b">' +
      (prods.length ? prods.map(function (p) {
        return '<div class="spread" style="padding:9px 0;border-bottom:1px solid var(--border)">' +
          '<span style="min-width:0"><b class="small" style="display:block">' + E(p.name) + '</b>' +
          '<span class="xs muted mono">' + E(p.sku) + '</span></span>' +
          '<b class="mono">' + p.stock[wh.id] + ' ' + E(p.unit) + '</b></div>';
      }).join('') : '<p class="small muted">Sin existencias asignadas.</p>') + '</div></div>';
    h += '<button class="btn btn-outline btn-block mt4" id="req">' + I('cart', 15) + ' Solicitar reposición</button>';
    h += '</div>';
    app.innerHTML = h;
    bindHead(); renderNav('materiales');
    document.getElementById('req').addEventListener('click', function () {
      UI.prompt({ title: 'Solicitar reposición', label: 'Qué necesitas', textarea: true, required: true,
        placeholder: 'Ej.: 100 m de cable THHN #12, 5 breakers 1P 20 A' }, function (v) {
        V.all('users').filter(function (u) { return u.role === 'almacen'; })
          .forEach(function (u) { V.notify(u.id, 'warning', 'Reposición solicitada', tec.name + ': ' + v, '#inventario'); });
        UI.toast('Solicitud enviada a almacén.', 'ok');
      });
    });
  }

  /* ---------- perfil ---------- */
  function viewPerfil() {
    var wos = myWOs();
    var h = head('Mi perfil', E(tec.level) + ' · ' + E(tec.zone));
    h += '<div class="mob-body">';
    h += '<div class="card mb4"><div class="card-b center col" style="align-items:center;gap:8px">' +
      '<span class="av xl dark">' + E(V.initials(tec.name)) + '</span>' +
      '<h3>' + E(tec.name) + '</h3><p class="xs muted">' + E(me.email) + '</p>' +
      '<span class="badge b-orange">' + E(tec.type) + '</span></div></div>';
    h += '<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">' +
      UI.kpi({ label: 'Completadas', value: tec.kpi.completadas, icon: 'checkCircle' }) +
      UI.kpi({ label: 'Puntualidad', value: tec.kpi.puntualidad + '%', icon: 'clock' }) +
      UI.kpi({ label: 'Horas', value: tec.kpi.horas, icon: 'gauge' }) +
      UI.kpi({ label: 'Valoración', value: tec.kpi.rating + '/5', icon: 'star' }) +
      '</div>';
    h += '<div class="card mt4"><div class="card-h"><h3>Mis certificaciones</h3></div><div class="card-b">' +
      ((tec.certifications || []).length ? tec.certifications.map(function (c) {
        var d = V.daysTo(c.expires);
        return '<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--border)">' +
          '<span style="min-width:0"><b class="small" style="display:block">' + E(c.name) + '</b>' +
          '<span class="xs muted">Vence ' + V.fdate(c.expires) + '</span></span>' +
          (d < 0 ? '<span class="badge b-red">Vencida</span>' : d <= 30 ? '<span class="badge b-amber">' + d + ' días</span>' : '<span class="badge b-green">Vigente</span>') + '</div>';
      }).join('') : '<p class="small muted">Sin certificaciones registradas.</p>') + '</div></div>';
    h += '<div class="card mt4"><div class="card-h"><h3>Herramientas a mi cargo</h3></div><div class="card-b col" style="gap:6px">' +
      ((tec.tools || []).length ? tec.tools.map(function (t) { return '<div class="row gap2 small">' + I('wrench', 14) + E(t) + '</div>'; }).join('')
        : '<p class="small muted">Sin herramientas asignadas.</p>') + '</div></div>';
    h += '<div class="card mt4"><div class="card-h"><h3>Resumen del mes</h3></div><div class="card-b col" style="gap:9px">' +
      row('Órdenes asignadas', wos.length) +
      row('Cerradas', wos.filter(function (w) { return w.status === 'CLOSED'; }).length) +
      row('En curso', wos.filter(function (w) { return ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PAUSED'].indexOf(w.status) >= 0; }).length) +
      row('Horas registradas', (wos.reduce(function (a, w) { return a + (w.timeEntries || []).reduce(function (x, t) { return x + (t.min || 0); }, 0); }, 0) / 60).toFixed(1)) +
      '</div></div>';
    h += '<button class="btn btn-outline btn-block mt4" id="lo2">' + I('logout', 15) + ' Cerrar sesión</button>';
    h += '<p class="xs muted center mt4">VOLTX PWA · datos en caché para trabajar sin conexión</p>';
    h += '</div>';
    app.innerHTML = h;
    bindHead(); renderNav('perfil');
    document.getElementById('lo2').addEventListener('click', function () { V.logout(); location.href = 'login.html'; });
  }

  /* ---------- router ---------- */
  function route() {
    var raw = (location.hash || '#dia').slice(1), parts = raw.split('/');
    UI.closeAll();
    window.scrollTo({ top: 0 });
    if (parts[0] === 'orden' && parts[1]) return viewOrden(parts[1]);
    if (parts[0] === 'ordenes') return viewOrdenes();
    if (parts[0] === 'materiales') return viewMateriales();
    if (parts[0] === 'perfil') return viewPerfil();
    viewDia();
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
