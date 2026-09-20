/* ============================================================
   VOLTX — Módulos: Dashboard, CRM, Solicitudes, Inspecciones,
   Presupuestos y Catálogo de servicios.  §6.1 – §6.6
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX, PH = APP.pageHeader, views = APP.views;

  function opt(list, sel, val, lab) {
    return list.map(function (x) {
      var v = val ? val(x) : x.id, l = lab ? lab(x) : x.name;
      return '<option value="' + E(v) + '"' + (sel === v ? ' selected' : '') + '>' + E(l) + '</option>';
    }).join('');
  }
  function stateOpts(map) {
    return Object.keys(map).map(function (k) { return { value: k, label: map[k].label }; });
  }

  /* ============================================================
     A) DASHBOARD EJECUTIVO §6.1
     ============================================================ */
  views.dashboard = function (el) {
    var wos = V.all('workOrders'), t = V.today();
    var hoy = wos.filter(function (w) { return V.ymd(w.start) === V.ymd(t); });
    var curso = wos.filter(function (w) { return ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].indexOf(w.status) >= 0; });
    var atrasadas = V.overdueWOs();
    var tecActivos = V.all('technicians').filter(function (x) { return x.active; });
    var porVencer = V.expiringQuotes();
    var vencidas = V.overdueInvoices();
    var porCobrar = V.all('invoices').reduce(function (a, i) {
      var tt = V.invoiceTotals(i); return a + (i.status === 'VOID' ? 0 : Math.max(0, tt.balance));
    }, 0);
    var mes = new Date().getMonth();
    var ingresosMes = V.all('payments').filter(function (p) { return new Date(p.date).getMonth() === mes; })
      .reduce(function (a, p) { return a + p.amount; }, 0);

    var h = PH({
      title: 'Hola, ' + V.me().name.split(' ')[0] + ' 👋',
      sub: 'Esto es lo que ocurre hoy en <b>' + E(V.myTenant().name) + '</b> · ' + V.fdate(new Date(), true),
      actions: '<button class="btn btn-outline btn-sm" id="exp">' + I('download', 15) + ' Exportar resumen</button>' +
               '<button class="btn btn-primary btn-sm" id="qa">' + I('plus', 15) + ' Acción rápida</button>'
    });

    /* KPIs */
    h += '<div class="grid g4">' +
      UI.kpi({ label: 'Trabajos hoy', value: hoy.length, icon: 'clipboard', sub: curso.length + ' en ejecución' }) +
      UI.kpi({ label: 'Órdenes atrasadas', value: atrasadas.length, icon: 'alert',
               sub: atrasadas.length ? 'Requieren reprogramación' : 'Todo al día', trend: atrasadas.length ? 'down' : 'up' }) +
      UI.kpi({ label: 'Técnicos activos', value: tecActivos.length, icon: 'hardhat', sub: V.all('absences').length + ' ausencia registrada' }) +
      UI.kpi({ label: 'Presupuestos por vencer', value: porVencer.length, icon: 'file', sub: 'Vigencia ≤ 5 días' }) +
      '</div>';
    h += '<div class="grid g4 mt4">' +
      UI.kpi({ label: 'Por cobrar', value: V.money(porCobrar), icon: 'dollar',
               sub: vencidas.length + ' factura' + (vencidas.length === 1 ? '' : 's') + ' vencida' + (vencidas.length === 1 ? '' : 's'),
               trend: vencidas.length ? 'down' : '' }) +
      UI.kpi({ label: 'Cobrado este mes', value: V.money(ingresosMes), icon: 'trend', sub: '+18% vs. mes anterior', trend: 'up' }) +
      UI.kpi({ label: 'Pipeline comercial', value: V.money(V.all('quotes').filter(function (q) { return ['SENT','VIEWED','REVIEW'].indexOf(q.status) >= 0; })
               .reduce(function (a, q) { return a + V.quoteTotals(q).total; }, 0)), icon: 'chart', sub: 'Presupuestos vivos' }) +
      UI.kpi({ label: 'Material crítico', value: V.lowStock().length, icon: 'box', sub: 'Por debajo del mínimo',
               trend: V.lowStock().length ? 'down' : '' }) +
      '</div>';

    /* agenda de hoy + alertas */
    h += '<div class="grid g-2-1 mt4">';
    h += '<div class="card"><div class="card-h"><h3>Agenda de hoy</h3><a href="#agenda" class="small">Ver agenda completa</a></div>';
    if (!hoy.length) {
      h += UI.emptyState({ icon: 'calendar', title: 'Sin trabajos programados para hoy', text: 'Programa una orden desde el módulo de agenda y despacho.' });
    } else {
      h += '<div class="tbl-wrap"><table class="tbl"><tbody>';
      hoy.sort(function (a, b) { return new Date(a.start) - new Date(b.start); }).forEach(function (w) {
        var tec = (w.technicians || []).map(V.techName).join(', ') || '<span class="muted">Sin asignar</span>';
        h += '<tr class="clickable" data-wo="' + w.id + '">' +
          '<td style="width:74px" class="bold mono">' + V.hm(w.start) + '</td>' +
          '<td><div class="bold">' + E(w.title) + '</div><div class="xs muted">' + E(w.number) + ' · ' + E(V.customerName(w.customer_id)) + ' · ' + E(V.siteName(w.site_id)) + '</div></td>' +
          '<td class="small">' + tec + '</td>' +
          '<td>' + UI.badge(V.PRIORITIES, w.priority) + '</td>' +
          '<td class="right">' + UI.badge(V.WO_STATES, w.status) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    /* alertas */
    var alerts = [];
    V.lowStock().forEach(function (p) { alerts.push(['warn', 'box', 'Stock bajo: ' + p.name, V.stockOf(p) + ' ' + p.unit + ' (mínimo ' + p.min + ')', '#inventario']); });
    atrasadas.forEach(function (w) { alerts.push(['danger', 'clock', 'Orden vencida: ' + w.number, E(w.title) + ' · venció ' + V.frel(w.end), '#ordenes/' + w.id]); });
    vencidas.forEach(function (i) { alerts.push(['danger', 'receipt', 'Factura vencida: ' + i.number, V.customerName(i.customer_id) + ' · ' + V.money(V.invoiceTotals(i).balance), '#facturacion/' + i.id]); });
    V.expiringCerts().forEach(function (c) { alerts.push([c.days < 0 ? 'danger' : 'warn', 'shield', 'Certificación ' + (c.days < 0 ? 'vencida' : 'por vencer'), c.tech.name + ' · ' + c.cert.name, '#tecnicos/' + c.tech.id]); });
    V.upcomingMaintenance().forEach(function (m) { alerts.push(['warn', 'wrench', 'Mantenimiento próximo', m.name + ' · ' + V.frel(m.nextDate), '#mantenimientos']); });
    porVencer.forEach(function (q) { alerts.push(['warn', 'file', 'Presupuesto por vencer: ' + q.number, V.customerName(q.customer_id) + ' · vence ' + V.frel(q.validUntil), '#presupuestos/' + q.id]); });

    h += '<div class="card"><div class="card-h"><h3>Alertas</h3><span class="badge b-red no-dot">' + alerts.length + '</span></div>' +
      '<div class="card-b col" style="gap:8px;max-height:430px;overflow:auto">';
    if (!alerts.length) h += '<p class="small muted">Sin alertas activas.</p>';
    alerts.slice(0, 12).forEach(function (a) {
      h += '<a href="' + a[4] + '" class="banner banner-' + a[0] + '" style="text-decoration:none">' + I(a[1], 16) +
        '<div><b>' + E(a[2]) + '</b><br><span class="xs">' + a[3] + '</span></div></a>';
    });
    h += '</div></div></div>';

    /* embudo + rentabilidad + mapa */
    h += '<div class="grid g-2-1 mt4">';
    var leads = V.all('requests');
    var funnel = [
      { l: 'Solicitudes', v: leads.length, c: '#111111' },
      { l: 'Inspección', v: V.all('inspections').length, c: '#2563EB' },
      { l: 'Presupuesto', v: V.all('quotes').length, c: '#F97316' },
      { l: 'Aprobado', v: V.all('quotes').filter(function (q) { return q.status === 'APPROVED'; }).length, c: '#E85D04' },
      { l: 'Proyecto/Orden', v: V.all('projects').length + V.all('workOrders').filter(function (w) { return w.quote_id; }).length, c: '#16A34A' }
    ];
    var fmax = Math.max.apply(null, funnel.map(function (f) { return f.v; })) || 1;
    h += '<div class="card"><div class="card-h"><h3>Embudo comercial</h3><a href="#solicitudes" class="small">Ver solicitudes</a></div><div class="card-b col">' +
      funnel.map(function (f) {
        return '<div><div class="spread small"><span>' + E(f.l) + '</span><b>' + f.v + '</b></div>' +
          '<div class="bar mt2"><i style="width:' + Math.round((f.v / fmax) * 100) + '%;background:' + f.c + '"></i></div></div>';
      }).join('') +
      '<div class="banner banner-info mt2">' + I('info', 15) + '<div>Tasa de conversión solicitud → presupuesto aprobado: <b>' +
      Math.round((V.all('quotes').filter(function (q) { return q.status === 'APPROVED'; }).length / Math.max(1, leads.length)) * 100) + '%</b></div></div>' +
      '</div></div>';

    /* rentabilidad */
    var ingresos = V.all('invoices').filter(function (i) { return i.status !== 'VOID'; }).reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0);
    var costoMat = V.all('expenses').reduce(function (a, e) { return a + e.amount; }, 0);
    var costoMO = V.all('workOrders').reduce(function (a, w) {
      var min = (w.timeEntries || []).reduce(function (x, te) { return x + (te.min || 0); }, 0);
      var tec = V.byId('technicians', (w.technicians || [])[0]);
      return a + (min / 60) * ((tec && tec.rate) || 12);
    }, 0);
    var margen = ingresos > 0 ? ((ingresos - costoMat - costoMO) / ingresos) * 100 : 0;
    h += '<div class="card"><div class="card-h"><h3>Rentabilidad del período</h3></div><div class="card-b col">' +
      '<div class="spread"><span class="small muted">Ingresos facturados</span><b>' + V.money(ingresos) + '</b></div>' +
      '<div class="spread"><span class="small muted">Costo de materiales</span><b class="mono">-' + V.money(costoMat) + '</b></div>' +
      '<div class="spread"><span class="small muted">Mano de obra</span><b class="mono">-' + V.money(costoMO) + '</b></div>' +
      '<div style="height:1px;background:var(--border)"></div>' +
      '<div class="spread"><span class="bold">Margen estimado</span>' +
      '<span class="badge ' + (margen >= 25 ? 'b-green' : margen >= 10 ? 'b-amber' : 'b-red') + '">' + margen.toFixed(1) + '%</span></div>' +
      '<div class="bar ' + (margen >= 25 ? 'g' : margen >= 10 ? 'a' : 'r') + ' mt2"><i style="width:' + Math.max(0, Math.min(100, margen)) + '%"></i></div>' +
      '<p class="xs muted">Margen mínimo configurado para la empresa: ' + V.myTenant().minMargin + '%.</p>' +
      '</div></div></div>';

    /* mapa + actividad */
    h += '<div class="grid g-2-1 mt4">';
    h += '<div class="card"><div class="card-h"><h3>Mapa operativo</h3><a href="#mapa" class="small">Abrir mapa</a></div>' +
      '<div class="card-b">' + miniMap() + '</div></div>';
    var acts = V.all('activity').slice(0, 8);
    h += '<div class="card"><div class="card-h"><h3>Actividad reciente</h3></div><div class="card-b">' +
      UI.timeline(acts.map(function (a) {
        var tone = { status: '', payment: 'g', send: 'b', doc: 'n', create: '' }[a.kind] || '';
        var ic = { status: 'refresh', payment: 'dollar', send: 'send', doc: 'file', create: 'plus' }[a.kind] || 'clock';
        return { icon: ic, tone: tone, text: '<b>' + E(V.userName(a.user_id)) + '</b> ' + E(a.text), meta: V.frel(a.at) };
      })) + '</div></div></div>';

    el.innerHTML = h;

    el.querySelectorAll('[data-wo]').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = 'ordenes/' + this.dataset.wo; });
    });
    el.querySelector('#exp').addEventListener('click', function () {
      V.download('voltx-resumen-' + V.ymd(new Date()) + '.csv', V.toCSV([
        { k: 'Trabajos hoy', v: hoy.length }, { k: 'En ejecución', v: curso.length },
        { k: 'Órdenes atrasadas', v: atrasadas.length }, { k: 'Por cobrar', v: V.money(porCobrar) },
        { k: 'Cobrado este mes', v: V.money(ingresosMes) }, { k: 'Margen', v: margen.toFixed(1) + '%' }
      ], [{ label: 'Indicador', key: 'k' }, { label: 'Valor', key: 'v' }]));
      UI.toast('Resumen exportado.', 'ok');
    });
    el.querySelector('#qa').addEventListener('click', function () { document.getElementById('create').click(); });
  };

  function miniMap() {
    var wos = V.all('workOrders').filter(function (w) { return ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; });
    var h = '<div class="map" style="min-height:260px">' +
      '<div class="road" style="left:0;right:0;top:46%;height:7px"></div>' +
      '<div class="road" style="top:0;bottom:0;left:38%;width:7px"></div>' +
      '<div class="road" style="top:0;bottom:0;left:72%;width:5px"></div>';
    wos.forEach(function (w) {
      var s = V.byId('sites', w.site_id); if (!s) return;
      var col = { EN_ROUTE: '#F97316', ON_SITE: '#E85D04', IN_PROGRESS: '#E85D04', SCHEDULED: '#2563EB',
                  ASSIGNED: '#2563EB', DRAFT: '#9CA3AF', PAUSED: '#F59E0B', COMPLETED: '#16A34A', REVIEW: '#F59E0B' }[w.status] || '#9CA3AF';
      h += '<span class="pin" style="left:' + s.lng + '%;top:' + s.lat + '%" title="' + E(w.number + ' — ' + w.title) + '">' +
        '<span class="dot" style="background:' + col + '">' + I('bolt', 12, '') + '</span></span>';
    });
    V.all('technicians').forEach(function (t) {
      h += '<span class="pin" style="left:' + t.lng + '%;top:' + t.lat + '%" title="' + E(t.name) + '">' +
        '<span class="dot" style="background:#111"><span style="color:#fff;font-size:9px;font-weight:700">' + E(V.initials(t.name)) + '</span></span></span>';
    });
    h += '</div><div class="row gap4 mt2 xs muted wrap">' +
      '<span class="row gap1"><i style="width:8px;height:8px;border-radius:50%;background:#E85D04;display:inline-block"></i> En ejecución</span>' +
      '<span class="row gap1"><i style="width:8px;height:8px;border-radius:50%;background:#2563EB;display:inline-block"></i> Programada</span>' +
      '<span class="row gap1"><i style="width:8px;height:8px;border-radius:50%;background:#111;display:inline-block"></i> Técnico</span></div>';
    return h;
  }

  /* ============================================================
     B) CRM Y CLIENTES §6.2
     ============================================================ */
  views.clientes = function (el, id) {
    if (id) return customerDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'CRM y clientes',
      sub: V.all('customers').length + ' clientes registrados · historial 360° de cada cuenta',
      actions: (V.can('clientes', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo cliente</button>' : '')
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', newCustomer);

    UI.table(host, {
      rows: function () { return V.all('customers'); },
      search: function (c) { return c.name + ' ' + c.email + ' ' + c.phone + ' ' + c.taxId + ' ' + (c.tags || []).join(' '); },
      placeholder: 'Buscar por nombre, correo, teléfono o RIF…',
      exportName: 'voltx-clientes',
      filters: [
        { key: 'type', label: 'Todos los tipos', options: [
          { value: 'residencial', label: 'Residencial' }, { value: 'comercial', label: 'Comercial' },
          { value: 'industrial', label: 'Industrial' }, { value: 'constructor', label: 'Constructor' }],
          match: function (r, v) { return r.type === v; } },
        { key: 'branch', label: 'Todas las sucursales',
          options: V.all('branches').map(function (b2) { return { value: b2.id, label: b2.name }; }),
          match: function (r, v) { return r.branch_id === v; } }
      ],
      cols: [
        { key: 'name', label: 'Cliente', render: function (c) {
            return '<div class="row gap2">' + UI.avatar(c.name) + '<div style="min-width:0">' +
              '<div class="bold truncate">' + E(c.name) + '</div>' +
              '<div class="xs muted">' + E(c.kind === 'empresa' ? 'Empresa' : 'Persona') + (c.taxId ? ' · ' + E(c.taxId) : '') + '</div></div></div>';
          } },
        { key: 'type', label: 'Tipo', render: function (c) { return '<span class="chip">' + E(c.type) + '</span>'; } },
        { key: 'phone', label: 'Contacto', render: function (c) {
            return '<div class="small">' + E(c.phone) + '</div><div class="xs muted truncate">' + E(c.email) + '</div>'; } },
        { key: 'sites', label: 'Ubicaciones', sortVal: function (c) { return sitesOf(c.id).length; },
          render: function (c) { return sitesOf(c.id).length; } },
        { key: 'saldo', label: 'Saldo', right: true, sortVal: balanceOf,
          render: function (c) { var b2 = balanceOf(c); return b2 > 0 ? '<b class="mono" style="color:var(--danger)">' + V.money(b2) + '</b>' : '<span class="muted">—</span>'; } },
        { key: 'owner_user_id', label: 'Responsable', render: function (c) { return '<span class="small">' + E(V.userName(c.owner_user_id)) + '</span>'; } },
        { key: 'acc', label: '', sortable: false, export: false, right: true, render: function () { return '<span class="muted">' + I('chevR', 15) + '</span>'; } }
      ],
      onRow: function (rid) { location.hash = 'clientes/' + rid; }
    });
  };
  function sitesOf(cid) { return V.all('sites').filter(function (s) { return s.customer_id === cid; }); }
  function balanceOf(c) {
    return V.all('invoices').filter(function (i) { return i.customer_id === c.id && i.status !== 'VOID'; })
      .reduce(function (a, i) { return a + Math.max(0, V.invoiceTotals(i).balance); }, 0);
  }

  function newCustomer() {
    if (!V.can('clientes', 'crear')) { UI.toast('No tienes permiso para crear clientes.', 'err'); return; }
    UI.modal({
      title: 'Nuevo cliente', size: 'wide',
      body: '<form id="f" class="col">' +
        '<div class="grid g2">' +
          '<div class="field"><label for="kind">Tipo de registro</label><select class="select" id="kind"><option value="persona">Persona</option><option value="empresa" selected>Empresa</option></select></div>' +
          '<div class="field"><label for="type">Segmento</label><select class="select" id="type"><option value="residencial">Residencial</option><option value="comercial" selected>Comercial</option><option value="industrial">Industrial</option><option value="constructor">Constructor / contratista</option></select></div>' +
        '</div>' +
        '<div class="field"><label for="name">Nombre o razón social <span class="req">*</span></label><input class="input" id="name" required></div>' +
        '<div class="grid g2">' +
          '<div class="field"><label for="taxId">Identificación fiscal</label><input class="input" id="taxId" placeholder="J-00000000-0"></div>' +
          '<div class="field"><label for="branch">Sucursal</label><select class="select" id="branch">' + opt(V.all('branches')) + '</select></div>' +
        '</div>' +
        '<div class="grid g3">' +
          '<div class="field"><label for="email">Correo</label><input class="input" id="email" type="email"></div>' +
          '<div class="field"><label for="phone">Teléfono <span class="req">*</span></label><input class="input" id="phone"></div>' +
          '<div class="field"><label for="wa">WhatsApp</label><input class="input" id="wa"></div>' +
        '</div>' +
        '<div class="field"><label for="addr">Dirección principal</label><input class="input" id="addr"></div>' +
        '<div class="grid g3">' +
          '<div class="field"><label for="src">Origen del lead</label><select class="select" id="src"><option>Referido</option><option>Google</option><option>Instagram</option><option>Web</option><option>Licitación</option><option>Otro</option></select></div>' +
          '<div class="field"><label for="terms">Condiciones de pago</label><select class="select" id="terms"><option>Contado</option><option>15 días</option><option>30 días</option><option>45 días</option><option>60 días</option></select></div>' +
          '<div class="field"><label for="credit">Límite de crédito</label><input class="input" id="credit" type="number" value="0" min="0"></div>' +
        '</div>' +
        '<div class="field"><label for="notes">Notas internas</label><textarea class="textarea" id="notes" placeholder="Accesos, horarios, particularidades técnicas…"></textarea></div>' +
        '<div class="banner banner-info">' + I('info', 15) + '<div>Al guardar se crea también la primera ubicación con la dirección indicada. Podrás agregar más desde la ficha del cliente.</div></div>' +
        '</form>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="save">Guardar cliente</button>',
      onMount: function (w) {
        w.querySelector('#save').addEventListener('click', function () {
          var g = function (id2) { return (w.querySelector('#' + id2).value || '').trim(); };
          var name = g('name'), phone = g('phone');
          w.querySelector('#name').classList.toggle('err', !name);
          w.querySelector('#phone').classList.toggle('err', !phone);
          if (!name || !phone) { UI.toast('Nombre y teléfono son obligatorios.', 'err'); return; }
          var c = V.insert('customers', {
            kind: g('kind'), type: g('type'), name: name, taxId: g('taxId'), email: g('email'),
            phone: phone, whatsapp: g('wa'), address: g('addr'), source: g('src'),
            paymentTerms: g('terms'), creditLimit: +g('credit') || 0, branch_id: g('branch'),
            tags: [], notes: g('notes'), owner_user_id: V.getSession().user_id
          });
          V.insert('sites', { customer_id: c.id, name: 'Ubicación principal', address: g('addr'),
            propertyType: '', access: '', lat: 40 + Math.random() * 30, lng: 20 + Math.random() * 50, notes: '' });
          V.logActivity('customer', c.id, 'Creó el cliente ' + name, 'create');
          V.logAudit('CREATE', 'customer', c.id, name);
          UI.closeTop(); UI.toast('Cliente creado.', 'ok'); location.hash = 'clientes/' + c.id; APP.reload();
        });
      }
    });
  }
  views.__newCustomer = newCustomer;

  function customerDetail(el, id) {
    var c = V.byId('customers', id);
    if (!c) { el.innerHTML = PH({ title: 'Cliente' }) + UI.errorState('El cliente no existe o pertenece a otra empresa.'); return; }
    var sites = sitesOf(c.id), contacts = V.all('contacts').filter(function (x) { return x.customer_id === c.id; });
    var reqs = V.all('requests').filter(function (x) { return x.customer_id === c.id; });
    var quotes = V.all('quotes').filter(function (x) { return x.customer_id === c.id; });
    var wos = V.all('workOrders').filter(function (x) { return x.customer_id === c.id; });
    var invs = V.all('invoices').filter(function (x) { return x.customer_id === c.id; });
    var tickets = V.all('tickets').filter(function (x) { return x.customer_id === c.id; });
    var assets = V.all('assets').filter(function (x) { return x.customer_id === c.id; });
    var docs = V.all('documents').filter(function (x) { return x.customer_id === c.id; });
    var facturado = invs.reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0);

    var h = PH({
      crumbs: [{ label: 'CRM y clientes', href: '#clientes' }, { label: c.name }],
      title: c.name,
      sub: '<span class="chip">' + E(c.type) + '</span> <span class="chip">' + E(c.kind) + '</span> ' +
           (c.tags || []).map(function (t) { return '<span class="chip">' + E(t) + '</span>'; }).join(' '),
      actions: '<button class="btn btn-outline btn-sm" id="nreq">' + I('inbox', 15) + ' Nueva solicitud</button>' +
               '<button class="btn btn-outline btn-sm" id="nq">' + I('file', 15) + ' Crear presupuesto</button>' +
               (V.can('clientes', 'editar') ? '<button class="btn btn-primary btn-sm" id="edit">' + I('edit', 15) + ' Editar</button>' : '')
    });

    h += '<div class="grid g4">' +
      UI.kpi({ label: 'Trabajos realizados', value: wos.filter(function (w) { return w.status === 'CLOSED'; }).length, icon: 'clipboard' }) +
      UI.kpi({ label: 'Total facturado', value: V.money(facturado), icon: 'receipt' }) +
      UI.kpi({ label: 'Saldo pendiente', value: V.money(balanceOf(c)), icon: 'dollar', trend: balanceOf(c) > 0 ? 'down' : '' }) +
      UI.kpi({ label: 'Incidencias abiertas', value: tickets.filter(function (t) { return ['OPEN', 'IN_PROGRESS', 'WAITING'].indexOf(t.status) >= 0; }).length, icon: 'alert' }) +
      '</div>';

    h += '<div class="grid g-2-1 mt4"><div>' +
      '<div class="card"><div class="tabs" id="tabs">' +
        ['Resumen', 'Ubicaciones (' + sites.length + ')', 'Contactos (' + contacts.length + ')', 'Solicitudes (' + reqs.length + ')',
         'Presupuestos (' + quotes.length + ')', 'Órdenes (' + wos.length + ')', 'Facturas (' + invs.length + ')',
         'Activos (' + assets.length + ')', 'Documentos (' + docs.length + ')', 'Incidencias (' + tickets.length + ')']
        .map(function (t, i) { return '<button class="' + (i === 0 ? 'on' : '') + '" data-t="' + i + '">' + E(t) + '</button>'; }).join('') +
      '</div><div class="card-b" id="tabc"></div></div></div>';

    /* panel lateral */
    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Datos de contacto</h3></div><div class="card-b col" style="gap:10px">' +
        kv('Identificación fiscal', c.taxId || '—') + kv('Correo', c.email ? '<a href="mailto:' + E(c.email) + '">' + E(c.email) + '</a>' : '—') +
        kv('Teléfono', c.phone) + kv('WhatsApp', c.whatsapp ? '<a href="https://wa.me/' + c.whatsapp.replace(/\D/g, '') + '" target="_blank" rel="noopener">' + E(c.whatsapp) + '</a>' : '—') +
        kv('Dirección', c.address) + kv('Sucursal', (V.byId('branches', c.branch_id) || {}).name || '—') +
        kv('Condiciones de pago', c.paymentTerms) + kv('Límite de crédito', V.money(c.creditLimit)) +
        kv('Origen', c.source) + kv('Responsable', V.userName(c.owner_user_id)) +
        kv('Cliente desde', V.fdate(c.created_at)) +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Notas internas</h3></div><div class="card-b">' +
        '<p class="small">' + (c.notes ? E(c.notes) : '<span class="muted">Sin notas.</span>') + '</p>' +
        '<button class="btn btn-outline btn-sm mt4" id="note">' + I('edit', 14) + ' Editar notas</button>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Actividad</h3></div><div class="card-b">' +
        UI.timeline(V.all('activity').filter(function (a) { return a.entity === 'customer' && a.entity_id === c.id; })
          .map(function (a) { return { icon: 'clock', text: '<b>' + E(V.userName(a.user_id)) + '</b> ' + E(a.text), meta: V.frel(a.at) }; })
          .concat(wos.slice(0, 4).map(function (w) {
            return { icon: 'clipboard', tone: w.status === 'CLOSED' ? 'g' : '', text: 'Orden <a href="#ordenes/' + w.id + '">' + E(w.number) + '</a> — ' + E(w.title), meta: V.fdate(w.start) + ' · ' + V.WO_STATES[w.status].label };
          }))) +
      '</div></div></div></div>';

    el.innerHTML = h;

    var tabc = el.querySelector('#tabc');
    function renderTab(i) {
      if (i === 0) {
        tabc.innerHTML = '<div class="grid g2">' +
          '<div><h4 class="mb2">Próximos trabajos</h4>' + miniList(wos.filter(function (w) { return new Date(w.start) >= V.today() && ['CLOSED','CANCELLED'].indexOf(w.status) < 0; }),
            function (w) { return { t: w.title, s: V.fdatetime(w.start) + ' · ' + V.WO_STATES[w.status].label, href: '#ordenes/' + w.id }; }, 'Sin trabajos programados.') + '</div>' +
          '<div><h4 class="mb2">Presupuestos abiertos</h4>' + miniList(quotes.filter(function (q) { return ['SENT','VIEWED','DRAFT','REVIEW'].indexOf(q.status) >= 0; }),
            function (q) { return { t: q.number + ' · ' + V.money(V.quoteTotals(q).total), s: V.QUOTE_STATES[q.status].label + ' · vence ' + V.frel(q.validUntil), href: '#presupuestos/' + q.id }; }, 'Sin presupuestos abiertos.') + '</div>' +
          '<div><h4 class="mb2">Facturas pendientes</h4>' + miniList(invs.filter(function (iv) { return V.invoiceTotals(iv).balance > 0.01; }),
            function (iv) { return { t: iv.number + ' · ' + V.money(V.invoiceTotals(iv).balance), s: 'Vence ' + V.frel(iv.due), href: '#facturacion/' + iv.id }; }, 'Sin facturas pendientes.') + '</div>' +
          '<div><h4 class="mb2">Mantenimientos programados</h4>' + miniList(V.all('maintenancePlans').filter(function (m) { return m.customer_id === c.id; }),
            function (m) { return { t: m.name, s: m.frequency + ' · próximo ' + V.fdate(m.nextDate), href: '#mantenimientos' }; }, 'Sin planes de mantenimiento.') + '</div>' +
          '</div>';
      }
      if (i === 1) {
        tabc.innerHTML = (V.can('clientes', 'crear') ? '<button class="btn btn-outline btn-sm mb4" id="addsite">' + I('plus', 14) + ' Agregar ubicación</button>' : '') +
          (sites.length ? '<div class="col">' + sites.map(function (s) {
            var sa = assets.filter(function (a) { return a.site_id === s.id; });
            return '<div class="card"><div class="card-b tight">' +
              '<div class="spread"><div><b>' + E(s.name) + '</b><div class="xs muted">' + E(s.address) + '</div></div>' +
              '<span class="chip">' + E(s.propertyType || 'Sin clasificar') + '</span></div>' +
              (s.access ? '<p class="xs muted mt2">' + I('key', 12) + ' ' + E(s.access) + '</p>' : '') +
              '<div class="row gap2 mt2 xs muted"><span>' + sa.length + ' activo(s)</span><span>·</span>' +
              '<span>' + wos.filter(function (w) { return w.site_id === s.id; }).length + ' intervención(es)</span></div>' +
              '</div></div>';
          }).join('') + '</div>' : UI.emptyState({ icon: 'pin', title: 'Sin ubicaciones', text: 'Agrega la primera ubicación del cliente.' }));
        var as = tabc.querySelector('#addsite');
        if (as) as.addEventListener('click', function () {
          UI.modal({ title: 'Nueva ubicación',
            body: '<div class="field"><label for="sn">Nombre del sitio <span class="req">*</span></label><input class="input" id="sn" placeholder="Casa principal, Sucursal Centro, Planta Norte…"></div>' +
                  '<div class="field mt4"><label for="sa2">Dirección</label><input class="input" id="sa2"></div>' +
                  '<div class="grid g2 mt4"><div class="field"><label for="sp">Tipo de inmueble</label><input class="input" id="sp" placeholder="Vivienda, local, planta…"></div>' +
                  '<div class="field"><label for="sac">Instrucciones de acceso</label><input class="input" id="sac"></div></div>',
            footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv">Guardar</button>',
            onMount: function (w) { w.querySelector('#sv').addEventListener('click', function () {
              var n = w.querySelector('#sn').value.trim();
              if (!n) { UI.toast('El nombre del sitio es obligatorio.', 'err'); return; }
              V.insert('sites', { customer_id: c.id, name: n, address: w.querySelector('#sa2').value.trim(),
                propertyType: w.querySelector('#sp').value.trim(), access: w.querySelector('#sac').value.trim(),
                lat: 30 + Math.random() * 40, lng: 20 + Math.random() * 55, notes: '' });
              UI.closeTop(); UI.toast('Ubicación agregada.', 'ok'); APP.reload();
            }); } });
        });
      }
      if (i === 2) {
        tabc.innerHTML = contacts.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Teléfono</th><th></th></tr></thead><tbody>' +
          contacts.map(function (x) {
            return '<tr><td class="bold">' + E(x.name) + '</td><td class="small">' + E(x.role) + '</td>' +
              '<td class="small">' + E(x.email || '—') + '</td><td class="small">' + E(x.phone) + '</td>' +
              '<td class="right">' + (x.primary ? '<span class="badge b-orange">Principal</span>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>'
          : UI.emptyState({ icon: 'user', title: 'Sin contactos adicionales', text: 'Registra las personas de contacto de esta cuenta.' });
      }
      if (i === 3) tabc.innerHTML = listTable(reqs, [
        ['Número', function (r) { return '<b>' + E(r.number) + '</b>'; }],
        ['Asunto', function (r) { return E(r.title); }],
        ['Canal', function (r) { return '<span class="chip">' + E(r.channel) + '</span>'; }],
        ['Prioridad', function (r) { return UI.badge(V.PRIORITIES, r.priority); }],
        ['Estado', function (r) { return UI.badge(V.REQ_STATES, r.status); }]
      ], 'Sin solicitudes registradas.', function (r) { return '#solicitudes/' + r.id; });
      if (i === 4) tabc.innerHTML = listTable(quotes, [
        ['Número', function (q) { return '<b>' + E(q.number) + '</b> <span class="xs muted">V' + q.version + '</span>'; }],
        ['Fecha', function (q) { return V.fdate(q.created_at); }],
        ['Vigencia', function (q) { return V.fdate(q.validUntil); }],
        ['Total', function (q) { return '<b class="mono">' + V.money(V.quoteTotals(q).total) + '</b>'; }],
        ['Estado', function (q) { return UI.badge(V.QUOTE_STATES, q.status); }]
      ], 'Sin presupuestos.', function (q) { return '#presupuestos/' + q.id; });
      if (i === 5) tabc.innerHTML = listTable(wos, [
        ['Número', function (w) { return '<b>' + E(w.number) + '</b>'; }],
        ['Trabajo', function (w) { return E(w.title); }],
        ['Fecha', function (w) { return V.fdate(w.start); }],
        ['Técnico', function (w) { return (w.technicians || []).map(V.techName).join(', ') || '—'; }],
        ['Estado', function (w) { return UI.badge(V.WO_STATES, w.status); }]
      ], 'Sin órdenes de trabajo.', function (w) { return '#ordenes/' + w.id; });
      if (i === 6) tabc.innerHTML = listTable(invs, [
        ['Número', function (x) { return '<b>' + E(x.number) + '</b>'; }],
        ['Emisión', function (x) { return V.fdate(x.date); }],
        ['Vence', function (x) { return V.fdate(x.due); }],
        ['Total', function (x) { return '<b class="mono">' + V.money(V.invoiceTotals(x).total) + '</b>'; }],
        ['Saldo', function (x) { var b2 = V.invoiceTotals(x).balance; return b2 > 0.01 ? '<span class="mono" style="color:var(--danger)">' + V.money(b2) + '</span>' : '<span class="muted">—</span>'; }],
        ['Estado', function (x) { return UI.badge(V.INV_STATES, x.status); }]
      ], 'Sin facturas.', function (x) { return '#facturacion/' + x.id; });
      if (i === 7) tabc.innerHTML = listTable(assets, [
        ['Activo', function (a) { return '<b>' + E(a.name) + '</b><div class="xs muted">' + E(a.brand + ' ' + a.model) + '</div>'; }],
        ['Tipo', function (a) { return '<span class="chip">' + E(a.type) + '</span>'; }],
        ['Serial', function (a) { return '<span class="mono small">' + E(a.serial) + '</span>'; }],
        ['Ubicación', function (a) { return E(V.siteName(a.site_id)); }],
        ['Próximo servicio', function (a) { return V.fdate(a.nextService); }]
      ], 'Sin activos registrados.', function () { return '#activos'; });
      if (i === 8) tabc.innerHTML = listTable(docs, [
        ['Documento', function (d) { return '<div class="row gap2"><span class="file-ico">' + I('file', 15) + '</span><span><b>' + E(d.name) + '</b><div class="xs muted">v' + d.version + ' · ' + E(d.size) + '</div></span></div>'; }],
        ['Categoría', function (d) { return '<span class="chip">' + E(d.category) + '</span>'; }],
        ['Visibilidad', function (d) { return d.visibility === 'cliente' ? '<span class="badge b-green">Visible al cliente</span>' : '<span class="badge b-gray">Interno</span>'; }],
        ['Fecha', function (d) { return V.fdate(d.date); }]
      ], 'Sin documentos.', function () { return '#documentos'; });
      if (i === 9) tabc.innerHTML = listTable(tickets, [
        ['Número', function (t) { return '<b>' + E(t.number) + '</b>'; }],
        ['Asunto', function (t) { return E(t.subject); }],
        ['Tipo', function (t) { return '<span class="chip">' + E(t.type) + '</span>'; }],
        ['SLA', function (t) { return V.fdate(t.sla); }],
        ['Estado', function (t) { return UI.badge(V.TICKET_STATES, t.status); }]
      ], 'Sin incidencias.', function (t) { return '#incidencias/' + t.id; });
    }
    renderTab(0);
    el.querySelectorAll('#tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        el.querySelectorAll('#tabs button').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on'); renderTab(+this.dataset.t);
      });
    });
    el.querySelector('#note').addEventListener('click', function () {
      UI.prompt({ title: 'Notas internas', label: 'Notas', value: c.notes, textarea: true }, function (v) {
        V.update('customers', c.id, { notes: v }); UI.toast('Notas actualizadas.', 'ok'); APP.reload();
      });
    });
    var ed = el.querySelector('#edit');
    if (ed) ed.addEventListener('click', function () {
      UI.modal({ title: 'Editar cliente', size: 'wide',
        body: '<div class="grid g2">' +
          '<div class="field"><label for="e1">Nombre</label><input class="input" id="e1" value="' + E(c.name) + '"></div>' +
          '<div class="field"><label for="e2">Identificación fiscal</label><input class="input" id="e2" value="' + E(c.taxId) + '"></div>' +
          '<div class="field"><label for="e3">Correo</label><input class="input" id="e3" value="' + E(c.email) + '"></div>' +
          '<div class="field"><label for="e4">Teléfono</label><input class="input" id="e4" value="' + E(c.phone) + '"></div>' +
          '<div class="field"><label for="e5">Condiciones de pago</label><input class="input" id="e5" value="' + E(c.paymentTerms) + '"></div>' +
          '<div class="field"><label for="e6">Límite de crédito</label><input class="input" id="e6" type="number" value="' + c.creditLimit + '"></div>' +
          '</div><div class="field mt4"><label for="e7">Dirección</label><input class="input" id="e7" value="' + E(c.address) + '"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv">Guardar cambios</button>',
        onMount: function (w) { w.querySelector('#sv').addEventListener('click', function () {
          V.update('customers', c.id, { name: w.querySelector('#e1').value.trim(), taxId: w.querySelector('#e2').value.trim(),
            email: w.querySelector('#e3').value.trim(), phone: w.querySelector('#e4').value.trim(),
            paymentTerms: w.querySelector('#e5').value, creditLimit: +w.querySelector('#e6').value || 0,
            address: w.querySelector('#e7').value.trim() });
          V.logAudit('UPDATE', 'customer', c.id, 'Datos del cliente actualizados');
          UI.closeTop(); UI.toast('Cliente actualizado.', 'ok'); APP.reload();
        }); } });
    });
    el.querySelector('#nreq').addEventListener('click', function () { newRequest(c.id); });
    el.querySelector('#nq').addEventListener('click', function () { location.hash = 'presupuestos/nuevo'; });
  }

  function kv(k, v) { return '<div class="spread" style="align-items:flex-start;gap:12px"><span class="small muted nowrap">' + E(k) + '</span><span class="small bold right">' + v + '</span></div>'; }
  function miniList(rows, map, empty) {
    if (!rows.length) return '<p class="small muted">' + E(empty) + '</p>';
    return '<div class="col" style="gap:6px">' + rows.slice(0, 5).map(function (r) {
      var m = map(r);
      return '<a href="' + m.href + '" class="file-row" style="text-decoration:none">' +
        '<span style="min-width:0"><span class="bold small truncate" style="display:block;color:var(--text)">' + E(m.t) + '</span>' +
        '<span class="xs muted">' + E(m.s) + '</span></span>' +
        '<span style="margin-left:auto" class="muted">' + I('chevR', 14) + '</span></a>';
    }).join('') + '</div>';
  }
  function listTable(rows, cols, empty, href) {
    if (!rows.length) return UI.emptyState({ icon: 'inbox', title: 'Sin registros', text: empty });
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      cols.map(function (c) { return '<th>' + E(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="clickable" onclick="location.hash=\'' + href(r).slice(1) + '\'">' +
          cols.map(function (c) { return '<td>' + c[1](r) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     C) SOLICITUDES / LEADS §6.3
     ============================================================ */
  views.solicitudes = function (el, id) {
    if (id) return requestDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Solicitudes y leads',
      sub: 'Entradas del portal, teléfono, web, WhatsApp o registro manual',
      actions: '<div class="seg" id="vw"><button class="on" data-v="tabla">Tabla</button><button data-v="kanban">Kanban</button></div>' +
        (V.can('solicitudes', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva solicitud</button>' : '')
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () { newRequest(); });

    function tabla() {
      UI.table(host, {
        rows: function () { return V.all('requests'); },
        search: function (r) { return r.number + ' ' + r.title + ' ' + (r.leadName || V.customerName(r.customer_id)); },
        placeholder: 'Buscar por número, asunto o cliente…', exportName: 'voltx-solicitudes',
        filters: [
          { key: 'st', label: 'Todos los estados', options: stateOpts(V.REQ_STATES), match: function (r, v) { return r.status === v; } },
          { key: 'pr', label: 'Toda prioridad', options: stateOpts(V.PRIORITIES), match: function (r, v) { return r.priority === v; } },
          { key: 'ch', label: 'Todos los canales', options: ['Portal cliente','WhatsApp','Web','Teléfono','Manual'].map(function (x) { return { value: x, label: x }; }), match: function (r, v) { return r.channel === v; } }
        ],
        cols: [
          { key: 'number', label: 'Número', render: function (r) { return '<b>' + E(r.number) + '</b><div class="xs muted">' + V.frel(r.created_at) + '</div>'; } },
          { key: 'title', label: 'Asunto', render: function (r) { return '<div class="bold">' + E(r.title) + '</div><div class="xs muted truncate" style="max-width:320px">' + E(r.description) + '</div>'; } },
          { key: 'cus', label: 'Cliente', sortVal: function (r) { return r.leadName || V.customerName(r.customer_id); },
            render: function (r) { return r.customer_id ? '<a href="#clientes/' + r.customer_id + '">' + E(V.customerName(r.customer_id)) + '</a>' : '<span class="badge b-amber">Lead: ' + E(r.leadName || '—') + '</span>'; } },
          { key: 'channel', label: 'Canal', render: function (r) { return '<span class="chip">' + E(r.channel) + '</span>'; } },
          { key: 'priority', label: 'Prioridad', render: function (r) { return UI.badge(V.PRIORITIES, r.priority); } },
          { key: 'due', label: 'SLA', render: function (r) {
              var d = V.daysTo(r.due);
              return '<span class="small ' + (d < 0 ? 'prio-critica' : d <= 1 ? 'prio-alta' : '') + '">' + V.fdate(r.due) + '</span>'; } },
          { key: 'owner_user_id', label: 'Responsable', render: function (r) { return '<span class="small">' + E(V.userName(r.owner_user_id)) + '</span>'; } },
          { key: 'status', label: 'Estado', right: true, render: function (r) { return UI.badge(V.REQ_STATES, r.status); } }
        ],
        onRow: function (rid) { location.hash = 'solicitudes/' + rid; }
      });
    }
    function kanban() {
      var cols = Object.keys(V.REQ_STATES);
      host.innerHTML = '<div class="kanban">' + cols.map(function (k) {
        var rows = V.all('requests').filter(function (r) { return r.status === k; });
        return '<div class="kcol" data-k="' + k + '"><h4><span>' + E(V.REQ_STATES[k].label) + '</span><span>' + rows.length + '</span></h4>' +
          rows.map(function (r) {
            return '<div class="kcard" draggable="true" data-id="' + r.id + '">' +
              '<div class="spread"><b class="xs">' + E(r.number) + '</b>' + UI.badge(V.PRIORITIES, r.priority) + '</div>' +
              '<div class="small bold mt2">' + E(r.title) + '</div>' +
              '<div class="xs muted mt2">' + E(r.leadName || V.customerName(r.customer_id)) + '</div>' +
              '<div class="xs muted mt2">' + I('clock', 11) + ' SLA ' + V.fdate(r.due) + '</div></div>';
          }).join('') + '</div>';
      }).join('') + '</div>';
      var dragId = null;
      host.querySelectorAll('.kcard').forEach(function (c) {
        c.addEventListener('dragstart', function () { dragId = this.dataset.id; this.classList.add('drag'); });
        c.addEventListener('dragend', function () { this.classList.remove('drag'); });
        c.addEventListener('click', function () { location.hash = 'solicitudes/' + this.dataset.id; });
      });
      host.querySelectorAll('.kcol').forEach(function (col) {
        col.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('over'); });
        col.addEventListener('dragleave', function () { this.classList.remove('over'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); this.classList.remove('over');
          if (!dragId) return;
          if (!V.can('solicitudes', 'editar')) { UI.toast('No tienes permiso para cambiar el estado.', 'err'); return; }
          var st = this.dataset.k;
          if (st === 'LOST') {
            UI.prompt({ title: 'Marcar como perdida', label: 'Motivo de pérdida', required: true, placeholder: 'Precio, tiempo, competencia…' }, function (v) {
              V.update('requests', dragId, { status: 'LOST', lostReason: v });
              V.logActivity('service_request', dragId, 'Marcó la solicitud como perdida: ' + v, 'status');
              kanban(); UI.toast('Solicitud marcada como perdida.', 'ok');
            });
            return;
          }
          V.update('requests', dragId, { status: st });
          V.logActivity('service_request', dragId, 'Cambió el estado a ' + V.REQ_STATES[st].label, 'status');
          kanban(); APP.refreshChrome(); UI.toast('Estado actualizado.', 'ok');
        });
      });
    }
    tabla();
    el.querySelectorAll('#vw button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        el.querySelectorAll('#vw button').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on');
        this.dataset.v === 'tabla' ? tabla() : kanban();
      });
    });
  };

  function newRequest(customerId) {
    if (!V.can('solicitudes', 'crear')) { UI.toast('No tienes permiso para crear solicitudes.', 'err'); return; }
    var cus = V.all('customers');
    UI.modal({
      title: 'Nueva solicitud', size: 'wide',
      body: '<div class="grid g2">' +
          '<div class="field"><label for="cu">Cliente</label><select class="select" id="cu"><option value="">— Lead nuevo (sin cliente) —</option>' + opt(cus, customerId) + '</select></div>' +
          '<div class="field"><label for="si">Ubicación</label><select class="select" id="si"><option value="">Selecciona un cliente primero</option></select></div>' +
        '</div>' +
        '<div id="leadbox" class="grid g3 mt4 hide">' +
          '<div class="field"><label for="ln">Nombre del lead</label><input class="input" id="ln"></div>' +
          '<div class="field"><label for="le">Correo</label><input class="input" id="le" type="email"></div>' +
          '<div class="field"><label for="lp">Teléfono</label><input class="input" id="lp"></div>' +
        '</div>' +
        '<div class="field mt4"><label for="ti">Asunto <span class="req">*</span></label><input class="input" id="ti" placeholder="Describe brevemente la necesidad"></div>' +
        '<div class="field mt4"><label for="de">Descripción</label><textarea class="textarea" id="de" placeholder="Detalles del requerimiento, síntomas, antecedentes…"></textarea></div>' +
        '<div class="grid g4 mt4">' +
          '<div class="field"><label for="sv">Tipo de servicio</label><select class="select" id="sv"><option>Instalación</option><option>Mantenimiento</option><option>Inspección</option><option>Emergencia</option><option>Corrección</option></select></div>' +
          '<div class="field"><label for="ch">Canal de origen</label><select class="select" id="ch"><option>Manual</option><option>Portal cliente</option><option>WhatsApp</option><option>Web</option><option>Teléfono</option></select></div>' +
          '<div class="field"><label for="pr">Prioridad</label><select class="select" id="pr">' + opt(Object.keys(V.PRIORITIES).map(function (k) { return { id: k, name: V.PRIORITIES[k].label }; }), 'normal') + '</select></div>' +
          '<div class="field"><label for="du">Fecha objetivo (SLA)</label><input class="input" id="du" type="date" value="' + V.ymd(V.addDays(V.today(), 3)) + '"></div>' +
        '</div>' +
        '<div class="field mt4"><label for="ow">Responsable comercial</label><select class="select" id="ow">' +
          opt(V.all('users').filter(function (u) { return ['ventas','owner','coordinador'].indexOf(u.role) >= 0; }), V.getSession().user_id) + '</select></div>' +
        '<div class="field mt4"><label>Archivos y fotos</label><div class="dropzone" id="dz">' + I('upload', 22) +
          '<div class="mt2 small">Arrastra fotos o documentos aquí</div></div></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv2">Crear solicitud</button>',
      onMount: function (w) {
        var cu = w.querySelector('#cu'), si = w.querySelector('#si'), lb = w.querySelector('#leadbox');
        function sync() {
          var v = cu.value;
          lb.classList.toggle('hide', !!v);
          si.innerHTML = v ? opt(sitesOf(v)) : '<option value="">—</option>';
        }
        cu.addEventListener('change', sync); sync();
        UI.uploader(w.querySelector('#dz'));
        w.querySelector('#sv2').addEventListener('click', function () {
          var ti = w.querySelector('#ti').value.trim();
          if (!ti) { w.querySelector('#ti').classList.add('err'); UI.toast('El asunto es obligatorio.', 'err'); return; }
          var r = V.insert('requests', {
            number: V.nextNumber('request'), customer_id: cu.value || null, site_id: si.value || null,
            channel: w.querySelector('#ch').value, service: w.querySelector('#sv').value, title: ti,
            leadName: w.querySelector('#ln').value.trim(), leadEmail: w.querySelector('#le').value.trim(),
            leadPhone: w.querySelector('#lp').value.trim(), description: w.querySelector('#de').value.trim(),
            priority: w.querySelector('#pr').value, status: 'NEW', owner_user_id: w.querySelector('#ow').value,
            due: w.querySelector('#du').value, files: [], lostReason: ''
          });
          V.logActivity('service_request', r.id, 'Creó la solicitud ' + r.number, 'create');
          V.logAudit('CREATE', 'service_request', r.number, ti);
          UI.closeTop(); UI.toast('Solicitud ' + r.number + ' creada.', 'ok'); location.hash = 'solicitudes/' + r.id; APP.reload();
        });
      }
    });
  }
  views.__newRequest = newRequest;

  function requestDetail(el, id) {
    var r = V.byId('requests', id);
    if (!r) { el.innerHTML = PH({ title: 'Solicitud' }) + UI.errorState('La solicitud no existe.'); return; }
    var ins = V.all('inspections').filter(function (x) { return x.request_id === r.id; });
    var qs = V.all('quotes').filter(function (x) { return x.request_id === r.id; });

    var h = PH({
      crumbs: [{ label: 'Solicitudes', href: '#solicitudes' }, { label: r.number }],
      title: r.title,
      sub: r.number + ' · creada ' + V.frel(r.created_at) + ' · canal ' + E(r.channel),
      actions: (V.can('inspecciones', 'crear') ? '<button class="btn btn-outline btn-sm" id="ins">' + I('search', 15) + ' Programar inspección</button>' : '') +
               (V.can('presupuestos', 'crear') ? '<button class="btn btn-outline btn-sm" id="q">' + I('file', 15) + ' Crear presupuesto</button>' : '') +
               (V.can('solicitudes', 'editar') ? '<button class="btn btn-primary btn-sm" id="st">' + I('refresh', 15) + ' Cambiar estado</button>' : '')
    });

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Detalle</h3>' + UI.badge(V.REQ_STATES, r.status) + '</div><div class="card-b col">' +
        '<p>' + E(r.description || 'Sin descripción.') + '</p>' +
        (r.lostReason ? '<div class="banner banner-danger">' + I('alert', 15) + '<div><b>Motivo de pérdida:</b> ' + E(r.lostReason) + '</div></div>' : '') +
        '<div class="grid g2 mt2">' +
          kv('Tipo de servicio', E(r.service)) + kv('Prioridad', UI.badge(V.PRIORITIES, r.priority)) +
          kv('Fecha objetivo (SLA)', V.fdate(r.due)) + kv('Responsable', E(V.userName(r.owner_user_id))) +
        '</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Inspecciones vinculadas</h3></div><div class="card-b">' +
        (ins.length ? listTable(ins, [
          ['Número', function (x) { return '<b>' + E(x.number) + '</b>'; }],
          ['Fecha', function (x) { return V.fdatetime(x.date); }],
          ['Técnico', function (x) { return E(V.techName(x.technician_id)); }],
          ['Estado', function (x) { return x.status === 'COMPLETED' ? '<span class="badge b-green">Completada</span>' : '<span class="badge b-blue">Programada</span>'; }]
        ], '', function (x) { return '#inspecciones/' + x.id; }) : '<p class="small muted">Aún no se ha programado una inspección.</p>') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Presupuestos generados</h3></div><div class="card-b">' +
        (qs.length ? listTable(qs, [
          ['Número', function (x) { return '<b>' + E(x.number) + '</b> <span class="xs muted">V' + x.version + '</span>'; }],
          ['Total', function (x) { return V.money(V.quoteTotals(x).total); }],
          ['Estado', function (x) { return UI.badge(V.QUOTE_STATES, x.status); }]
        ], '', function (x) { return '#presupuestos/' + x.id; }) : '<p class="small muted">Sin presupuestos todavía.</p>') +
      '</div></div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Cliente</h3></div><div class="card-b col" style="gap:10px">' +
        (r.customer_id
          ? kv('Cliente', '<a href="#clientes/' + r.customer_id + '">' + E(V.customerName(r.customer_id)) + '</a>') + kv('Ubicación', E(V.siteName(r.site_id)))
          : '<div class="banner banner-warn">' + I('user', 15) + '<div><b>Lead sin convertir</b><br>' + E(r.leadName || '—') + '<br>' + E(r.leadEmail || '') + '<br>' + E(r.leadPhone || '') + '</div></div>' +
            (V.can('clientes', 'crear') ? '<button class="btn btn-outline btn-sm" id="conv">' + I('plus', 14) + ' Convertir en cliente</button>' : '')) +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Actividad</h3></div><div class="card-b">' +
        UI.timeline(V.all('activity').filter(function (a) { return a.entity === 'service_request' && a.entity_id === r.id; })
          .map(function (a) { return { icon: 'clock', text: '<b>' + E(V.userName(a.user_id)) + '</b> ' + E(a.text), meta: V.frel(a.at) }; })
          .concat([{ icon: 'plus', text: 'Solicitud recibida por <b>' + E(r.channel) + '</b>', meta: V.fdatetime(r.created_at) }])) +
      '</div></div></div></div>';

    el.innerHTML = h;
    var stb = el.querySelector('#st');
    if (stb) stb.addEventListener('click', function () {
      UI.modal({ title: 'Cambiar estado de la solicitud',
        body: '<div class="field"><label for="ns">Nuevo estado</label><select class="select" id="ns">' +
          Object.keys(V.REQ_STATES).map(function (k) { return '<option value="' + k + '"' + (k === r.status ? ' selected' : '') + '>' + V.REQ_STATES[k].label + '</option>'; }).join('') +
          '</select></div><div class="field mt4" id="lrw"><label for="lr">Motivo de pérdida</label><input class="input" id="lr" value="' + E(r.lostReason) + '"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>',
        onMount: function (w) {
          function sync() { w.querySelector('#lrw').classList.toggle('hide', w.querySelector('#ns').value !== 'LOST'); }
          w.querySelector('#ns').addEventListener('change', sync); sync();
          w.querySelector('#ok').addEventListener('click', function () {
            var ns = w.querySelector('#ns').value;
            if (ns === 'LOST' && !w.querySelector('#lr').value.trim()) { UI.toast('Indica el motivo de pérdida.', 'err'); return; }
            V.update('requests', r.id, { status: ns, lostReason: ns === 'LOST' ? w.querySelector('#lr').value.trim() : '' });
            V.logActivity('service_request', r.id, 'Cambió el estado a ' + V.REQ_STATES[ns].label, 'status');
            UI.closeTop(); UI.toast('Estado actualizado.', 'ok'); APP.reload(); APP.refreshChrome();
          });
        } });
    });
    var ib = el.querySelector('#ins');
    if (ib) ib.addEventListener('click', function () { scheduleInspection(r); });
    var qb = el.querySelector('#q');
    if (qb) qb.addEventListener('click', function () { location.hash = 'presupuestos/nuevo?req=' + r.id; });
    var cv = el.querySelector('#conv');
    if (cv) cv.addEventListener('click', function () {
      var c = V.insert('customers', { kind: 'empresa', type: 'comercial', name: r.leadName || r.title,
        taxId: '', email: r.leadEmail || '', phone: r.leadPhone || '', whatsapp: '', address: '',
        tags: ['Convertido de lead'], source: r.channel, paymentTerms: 'Contado', creditLimit: 0,
        branch_id: 'br_1', notes: '', owner_user_id: r.owner_user_id });
      var s = V.insert('sites', { customer_id: c.id, name: 'Ubicación principal', address: '', propertyType: '', access: '', lat: 45, lng: 45, notes: '' });
      V.update('requests', r.id, { customer_id: c.id, site_id: s.id, status: 'CONTACTED' });
      V.logActivity('customer', c.id, 'Convirtió el lead ' + r.number + ' en cliente', 'create');
      UI.toast('Lead convertido en cliente.', 'ok'); APP.reload();
    });
  }

  /* ============================================================
     D) INSPECCIONES §6.4
     ============================================================ */
  views.inspecciones = function (el, id) {
    if (id) return inspectionDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Visitas e inspecciones técnicas',
      sub: 'Levantamiento previo al presupuesto, con checklist, mediciones, riesgos e informe PDF',
      actions: V.can('inspecciones', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Programar inspección</button>' : ''
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () { scheduleInspection(); });

    UI.table(host, {
      rows: function () { return V.all('inspections'); },
      search: function (x) { return x.number + ' ' + V.customerName(x.customer_id) + ' ' + x.template; },
      placeholder: 'Buscar inspección…', exportName: 'voltx-inspecciones',
      filters: [{ key: 'st', label: 'Todos los estados',
        options: [{ value: 'SCHEDULED', label: 'Programada' }, { value: 'COMPLETED', label: 'Completada' }],
        match: function (r, v) { return r.status === v; } }],
      cols: [
        { key: 'number', label: 'Número', render: function (x) { return '<b>' + E(x.number) + '</b>'; } },
        { key: 'cus', label: 'Cliente', sortVal: function (x) { return V.customerName(x.customer_id); },
          render: function (x) { return '<div class="bold">' + E(V.customerName(x.customer_id)) + '</div><div class="xs muted">' + E(V.siteName(x.site_id)) + '</div>'; } },
        { key: 'template', label: 'Plantilla', render: function (x) { return '<span class="chip">' + E(x.template) + '</span>'; } },
        { key: 'date', label: 'Fecha', render: function (x) { return V.fdatetime(x.date); } },
        { key: 'technician_id', label: 'Técnico', render: function (x) { return '<div class="row gap2">' + UI.avatar(V.techName(x.technician_id), 'sm') + '<span class="small">' + E(V.techName(x.technician_id)) + '</span></div>'; } },
        { key: 'risks', label: 'Riesgos', sortVal: function (x) { return (x.risks || []).length; },
          render: function (x) { return (x.risks || []).length ? '<span class="badge b-red">' + x.risks.length + '</span>' : '<span class="muted">—</span>'; } },
        { key: 'status', label: 'Estado', right: true, render: function (x) { return x.status === 'COMPLETED' ? '<span class="badge b-green">Completada</span>' : '<span class="badge b-blue">Programada</span>'; } }
      ],
      onRow: function (rid) { location.hash = 'inspecciones/' + rid; }
    });
  };

  function scheduleInspection(req) {
    var cus = V.all('customers');
    UI.modal({
      title: 'Programar inspección técnica', size: 'wide',
      body: '<div class="grid g2">' +
        '<div class="field"><label for="cu">Cliente <span class="req">*</span></label><select class="select" id="cu">' + opt(cus, req && req.customer_id) + '</select></div>' +
        '<div class="field"><label for="si">Ubicación</label><select class="select" id="si"></select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="dt">Fecha</label><input class="input" id="dt" type="date" value="' + V.ymd(V.addDays(V.today(), 2)) + '"></div>' +
        '<div class="field"><label for="hr">Hora</label><input class="input" id="hr" type="time" value="09:00"></div>' +
        '<div class="field"><label for="te">Técnico</label><select class="select" id="te">' + opt(V.all('technicians')) + '</select></div></div>' +
        '<div class="field mt4"><label for="tp">Plantilla de checklist</label><select class="select" id="tp">' +
        ['Tablero y protecciones','Levantamiento residencial','Diagnóstico de falla','Inspección industrial','Puesta a tierra']
          .map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Programar</button>',
      onMount: function (w) {
        var cu = w.querySelector('#cu'), si = w.querySelector('#si');
        function sync() { si.innerHTML = opt(sitesOf(cu.value), req && req.site_id); }
        cu.addEventListener('change', sync); sync();
        w.querySelector('#ok').addEventListener('click', function () {
          var d = new Date(w.querySelector('#dt').value + 'T' + w.querySelector('#hr').value);
          var x = V.insert('inspections', {
            number: V.nextNumber('inspection'), request_id: req ? req.id : null, customer_id: cu.value,
            site_id: si.value, technician_id: w.querySelector('#te').value, date: d.toISOString(),
            status: 'SCHEDULED', template: w.querySelector('#tp').value,
            answers: [], risks: [], recommendations: '', photos: [], signature: false
          });
          if (req) V.update('requests', req.id, { status: 'SCHEDULED' });
          V.logActivity('inspection', x.id, 'Programó la inspección ' + x.number, 'create');
          UI.closeTop(); UI.toast('Inspección ' + x.number + ' programada.', 'ok'); location.hash = 'inspecciones/' + x.id; APP.reload();
        });
      }
    });
  }

  function inspectionDetail(el, id) {
    var x = V.byId('inspections', id);
    if (!x) { el.innerHTML = PH({ title: 'Inspección' }) + UI.errorState('La inspección no existe.'); return; }
    var h = PH({
      crumbs: [{ label: 'Inspecciones', href: '#inspecciones' }, { label: x.number }],
      title: 'Inspección ' + x.number,
      sub: E(V.customerName(x.customer_id)) + ' · ' + E(V.siteName(x.site_id)) + ' · ' + V.fdatetime(x.date),
      actions: '<button class="btn btn-outline btn-sm" id="pdf">' + I('print', 15) + ' Informe PDF</button>' +
        (x.status === 'COMPLETED' && V.can('presupuestos', 'crear') ? '<button class="btn btn-primary btn-sm" id="toq">' + I('file', 15) + ' Convertir a presupuesto</button>' : '')
    });

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Mediciones y observaciones</h3>' +
        (x.status === 'COMPLETED' ? '<span class="badge b-green">Completada</span>' : '<span class="badge b-blue">Programada</span>') + '</div>';
    if (!(x.answers || []).length) {
      h += UI.emptyState({ icon: 'search', title: 'Inspección pendiente de ejecución', text: 'El técnico completará el checklist desde la PWA el día de la visita.' });
    } else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Punto verificado</th><th>Valor / observación</th><th class="right">Resultado</th></tr></thead><tbody>' +
        x.answers.map(function (a) {
          return '<tr><td class="bold">' + E(a.q) + '</td><td class="small">' + E(a.a) + '</td>' +
            '<td class="right">' + (a.ok ? '<span class="badge b-green">Conforme</span>' : '<span class="badge b-red">No conforme</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '</div>';

    if ((x.risks || []).length) {
      h += '<div class="card"><div class="card-h"><h3>Riesgos detectados</h3></div><div class="card-b col" style="gap:8px">' +
        x.risks.map(function (r) { return '<div class="banner banner-danger">' + I('alert', 15) + '<div>' + E(r) + '</div></div>'; }).join('') + '</div></div>';
    }
    if (x.recommendations) {
      h += '<div class="card"><div class="card-h"><h3>Recomendaciones</h3></div><div class="card-b"><p>' + E(x.recommendations) + '</p></div></div>';
    }
    h += '<div class="card"><div class="card-h"><h3>Registro fotográfico</h3><span class="small muted">' + (x.photos || []).length + ' archivo(s)</span></div><div class="card-b">' +
      ((x.photos || []).length ? '<div class="gallery">' + x.photos.map(function (p) {
        return '<div class="ph">' + I('camera', 18) + '<span class="xs" style="margin-top:4px">' + E(p) + '</span></div>';
      }).join('') + '</div>' : '<p class="small muted">Sin fotografías cargadas.</p>') + '</div></div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Plantilla', E(x.template)) + kv('Técnico', E(V.techName(x.technician_id))) +
        kv('Cliente', '<a href="#clientes/' + x.customer_id + '">' + E(V.customerName(x.customer_id)) + '</a>') +
        kv('Ubicación', E(V.siteName(x.site_id))) + kv('Fecha', V.fdatetime(x.date)) +
        kv('Firma del cliente', x.signature ? '<span class="badge b-green">Firmada</span>' : '<span class="badge b-gray">Pendiente</span>') +
        (x.request_id ? kv('Solicitud', '<a href="#solicitudes/' + x.request_id + '">' + E((V.byId('requests', x.request_id) || {}).number || '') + '</a>') : '') +
      '</div></div></div></div>';

    el.innerHTML = h;
    el.querySelector('#pdf').addEventListener('click', function () { printInspection(x); });
    var tq = el.querySelector('#toq');
    if (tq) tq.addEventListener('click', function () { location.hash = 'presupuestos/nuevo?ins=' + x.id; });
  }

  function printInspection(x) {
    var t = V.myTenant();
    UI.printDoc('Informe de inspección ' + x.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(t.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(t.address) + '<br>' + E(t.phone) + ' · ' + E(t.email) + '<br>' + E(t.taxId) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">INFORME DE INSPECCIÓN</h2><p style="font-size:13px"><b>' + E(x.number) + '</b><br>' + V.fdate(x.date, true) + '</p></div></div>' +
      '<div style="display:flex;gap:40px;margin-top:20px;font-size:12.5px">' +
      '<div><b>Cliente</b><br>' + E(V.customerName(x.customer_id)) + '</div>' +
      '<div><b>Ubicación</b><br>' + E(V.siteName(x.site_id)) + '</div>' +
      '<div><b>Técnico</b><br>' + E(V.techName(x.technician_id)) + '</div>' +
      '<div><b>Plantilla</b><br>' + E(x.template) + '</div></div>' +
      '<h3 style="margin-top:24px">Mediciones y verificaciones</h3>' +
      '<table><thead><tr><th>Punto</th><th>Valor</th><th>Resultado</th></tr></thead><tbody>' +
      (x.answers || []).map(function (a) { return '<tr><td>' + E(a.q) + '</td><td>' + E(a.a) + '</td><td>' + (a.ok ? 'Conforme' : 'NO CONFORME') + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      ((x.risks || []).length ? '<h3>Riesgos detectados</h3><ul style="padding-left:18px;list-style:disc">' + x.risks.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul>' : '') +
      (x.recommendations ? '<h3 style="margin-top:18px">Recomendaciones</h3><p>' + E(x.recommendations) + '</p>' : '') +
      '<div style="margin-top:56px;display:flex;gap:60px">' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Técnico responsable<br><b>' + E(V.techName(x.technician_id)) + '</b></div>' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Conformidad del cliente</div></div>' +
      '<p style="margin-top:30px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* ============================================================
     E) CATÁLOGO DE SERVICIOS §6.5
     ============================================================ */
  views.servicios = function (el) {
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Catálogo de servicios',
      sub: 'Estandariza precios, tiempos, materiales sugeridos, checklist y garantía',
      actions: V.can('servicios', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo servicio</button>' : ''
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', editService);

    UI.table(host, {
      rows: function () { return V.all('services'); },
      search: function (s) { return s.name + ' ' + s.category; },
      placeholder: 'Buscar servicio…', exportName: 'voltx-servicios',
      filters: [{ key: 'cat', label: 'Todas las categorías',
        options: uniq(V.all('services').map(function (s) { return s.category; })).map(function (c) { return { value: c, label: c }; }),
        match: function (r, v) { return r.category === v; } }],
      cols: [
        { key: 'name', label: 'Servicio', render: function (s) { return '<div class="bold">' + E(s.name) + '</div><div class="xs muted">' + E(s.category) + '</div>'; } },
        { key: 'unit', label: 'Unidad', render: function (s) { return '<span class="chip">' + E(s.unit) + '</span>'; } },
        { key: 'price', label: 'Precio base', right: true, render: function (s) { return '<b class="mono">' + V.money(s.price) + '</b>'; } },
        { key: 'cost', label: 'Costo', right: true, render: function (s) { return '<span class="mono muted">' + V.money(s.cost) + '</span>'; } },
        { key: 'margin', label: 'Margen', right: true, sortVal: function (s) { return (s.price - s.cost) / s.price; },
          render: function (s) { var m = ((s.price - s.cost) / s.price) * 100;
            return '<span class="badge ' + (m >= 40 ? 'b-green' : m >= 25 ? 'b-amber' : 'b-red') + '">' + m.toFixed(0) + '%</span>'; } },
        { key: 'duration', label: 'Duración', right: true, render: function (s) { return s.duration + ' h'; } },
        { key: 'checklist', label: 'Checklist', sortVal: function (s) { return (s.checklist || []).length; },
          render: function (s) { return (s.checklist || []).length + ' pasos'; } },
        { key: 'warranty', label: 'Garantía', right: true, render: function (s) { return s.warranty ? s.warranty + ' días' : '—'; } }
      ],
      onRow: function (rid) { editService(V.byId('services', rid)); }
    });
  };
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function editService(s) {
    var isNew = !s || !s.id;
    s = s || { name: '', category: '', unit: 'servicio', price: 0, cost: 0, duration: 1, materials: [], checklist: [], warranty: 90 };
    UI.modal({
      title: isNew ? 'Nuevo servicio' : s.name, size: 'wide',
      body: '<div class="grid g2">' +
        '<div class="field"><label for="n">Nombre <span class="req">*</span></label><input class="input" id="n" value="' + E(s.name) + '"></div>' +
        '<div class="field"><label for="c">Categoría</label><input class="input" id="c" value="' + E(s.category) + '" list="cats"><datalist id="cats">' +
          uniq(V.all('services').map(function (x) { return x.category; })).map(function (x) { return '<option value="' + E(x) + '">'; }).join('') + '</datalist></div>' +
        '</div><div class="grid g4 mt4">' +
        '<div class="field"><label for="u">Unidad</label><select class="select" id="u">' +
          ['servicio','punto','hora','metro','kit'].map(function (x) { return '<option' + (s.unit === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="p">Precio base</label><input class="input" id="p" type="number" step="0.01" value="' + s.price + '"></div>' +
        '<div class="field"><label for="co">Costo estimado</label><input class="input" id="co" type="number" step="0.01" value="' + s.cost + '"></div>' +
        '<div class="field"><label for="d">Duración (h)</label><input class="input" id="d" type="number" step="0.25" value="' + s.duration + '"></div>' +
        '</div>' +
        '<div class="field mt4"><label for="w">Garantía (días)</label><input class="input" id="w" type="number" value="' + s.warranty + '"></div>' +
        '<div class="field mt4"><label for="mt">Materiales sugeridos</label>' +
          '<div class="col" style="gap:4px">' + V.all('products').map(function (p) {
            return '<label class="check"><input type="checkbox" data-m="' + p.id + '"' + ((s.materials || []).indexOf(p.id) >= 0 ? ' checked' : '') + '><span>' + E(p.name) + ' <span class="xs muted">(' + E(p.sku) + ')</span></span></label>';
          }).join('') + '</div></div>' +
        '<div class="field mt4"><label for="ck">Checklist obligatorio (un paso por línea)</label>' +
          '<textarea class="textarea" id="ck" style="min-height:120px">' + E((s.checklist || []).join('\n')) + '</textarea></div>',
      footer: (isNew ? '' : '<button class="btn btn-ghost" id="del">Eliminar</button>') +
              '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv">Guardar</button>',
      onMount: function (w) {
        w.querySelector('#sv').addEventListener('click', function () {
          var n = w.querySelector('#n').value.trim();
          if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          var data = {
            name: n, category: w.querySelector('#c').value.trim() || 'General', unit: w.querySelector('#u').value,
            price: +w.querySelector('#p').value || 0, cost: +w.querySelector('#co').value || 0,
            duration: +w.querySelector('#d').value || 1, warranty: +w.querySelector('#w').value || 0,
            materials: Array.prototype.slice.call(w.querySelectorAll('[data-m]:checked')).map(function (i2) { return i2.dataset.m; }),
            checklist: w.querySelector('#ck').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
            active: true
          };
          if (isNew) V.insert('services', data); else V.update('services', s.id, data);
          V.logAudit(isNew ? 'CREATE' : 'UPDATE', 'service_catalog', s.id || n, n);
          UI.closeTop(); UI.toast('Servicio guardado.', 'ok'); APP.reload();
        });
        var d = w.querySelector('#del');
        if (d) d.addEventListener('click', function () {
          UI.confirm({ title: '¿Eliminar servicio?', body: 'Los presupuestos y órdenes existentes conservarán su descripción.', ok: 'Eliminar', danger: true }, function () {
            V.remove('services', s.id); V.logAudit('DELETE', 'service_catalog', s.id, s.name);
            UI.closeAll(); UI.toast('Servicio eliminado.', 'ok'); APP.reload();
          });
        });
      }
    });
  }

  /* ============================================================
     F) PRESUPUESTOS §6.6
     ============================================================ */
  views.presupuestos = function (el, param) {
    if (param && param.indexOf('nuevo') === 0) return quoteBuilder(el, null, param);
    if (param) return quoteDetail(el, param);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Presupuestos',
      sub: 'Versiones, márgenes internos, envío, aprobación digital y conversión a orden',
      actions: V.can('presupuestos', 'crear') ? '<a class="btn btn-primary btn-sm" href="#presupuestos/nuevo">' + I('plus', 15) + ' Nuevo presupuesto</a>' : ''
    });

    var qs = V.all('quotes');
    el.insertAdjacentHTML('beforeend', '<div class="grid g4 mb4">' +
      UI.kpi({ label: 'Pipeline abierto', value: V.money(qs.filter(function (q) { return ['SENT','VIEWED','REVIEW'].indexOf(q.status) >= 0; }).reduce(function (a, q) { return a + V.quoteTotals(q).total; }, 0)), icon: 'chart' }) +
      UI.kpi({ label: 'Aprobados', value: qs.filter(function (q) { return q.status === 'APPROVED'; }).length, icon: 'checkCircle', sub: 'Listos para convertir' }) +
      UI.kpi({ label: 'Por vencer', value: V.expiringQuotes().length, icon: 'clock', sub: 'Vigencia ≤ 5 días' }) +
      UI.kpi({ label: 'Tasa de aprobación', value: Math.round((qs.filter(function (q) { return q.status === 'APPROVED'; }).length / Math.max(1, qs.length)) * 100) + '%', icon: 'trend' }) +
      '</div>');
    el.appendChild(host);

    UI.table(host, {
      rows: function () { return V.all('quotes'); },
      search: function (q) { return q.number + ' ' + V.customerName(q.customer_id); },
      placeholder: 'Buscar por número o cliente…', exportName: 'voltx-presupuestos',
      sort: 'created_at', dir: 'desc',
      filters: [
        { key: 'st', label: 'Todos los estados', options: stateOpts(V.QUOTE_STATES), match: function (r, v) { return r.status === v; } },
        { key: 'ow', label: 'Todos los responsables', options: V.all('users').filter(function (u) { return ['ventas','owner','coordinador'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: u.name }; }), match: function (r, v) { return r.owner_user_id === v; } }
      ],
      cols: [
        { key: 'number', label: 'Número', render: function (q) { return '<b>' + E(q.number) + '</b> <span class="xs muted">V' + q.version + '</span>'; } },
        { key: 'cus', label: 'Cliente', sortVal: function (q) { return V.customerName(q.customer_id); },
          render: function (q) { return '<div class="bold">' + E(V.customerName(q.customer_id)) + '</div><div class="xs muted">' + E(V.siteName(q.site_id)) + '</div>'; } },
        { key: 'created_at', label: 'Emitido', render: function (q) { return V.fdate(q.created_at); } },
        { key: 'validUntil', label: 'Vigencia', render: function (q) {
            var d = V.daysTo(q.validUntil);
            return '<span class="small ' + (d < 0 ? 'prio-critica' : d <= 3 ? 'prio-alta' : '') + '">' + V.fdate(q.validUntil) + '</span>'; } },
        { key: 'total', label: 'Total', right: true, sortVal: function (q) { return V.quoteTotals(q).total; },
          render: function (q) { return '<b class="mono">' + V.money(V.quoteTotals(q).total) + '</b>'; } },
        { key: 'margin', label: 'Margen', right: true, sortVal: function (q) { return V.quoteTotals(q).margin; },
          render: function (q) { var m = V.quoteTotals(q).margin, min = V.myTenant().minMargin;
            return '<span class="badge ' + (m >= min ? 'b-green' : m >= min - 10 ? 'b-amber' : 'b-red') + '">' + m.toFixed(0) + '%</span>'; } },
        { key: 'status', label: 'Estado', right: true, render: function (q) { return UI.badge(V.QUOTE_STATES, q.status); } }
      ],
      onRow: function (rid) { location.hash = 'presupuestos/' + rid; }
    });
  };

  function quoteBuilder(el, quote, param) {
    if (!V.can('presupuestos', 'crear')) { el.innerHTML = APP.pageHeader({ title: 'Presupuestos' }) + UI.errorState('No tienes permiso para crear presupuestos.'); return; }
    var q = quote || {
      customer_id: '', site_id: '', items: [], discount: 0, taxRate: V.myTenant().taxRate,
      validUntil: V.ymd(V.addDays(V.today(), V.myTenant().quoteValidity)), advance: 50,
      scope: '', exclusions: '', terms: V.myTenant().paymentTerms, warranty: '90 días sobre mano de obra y materiales instalados.',
      notes: '', status: 'DRAFT', version: 1
    };
    // precarga desde solicitud/inspección
    var m = /req=([^&]+)/.exec(param || ''), mi = /ins=([^&]+)/.exec(param || '');
    if (m) { var r = V.byId('requests', m[1]); if (r) { q.customer_id = r.customer_id; q.site_id = r.site_id; q.request_id = r.id; q.scope = r.description; } }
    if (mi) { var ix = V.byId('inspections', mi[1]); if (ix) { q.customer_id = ix.customer_id; q.site_id = ix.site_id; q.inspection_id = ix.id; q.scope = ix.recommendations; } }

    function render() {
      var t = V.quoteTotals(q), minM = V.myTenant().minMargin;
      var h = PH({
        crumbs: [{ label: 'Presupuestos', href: '#presupuestos' }, { label: quote ? quote.number : 'Nuevo' }],
        title: quote ? 'Editar ' + quote.number : 'Nuevo presupuesto',
        sub: 'Constructor visual: agrega servicios del catálogo, materiales y mano de obra',
        actions: '<a class="btn btn-outline btn-sm" href="#presupuestos">Cancelar</a>' +
                 '<button class="btn btn-primary btn-sm" id="save">' + I('check', 15) + ' Guardar presupuesto</button>'
      });

      h += '<div class="grid g-2-1"><div class="col">' +
        '<div class="card"><div class="card-h"><h3>Cliente y vigencia</h3></div><div class="card-b">' +
          '<div class="grid g2">' +
            '<div class="field"><label for="cu">Cliente <span class="req">*</span></label><select class="select" id="cu"><option value="">Selecciona…</option>' + opt(V.all('customers'), q.customer_id) + '</select></div>' +
            '<div class="field"><label for="si">Ubicación</label><select class="select" id="si">' + opt(sitesOf(q.customer_id), q.site_id) + '</select></div>' +
          '</div><div class="grid g3 mt4">' +
            '<div class="field"><label for="vu">Válido hasta</label><input class="input" id="vu" type="date" value="' + q.validUntil + '"></div>' +
            '<div class="field"><label for="tx">Impuesto (%)</label><input class="input" id="tx" type="number" value="' + q.taxRate + '"></div>' +
            '<div class="field"><label for="ad">Anticipo (%)</label><input class="input" id="ad" type="number" value="' + q.advance + '"></div>' +
          '</div></div></div>' +

        '<div class="card"><div class="card-h"><h3>Ítems</h3>' +
          '<div class="row gap2"><button class="btn btn-outline btn-sm" id="addsvc">' + I('plus', 14) + ' Del catálogo</button>' +
          '<button class="btn btn-outline btn-sm" id="addmat">' + I('box', 14) + ' Material</button>' +
          '<button class="btn btn-outline btn-sm" id="addfree">' + I('edit', 14) + ' Línea libre</button></div></div>';
      if (!q.items.length) {
        h += UI.emptyState({ icon: 'file', title: 'Sin ítems', text: 'Agrega servicios del catálogo, materiales o líneas libres para construir la cotización.' });
      } else {
        h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Descripción</th><th style="width:80px">Cant.</th><th style="width:90px">Unidad</th>' +
          '<th style="width:110px" class="right">Precio</th><th style="width:110px" class="right">Costo</th><th class="right">Subtotal</th><th></th></tr></thead><tbody>';
        q.items.forEach(function (it, i) {
          h += '<tr><td><input class="input" data-f="desc" data-i="' + i + '" value="' + E(it.desc) + '">' +
            '<span class="xs muted">' + E({ servicio: 'Servicio', material: 'Material', mano_obra: 'Mano de obra', equipo: 'Equipo' }[it.type] || it.type) + '</span></td>' +
            '<td><input class="input" data-f="qty" data-i="' + i + '" type="number" step="0.01" value="' + it.qty + '"></td>' +
            '<td><input class="input" data-f="unit" data-i="' + i + '" value="' + E(it.unit) + '"></td>' +
            '<td><input class="input right" data-f="price" data-i="' + i + '" type="number" step="0.01" value="' + it.price + '"></td>' +
            '<td><input class="input right" data-f="cost" data-i="' + i + '" type="number" step="0.01" value="' + (it.cost || 0) + '"></td>' +
            '<td class="right mono bold">' + V.money(it.qty * it.price) + '</td>' +
            '<td class="right"><button class="btn btn-ghost btn-sm btn-icon" data-del="' + i + '" aria-label="Eliminar">' + I('trash', 15) + '</button></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>' +

        '<div class="card"><div class="card-h"><h3>Contenido del documento</h3></div><div class="card-b col">' +
          '<div class="field"><label for="sc">Alcance</label><textarea class="textarea" id="sc">' + E(q.scope) + '</textarea></div>' +
          '<div class="field"><label for="ex">Exclusiones</label><textarea class="textarea" id="ex" style="min-height:70px">' + E(q.exclusions) + '</textarea></div>' +
          '<div class="field"><label for="te">Términos y condiciones</label><textarea class="textarea" id="te" style="min-height:70px">' + E(q.terms) + '</textarea></div>' +
          '<div class="field"><label for="wa">Garantía</label><input class="input" id="wa" value="' + E(q.warranty) + '"></div>' +
          '<div class="field"><label for="no">Notas internas (no visibles para el cliente)</label><textarea class="textarea" id="no" style="min-height:60px">' + E(q.notes) + '</textarea></div>' +
        '</div></div></div>';

      /* resumen lateral */
      h += '<div><div class="card" style="position:sticky;top:76px"><div class="card-h"><h3>Resumen</h3></div><div class="card-b col" style="gap:10px">' +
        kv('Subtotal', V.money(t.sub)) +
        '<div class="spread"><span class="small muted">Descuento (%)</span><input class="input" id="dc" type="number" style="width:84px;height:30px;text-align:right" value="' + q.discount + '"></div>' +
        kv('Descuento', '-' + V.money(t.disc)) + kv('Base imponible', V.money(t.base)) +
        kv(V.myTenant().taxName + ' (' + q.taxRate + '%)', V.money(t.tax)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        '<div class="spread"><span class="bold">Total</span><span style="font-size:20px;font-weight:700;color:var(--black)">' + V.money(t.total) + '</span></div>' +
        kv('Anticipo (' + q.advance + '%)', V.money(t.advance)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        '<div class="spread"><span class="small muted">Costo interno</span><span class="small mono">' + V.money(t.cost) + '</span></div>' +
        '<div class="spread"><span class="bold small">Margen interno</span><span class="badge ' + (t.margin >= minM ? 'b-green' : t.margin >= minM - 10 ? 'b-amber' : 'b-red') + '">' + t.margin.toFixed(1) + '%</span></div>' +
        (t.margin < minM ? '<div class="banner banner-warn">' + I('alert', 15) + '<div>El margen está por debajo del mínimo de la empresa (' + minM + '%). Requerirá aprobación interna.</div></div>' : '') +
        '</div></div></div></div>';

      el.innerHTML = h;

      /* bindings */
      var cu = el.querySelector('#cu');
      cu.addEventListener('change', function () { q.customer_id = this.value; q.site_id = ''; render(); });
      el.querySelector('#si').addEventListener('change', function () { q.site_id = this.value; });
      el.querySelector('#vu').addEventListener('change', function () { q.validUntil = this.value; });
      el.querySelector('#tx').addEventListener('input', function () { q.taxRate = +this.value || 0; render(); });
      el.querySelector('#ad').addEventListener('input', function () { q.advance = +this.value || 0; render(); });
      el.querySelector('#dc').addEventListener('input', function () { q.discount = +this.value || 0; render(); });
      ['sc:scope', 'ex:exclusions', 'te:terms', 'wa:warranty', 'no:notes'].forEach(function (p) {
        var ids = p.split(':');
        el.querySelector('#' + ids[0]).addEventListener('input', function () { q[ids[1]] = this.value; });
      });
      el.querySelectorAll('[data-f]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var i = +this.dataset.i, f = this.dataset.f;
          q.items[i][f] = (f === 'qty' || f === 'price' || f === 'cost') ? (+this.value || 0) : this.value;
          render();
        });
      });
      el.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () { q.items.splice(+this.dataset.del, 1); render(); });
      });
      el.querySelector('#addsvc').addEventListener('click', function () { pickService(function (s) {
        q.items.push({ type: 'servicio', ref: s.id, desc: s.name, qty: 1, unit: s.unit, price: s.price, cost: s.cost }); render();
      }); });
      el.querySelector('#addmat').addEventListener('click', function () { pickProduct(function (p) {
        q.items.push({ type: 'material', ref: p.id, desc: p.name, qty: 1, unit: p.unit, price: p.price, cost: p.cost }); render();
      }); });
      el.querySelector('#addfree').addEventListener('click', function () {
        q.items.push({ type: 'mano_obra', ref: null, desc: 'Mano de obra', qty: 1, unit: 'hora', price: 22, cost: 12 }); render();
      });
      el.querySelector('#save').addEventListener('click', function () {
        if (!q.customer_id) { UI.toast('Selecciona el cliente.', 'err'); return; }
        if (!q.items.length) { UI.toast('Agrega al menos un ítem.', 'err'); return; }
        if (quote) {
          quote.version += 1;
          quote.history = (quote.history || []).concat([{ v: quote.version, at: new Date().toISOString(), by: V.getSession().user_id, note: 'Edición del presupuesto' }]);
          V.update('quotes', quote.id, q);
          V.logActivity('quote', quote.id, 'Actualizó el presupuesto a la versión V' + quote.version, 'update');
          UI.toast('Presupuesto actualizado (V' + quote.version + ').', 'ok');
          location.hash = 'presupuestos/' + quote.id;
        } else {
          q.number = V.nextNumber('quote');
          q.owner_user_id = V.getSession().user_id;
          q.currency = V.myTenant().currency;
          q.history = [{ v: 1, at: new Date().toISOString(), by: V.getSession().user_id, note: 'Versión inicial' }];
          var nq = V.insert('quotes', q);
          if (q.request_id) V.update('requests', q.request_id, { status: 'QUOTING' });
          V.logActivity('quote', nq.id, 'Creó el presupuesto ' + nq.number, 'create');
          V.logAudit('CREATE', 'quote', nq.number, V.money(V.quoteTotals(nq).total));
          UI.toast('Presupuesto ' + nq.number + ' creado.', 'ok');
          location.hash = 'presupuestos/' + nq.id;
        }
      });
    }
    render();
  }

  function pickService(cb) {
    UI.modal({ title: 'Agregar del catálogo', size: 'wide',
      body: '<div class="search" style="position:relative;margin-bottom:12px">' + I('search', 15) +
        '<input class="input" id="sq" placeholder="Buscar servicio…" style="padding-left:32px"></div><div id="lst"></div>',
      footer: null,
      onMount: function (w) {
        function draw(f) {
          var rows = V.all('services').filter(function (s) { return !f || (s.name + s.category).toLowerCase().indexOf(f) >= 0; });
          w.querySelector('#lst').innerHTML = rows.length ? '<div class="col" style="gap:6px;max-height:380px;overflow:auto">' +
            rows.map(function (s) {
              return '<button class="file-row" data-s="' + s.id + '" style="cursor:pointer;text-align:left;width:100%">' +
                '<span class="file-ico">' + I('wrench', 15) + '</span>' +
                '<span style="min-width:0"><b class="small" style="display:block">' + E(s.name) + '</b>' +
                '<span class="xs muted">' + E(s.category) + ' · ' + s.duration + ' h · ' + (s.checklist || []).length + ' pasos</span></span>' +
                '<span style="margin-left:auto" class="bold mono">' + V.money(s.price) + '</span></button>';
            }).join('') + '</div>' : UI.emptyState({ icon: 'search', title: 'Sin coincidencias', text: '' });
          w.querySelectorAll('[data-s]').forEach(function (b) {
            b.addEventListener('click', function () { UI.closeTop(); cb(V.byId('services', this.dataset.s)); });
          });
        }
        draw('');
        w.querySelector('#sq').addEventListener('input', function () { draw(this.value.toLowerCase()); });
      } });
  }
  function pickProduct(cb) {
    UI.modal({ title: 'Agregar material', size: 'wide',
      body: '<div class="search" style="position:relative;margin-bottom:12px">' + I('search', 15) +
        '<input class="input" id="pq" placeholder="Buscar por SKU o nombre…" style="padding-left:32px"></div><div id="lst"></div>',
      footer: null,
      onMount: function (w) {
        function draw(f) {
          var rows = V.all('products').filter(function (p) { return !f || (p.name + p.sku).toLowerCase().indexOf(f) >= 0; });
          w.querySelector('#lst').innerHTML = '<div class="col" style="gap:6px;max-height:380px;overflow:auto">' +
            rows.map(function (p) {
              var st = V.stockOf(p);
              return '<button class="file-row" data-p="' + p.id + '" style="cursor:pointer;text-align:left;width:100%">' +
                '<span class="file-ico">' + I('box', 15) + '</span>' +
                '<span style="min-width:0"><b class="small" style="display:block">' + E(p.name) + '</b>' +
                '<span class="xs muted">' + E(p.sku) + ' · ' + st + ' ' + E(p.unit) + ' disponibles' + (st < p.min ? ' · <span style="color:var(--danger)">bajo mínimo</span>' : '') + '</span></span>' +
                '<span style="margin-left:auto" class="bold mono">' + V.money(p.price) + '</span></button>';
            }).join('') + '</div>';
          w.querySelectorAll('[data-p]').forEach(function (b) {
            b.addEventListener('click', function () { UI.closeTop(); cb(V.byId('products', this.dataset.p)); });
          });
        }
        draw('');
        w.querySelector('#pq').addEventListener('input', function () { draw(this.value.toLowerCase()); });
      } });
  }

  function quoteDetail(el, id) {
    var q = V.byId('quotes', id);
    if (!q) { el.innerHTML = PH({ title: 'Presupuesto' }) + UI.errorState('El presupuesto no existe.'); return; }
    var t = V.quoteTotals(q), minM = V.myTenant().minMargin;
    var next = V.QUOTE_STATES[q.status].next;

    var acts = '<button class="btn btn-outline btn-sm" id="pdf">' + I('print', 15) + ' PDF</button>';
    if (V.can('presupuestos', 'editar') && ['DRAFT', 'REVIEW', 'REJECTED', 'EXPIRED'].indexOf(q.status) >= 0)
      acts += '<button class="btn btn-outline btn-sm" id="edit">' + I('edit', 15) + ' Editar (nueva versión)</button>';
    if (V.can('presupuestos', 'editar') && next.indexOf('SENT') >= 0)
      acts += '<button class="btn btn-outline btn-sm" id="send">' + I('send', 15) + ' Enviar al cliente</button>';
    if (V.can('presupuestos', 'aprobar') && next.indexOf('APPROVED') >= 0)
      acts += '<button class="btn btn-primary btn-sm" id="apr">' + I('check', 15) + ' Registrar aprobación</button>';
    if (q.status === 'APPROVED' && V.can('ordenes', 'crear'))
      acts += '<button class="btn btn-primary btn-sm" id="conv">' + I('clipboard', 15) + ' Convertir a orden / proyecto</button>';

    var h = PH({
      crumbs: [{ label: 'Presupuestos', href: '#presupuestos' }, { label: q.number }],
      title: q.number + '  ·  ' + V.money(t.total),
      sub: E(V.customerName(q.customer_id)) + ' · ' + E(V.siteName(q.site_id)) + ' · Versión V' + q.version + ' · ' + UI.badge(V.QUOTE_STATES, q.status),
      actions: acts
    });

    if (V.daysTo(q.validUntil) < 0 && ['APPROVED', 'REJECTED'].indexOf(q.status) < 0) {
      h += '<div class="banner banner-danger mb4">' + I('alert', 16) + '<div><b>Presupuesto vencido.</b> La vigencia terminó el ' + V.fdate(q.validUntil) + '. Genera una nueva versión para reactivarlo.</div></div>';
    }
    if (t.margin < minM) {
      h += '<div class="banner banner-warn mb4">' + I('alert', 16) + '<div><b>Margen por debajo del mínimo.</b> ' + t.margin.toFixed(1) + '% frente al ' + minM + '% exigido por la empresa. Requiere aprobación interna.</div></div>';
    }

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Ítems del presupuesto</h3></div><div class="tbl-wrap"><table class="tbl">' +
      '<thead><tr><th>Descripción</th><th class="right">Cant.</th><th>Unidad</th><th class="right">Precio</th><th class="right">Subtotal</th>' +
      (V.can('presupuestos', 'ver') ? '<th class="right">Costo interno</th>' : '') + '</tr></thead><tbody>' +
      q.items.map(function (it) {
        return '<tr><td><b>' + E(it.desc) + '</b><div class="xs muted">' + E({ servicio: 'Servicio', material: 'Material', mano_obra: 'Mano de obra', equipo: 'Equipo' }[it.type] || it.type) + '</div></td>' +
          '<td class="right mono">' + it.qty + '</td><td class="small">' + E(it.unit) + '</td>' +
          '<td class="right mono">' + V.money(it.price) + '</td><td class="right mono bold">' + V.money(it.qty * it.price) + '</td>' +
          '<td class="right mono muted">' + V.money(it.qty * (it.cost || 0)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    ['scope:Alcance', 'exclusions:Exclusiones', 'terms:Términos y condiciones', 'warranty:Garantía'].forEach(function (p) {
      var ids = p.split(':');
      if (q[ids[0]]) h += '<div class="card"><div class="card-h"><h3>' + ids[1] + '</h3></div><div class="card-b"><p>' + E(q[ids[0]]) + '</p></div></div>';
    });

    h += '<div class="card"><div class="card-h"><h3>Historial de versiones</h3></div><div class="card-b">' +
      UI.timeline((q.history || []).slice().reverse().map(function (hh) {
        return { icon: 'file', text: '<b>V' + hh.v + '</b> — ' + E(hh.note), meta: V.userName(hh.by) + ' · ' + V.fdatetime(hh.at) };
      })) + '</div></div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Totales</h3></div><div class="card-b col" style="gap:9px">' +
        kv('Subtotal', V.money(t.sub)) + (q.discount ? kv('Descuento (' + q.discount + '%)', '-' + V.money(t.disc)) : '') +
        kv('Base imponible', V.money(t.base)) + kv(V.myTenant().taxName + ' (' + q.taxRate + '%)', V.money(t.tax)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        '<div class="spread"><span class="bold">Total</span><span style="font-size:20px;font-weight:700;color:var(--black)">' + V.money(t.total) + '</span></div>' +
        kv('Anticipo solicitado', V.money(t.advance)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        kv('Costo interno', V.money(t.cost)) +
        '<div class="spread"><span class="small bold">Margen</span><span class="badge ' + (t.margin >= minM ? 'b-green' : 'b-red') + '">' + t.margin.toFixed(1) + '%</span></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Cliente', '<a href="#clientes/' + q.customer_id + '">' + E(V.customerName(q.customer_id)) + '</a>') +
        kv('Ubicación', E(V.siteName(q.site_id))) + kv('Responsable', E(V.userName(q.owner_user_id))) +
        kv('Emitido', V.fdate(q.created_at)) + kv('Vigencia', V.fdate(q.validUntil)) +
        (q.request_id ? kv('Solicitud', '<a href="#solicitudes/' + q.request_id + '">' + E((V.byId('requests', q.request_id) || {}).number || '') + '</a>') : '') +
        (q.inspection_id ? kv('Inspección', '<a href="#inspecciones/' + q.inspection_id + '">' + E((V.byId('inspections', q.inspection_id) || {}).number || '') + '</a>') : '') +
      '</div></div>' +
      (q.notes ? '<div class="card"><div class="card-h"><h3>Notas internas</h3></div><div class="card-b"><p class="small">' + E(q.notes) + '</p></div></div>' : '') +
      '</div></div>';

    el.innerHTML = h;

    el.querySelector('#pdf').addEventListener('click', function () { printQuote(q); });
    bind('#edit', function () { quoteBuilder(el, q, ''); });
    bind('#send', function () {
      UI.confirm({ title: 'Enviar presupuesto al cliente', body: 'Se enviará por correo a ' + ((V.byId('customers', q.customer_id) || {}).email || 'el cliente') + ' y quedará disponible en su portal.', ok: 'Enviar' },
        function () {
          V.update('quotes', q.id, { status: 'SENT' });
          V.logActivity('quote', q.id, 'Envió el presupuesto V' + q.version + ' al cliente', 'send');
          V.logAudit('UPDATE', 'quote', q.number, 'Estado → SENT');
          UI.toast('Presupuesto enviado. Se programó un recordatorio automático a los 3 días.', 'ok'); APP.reload();
        });
    });
    bind('#apr', function () {
      UI.modal({ title: 'Registrar respuesta del cliente',
        body: '<div class="field"><label for="rs">Resultado</label><select class="select" id="rs"><option value="APPROVED">Aprobado</option><option value="REJECTED">Rechazado</option></select></div>' +
              '<div class="field mt4"><label for="cm">Comentario del cliente</label><textarea class="textarea" id="cm"></textarea></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>',
        onMount: function (w) { w.querySelector('#ok').addEventListener('click', function () {
          var rs = w.querySelector('#rs').value, cm = w.querySelector('#cm').value.trim();
          V.update('quotes', q.id, { status: rs });
          V.logActivity('quote', q.id, (rs === 'APPROVED' ? 'Registró la aprobación' : 'Registró el rechazo') + ' del cliente' + (cm ? ': ' + cm : ''), 'status');
          V.logAudit('UPDATE', 'quote', q.number, 'Estado → ' + rs);
          if (rs === 'APPROVED' && q.request_id) V.update('requests', q.request_id, { status: 'WON' });
          UI.closeTop(); UI.toast(rs === 'APPROVED' ? 'Presupuesto aprobado.' : 'Presupuesto rechazado.', 'ok'); APP.reload();
        }); } });
    });
    bind('#conv', function () { convertQuote(q); });

    function bind(sel, fn) { var b = el.querySelector(sel); if (b) b.addEventListener('click', fn); }
  }

  function convertQuote(q) {
    UI.modal({
      title: 'Convertir presupuesto aprobado',
      subtitle: q.number + ' · ' + V.money(V.quoteTotals(q).total),
      body: '<div class="role-pick">' +
        '<button type="button" data-k="wo"><span class="kpi-ico">' + I('clipboard', 16) + '</span>' +
          '<span><b class="small" style="display:block">Crear una orden de trabajo</b><span class="xs muted">Para trabajos de una sola jornada</span></span></button>' +
        '<button type="button" data-k="prj"><span class="kpi-ico">' + I('layers', 16) + '</span>' +
          '<span><b class="small" style="display:block">Crear un proyecto</b><span class="xs muted">Varias jornadas, hitos y múltiples órdenes</span></span></button>' +
        '<button type="button" data-k="inv"><span class="kpi-ico">' + I('receipt', 16) + '</span>' +
          '<span><b class="small" style="display:block">Generar factura de anticipo</b><span class="xs muted">' + V.money(V.quoteTotals(q).advance) + ' (' + q.advance + '%)</span></span></button>' +
        '</div>',
      footer: null,
      onMount: function (w) {
        w.querySelectorAll('[data-k]').forEach(function (b) {
          b.addEventListener('click', function () {
            var k = this.dataset.k; UI.closeTop();
            if (k === 'wo') {
              var svc = q.items.filter(function (i) { return i.type === 'servicio'; })[0];
              var s = svc ? V.byId('services', svc.ref) : null;
              var wo = V.insert('workOrders', {
                number: V.nextNumber('wo'), customer_id: q.customer_id, site_id: q.site_id, quote_id: q.id,
                title: (svc ? svc.desc : 'Trabajo según ' + q.number), type: 'instalacion', priority: 'normal',
                status: 'DRAFT', start: V.addDays(V.today(), 2).toISOString(), end: V.addDays(V.today(), 2).toISOString(),
                estimated: s ? s.duration : 4, technicians: [], service_id: s ? s.id : null,
                description: q.scope, branch_id: (V.byId('customers', q.customer_id) || {}).branch_id || 'br_1',
                checklist: (s ? s.checklist : []).map(function (c) { return { text: c, done: false, required: true }; }),
                materials: q.items.filter(function (i) { return i.type === 'material'; }).map(function (i) {
                  return { product_id: i.ref, planned: i.qty, used: 0, warehouse_id: 'wh_1' }; }),
                timeEntries: [], photos: [], history: [{ status: 'DRAFT', at: new Date().toISOString(), by: V.getSession().user_id, note: 'Creada desde ' + q.number }]
              });
              V.logActivity('work_order', wo.id, 'Creó la orden ' + wo.number + ' desde el presupuesto ' + q.number, 'create');
              UI.toast('Orden ' + wo.number + ' creada.', 'ok'); location.hash = 'ordenes/' + wo.id;
            }
            if (k === 'prj') {
              var p = V.insert('projects', {
                code: V.nextNumber('project'), name: 'Proyecto según ' + q.number, customer_id: q.customer_id,
                site_id: q.site_id, quote_id: q.id, manager_user_id: V.getSession().user_id, team: [],
                status: 'PLANNING', progress: 0, start: V.ymd(V.addDays(V.today(), 3)), end: V.ymd(V.addDays(V.today(), 30)),
                realStart: null, realEnd: null, budget: V.quoteTotals(q).total, cost: 0,
                branch_id: (V.byId('customers', q.customer_id) || {}).branch_id || 'br_1',
                description: q.scope, changeOrders: []
              });
              V.logActivity('project', p.id, 'Creó el proyecto ' + p.code + ' desde ' + q.number, 'create');
              UI.toast('Proyecto ' + p.code + ' creado.', 'ok'); location.hash = 'proyectos/' + p.id;
            }
            if (k === 'inv') {
              var tt = V.quoteTotals(q);
              var inv = V.insert('invoices', {
                number: V.nextNumber('invoice'), customer_id: q.customer_id, quote_id: q.id, wo_id: null, project_id: null,
                status: 'ISSUED', date: V.ymd(V.today()), due: V.ymd(V.addDays(V.today(), 15)),
                items: [{ desc: 'Anticipo ' + q.advance + '% — ' + q.number, qty: 1, price: tt.advance / (1 + q.taxRate / 100) }],
                taxRate: q.taxRate, discount: 0, notes: 'Anticipo del presupuesto ' + q.number
              });
              V.logActivity('invoice', inv.id, 'Generó la factura de anticipo ' + inv.number, 'create');
              UI.toast('Factura ' + inv.number + ' generada.', 'ok'); location.hash = 'facturacion/' + inv.id;
            }
          });
        });
      }
    });
  }

  function printQuote(q) {
    var t = V.quoteTotals(q), tn = V.myTenant(), c = V.byId('customers', q.customer_id) || {};
    UI.printDoc('Presupuesto ' + q.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(tn.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(tn.address) + '<br>' + E(tn.phone) + ' · ' + E(tn.email) + '<br>' + E(tn.taxId) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">PRESUPUESTO</h2><p style="font-size:13px"><b>' + E(q.number) + '</b> · V' + q.version + '<br>' +
      V.fdate(q.created_at, true) + '<br><span style="color:#6B7280">Válido hasta ' + V.fdate(q.validUntil, true) + '</span></p></div></div>' +
      '<div style="display:flex;gap:48px;margin-top:20px;font-size:12.5px">' +
      '<div><b>Cliente</b><br>' + E(c.name) + '<br>' + E(c.taxId || '') + '<br>' + E(c.address || '') + '</div>' +
      '<div><b>Ubicación del trabajo</b><br>' + E(V.siteName(q.site_id)) + '</div></div>' +
      (q.scope ? '<h3 style="margin-top:22px">Alcance</h3><p>' + E(q.scope) + '</p>' : '') +
      '<table><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th>Unidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      q.items.map(function (it) {
        return '<tr><td>' + E(it.desc) + '</td><td style="text-align:right">' + it.qty + '</td><td>' + E(it.unit) + '</td>' +
          '<td style="text-align:right">' + V.money(it.price) + '</td><td style="text-align:right">' + V.money(it.qty * it.price) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot"><table><tr><td>Subtotal</td><td style="text-align:right">' + V.money(t.sub) + '</td></tr>' +
      (q.discount ? '<tr><td>Descuento ' + q.discount + '%</td><td style="text-align:right">-' + V.money(t.disc) + '</td></tr>' : '') +
      '<tr><td>' + E(tn.taxName) + ' ' + q.taxRate + '%</td><td style="text-align:right">' + V.money(t.tax) + '</td></tr>' +
      '<tr style="font-weight:700;font-size:15px"><td style="border-top:2px solid #111">TOTAL</td><td style="text-align:right;border-top:2px solid #111">' + V.money(t.total) + '</td></tr>' +
      '<tr><td>Anticipo ' + q.advance + '%</td><td style="text-align:right">' + V.money(t.advance) + '</td></tr></table></div>' +
      (q.exclusions ? '<h3 style="margin-top:20px">Exclusiones</h3><p>' + E(q.exclusions) + '</p>' : '') +
      (q.terms ? '<h3 style="margin-top:16px">Términos y condiciones</h3><p>' + E(q.terms) + '</p>' : '') +
      (q.warranty ? '<h3 style="margin-top:16px">Garantía</h3><p>' + E(q.warranty) + '</p>' : '') +
      '<div style="margin-top:50px;display:flex;gap:60px">' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Por ' + E(tn.name) + '<br><b>' + E(V.userName(q.owner_user_id)) + '</b></div>' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Aceptación del cliente<br>Nombre, firma y fecha</div></div>' +
      '<p style="margin-top:28px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* exportar utilidades a otros archivos de vistas */
  APP.helpers = { kv: kv, miniList: miniList, listTable: listTable, opt: opt, stateOpts: stateOpts,
                  sitesOf: sitesOf, uniq: uniq, pickProduct: pickProduct, pickService: pickService, miniMap: miniMap };
})();
