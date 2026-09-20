/* ============================================================
   VOLTX — Módulos: Proyectos, Órdenes de trabajo, Agenda y
   despacho, Mapa operativo, Técnicos y equipos. §6.7 – §6.11
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX, PH = APP.pageHeader, views = APP.views;
  var H = APP.helpers, kv = H.kv, opt = H.opt, stateOpts = H.stateOpts, sitesOf = H.sitesOf, listTable = H.listTable;

  /* ============================================================
     G) PROYECTOS §6.7
     ============================================================ */
  views.proyectos = function (el, id) {
    if (id) return projectDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Proyectos',
      sub: 'Trabajos de varias jornadas con hitos, órdenes, materiales, costos y dossier de cierre',
      actions: V.can('proyectos', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo proyecto</button>' : ''
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', newProject);

    UI.table(host, {
      rows: function () { return V.all('projects'); },
      search: function (p) { return p.code + ' ' + p.name + ' ' + V.customerName(p.customer_id); },
      placeholder: 'Buscar proyecto…', exportName: 'voltx-proyectos',
      filters: [{ key: 'st', label: 'Todos los estados', options: stateOpts(V.PROJECT_STATES), match: function (r, v) { return r.status === v; } }],
      cols: [
        { key: 'code', label: 'Código', render: function (p) { return '<b>' + E(p.code) + '</b>'; } },
        { key: 'name', label: 'Proyecto', render: function (p) { return '<div class="bold">' + E(p.name) + '</div><div class="xs muted">' + E(V.customerName(p.customer_id)) + ' · ' + E(V.siteName(p.site_id)) + '</div>'; } },
        { key: 'manager_user_id', label: 'Responsable', render: function (p) { return '<span class="small">' + E(V.userName(p.manager_user_id)) + '</span>'; } },
        { key: 'end', label: 'Fechas', render: function (p) { return '<div class="small">' + V.fdate(p.start) + '</div><div class="xs muted">→ ' + V.fdate(p.end) + '</div>'; } },
        { key: 'progress', label: 'Avance', render: function (p) {
            return '<div style="min-width:110px"><div class="spread xs"><span>' + p.progress + '%</span></div>' +
              '<div class="bar mt2"><i style="width:' + p.progress + '%"></i></div></div>'; } },
        { key: 'budget', label: 'Presupuesto', right: true, render: function (p) { return '<b class="mono">' + V.money(p.budget) + '</b>'; } },
        { key: 'margin', label: 'Margen', right: true, sortVal: function (p) { return V.projectFinance(p).margin; },
          render: function (p) { var m = V.projectFinance(p).margin;
            return '<span class="badge ' + (m >= 25 ? 'b-green' : m >= 10 ? 'b-amber' : 'b-red') + '">' + m.toFixed(0) + '%</span>'; } },
        { key: 'status', label: 'Estado', right: true, render: function (p) { return UI.badge(V.PROJECT_STATES, p.status); } }
      ],
      onRow: function (rid) { location.hash = 'proyectos/' + rid; }
    });
  };

  function newProject() {
    UI.modal({
      title: 'Nuevo proyecto', size: 'wide',
      body: '<div class="field"><label for="n">Nombre del proyecto <span class="req">*</span></label><input class="input" id="n"></div>' +
        '<div class="grid g2 mt4">' +
        '<div class="field"><label for="cu">Cliente <span class="req">*</span></label><select class="select" id="cu">' + opt(V.all('customers')) + '</select></div>' +
        '<div class="field"><label for="si">Ubicación</label><select class="select" id="si"></select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="mg">Responsable</label><select class="select" id="mg">' + opt(V.all('users').filter(function (u) { return ['owner','coordinador'].indexOf(u.role) >= 0; }), V.getSession().user_id) + '</select></div>' +
        '<div class="field"><label for="st">Inicio previsto</label><input class="input" id="st" type="date" value="' + V.ymd(V.today()) + '"></div>' +
        '<div class="field"><label for="en">Fin previsto</label><input class="input" id="en" type="date" value="' + V.ymd(V.addDays(V.today(), 30)) + '"></div></div>' +
        '<div class="grid g2 mt4">' +
        '<div class="field"><label for="bu">Presupuesto aprobado</label><input class="input" id="bu" type="number" step="0.01" value="0"></div>' +
        '<div class="field"><label for="qu">Presupuesto vinculado</label><select class="select" id="qu"><option value="">— Ninguno —</option>' +
          opt(V.all('quotes').filter(function (q) { return q.status === 'APPROVED'; }), null, function (q) { return q.id; }, function (q) { return q.number + ' — ' + V.money(V.quoteTotals(q).total); }) + '</select></div></div>' +
        '<div class="field mt4"><label for="de">Descripción</label><textarea class="textarea" id="de"></textarea></div>' +
        '<div class="field mt4"><label>Equipo asignado</label><div class="col" style="gap:4px">' +
          V.all('technicians').map(function (t) { return '<label class="check"><input type="checkbox" data-t="' + t.id + '"><span>' + E(t.name) + ' <span class="xs muted">(' + E(t.zone) + ')</span></span></label>'; }).join('') +
        '</div></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv">Crear proyecto</button>',
      onMount: function (w) {
        var cu = w.querySelector('#cu'), si = w.querySelector('#si'), qu = w.querySelector('#qu');
        function sync() { si.innerHTML = opt(sitesOf(cu.value)); }
        cu.addEventListener('change', sync); sync();
        qu.addEventListener('change', function () {
          var q = V.byId('quotes', this.value);
          if (q) { w.querySelector('#bu').value = V.quoteTotals(q).total.toFixed(2); cu.value = q.customer_id; sync(); si.value = q.site_id || ''; }
        });
        w.querySelector('#sv').addEventListener('click', function () {
          var n = w.querySelector('#n').value.trim();
          if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          var p = V.insert('projects', {
            code: V.nextNumber('project'), name: n, customer_id: cu.value, site_id: si.value,
            quote_id: qu.value || null, manager_user_id: w.querySelector('#mg').value,
            team: Array.prototype.slice.call(w.querySelectorAll('[data-t]:checked')).map(function (x) { return x.dataset.t; }),
            status: 'PLANNING', progress: 0, start: w.querySelector('#st').value, end: w.querySelector('#en').value,
            realStart: null, realEnd: null, budget: +w.querySelector('#bu').value || 0, cost: 0,
            branch_id: (V.byId('customers', cu.value) || {}).branch_id || 'br_1',
            description: w.querySelector('#de').value.trim(), changeOrders: []
          });
          V.logActivity('project', p.id, 'Creó el proyecto ' + p.code, 'create');
          V.logAudit('CREATE', 'project', p.code, n);
          UI.closeTop(); UI.toast('Proyecto ' + p.code + ' creado.', 'ok'); location.hash = 'proyectos/' + p.id;
        });
      }
    });
  }

  function projectDetail(el, id) {
    var p = V.byId('projects', id);
    if (!p) { el.innerHTML = PH({ title: 'Proyecto' }) + UI.errorState('El proyecto no existe.'); return; }
    var ms = V.all('milestones').filter(function (m) { return m.project_id === p.id; });
    var wos = V.all('workOrders').filter(function (w) { return w.project_id === p.id; });
    var fin = V.projectFinance(p);
    var docs = V.all('documents').filter(function (d) { return d.project_id === p.id; });
    var exps = V.all('expenses').filter(function (x) { return x.project_id === p.id; });

    var h = PH({
      crumbs: [{ label: 'Proyectos', href: '#proyectos' }, { label: p.code }],
      title: p.name,
      sub: p.code + ' · ' + E(V.customerName(p.customer_id)) + ' · ' + E(V.siteName(p.site_id)) + ' · ' + UI.badge(V.PROJECT_STATES, p.status),
      actions: (V.can('ordenes', 'crear') ? '<button class="btn btn-outline btn-sm" id="nwo">' + I('clipboard', 15) + ' Nueva orden</button>' : '') +
               (V.can('proyectos', 'editar') ? '<button class="btn btn-outline btn-sm" id="co">' + I('plus', 15) + ' Cambio de alcance</button>' : '') +
               (V.can('proyectos', 'editar') ? '<button class="btn btn-primary btn-sm" id="cl">' + I('check', 15) + ' Cerrar proyecto</button>' : '')
    });

    h += '<div class="grid g4">' +
      UI.kpi({ label: 'Avance', value: p.progress + '%', icon: 'gauge', sub: ms.filter(function (m) { return m.done; }).length + ' de ' + ms.length + ' hitos' }) +
      UI.kpi({ label: 'Presupuesto', value: V.money(p.budget), icon: 'file' }) +
      UI.kpi({ label: 'Costo acumulado', value: V.money(fin.cost), icon: 'dollar', sub: 'Materiales ' + V.money(fin.materials) + ' · M.O. ' + V.money(fin.labor) }) +
      UI.kpi({ label: 'Margen estimado', value: fin.margin.toFixed(1) + '%', icon: 'trend', trend: fin.margin >= 25 ? 'up' : 'down' }) +
      '</div>';

    h += '<div class="grid g-2-1 mt4"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Hitos</h3><span class="small muted">' + ms.filter(function (m) { return m.done; }).length + '/' + ms.length + ' completados</span></div><div class="card-b">' +
      (ms.length ? ms.map(function (m) {
        var late = !m.done && V.daysTo(m.due) < 0;
        return '<div class="chk-item"><input type="checkbox" data-m="' + m.id + '"' + (m.done ? ' checked' : '') + (V.can('proyectos', 'editar') ? '' : ' disabled') + '>' +
          '<label style="flex:1"><span class="' + (m.done ? 'muted' : 'bold') + '">' + E(m.name) + '</span>' +
          '<div class="xs ' + (late ? 'prio-critica' : 'muted') + '">Vence ' + V.fdate(m.due) + (late ? ' · atrasado' : '') + '</div></label></div>';
      }).join('') : '<p class="small muted">Sin hitos definidos.</p>') +
      (V.can('proyectos', 'crear') ? '<button class="btn btn-outline btn-sm mt4" id="addm">' + I('plus', 14) + ' Agregar hito</button>' : '') +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Órdenes de trabajo del proyecto</h3></div>' +
      (wos.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Número</th><th>Trabajo</th><th>Fecha</th><th>Técnico</th><th class="right">Estado</th></tr></thead><tbody>' +
        wos.map(function (w) {
          return '<tr class="clickable" data-wo="' + w.id + '"><td><b>' + E(w.number) + '</b></td><td>' + E(w.title) + '</td>' +
            '<td class="small">' + V.fdate(w.start) + '</td><td class="small">' + ((w.technicians || []).map(V.techName).join(', ') || '—') + '</td>' +
            '<td class="right">' + UI.badge(V.WO_STATES, w.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : UI.emptyState({ icon: 'clipboard', title: 'Sin órdenes', text: 'Crea la primera orden de trabajo del proyecto.' })) +
      '</div>';

    if ((p.changeOrders || []).length) {
      h += '<div class="card"><div class="card-h"><h3>Cambios de alcance</h3></div><div class="tbl-wrap"><table class="tbl">' +
        '<thead><tr><th>Descripción</th><th>Fecha</th><th class="right">Monto</th><th class="right">Estado</th></tr></thead><tbody>' +
        p.changeOrders.map(function (c) {
          return '<tr><td>' + E(c.desc) + '</td><td class="small">' + V.fdate(c.date) + '</td>' +
            '<td class="right mono">' + V.money(c.amount) + '</td><td class="right"><span class="badge ' + (c.status === 'Aprobado' ? 'b-green' : 'b-amber') + '">' + E(c.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    h += '<div class="card"><div class="card-h"><h3>Gastos imputados</h3><span class="small muted">' + V.money(fin.materials) + '</span></div>' +
      (exps.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Concepto</th><th>Categoría</th><th>Fecha</th><th class="right">Monto</th></tr></thead><tbody>' +
        exps.map(function (x) { return '<tr><td>' + E(x.desc) + '</td><td><span class="chip">' + E(x.category) + '</span></td>' +
          '<td class="small">' + V.fdate(x.date) + '</td><td class="right mono">' + V.money(x.amount) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="card-b"><p class="small muted">Sin gastos registrados.</p></div>') + '</div>' +

      '<div class="card"><div class="card-h"><h3>Galería de avance</h3></div><div class="card-b"><div class="gallery">' +
      wos.reduce(function (a, w) { return a.concat(w.photos || []); }, []).map(function (ph) {
        return '<div class="ph"><span class="tag">' + E(ph.tag) + '</span>' + I('camera', 17) + '</div>';
      }).join('') + '</div>' +
      (wos.reduce(function (a, w) { return a + (w.photos || []).length; }, 0) === 0 ? '<p class="small muted">Sin fotografías todavía.</p>' : '') +
      '</div></div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Cliente', '<a href="#clientes/' + p.customer_id + '">' + E(V.customerName(p.customer_id)) + '</a>') +
        kv('Ubicación', E(V.siteName(p.site_id))) + kv('Responsable', E(V.userName(p.manager_user_id))) +
        kv('Equipo', (p.team || []).map(V.techName).join(', ') || '—') +
        kv('Inicio previsto', V.fdate(p.start)) + kv('Fin previsto', V.fdate(p.end)) +
        kv('Inicio real', p.realStart ? V.fdate(p.realStart) : '—') +
        kv('Sucursal', (V.byId('branches', p.branch_id) || {}).name || '—') +
        (p.quote_id ? kv('Presupuesto', '<a href="#presupuestos/' + p.quote_id + '">' + E((V.byId('quotes', p.quote_id) || {}).number || '') + '</a>') : '') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Rentabilidad</h3></div><div class="card-b col" style="gap:9px">' +
        kv('Ingresos facturados', V.money(fin.income)) + kv('Materiales y gastos', '-' + V.money(fin.materials)) +
        kv('Mano de obra', '-' + V.money(fin.labor)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        kv('Presupuesto vs. costo', V.money(p.budget) + ' / ' + V.money(fin.cost)) +
        '<div class="bar ' + (fin.margin >= 25 ? 'g' : fin.margin >= 10 ? 'a' : 'r') + '"><i style="width:' + Math.max(0, Math.min(100, fin.margin)) + '%"></i></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Documentos</h3></div><div class="card-b">' +
        (docs.length ? '<div class="col" style="gap:6px">' + docs.map(function (d) {
          return '<div class="file-row"><span class="file-ico">' + I('file', 15) + '</span>' +
            '<span style="min-width:0"><b class="small truncate" style="display:block">' + E(d.name) + '</b>' +
            '<span class="xs muted">v' + d.version + ' · ' + E(d.category) + '</span></span></div>';
        }).join('') + '</div>' : '<p class="small muted">Sin documentos.</p>') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Timeline</h3></div><div class="card-b">' +
        UI.timeline(ms.slice().sort(function (a, b) { return new Date(a.due) - new Date(b.due); }).map(function (m) {
          return { icon: m.done ? 'check' : 'clock', tone: m.done ? 'g' : 'n', text: E(m.name), meta: V.fdate(m.due) };
        })) + '</div></div></div></div>';

    el.innerHTML = h;

    el.querySelectorAll('[data-wo]').forEach(function (tr) { tr.addEventListener('click', function () { location.hash = 'ordenes/' + this.dataset.wo; }); });
    el.querySelectorAll('[data-m]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        V.update('milestones', this.dataset.m, { done: this.checked });
        var done = V.all('milestones').filter(function (m) { return m.project_id === p.id && m.done; }).length;
        var pg = Math.round((done / Math.max(1, ms.length)) * 100);
        V.update('projects', p.id, { progress: pg, status: pg === 100 ? 'COMPLETED' : (pg > 0 ? 'ACTIVE' : p.status) });
        V.logActivity('project', p.id, 'Actualizó el hito y el avance a ' + pg + '%', 'update');
        APP.reload();
      });
    });
    bind('#addm', function () {
      UI.modal({ title: 'Nuevo hito',
        body: '<div class="field"><label for="mn">Nombre <span class="req">*</span></label><input class="input" id="mn"></div>' +
              '<div class="field mt4"><label for="md">Fecha objetivo</label><input class="input" id="md" type="date" value="' + V.ymd(V.addDays(V.today(), 7)) + '"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
        onMount: function (w) { w.querySelector('#ok').addEventListener('click', function () {
          var n = w.querySelector('#mn').value.trim(); if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          V.insert('milestones', { project_id: p.id, name: n, due: w.querySelector('#md').value, done: false });
          UI.closeTop(); UI.toast('Hito agregado.', 'ok'); APP.reload();
        }); } });
    });
    bind('#co', function () {
      UI.modal({ title: 'Cambio de alcance (change order)',
        body: '<div class="field"><label for="cd">Descripción del trabajo adicional <span class="req">*</span></label><textarea class="textarea" id="cd"></textarea></div>' +
              '<div class="grid g2 mt4"><div class="field"><label for="ca">Monto</label><input class="input" id="ca" type="number" step="0.01" value="0"></div>' +
              '<div class="field"><label for="cs">Estado</label><select class="select" id="cs"><option>Propuesto</option><option>Aprobado</option></select></div></div>' +
              '<div class="banner banner-info mt4">' + I('info', 15) + '<div>Al aprobarse se suma al presupuesto del proyecto y queda registrado el impacto en costo, tiempo e ingreso.</div></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Registrar</button>',
        onMount: function (w) { w.querySelector('#ok').addEventListener('click', function () {
          var d = w.querySelector('#cd').value.trim(); if (!d) { UI.toast('Describe el cambio.', 'err'); return; }
          var amt = +w.querySelector('#ca').value || 0, st = w.querySelector('#cs').value;
          p.changeOrders = (p.changeOrders || []).concat([{ id: V.uid('co'), desc: d, amount: amt, status: st, date: V.ymd(V.today()) }]);
          V.update('projects', p.id, { changeOrders: p.changeOrders, budget: st === 'Aprobado' ? p.budget + amt : p.budget });
          V.logActivity('project', p.id, 'Registró un cambio de alcance por ' + V.money(amt), 'update');
          V.logAudit('CREATE', 'change_order', p.code, d + ' · ' + V.money(amt));
          UI.closeTop(); UI.toast('Cambio de alcance registrado.', 'ok'); APP.reload();
        }); } });
    });
    bind('#cl', function () {
      var abiertas = wos.filter(function (w) { return ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; });
      if (abiertas.length) { UI.toast('No puedes cerrar el proyecto: hay ' + abiertas.length + ' orden(es) sin cerrar.', 'err'); return; }
      UI.confirm({ title: '¿Cerrar el proyecto?', body: 'Se generará el dossier final y el proyecto pasará a estado Cerrado.', ok: 'Cerrar proyecto' }, function () {
        V.update('projects', p.id, { status: 'CLOSED', progress: 100, realEnd: V.ymd(V.today()) });
        V.logActivity('project', p.id, 'Cerró el proyecto', 'status');
        V.logAudit('UPDATE', 'project', p.code, 'Proyecto cerrado');
        UI.toast('Proyecto cerrado.', 'ok'); APP.reload();
      });
    });
    bind('#nwo', function () { newWO({ project_id: p.id, customer_id: p.customer_id, site_id: p.site_id }); });
    function bind(sel, fn) { var b = el.querySelector(sel); if (b) b.addEventListener('click', fn); }
  }

  /* ============================================================
     H) ÓRDENES DE TRABAJO §6.8
     ============================================================ */
  views.ordenes = function (el, id) {
    if (id) return woDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Órdenes de trabajo',
      sub: 'Unidad operativa central: estados controlados, checklist obligatorio, materiales, tiempos, evidencias y firma',
      actions: '<div class="seg" id="vw"><button class="on" data-v="t">Tabla</button><button data-v="k">Kanban</button></div>' +
               (V.can('ordenes', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva orden</button>' : '')
    });

    var wos = V.all('workOrders');
    el.insertAdjacentHTML('beforeend', '<div class="grid g4 mb4">' +
      UI.kpi({ label: 'Programadas', value: wos.filter(function (w) { return ['SCHEDULED','ASSIGNED'].indexOf(w.status) >= 0; }).length, icon: 'calendar' }) +
      UI.kpi({ label: 'En ejecución', value: wos.filter(function (w) { return ['EN_ROUTE','ON_SITE','IN_PROGRESS','PAUSED'].indexOf(w.status) >= 0; }).length, icon: 'play' }) +
      UI.kpi({ label: 'Por validar', value: wos.filter(function (w) { return ['COMPLETED','REVIEW'].indexOf(w.status) >= 0; }).length, icon: 'checkCircle' }) +
      UI.kpi({ label: 'Atrasadas', value: V.overdueWOs().length, icon: 'alert', trend: V.overdueWOs().length ? 'down' : '' }) +
      '</div>');
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () { newWO(); });

    function tabla() {
      UI.table(host, {
        rows: function () { return V.all('workOrders'); },
        search: function (w) { return w.number + ' ' + w.title + ' ' + V.customerName(w.customer_id); },
        placeholder: 'Buscar por número, trabajo o cliente…', exportName: 'voltx-ordenes',
        sort: 'start', dir: 'desc', per: 12,
        filters: [
          { key: 'st', label: 'Todos los estados', options: stateOpts(V.WO_STATES), match: function (r, v) { return r.status === v; } },
          { key: 'ty', label: 'Todos los tipos', options: Object.keys(V.WO_TYPES).map(function (k) { return { value: k, label: V.WO_TYPES[k] }; }), match: function (r, v) { return r.type === v; } },
          { key: 'pr', label: 'Toda prioridad', options: stateOpts(V.PRIORITIES), match: function (r, v) { return r.priority === v; } },
          { key: 'te', label: 'Todos los técnicos', options: V.all('technicians').map(function (t) { return { value: t.id, label: t.name }; }), match: function (r, v) { return (r.technicians || []).indexOf(v) >= 0; } },
          { key: 'br', label: 'Todas las sucursales', options: V.all('branches').map(function (x) { return { value: x.id, label: x.name }; }), match: function (r, v) { return r.branch_id === v; } }
        ],
        cols: [
          { key: 'number', label: 'Número', render: function (w) {
              var late = ['CLOSED','CANCELLED','COMPLETED','REVIEW'].indexOf(w.status) < 0 && new Date(w.end) < new Date();
              return '<b>' + E(w.number) + '</b>' + (late ? ' <span class="badge b-red">Atrasada</span>' : ''); } },
          { key: 'title', label: 'Trabajo', render: function (w) { return '<div class="bold">' + E(w.title) + '</div><div class="xs muted">' + E(V.WO_TYPES[w.type]) + ' · ' + E(V.customerName(w.customer_id)) + '</div>'; } },
          { key: 'site_id', label: 'Ubicación', render: function (w) { return '<span class="small">' + E(V.siteName(w.site_id)) + '</span>'; } },
          { key: 'start', label: 'Ventana', render: function (w) { return '<div class="small">' + V.fdate(w.start) + '</div><div class="xs muted mono">' + V.hm(w.start) + ' – ' + V.hm(w.end) + '</div>'; } },
          { key: 'tec', label: 'Asignación', sortVal: function (w) { return (w.technicians || []).map(V.techName).join(); },
            render: function (w) {
              if (!(w.technicians || []).length) return '<span class="badge b-amber">Sin asignar</span>';
              return '<div class="row gap1">' + w.technicians.map(function (t) { return UI.avatar(V.techName(t), 'sm'); }).join('') +
                '<span class="small">' + E(V.techName(w.technicians[0])) + (w.technicians.length > 1 ? ' +' + (w.technicians.length - 1) : '') + '</span></div>'; } },
          { key: 'priority', label: 'Prioridad', render: function (w) { return UI.badge(V.PRIORITIES, w.priority); } },
          { key: 'chk', label: 'Checklist', sortable: false, render: function (w) {
              var tot = (w.checklist || []).length, dn = (w.checklist || []).filter(function (c) { return c.done; }).length;
              if (!tot) return '<span class="muted">—</span>';
              return '<div style="min-width:74px"><span class="xs muted">' + dn + '/' + tot + '</span><div class="bar mt2 ' + (dn === tot ? 'g' : '') + '"><i style="width:' + (dn / tot * 100) + '%"></i></div></div>'; } },
          { key: 'status', label: 'Estado', right: true, render: function (w) { return UI.badge(V.WO_STATES, w.status); } }
        ],
        onRow: function (rid) { location.hash = 'ordenes/' + rid; }
      });
    }
    function kanban() {
      var cols = ['DRAFT','SCHEDULED','ASSIGNED','EN_ROUTE','ON_SITE','IN_PROGRESS','PAUSED','COMPLETED','REVIEW','CLOSED'];
      host.innerHTML = '<div class="kanban">' + cols.map(function (k) {
        var rows = V.all('workOrders').filter(function (w) { return w.status === k; });
        return '<div class="kcol" data-k="' + k + '"><h4><span>' + E(V.WO_STATES[k].label) + '</span><span>' + rows.length + '</span></h4>' +
          rows.map(function (w) {
            return '<div class="kcard" draggable="true" data-id="' + w.id + '">' +
              '<div class="spread"><b class="xs">' + E(w.number) + '</b>' + UI.badge(V.PRIORITIES, w.priority) + '</div>' +
              '<div class="small bold mt2">' + E(w.title) + '</div>' +
              '<div class="xs muted mt2">' + E(V.customerName(w.customer_id)) + '</div>' +
              '<div class="row gap1 mt2 xs muted">' + I('clock', 11) + V.fdate(w.start) + ' ' + V.hm(w.start) + '</div>' +
              ((w.technicians || []).length ? '<div class="row gap1 mt2">' + w.technicians.map(function (t) { return UI.avatar(V.techName(t), 'sm'); }).join('') + '</div>' : '<div class="mt2"><span class="badge b-amber">Sin asignar</span></div>') +
              '</div>';
          }).join('') + '</div>';
      }).join('') + '</div>';
      var dragId = null;
      host.querySelectorAll('.kcard').forEach(function (c) {
        c.addEventListener('dragstart', function () { dragId = this.dataset.id; this.classList.add('drag'); });
        c.addEventListener('dragend', function () { this.classList.remove('drag'); });
        c.addEventListener('click', function () { location.hash = 'ordenes/' + this.dataset.id; });
      });
      host.querySelectorAll('.kcol').forEach(function (col) {
        col.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('over'); });
        col.addEventListener('dragleave', function () { this.classList.remove('over'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); this.classList.remove('over');
          if (!dragId) return;
          var res = V.woTransition(dragId, this.dataset.k, 'Movida en el tablero');
          if (!res.ok) { UI.toast(res.error, 'err'); return; }
          UI.toast('Orden actualizada a ' + V.WO_STATES[this.dataset.k].label + '.', 'ok');
          kanban(); APP.refreshChrome();
        });
      });
    }
    tabla();
    el.querySelectorAll('#vw button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        el.querySelectorAll('#vw button').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on'); this.dataset.v === 't' ? tabla() : kanban();
      });
    });
  };

  function newWO(pre) {
    if (!V.can('ordenes', 'crear')) { UI.toast('No tienes permiso para crear órdenes.', 'err'); return; }
    pre = pre || {};
    UI.modal({
      title: 'Nueva orden de trabajo', size: 'wide',
      body: '<div class="grid g2">' +
        '<div class="field"><label for="cu">Cliente <span class="req">*</span></label><select class="select" id="cu">' + opt(V.all('customers'), pre.customer_id) + '</select></div>' +
        '<div class="field"><label for="si">Ubicación <span class="req">*</span></label><select class="select" id="si"></select></div></div>' +
        '<div class="field mt4"><label for="ti">Título del trabajo <span class="req">*</span></label><input class="input" id="ti"></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="sv">Servicio del catálogo</label><select class="select" id="sv"><option value="">— Sin catálogo —</option>' + opt(V.all('services')) + '</select></div>' +
        '<div class="field"><label for="ty">Tipo</label><select class="select" id="ty">' + Object.keys(V.WO_TYPES).map(function (k) { return '<option value="' + k + '">' + V.WO_TYPES[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="pr">Prioridad</label><select class="select" id="pr">' + Object.keys(V.PRIORITIES).map(function (k) { return '<option value="' + k + '"' + (k === 'normal' ? ' selected' : '') + '>' + V.PRIORITIES[k].label + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="grid g4 mt4">' +
        '<div class="field"><label for="dt">Fecha</label><input class="input" id="dt" type="date" value="' + V.ymd(V.addDays(V.today(), 1)) + '"></div>' +
        '<div class="field"><label for="h1">Hora inicio</label><input class="input" id="h1" type="time" value="08:00"></div>' +
        '<div class="field"><label for="du">Duración (h)</label><input class="input" id="du" type="number" step="0.5" value="2"></div>' +
        '<div class="field"><label for="br">Sucursal</label><select class="select" id="br">' + opt(V.all('branches')) + '</select></div></div>' +
        '<div class="field mt4"><label>Asignación de técnicos</label>' +
          '<div id="tecs" class="col" style="gap:4px"></div>' +
          '<span class="hint">La asignación inteligente ordena por disponibilidad, habilidades, carga y zona. El coordinador decide.</span></div>' +
        '<div class="field mt4"><label for="de">Alcance técnico y notas</label><textarea class="textarea" id="de"></textarea></div>' +
        '<div id="chkprev" class="mt4"></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv2">Crear orden</button>',
      onMount: function (w) {
        var cu = w.querySelector('#cu'), si = w.querySelector('#si'), sv = w.querySelector('#sv');
        function syncSites() { si.innerHTML = opt(sitesOf(cu.value), pre.site_id); }
        cu.addEventListener('change', function () { syncSites(); syncTecs(); }); syncSites();
        sv.addEventListener('change', function () {
          var s = V.byId('services', this.value);
          if (s) {
            w.querySelector('#du').value = s.duration;
            if (!w.querySelector('#ti').value.trim()) w.querySelector('#ti').value = s.name;
            w.querySelector('#chkprev').innerHTML = '<div class="banner banner-brand">' + I('list', 15) +
              '<div><b>Checklist heredado del servicio (' + s.checklist.length + ' pasos obligatorios)</b><br><span class="xs">' + E(s.checklist.join(' · ')) + '</span></div></div>';
          } else w.querySelector('#chkprev').innerHTML = '';
          syncTecs();
        });
        function score(t) {
          var s = 0;
          var carga = V.all('workOrders').filter(function (x) { return (x.technicians || []).indexOf(t.id) >= 0 && ['CLOSED','CANCELLED'].indexOf(x.status) < 0; }).length;
          s += Math.max(0, 40 - carga * 8);
          var cus = V.byId('customers', cu.value);
          if (cus && cus.branch_id === t.branch_id) s += 25;
          var svc = V.byId('services', sv.value);
          if (svc && (t.skills || []).some(function (k) { return svc.category.toLowerCase().indexOf(k.toLowerCase()) >= 0 || svc.name.toLowerCase().indexOf(k.toLowerCase()) >= 0; })) s += 20;
          s += Math.round((t.kpi.puntualidad || 0) / 10);
          var abs = V.all('absences').filter(function (a) { return a.technician_id === t.id && w.querySelector('#dt').value >= a.from && w.querySelector('#dt').value <= a.to; });
          if (abs.length) s = 0;
          return { s: s, carga: carga, ausente: abs.length > 0 };
        }
        function syncTecs() {
          var list = V.all('technicians').map(function (t) { var sc = score(t); return { t: t, sc: sc }; })
            .sort(function (a, b) { return b.sc.s - a.sc.s; });
          w.querySelector('#tecs').innerHTML = list.map(function (x) {
            return '<label class="check" style="border:1px solid var(--border);border-radius:8px;padding:8px 10px">' +
              '<input type="checkbox" data-t="' + x.t.id + '"' + (x.sc.ausente ? ' disabled' : '') + '>' +
              '<span style="flex:1"><b class="small">' + E(x.t.name) + '</b> ' +
              (x.sc.ausente ? '<span class="badge b-red">Ausente</span>' : '<span class="badge ' + (x.sc.s >= 60 ? 'b-green' : x.sc.s >= 40 ? 'b-amber' : 'b-gray') + '">Idoneidad ' + x.sc.s + '</span>') +
              '<div class="xs muted">' + E(x.t.zone) + ' · ' + E((x.t.skills || []).join(', ')) + ' · ' + x.sc.carga + ' órdenes activas</div></span></label>';
          }).join('');
        }
        syncTecs();
        w.querySelector('#dt').addEventListener('change', syncTecs);

        w.querySelector('#sv2').addEventListener('click', function () {
          var ti = w.querySelector('#ti').value.trim();
          if (!cu.value || !si.value || !ti) { UI.toast('Cliente, ubicación y título son obligatorios.', 'err'); return; }
          var d = w.querySelector('#dt').value, h1 = w.querySelector('#h1').value, du = +w.querySelector('#du').value || 1;
          var start = new Date(d + 'T' + h1), end = new Date(start.getTime() + du * 3600000);
          var tecs = Array.prototype.slice.call(w.querySelectorAll('[data-t]:checked')).map(function (x) { return x.dataset.t; });
          // detección de conflicto de agenda
          var conflict = null;
          tecs.forEach(function (tid) {
            V.all('workOrders').forEach(function (x) {
              if ((x.technicians || []).indexOf(tid) < 0) return;
              if (['CLOSED','CANCELLED'].indexOf(x.status) >= 0) return;
              if (new Date(x.start) < end && new Date(x.end) > start) conflict = { tec: V.techName(tid), wo: x.number };
            });
          });
          function create() {
            var s = V.byId('services', sv.value);
            var wo = V.insert('workOrders', {
              number: V.nextNumber('wo'), customer_id: cu.value, site_id: si.value, project_id: pre.project_id || null,
              title: ti, type: w.querySelector('#ty').value, priority: w.querySelector('#pr').value,
              status: tecs.length ? 'ASSIGNED' : 'SCHEDULED', start: start.toISOString(), end: end.toISOString(),
              estimated: du, technicians: tecs, service_id: sv.value || null,
              description: w.querySelector('#de').value.trim(), branch_id: w.querySelector('#br').value,
              checklist: (s ? s.checklist : []).map(function (c) { return { text: c, done: false, required: true }; }),
              materials: (s ? s.materials : []).map(function (pid) { return { product_id: pid, planned: 1, used: 0, warehouse_id: 'wh_1' }; }),
              timeEntries: [], photos: [], signature: null, result: '', observations: '', recommendations: '',
              history: [{ status: 'DRAFT', at: new Date().toISOString(), by: V.getSession().user_id, note: 'Creada' },
                        { status: 'SCHEDULED', at: new Date().toISOString(), by: V.getSession().user_id, note: '' }]
                .concat(tecs.length ? [{ status: 'ASSIGNED', at: new Date().toISOString(), by: V.getSession().user_id, note: 'Asignada a ' + tecs.map(V.techName).join(', ') }] : [])
            });
            V.logActivity('work_order', wo.id, 'Creó la orden ' + wo.number, 'create');
            V.logAudit('CREATE', 'work_order', wo.number, ti);
            tecs.forEach(function (tid) {
              var t = V.byId('technicians', tid);
              if (t && t.user_id) V.notify(t.user_id, 'info', 'Nueva orden asignada', wo.number + ' — ' + ti, '#ordenes/' + wo.id);
            });
            UI.closeAll(); UI.toast('Orden ' + wo.number + ' creada.', 'ok'); location.hash = 'ordenes/' + wo.id; APP.refreshChrome();
          }
          if (conflict) {
            UI.confirm({ title: 'Conflicto de agenda detectado',
              body: conflict.tec + ' ya tiene la orden ' + conflict.wo + ' en esa ventana horaria. ¿Deseas asignarla igualmente?',
              ok: 'Asignar de todos modos', danger: true }, create);
          } else create();
        });
      }
    });
  }
  views.__newWO = newWO;

  function woDetail(el, id) {
    var w = V.byId('workOrders', id);
    if (!w) { el.innerHTML = PH({ title: 'Orden' }) + UI.errorState('La orden no existe.'); return; }
    var next = V.WO_STATES[w.status].next;
    var tot = (w.checklist || []).length, dn = (w.checklist || []).filter(function (c) { return c.done; }).length;
    var minutos = (w.timeEntries || []).reduce(function (a, t) { return a + (t.min || 0); }, 0);
    var late = ['CLOSED','CANCELLED','COMPLETED','REVIEW'].indexOf(w.status) < 0 && new Date(w.end) < new Date();

    var acts = '<button class="btn btn-outline btn-sm" id="pdf">' + I('print', 15) + ' Informe / acta</button>';
    if (V.can('ordenes', 'asignar')) acts += '<button class="btn btn-outline btn-sm" id="asg">' + I('hardhat', 15) + ' Reasignar</button>';
    if (V.can('ordenes', 'editar') && next.length) acts += '<button class="btn btn-primary btn-sm" id="tr">' + I('refresh', 15) + ' Cambiar estado</button>';

    var h = PH({
      crumbs: [{ label: 'Órdenes de trabajo', href: '#ordenes' }, { label: w.number }],
      title: w.title,
      sub: w.number + ' · ' + E(V.WO_TYPES[w.type]) + ' · ' + UI.badge(V.WO_STATES, w.status) + ' ' + UI.badge(V.PRIORITIES, w.priority) +
           (late ? ' <span class="badge b-red">Atrasada</span>' : ''),
      actions: acts
    });

    if (tot && dn < tot) {
      h += '<div class="banner banner-warn mb4">' + I('list', 16) + '<div><b>Checklist incompleto.</b> Faltan ' + (tot - dn) +
        ' de ' + tot + ' pasos obligatorios; la orden no podrá completarse hasta terminarlos.</div></div>';
    }

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Alcance del trabajo</h3></div><div class="card-b col">' +
        '<p>' + E(w.description || 'Sin descripción registrada.') + '</p>' +
        (w.internalNotes ? '<div class="banner banner-info">' + I('lock', 15) + '<div><b>Nota interna:</b> ' + E(w.internalNotes) + '</div></div>' : '') +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Checklist obligatorio</h3><span class="small muted">' + dn + ' / ' + tot + '</span></div><div class="card-b">' +
      (tot ? (w.checklist || []).map(function (c, i2) {
        return '<div class="chk-item ' + (c.done ? 'done' : '') + '"><input type="checkbox" data-c="' + i2 + '"' + (c.done ? ' checked' : '') +
          (V.can('ordenes', 'editar') ? '' : ' disabled') + '><label style="flex:1">' + E(c.text) +
          (c.required ? ' <span class="req">*</span>' : '') + '</label></div>';
      }).join('') : '<p class="small muted">Esta orden no tiene checklist asociado.</p>') + '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Materiales</h3>' +
        (V.can('ordenes', 'editar') ? '<button class="btn btn-outline btn-sm" id="addmat">' + I('plus', 14) + ' Agregar</button>' : '') + '</div>' +
      ((w.materials || []).length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Material</th><th>Almacén</th>' +
        '<th class="right">Planificado</th><th class="right">Consumido</th><th class="right">Costo</th></tr></thead><tbody>' +
        w.materials.map(function (m, i2) {
          var p = V.byId('products', m.product_id) || { name: '—', unit: '', cost: 0 };
          return '<tr><td><b>' + E(p.name) + '</b><div class="xs muted">' + E(p.sku || '') + '</div></td>' +
            '<td class="small">' + E((V.byId('warehouses', m.warehouse_id) || {}).name || '—') + '</td>' +
            '<td class="right mono">' + m.planned + ' ' + E(p.unit) + '</td>' +
            '<td class="right">' + (V.can('ordenes', 'editar') ?
              '<input class="input right" style="width:78px;height:30px" type="number" step="0.01" data-u="' + i2 + '" value="' + m.used + '">' :
              '<span class="mono">' + m.used + '</span>') + '</td>' +
            '<td class="right mono muted">' + V.money(m.used * p.cost) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card-b"><p class="small muted">Sin materiales planificados.</p></div>') + '</div>' +

      '<div class="card"><div class="card-h"><h3>Tiempos</h3><span class="small muted">' +
        Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min registrados · estimado ' + w.estimated + ' h</span></div>' +
      ((w.timeEntries || []).length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th>Desde</th><th>Hasta</th><th class="right">Duración</th></tr></thead><tbody>' +
        w.timeEntries.map(function (t) {
          return '<tr><td><span class="chip">' + E(t.type) + '</span></td><td class="small mono">' + V.hm(t.from) + '</td>' +
            '<td class="small mono">' + (t.to ? V.hm(t.to) : '<span class="badge b-orange">En curso</span>') + '</td>' +
            '<td class="right mono">' + (t.min ? t.min + ' min' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card-b"><p class="small muted">Sin registros de tiempo.</p></div>') +
      (minutos && w.estimated ? '<div class="card-f small ' + (minutos / 60 > w.estimated ? 'prio-alta' : '') + '">Diferencia vs. estimado: ' +
        ((minutos / 60) - w.estimated).toFixed(2) + ' h</div>' : '') + '</div>' +

      '<div class="card"><div class="card-h"><h3>Evidencias</h3><span class="small muted">' + (w.photos || []).length + ' archivo(s)</span></div><div class="card-b">' +
      (['antes','durante','despues'].map(function (tag) {
        var ph = (w.photos || []).filter(function (p) { return p.tag === tag; });
        return '<div class="mb4"><h4 class="mb2" style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">' +
          (tag === 'despues' ? 'Después' : tag.charAt(0).toUpperCase() + tag.slice(1)) + '</h4>' +
          (ph.length ? '<div class="gallery">' + ph.map(function (p) { return '<div class="ph">' + I('camera', 17) + '<span class="xs" style="margin-top:3px">' + E(p.name) + '</span></div>'; }).join('') + '</div>'
                     : '<p class="xs muted">Sin fotografías.</p>') + '</div>';
      }).join('')) +
      (V.can('ordenes', 'editar') ? '<div class="dropzone" id="dz">' + I('camera', 20) + '<div class="small mt2">Agregar evidencias fotográficas</div></div>' : '') +
      '</div></div>' +

      (w.result || w.recommendations ? '<div class="card"><div class="card-h"><h3>Cierre</h3></div><div class="card-b col">' +
        (w.result ? '<div><b class="small">Resultado</b><p class="mt2">' + E(w.result) + '</p></div>' : '') +
        (w.recommendations ? '<div><b class="small">Recomendaciones</b><p class="mt2">' + E(w.recommendations) + '</p></div>' : '') +
      '</div></div>' : '') +
      '</div>';

    /* lateral */
    h += '<div class="col">' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Cliente', '<a href="#clientes/' + w.customer_id + '">' + E(V.customerName(w.customer_id)) + '</a>') +
        kv('Ubicación', E(V.siteName(w.site_id))) +
        kv('Dirección', E((V.byId('sites', w.site_id) || {}).address || '—')) +
        kv('Ventana', V.fdate(w.start) + ' · ' + V.hm(w.start) + '–' + V.hm(w.end)) +
        kv('Duración estimada', w.estimated + ' h') +
        kv('Técnicos', (w.technicians || []).length ? w.technicians.map(V.techName).join(', ') : '<span class="badge b-amber">Sin asignar</span>') +
        kv('Sucursal', (V.byId('branches', w.branch_id) || {}).name || '—') +
        (w.project_id ? kv('Proyecto', '<a href="#proyectos/' + w.project_id + '">' + E((V.byId('projects', w.project_id) || {}).code || '') + '</a>') : '') +
        (w.quote_id ? kv('Presupuesto', '<a href="#presupuestos/' + w.quote_id + '">' + E((V.byId('quotes', w.quote_id) || {}).number || '') + '</a>') : '') +
        kv('Creada por', E(V.userName(w.createdBy)) + ' · ' + V.fdate(w.created_at)) +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Firma del cliente</h3></div><div class="card-b">' +
        (w.signature ? '<div class="banner banner-success">' + I('pen', 15) + '<div><b>' + E(w.signature.name) + '</b><br><span class="xs">Firmado el ' + V.fdatetime(w.signature.at) + '</span></div></div>'
                     : '<p class="small muted">La firma se captura en sitio desde la PWA del técnico.</p>') +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Historial de estados</h3></div><div class="card-b">' +
        UI.timeline((w.history || []).slice().reverse().map(function (hh) {
          var st = V.WO_STATES[hh.status] || { label: hh.status };
          var tone = hh.status === 'CANCELLED' ? 'r' : ['CLOSED','COMPLETED'].indexOf(hh.status) >= 0 ? 'g' : '';
          return { icon: 'refresh', tone: tone, text: '<b>' + E(st.label) + '</b>' + (hh.note ? ' — ' + E(hh.note) : ''),
                   meta: V.userName(hh.by) + ' · ' + V.fdatetime(hh.at) };
        })) +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Comentarios</h3></div><div class="card-b col">' +
        (function () {
          var cs = V.all('comments').filter(function (c) { return c.entity === 'work_order' && c.entity_id === w.id; });
          return (cs.length ? cs.map(function (c) {
            return '<div class="file-row" style="align-items:flex-start"><span class="av sm">' + E(V.initials(V.userName(c.user_id))) + '</span>' +
              '<span style="min-width:0"><b class="xs">' + E(V.userName(c.user_id)) + '</b> <span class="xs muted">' + V.frel(c.at) + '</span>' +
              (c.visible ? ' <span class="badge b-green no-dot">Visible al cliente</span>' : '') +
              '<p class="small mt2">' + E(c.text) + '</p></span></div>';
          }).join('') : '<p class="small muted">Sin comentarios.</p>');
        })() +
        (V.can('ordenes', 'editar') ? '<div class="field"><textarea class="textarea" id="cm" style="min-height:60px" placeholder="Escribe un comentario…"></textarea>' +
          '<label class="check mt2"><input type="checkbox" id="cv"><span>Visible para el cliente</span></label>' +
          '<button class="btn btn-outline btn-sm mt2" id="cadd">Comentar</button></div>' : '') +
      '</div></div></div></div>';

    el.innerHTML = h;

    el.querySelectorAll('[data-c]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        w.checklist[+this.dataset.c].done = this.checked;
        V.update('workOrders', w.id, { checklist: w.checklist });
        V.logActivity('work_order', w.id, (this.checked ? 'Completó' : 'Desmarcó') + ' un paso del checklist', 'update');
        APP.reload();
      });
    });
    el.querySelectorAll('[data-u]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        w.materials[+this.dataset.u].used = +this.value || 0;
        V.update('workOrders', w.id, { materials: w.materials });
        UI.toast('Consumo actualizado. Se descontará del inventario al completar la orden.', 'ok'); APP.reload();
      });
    });
    var dz = el.querySelector('#dz'); if (dz) UI.uploader(dz, function () {
      w.photos = (w.photos || []).concat([{ tag: 'durante', name: 'evidencia-' + ((w.photos || []).length + 1) + '.jpg' }]);
      V.update('workOrders', w.id, { photos: w.photos }); APP.reload();
    });
    bind('#pdf', function () { printWO(w); });
    bind('#asg', function () { assignWO(w); });
    bind('#tr', function () { transitionWO(w); });
    bind('#addmat', function () {
      H.pickProduct(function (p) {
        UI.prompt({ title: 'Cantidad planificada', label: p.name, value: '1' }, function (v) {
          w.materials = (w.materials || []).concat([{ product_id: p.id, planned: +v || 1, used: 0, warehouse_id: 'wh_1' }]);
          V.update('workOrders', w.id, { materials: w.materials }); UI.toast('Material agregado.', 'ok'); APP.reload();
        });
      });
    });
    bind('#cadd', function () {
      var txt = el.querySelector('#cm').value.trim();
      if (!txt) { UI.toast('Escribe un comentario.', 'err'); return; }
      V.insert('comments', { entity: 'work_order', entity_id: w.id, user_id: V.getSession().user_id,
        text: txt, visible: el.querySelector('#cv').checked, at: new Date().toISOString() });
      UI.toast('Comentario agregado.', 'ok'); APP.reload();
    });
    function bind(sel, fn) { var b = el.querySelector(sel); if (b) b.addEventListener('click', fn); }
  }

  function transitionWO(w) {
    var next = V.WO_STATES[w.status].next;
    UI.modal({
      title: 'Cambiar estado de la orden',
      subtitle: w.number + ' · actual: ' + V.WO_STATES[w.status].label,
      body: '<div class="field"><label for="ns">Nuevo estado</label><select class="select" id="ns">' +
        next.map(function (k) { return '<option value="' + k + '">' + V.WO_STATES[k].label + '</option>'; }).join('') + '</select>' +
        '<span class="hint">Solo se ofrecen las transiciones permitidas por la máquina de estados.</span></div>' +
        '<div class="field mt4"><label for="nt">Nota (opcional)</label><input class="input" id="nt"></div>' +
        (next.indexOf('COMPLETED') >= 0 ? '<div class="banner banner-warn mt4">' + I('alert', 15) +
          '<div>Para completar se exige el checklist obligatorio terminado y la firma del cliente.</div></div>' : ''),
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Aplicar</button>',
      onMount: function (m) {
        m.querySelector('#ok').addEventListener('click', function () {
          var res = V.woTransition(w.id, m.querySelector('#ns').value, m.querySelector('#nt').value.trim());
          if (!res.ok) { UI.toast(res.error, 'err'); return; }
          UI.closeTop(); UI.toast('Estado actualizado.', 'ok'); APP.reload(); APP.refreshChrome();
        });
      }
    });
  }

  function assignWO(w) {
    UI.modal({
      title: 'Asignar / reasignar técnicos', subtitle: w.number,
      body: '<div class="col" style="gap:6px">' + V.all('technicians').map(function (t) {
        var carga = V.all('workOrders').filter(function (x) { return (x.technicians || []).indexOf(t.id) >= 0 && ['CLOSED','CANCELLED'].indexOf(x.status) < 0; }).length;
        return '<label class="check" style="border:1px solid var(--border);border-radius:8px;padding:9px 10px">' +
          '<input type="checkbox" data-t="' + t.id + '"' + ((w.technicians || []).indexOf(t.id) >= 0 ? ' checked' : '') + '>' +
          '<span style="flex:1"><b class="small">' + E(t.name) + '</b> <span class="xs muted">' + E(t.level) + '</span>' +
          '<div class="xs muted">' + E(t.zone) + ' · ' + carga + ' órdenes activas · puntualidad ' + t.kpi.puntualidad + '%</div></span></label>';
      }).join('') + '</div>' +
      '<div class="field mt4"><label for="rn">Motivo de la reasignación</label><input class="input" id="rn" placeholder="Queda en el historial"></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar asignación</button>',
      onMount: function (m) {
        m.querySelector('#ok').addEventListener('click', function () {
          var tecs = Array.prototype.slice.call(m.querySelectorAll('[data-t]:checked')).map(function (x) { return x.dataset.t; });
          var nota = m.querySelector('#rn').value.trim();
          V.update('workOrders', w.id, { technicians: tecs });
          w.history = (w.history || []).concat([{ status: w.status, at: new Date().toISOString(), by: V.getSession().user_id,
            note: 'Asignación: ' + (tecs.map(V.techName).join(', ') || 'sin técnicos') + (nota ? ' · ' + nota : '') }]);
          V.update('workOrders', w.id, { history: w.history });
          if (tecs.length && w.status === 'SCHEDULED') V.woTransition(w.id, 'ASSIGNED', 'Técnico asignado');
          V.logActivity('work_order', w.id, 'Reasignó la orden a ' + (tecs.map(V.techName).join(', ') || 'nadie'), 'update');
          V.logAudit('UPDATE', 'work_order_assignments', w.number, tecs.join(','));
          tecs.forEach(function (tid) { var t = V.byId('technicians', tid);
            if (t && t.user_id) V.notify(t.user_id, 'info', 'Orden asignada', w.number + ' — ' + w.title, '#ordenes/' + w.id); });
          UI.closeTop(); UI.toast('Asignación guardada.', 'ok'); APP.reload();
        });
      }
    });
  }

  function printWO(w) {
    var tn = V.myTenant(), c = V.byId('customers', w.customer_id) || {};
    var minutos = (w.timeEntries || []).reduce(function (a, t) { return a + (t.min || 0); }, 0);
    UI.printDoc('Informe ' + w.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(tn.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(tn.address) + '<br>' + E(tn.phone) + ' · ' + E(tn.email) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">INFORME DE SERVICIO</h2>' +
      '<p style="font-size:13px"><b>' + E(w.number) + '</b><br>' + V.fdate(w.start, true) + '</p></div></div>' +
      '<div style="display:flex;gap:36px;margin-top:20px;font-size:12.5px;flex-wrap:wrap">' +
      '<div><b>Cliente</b><br>' + E(c.name) + '<br>' + E(c.taxId || '') + '</div>' +
      '<div><b>Ubicación</b><br>' + E(V.siteName(w.site_id)) + '<br>' + E((V.byId('sites', w.site_id) || {}).address || '') + '</div>' +
      '<div><b>Tipo</b><br>' + E(V.WO_TYPES[w.type]) + '</div>' +
      '<div><b>Técnico</b><br>' + E((w.technicians || []).map(V.techName).join(', ') || '—') + '</div>' +
      '<div><b>Duración</b><br>' + Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min</div></div>' +
      '<h3 style="margin-top:22px">Trabajo realizado</h3><p>' + E(w.title) + (w.description ? '. ' + E(w.description) : '') + '</p>' +
      ((w.checklist || []).length ? '<h3 style="margin-top:18px">Checklist ejecutado</h3><table><thead><tr><th>Paso</th><th style="width:90px">Resultado</th></tr></thead><tbody>' +
        w.checklist.map(function (ch) { return '<tr><td>' + E(ch.text) + '</td><td>' + (ch.done ? 'Completado' : 'Pendiente') + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      ((w.materials || []).filter(function (m) { return m.used > 0; }).length ? '<h3>Materiales utilizados</h3><table><thead><tr><th>Material</th><th style="text-align:right">Cantidad</th></tr></thead><tbody>' +
        w.materials.filter(function (m) { return m.used > 0; }).map(function (m) {
          var p = V.byId('products', m.product_id) || {};
          return '<tr><td>' + E(p.name || '—') + '</td><td style="text-align:right">' + m.used + ' ' + E(p.unit || '') + '</td></tr>';
        }).join('') + '</tbody></table>' : '') +
      (w.result ? '<h3 style="margin-top:18px">Resultado</h3><p>' + E(w.result) + '</p>' : '') +
      (w.recommendations ? '<h3 style="margin-top:14px">Recomendaciones</h3><p>' + E(w.recommendations) + '</p>' : '') +
      '<div style="margin-top:54px;display:flex;gap:60px">' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Técnico<br><b>' + E((w.technicians || []).map(V.techName).join(', ') || '') + '</b></div>' +
      '<div style="flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px">Conformidad del cliente<br><b>' +
        (w.signature ? E(w.signature.name) + ' — ' + V.fdate(w.signature.at) : '') + '</b></div></div>' +
      '<p style="margin-top:28px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* ============================================================
     I) AGENDA, CALENDARIO Y DESPACHO §6.9
     ============================================================ */
  views.agenda = function (el) {
    var cur = V.today(), mode = 'mes';
    function render() {
      var h = PH({
        title: 'Agenda y despacho',
        sub: 'Vistas día, semana, mes y timeline por técnico · arrastra para reprogramar',
        actions: '<div class="seg" id="md">' + ['dia','semana','mes','timeline'].map(function (m) {
            return '<button data-m="' + m + '" class="' + (mode === m ? 'on' : '') + '">' + (m === 'dia' ? 'Día' : m === 'semana' ? 'Semana' : m === 'mes' ? 'Mes' : 'Timeline') + '</button>';
          }).join('') + '</div>' +
          (V.can('ordenes', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva orden</button>' : '')
      });

      h += '<div class="grid g-2-1"><div>' +
        '<div class="card"><div class="card-h">' +
        '<div class="row gap2"><button class="btn btn-outline btn-sm btn-icon" id="prev">' + I('chevL', 15) + '</button>' +
        '<button class="btn btn-outline btn-sm" id="today">Hoy</button>' +
        '<button class="btn btn-outline btn-sm btn-icon" id="nextb">' + I('chevR', 15) + '</button>' +
        '<h3 style="margin-left:8px">' + label() + '</h3></div>' +
        '<div class="row gap2"><span class="xs muted">' + V.all('workOrders').filter(inRange).length + ' orden(es)</span></div>' +
        '</div><div class="card-b" id="calbody"></div></div></div>';

      /* órdenes sin asignar + ausencias */
      var sin = V.all('workOrders').filter(function (w) { return !(w.technicians || []).length && ['CLOSED','CANCELLED'].indexOf(w.status) < 0; });
      h += '<div class="col">' +
        '<div class="card"><div class="card-h"><h3>Órdenes sin asignar</h3><span class="badge b-amber no-dot">' + sin.length + '</span></div><div class="card-b col" style="gap:8px">' +
        (sin.length ? sin.map(function (w) {
          return '<div class="kcard" style="margin:0"><div class="spread"><b class="xs">' + E(w.number) + '</b>' + UI.badge(V.PRIORITIES, w.priority) + '</div>' +
            '<div class="small bold mt2">' + E(w.title) + '</div>' +
            '<div class="xs muted mt2">' + E(V.customerName(w.customer_id)) + ' · ' + V.fdate(w.start) + '</div>' +
            '<button class="btn btn-outline btn-sm mt2 btn-block" data-as="' + w.id + '">' + I('hardhat', 13) + ' Asignar</button></div>';
        }).join('') : '<p class="small muted">Todas las órdenes tienen técnico asignado.</p>') + '</div></div>' +

        '<div class="card"><div class="card-h"><h3>Disponibilidad de hoy</h3></div><div class="card-b col" style="gap:9px">' +
        V.all('technicians').map(function (t) {
          var hoy = V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0 && V.ymd(w.start) === V.ymd(V.today()); });
          var horas = hoy.reduce(function (a, w) { return a + w.estimated; }, 0);
          var abs = V.all('absences').filter(function (a) { return a.technician_id === t.id && V.ymd(V.today()) >= a.from && V.ymd(V.today()) <= a.to; })[0];
          return '<div class="spread"><div class="row gap2">' + UI.avatar(t.name, 'sm') +
            '<span><b class="small" style="display:block">' + E(t.name) + '</b><span class="xs muted">' + E(t.schedule) + '</span></span></div>' +
            (abs ? '<span class="badge b-red">' + E(abs.reason) + '</span>' :
              '<span class="badge ' + (horas >= 8 ? 'b-red' : horas >= 5 ? 'b-amber' : 'b-green') + '">' + horas + ' h</span>') + '</div>';
        }).join('') + '</div></div>' +

        '<div class="card"><div class="card-h"><h3>Ausencias registradas</h3>' +
          (V.can('tecnicos', 'crear') ? '<button class="btn btn-ghost btn-sm" id="nabs">' + I('plus', 14) + '</button>' : '') + '</div><div class="card-b col" style="gap:8px">' +
        (V.all('absences').length ? V.all('absences').map(function (a) {
          return '<div class="file-row"><span class="file-ico">' + I('calendar', 15) + '</span>' +
            '<span><b class="small" style="display:block">' + E(V.techName(a.technician_id)) + '</b>' +
            '<span class="xs muted">' + E(a.reason) + ' · ' + V.fdate(a.from) + ' → ' + V.fdate(a.to) + '</span></span></div>';
        }).join('') : '<p class="small muted">Sin ausencias registradas.</p>') + '</div></div>' +
        '</div></div>';

      el.innerHTML = h;

      var body = el.querySelector('#calbody');
      if (mode === 'mes') body.innerHTML = monthView();
      if (mode === 'semana') body.innerHTML = weekView();
      if (mode === 'dia') body.innerHTML = dayView();
      if (mode === 'timeline') body.innerHTML = timelineView();
      bindCal(body);

      el.querySelectorAll('#md button').forEach(function (b) {
        b.addEventListener('click', function () { mode = this.dataset.m; render(); });
      });
      el.querySelector('#prev').addEventListener('click', function () { shift(-1); render(); });
      el.querySelector('#nextb').addEventListener('click', function () { shift(1); render(); });
      el.querySelector('#today').addEventListener('click', function () { cur = V.today(); render(); });
      var nb = el.querySelector('#new'); if (nb) nb.addEventListener('click', function () { newWO(); });
      el.querySelectorAll('[data-as]').forEach(function (b) {
        b.addEventListener('click', function () { assignWO(V.byId('workOrders', this.dataset.as)); });
      });
      var na = el.querySelector('#nabs');
      if (na) na.addEventListener('click', function () {
        UI.modal({ title: 'Registrar ausencia',
          body: '<div class="field"><label for="at">Técnico</label><select class="select" id="at">' + opt(V.all('technicians')) + '</select></div>' +
            '<div class="grid g2 mt4"><div class="field"><label for="af">Desde</label><input class="input" id="af" type="date" value="' + V.ymd(V.today()) + '"></div>' +
            '<div class="field"><label for="ax">Hasta</label><input class="input" id="ax" type="date" value="' + V.ymd(V.addDays(V.today(), 3)) + '"></div></div>' +
            '<div class="field mt4"><label for="ar">Motivo</label><select class="select" id="ar"><option>Vacaciones</option><option>Reposo médico</option><option>Permiso</option><option>Capacitación</option></select></div>',
          footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Registrar</button>',
          onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
            V.insert('absences', { technician_id: m.querySelector('#at').value, from: m.querySelector('#af').value,
              to: m.querySelector('#ax').value, reason: m.querySelector('#ar').value });
            UI.closeTop(); UI.toast('Ausencia registrada.', 'ok'); render();
          }); } });
      });
    }

    function shift(d) {
      if (mode === 'mes') cur = new Date(cur.getFullYear(), cur.getMonth() + d, 1);
      else if (mode === 'semana') cur = V.addDays(cur, d * 7);
      else cur = V.addDays(cur, d);
    }
    function label() {
      if (mode === 'mes') return V.MONTHS_L[cur.getMonth()].charAt(0).toUpperCase() + V.MONTHS_L[cur.getMonth()].slice(1) + ' ' + cur.getFullYear();
      if (mode === 'semana') { var s = startOfWeek(cur); return V.fdate(s) + ' — ' + V.fdate(V.addDays(s, 6)); }
      return V.DOWS[cur.getDay()] + ' ' + V.fdate(cur, true);
    }
    function startOfWeek(d) { var x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; }
    function inRange(w) {
      var d = new Date(w.start);
      if (mode === 'mes') return d.getMonth() === cur.getMonth() && d.getFullYear() === cur.getFullYear();
      if (mode === 'semana') { var s = startOfWeek(cur); return d >= s && d < V.addDays(s, 7); }
      if (mode === 'dia') return V.ymd(d) === V.ymd(cur);
      return true;
    }
    function evClass(w) {
      return { EN_ROUTE: 'ev-o', ON_SITE: 'ev-o', IN_PROGRESS: 'ev-o', SCHEDULED: 'ev-b', ASSIGNED: 'ev-b',
               COMPLETED: 'ev-g', CLOSED: 'ev-g', REVIEW: 'ev-a', PAUSED: 'ev-a', DRAFT: 'ev-n', CANCELLED: 'ev-n' }[w.status] || 'ev-n';
    }
    function monthView() {
      return UI.monthGrid(cur.getFullYear(), cur.getMonth(), function (d) {
        return V.all('workOrders').filter(function (w) { return V.ymd(w.start) === V.ymd(d); })
          .sort(function (a, b) { return new Date(a.start) - new Date(b.start); })
          .map(function (w) { return { id: w.id, cls: evClass(w), label: V.hm(w.start) + ' ' + w.title,
            title: w.number + ' — ' + w.title + ' (' + V.WO_STATES[w.status].label + ')' }; });
      }, { max: 3 });
    }
    function weekView() {
      var s = startOfWeek(cur);
      var h = '<div class="grid" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:8px">';
      for (var i = 0; i < 7; i++) {
        var d = V.addDays(s, i);
        var evs = V.all('workOrders').filter(function (w) { return V.ymd(w.start) === V.ymd(d); })
          .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
        h += '<div class="day" data-date="' + V.ymd(d) + '" style="border:1px solid var(--border);border-radius:10px;min-height:190px;padding:8px' +
          (V.ymd(d) === V.ymd(V.today()) ? ';background:var(--primary-050)' : '') + '">' +
          '<div class="xs bold mb2">' + V.DOWS[d.getDay()] + ' ' + d.getDate() + '</div>' +
          evs.map(function (w) {
            return '<span class="ev ' + evClass(w) + '" draggable="true" data-ev="' + w.id + '" title="' + E(w.number + ' ' + w.title) + '">' +
              V.hm(w.start) + ' ' + E(w.title) + '</span>';
          }).join('') + (evs.length ? '' : '<p class="xs muted">—</p>') + '</div>';
      }
      return h + '</div>';
    }
    function dayView() {
      var evs = V.all('workOrders').filter(function (w) { return V.ymd(w.start) === V.ymd(cur); })
        .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
      if (!evs.length) return UI.emptyState({ icon: 'calendar', title: 'Sin trabajos este día', text: 'Crea o reprograma una orden para esta fecha.' });
      var h = '<div class="col">';
      for (var hr = 6; hr <= 19; hr++) {
        var inHr = evs.filter(function (w) { return new Date(w.start).getHours() === hr; });
        h += '<div class="row" style="align-items:flex-start;border-top:1px solid var(--border);padding:6px 0">' +
          '<span class="xs muted mono" style="width:52px;flex:none">' + V.pad(hr) + ':00</span>' +
          '<div style="flex:1" class="col" style="gap:4px">' +
          (inHr.length ? inHr.map(function (w) {
            return '<a href="#ordenes/' + w.id + '" class="file-row" style="text-decoration:none;border-left:3px solid ' +
              ({ 'ev-o': '#E85D04', 'ev-b': '#2563EB', 'ev-g': '#16A34A', 'ev-a': '#F59E0B', 'ev-n': '#9CA3AF' }[evClass(w)]) + '">' +
              '<span style="min-width:0"><b class="small" style="color:var(--text);display:block">' + E(w.title) + '</b>' +
              '<span class="xs muted">' + E(w.number) + ' · ' + E(V.customerName(w.customer_id)) + ' · ' + ((w.technicians || []).map(V.techName).join(', ') || 'sin asignar') + '</span></span>' +
              '<span style="margin-left:auto">' + UI.badge(V.WO_STATES, w.status) + '</span></a>';
          }).join('') : '<span class="xs muted">—</span>') + '</div></div>';
      }
      return h + '</div>';
    }
    function timelineView() {
      var s = V.ymd(cur);
      var h = '<div class="gantt"><div class="gantt-row" style="border-bottom:2px solid var(--border)">' +
        '<div class="gantt-name xs muted">Técnico</div><div class="row" style="position:relative">' +
        Array.apply(null, Array(12)).map(function (_, i) { return '<span class="xs muted" style="flex:1;text-align:center">' + V.pad(i + 7) + 'h</span>'; }).join('') +
        '</div></div>';
      V.all('technicians').forEach(function (t) {
        var evs = V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0 && V.ymd(w.start) === s; });
        h += '<div class="gantt-row"><div class="gantt-name">' + UI.avatar(t.name, 'sm') + '<span class="truncate">' + E(t.name) + '</span></div>' +
          '<div class="gantt-track">' + evs.map(function (w) {
            var st = new Date(w.start), en = new Date(w.end);
            var from = ((st.getHours() + st.getMinutes() / 60) - 7) / 12 * 100;
            var width = ((en - st) / 3600000) / 12 * 100;
            var col = { 'ev-o': '#E85D04', 'ev-b': '#2563EB', 'ev-g': '#16A34A', 'ev-a': '#F59E0B', 'ev-n': '#9CA3AF' }[evClass(w)];
            return '<a href="#ordenes/' + w.id + '" class="gantt-bar" style="left:' + Math.max(0, from) + '%;width:' + Math.max(6, width) + '%;background:' + col +
              '" title="' + E(w.number + ' ' + w.title) + '">' + E(w.title) + '</a>';
          }).join('') + '</div></div>';
      });
      return h + '</div><p class="xs muted mt2">Timeline del ' + V.fdate(cur, true) + ' (07:00–19:00).</p>';
    }
    function bindCal(body) {
      var dragId = null;
      body.querySelectorAll('[data-ev]').forEach(function (ev) {
        ev.addEventListener('dragstart', function (e) { dragId = this.dataset.ev; e.stopPropagation(); });
        ev.addEventListener('click', function (e) { e.preventDefault(); location.hash = 'ordenes/' + this.dataset.ev; });
      });
      body.querySelectorAll('[data-date]').forEach(function (d) {
        d.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('over'); });
        d.addEventListener('dragleave', function () { this.classList.remove('over'); });
        d.addEventListener('drop', function (e) {
          e.preventDefault(); this.classList.remove('over');
          if (!dragId) return;
          if (!V.can('ordenes', 'editar')) { UI.toast('No tienes permiso para reprogramar.', 'err'); return; }
          var w = V.byId('workOrders', dragId), nd = this.dataset.date;
          if (!w) return;
          UI.confirm({ title: '¿Reprogramar la orden?', body: w.number + ' se moverá al ' + V.fdate(nd, true) + ', manteniendo la hora ' + V.hm(w.start) + '.', ok: 'Reprogramar' },
            function () {
              var os = new Date(w.start), oe = new Date(w.end), dur = oe - os;
              var ns = new Date(nd + 'T' + V.pad(os.getHours()) + ':' + V.pad(os.getMinutes()));
              V.update('workOrders', w.id, { start: ns.toISOString(), end: new Date(ns.getTime() + dur).toISOString() });
              w.history = (w.history || []).concat([{ status: w.status, at: new Date().toISOString(), by: V.getSession().user_id, note: 'Reprogramada al ' + V.fdate(nd) }]);
              V.update('workOrders', w.id, { history: w.history });
              V.logActivity('work_order', w.id, 'Reprogramó la orden al ' + V.fdate(nd), 'update');
              UI.toast('Orden reprogramada.', 'ok'); render();
            });
        });
      });
    }
    render();
  };

  /* ============================================================
     J) MAPA OPERATIVO §6.10
     ============================================================ */
  views.mapa = function (el) {
    var filt = { tec: '', st: '', pr: '' };
    function render() {
      var wos = V.all('workOrders').filter(function (w) {
        if (['CLOSED', 'CANCELLED'].indexOf(w.status) >= 0) return false;
        if (filt.tec && (w.technicians || []).indexOf(filt.tec) < 0) return false;
        if (filt.st && w.status !== filt.st) return false;
        if (filt.pr && w.priority !== filt.pr) return false;
        return true;
      });
      var h = PH({
        title: 'Mapa operativo',
        sub: 'Órdenes activas y última ubicación conocida de los técnicos durante la jornada',
        actions: '<button class="btn btn-outline btn-sm" id="pol">' + I('shield', 15) + ' Política de geolocalización</button>'
      });
      h += '<div class="banner banner-info mb4">' + I('info', 16) +
        '<div>La ubicación se registra únicamente durante la jornada laboral y con consentimiento del técnico; no se almacena seguimiento continuo más tiempo del necesario.</div></div>';

      h += '<div class="grid g-2-1"><div class="card"><div class="tbl-toolbar">' +
        '<select class="select" id="ft" style="width:auto"><option value="">Todos los técnicos</option>' + opt(V.all('technicians'), filt.tec) + '</select>' +
        '<select class="select" id="fs" style="width:auto"><option value="">Todos los estados</option>' +
          Object.keys(V.WO_STATES).map(function (k) { return '<option value="' + k + '"' + (filt.st === k ? ' selected' : '') + '>' + V.WO_STATES[k].label + '</option>'; }).join('') + '</select>' +
        '<select class="select" id="fp" style="width:auto"><option value="">Toda prioridad</option>' +
          Object.keys(V.PRIORITIES).map(function (k) { return '<option value="' + k + '"' + (filt.pr === k ? ' selected' : '') + '>' + V.PRIORITIES[k].label + '</option>'; }).join('') + '</select>' +
        '<span class="small muted" style="margin-left:auto">' + wos.length + ' orden(es)</span></div>' +
        '<div class="card-b">' + bigMap(wos) + '</div></div>';

      h += '<div class="col">' +
        '<div class="card"><div class="card-h"><h3>Técnicos en ruta</h3></div><div class="card-b col" style="gap:9px">' +
        V.all('technicians').map(function (t) {
          var act = V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0 && ['EN_ROUTE','ON_SITE','IN_PROGRESS'].indexOf(w.status) >= 0; })[0];
          return '<div class="file-row"><span class="av sm dark">' + E(V.initials(t.name)) + '</span>' +
            '<span style="min-width:0"><b class="small" style="display:block">' + E(t.name) + '</b>' +
            '<span class="xs muted">' + (act ? V.WO_STATES[act.status].label + ' · ' + E(act.number) : 'Sin orden activa') + '</span></span>' +
            (act ? '<a href="#ordenes/' + act.id + '" style="margin-left:auto" class="btn btn-ghost btn-sm btn-icon">' + I('chevR', 15) + '</a>' : '') + '</div>';
        }).join('') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Órdenes en el mapa</h3></div><div class="card-b col" style="gap:8px;max-height:400px;overflow:auto">' +
        (wos.length ? wos.map(function (w) {
          var s = V.byId('sites', w.site_id) || {};
          return '<a href="#ordenes/' + w.id + '" class="file-row" style="text-decoration:none">' +
            '<span class="file-ico">' + I('pin', 15) + '</span>' +
            '<span style="min-width:0"><b class="small truncate" style="display:block;color:var(--text)">' + E(w.title) + '</b>' +
            '<span class="xs muted">' + E(w.number) + ' · ' + E(s.address || '') + '</span></span>' +
            '<span style="margin-left:auto">' + UI.badge(V.WO_STATES, w.status) + '</span></a>';
        }).join('') : '<p class="small muted">Sin órdenes que coincidan con los filtros.</p>') + '</div></div></div></div>';

      el.innerHTML = h;
      el.querySelector('#ft').addEventListener('change', function () { filt.tec = this.value; render(); });
      el.querySelector('#fs').addEventListener('change', function () { filt.st = this.value; render(); });
      el.querySelector('#fp').addEventListener('change', function () { filt.pr = this.value; render(); });
      el.querySelector('#pol').addEventListener('click', function () {
        UI.modal({ title: 'Política de geolocalización',
          body: '<div class="col">' +
            '<div class="banner banner-brand">' + I('shield', 15) + '<div><b>Principio:</b> registrar la ubicación solo cuando es necesaria para la operación, con transparencia y control organizacional.</div></div>' +
            '<div class="col" style="gap:8px">' +
            [['Ventana laboral', 'Lunes a sábado, 07:00 – 18:00'],
             ['Frecuencia', 'Cada 10 minutos únicamente con una orden activa'],
             ['Finalidad', 'Despacho, seguridad del personal y verificación de asistencia'],
             ['Retención', '30 días; luego se elimina automáticamente'],
             ['Consentimiento', 'Aceptación explícita del técnico en la PWA'],
             ['Acceso', 'Coordinación y administración; nunca visible al cliente']]
              .map(function (r) { return kv(r[0], E(r[1])); }).join('') +
            '</div></div>' });
      });
    }
    function bigMap(wos) {
      var h = '<div class="map" style="min-height:460px">' +
        '<div class="road" style="left:0;right:0;top:44%;height:8px"></div>' +
        '<div class="road" style="left:0;right:0;top:78%;height:5px"></div>' +
        '<div class="road" style="top:0;bottom:0;left:36%;width:8px"></div>' +
        '<div class="road" style="top:0;bottom:0;left:70%;width:5px"></div>';
      wos.forEach(function (w) {
        var s = V.byId('sites', w.site_id); if (!s) return;
        var col = { EN_ROUTE: '#F97316', ON_SITE: '#E85D04', IN_PROGRESS: '#E85D04', SCHEDULED: '#2563EB',
                    ASSIGNED: '#2563EB', DRAFT: '#9CA3AF', PAUSED: '#F59E0B', COMPLETED: '#16A34A', REVIEW: '#F59E0B' }[w.status] || '#9CA3AF';
        h += '<a class="pin" href="#ordenes/' + w.id + '" style="left:' + s.lng + '%;top:' + s.lat + '%" title="' + E(w.number + ' — ' + w.title) + '">' +
          '<span class="dot" style="background:' + col + '">' + I('bolt', 12) + '</span>' +
          '<span class="lbl">' + E(w.number.split('-').pop()) + '</span></a>';
      });
      V.all('technicians').forEach(function (t) {
        h += '<a class="pin" href="#tecnicos/' + t.id + '" style="left:' + t.lng + '%;top:' + t.lat + '%" title="' + E(t.name) + '">' +
          '<span class="dot" style="background:#111"><span style="color:#fff;font-size:9px;font-weight:700">' + E(V.initials(t.name)) + '</span></span>' +
          '<span class="lbl">' + E(t.name.split(' ')[0]) + '</span></a>';
      });
      h += '</div><div class="row gap4 mt4 xs muted wrap">' +
        [['#E85D04', 'En ejecución / en sitio'], ['#F97316', 'En camino'], ['#2563EB', 'Programada / asignada'],
         ['#F59E0B', 'Pausada / validación'], ['#16A34A', 'Completada'], ['#111', 'Técnico']]
        .map(function (l) { return '<span class="row gap1"><i style="width:9px;height:9px;border-radius:50%;background:' + l[0] + ';display:inline-block"></i> ' + l[1] + '</span>'; }).join('') +
        '</div>';
      return h;
    }
    render();
  };

  /* ============================================================
     K) TÉCNICOS Y EQUIPOS §6.11
     ============================================================ */
  views.tecnicos = function (el, id) {
    if (id) return techDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Técnicos y equipos',
      sub: 'Habilidades, certificaciones, horarios, tarifas, zona, historial y KPIs',
      actions: V.can('tecnicos', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo técnico</button>' : ''
    });

    var certs = V.expiringCerts();
    if (certs.length) {
      el.insertAdjacentHTML('beforeend', '<div class="banner banner-warn mb4">' + I('shield', 16) +
        '<div><b>' + certs.length + ' certificación(es) por vencer o vencida(s).</b> ' +
        certs.map(function (c) { return E(c.tech.name) + ' — ' + E(c.cert.name) + ' (' + (c.days < 0 ? 'venció hace ' + Math.abs(c.days) + ' días' : 'en ' + c.days + ' días') + ')'; }).join(' · ') +
        '</div></div>');
    }
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () {
      UI.toast('En la demo los técnicos se crean junto con el usuario desde Usuarios y permisos.');
      location.hash = 'usuarios';
    });

    UI.table(host, {
      rows: function () { return V.all('technicians'); },
      search: function (t) { return t.name + ' ' + t.zone + ' ' + (t.skills || []).join(' '); },
      placeholder: 'Buscar técnico, zona o habilidad…', exportName: 'voltx-tecnicos',
      filters: [
        { key: 'ty', label: 'Todos', options: [{ value: 'empleado', label: 'Empleados' }, { value: 'contratista', label: 'Contratistas' }], match: function (r, v) { return r.type === v; } },
        { key: 'br', label: 'Todas las sucursales', options: V.all('branches').map(function (x) { return { value: x.id, label: x.name }; }), match: function (r, v) { return r.branch_id === v; } }
      ],
      cols: [
        { key: 'name', label: 'Técnico', render: function (t) {
            return '<div class="row gap2">' + UI.avatar(t.name) + '<div><div class="bold">' + E(t.name) + '</div>' +
              '<div class="xs muted">' + E(t.level) + ' · ' + E(t.type) + '</div></div></div>'; } },
        { key: 'skills', label: 'Especialidades', sortable: false, render: function (t) {
            return (t.skills || []).slice(0, 3).map(function (s) { return '<span class="chip">' + E(s) + '</span>'; }).join(' ') +
              ((t.skills || []).length > 3 ? ' <span class="xs muted">+' + (t.skills.length - 3) + '</span>' : ''); } },
        { key: 'zone', label: 'Zona', render: function (t) { return '<span class="small">' + E(t.zone) + '</span>'; } },
        { key: 'carga', label: 'Carga activa', right: true, sortVal: function (t) { return loadOf(t); },
          render: function (t) { var c = loadOf(t);
            return '<span class="badge ' + (c >= 4 ? 'b-red' : c >= 2 ? 'b-amber' : 'b-green') + '">' + c + '</span>'; } },
        { key: 'punt', label: 'Puntualidad', right: true, sortVal: function (t) { return t.kpi.puntualidad; },
          render: function (t) { return '<div style="min-width:80px"><span class="xs">' + t.kpi.puntualidad + '%</span>' +
            '<div class="bar mt2 ' + (t.kpi.puntualidad >= 90 ? 'g' : 'a') + '"><i style="width:' + t.kpi.puntualidad + '%"></i></div></div>'; } },
        { key: 'completadas', label: 'Órdenes', right: true, sortVal: function (t) { return t.kpi.completadas; },
          render: function (t) { return '<b class="mono">' + t.kpi.completadas + '</b>'; } },
        { key: 'rating', label: 'Valoración', right: true, sortVal: function (t) { return t.kpi.rating; },
          render: function (t) { return '<span class="row gap1" style="justify-content:flex-end">' + I('star', 13) + '<b>' + t.kpi.rating + '</b></span>'; } },
        { key: 'rate', label: 'Costo/h', right: true, render: function (t) { return '<span class="mono">' + V.money(t.rate) + '</span>'; } }
      ],
      onRow: function (rid) { location.hash = 'tecnicos/' + rid; }
    });
  };
  function loadOf(t) {
    return V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0 && ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; }).length;
  }

  function techDetail(el, id) {
    var t = V.byId('technicians', id);
    if (!t) { el.innerHTML = PH({ title: 'Técnico' }) + UI.errorState('El técnico no existe.'); return; }
    var wos = V.all('workOrders').filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0; });
    var tks = V.all('tickets').filter(function (x) { return x.assignee === t.id; });

    var h = PH({
      crumbs: [{ label: 'Técnicos', href: '#tecnicos' }, { label: t.name }],
      title: t.name,
      sub: E(t.level) + ' · ' + E(t.type) + ' · ' + E(t.zone) + ' · ' + E((V.byId('branches', t.branch_id) || {}).name || ''),
      actions: '<button class="btn btn-outline btn-sm" id="cert">' + I('shield', 15) + ' Agregar certificación</button>'
    });

    h += '<div class="grid g4">' +
      UI.kpi({ label: 'Órdenes completadas', value: t.kpi.completadas, icon: 'checkCircle' }) +
      UI.kpi({ label: 'Puntualidad', value: t.kpi.puntualidad + '%', icon: 'clock', trend: t.kpi.puntualidad >= 90 ? 'up' : 'down' }) +
      UI.kpi({ label: 'Retrabajos', value: t.kpi.retrabajos, icon: 'refresh', trend: t.kpi.retrabajos > 3 ? 'down' : 'up' }) +
      UI.kpi({ label: 'Horas registradas', value: t.kpi.horas, icon: 'gauge', sub: 'Valoración ' + t.kpi.rating + '/5' }) +
      '</div>';

    h += '<div class="grid g-2-1 mt4"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Certificaciones</h3></div><div class="card-b">' +
      ((t.certifications || []).length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Certificación</th><th>Vence</th><th class="right">Estado</th></tr></thead><tbody>' +
        t.certifications.map(function (c) {
          var d = V.daysTo(c.expires);
          return '<tr><td class="bold">' + E(c.name) + '</td><td class="small">' + V.fdate(c.expires) + '</td>' +
            '<td class="right">' + (d < 0 ? '<span class="badge b-red">Vencida</span>' : d <= 30 ? '<span class="badge b-amber">Vence en ' + d + ' días</span>' : '<span class="badge b-green">Vigente</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="small muted">Sin certificaciones registradas.</p>') + '</div></div>' +

      '<div class="card"><div class="card-h"><h3>Historial de órdenes</h3><span class="small muted">' + wos.length + '</span></div>' +
      (wos.length ? listTable(wos.slice(0, 15), [
        ['Número', function (w) { return '<b>' + E(w.number) + '</b>'; }],
        ['Trabajo', function (w) { return E(w.title); }],
        ['Cliente', function (w) { return E(V.customerName(w.customer_id)); }],
        ['Fecha', function (w) { return V.fdate(w.start); }],
        ['Estado', function (w) { return UI.badge(V.WO_STATES, w.status); }]
      ], '', function (w) { return '#ordenes/' + w.id; }) : '<div class="card-b"><p class="small muted">Sin órdenes asignadas.</p></div>') + '</div>' +

      '<div class="card"><div class="card-h"><h3>Incidencias asignadas</h3></div>' +
      (tks.length ? listTable(tks, [
        ['Número', function (x) { return '<b>' + E(x.number) + '</b>'; }],
        ['Asunto', function (x) { return E(x.subject); }],
        ['Tipo', function (x) { return '<span class="chip">' + E(x.type) + '</span>'; }],
        ['Estado', function (x) { return UI.badge(V.TICKET_STATES, x.status); }]
      ], '', function (x) { return '#incidencias/' + x.id; }) : '<div class="card-b"><p class="small muted">Sin incidencias.</p></div>') + '</div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        '<div class="row gap2 mb2">' + UI.avatar(t.name, 'xl') + '<div><b>' + E(t.name) + '</b><div class="xs muted">' + E(t.phone) + '</div></div></div>' +
        kv('Usuario del sistema', E(V.userName(t.user_id))) + kv('Nivel', E(t.level)) +
        kv('Tipo', E(t.type)) + kv('Costo por hora', V.money(t.rate)) +
        kv('Zona de trabajo', E(t.zone)) + kv('Horario', E(t.schedule)) +
        kv('Vehículo / equipo', E(t.vehicle)) + kv('Carga activa', loadOf(t) + ' órdenes') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Especialidades</h3></div><div class="card-b row wrap gap2">' +
        (t.skills || []).map(function (s) { return '<span class="chip">' + E(s) + '</span>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Herramientas entregadas</h3></div><div class="card-b col" style="gap:6px">' +
        ((t.tools || []).length ? t.tools.map(function (x) { return '<div class="row gap2 small">' + I('wrench', 14) + E(x) + '</div>'; }).join('') : '<p class="small muted">Sin herramientas registradas.</p>') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Ausencias</h3></div><div class="card-b">' +
        (function () {
          var abs = V.all('absences').filter(function (a) { return a.technician_id === t.id; });
          return abs.length ? abs.map(function (a) { return '<div class="file-row mb2"><span class="file-ico">' + I('calendar', 15) + '</span>' +
            '<span><b class="small" style="display:block">' + E(a.reason) + '</b><span class="xs muted">' + V.fdate(a.from) + ' → ' + V.fdate(a.to) + '</span></span></div>'; }).join('')
            : '<p class="small muted">Sin ausencias registradas.</p>';
        })() + '</div></div></div></div>';

    el.innerHTML = h;
    el.querySelector('#cert').addEventListener('click', function () {
      UI.modal({ title: 'Agregar certificación',
        body: '<div class="field"><label for="cn">Nombre <span class="req">*</span></label><input class="input" id="cn"></div>' +
              '<div class="field mt4"><label for="ce">Fecha de vencimiento</label><input class="input" id="ce" type="date" value="' + V.ymd(V.addDays(V.today(), 365)) + '"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          var n = m.querySelector('#cn').value.trim(); if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          t.certifications = (t.certifications || []).concat([{ name: n, expires: m.querySelector('#ce').value }]);
          V.update('technicians', t.id, { certifications: t.certifications });
          V.logAudit('UPDATE', 'technician_certifications', t.id, n);
          UI.closeTop(); UI.toast('Certificación agregada.', 'ok'); APP.reload();
        }); } });
    });
  }

  APP.helpers.newWO = newWO;
  APP.helpers.assignWO = assignWO;
})();
