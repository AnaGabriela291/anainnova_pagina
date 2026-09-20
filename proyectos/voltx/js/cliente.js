/* ============================================================
   VOLTX — Portal del cliente §7
   Resumen, solicitar servicio, mis solicitudes, presupuestos,
   trabajos, calendario, documentos, facturas, mantenimientos,
   soporte y perfil. Solo ve SUS propios datos.
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX;
  var me, cus, tenant;

  var s = V.getSession();
  if (!s) { location.href = 'login.html'; }
  me = V.me();
  if (!me) { V.logout(); location.href = 'login.html'; }
  tenant = V.myTenant();
  cus = me.customer_id ? V.byId('customers', me.customer_id) : V.all('customers')[0];

  /* ---------- scoping: solo datos del cliente ---------- */
  function my(coll) { return V.all(coll).filter(function (r) { return r.customer_id === cus.id; }); }
  function mySites() { return V.all('sites').filter(function (x) { return x.customer_id === cus.id; }); }
  function myDocs() { return V.all('documents').filter(function (d) { return d.customer_id === cus.id && d.visibility === 'cliente'; }); }

  var NAV = [
    ['resumen', 'Resumen', 'home'],
    ['solicitar', 'Solicitar servicio', 'plus'],
    ['solicitudes', 'Mis solicitudes', 'inbox'],
    ['presupuestos', 'Presupuestos', 'file'],
    ['trabajos', 'Trabajos y proyectos', 'clipboard'],
    ['calendario', 'Calendario de visitas', 'calendar'],
    ['documentos', 'Documentos', 'folder'],
    ['facturas', 'Facturas y pagos', 'receipt'],
    ['mantenimientos', 'Mantenimientos', 'wrench'],
    ['soporte', 'Soporte', 'alert'],
    ['perfil', 'Perfil y propiedades', 'user']
  ];

  function kv(k, v) { return '<div class="spread" style="align-items:flex-start;gap:12px"><span class="small muted nowrap">' + E(k) + '</span><span class="small bold right">' + v + '</span></div>'; }
  function PH(o) {
    return '<div class="page-h"><div><h1>' + E(o.title) + '</h1>' +
      (o.sub ? '<p class="sub">' + o.sub + '</p>' : '') + '</div>' +
      (o.actions ? '<div class="row gap2 wrap">' + o.actions + '</div>' : '') + '</div>';
  }

  /* ---------- chrome ---------- */
  function chrome() {
    document.getElementById('lm').innerHTML = I('zap', 17);
    document.getElementById('brand').innerHTML = E(tenant.name.split(' ')[0]) + '<em>' + E(tenant.name.split(' ').slice(1).join(' ')) + '</em>';
    document.getElementById('brand').style.fontSize = '15px';
    document.getElementById('burger').innerHTML = I('menu', 20);
    document.getElementById('hi').innerHTML = I('info', 15);
    document.getElementById('uav').textContent = V.initials(me.name);
    document.getElementById('uinfo').innerHTML = '<span class="small bold">' + E(me.name.split(' ')[0]) + '</span>' +
      '<span class="xs muted">' + E(cus.name) + '</span>';

    document.getElementById('userbtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var host = document.getElementById('userMenu');
      if (host.innerHTML) { host.innerHTML = ''; return; }
      host.innerHTML = '<div class="menu" style="min-width:240px">' +
        '<div class="head"><b class="small">' + E(me.name) + '</b><div class="xs muted">' + E(me.email) + '</div>' +
        '<div class="mt2"><span class="badge b-orange">Cliente</span></div></div>' +
        '<a href="#perfil">' + I('user', 15) + 'Perfil y propiedades</a>' +
        '<a href="#soporte">' + I('alert', 15) + 'Soporte</a>' +
        '<div class="sep"></div>' +
        '<button id="lo">' + I('logout', 15) + 'Cerrar sesión</button></div>';
      host.querySelector('#lo').addEventListener('click', function () { V.logout(); location.href = 'login.html'; });
    });
    document.addEventListener('click', function () { document.getElementById('userMenu').innerHTML = ''; });

    var shell = document.getElementById('shell');
    document.getElementById('burger').addEventListener('click', function (e) { e.stopPropagation(); shell.classList.toggle('open'); });
    document.getElementById('backdrop').addEventListener('click', function () { shell.classList.remove('open'); });
    function sizing() { document.getElementById('burger').style.display = window.innerWidth <= 1024 ? 'grid' : 'none'; }
    sizing(); window.addEventListener('resize', sizing);
  }

  function renderNav() {
    var hash = (location.hash || '#resumen').slice(1).split('/')[0];
    var counts = {
      presupuestos: my('quotes').filter(function (q) { return ['SENT', 'VIEWED'].indexOf(q.status) >= 0; }).length,
      facturas: my('invoices').filter(function (i) { return V.invoiceTotals(i).balance > 0.01 && i.status !== 'VOID'; }).length,
      solicitudes: my('requests').filter(function (r) { return ['NEW', 'CONTACTED', 'SCHEDULED', 'QUOTING'].indexOf(r.status) >= 0; }).length
    };
    document.getElementById('nav').innerHTML = NAV.map(function (n) {
      var c = counts[n[0]] || 0;
      return '<a href="#' + n[0] + '" class="' + (hash === n[0] ? 'on' : '') + '">' + I(n[2], 17) +
        '<span>' + E(n[1]) + '</span>' + (c ? '<span class="cnt">' + c + '</span>' : '') + '</a>';
    }).join('');
  }

  /* ============================================================
     7.1 Resumen
     ============================================================ */
  function viewResumen(el) {
    var reqs = my('requests'), quotes = my('quotes'), invs = my('invoices');
    var wos = my('workOrders');
    var pend = quotes.filter(function (q) { return ['SENT', 'VIEWED'].indexOf(q.status) >= 0; });
    var porPagar = invs.filter(function (i) { return V.invoiceTotals(i).balance > 0.01 && i.status !== 'VOID'; });
    var prox = wos.filter(function (w) { return new Date(w.start) >= new Date() && ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); })[0];
    var recientes = wos.filter(function (w) { return ['CLOSED', 'COMPLETED', 'REVIEW'].indexOf(w.status) >= 0; })
      .sort(function (a, b) { return new Date(b.start) - new Date(a.start); }).slice(0, 4);

    var h = PH({
      title: 'Hola, ' + me.name.split(' ')[0],
      sub: 'Resumen de tus servicios con <b>' + E(tenant.name) + '</b>',
      actions: '<a class="btn btn-primary btn-sm" href="#solicitar">' + I('plus', 15) + ' Solicitar un servicio</a>'
    });

    h += '<div class="grid g4">' +
      UI.kpi({ label: 'Solicitudes abiertas', value: reqs.filter(function (r) { return ['NEW', 'CONTACTED', 'SCHEDULED', 'QUOTING'].indexOf(r.status) >= 0; }).length, icon: 'inbox' }) +
      UI.kpi({ label: 'Próximos trabajos', value: wos.filter(function (w) { return new Date(w.start) >= new Date() && ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; }).length, icon: 'calendar' }) +
      UI.kpi({ label: 'Presupuestos por responder', value: pend.length, icon: 'file', sub: pend.length ? 'Requieren tu aprobación' : 'Nada pendiente' }) +
      UI.kpi({ label: 'Por pagar', value: V.money(porPagar.reduce(function (a, i) { return a + V.invoiceTotals(i).balance; }, 0)), icon: 'receipt',
               sub: porPagar.length + ' factura(s)', trend: porPagar.length ? 'down' : '' }) +
      '</div>';

    if (pend.length) {
      h += '<div class="banner banner-brand mt4">' + I('file', 16) + '<div><b>Tienes ' + pend.length + ' presupuesto(s) esperando tu respuesta:</b> ' +
        pend.map(function (q) { return '<a href="#presupuestos/' + q.id + '">' + E(q.number) + '</a> (' + V.money(V.quoteTotals(q).total) + ', vence ' + V.frel(q.validUntil) + ')'; }).join(' · ') + '</div></div>';
    }

    h += '<div class="grid g-2-1 mt4"><div class="col">';

    /* próxima visita */
    h += '<div class="card"><div class="card-h"><h3>Tu próxima visita</h3></div>';
    if (prox) {
      h += '<div class="card-b">' +
        '<div class="spread" style="align-items:flex-start">' +
        '<div><div class="row gap2 mb2">' + UI.badge(V.WO_STATES, prox.status) + UI.badge(V.PRIORITIES, prox.priority) + '</div>' +
        '<h3 style="font-size:17px">' + E(prox.title) + '</h3>' +
        '<p class="small muted mt2">' + E(V.siteName(prox.site_id)) + '</p></div>' +
        '<div class="right"><div class="xs muted">Fecha</div><b>' + V.fdate(prox.start) + '</b>' +
        '<div class="small muted">' + V.hm(prox.start) + ' – ' + V.hm(prox.end) + '</div></div></div>' +
        ((prox.technicians || []).length ? '<div class="file-row mt4"><span class="av sm">' + E(V.initials(V.techName(prox.technicians[0]))) + '</span>' +
          '<span><b class="small" style="display:block">' + E(V.techName(prox.technicians[0])) + '</b>' +
          '<span class="xs muted">Técnico asignado</span></span></div>' : '') +
        '<a href="#trabajos/' + prox.id + '" class="btn btn-outline btn-sm mt4">Ver detalle del trabajo</a>' +
        '</div>';
    } else {
      h += UI.emptyState({ icon: 'calendar', title: 'Sin visitas programadas', text: 'Cuando agendemos un trabajo aparecerá aquí.',
        action: '<a class="btn btn-primary btn-sm" href="#solicitar">Solicitar un servicio</a>' });
    }
    h += '</div>';

    /* trabajos recientes */
    h += '<div class="card"><div class="card-h"><h3>Trabajos recientes</h3><a href="#trabajos" class="small">Ver todos</a></div>';
    if (recientes.length) {
      h += '<div class="tbl-wrap"><table class="tbl"><tbody>' + recientes.map(function (w) {
        return '<tr class="clickable" onclick="location.hash=\'trabajos/' + w.id + '\'">' +
          '<td><b>' + E(w.title) + '</b><div class="xs muted">' + E(w.number) + ' · ' + E(V.siteName(w.site_id)) + '</div></td>' +
          '<td class="small">' + V.fdate(w.start) + '</td>' +
          '<td class="right">' + UI.badge(V.WO_STATES, w.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    } else h += '<div class="card-b"><p class="small muted">Todavía no hay trabajos finalizados.</p></div>';
    h += '</div></div>';

    /* lateral */
    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Últimos documentos</h3><a href="#documentos" class="small">Ver todos</a></div><div class="card-b col" style="gap:7px">' +
      (myDocs().length ? myDocs().slice(0, 5).map(function (d) {
        return '<div class="file-row"><span class="file-ico">' + I('file', 15) + '</span>' +
          '<span style="min-width:0"><b class="small truncate" style="display:block">' + E(d.name) + '</b>' +
          '<span class="xs muted">' + E(d.category) + ' · ' + V.fdate(d.date) + '</span></span></div>';
      }).join('') : '<p class="small muted">Sin documentos compartidos.</p>') + '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Mantenimientos</h3></div><div class="card-b col" style="gap:7px">' +
      (my('maintenancePlans').length ? my('maintenancePlans').map(function (m) {
        return '<div class="file-row"><span class="file-ico">' + I('wrench', 15) + '</span>' +
          '<span><b class="small" style="display:block">' + E(m.name) + '</b>' +
          '<span class="xs muted">' + E(m.frequency) + ' · próximo ' + V.fdate(m.nextDate) + '</span></span></div>';
      }).join('') : '<p class="small muted">Sin planes de mantenimiento activos.</p>') + '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Tu proveedor</h3></div><div class="card-b col" style="gap:10px">' +
      kv('Empresa', E(tenant.name)) + kv('Teléfono', E(tenant.phone)) +
      kv('Correo', '<a href="mailto:' + E(tenant.email) + '">' + E(tenant.email) + '</a>') +
      kv('Dirección', E(tenant.address)) +
      '</div></div></div></div>';

    el.innerHTML = h;
  }

  /* ============================================================
     7.2 Solicitar servicio
     ============================================================ */
  function viewSolicitar(el) {
    var step = 1, data = { site: '', cat: '', desc: '', urg: 'normal', pref: '', files: [] };
    var CATS = [['Instalación', 'plus'], ['Reparación / falla', 'wrench'], ['Mantenimiento', 'refresh'],
                ['Inspección o diagnóstico', 'search'], ['Iluminación', 'bolt'], ['Emergencia', 'alert']];
    function render() {
      var h = PH({ title: 'Solicitar un servicio', sub: 'Cuéntanos qué necesitas y te contactamos para agendar la visita' });
      h += '<div class="card"><div class="card-b">' +
        '<div class="stepper mb6">' + ['Ubicación', 'Servicio', 'Detalles', 'Confirmar'].map(function (sx, i) {
          var n = i + 1, cls = n < step ? 'done' : n === step ? 'on' : '';
          return '<span class="step ' + cls + '"><span class="n">' + (n < step ? '✓' : n) + '</span>' + sx + '</span>' +
            (i < 3 ? '<span class="step-sep"></span>' : '');
        }).join('') + '</div><div id="sb"></div></div></div>';
      el.innerHTML = h;
      var sb = el.querySelector('#sb');

      if (step === 1) {
        sb.innerHTML = '<h3 class="mb4">¿Dónde necesitas el servicio?</h3><div class="role-pick">' +
          mySites().map(function (s2) {
            return '<button type="button" data-s="' + s2.id + '"' + (data.site === s2.id ? ' class="on"' : '') + '>' +
              '<span class="kpi-ico">' + I('pin', 16) + '</span>' +
              '<span><b class="small" style="display:block">' + E(s2.name) + '</b>' +
              '<span class="xs muted">' + E(s2.address) + '</span></span></button>';
          }).join('') +
          '<button type="button" data-s="new"><span class="kpi-ico">' + I('plus', 16) + '</span>' +
          '<span><b class="small" style="display:block">Agregar otra ubicación</b><span class="xs muted">Registrar una nueva propiedad</span></span></button>' +
          '</div><button class="btn btn-primary mt6" id="next">Continuar</button>';
        sb.querySelectorAll('[data-s]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (this.dataset.s === 'new') { addSite(); return; }
            data.site = this.dataset.s; render();
          });
        });
        sb.querySelector('#next').addEventListener('click', function () {
          if (!data.site) { UI.toast('Selecciona la ubicación.', 'err'); return; }
          step = 2; render();
        });
      }

      if (step === 2) {
        sb.innerHTML = '<h3 class="mb4">¿Qué tipo de servicio necesitas?</h3><div class="grid g3">' +
          CATS.map(function (c) {
            return '<button type="button" class="card" data-c="' + E(c[0]) + '" style="cursor:pointer;text-align:left;border-color:' +
              (data.cat === c[0] ? 'var(--primary-600)' : 'var(--border)') + '">' +
              '<div class="card-b tight"><span class="kpi-ico">' + I(c[1], 16) + '</span>' +
              '<div class="bold small mt2">' + E(c[0]) + '</div></div></button>';
          }).join('') + '</div>' +
          '<div class="row gap2 mt6"><button class="btn btn-outline" id="back">Atrás</button>' +
          '<button class="btn btn-primary" id="next">Continuar</button></div>';
        sb.querySelectorAll('[data-c]').forEach(function (b) {
          b.addEventListener('click', function () { data.cat = this.dataset.c; render(); });
        });
        sb.querySelector('#back').addEventListener('click', function () { step = 1; render(); });
        sb.querySelector('#next').addEventListener('click', function () {
          if (!data.cat) { UI.toast('Selecciona el tipo de servicio.', 'err'); return; }
          step = 3; render();
        });
      }

      if (step === 3) {
        sb.innerHTML = '<h3 class="mb4">Cuéntanos los detalles</h3>' +
          '<div class="field"><label for="de">Describe el problema o requerimiento <span class="req">*</span></label>' +
          '<textarea class="textarea" id="de" style="min-height:120px" placeholder="Ej.: el breaker de la cocina se dispara cada vez que enciendo el horno.">' + E(data.desc) + '</textarea></div>' +
          '<div class="field mt4"><label>¿Qué tan urgente es?</label><div class="grid g4">' +
          [['baja', 'Puede esperar'], ['normal', 'Normal'], ['alta', 'Urgente'], ['critica', 'Emergencia']].map(function (u) {
            return '<button type="button" class="btn btn-outline" data-u="' + u[0] + '" style="' +
              (data.urg === u[0] ? 'border-color:var(--primary-600);color:var(--primary-600);background:var(--primary-050)' : '') + '">' + u[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div class="field mt4"><label for="pf">Disponibilidad preferida</label>' +
          '<select class="select" id="pf"><option value="">Cualquier momento</option>' +
          ['Mañana (8:00–12:00)', 'Tarde (13:00–17:00)', 'Fin de semana', 'Fuera de horario laboral']
            .map(function (p) { return '<option' + (data.pref === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>' +
          '<div class="field mt4"><label>Fotos o documentos (opcional)</label>' +
          '<div class="dropzone" id="dz">' + I('camera', 22) + '<div class="mt2 small">Arrastra fotos del problema o haz clic para seleccionarlas</div></div>' +
          (data.files.length ? '<div class="gallery mt2">' + data.files.map(function (f) { return '<div class="ph">' + I('camera', 16) + '</div>'; }).join('') + '</div>' : '') +
          '</div>' +
          '<div class="row gap2 mt6"><button class="btn btn-outline" id="back">Atrás</button>' +
          '<button class="btn btn-primary" id="next">Revisar y enviar</button></div>';
        sb.querySelectorAll('[data-u]').forEach(function (b) {
          b.addEventListener('click', function () { data.urg = this.dataset.u; data.desc = sb.querySelector('#de').value; render(); });
        });
        UI.uploader(sb.querySelector('#dz'), function () { data.desc = sb.querySelector('#de').value; data.files.push(1); render(); });
        sb.querySelector('#back').addEventListener('click', function () { data.desc = sb.querySelector('#de').value; step = 2; render(); });
        sb.querySelector('#next').addEventListener('click', function () {
          data.desc = sb.querySelector('#de').value.trim();
          data.pref = sb.querySelector('#pf').value;
          if (!data.desc) { UI.toast('Describe lo que necesitas.', 'err'); return; }
          step = 4; render();
        });
      }

      if (step === 4) {
        var site = V.byId('sites', data.site) || {};
        sb.innerHTML = '<h3 class="mb4">Revisa tu solicitud</h3>' +
          '<div class="card"><div class="card-b col" style="gap:10px">' +
          kv('Ubicación', E(site.name) + '<div class="xs muted">' + E(site.address || '') + '</div>') +
          kv('Tipo de servicio', E(data.cat)) +
          kv('Urgencia', UI.badge(V.PRIORITIES, data.urg)) +
          kv('Disponibilidad', E(data.pref || 'Cualquier momento')) +
          kv('Archivos', data.files.length + ' adjunto(s)') +
          '<div><span class="small muted">Descripción</span><p class="small mt2">' + E(data.desc) + '</p></div>' +
          '</div></div>' +
          '<div class="banner banner-info mt4">' + I('info', 15) +
          '<div>Recibirás un número de solicitud y te contactaremos' + (data.urg === 'critica' ? ' de inmediato' : ' en las próximas horas hábiles') + ' para agendar la visita.</div></div>' +
          '<div class="row gap2 mt6"><button class="btn btn-outline" id="back">Atrás</button>' +
          '<button class="btn btn-primary btn-lg" id="send">Enviar solicitud</button></div>';
        sb.querySelector('#back').addEventListener('click', function () { step = 3; render(); });
        sb.querySelector('#send').addEventListener('click', function () {
          var r = V.insert('requests', {
            number: V.nextNumber('request'), customer_id: cus.id, site_id: data.site,
            channel: 'Portal cliente', service: data.cat, title: data.cat + ' — ' + E(site.name),
            description: data.desc + (data.pref ? ' [Disponibilidad preferida: ' + data.pref + ']' : ''),
            priority: data.urg, status: 'NEW', owner_user_id: cus.owner_user_id,
            due: V.ymd(V.addDays(V.today(), data.urg === 'critica' ? 0 : data.urg === 'alta' ? 1 : 3)),
            files: data.files.map(function (_, i) { return 'foto-' + (i + 1) + '.jpg'; }), lostReason: ''
          });
          V.logActivity('service_request', r.id, 'El cliente creó la solicitud ' + r.number + ' desde el portal', 'create');
          V.all('users').filter(function (u) { return ['ventas', 'coordinador', 'owner'].indexOf(u.role) >= 0; })
            .forEach(function (u) { V.notify(u.id, data.urg === 'critica' ? 'danger' : 'info', 'Nueva solicitud del portal',
              r.number + ' — ' + cus.name + ': ' + data.cat, '#solicitudes/' + r.id); });
          UI.modal({ title: '¡Solicitud enviada!',
            body: '<div class="center col" style="align-items:center;gap:10px">' +
              '<span class="kpi-ico" style="width:52px;height:52px;background:var(--success-bg);color:var(--success)">' + I('checkCircle', 26) + '</span>' +
              '<h3>' + E(r.number) + '</h3>' +
              '<p class="small muted">Guarda este número para hacer seguimiento. Puedes ver el estado en «Mis solicitudes» en cualquier momento.</p></div>',
            footer: '<button class="btn btn-primary btn-block" id="ok">Ver mis solicitudes</button>',
            onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () { UI.closeTop(); location.hash = 'solicitudes'; }); } });
        });
      }
    }
    function addSite() {
      UI.modal({ title: 'Agregar una ubicación',
        body: '<div class="field"><label for="sn">Nombre del sitio <span class="req">*</span></label><input class="input" id="sn" placeholder="Casa, oficina, local…"></div>' +
          '<div class="field mt4"><label for="sa">Dirección <span class="req">*</span></label><input class="input" id="sa"></div>' +
          '<div class="field mt4"><label for="st">Tipo de inmueble</label><input class="input" id="st" placeholder="Vivienda, local comercial…"></div>' +
          '<div class="field mt4"><label for="sc">Instrucciones de acceso</label><input class="input" id="sc" placeholder="Timbre, portería, estacionamiento…"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          var n = m.querySelector('#sn').value.trim(), a = m.querySelector('#sa').value.trim();
          if (!n || !a) { UI.toast('Nombre y dirección son obligatorios.', 'err'); return; }
          var s2 = V.insert('sites', { customer_id: cus.id, name: n, address: a,
            propertyType: m.querySelector('#st').value.trim(), access: m.querySelector('#sc').value.trim(),
            lat: 35 + Math.random() * 35, lng: 22 + Math.random() * 50, notes: '' });
          data.site = s2.id; UI.closeTop(); UI.toast('Ubicación agregada.', 'ok'); render();
        }); } });
    }
    render();
  }

  /* ============================================================
     7.x Mis solicitudes
     ============================================================ */
  function viewSolicitudes(el, id) {
    if (id) {
      var r = V.byId('requests', id);
      if (!r || r.customer_id !== cus.id) { el.innerHTML = PH({ title: 'Solicitud' }) + UI.errorState('No encontramos esa solicitud en tu cuenta.'); return; }
      var qs = my('quotes').filter(function (q) { return q.request_id === r.id; });
      var ins = V.all('inspections').filter(function (x) { return x.request_id === r.id; });
      el.innerHTML = PH({ title: r.title, sub: r.number + ' · enviada ' + V.frel(r.created_at) + ' · ' + UI.badge(V.REQ_STATES, r.status),
          actions: '<a class="btn btn-outline btn-sm" href="#solicitudes">' + I('arrowL', 15) + ' Volver</a>' }) +
        '<div class="grid g-2-1"><div class="col">' +
        '<div class="card"><div class="card-h"><h3>Lo que solicitaste</h3></div><div class="card-b col">' +
          '<p>' + E(r.description) + '</p>' +
          '<div class="grid g2 mt2">' + kv('Ubicación', E(V.siteName(r.site_id))) + kv('Tipo', E(r.service)) +
          kv('Urgencia', UI.badge(V.PRIORITIES, r.priority)) + kv('Fecha de envío', V.fdate(r.created_at)) + '</div>' +
          ((r.files || []).length
            ? '<div><b class="small">Archivos adjuntos</b><div class="gallery mt2">' +
              r.files.map(function (f) { return '<div class="ph">' + I('camera', 16) + '<span class="xs" style="margin-top:3px">' + E(f) + '</span></div>'; }).join('') +
              '</div></div>'
            : '') +
        '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Seguimiento</h3></div><div class="card-b">' +
        UI.timeline([{ icon: 'plus', text: 'Solicitud recibida', meta: V.fdatetime(r.created_at) }]
          .concat(ins.map(function (x) {
            return { icon: 'search', tone: x.status === 'COMPLETED' ? 'g' : 'b',
              text: 'Visita técnica ' + (x.status === 'COMPLETED' ? 'realizada' : 'programada'), meta: V.fdatetime(x.date) };
          }))
          .concat(qs.map(function (q) {
            return { icon: 'file', tone: q.status === 'APPROVED' ? 'g' : '', text: 'Presupuesto <a href="#presupuestos/' + q.id + '">' + E(q.number) + '</a> — ' + V.money(V.quoteTotals(q).total),
              meta: V.QUOTE_STATES[q.status].label };
          }))
          .concat(['WON'].indexOf(r.status) >= 0 ? [{ icon: 'checkCircle', tone: 'g', text: 'Solicitud aprobada y en ejecución', meta: '' }] : [])
          .reverse()) +
        '</div></div></div>' +
        '<div class="col"><div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Número', '<b>' + E(r.number) + '</b>') + kv('Estado', UI.badge(V.REQ_STATES, r.status)) +
        kv('Presupuestos', qs.length) + kv('Visitas', ins.length) +
        '</div></div>' +
        '<a class="btn btn-outline btn-block" href="#soporte">' + I('alert', 15) + ' Necesito ayuda con esta solicitud</a>' +
        '</div></div>';
      return;
    }

    var rows = my('requests').sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var h = PH({ title: 'Mis solicitudes', sub: rows.length + ' solicitud(es) registradas',
      actions: '<a class="btn btn-primary btn-sm" href="#solicitar">' + I('plus', 15) + ' Nueva solicitud</a>' });
    if (!rows.length) {
      h += '<div class="card">' + UI.emptyState({ icon: 'inbox', title: 'Aún no has solicitado servicios',
        text: 'Cuando necesites una instalación, reparación o mantenimiento, envíanos una solicitud desde aquí.',
        action: '<a class="btn btn-primary btn-sm" href="#solicitar">Solicitar un servicio</a>' }) + '</div>';
    } else {
      h += '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Número</th><th>Asunto</th><th>Ubicación</th><th>Enviada</th><th>Urgencia</th><th class="right">Estado</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr class="clickable" onclick="location.hash=\'solicitudes/' + r.id + '\'">' +
            '<td><b>' + E(r.number) + '</b></td><td><b>' + E(r.title) + '</b><div class="xs muted truncate" style="max-width:280px">' + E(r.description) + '</div></td>' +
            '<td class="small">' + E(V.siteName(r.site_id)) + '</td><td class="small">' + V.fdate(r.created_at) + '</td>' +
            '<td>' + UI.badge(V.PRIORITIES, r.priority) + '</td><td class="right">' + UI.badge(V.REQ_STATES, r.status) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    el.innerHTML = h;
  }

  /* ============================================================
     7.3 Presupuestos
     ============================================================ */
  function viewPresupuestos(el, id) {
    if (id) {
      var q = V.byId('quotes', id);
      if (!q || q.customer_id !== cus.id) { el.innerHTML = PH({ title: 'Presupuesto' }) + UI.errorState('No encontramos ese presupuesto en tu cuenta.'); return; }
      /* al abrirlo se marca como visto */
      if (q.status === 'SENT') {
        V.update('quotes', q.id, { status: 'VIEWED' });
        V.logActivity('quote', q.id, 'El cliente abrió el presupuesto ' + q.number, 'status');
      }
      var t = V.quoteTotals(q);
      var puede = ['SENT', 'VIEWED'].indexOf(q.status) >= 0 && V.daysTo(q.validUntil) >= 0;

      var h = PH({ title: q.number, sub: V.money(t.total) + ' · ' + UI.badge(V.QUOTE_STATES, q.status) + ' · válido hasta ' + V.fdate(q.validUntil),
        actions: '<a class="btn btn-outline btn-sm" href="#presupuestos">' + I('arrowL', 15) + ' Volver</a>' +
                 '<button class="btn btn-outline btn-sm" id="pdf">' + I('download', 15) + ' Descargar PDF</button>' });

      if (V.daysTo(q.validUntil) < 0 && q.status !== 'APPROVED') {
        h += '<div class="banner banner-warn mb4">' + I('clock', 16) + '<div>Este presupuesto venció el ' + V.fdate(q.validUntil) + '. Solicita una actualización si aún te interesa.</div></div>';
      }
      if (q.status === 'APPROVED') {
        h += '<div class="banner banner-success mb4">' + I('checkCircle', 16) + '<div><b>Aprobaste este presupuesto.</b> Coordinaremos la ejecución del trabajo.</div></div>';
      }

      h += '<div class="grid g-2-1"><div class="col">' +
        (q.scope ? '<div class="card"><div class="card-h"><h3>Alcance del trabajo</h3></div><div class="card-b"><p>' + E(q.scope) + '</p></div></div>' : '') +
        '<div class="card"><div class="card-h"><h3>Detalle</h3></div><div class="tbl-wrap"><table class="tbl">' +
        '<thead><tr><th>Descripción</th><th class="right">Cant.</th><th>Unidad</th><th class="right">Precio</th><th class="right">Total</th></tr></thead><tbody>' +
        q.items.map(function (it) {
          return '<tr><td><b>' + E(it.desc) + '</b></td><td class="right mono">' + it.qty + '</td>' +
            '<td class="small">' + E(it.unit) + '</td><td class="right mono">' + V.money(it.price) + '</td>' +
            '<td class="right mono bold">' + V.money(it.qty * it.price) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        ['exclusions:Exclusiones', 'terms:Términos y condiciones', 'warranty:Garantía'].map(function (p) {
          var ids = p.split(':');
          return q[ids[0]] ? '<div class="card"><div class="card-h"><h3>' + ids[1] + '</h3></div><div class="card-b"><p>' + E(q[ids[0]]) + '</p></div></div>' : '';
        }).join('') + '</div>';

      h += '<div class="col"><div class="card" style="position:sticky;top:76px"><div class="card-h"><h3>Resumen</h3></div><div class="card-b col" style="gap:9px">' +
        kv('Subtotal', V.money(t.sub)) + (q.discount ? kv('Descuento', '-' + V.money(t.disc)) : '') +
        kv(tenant.taxName + ' (' + q.taxRate + '%)', V.money(t.tax)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        '<div class="spread"><span class="bold">Total</span><span style="font-size:22px;font-weight:700;color:var(--black)">' + V.money(t.total) + '</span></div>' +
        (q.advance ? kv('Anticipo al aprobar (' + q.advance + '%)', V.money(t.advance)) : '') +
        (puede ? '<button class="btn btn-primary btn-lg btn-block mt4" id="apr">' + I('check', 16) + ' Aprobar presupuesto</button>' +
          '<button class="btn btn-outline btn-block" id="mod">Solicitar una modificación</button>' +
          '<button class="btn btn-ghost btn-block" id="rej">Rechazar</button>' : '') +
        '</div></div></div></div>';

      el.innerHTML = h;
      el.querySelector('#pdf').addEventListener('click', function () { printQuoteClient(q); });
      bind('#apr', function () {
        UI.modal({ title: 'Aprobar el presupuesto', subtitle: q.number + ' · ' + V.money(t.total),
          body: '<p class="small">Al aprobar aceptas el alcance, los términos y el monto indicados.</p>' +
            (q.terms ? '<div class="banner banner-info mt4">' + I('info', 15) + '<div class="xs">' + E(q.terms) + '</div></div>' : '') +
            '<div class="field mt4"><label for="fn">Nombre de quien aprueba <span class="req">*</span></label><input class="input" id="fn" value="' + E(me.name) + '"></div>' +
            '<div class="field mt4"><label>Firma</label><canvas class="sign-pad" id="pad" height="140"></canvas>' +
            '<button class="btn btn-ghost btn-sm mt2" id="clr">Limpiar firma</button></div>' +
            '<label class="check mt4"><input type="checkbox" id="ac"><span>Acepto los términos, condiciones y la garantía descritos en el presupuesto.</span></label>' +
            (q.advance ? '<div class="banner banner-brand mt4">' + I('dollar', 15) + '<div>Al aprobar se generará una factura de anticipo por <b>' + V.money(t.advance) + '</b>.</div></div>' : ''),
          footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Aprobar y firmar</button>',
          onMount: function (m) {
            var sig = UI.signaturePad(m.querySelector('#pad'));
            m.querySelector('#clr').addEventListener('click', function () { sig.clear(); });
            m.querySelector('#ok').addEventListener('click', function () {
              var fn = m.querySelector('#fn').value.trim();
              if (!fn) { UI.toast('Indica el nombre de quien aprueba.', 'err'); return; }
              if (!m.querySelector('#ac').checked) { UI.toast('Debes aceptar los términos y condiciones.', 'err'); return; }
              if (sig.isEmpty()) { UI.toast('Falta tu firma.', 'err'); return; }
              V.update('quotes', q.id, { status: 'APPROVED' });
              if (q.request_id) V.update('requests', q.request_id, { status: 'WON' });
              V.logActivity('quote', q.id, 'El cliente aprobó el presupuesto y firmó digitalmente (' + fn + ')', 'status');
              V.logAudit('UPDATE', 'quote', q.number, 'Aprobado por el cliente: ' + fn);
              if (q.advance) {
                var inv = V.insert('invoices', { number: V.nextNumber('invoice'), customer_id: cus.id, quote_id: q.id,
                  wo_id: null, project_id: null, status: 'ISSUED', date: V.ymd(V.today()), due: V.ymd(V.addDays(V.today(), 7)),
                  items: [{ desc: 'Anticipo ' + q.advance + '% — ' + q.number, qty: 1, price: t.advance / (1 + q.taxRate / 100) }],
                  taxRate: q.taxRate, discount: 0, notes: 'Anticipo generado al aprobar el presupuesto.' });
                V.logActivity('invoice', inv.id, 'Se generó la factura de anticipo ' + inv.number, 'create');
              }
              V.all('users').filter(function (u) { return ['ventas', 'coordinador', 'owner'].indexOf(u.role) >= 0; })
                .forEach(function (u) { V.notify(u.id, 'success', 'Presupuesto aprobado', q.number + ' — ' + cus.name, '#presupuestos/' + q.id); });
              UI.closeAll(); UI.toast('¡Presupuesto aprobado! Gracias.', 'ok'); route();
            });
          } });
      });
      bind('#mod', function () {
        UI.prompt({ title: 'Solicitar una modificación', label: '¿Qué te gustaría cambiar?', textarea: true, required: true,
          placeholder: 'Ej.: quisiera quitar el punto del garaje y agregar dos tomas en la sala.' }, function (v) {
          V.insert('comments', { entity: 'quote', entity_id: q.id, user_id: me.id, text: v, visible: true, at: new Date().toISOString() });
          V.logActivity('quote', q.id, 'El cliente solicitó una modificación: ' + v, 'update');
          V.all('users').filter(function (u) { return ['ventas', 'owner'].indexOf(u.role) >= 0; })
            .forEach(function (u) { V.notify(u.id, 'warning', 'Modificación solicitada', q.number + ': ' + v, '#presupuestos/' + q.id); });
          UI.toast('Enviamos tu solicitud. Te responderemos con una nueva versión.', 'ok');
        });
      });
      bind('#rej', function () {
        UI.prompt({ title: 'Rechazar el presupuesto', label: 'Motivo (nos ayuda a mejorar)', textarea: true, required: true }, function (v) {
          V.update('quotes', q.id, { status: 'REJECTED' });
          if (q.request_id) V.update('requests', q.request_id, { status: 'LOST', lostReason: v });
          V.logActivity('quote', q.id, 'El cliente rechazó el presupuesto: ' + v, 'status');
          UI.toast('Registramos tu respuesta. Gracias por avisarnos.', 'ok'); route();
        });
      });
      function bind(sel, fn) { var b = el.querySelector(sel); if (b) b.addEventListener('click', fn); }
      return;
    }

    var rows = my('quotes').sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var h = PH({ title: 'Presupuestos', sub: 'Revisa, aprueba o solicita cambios en tus cotizaciones' });
    var pend = rows.filter(function (q) { return ['SENT', 'VIEWED'].indexOf(q.status) >= 0; });
    if (pend.length) h += '<div class="banner banner-brand mb4">' + I('file', 16) + '<div><b>' + pend.length + ' presupuesto(s) esperan tu respuesta.</b></div></div>';
    if (!rows.length) {
      h += '<div class="card">' + UI.emptyState({ icon: 'file', title: 'Sin presupuestos', text: 'Cuando preparemos una cotización para ti aparecerá aquí.' }) + '</div>';
    } else {
      h += '<div class="grid g2">' + rows.map(function (q) {
        var t = V.quoteTotals(q);
        return '<div class="card" style="cursor:pointer" onclick="location.hash=\'presupuestos/' + q.id + '\'">' +
          '<div class="card-b"><div class="spread"><b>' + E(q.number) + '</b>' + UI.badge(V.QUOTE_STATES, q.status) + '</div>' +
          '<div style="font-size:24px;font-weight:700;color:var(--black);margin-top:8px">' + V.money(t.total) + '</div>' +
          '<p class="xs muted mt2">' + E(V.siteName(q.site_id)) + ' · ' + q.items.length + ' ítem(s)</p>' +
          '<p class="xs muted mt2">' + I('clock', 12) + ' Válido hasta ' + V.fdate(q.validUntil) +
          (V.daysTo(q.validUntil) >= 0 && ['SENT', 'VIEWED'].indexOf(q.status) >= 0 ? ' <span class="prio-alta">(' + V.frel(q.validUntil) + ')</span>' : '') + '</p>' +
          '<div class="btn btn-outline btn-sm btn-block mt4">Ver y responder</div>' +
          '</div></div>';
      }).join('') + '</div>';
    }
    el.innerHTML = h;
  }

  function printQuoteClient(q) {
    var t = V.quoteTotals(q);
    UI.printDoc('Presupuesto ' + q.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(tenant.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(tenant.address) + '<br>' + E(tenant.phone) + '<br>' + E(tenant.taxId) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">PRESUPUESTO</h2><p style="font-size:13px"><b>' + E(q.number) + '</b> · V' + q.version +
      '<br>' + V.fdate(q.created_at, true) + '<br>Válido hasta ' + V.fdate(q.validUntil, true) + '</p></div></div>' +
      '<div style="margin-top:18px;font-size:12.5px"><b>Cliente</b><br>' + E(cus.name) + '<br>' + E(V.siteName(q.site_id)) + '</div>' +
      (q.scope ? '<h3 style="margin-top:20px">Alcance</h3><p>' + E(q.scope) + '</p>' : '') +
      '<table><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th>Unidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      q.items.map(function (it) {
        return '<tr><td>' + E(it.desc) + '</td><td style="text-align:right">' + it.qty + '</td><td>' + E(it.unit) + '</td>' +
          '<td style="text-align:right">' + V.money(it.price) + '</td><td style="text-align:right">' + V.money(it.qty * it.price) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot"><table><tr><td>Subtotal</td><td style="text-align:right">' + V.money(t.sub) + '</td></tr>' +
      '<tr><td>' + E(tenant.taxName) + ' ' + q.taxRate + '%</td><td style="text-align:right">' + V.money(t.tax) + '</td></tr>' +
      '<tr style="font-weight:700;font-size:15px"><td style="border-top:2px solid #111">TOTAL</td><td style="text-align:right;border-top:2px solid #111">' + V.money(t.total) + '</td></tr></table></div>' +
      (q.terms ? '<h3 style="margin-top:18px">Términos</h3><p>' + E(q.terms) + '</p>' : '') +
      (q.warranty ? '<h3 style="margin-top:14px">Garantía</h3><p>' + E(q.warranty) + '</p>' : '') +
      '<p style="margin-top:28px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* ============================================================
     7.4 Trabajos y proyectos
     ============================================================ */
  function viewTrabajos(el, id) {
    if (id) {
      var w = V.byId('workOrders', id);
      if (!w || w.customer_id !== cus.id) { el.innerHTML = PH({ title: 'Trabajo' }) + UI.errorState('No encontramos ese trabajo en tu cuenta.'); return; }
      var chk = w.checklist || [], dn = chk.filter(function (c) { return c.done; }).length;
      var pub = V.all('comments').filter(function (c) { return c.entity === 'work_order' && c.entity_id === w.id && c.visible; });
      var docs = V.all('documents').filter(function (d) { return d.wo_id === w.id && d.visibility === 'cliente'; });

      /* timeline comprensible para el cliente */
      var pasos = [
        ['Programado', ['SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REVIEW', 'CLOSED']],
        ['Técnico en camino', ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REVIEW', 'CLOSED']],
        ['Trabajo en ejecución', ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REVIEW', 'CLOSED']],
        ['Trabajo finalizado', ['COMPLETED', 'REVIEW', 'CLOSED']],
        ['Cerrado y entregado', ['CLOSED']]
      ];

      el.innerHTML = PH({ title: w.title, sub: w.number + ' · ' + E(V.siteName(w.site_id)) + ' · ' + UI.badge(V.WO_STATES, w.status),
          actions: '<a class="btn btn-outline btn-sm" href="#trabajos">' + I('arrowL', 15) + ' Volver</a>' +
                   (['CLOSED', 'COMPLETED'].indexOf(w.status) >= 0 ? '<button class="btn btn-outline btn-sm" id="inc">' + I('alert', 15) + ' Reportar un problema</button>' : '') }) +
        '<div class="grid g-2-1"><div class="col">' +
        '<div class="card"><div class="card-h"><h3>Estado del trabajo</h3></div><div class="card-b">' +
        '<div class="tl">' + pasos.map(function (p, i) {
          var done = p[1].indexOf(w.status) >= 0;
          return '<div class="tl-item"><div class="tl-dot ' + (done ? 'g' : 'n') + '">' + I(done ? 'check' : 'clock', 13) + '</div>' +
            '<div class="tl-body"><div class="t ' + (done ? 'bold' : 'muted') + '">' + E(p[0]) + '</div>' +
            '<div class="m">' + (done ? (function () {
              var hh = (w.history || []).filter(function (x) { return p[1][0] === x.status; })[0];
              return hh ? V.fdatetime(hh.at) : 'Completado';
            })() : 'Pendiente') + '</div></div></div>';
        }).join('') + '</div></div></div>' +

        (chk.length ? '<div class="card"><div class="card-h"><h3>Avance de las tareas</h3><span class="small muted">' + dn + ' de ' + chk.length + '</span></div><div class="card-b">' +
          '<div class="bar ' + (dn === chk.length ? 'g' : '') + ' mb4"><i style="width:' + (dn / chk.length * 100) + '%"></i></div>' +
          chk.map(function (c) {
            return '<div class="row gap2 small" style="padding:6px 0;border-bottom:1px solid var(--border)">' +
              '<span style="color:' + (c.done ? 'var(--success)' : 'var(--muted)') + '">' + I(c.done ? 'checkCircle' : 'clock', 15) + '</span>' +
              '<span class="' + (c.done ? '' : 'muted') + '">' + E(c.text) + '</span></div>';
          }).join('') + '</div></div>' : '') +

        ((w.photos || []).length ? '<div class="card"><div class="card-h"><h3>Fotos del trabajo</h3></div><div class="card-b"><div class="gallery">' +
          w.photos.map(function (p) { return '<div class="ph"><span class="tag">' + E(p.tag === 'despues' ? 'después' : p.tag) + '</span>' + I('camera', 17) + '</div>'; }).join('') +
          '</div></div></div>' : '') +

        (w.result || w.recommendations ? '<div class="card"><div class="card-h"><h3>Informe del técnico</h3></div><div class="card-b col">' +
          (w.result ? '<div><b class="small">Resultado</b><p class="mt2">' + E(w.result) + '</p></div>' : '') +
          (w.recommendations ? '<div class="banner banner-warn">' + I('info', 15) + '<div><b>Recomendaciones:</b> ' + E(w.recommendations) + '</div></div>' : '') +
          '</div></div>' : '') +

        (pub.length ? '<div class="card"><div class="card-h"><h3>Mensajes</h3></div><div class="card-b col">' +
          pub.map(function (c) {
            return '<div class="file-row" style="align-items:flex-start"><span class="av sm">' + E(V.initials(V.userName(c.user_id))) + '</span>' +
              '<span><b class="xs">' + E(V.userName(c.user_id)) + '</b> <span class="xs muted">' + V.frel(c.at) + '</span>' +
              '<p class="small mt2">' + E(c.text) + '</p></span></div>';
          }).join('') + '</div></div>' : '') +
        '</div>' +

        '<div class="col"><div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Número', '<b>' + E(w.number) + '</b>') + kv('Tipo de trabajo', E(V.WO_TYPES[w.type])) +
        kv('Ubicación', E(V.siteName(w.site_id))) +
        kv('Fecha', V.fdate(w.start)) + kv('Horario', V.hm(w.start) + ' – ' + V.hm(w.end)) +
        ((w.technicians || []).length ? kv('Técnico', E(V.techName(w.technicians[0]))) : '') +
        (w.signature ? kv('Conformidad', '<span class="badge b-green">Firmada por ' + E(w.signature.name) + '</span>') : '') +
        '</div></div>' +
        (docs.length ? '<div class="card"><div class="card-h"><h3>Documentos</h3></div><div class="card-b col" style="gap:6px">' +
          docs.map(function (d) {
            return '<div class="file-row"><span class="file-ico">' + I('file', 15) + '</span>' +
              '<b class="small truncate">' + E(d.name) + '</b>' +
              '<span style="margin-left:auto" class="muted">' + I('download', 14) + '</span></div>';
          }).join('') + '</div></div>' : '') +
        '</div></div>';

      var ib = el.querySelector('#inc');
      if (ib) ib.addEventListener('click', function () { newTicket(w); });
      return;
    }

    var wos = my('workOrders').sort(function (a, b) { return new Date(b.start) - new Date(a.start); });
    var prjs = my('projects');
    var h = PH({ title: 'Trabajos y proyectos', sub: wos.length + ' trabajo(s) · ' + prjs.length + ' proyecto(s)' });

    if (prjs.length) {
      h += '<h3 class="mb4">Proyectos</h3><div class="grid g2 mb6">' + prjs.map(function (p) {
        return '<div class="card"><div class="card-b">' +
          '<div class="spread"><b>' + E(p.name) + '</b>' + UI.badge(V.PROJECT_STATES, p.status) + '</div>' +
          '<p class="xs muted mt2">' + E(p.code) + ' · ' + E(V.siteName(p.site_id)) + '</p>' +
          '<div class="spread small mt4"><span class="muted">Avance</span><b>' + p.progress + '%</b></div>' +
          '<div class="bar mt2"><i style="width:' + p.progress + '%"></i></div>' +
          '<p class="xs muted mt4">' + I('calendar', 12) + ' ' + V.fdate(p.start) + ' → ' + V.fdate(p.end) + '</p>' +
          '<p class="xs muted mt2">' + V.all('workOrders').filter(function (w) { return w.project_id === p.id; }).length + ' visita(s) asociadas</p>' +
          '</div></div>';
      }).join('') + '</div>';
    }

    h += '<h3 class="mb4">Trabajos</h3>';
    if (!wos.length) {
      h += '<div class="card">' + UI.emptyState({ icon: 'clipboard', title: 'Sin trabajos', text: 'Aquí verás el estado y el avance de cada visita.' }) + '</div>';
    } else {
      h += '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Trabajo</th><th>Ubicación</th><th>Fecha</th><th>Avance</th><th class="right">Estado</th></tr></thead><tbody>' +
        wos.map(function (w) {
          var chk = w.checklist || [], dn = chk.filter(function (c) { return c.done; }).length;
          return '<tr class="clickable" onclick="location.hash=\'trabajos/' + w.id + '\'">' +
            '<td><b>' + E(w.title) + '</b><div class="xs muted">' + E(w.number) + ' · ' + E(V.WO_TYPES[w.type]) + '</div></td>' +
            '<td class="small">' + E(V.siteName(w.site_id)) + '</td>' +
            '<td class="small">' + V.fdate(w.start) + '<div class="xs muted mono">' + V.hm(w.start) + '</div></td>' +
            '<td>' + (chk.length ? '<div style="min-width:90px"><span class="xs muted">' + dn + '/' + chk.length + '</span>' +
              '<div class="bar mt2 ' + (dn === chk.length ? 'g' : '') + '"><i style="width:' + (dn / chk.length * 100) + '%"></i></div></div>' : '<span class="muted">—</span>') + '</td>' +
            '<td class="right">' + UI.badge(V.WO_STATES, w.status) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    el.innerHTML = h;
  }

  /* ============================================================
     Calendario de visitas
     ============================================================ */
  function viewCalendario(el) {
    var cur = V.today();
    function render() {
      var wos = my('workOrders');
      var h = PH({ title: 'Calendario de visitas', sub: 'Tus trabajos programados y realizados',
        actions: '<div class="row gap2"><button class="btn btn-outline btn-sm btn-icon" id="prev">' + I('chevL', 15) + '</button>' +
          '<button class="btn btn-outline btn-sm" id="today">Hoy</button>' +
          '<button class="btn btn-outline btn-sm btn-icon" id="next">' + I('chevR', 15) + '</button></div>' });
      h += '<div class="card"><div class="card-h"><h3>' +
        V.MONTHS_L[cur.getMonth()].charAt(0).toUpperCase() + V.MONTHS_L[cur.getMonth()].slice(1) + ' ' + cur.getFullYear() + '</h3>' +
        '<span class="small muted">' + wos.filter(function (w) { return new Date(w.start).getMonth() === cur.getMonth(); }).length + ' visita(s)</span></div>' +
        '<div class="card-b">' + UI.monthGrid(cur.getFullYear(), cur.getMonth(), function (d) {
          return wos.filter(function (w) { return V.ymd(w.start) === V.ymd(d); }).map(function (w) {
            var cls = ['CLOSED', 'COMPLETED'].indexOf(w.status) >= 0 ? 'ev-g' : ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].indexOf(w.status) >= 0 ? 'ev-o' : 'ev-b';
            return { id: w.id, cls: cls, label: V.hm(w.start) + ' ' + w.title, title: w.title };
          });
        }) + '</div></div>';

      var prox = wos.filter(function (w) { return new Date(w.start) >= new Date(); }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
      h += '<div class="card mt4"><div class="card-h"><h3>Próximas visitas</h3></div><div class="card-b col" style="gap:8px">' +
        (prox.length ? prox.map(function (w) {
          return '<a href="#trabajos/' + w.id + '" class="file-row" style="text-decoration:none">' +
            '<span class="file-ico">' + I('calendar', 15) + '</span>' +
            '<span style="min-width:0"><b class="small" style="display:block;color:var(--text)">' + E(w.title) + '</b>' +
            '<span class="xs muted">' + V.fdate(w.start, true) + ' · ' + V.hm(w.start) + '–' + V.hm(w.end) + ' · ' + E(V.siteName(w.site_id)) + '</span></span>' +
            '<span style="margin-left:auto">' + UI.badge(V.WO_STATES, w.status) + '</span></a>';
        }).join('') : '<p class="small muted">Sin visitas programadas.</p>') + '</div></div>';

      el.innerHTML = h;
      el.querySelectorAll('[data-ev]').forEach(function (e) {
        e.addEventListener('click', function () { location.hash = 'trabajos/' + this.dataset.ev; });
      });
      el.querySelector('#prev').addEventListener('click', function () { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); render(); });
      el.querySelector('#next').addEventListener('click', function () { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); render(); });
      el.querySelector('#today').addEventListener('click', function () { cur = V.today(); render(); });
    }
    render();
  }

  /* ============================================================
     7.6 Documentos y garantías
     ============================================================ */
  function viewDocumentos(el) {
    var docs = myDocs();
    var filt = { cat: '', site: '' };
    function render() {
      var rows = docs.filter(function (d) {
        return (!filt.cat || d.category === filt.cat) && (!filt.site || d.site_id === filt.site);
      });
      var h = PH({ title: 'Documentos y garantías', sub: 'Informes, certificados, garantías, planos y manuales autorizados' });
      var venc = docs.filter(function (d) { return d.expires && V.daysTo(d.expires) <= 60 && V.daysTo(d.expires) >= 0; });
      if (venc.length) {
        h += '<div class="banner banner-warn mb4">' + I('clock', 16) + '<div><b>Garantías o documentos por vencer:</b> ' +
          venc.map(function (d) { return E(d.name) + ' (' + V.frel(d.expires) + ')'; }).join(' · ') + '</div></div>';
      }
      h += '<div class="card"><div class="tbl-toolbar">' +
        '<select class="select" id="fc" style="width:auto"><option value="">Todas las categorías</option>' +
        docs.map(function (d) { return d.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; })
          .map(function (c) { return '<option' + (filt.cat === c ? ' selected' : '') + '>' + E(c) + '</option>'; }).join('') + '</select>' +
        '<select class="select" id="fs" style="width:auto"><option value="">Todas las ubicaciones</option>' +
        mySites().map(function (s2) { return '<option value="' + s2.id + '"' + (filt.site === s2.id ? ' selected' : '') + '>' + E(s2.name) + '</option>'; }).join('') + '</select>' +
        '<span class="small muted" style="margin-left:auto">' + rows.length + ' documento(s)</span></div>';
      h += rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Documento</th><th>Categoría</th><th>Ubicación</th><th>Fecha</th><th>Vence</th><th></th></tr></thead><tbody>' +
        rows.map(function (d) {
          return '<tr><td><div class="row gap2"><span class="file-ico">' + I('file', 15) + '</span>' +
            '<div><b>' + E(d.name) + '</b><div class="xs muted">v' + d.version + ' · ' + E(d.size) + '</div></div></div></td>' +
            '<td><span class="chip">' + E(d.category) + '</span></td>' +
            '<td class="small">' + E(V.siteName(d.site_id)) + '</td>' +
            '<td class="small">' + V.fdate(d.date) + '</td>' +
            '<td class="small">' + (d.expires ? V.fdate(d.expires) : '—') + '</td>' +
            '<td class="right"><button class="btn btn-outline btn-sm" data-dl="' + d.id + '">' + I('download', 14) + ' Descargar</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : UI.emptyState({ icon: 'folder', title: 'Sin documentos', text: 'Aquí aparecerán los informes y certificados que compartamos contigo.' });
      h += '</div>';
      el.innerHTML = h;
      el.querySelector('#fc').addEventListener('change', function () { filt.cat = this.value; render(); });
      el.querySelector('#fs').addEventListener('change', function () { filt.site = this.value; render(); });
      el.querySelectorAll('[data-dl]').forEach(function (b) {
        b.addEventListener('click', function () { UI.toast('Demo: la descarga real requiere el almacenamiento del backend.'); });
      });
    }
    render();
  }

  /* ============================================================
     7.5 Facturas y pagos
     ============================================================ */
  function viewFacturas(el) {
    var invs = my('invoices').filter(function (i) { return i.status !== 'DRAFT'; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var pend = invs.filter(function (i) { return V.invoiceTotals(i).balance > 0.01 && i.status !== 'VOID'; });
    var totalPend = pend.reduce(function (a, i) { return a + V.invoiceTotals(i).balance; }, 0);

    var h = PH({ title: 'Facturas y pagos', sub: 'Consulta tus documentos, paga en línea o carga tu comprobante' });
    h += '<div class="grid g3">' +
      UI.kpi({ label: 'Saldo pendiente', value: V.money(totalPend), icon: 'dollar', sub: pend.length + ' factura(s)', trend: totalPend ? 'down' : '' }) +
      UI.kpi({ label: 'Total facturado', value: V.money(invs.reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0)), icon: 'receipt' }) +
      UI.kpi({ label: 'Pagado', value: V.money(invs.reduce(function (a, i) { return a + V.invoiceTotals(i).paid; }, 0)), icon: 'checkCircle', trend: 'up' }) +
      '</div>';

    var venc = pend.filter(function (i) { return V.daysTo(i.due) < 0; });
    if (venc.length) {
      h += '<div class="banner banner-danger mt4">' + I('alert', 16) + '<div><b>Tienes ' + venc.length + ' factura(s) vencida(s)</b> por ' +
        V.money(venc.reduce(function (a, i) { return a + V.invoiceTotals(i).balance; }, 0)) + '. Si ya pagaste, carga el comprobante.</div></div>';
    }

    h += '<div class="card mt4">';
    if (!invs.length) {
      h += UI.emptyState({ icon: 'receipt', title: 'Sin facturas', text: 'Aquí verás tus documentos de cobro y el historial de pagos.' });
    } else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Factura</th><th>Emisión</th><th>Vencimiento</th><th class="right">Total</th><th class="right">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>' +
        invs.map(function (i) {
          var t = V.invoiceTotals(i);
          var st = t.balance <= 0.01 ? 'PAID' : (V.daysTo(i.due) < 0 ? 'OVERDUE' : (t.paid > 0 ? 'PARTIAL' : 'ISSUED'));
          if (i.status === 'VOID') st = 'VOID';
          return '<tr><td><b>' + E(i.number) + '</b><div class="xs muted">' + i.items.length + ' concepto(s)</div></td>' +
            '<td class="small">' + V.fdate(i.date) + '</td>' +
            '<td class="small ' + (st === 'OVERDUE' ? 'prio-critica' : '') + '">' + V.fdate(i.due) + '</td>' +
            '<td class="right mono bold">' + V.money(t.total) + '</td>' +
            '<td class="right mono">' + (t.balance > 0.01 ? '<b style="color:var(--danger)">' + V.money(t.balance) + '</b>' : '<span class="muted">—</span>') + '</td>' +
            '<td>' + UI.badge(V.INV_STATES, st) + '</td>' +
            '<td class="right"><div class="row gap1" style="justify-content:flex-end">' +
            '<button class="btn btn-ghost btn-sm btn-icon" data-pdf="' + i.id + '" title="Descargar">' + I('download', 14) + '</button>' +
            (t.balance > 0.01 && i.status !== 'VOID' ? '<button class="btn btn-primary btn-sm" data-pay="' + i.id + '">Pagar</button>' : '') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '</div>';

    /* historial de pagos */
    var pays = V.all('payments').filter(function (p) {
      var i = V.byId('invoices', p.invoice_id); return i && i.customer_id === cus.id;
    });
    h += '<div class="card mt4"><div class="card-h"><h3>Historial de pagos</h3></div>' +
      (pays.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Factura</th><th>Método</th><th>Referencia</th><th class="right">Monto</th></tr></thead><tbody>' +
        pays.map(function (p) {
          return '<tr><td class="small">' + V.fdate(p.date) + '</td>' +
            '<td><b>' + E((V.byId('invoices', p.invoice_id) || {}).number || '') + '</b></td>' +
            '<td><span class="chip">' + E(p.method) + '</span></td><td class="small mono">' + E(p.ref) + '</td>' +
            '<td class="right mono bold" style="color:var(--success)">' + V.money(p.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="card-b"><p class="small muted">Sin pagos registrados.</p></div>') + '</div>';

    el.innerHTML = h;
    el.querySelectorAll('[data-pdf]').forEach(function (b) {
      b.addEventListener('click', function () { printInvoiceClient(V.byId('invoices', this.dataset.pdf)); });
    });
    el.querySelectorAll('[data-pay]').forEach(function (b) {
      b.addEventListener('click', function () { payInvoice(V.byId('invoices', this.dataset.pay)); });
    });
  }

  function payInvoice(inv) {
    var t = V.invoiceTotals(inv);
    UI.modal({
      title: 'Pagar la factura ' + inv.number, subtitle: 'Saldo pendiente: ' + V.money(t.balance),
      body: '<div class="role-pick">' +
        '<button type="button" data-k="on"><span class="kpi-ico">' + I('dollar', 16) + '</span>' +
          '<span><b class="small" style="display:block">Pagar en línea</b><span class="xs muted">Tarjeta o pasarela de pago</span></span></button>' +
        '<button type="button" data-k="cp"><span class="kpi-ico">' + I('upload', 16) + '</span>' +
          '<span><b class="small" style="display:block">Cargar comprobante</b><span class="xs muted">Ya hice la transferencia o el pago móvil</span></span></button>' +
        '</div>' +
        '<div class="banner banner-info mt4">' + I('info', 15) + '<div>' + E(tenant.paymentTerms) + '</div></div>',
      footer: null,
      onMount: function (m) {
        m.querySelectorAll('[data-k]').forEach(function (b) {
          b.addEventListener('click', function () {
            var k = this.dataset.k; UI.closeTop();
            if (k === 'on') {
              UI.modal({ title: 'Pago en línea', subtitle: V.money(t.balance),
                body: '<div class="banner banner-warn">' + I('lock', 16) +
                  '<div><b>Demo:</b> la pasarela de pago real no está conectada en esta demostración, por lo que no se solicitan datos de tarjeta. ' +
                  'En producción el cobro se procesa en el entorno seguro de la pasarela y VOLTX solo recibe la confirmación.</div></div>' +
                  '<div class="col mt4">' + kv('Factura', E(inv.number)) + kv('Monto a pagar', V.money(t.balance)) +
                  kv('Beneficiario', E(tenant.legalName)) + '</div>',
                footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sim">Simular pago aprobado</button>',
                onMount: function (m2) { m2.querySelector('#sim').addEventListener('click', function () {
                  V.insert('payments', { invoice_id: inv.id, amount: t.balance, date: V.ymd(V.today()),
                    method: 'Pasarela en línea', ref: 'TXN-' + Date.now().toString().slice(-8), notes: 'Pago desde el portal del cliente' });
                  V.update('invoices', inv.id, { status: 'PAID' });
                  V.logActivity('invoice', inv.id, 'El cliente pagó ' + V.money(t.balance) + ' desde el portal', 'payment');
                  V.all('users').filter(function (u) { return ['finanzas', 'owner'].indexOf(u.role) >= 0; })
                    .forEach(function (u) { V.notify(u.id, 'success', 'Pago recibido', inv.number + ' — ' + V.money(t.balance), '#facturacion/' + inv.id); });
                  UI.closeAll(); UI.toast('¡Pago registrado! Gracias.', 'ok'); route();
                }); } });
            }
            if (k === 'cp') {
              UI.modal({ title: 'Cargar comprobante de pago',
                body: '<div class="grid g2"><div class="field"><label for="am">Monto pagado</label><input class="input" id="am" type="number" step="0.01" value="' + t.balance.toFixed(2) + '"></div>' +
                  '<div class="field"><label for="dt">Fecha del pago</label><input class="input" id="dt" type="date" value="' + V.ymd(V.today()) + '"></div></div>' +
                  '<div class="grid g2 mt4"><div class="field"><label for="mt">Método</label><select class="select" id="mt">' +
                  ['Transferencia', 'Pago móvil', 'Efectivo', 'Zelle', 'Cheque'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
                  '<div class="field"><label for="rf">Referencia</label><input class="input" id="rf" placeholder="N.º de operación"></div></div>' +
                  '<div class="field mt4"><label>Comprobante</label><div class="dropzone" id="dz">' + I('upload', 20) + '<div class="small mt2">Adjunta la captura o el PDF</div></div></div>' +
                  '<div class="banner banner-info mt4">' + I('info', 15) + '<div>El pago quedará en verificación hasta que finanzas lo conciliar.</div></div>',
                footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Enviar comprobante</button>',
                onMount: function (m2) {
                  UI.uploader(m2.querySelector('#dz'));
                  m2.querySelector('#ok').addEventListener('click', function () {
                    var am = +m2.querySelector('#am').value || 0;
                    if (am <= 0) { UI.toast('Indica el monto pagado.', 'err'); return; }
                    V.insert('payments', { invoice_id: inv.id, amount: Math.min(am, t.balance), date: m2.querySelector('#dt').value,
                      method: m2.querySelector('#mt').value, ref: m2.querySelector('#rf').value.trim() || 'Reportado por el cliente',
                      notes: 'Comprobante cargado desde el portal · pendiente de conciliación' });
                    var nt = V.invoiceTotals(inv);
                    V.update('invoices', inv.id, { status: nt.balance <= 0.01 ? 'PAID' : 'PARTIAL' });
                    V.logActivity('invoice', inv.id, 'El cliente cargó un comprobante por ' + V.money(am), 'payment');
                    V.all('users').filter(function (u) { return ['finanzas', 'owner'].indexOf(u.role) >= 0; })
                      .forEach(function (u) { V.notify(u.id, 'info', 'Comprobante por verificar', inv.number + ' — ' + V.money(am), '#facturacion/' + inv.id); });
                    UI.closeAll(); UI.toast('Comprobante enviado. Lo verificaremos en breve.', 'ok'); route();
                  });
                } });
            }
          });
        });
      }
    });
  }

  function printInvoiceClient(inv) {
    var t = V.invoiceTotals(inv);
    UI.printDoc('Factura ' + inv.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(tenant.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(tenant.legalName) + '<br>' + E(tenant.taxId) + '<br>' + E(tenant.address) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">FACTURA</h2><p style="font-size:13px"><b>' + E(inv.number) + '</b><br>' +
      'Emisión: ' + V.fdate(inv.date, true) + '<br>Vencimiento: ' + V.fdate(inv.due, true) + '</p></div></div>' +
      '<div style="margin-top:18px;font-size:12.5px"><b>Cliente</b><br>' + E(cus.name) + '<br>' + E(cus.taxId || '') + '<br>' + E(cus.address || '') + '</div>' +
      '<table><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      inv.items.map(function (it) {
        return '<tr><td>' + E(it.desc) + '</td><td style="text-align:right">' + it.qty + '</td>' +
          '<td style="text-align:right">' + V.money(it.price) + '</td><td style="text-align:right">' + V.money(it.qty * it.price) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot"><table><tr><td>Subtotal</td><td style="text-align:right">' + V.money(t.sub) + '</td></tr>' +
      '<tr><td>' + E(tenant.taxName) + ' ' + inv.taxRate + '%</td><td style="text-align:right">' + V.money(t.tax) + '</td></tr>' +
      '<tr style="font-weight:700;font-size:15px"><td style="border-top:2px solid #111">TOTAL</td><td style="text-align:right;border-top:2px solid #111">' + V.money(t.total) + '</td></tr>' +
      '<tr><td>Pagado</td><td style="text-align:right">' + V.money(t.paid) + '</td></tr>' +
      '<tr style="font-weight:700"><td>SALDO</td><td style="text-align:right">' + V.money(t.balance) + '</td></tr></table></div>' +
      '<p style="margin-top:16px;font-size:11.5px;color:#6B7280">' + E(tenant.paymentTerms) + '</p>' +
      '<p style="margin-top:28px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* ============================================================
     Mantenimientos
     ============================================================ */
  function viewMantenimientos(el) {
    var plans = my('maintenancePlans');
    var assets = my('assets');
    var h = PH({ title: 'Mantenimientos', sub: 'Tus planes preventivos y el historial de intervenciones por equipo' });

    var prox = plans.filter(function (p) { return V.daysTo(p.nextDate) <= 30; });
    if (prox.length) {
      h += '<div class="banner banner-brand mb4">' + I('wrench', 16) + '<div><b>Mantenimiento próximo:</b> ' +
        prox.map(function (p) { return E(p.name) + ' (' + V.frel(p.nextDate) + ')'; }).join(' · ') + '. Te contactaremos para coordinar la visita.</div></div>';
    }

    h += '<div class="card"><div class="card-h"><h3>Planes activos</h3></div>';
    if (!plans.length) {
      h += UI.emptyState({ icon: 'wrench', title: 'Sin planes de mantenimiento',
        text: 'Un plan preventivo evita fallas y alarga la vida de tu instalación. Podemos prepararte una propuesta.',
        action: '<a class="btn btn-primary btn-sm" href="#solicitar">Solicitar una propuesta</a>' });
    } else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Plan</th><th>Equipo</th><th>Periodicidad</th><th>Último</th><th class="right">Próximo</th></tr></thead><tbody>' +
        plans.map(function (p) {
          return '<tr><td><b>' + E(p.name) + '</b><div class="xs muted">' + E(V.siteName(p.site_id)) + '</div></td>' +
            '<td class="small">' + E((V.byId('assets', p.asset_id) || {}).name || '—') + '</td>' +
            '<td><span class="chip">' + E(p.frequency) + '</span></td>' +
            '<td class="small">' + V.fdate(p.lastDate) + '</td>' +
            '<td class="right small bold">' + V.fdate(p.nextDate) + '<div class="xs muted">' + V.frel(p.nextDate) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '</div>';

    h += '<div class="card mt4"><div class="card-h"><h3>Tus equipos e instalaciones</h3></div>';
    if (!assets.length) {
      h += '<div class="card-b"><p class="small muted">Todavía no registramos equipos en tus ubicaciones.</p></div>';
    } else {
      h += '<div class="grid g2" style="padding:16px">' + assets.map(function (a) {
        var g = V.daysTo(a.warrantyUntil);
        return '<div class="card"><div class="card-b tight">' +
          '<div class="spread"><div class="row gap2"><span class="kpi-ico">' + I('bolt', 16) + '</span>' +
          '<div><b class="small" style="display:block">' + E(a.name) + '</b>' +
          '<span class="xs muted">' + E(a.brand + ' ' + a.model) + '</span></div></div>' +
          (g >= 0 ? '<span class="badge b-green">En garantía</span>' : '<span class="badge b-gray">Garantía vencida</span>') + '</div>' +
          '<div class="col mt4" style="gap:6px">' +
          kv('Ubicación', E(V.siteName(a.site_id))) + kv('Capacidad', E(a.capacity)) +
          kv('Instalado', V.fdate(a.installedAt)) + kv('Último servicio', V.fdate(a.lastService)) +
          kv('Próximo servicio', V.fdate(a.nextService)) +
          '</div></div></div>';
      }).join('') + '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
  }

  /* ============================================================
     7.7 Soporte
     ============================================================ */
  function viewSoporte(el) {
    var tks = my('tickets').sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var h = PH({ title: 'Soporte', sub: 'Reporta un problema con un trabajo previo y sigue su atención',
      actions: '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Reportar un problema</button>' });

    h += '<div class="card">';
    if (!tks.length) {
      h += UI.emptyState({ icon: 'checkCircle', title: 'Sin incidencias abiertas',
        text: 'Si algo no quedó bien o volvió a fallar, repórtalo y lo revisamos. Si está dentro de la garantía, no tiene costo.',
        action: '<button class="btn btn-primary btn-sm" id="new2">Reportar un problema</button>' });
    } else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Número</th><th>Asunto</th><th>Clasificación</th><th>Reportada</th><th class="right">Estado</th></tr></thead><tbody>' +
        tks.map(function (t) {
          return '<tr class="clickable" data-t="' + t.id + '"><td><b>' + E(t.number) + '</b></td>' +
            '<td><b>' + E(t.subject) + '</b><div class="xs muted truncate" style="max-width:300px">' + E(t.description) + '</div></td>' +
            '<td>' + (t.type === 'garantia' ? '<span class="badge b-green">Garantía</span>' : '<span class="chip">' + E(t.type) + '</span>') + '</td>' +
            '<td class="small">' + V.fdate(t.created_at) + '</td>' +
            '<td class="right">' + UI.badge(V.TICKET_STATES, t.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '</div>';

    h += '<div class="grid g2 mt4">' +
      '<div class="card"><div class="card-h"><h3>Contacto directo</h3></div><div class="card-b col" style="gap:10px">' +
      kv('Teléfono', '<a href="tel:' + E(tenant.phone.replace(/\s/g, '')) + '">' + E(tenant.phone) + '</a>') +
      kv('Correo', '<a href="mailto:' + E(tenant.email) + '">' + E(tenant.email) + '</a>') +
      kv('Horario de atención', 'Lunes a viernes, 8:00 – 17:00') +
      kv('Emergencias', 'Disponible 24/7 con recargo') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Preguntas frecuentes</h3></div><div class="card-b col" style="gap:8px">' +
      [['¿Cuánto dura la garantía?', 'La garantía estándar es de 90 días sobre mano de obra y materiales instalados; algunos servicios tienen coberturas mayores indicadas en el presupuesto.'],
       ['¿Cómo apruebo un presupuesto?', 'Entra en «Presupuestos», ábrelo, revisa el alcance y usa el botón «Aprobar presupuesto». Se te pedirá firma y aceptación de términos.'],
       ['¿Puedo reprogramar una visita?', 'Sí. Repórtalo desde Soporte o llámanos y coordinamos una nueva fecha.'],
       ['¿Dónde veo los informes de mis trabajos?', 'En «Documentos» encontrarás los informes, certificados y garantías que compartimos contigo.']]
      .map(function (f, i) {
        return '<details style="border:1px solid var(--border);border-radius:8px;padding:10px 12px">' +
          '<summary style="cursor:pointer;font-weight:600;font-size:13.5px">' + E(f[0]) + '</summary>' +
          '<p class="small muted mt2">' + E(f[1]) + '</p></details>';
      }).join('') + '</div></div></div>';

    el.innerHTML = h;
    ['#new', '#new2'].forEach(function (sel) {
      var b = el.querySelector(sel); if (b) b.addEventListener('click', function () { newTicket(); });
    });
    el.querySelectorAll('[data-t]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var t = V.byId('tickets', this.dataset.t);
        UI.modal({ title: t.subject, subtitle: t.number + ' · ' + V.fdate(t.created_at),
          body: '<div class="col">' +
            '<div class="row gap2">' + UI.badge(V.TICKET_STATES, t.status) + UI.badge(V.PRIORITIES, t.priority) +
            (t.type === 'garantia' ? '<span class="badge b-green">Cubierto por garantía</span>' : '') + '</div>' +
            '<div><b class="small">Lo que reportaste</b><p class="small mt2">' + E(t.description) + '</p></div>' +
            (t.resolution ? '<div class="banner banner-success">' + I('checkCircle', 15) + '<div><b>Resolución:</b> ' + E(t.resolution) + '</div></div>' : '') +
            (t.wo_id ? kv('Trabajo relacionado', '<a href="#trabajos/' + t.wo_id + '">' + E((V.byId('workOrders', t.wo_id) || {}).number || '') + '</a>') : '') +
            kv('Compromiso de atención', V.fdate(t.sla)) +
            '</div>' });
      });
    });
  }

  function newTicket(wo) {
    var wos = my('workOrders').filter(function (w) { return ['CLOSED', 'COMPLETED', 'REVIEW'].indexOf(w.status) >= 0; });
    UI.modal({
      title: 'Reportar un problema', size: 'wide',
      body: '<div class="field"><label for="wo">¿Con qué trabajo se relaciona?</label><select class="select" id="wo">' +
          '<option value="">— No está relacionado con un trabajo previo —</option>' +
          wos.map(function (w) { return '<option value="' + w.id + '"' + (wo && wo.id === w.id ? ' selected' : '') + '>' + E(w.number + ' — ' + w.title) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field mt4"><label for="sb">Asunto <span class="req">*</span></label><input class="input" id="sb" placeholder="Ej.: volvió a saltar el breaker"></div>' +
        '<div class="field mt4"><label for="de">Cuéntanos qué ocurre <span class="req">*</span></label><textarea class="textarea" id="de" style="min-height:110px"></textarea></div>' +
        '<div class="field mt4"><label>¿Qué tan urgente es?</label><div class="grid g4" id="pr">' +
          [['baja', 'Puede esperar'], ['normal', 'Normal'], ['alta', 'Urgente'], ['critica', 'Emergencia']].map(function (u, i) {
            return '<button type="button" class="btn btn-outline" data-p="' + u[0] + '"' + (i === 1 ? ' style="border-color:var(--primary-600);color:var(--primary-600)"' : '') + '>' + u[1] + '</button>';
          }).join('') + '</div></div>' +
        '<div class="field mt4"><label>Fotos del problema</label><div class="dropzone" id="dz">' + I('camera', 20) + '<div class="small mt2">Adjuntar evidencias</div></div></div>' +
        '<div id="gw" class="mt4"></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Enviar reporte</button>',
      onMount: function (m) {
        var prio = 'normal';
        UI.uploader(m.querySelector('#dz'));
        m.querySelectorAll('[data-p]').forEach(function (b) {
          b.addEventListener('click', function () {
            prio = this.dataset.p;
            m.querySelectorAll('[data-p]').forEach(function (x) { x.removeAttribute('style'); });
            this.style.borderColor = 'var(--primary-600)'; this.style.color = 'var(--primary-600)';
          });
        });
        function checkWarranty() {
          var w = V.byId('workOrders', m.querySelector('#wo').value);
          if (!w) { m.querySelector('#gw').innerHTML = ''; return; }
          var s = V.byId('services', w.service_id), dias = s ? s.warranty : 90, trans = -V.daysTo(w.end);
          var ok = trans <= dias;
          m.querySelector('#gw').innerHTML = '<div class="banner banner-' + (ok ? 'success' : 'warn') + '">' + I('shield', 15) +
            '<div><b>' + (ok ? 'Este trabajo está dentro de la garantía.' : 'La garantía de este trabajo ya venció.') + '</b> ' +
            (ok ? 'Si el problema corresponde al trabajo realizado, la atención no tiene costo (sujeto a verificación técnica).'
                : 'Podemos atenderlo como un servicio nuevo; te enviaremos un presupuesto antes de ejecutar.') + '</div></div>';
        }
        m.querySelector('#wo').addEventListener('change', checkWarranty); checkWarranty();
        m.querySelector('#ok').addEventListener('click', function () {
          var sb = m.querySelector('#sb').value.trim(), de = m.querySelector('#de').value.trim();
          if (!sb || !de) { UI.toast('Asunto y descripción son obligatorios.', 'err'); return; }
          var wid = m.querySelector('#wo').value || null;
          var w = wid ? V.byId('workOrders', wid) : null;
          var s = w ? V.byId('services', w.service_id) : null;
          var enGar = w && (-V.daysTo(w.end)) <= (s ? s.warranty : 90);
          var t = V.insert('tickets', { number: V.nextNumber('ticket'), customer_id: cus.id,
            site_id: w ? w.site_id : null, wo_id: wid, subject: sb,
            type: enGar ? 'garantia' : (wid ? 'falla' : 'consulta'), priority: prio, status: 'OPEN',
            sla: V.ymd(V.addDays(V.today(), prio === 'critica' ? 0 : prio === 'alta' ? 1 : 3)),
            assignee: (w && (w.technicians || [])[0]) || V.all('technicians')[0].id,
            description: de, rootCause: '', resolution: '', reworkCost: 0 });
          V.logActivity('ticket', t.id, 'El cliente reportó una incidencia desde el portal: ' + sb, 'create');
          V.all('users').filter(function (u) { return ['coordinador', 'owner'].indexOf(u.role) >= 0; })
            .forEach(function (u) { V.notify(u.id, prio === 'critica' ? 'danger' : 'warning', 'Nueva incidencia del cliente',
              t.number + ' — ' + cus.name + ': ' + sb, '#incidencias/' + t.id); });
          UI.closeAll();
          UI.modal({ title: 'Reporte enviado',
            body: '<div class="center col" style="align-items:center;gap:10px">' +
              '<span class="kpi-ico" style="width:52px;height:52px;background:var(--success-bg);color:var(--success)">' + I('checkCircle', 26) + '</span>' +
              '<h3>' + E(t.number) + '</h3><p class="small muted">Nos comprometemos a atenderte antes del ' + V.fdate(t.sla, true) + '.' +
              (enGar ? ' El caso se registró como <b>garantía</b>, sujeto a verificación técnica.' : '') + '</p></div>',
            footer: '<button class="btn btn-primary btn-block" data-close>Entendido</button>' });
          route();
        });
      }
    });
  }

  /* ============================================================
     Perfil y propiedades
     ============================================================ */
  function viewPerfil(el) {
    var sites = mySites();
    var h = PH({ title: 'Perfil y propiedades', sub: 'Tus datos de contacto y las ubicaciones donde prestamos servicio' });
    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Mis ubicaciones</h3>' +
      '<button class="btn btn-outline btn-sm" id="add">' + I('plus', 14) + ' Agregar</button></div><div class="card-b col">' +
      (sites.length ? sites.map(function (s2) {
        var wos = V.all('workOrders').filter(function (w) { return w.site_id === s2.id; });
        var ass = V.all('assets').filter(function (a) { return a.site_id === s2.id; });
        return '<div class="card"><div class="card-b tight">' +
          '<div class="spread"><div><b>' + E(s2.name) + '</b><div class="xs muted">' + E(s2.address) + '</div></div>' +
          '<span class="chip">' + E(s2.propertyType || 'Sin clasificar') + '</span></div>' +
          (s2.access ? '<p class="xs muted mt2">' + I('key', 12) + ' ' + E(s2.access) + '</p>' : '') +
          '<div class="row gap4 mt2 xs muted"><span>' + wos.length + ' intervención(es)</span><span>' + ass.length + ' equipo(s)</span></div>' +
          '</div></div>';
      }).join('') : '<p class="small muted">Sin ubicaciones registradas.</p>') + '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Historial con ' + E(tenant.name) + '</h3></div><div class="card-b col" style="gap:9px">' +
      kv('Cliente desde', V.fdate(cus.created_at, true)) +
      kv('Trabajos realizados', V.all('workOrders').filter(function (w) { return w.customer_id === cus.id && w.status === 'CLOSED'; }).length) +
      kv('Total facturado', V.money(my('invoices').reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0))) +
      kv('Condiciones de pago', E(cus.paymentTerms)) +
      '</div></div></div>';

    h += '<div class="col"><div class="card"><div class="card-b col" style="gap:10px">' +
      '<div class="center col mb2" style="align-items:center;gap:8px">' + '<span class="av xl">' + E(V.initials(cus.name)) + '</span>' +
      '<b>' + E(cus.name) + '</b><span class="chip">' + E(cus.type) + '</span></div>' +
      kv('Contacto', E(me.name)) + kv('Correo', E(cus.email)) + kv('Teléfono', E(cus.phone)) +
      kv('WhatsApp', E(cus.whatsapp || '—')) + kv('Identificación fiscal', E(cus.taxId || '—')) +
      kv('Dirección principal', E(cus.address)) +
      '<button class="btn btn-outline btn-sm mt2" id="edit">' + I('edit', 14) + ' Actualizar mis datos</button>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Notificaciones</h3></div><div class="card-b col" style="gap:10px">' +
      [['Estado de mis trabajos', 1], ['Presupuestos nuevos', 1], ['Recordatorio de visita', 1],
       ['Facturas y vencimientos', 1], ['Mantenimientos próximos', 1], ['Novedades del proveedor', 0]]
      .map(function (n) {
        return '<div class="spread"><span class="small">' + E(n[0]) + '</span>' +
          '<label class="switch"><input type="checkbox"' + (n[1] ? ' checked' : '') + '><span></span></label></div>';
      }).join('') + '</div></div></div></div>';

    el.innerHTML = h;
    el.querySelector('#add').addEventListener('click', function () {
      UI.modal({ title: 'Agregar una ubicación',
        body: '<div class="field"><label for="sn">Nombre <span class="req">*</span></label><input class="input" id="sn"></div>' +
          '<div class="field mt4"><label for="sa">Dirección <span class="req">*</span></label><input class="input" id="sa"></div>' +
          '<div class="field mt4"><label for="st">Tipo de inmueble</label><input class="input" id="st"></div>' +
          '<div class="field mt4"><label for="sc">Instrucciones de acceso</label><input class="input" id="sc"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          var n = m.querySelector('#sn').value.trim(), a = m.querySelector('#sa').value.trim();
          if (!n || !a) { UI.toast('Nombre y dirección son obligatorios.', 'err'); return; }
          V.insert('sites', { customer_id: cus.id, name: n, address: a, propertyType: m.querySelector('#st').value.trim(),
            access: m.querySelector('#sc').value.trim(), lat: 35 + Math.random() * 35, lng: 22 + Math.random() * 50, notes: '' });
          UI.closeTop(); UI.toast('Ubicación agregada.', 'ok'); route();
        }); } });
    });
    el.querySelector('#edit').addEventListener('click', function () {
      UI.modal({ title: 'Actualizar mis datos',
        body: '<div class="field"><label for="e1">Correo</label><input class="input" id="e1" value="' + E(cus.email) + '"></div>' +
          '<div class="field mt4"><label for="e2">Teléfono</label><input class="input" id="e2" value="' + E(cus.phone) + '"></div>' +
          '<div class="field mt4"><label for="e3">WhatsApp</label><input class="input" id="e3" value="' + E(cus.whatsapp || '') + '"></div>' +
          '<div class="field mt4"><label for="e4">Dirección principal</label><input class="input" id="e4" value="' + E(cus.address) + '"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          V.update('customers', cus.id, { email: m.querySelector('#e1').value.trim(), phone: m.querySelector('#e2').value.trim(),
            whatsapp: m.querySelector('#e3').value.trim(), address: m.querySelector('#e4').value.trim() });
          V.logActivity('customer', cus.id, 'El cliente actualizó sus datos de contacto desde el portal', 'update');
          UI.closeTop(); UI.toast('Datos actualizados.', 'ok'); route();
        }); } });
    });
  }

  /* ---------- router ---------- */
  function route() {
    var raw = (location.hash || '#resumen').slice(1), parts = raw.split('/');
    var el = document.getElementById('view');
    document.getElementById('shell').classList.remove('open');
    renderNav(); UI.closeAll();
    el.innerHTML = '<div class="page-h"><div class="skel" style="width:200px;height:26px"></div></div>' + UI.skeleton(4);
    setTimeout(function () {
      try {
        var v = { resumen: viewResumen, solicitar: viewSolicitar, solicitudes: viewSolicitudes,
          presupuestos: viewPresupuestos, trabajos: viewTrabajos, calendario: viewCalendario,
          documentos: viewDocumentos, facturas: viewFacturas, mantenimientos: viewMantenimientos,
          soporte: viewSoporte, perfil: viewPerfil }[parts[0]];
        if (!v) { el.innerHTML = PH({ title: 'Página no encontrada' }) +
          UI.emptyState({ icon: 'search', title: 'Ruta no reconocida', text: 'Usa el menú lateral para navegar.' }); return; }
        v(el, parts[1]);
      } catch (err) {
        el.innerHTML = PH({ title: 'Error' }) + UI.errorState(err.message);
        if (window.console) console.error(err);
      }
      window.scrollTo({ top: 0 });
    }, 80);
  }

  chrome();
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
