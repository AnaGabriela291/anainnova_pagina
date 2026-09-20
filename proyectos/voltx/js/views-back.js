/* ============================================================
   VOLTX — Módulos: Inventario, Compras, Facturación,
   Mantenimientos, Activos, Documentos, Incidencias.
   §6.12 – §6.18
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX, PH = APP.pageHeader, views = APP.views;
  var H = APP.helpers, kv = H.kv, opt = H.opt, stateOpts = H.stateOpts, listTable = H.listTable;

  /* ============================================================
     L) INVENTARIO §6.12
     ============================================================ */
  views.inventario = function (el) {
    var tab = 'catalogo';
    function render() {
      var prods = V.all('products'), low = V.lowStock();
      var valor = prods.reduce(function (a, p) { return a + V.stockOf(p) * p.cost; }, 0);

      var h = PH({
        title: 'Inventario',
        sub: 'Control de materiales desde la compra hasta la reserva, consumo, devolución o ajuste',
        actions: (V.can('inventario', 'crear') ? '<button class="btn btn-outline btn-sm" id="mov">' + I('refresh', 15) + ' Registrar movimiento</button>' : '') +
                 (V.can('inventario', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo material</button>' : '')
      });

      h += '<div class="grid g4">' +
        UI.kpi({ label: 'Valor del inventario', value: V.money(valor), icon: 'box' }) +
        UI.kpi({ label: 'SKU activos', value: prods.length, icon: 'list' }) +
        UI.kpi({ label: 'Bajo mínimo', value: low.length, icon: 'alert', trend: low.length ? 'down' : 'up', sub: low.length ? 'Requiere reposición' : 'Todo en nivel' }) +
        UI.kpi({ label: 'Almacenes y vehículos', value: V.all('warehouses').length, icon: 'truck' }) +
        '</div>';

      if (low.length) {
        h += '<div class="banner banner-warn mt4">' + I('box', 16) + '<div><b>' + low.length + ' material(es) bajo el mínimo:</b> ' +
          low.map(function (p) { return E(p.name) + ' (' + V.stockOf(p) + '/' + p.min + ')'; }).join(' · ') +
          (V.can('compras', 'crear') ? ' <a href="#compras" class="bold">Generar orden de compra</a>' : '') + '</div></div>';
      }

      h += '<div class="card mt4"><div class="tabs" id="tabs">' +
        [['catalogo', 'Catálogo y stock'], ['almacenes', 'Por almacén'], ['movimientos', 'Movimientos'], ['kits', 'Kits de materiales']]
          .map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
        '</div><div id="tc"></div></div>';

      el.innerHTML = h;
      var tc = el.querySelector('#tc');

      if (tab === 'catalogo') {
        UI.table(tc, {
          rows: function () { return V.all('products'); },
          search: function (p) { return p.sku + ' ' + p.name + ' ' + p.category + ' ' + p.brand; },
          placeholder: 'Buscar por SKU, nombre, marca o categoría…', exportName: 'voltx-inventario', per: 12,
          filters: [
            { key: 'cat', label: 'Todas las categorías', options: H.uniq(prods.map(function (p) { return p.category; })).map(function (c) { return { value: c, label: c }; }), match: function (r, v) { return r.category === v; } },
            { key: 'lo', label: 'Todo el stock', options: [{ value: 'low', label: 'Solo bajo mínimo' }], match: function (r) { return V.stockOf(r) < r.min; } }
          ],
          cols: [
            { key: 'sku', label: 'SKU', render: function (p) { return '<span class="mono small bold">' + E(p.sku) + '</span>'; } },
            { key: 'name', label: 'Material', render: function (p) { return '<div class="bold">' + E(p.name) + '</div><div class="xs muted">' + E(p.category) + (p.brand ? ' · ' + E(p.brand) : '') + '</div>'; } },
            { key: 'stock', label: 'Disponible', right: true, sortVal: V.stockOf, render: function (p) {
                var s = V.stockOf(p);
                return '<b class="mono ' + (s < p.min ? 'prio-critica' : '') + '">' + s + '</b> <span class="xs muted">' + E(p.unit) + '</span>'; } },
            { key: 'reserved', label: 'Reservado', right: true, sortVal: reservedOf, render: function (p) { var r = reservedOf(p); return r ? '<span class="mono">' + r + '</span>' : '<span class="muted">—</span>'; } },
            { key: 'min', label: 'Mín. / Máx.', right: true, render: function (p) { return '<span class="xs muted mono">' + p.min + ' / ' + p.max + '</span>'; } },
            { key: 'nivel', label: 'Nivel', sortable: false, render: function (p) {
                var s = V.stockOf(p), pct = Math.min(100, Math.round((s / Math.max(1, p.max)) * 100));
                return '<div style="min-width:90px"><div class="bar ' + (s < p.min ? 'r' : pct > 70 ? 'g' : 'a') + '"><i style="width:' + pct + '%"></i></div></div>'; } },
            { key: 'cost', label: 'Costo', right: true, render: function (p) { return '<span class="mono muted">' + V.money(p.cost) + '</span>'; } },
            { key: 'price', label: 'Precio', right: true, render: function (p) { return '<b class="mono">' + V.money(p.price) + '</b>'; } },
            { key: 'val', label: 'Valor', right: true, sortVal: function (p) { return V.stockOf(p) * p.cost; },
              render: function (p) { return '<span class="mono">' + V.money(V.stockOf(p) * p.cost) + '</span>'; } }
          ],
          onRow: function (rid) { productDetail(V.byId('products', rid)); }
        });
      }

      if (tab === 'almacenes') {
        tc.innerHTML = '<div class="card-b col">' + V.all('warehouses').map(function (wh) {
          var rows = prods.filter(function (p) { return (p.stock[wh.id] || 0) > 0; });
          var val = rows.reduce(function (a, p) { return a + p.stock[wh.id] * p.cost; }, 0);
          return '<div class="card"><div class="card-h"><div class="row gap2">' +
            '<span class="kpi-ico">' + I(wh.type === 'vehiculo' ? 'truck' : 'box', 16) + '</span>' +
            '<div><h3>' + E(wh.name) + '</h3><div class="xs muted">' + E(wh.address) + ' · ' + rows.length + ' SKU · ' + V.money(val) + '</div></div></div></div>' +
            (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>SKU</th><th>Material</th><th class="right">Cantidad</th><th class="right">Valor</th></tr></thead><tbody>' +
              rows.map(function (p) {
                return '<tr><td class="mono small">' + E(p.sku) + '</td><td>' + E(p.name) + '</td>' +
                  '<td class="right mono">' + p.stock[wh.id] + ' ' + E(p.unit) + '</td>' +
                  '<td class="right mono muted">' + V.money(p.stock[wh.id] * p.cost) + '</td></tr>';
              }).join('') + '</tbody></table></div>' : '<div class="card-b"><p class="small muted">Sin existencias.</p></div>') + '</div>';
        }).join('') + '</div>';
      }

      if (tab === 'movimientos') {
        UI.table(tc, {
          rows: function () { return V.all('stockMovements'); },
          search: function (m) { return (V.byId('products', m.product_id) || {}).name + ' ' + m.ref + ' ' + m.type; },
          placeholder: 'Buscar movimiento…', exportName: 'voltx-movimientos', sort: 'at', dir: 'desc',
          filters: [{ key: 'ty', label: 'Todos los tipos',
            options: ['entrada','salida','transferencia','reserva','consumo','devolucion','ajuste'].map(function (x) { return { value: x, label: x }; }),
            match: function (r, v) { return r.type === v; } }],
          cols: [
            { key: 'at', label: 'Fecha', render: function (m) { return '<div class="small">' + V.fdate(m.at) + '</div><div class="xs muted mono">' + V.hm(m.at) + '</div>'; } },
            { key: 'type', label: 'Tipo', render: function (m) {
                var cls = { entrada: 'b-green', consumo: 'b-orange', salida: 'b-orange', ajuste: 'b-amber', transferencia: 'b-blue', reserva: 'b-blue', devolucion: 'b-green' }[m.type] || 'b-gray';
                return '<span class="badge ' + cls + '">' + E(m.type) + '</span>'; } },
            { key: 'prod', label: 'Material', sortVal: function (m) { return (V.byId('products', m.product_id) || {}).name; },
              render: function (m) { var p = V.byId('products', m.product_id) || {}; return '<div class="bold">' + E(p.name || '—') + '</div><div class="xs muted mono">' + E(p.sku || '') + '</div>'; } },
            { key: 'qty', label: 'Cantidad', right: true, render: function (m) {
                return '<b class="mono" style="color:' + (m.qty < 0 ? 'var(--danger)' : 'var(--success)') + '">' + (m.qty > 0 ? '+' : '') + m.qty + '</b>'; } },
            { key: 'warehouse_id', label: 'Almacén', render: function (m) { return '<span class="small">' + E((V.byId('warehouses', m.warehouse_id) || {}).name || '—') + '</span>'; } },
            { key: 'ref', label: 'Referencia', render: function (m) { return '<span class="small">' + E(m.ref) + '</span>'; } },
            { key: 'user_id', label: 'Usuario', render: function (m) { return '<span class="small muted">' + E(V.userName(m.user_id)) + '</span>'; } }
          ]
        });
      }

      if (tab === 'kits') {
        tc.innerHTML = '<div class="card-b"><div class="banner banner-info mb4">' + I('info', 15) +
          '<div>Los kits agrupan los materiales típicos de un servicio para planificar una orden en un clic. Se definen en el catálogo de servicios.</div></div>' +
          '<div class="grid g2">' + V.all('services').filter(function (s) { return (s.materials || []).length; }).map(function (s) {
            return '<div class="card"><div class="card-b tight"><b class="small">' + E(s.name) + '</b>' +
              '<div class="xs muted mb2">' + E(s.category) + ' · ' + s.materials.length + ' materiales</div>' +
              '<div class="col" style="gap:4px">' + s.materials.map(function (pid) {
                var p = V.byId('products', pid) || {};
                return '<div class="row gap2 xs"><span class="muted">' + I('box', 12) + '</span><span>' + E(p.name || '—') + '</span>' +
                  '<span style="margin-left:auto" class="mono muted">' + E(p.sku || '') + '</span></div>';
              }).join('') + '</div></div></div>';
          }).join('') + '</div></div>';
      }

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; render(); });
      });
      var nb = el.querySelector('#new'); if (nb) nb.addEventListener('click', function () { productDetail(null); });
      var mv = el.querySelector('#mov'); if (mv) mv.addEventListener('click', newMovement);
    }
    render();
  };

  function reservedOf(p) {
    return V.all('workOrders').filter(function (w) { return ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; })
      .reduce(function (a, w) {
        return a + (w.materials || []).filter(function (m) { return m.product_id === p.id; })
          .reduce(function (x, m) { return x + Math.max(0, m.planned - m.used); }, 0);
      }, 0);
  }

  function productDetail(p) {
    var isNew = !p;
    var whs = V.all('warehouses');
    UI.drawer({
      eyebrow: isNew ? 'Inventario' : p.sku,
      title: isNew ? 'Nuevo material' : p.name,
      body: '<div class="grid g2">' +
          '<div class="field"><label for="sku">SKU <span class="req">*</span></label><input class="input" id="sku" value="' + E(isNew ? '' : p.sku) + '"></div>' +
          '<div class="field"><label for="bar">Código de barras / QR</label><input class="input" id="bar" value="' + E(isNew ? '' : p.barcode) + '"></div>' +
        '</div>' +
        '<div class="field mt4"><label for="nm">Nombre <span class="req">*</span></label><input class="input" id="nm" value="' + E(isNew ? '' : p.name) + '"></div>' +
        '<div class="grid g3 mt4">' +
          '<div class="field"><label for="cat">Categoría</label><input class="input" id="cat" value="' + E(isNew ? '' : p.category) + '"></div>' +
          '<div class="field"><label for="brd">Marca</label><input class="input" id="brd" value="' + E(isNew ? '' : p.brand) + '"></div>' +
          '<div class="field"><label for="un">Unidad</label><select class="select" id="un">' +
            ['und','m','kit','caja','rollo','litro'].map(function (x) { return '<option' + (!isNew && p.unit === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="grid g4 mt4">' +
          '<div class="field"><label for="co">Costo</label><input class="input" id="co" type="number" step="0.01" value="' + (isNew ? 0 : p.cost) + '"></div>' +
          '<div class="field"><label for="pz">Precio</label><input class="input" id="pz" type="number" step="0.01" value="' + (isNew ? 0 : p.price) + '"></div>' +
          '<div class="field"><label for="mn">Stock mínimo</label><input class="input" id="mn" type="number" value="' + (isNew ? 0 : p.min) + '"></div>' +
          '<div class="field"><label for="mx">Stock máximo</label><input class="input" id="mx" type="number" value="' + (isNew ? 0 : p.max) + '"></div>' +
        '</div>' +
        (isNew ? '' : '<h4 class="mt6 mb2">Existencias por almacén</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Almacén</th><th class="right">Cantidad</th><th class="right">Valor</th></tr></thead><tbody>' +
          whs.map(function (wh) {
            return '<tr><td>' + E(wh.name) + '</td><td class="right mono">' + (p.stock[wh.id] || 0) + '</td>' +
              '<td class="right mono muted">' + V.money((p.stock[wh.id] || 0) * p.cost) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<h4 class="mt6 mb2">Últimos movimientos</h4>' +
          (function () {
            var ms = V.all('stockMovements').filter(function (m) { return m.product_id === p.id; }).slice(0, 8);
            return ms.length ? UI.timeline(ms.map(function (m) {
              return { icon: 'refresh', tone: m.qty > 0 ? 'g' : 'r', text: '<b>' + E(m.type) + '</b> ' + (m.qty > 0 ? '+' : '') + m.qty + ' · ' + E(m.ref),
                       meta: V.userName(m.user_id) + ' · ' + V.fdatetime(m.at) };
            })) : '<p class="small muted">Sin movimientos.</p>';
          })()),
      footer: '<button class="btn btn-outline" data-close>Cerrar</button>' +
              (V.can('inventario', 'editar') ? '<button class="btn btn-primary" id="sv">Guardar</button>' : ''),
      onMount: function (w) {
        var sv = w.querySelector('#sv'); if (!sv) return;
        sv.addEventListener('click', function () {
          var g = function (id) { return w.querySelector('#' + id).value; };
          if (!g('sku').trim() || !g('nm').trim()) { UI.toast('SKU y nombre son obligatorios.', 'err'); return; }
          var data = { sku: g('sku').trim(), barcode: g('bar').trim(), name: g('nm').trim(), category: g('cat').trim() || 'General',
            brand: g('brd').trim(), unit: g('un'), cost: +g('co') || 0, price: +g('pz') || 0, min: +g('mn') || 0, max: +g('mx') || 0 };
          if (isNew) { data.stock = {}; data.reserved = 0; data.active = true; V.insert('products', data); }
          else V.update('products', p.id, data);
          V.logAudit(isNew ? 'CREATE' : 'UPDATE', 'product', data.sku, data.name);
          UI.closeTop(); UI.toast('Material guardado.', 'ok'); APP.reload();
        });
      }
    });
  }

  function newMovement() {
    UI.modal({
      title: 'Registrar movimiento de inventario',
      body: '<div class="grid g2">' +
        '<div class="field"><label for="ty">Tipo</label><select class="select" id="ty">' +
          ['entrada','salida','transferencia','consumo','devolucion','ajuste'].map(function (x) { return '<option value="' + x + '">' + x + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="wh">Almacén</label><select class="select" id="wh">' + opt(V.all('warehouses')) + '</select></div></div>' +
        '<div class="field mt4"><label for="pr">Material</label><select class="select" id="pr">' +
          opt(V.all('products'), null, function (p) { return p.id; }, function (p) { return p.sku + ' — ' + p.name; }) + '</select></div>' +
        '<div class="grid g2 mt4"><div class="field"><label for="qt">Cantidad</label><input class="input" id="qt" type="number" step="0.01" value="1">' +
        '<span class="hint">Usa valores negativos para salidas manuales.</span></div>' +
        '<div class="field"><label for="rf">Referencia</label><input class="input" id="rf" placeholder="OC, OT, conteo cíclico…"></div></div>' +
        '<div class="field mt4"><label for="nt">Notas</label><input class="input" id="nt"></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Registrar</button>',
      onMount: function (w) {
        w.querySelector('#ok').addEventListener('click', function () {
          var ty = w.querySelector('#ty').value, pid = w.querySelector('#pr').value, wh = w.querySelector('#wh').value;
          var qt = +w.querySelector('#qt').value || 0;
          if (!qt) { UI.toast('Indica la cantidad.', 'err'); return; }
          var signed = ['salida', 'consumo'].indexOf(ty) >= 0 ? -Math.abs(qt) : qt;
          var p = V.byId('products', pid);
          p.stock[wh] = Math.max(0, (p.stock[wh] || 0) + signed);
          V.insert('stockMovements', { product_id: pid, type: ty, qty: signed, warehouse_id: wh,
            ref: w.querySelector('#rf').value.trim() || 'Manual', user_id: V.getSession().user_id,
            at: new Date().toISOString(), notes: w.querySelector('#nt').value.trim() });
          V.save();
          V.logAudit('CREATE', 'stock_movement', p.sku, ty + ' ' + signed);
          UI.closeTop(); UI.toast('Movimiento registrado.', 'ok'); APP.reload(); APP.refreshChrome();
        });
      }
    });
  }

  /* ============================================================
     M) COMPRAS Y PROVEEDORES §6.13
     ============================================================ */
  views.compras = function (el) {
    var tab = 'ordenes';
    function render() {
      var pos = V.all('purchaseOrders');
      var h = PH({
        title: 'Compras y proveedores',
        sub: 'Solicitudes, órdenes de compra, aprobación por monto, recepción y actualización de stock',
        actions: (V.can('compras', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva orden de compra</button>' : '')
      });
      h += '<div class="grid g4">' +
        UI.kpi({ label: 'Por aprobar', value: pos.filter(function (p) { return p.status === 'PENDING'; }).length, icon: 'clock' }) +
        UI.kpi({ label: 'En tránsito', value: pos.filter(function (p) { return ['APPROVED', 'PARTIAL'].indexOf(p.status) >= 0; }).length, icon: 'truck' }) +
        UI.kpi({ label: 'Compras del mes', value: V.money(pos.filter(function (p) { return new Date(p.date).getMonth() === new Date().getMonth(); })
            .reduce(function (a, p) { return a + poTotal(p); }, 0)), icon: 'cart' }) +
        UI.kpi({ label: 'Proveedores', value: V.all('vendors').length, icon: 'building' }) +
        '</div>';
      h += '<div class="card mt4"><div class="tabs" id="tabs">' +
        [['ordenes', 'Órdenes de compra'], ['proveedores', 'Proveedores'], ['sugerido', 'Reposición sugerida']]
          .map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
        '</div><div id="tc"></div></div>';
      el.innerHTML = h;
      var tc = el.querySelector('#tc');

      if (tab === 'ordenes') {
        UI.table(tc, {
          rows: function () { return V.all('purchaseOrders'); },
          search: function (p) { return p.number + ' ' + (V.byId('vendors', p.vendor_id) || {}).name; },
          placeholder: 'Buscar orden de compra…', exportName: 'voltx-compras', sort: 'date', dir: 'desc',
          filters: [{ key: 'st', label: 'Todos los estados', options: stateOpts(V.PO_STATES), match: function (r, v) { return r.status === v; } }],
          cols: [
            { key: 'number', label: 'Número', render: function (p) { return '<b>' + E(p.number) + '</b>'; } },
            { key: 'vendor', label: 'Proveedor', sortVal: function (p) { return (V.byId('vendors', p.vendor_id) || {}).name; },
              render: function (p) { return '<div class="bold">' + E((V.byId('vendors', p.vendor_id) || {}).name || '—') + '</div><div class="xs muted">' + p.items.length + ' ítem(s)</div>'; } },
            { key: 'date', label: 'Emitida', render: function (p) { return V.fdate(p.date); } },
            { key: 'expected', label: 'Entrega', render: function (p) { return V.fdate(p.expected); } },
            { key: 'wh', label: 'Destino', render: function (p) { return '<span class="small">' + E((V.byId('warehouses', p.warehouse_id) || {}).name || '—') + '</span>'; } },
            { key: 'recv', label: 'Recepción', sortable: false, render: function (p) {
                var tot = p.items.reduce(function (a, i) { return a + i.qty; }, 0);
                var rec = p.items.reduce(function (a, i) { return a + i.received; }, 0);
                return '<div style="min-width:86px"><span class="xs muted">' + rec + '/' + tot + '</span>' +
                  '<div class="bar mt2 ' + (rec === tot ? 'g' : 'a') + '"><i style="width:' + (rec / Math.max(1, tot) * 100) + '%"></i></div></div>'; } },
            { key: 'total', label: 'Total', right: true, sortVal: poTotal, render: function (p) { return '<b class="mono">' + V.money(poTotal(p)) + '</b>'; } },
            { key: 'status', label: 'Estado', right: true, render: function (p) { return UI.badge(V.PO_STATES, p.status); } }
          ],
          onRow: function (rid) { poDetail(V.byId('purchaseOrders', rid)); }
        });
      }
      if (tab === 'proveedores') {
        UI.table(tc, {
          rows: function () { return V.all('vendors'); },
          search: function (v) { return v.name + ' ' + v.contact + ' ' + v.email; },
          placeholder: 'Buscar proveedor…', exportName: 'voltx-proveedores',
          cols: [
            { key: 'name', label: 'Proveedor', render: function (v) { return '<div class="bold">' + E(v.name) + '</div><div class="xs muted">' + E(v.taxId) + '</div>'; } },
            { key: 'contact', label: 'Contacto', render: function (v) { return '<div class="small">' + E(v.contact) + '</div><div class="xs muted">' + E(v.phone) + '</div>'; } },
            { key: 'email', label: 'Correo', render: function (v) { return '<span class="small">' + E(v.email) + '</span>'; } },
            { key: 'terms', label: 'Condiciones', render: function (v) { return '<span class="chip">' + E(v.terms) + '</span>'; } },
            { key: 'compras', label: 'Compras', right: true, sortVal: function (v) { return V.all('purchaseOrders').filter(function (p) { return p.vendor_id === v.id; }).length; },
              render: function (v) { return V.all('purchaseOrders').filter(function (p) { return p.vendor_id === v.id; }).length; } },
            { key: 'rating', label: 'Valoración', right: true, render: function (v) { return '<span class="row gap1" style="justify-content:flex-end">' + I('star', 13) + v.rating + '</span>'; } }
          ]
        });
      }
      if (tab === 'sugerido') {
        var low = V.lowStock();
        tc.innerHTML = low.length
          ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>SKU</th><th>Material</th><th class="right">Disponible</th><th class="right">Mínimo</th><th class="right">Sugerido</th><th class="right">Costo estimado</th></tr></thead><tbody>' +
            low.map(function (p) {
              var sug = p.max - V.stockOf(p);
              return '<tr><td class="mono small">' + E(p.sku) + '</td><td class="bold">' + E(p.name) + '</td>' +
                '<td class="right mono prio-critica">' + V.stockOf(p) + '</td><td class="right mono">' + p.min + '</td>' +
                '<td class="right mono bold">' + sug + ' ' + E(p.unit) + '</td>' +
                '<td class="right mono">' + V.money(sug * p.cost) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="card-f"><button class="btn btn-primary btn-sm" id="genpo">' + I('cart', 15) + ' Generar orden de compra con estos materiales</button></div>'
          : UI.emptyState({ icon: 'checkCircle', title: 'Todo en nivel', text: 'Ningún material está por debajo del stock mínimo.' });
        var g = tc.querySelector('#genpo');
        if (g) g.addEventListener('click', function () { newPO(low); });
      }

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; render(); });
      });
      var nb = el.querySelector('#new'); if (nb) nb.addEventListener('click', function () { newPO(); });
    }
    render();
  };
  function poTotal(p) { return p.items.reduce(function (a, i) { return a + i.qty * i.cost; }, 0); }

  function newPO(prefill) {
    var items = (prefill || []).map(function (p) { return { product_id: p.id, qty: p.max - V.stockOf(p), cost: p.cost, received: 0 }; });
    if (!items.length) items = [{ product_id: V.all('products')[0].id, qty: 1, cost: V.all('products')[0].cost, received: 0 }];
    function body() {
      return '<div class="grid g3">' +
        '<div class="field"><label for="vn">Proveedor</label><select class="select" id="vn">' + opt(V.all('vendors')) + '</select></div>' +
        '<div class="field"><label for="wh">Almacén destino</label><select class="select" id="wh">' + opt(V.all('warehouses')) + '</select></div>' +
        '<div class="field"><label for="ex">Entrega esperada</label><input class="input" id="ex" type="date" value="' + V.ymd(V.addDays(V.today(), 5)) + '"></div></div>' +
        '<div class="field mt4"><label for="pj">Imputar a proyecto</label><select class="select" id="pj"><option value="">— Ninguno —</option>' + opt(V.all('projects'), null, function (p) { return p.id; }, function (p) { return p.code + ' — ' + p.name; }) + '</select></div>' +
        '<h4 class="mt6 mb2">Ítems</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Material</th><th style="width:90px" class="right">Cantidad</th><th style="width:110px" class="right">Costo unit.</th><th class="right">Subtotal</th><th></th></tr></thead><tbody id="rows">' +
        items.map(function (it, i) {
          var p = V.byId('products', it.product_id) || {};
          return '<tr><td><b class="small">' + E(p.name || '') + '</b><div class="xs muted mono">' + E(p.sku || '') + '</div></td>' +
            '<td><input class="input right" data-q="' + i + '" type="number" step="0.01" value="' + it.qty + '"></td>' +
            '<td><input class="input right" data-c="' + i + '" type="number" step="0.01" value="' + it.cost + '"></td>' +
            '<td class="right mono bold">' + V.money(it.qty * it.cost) + '</td>' +
            '<td class="right"><button class="btn btn-ghost btn-sm btn-icon" data-d="' + i + '">' + I('trash', 14) + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="spread mt4"><button class="btn btn-outline btn-sm" id="add">' + I('plus', 14) + ' Agregar material</button>' +
        '<div class="right"><div class="xs muted">Total de la orden</div><div style="font-size:20px;font-weight:700">' +
        V.money(items.reduce(function (a, i) { return a + i.qty * i.cost; }, 0)) + '</div></div></div>' +
        '<div class="banner banner-info mt4">' + I('info', 15) + '<div>Las órdenes superiores a $500 requieren aprobación del propietario antes de enviarse al proveedor.</div></div>';
    }
    var w = UI.modal({
      title: 'Nueva orden de compra', size: 'wide', body: body(),
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear orden</button>',
      onMount: bind
    });
    function bind(m) {
      m.querySelectorAll('[data-q]').forEach(function (i) { i.addEventListener('change', function () { items[+this.dataset.q].qty = +this.value || 0; redraw(m); }); });
      m.querySelectorAll('[data-c]').forEach(function (i) { i.addEventListener('change', function () { items[+this.dataset.c].cost = +this.value || 0; redraw(m); }); });
      m.querySelectorAll('[data-d]').forEach(function (i) { i.addEventListener('click', function () { items.splice(+this.dataset.d, 1); redraw(m); }); });
      m.querySelector('#add').addEventListener('click', function () {
        H.pickProduct(function (p) { items.push({ product_id: p.id, qty: 1, cost: p.cost, received: 0 }); redraw(m); });
      });
      m.querySelector('#ok').addEventListener('click', function () {
        if (!items.length) { UI.toast('Agrega al menos un material.', 'err'); return; }
        var tot = items.reduce(function (a, i) { return a + i.qty * i.cost; }, 0);
        var po = V.insert('purchaseOrders', {
          number: V.nextNumber('po'), vendor_id: m.querySelector('#vn').value,
          status: tot > 500 ? 'PENDING' : 'APPROVED', date: V.ymd(V.today()),
          expected: m.querySelector('#ex').value, warehouse_id: m.querySelector('#wh').value,
          project_id: m.querySelector('#pj').value || null, createdBy: V.getSession().user_id,
          approvedBy: tot > 500 ? null : V.getSession().user_id, notes: '', items: items
        });
        V.logActivity('purchase_order', po.id, 'Creó la orden de compra ' + po.number + ' por ' + V.money(tot), 'create');
        V.logAudit('CREATE', 'purchase_order', po.number, V.money(tot));
        UI.closeTop();
        UI.toast(tot > 500 ? 'Orden creada y enviada a aprobación.' : 'Orden de compra creada.', 'ok');
        APP.reload();
      });
    }
    function redraw(m) {
      var b = m.querySelector('.modal-b');
      var vn = m.querySelector('#vn').value, wh = m.querySelector('#wh').value, ex = m.querySelector('#ex').value, pj = m.querySelector('#pj').value;
      b.innerHTML = body();
      m.querySelector('#vn').value = vn; m.querySelector('#wh').value = wh; m.querySelector('#ex').value = ex; m.querySelector('#pj').value = pj;
      bind(m);
    }
  }

  function poDetail(po) {
    var v = V.byId('vendors', po.vendor_id) || {};
    UI.drawer({
      eyebrow: 'Orden de compra', title: po.number, size: 'xl',
      subtitle: E(v.name) + ' · ' + V.money(poTotal(po)) + ' · ' + UI.badge(V.PO_STATES, po.status),
      body: '<div class="grid g2 mb4">' + kv('Proveedor', E(v.name)) + kv('Contacto', E(v.contact) + ' · ' + E(v.phone)) +
          kv('Emitida', V.fdate(po.date)) + kv('Entrega esperada', V.fdate(po.expected)) +
          kv('Almacén destino', E((V.byId('warehouses', po.warehouse_id) || {}).name || '—')) +
          kv('Creada por', E(V.userName(po.createdBy))) +
          kv('Aprobada por', po.approvedBy ? E(V.userName(po.approvedBy)) : '<span class="badge b-amber">Pendiente</span>') +
          (po.project_id ? kv('Proyecto', E((V.byId('projects', po.project_id) || {}).code || '')) : '') +
        '</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Material</th><th class="right">Pedido</th><th class="right">Recibido</th><th class="right">Pendiente</th><th class="right">Costo</th><th class="right">Subtotal</th></tr></thead><tbody>' +
        po.items.map(function (it) {
          var p = V.byId('products', it.product_id) || {};
          return '<tr><td><b class="small">' + E(p.name || '—') + '</b><div class="xs muted mono">' + E(p.sku || '') + '</div></td>' +
            '<td class="right mono">' + it.qty + '</td><td class="right mono">' + it.received + '</td>' +
            '<td class="right mono ' + (it.qty - it.received > 0 ? 'prio-alta' : '') + '">' + (it.qty - it.received) + '</td>' +
            '<td class="right mono muted">' + V.money(it.cost) + '</td><td class="right mono bold">' + V.money(it.qty * it.cost) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (po.notes ? '<div class="banner banner-info mt4">' + I('info', 15) + '<div>' + E(po.notes) + '</div></div>' : ''),
      footer: '<button class="btn btn-outline" data-close>Cerrar</button>' +
        (po.status === 'PENDING' && V.can('compras', 'aprobar') ? '<button class="btn btn-secondary" id="apr">Aprobar orden</button>' : '') +
        (['APPROVED', 'PARTIAL'].indexOf(po.status) >= 0 && V.can('compras', 'editar') ? '<button class="btn btn-primary" id="rec">Registrar recepción</button>' : ''),
      onMount: function (w) {
        var a = w.querySelector('#apr');
        if (a) a.addEventListener('click', function () {
          V.update('purchaseOrders', po.id, { status: 'APPROVED', approvedBy: V.getSession().user_id });
          V.logAudit('UPDATE', 'purchase_order', po.number, 'Aprobada');
          UI.closeTop(); UI.toast('Orden aprobada.', 'ok'); APP.reload();
        });
        var r = w.querySelector('#rec');
        if (r) r.addEventListener('click', function () { receivePO(po); });
      }
    });
  }

  function receivePO(po) {
    UI.modal({
      title: 'Registrar recepción', subtitle: po.number, size: 'wide',
      body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Material</th><th class="right">Pendiente</th><th style="width:120px" class="right">Recibir ahora</th></tr></thead><tbody>' +
        po.items.map(function (it, i) {
          var p = V.byId('products', it.product_id) || {};
          var pend = it.qty - it.received;
          return '<tr><td><b class="small">' + E(p.name || '') + '</b></td><td class="right mono">' + pend + '</td>' +
            '<td><input class="input right" data-r="' + i + '" type="number" min="0" max="' + pend + '" value="' + pend + '"></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="field mt4"><label for="dn">Documento / factura del proveedor</label><input class="input" id="dn" placeholder="N.º de factura"></div>' +
        '<div class="banner banner-info mt4">' + I('info', 15) + '<div>Al confirmar se actualiza el stock del almacén destino y se registra el movimiento de entrada.</div></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Confirmar recepción</button>',
      onMount: function (m) {
        m.querySelector('#ok').addEventListener('click', function () {
          var doc = m.querySelector('#dn').value.trim();
          var any = false;
          m.querySelectorAll('[data-r]').forEach(function (inp) {
            var i = +inp.dataset.r, q = +inp.value || 0;
            if (q <= 0) return;
            any = true;
            po.items[i].received += q;
            var p = V.byId('products', po.items[i].product_id);
            p.stock[po.warehouse_id] = (p.stock[po.warehouse_id] || 0) + q;
            V.insert('stockMovements', { product_id: p.id, type: 'entrada', qty: q, warehouse_id: po.warehouse_id,
              ref: po.number + (doc ? ' · ' + doc : ''), user_id: V.getSession().user_id, at: new Date().toISOString(), notes: '' });
          });
          if (!any) { UI.toast('Indica al menos una cantidad a recibir.', 'err'); return; }
          var tot = po.items.reduce(function (a, i) { return a + i.qty; }, 0);
          var rec = po.items.reduce(function (a, i) { return a + i.received; }, 0);
          V.update('purchaseOrders', po.id, { items: po.items, status: rec >= tot ? 'RECEIVED' : 'PARTIAL' });
          if (po.project_id) {
            V.insert('expenses', { project_id: po.project_id, wo_id: null, category: 'Materiales',
              desc: 'Recepción ' + po.number, amount: poTotal(po), date: V.ymd(V.today()), vendor_id: po.vendor_id });
          }
          V.logActivity('purchase_order', po.id, 'Registró la recepción de ' + po.number, 'update');
          V.logAudit('UPDATE', 'goods_receipt', po.number, 'Recibido ' + rec + '/' + tot);
          UI.closeAll(); UI.toast('Recepción registrada y stock actualizado.', 'ok'); APP.reload(); APP.refreshChrome();
        });
      }
    });
  }

  /* ============================================================
     N) FACTURACIÓN, COBROS Y GASTOS §6.14
     ============================================================ */
  views.facturacion = function (el, id) {
    if (id) return invoiceDetail(el, id);
    var tab = 'facturas';
    function render() {
      var invs = V.all('invoices');
      var porCobrar = invs.reduce(function (a, i) { return a + (i.status === 'VOID' ? 0 : Math.max(0, V.invoiceTotals(i).balance)); }, 0);
      var vencidas = V.overdueInvoices();
      var cobrado = V.all('payments').reduce(function (a, p) { return a + p.amount; }, 0);

      var h = PH({
        title: 'Facturación, cobros y gastos',
        sub: 'Facturas y proformas, anticipos, pagos parciales, cuentas por cobrar y rentabilidad',
        actions: (V.can('facturacion', 'crear') ? '<button class="btn btn-outline btn-sm" id="nexp">' + I('dollar', 15) + ' Registrar gasto</button>' : '') +
                 (V.can('facturacion', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva factura</button>' : '')
      });
      h += '<div class="grid g4">' +
        UI.kpi({ label: 'Por cobrar', value: V.money(porCobrar), icon: 'dollar', trend: porCobrar > 0 ? 'down' : '' }) +
        UI.kpi({ label: 'Vencidas', value: vencidas.length, icon: 'alert', sub: V.money(vencidas.reduce(function (a, i) { return a + V.invoiceTotals(i).balance; }, 0)), trend: vencidas.length ? 'down' : 'up' }) +
        UI.kpi({ label: 'Cobrado', value: V.money(cobrado), icon: 'trend', trend: 'up' }) +
        UI.kpi({ label: 'Gastos registrados', value: V.money(V.all('expenses').reduce(function (a, e) { return a + e.amount; }, 0)), icon: 'receipt' }) +
        '</div>';

      if (vencidas.length) {
        h += '<div class="banner banner-danger mt4">' + I('alert', 16) + '<div><b>' + vencidas.length + ' factura(s) vencida(s):</b> ' +
          vencidas.map(function (i) { return E(i.number) + ' — ' + E(V.customerName(i.customer_id)) + ' (' + V.money(V.invoiceTotals(i).balance) + ')'; }).join(' · ') + '</div></div>';
      }

      h += '<div class="card mt4"><div class="tabs" id="tabs">' +
        [['facturas', 'Facturas'], ['pagos', 'Pagos'], ['gastos', 'Gastos'], ['aging', 'Cuentas por cobrar']]
          .map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
        '</div><div id="tc"></div></div>';
      el.innerHTML = h;
      var tc = el.querySelector('#tc');

      if (tab === 'facturas') {
        UI.table(tc, {
          rows: function () { return V.all('invoices'); },
          search: function (i) { return i.number + ' ' + V.customerName(i.customer_id); },
          placeholder: 'Buscar factura o cliente…', exportName: 'voltx-facturas', sort: 'date', dir: 'desc',
          filters: [{ key: 'st', label: 'Todos los estados', options: stateOpts(V.INV_STATES), match: function (r, v) { return effStatus(r) === v; } }],
          cols: [
            { key: 'number', label: 'Número', render: function (i) { return '<b>' + E(i.number) + '</b>'; } },
            { key: 'cus', label: 'Cliente', sortVal: function (i) { return V.customerName(i.customer_id); },
              render: function (i) { return '<div class="bold">' + E(V.customerName(i.customer_id)) + '</div>' +
                '<div class="xs muted">' + (i.project_id ? E((V.byId('projects', i.project_id) || {}).code || '') : i.wo_id ? E((V.byId('workOrders', i.wo_id) || {}).number || '') : '—') + '</div>'; } },
            { key: 'date', label: 'Emisión', render: function (i) { return V.fdate(i.date); } },
            { key: 'due', label: 'Vencimiento', render: function (i) {
                var d = V.daysTo(i.due), bal = V.invoiceTotals(i).balance;
                return '<span class="small ' + (d < 0 && bal > 0.01 ? 'prio-critica' : d <= 3 && bal > 0.01 ? 'prio-alta' : '') + '">' + V.fdate(i.due) + '</span>'; } },
            { key: 'total', label: 'Total', right: true, sortVal: function (i) { return V.invoiceTotals(i).total; },
              render: function (i) { return '<b class="mono">' + V.money(V.invoiceTotals(i).total) + '</b>'; } },
            { key: 'paid', label: 'Pagado', right: true, sortVal: function (i) { return V.invoiceTotals(i).paid; },
              render: function (i) { return '<span class="mono muted">' + V.money(V.invoiceTotals(i).paid) + '</span>'; } },
            { key: 'bal', label: 'Saldo', right: true, sortVal: function (i) { return V.invoiceTotals(i).balance; },
              render: function (i) { var b = V.invoiceTotals(i).balance;
                return b > 0.01 ? '<b class="mono" style="color:var(--danger)">' + V.money(b) + '</b>' : '<span class="muted">—</span>'; } },
            { key: 'status', label: 'Estado', right: true, render: function (i) { return UI.badge(V.INV_STATES, effStatus(i)); } }
          ],
          onRow: function (rid) { location.hash = 'facturacion/' + rid; }
        });
      }
      if (tab === 'pagos') {
        UI.table(tc, {
          rows: function () { return V.all('payments'); },
          search: function (p) { return p.ref + ' ' + p.method + ' ' + ((V.byId('invoices', p.invoice_id) || {}).number || ''); },
          placeholder: 'Buscar pago…', exportName: 'voltx-pagos', sort: 'date', dir: 'desc',
          cols: [
            { key: 'date', label: 'Fecha', render: function (p) { return V.fdate(p.date); } },
            { key: 'inv', label: 'Factura', sortVal: function (p) { return (V.byId('invoices', p.invoice_id) || {}).number; },
              render: function (p) { var i = V.byId('invoices', p.invoice_id) || {};
                return '<a href="#facturacion/' + p.invoice_id + '"><b>' + E(i.number || '—') + '</b></a><div class="xs muted">' + E(V.customerName(i.customer_id)) + '</div>'; } },
            { key: 'method', label: 'Método', render: function (p) { return '<span class="chip">' + E(p.method) + '</span>'; } },
            { key: 'ref', label: 'Referencia', render: function (p) { return '<span class="small mono">' + E(p.ref) + '</span>'; } },
            { key: 'amount', label: 'Monto', right: true, render: function (p) { return '<b class="mono" style="color:var(--success)">' + V.money(p.amount) + '</b>'; } }
          ]
        });
      }
      if (tab === 'gastos') {
        UI.table(tc, {
          rows: function () { return V.all('expenses'); },
          search: function (x) { return x.desc + ' ' + x.category; },
          placeholder: 'Buscar gasto…', exportName: 'voltx-gastos', sort: 'date', dir: 'desc',
          cols: [
            { key: 'date', label: 'Fecha', render: function (x) { return V.fdate(x.date); } },
            { key: 'desc', label: 'Concepto', render: function (x) { return '<b>' + E(x.desc) + '</b>'; } },
            { key: 'category', label: 'Categoría', render: function (x) { return '<span class="chip">' + E(x.category) + '</span>'; } },
            { key: 'imp', label: 'Imputación', render: function (x) {
                return x.project_id ? '<a href="#proyectos/' + x.project_id + '">' + E((V.byId('projects', x.project_id) || {}).code || '') + '</a>'
                  : x.wo_id ? '<a href="#ordenes/' + x.wo_id + '">' + E((V.byId('workOrders', x.wo_id) || {}).number || '') + '</a>' : '<span class="muted">General</span>'; } },
            { key: 'vendor_id', label: 'Proveedor', render: function (x) { return '<span class="small">' + E((V.byId('vendors', x.vendor_id) || {}).name || '—') + '</span>'; } },
            { key: 'amount', label: 'Monto', right: true, render: function (x) { return '<b class="mono">' + V.money(x.amount) + '</b>'; } }
          ]
        });
      }
      if (tab === 'aging') {
        var buckets = [['Al día', 0, 0], ['1–30 días', 1, 30], ['31–60 días', 31, 60], ['61–90 días', 61, 90], ['Más de 90', 91, 9999]];
        var rows = buckets.map(function (b) {
          var list = V.all('invoices').filter(function (i) {
            var bal = V.invoiceTotals(i).balance;
            if (bal <= 0.01 || i.status === 'VOID') return false;
            var d = -V.daysTo(i.due);
            return b[1] === 0 ? d <= 0 : (d >= b[1] && d <= b[2]);
          });
          return { label: b[0], count: list.length, amount: list.reduce(function (a, i) { return a + V.invoiceTotals(i).balance; }, 0), list: list };
        });
        tc.innerHTML = '<div class="card-b"><div class="grid g2">' +
          '<div>' + rows.map(function (r) {
            var max = Math.max.apply(null, rows.map(function (x) { return x.amount; })) || 1;
            return '<div class="mb4"><div class="spread small"><span>' + E(r.label) + ' <span class="muted">(' + r.count + ')</span></span><b>' + V.money(r.amount) + '</b></div>' +
              '<div class="bar mt2 ' + (r.label === 'Al día' ? 'g' : r.label === 'Más de 90' ? 'r' : 'a') + '"><i style="width:' + (r.amount / max * 100) + '%"></i></div></div>';
          }).join('') + '</div>' +
          '<div><h4 class="mb2">Detalle por cliente</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th class="right">Saldo</th></tr></thead><tbody>' +
          H.uniq(V.all('invoices').map(function (i) { return i.customer_id; })).map(function (cid) {
            var bal = V.all('invoices').filter(function (i) { return i.customer_id === cid && i.status !== 'VOID'; })
              .reduce(function (a, i) { return a + Math.max(0, V.invoiceTotals(i).balance); }, 0);
            if (bal <= 0.01) return '';
            return '<tr><td><a href="#clientes/' + cid + '">' + E(V.customerName(cid)) + '</a></td>' +
              '<td class="right mono bold">' + V.money(bal) + '</td></tr>';
          }).join('') + '</tbody></table></div></div></div></div>';
      }

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; render(); });
      });
      var nb = el.querySelector('#new'); if (nb) nb.addEventListener('click', newInvoice);
      var ne = el.querySelector('#nexp'); if (ne) ne.addEventListener('click', newExpense);
    }
    render();
  };
  function effStatus(i) {
    if (i.status === 'VOID' || i.status === 'DRAFT') return i.status;
    var t = V.invoiceTotals(i);
    if (t.balance <= 0.01) return 'PAID';
    if (new Date(i.due) < V.today()) return 'OVERDUE';
    if (t.paid > 0) return 'PARTIAL';
    return 'ISSUED';
  }

  function newInvoice() {
    var items = [{ desc: '', qty: 1, price: 0 }];
    function body() {
      var sub = items.reduce(function (a, i) { return a + i.qty * i.price; }, 0);
      var tax = sub * V.myTenant().taxRate / 100;
      return '<div class="grid g3">' +
        '<div class="field"><label for="cu">Cliente <span class="req">*</span></label><select class="select" id="cu">' + opt(V.all('customers')) + '</select></div>' +
        '<div class="field"><label for="dt">Emisión</label><input class="input" id="dt" type="date" value="' + V.ymd(V.today()) + '"></div>' +
        '<div class="field"><label for="du">Vencimiento</label><input class="input" id="du" type="date" value="' + V.ymd(V.addDays(V.today(), 15)) + '"></div></div>' +
        '<div class="grid g2 mt4">' +
        '<div class="field"><label for="og">Origen</label><select class="select" id="og"><option value="">— Manual —</option>' +
          V.all('quotes').filter(function (q) { return q.status === 'APPROVED'; }).map(function (q) { return '<option value="q:' + q.id + '">Presupuesto ' + E(q.number) + '</option>'; }).join('') +
          V.all('workOrders').filter(function (w) { return ['COMPLETED','CLOSED'].indexOf(w.status) >= 0; }).map(function (w) { return '<option value="w:' + w.id + '">Orden ' + E(w.number) + '</option>'; }).join('') +
          V.all('projects').map(function (p) { return '<option value="p:' + p.id + '">Proyecto ' + E(p.code) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="tx">Impuesto (%)</label><input class="input" id="tx" type="number" value="' + V.myTenant().taxRate + '"></div></div>' +
        '<h4 class="mt6 mb2">Conceptos</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Descripción</th><th style="width:80px" class="right">Cant.</th><th style="width:110px" class="right">Precio</th><th class="right">Subtotal</th><th></th></tr></thead><tbody>' +
        items.map(function (it, i) {
          return '<tr><td><input class="input" data-d="' + i + '" value="' + E(it.desc) + '" placeholder="Concepto"></td>' +
            '<td><input class="input right" data-q="' + i + '" type="number" step="0.01" value="' + it.qty + '"></td>' +
            '<td><input class="input right" data-p="' + i + '" type="number" step="0.01" value="' + it.price + '"></td>' +
            '<td class="right mono bold">' + V.money(it.qty * it.price) + '</td>' +
            '<td class="right"><button class="btn btn-ghost btn-sm btn-icon" data-x="' + i + '">' + I('trash', 14) + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="spread mt4"><button class="btn btn-outline btn-sm" id="add">' + I('plus', 14) + ' Agregar concepto</button>' +
        '<div class="right col" style="gap:2px"><span class="xs muted">Subtotal ' + V.money(sub) + ' · Impuesto ' + V.money(tax) + '</span>' +
        '<span style="font-size:20px;font-weight:700">' + V.money(sub + tax) + '</span></div></div>' +
        '<div class="field mt4"><label for="nt">Notas</label><input class="input" id="nt"></div>';
    }
    UI.modal({ title: 'Nueva factura', size: 'wide', body: body(),
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Emitir factura</button>',
      onMount: bind });
    function bind(m) {
      m.querySelectorAll('[data-d]').forEach(function (i) { i.addEventListener('change', function () { items[+this.dataset.d].desc = this.value; }); });
      m.querySelectorAll('[data-q]').forEach(function (i) { i.addEventListener('change', function () { items[+this.dataset.q].qty = +this.value || 0; redraw(m); }); });
      m.querySelectorAll('[data-p]').forEach(function (i) { i.addEventListener('change', function () { items[+this.dataset.p].price = +this.value || 0; redraw(m); }); });
      m.querySelectorAll('[data-x]').forEach(function (i) { i.addEventListener('click', function () { items.splice(+this.dataset.x, 1); if (!items.length) items.push({ desc: '', qty: 1, price: 0 }); redraw(m); }); });
      m.querySelector('#add').addEventListener('click', function () { items.push({ desc: '', qty: 1, price: 0 }); redraw(m); });
      m.querySelector('#og').addEventListener('change', function () {
        var v = this.value; if (!v) return;
        var kind = v.slice(0, 1), rid = v.slice(2);
        if (kind === 'q') {
          var q = V.byId('quotes', rid);
          items = q.items.map(function (it) { return { desc: it.desc, qty: it.qty, price: it.price }; });
          redraw(m); m.querySelector('#cu').value = q.customer_id; m.querySelector('#og').value = v;
        }
        if (kind === 'w') {
          var w = V.byId('workOrders', rid);
          var s = V.byId('services', w.service_id);
          items = [{ desc: w.title, qty: 1, price: s ? s.price : 0 }];
          redraw(m); m.querySelector('#cu').value = w.customer_id; m.querySelector('#og').value = v;
        }
        if (kind === 'p') {
          var p = V.byId('projects', rid);
          items = [{ desc: p.name, qty: 1, price: p.budget / (1 + V.myTenant().taxRate / 100) }];
          redraw(m); m.querySelector('#cu').value = p.customer_id; m.querySelector('#og').value = v;
        }
      });
      m.querySelector('#ok').addEventListener('click', function () {
        var valid = items.filter(function (i) { return i.desc.trim() && i.price > 0; });
        if (!valid.length) { UI.toast('Agrega al menos un concepto con descripción y precio.', 'err'); return; }
        var og = m.querySelector('#og').value;
        var inv = V.insert('invoices', {
          number: V.nextNumber('invoice'), customer_id: m.querySelector('#cu').value,
          quote_id: og.slice(0, 1) === 'q' ? og.slice(2) : null,
          wo_id: og.slice(0, 1) === 'w' ? og.slice(2) : null,
          project_id: og.slice(0, 1) === 'p' ? og.slice(2) : null,
          status: 'ISSUED', date: m.querySelector('#dt').value, due: m.querySelector('#du').value,
          items: valid, taxRate: +m.querySelector('#tx').value || 0, discount: 0, notes: m.querySelector('#nt').value.trim()
        });
        V.logActivity('invoice', inv.id, 'Emitió la factura ' + inv.number, 'create');
        V.logAudit('CREATE', 'invoice', inv.number, V.money(V.invoiceTotals(inv).total));
        UI.closeTop(); UI.toast('Factura ' + inv.number + ' emitida.', 'ok'); location.hash = 'facturacion/' + inv.id;
      });
    }
    function redraw(m) {
      var cu = m.querySelector('#cu').value, dt = m.querySelector('#dt').value, du = m.querySelector('#du').value, tx = m.querySelector('#tx').value;
      m.querySelector('.modal-b').innerHTML = body();
      m.querySelector('#cu').value = cu; m.querySelector('#dt').value = dt; m.querySelector('#du').value = du; m.querySelector('#tx').value = tx;
      bind(m);
    }
  }

  function newExpense() {
    UI.modal({ title: 'Registrar gasto',
      body: '<div class="field"><label for="ds">Concepto <span class="req">*</span></label><input class="input" id="ds"></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="ct">Categoría</label><select class="select" id="ct"><option>Materiales</option><option>Viáticos</option><option>Combustible</option><option>Herramientas</option><option>Subcontratación</option><option>Otros</option></select></div>' +
        '<div class="field"><label for="am">Monto</label><input class="input" id="am" type="number" step="0.01" value="0"></div>' +
        '<div class="field"><label for="dt">Fecha</label><input class="input" id="dt" type="date" value="' + V.ymd(V.today()) + '"></div></div>' +
        '<div class="grid g2 mt4">' +
        '<div class="field"><label for="pj">Imputar a proyecto</label><select class="select" id="pj"><option value="">— Ninguno —</option>' + opt(V.all('projects'), null, function (p) { return p.id; }, function (p) { return p.code; }) + '</select></div>' +
        '<div class="field"><label for="wo">Imputar a orden</label><select class="select" id="wo"><option value="">— Ninguna —</option>' + opt(V.all('workOrders'), null, function (w) { return w.id; }, function (w) { return w.number; }) + '</select></div></div>' +
        '<div class="field mt4"><label for="vn">Proveedor</label><select class="select" id="vn"><option value="">— Ninguno —</option>' + opt(V.all('vendors')) + '</select></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Registrar</button>',
      onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
        var d = m.querySelector('#ds').value.trim(), a = +m.querySelector('#am').value || 0;
        if (!d || !a) { UI.toast('Concepto y monto son obligatorios.', 'err'); return; }
        V.insert('expenses', { project_id: m.querySelector('#pj').value || null, wo_id: m.querySelector('#wo').value || null,
          category: m.querySelector('#ct').value, desc: d, amount: a, date: m.querySelector('#dt').value,
          vendor_id: m.querySelector('#vn').value || null });
        V.logAudit('CREATE', 'expense', d, V.money(a));
        UI.closeTop(); UI.toast('Gasto registrado.', 'ok'); APP.reload();
      }); } });
  }

  function invoiceDetail(el, id) {
    var inv = V.byId('invoices', id);
    if (!inv) { el.innerHTML = PH({ title: 'Factura' }) + UI.errorState('La factura no existe.'); return; }
    var t = V.invoiceTotals(inv), st = effStatus(inv);
    var pays = V.all('payments').filter(function (p) { return p.invoice_id === inv.id; });

    var h = PH({
      crumbs: [{ label: 'Facturación', href: '#facturacion' }, { label: inv.number }],
      title: inv.number + '  ·  ' + V.money(t.total),
      sub: E(V.customerName(inv.customer_id)) + ' · emitida ' + V.fdate(inv.date) + ' · vence ' + V.fdate(inv.due) + ' · ' + UI.badge(V.INV_STATES, st),
      actions: '<button class="btn btn-outline btn-sm" id="pdf">' + I('print', 15) + ' PDF</button>' +
        (t.balance > 0.01 && V.can('facturacion', 'crear') ? '<button class="btn btn-primary btn-sm" id="pay">' + I('dollar', 15) + ' Registrar pago</button>' : '') +
        (st !== 'VOID' && V.can('facturacion', 'administrar') ? '<button class="btn btn-ghost btn-sm" id="void">Anular</button>' : '')
    });

    if (st === 'OVERDUE') {
      h += '<div class="banner banner-danger mb4">' + I('alert', 16) + '<div><b>Factura vencida hace ' + Math.abs(V.daysTo(inv.due)) +
        ' días.</b> Saldo pendiente: ' + V.money(t.balance) + '. La automatización de cobranza ya envió el recordatorio.</div></div>';
    }

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Conceptos</h3></div><div class="tbl-wrap"><table class="tbl">' +
      '<thead><tr><th>Descripción</th><th class="right">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead><tbody>' +
      inv.items.map(function (it) {
        return '<tr><td><b>' + E(it.desc) + '</b></td><td class="right mono">' + it.qty + '</td>' +
          '<td class="right mono">' + V.money(it.price) + '</td><td class="right mono bold">' + V.money(it.qty * it.price) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="card"><div class="card-h"><h3>Pagos recibidos</h3><span class="small muted">' + V.money(t.paid) + ' de ' + V.money(t.total) + '</span></div>' +
      (pays.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Método</th><th>Referencia</th><th class="right">Monto</th></tr></thead><tbody>' +
        pays.map(function (p) {
          return '<tr><td class="small">' + V.fdate(p.date) + '</td><td><span class="chip">' + E(p.method) + '</span></td>' +
            '<td class="small mono">' + E(p.ref) + '</td><td class="right mono bold" style="color:var(--success)">' + V.money(p.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card-b"><p class="small muted">Sin pagos registrados.</p></div>') +
      '<div class="card-f"><div class="bar ' + (t.balance <= 0.01 ? 'g' : 'a') + '"><i style="width:' + Math.min(100, (t.paid / Math.max(1, t.total)) * 100) + '%"></i></div></div></div>' +
      (inv.notes ? '<div class="card"><div class="card-h"><h3>Notas</h3></div><div class="card-b"><p class="small">' + E(inv.notes) + '</p></div></div>' : '') +
      '</div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Totales</h3></div><div class="card-b col" style="gap:9px">' +
        kv('Subtotal', V.money(t.sub)) + kv(V.myTenant().taxName + ' (' + inv.taxRate + '%)', V.money(t.tax)) +
        '<div style="height:1px;background:var(--border)"></div>' +
        '<div class="spread"><span class="bold">Total</span><span style="font-size:20px;font-weight:700;color:var(--black)">' + V.money(t.total) + '</span></div>' +
        kv('Pagado', V.money(t.paid)) +
        '<div class="spread"><span class="bold">Saldo</span><b class="mono" style="color:' + (t.balance > 0.01 ? 'var(--danger)' : 'var(--success)') + '">' + V.money(t.balance) + '</b></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-b col" style="gap:10px">' +
        kv('Cliente', '<a href="#clientes/' + inv.customer_id + '">' + E(V.customerName(inv.customer_id)) + '</a>') +
        kv('Condiciones', E((V.byId('customers', inv.customer_id) || {}).paymentTerms || '—')) +
        (inv.quote_id ? kv('Presupuesto', '<a href="#presupuestos/' + inv.quote_id + '">' + E((V.byId('quotes', inv.quote_id) || {}).number || '') + '</a>') : '') +
        (inv.wo_id ? kv('Orden', '<a href="#ordenes/' + inv.wo_id + '">' + E((V.byId('workOrders', inv.wo_id) || {}).number || '') + '</a>') : '') +
        (inv.project_id ? kv('Proyecto', '<a href="#proyectos/' + inv.project_id + '">' + E((V.byId('projects', inv.project_id) || {}).code || '') + '</a>') : '') +
      '</div></div></div></div>';

    el.innerHTML = h;
    el.querySelector('#pdf').addEventListener('click', function () { printInvoice(inv); });
    var pb = el.querySelector('#pay');
    if (pb) pb.addEventListener('click', function () {
      UI.modal({ title: 'Registrar pago', subtitle: inv.number + ' · saldo ' + V.money(t.balance),
        body: '<div class="grid g2">' +
          '<div class="field"><label for="am">Monto</label><input class="input" id="am" type="number" step="0.01" value="' + t.balance.toFixed(2) + '"></div>' +
          '<div class="field"><label for="dt">Fecha</label><input class="input" id="dt" type="date" value="' + V.ymd(V.today()) + '"></div></div>' +
          '<div class="grid g2 mt4"><div class="field"><label for="mt">Método</label><select class="select" id="mt">' +
            ['Transferencia','Efectivo','Pago móvil','Tarjeta','Cheque','Zelle'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label for="rf">Referencia</label><input class="input" id="rf"></div></div>' +
          '<div class="field mt4"><label>Comprobante</label><div class="dropzone" id="dz">' + I('upload', 20) + '<div class="small mt2">Adjuntar comprobante</div></div></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Registrar pago</button>',
        onMount: function (m) {
          UI.uploader(m.querySelector('#dz'));
          m.querySelector('#ok').addEventListener('click', function () {
            var am = +m.querySelector('#am').value || 0;
            if (am <= 0) { UI.toast('El monto debe ser mayor que cero.', 'err'); return; }
            if (am > t.balance + 0.01) { UI.toast('El monto excede el saldo pendiente.', 'err'); return; }
            V.insert('payments', { invoice_id: inv.id, amount: am, date: m.querySelector('#dt').value,
              method: m.querySelector('#mt').value, ref: m.querySelector('#rf').value.trim(), notes: '' });
            var nt = V.invoiceTotals(inv);
            V.update('invoices', inv.id, { status: nt.balance <= 0.01 ? 'PAID' : 'PARTIAL' });
            V.logActivity('invoice', inv.id, 'Registró un pago de ' + V.money(am), 'payment');
            V.logAudit('CREATE', 'payment', inv.number, V.money(am) + ' · ' + m.querySelector('#mt').value);
            UI.closeTop(); UI.toast('Pago registrado.', 'ok'); APP.reload(); APP.refreshChrome();
          });
        } });
    });
    var vb = el.querySelector('#void');
    if (vb) vb.addEventListener('click', function () {
      UI.confirm({ title: '¿Anular la factura?', body: 'La factura ' + inv.number + ' quedará anulada y no se contará en las cuentas por cobrar.', ok: 'Anular', danger: true },
        function () {
          V.update('invoices', inv.id, { status: 'VOID' });
          V.logAudit('UPDATE', 'invoice', inv.number, 'Anulada');
          UI.toast('Factura anulada.', 'ok'); APP.reload();
        });
    });
  }

  function printInvoice(inv) {
    var t = V.invoiceTotals(inv), tn = V.myTenant(), c = V.byId('customers', inv.customer_id) || {};
    UI.printDoc('Factura ' + inv.number,
      '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px">' +
      '<div><h1>' + E(tn.name) + '</h1><p style="color:#6B7280;font-size:12px">' + E(tn.legalName) + '<br>' + E(tn.taxId) + '<br>' + E(tn.address) + '<br>' + E(tn.phone) + '</p></div>' +
      '<div style="text-align:right"><h2 style="font-size:18px">FACTURA</h2><p style="font-size:13px"><b>' + E(inv.number) + '</b><br>' +
      'Emisión: ' + V.fdate(inv.date, true) + '<br>Vencimiento: ' + V.fdate(inv.due, true) + '</p></div></div>' +
      '<div style="margin-top:20px;font-size:12.5px"><b>Cliente</b><br>' + E(c.name) + '<br>' + E(c.taxId || '') + '<br>' + E(c.address || '') + '</div>' +
      '<table><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      inv.items.map(function (it) {
        return '<tr><td>' + E(it.desc) + '</td><td style="text-align:right">' + it.qty + '</td>' +
          '<td style="text-align:right">' + V.money(it.price) + '</td><td style="text-align:right">' + V.money(it.qty * it.price) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot"><table><tr><td>Subtotal</td><td style="text-align:right">' + V.money(t.sub) + '</td></tr>' +
      '<tr><td>' + E(tn.taxName) + ' ' + inv.taxRate + '%</td><td style="text-align:right">' + V.money(t.tax) + '</td></tr>' +
      '<tr style="font-weight:700;font-size:15px"><td style="border-top:2px solid #111">TOTAL</td><td style="text-align:right;border-top:2px solid #111">' + V.money(t.total) + '</td></tr>' +
      '<tr><td>Pagado</td><td style="text-align:right">' + V.money(t.paid) + '</td></tr>' +
      '<tr style="font-weight:700"><td>SALDO</td><td style="text-align:right">' + V.money(t.balance) + '</td></tr></table></div>' +
      (inv.notes ? '<p style="margin-top:18px"><b>Notas:</b> ' + E(inv.notes) + '</p>' : '') +
      '<p style="margin-top:16px;font-size:11.5px;color:#6B7280">' + E(tn.paymentTerms) + '</p>' +
      '<p style="margin-top:28px;font-size:10px;color:#9CA3AF;text-align:center">Documento generado con VOLTX</p></div>');
  }

  /* ============================================================
     O) MANTENIMIENTOS PREVENTIVOS §6.15
     ============================================================ */
  views.mantenimientos = function (el) {
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Mantenimientos preventivos',
      sub: 'Planes recurrentes por cliente, sitio o activo, con generación automática de órdenes',
      actions: V.can('mantenimientos', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo plan</button>' : ''
    });
    var up = V.upcomingMaintenance();
    if (up.length) {
      el.insertAdjacentHTML('beforeend', '<div class="banner banner-warn mb4">' + I('wrench', 16) +
        '<div><b>' + up.length + ' mantenimiento(s) próximo(s):</b> ' +
        up.map(function (m) { return E(m.name) + ' (' + V.frel(m.nextDate) + ')'; }).join(' · ') + '</div></div>');
    }
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () { editPlan(null); });

    UI.table(host, {
      rows: function () { return V.all('maintenancePlans'); },
      search: function (m) { return m.name + ' ' + V.customerName(m.customer_id); },
      placeholder: 'Buscar plan…', exportName: 'voltx-mantenimientos',
      filters: [{ key: 'fq', label: 'Toda periodicidad',
        options: ['mensual','trimestral','semestral','anual','personalizada'].map(function (x) { return { value: x, label: x }; }),
        match: function (r, v) { return r.frequency === v; } }],
      cols: [
        { key: 'name', label: 'Plan', render: function (m) { return '<div class="bold">' + E(m.name) + '</div><div class="xs muted">' + E(V.customerName(m.customer_id)) + ' · ' + E(V.siteName(m.site_id)) + '</div>'; } },
        { key: 'asset_id', label: 'Activo', render: function (m) { return '<span class="small">' + E((V.byId('assets', m.asset_id) || {}).name || '—') + '</span>'; } },
        { key: 'frequency', label: 'Periodicidad', render: function (m) { return '<span class="chip">' + E(m.frequency) + '</span>'; } },
        { key: 'lastDate', label: 'Último', render: function (m) { return V.fdate(m.lastDate); } },
        { key: 'nextDate', label: 'Próximo', render: function (m) {
            var d = V.daysTo(m.nextDate);
            return '<span class="small ' + (d < 0 ? 'prio-critica' : d <= m.alertDays ? 'prio-alta' : '') + '">' + V.fdate(m.nextDate) + '</span>' +
              '<div class="xs muted">' + V.frel(m.nextDate) + '</div>'; } },
        { key: 'technician_id', label: 'Técnico', render: function (m) { return '<span class="small">' + E(V.techName(m.technician_id)) + '</span>'; } },
        { key: 'contract', label: 'Contrato', render: function (m) { return m.contract ? '<span class="badge b-blue">' + E(m.contract) + '</span>' : '<span class="muted">—</span>'; } },
        { key: 'active', label: 'Estado', right: true, render: function (m) { return m.active ? '<span class="badge b-green">Activo</span>' : '<span class="badge b-gray">Pausado</span>'; } }
      ],
      onRow: function (rid) { editPlan(V.byId('maintenancePlans', rid)); }
    });
  };

  function editPlan(p) {
    var isNew = !p;
    p = p || { name: '', customer_id: '', site_id: '', asset_id: '', service_id: '', frequency: 'trimestral',
               nextDate: V.ymd(V.addDays(V.today(), 90)), lastDate: null, active: true, contract: '', alertDays: 7, technician_id: '' };
    UI.modal({
      title: isNew ? 'Nuevo plan de mantenimiento' : p.name, size: 'wide',
      body: '<div class="field"><label for="nm">Nombre del plan <span class="req">*</span></label><input class="input" id="nm" value="' + E(p.name) + '"></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="cu">Cliente</label><select class="select" id="cu">' + opt(V.all('customers'), p.customer_id) + '</select></div>' +
        '<div class="field"><label for="si">Ubicación</label><select class="select" id="si"></select></div>' +
        '<div class="field"><label for="as">Activo</label><select class="select" id="as"><option value="">— Ninguno —</option></select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="sv">Servicio / checklist</label><select class="select" id="sv">' + opt(V.all('services'), p.service_id) + '</select></div>' +
        '<div class="field"><label for="fq">Periodicidad</label><select class="select" id="fq">' +
          ['mensual','trimestral','semestral','anual','personalizada'].map(function (x) { return '<option' + (p.frequency === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="te">Técnico habitual</label><select class="select" id="te">' + opt(V.all('technicians'), p.technician_id) + '</select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="nd">Próxima fecha</label><input class="input" id="nd" type="date" value="' + (p.nextDate || '') + '"></div>' +
        '<div class="field"><label for="al">Días de alerta previa</label><input class="input" id="al" type="number" value="' + p.alertDays + '"></div>' +
        '<div class="field"><label for="ct">Contrato asociado</label><input class="input" id="ct" value="' + E(p.contract) + '"></div></div>' +
        '<label class="check mt4"><input type="checkbox" id="ac"' + (p.active ? ' checked' : '') + '><span>Plan activo (genera órdenes automáticamente)</span></label>',
      footer: (isNew ? '' : '<button class="btn btn-outline" id="gen">' + I('clipboard', 15) + ' Generar orden ahora</button>') +
              '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv2">Guardar</button>',
      onMount: function (m) {
        var cu = m.querySelector('#cu'), si = m.querySelector('#si'), as = m.querySelector('#as');
        function sync() {
          si.innerHTML = opt(H.sitesOf(cu.value), p.site_id);
          as.innerHTML = '<option value="">— Ninguno —</option>' +
            opt(V.all('assets').filter(function (a) { return a.customer_id === cu.value; }), p.asset_id);
        }
        cu.addEventListener('change', sync); sync();
        m.querySelector('#sv2').addEventListener('click', function () {
          var n = m.querySelector('#nm').value.trim();
          if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          var data = { name: n, customer_id: cu.value, site_id: si.value, asset_id: as.value || null,
            service_id: m.querySelector('#sv').value, frequency: m.querySelector('#fq').value,
            nextDate: m.querySelector('#nd').value, alertDays: +m.querySelector('#al').value || 7,
            contract: m.querySelector('#ct').value.trim(), technician_id: m.querySelector('#te').value,
            active: m.querySelector('#ac').checked };
          if (isNew) { data.lastDate = null; V.insert('maintenancePlans', data); } else V.update('maintenancePlans', p.id, data);
          V.logAudit(isNew ? 'CREATE' : 'UPDATE', 'maintenance_plan', p.id || n, n);
          UI.closeTop(); UI.toast('Plan guardado.', 'ok'); APP.reload();
        });
        var g = m.querySelector('#gen');
        if (g) g.addEventListener('click', function () {
          var s = V.byId('services', p.service_id);
          var start = new Date(p.nextDate + 'T08:00');
          var wo = V.insert('workOrders', {
            number: V.nextNumber('wo'), customer_id: p.customer_id, site_id: p.site_id, project_id: null,
            title: p.name, type: 'mantenimiento', priority: 'normal', status: p.technician_id ? 'ASSIGNED' : 'SCHEDULED',
            start: start.toISOString(), end: new Date(start.getTime() + (s ? s.duration : 3) * 3600000).toISOString(),
            estimated: s ? s.duration : 3, technicians: p.technician_id ? [p.technician_id] : [], service_id: p.service_id,
            description: 'Orden generada automáticamente por el plan preventivo «' + p.name + '».',
            branch_id: (V.byId('customers', p.customer_id) || {}).branch_id || 'br_1',
            checklist: (s ? s.checklist : []).map(function (c) { return { text: c, done: false, required: true }; }),
            materials: [], timeEntries: [], photos: [], signature: null,
            history: [{ status: 'SCHEDULED', at: new Date().toISOString(), by: V.getSession().user_id, note: 'Generada por plan preventivo' }]
          });
          var nextMap = { mensual: 30, trimestral: 90, semestral: 180, anual: 365, personalizada: 90 };
          V.update('maintenancePlans', p.id, { lastDate: V.ymd(V.today()), nextDate: V.ymd(V.addDays(new Date(p.nextDate), nextMap[p.frequency] || 90)) });
          V.logActivity('work_order', wo.id, 'Generó la orden preventiva ' + wo.number + ' desde el plan ' + p.name, 'create');
          UI.closeTop(); UI.toast('Orden ' + wo.number + ' generada. Próxima fecha recalculada.', 'ok');
          location.hash = 'ordenes/' + wo.id;
        });
      }
    });
  }

  /* ============================================================
     P) ACTIVOS / INSTALACIONES ELÉCTRICAS §6.16
     ============================================================ */
  views.activos = function (el) {
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Activos e instalaciones eléctricas',
      sub: 'Tableros, generadores, UPS, transformadores y puesta a tierra con historial de intervenciones',
      actions: V.can('activos', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nuevo activo</button>' : ''
    });
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () { editAsset(null); });

    UI.table(host, {
      rows: function () { return V.all('assets'); },
      search: function (a) { return a.name + ' ' + a.serial + ' ' + a.brand + ' ' + a.model + ' ' + V.customerName(a.customer_id); },
      placeholder: 'Buscar por nombre, serial o marca…', exportName: 'voltx-activos',
      filters: [{ key: 'ty', label: 'Todos los tipos',
        options: H.uniq(V.all('assets').map(function (a) { return a.type; })).map(function (x) { return { value: x, label: x }; }),
        match: function (r, v) { return r.type === v; } }],
      cols: [
        { key: 'name', label: 'Activo', render: function (a) { return '<div class="bold">' + E(a.name) + '</div><div class="xs muted">' + E(a.brand + ' ' + a.model) + '</div>'; } },
        { key: 'type', label: 'Tipo', render: function (a) { return '<span class="chip">' + E(a.type) + '</span>'; } },
        { key: 'serial', label: 'Serial', render: function (a) { return '<span class="mono small">' + E(a.serial) + '</span>'; } },
        { key: 'cus', label: 'Cliente / sitio', sortVal: function (a) { return V.customerName(a.customer_id); },
          render: function (a) { return '<div class="small">' + E(V.customerName(a.customer_id)) + '</div><div class="xs muted">' + E(V.siteName(a.site_id)) + '</div>'; } },
        { key: 'capacity', label: 'Capacidad', render: function (a) { return '<span class="small">' + E(a.capacity) + '</span>'; } },
        { key: 'warrantyUntil', label: 'Garantía', render: function (a) {
            var d = V.daysTo(a.warrantyUntil);
            return d < 0 ? '<span class="badge b-gray">Vencida</span>' : '<span class="badge b-green">Hasta ' + V.fdate(a.warrantyUntil) + '</span>'; } },
        { key: 'nextService', label: 'Próximo servicio', right: true, render: function (a) {
            var d = V.daysTo(a.nextService);
            return '<span class="small ' + (d < 0 ? 'prio-critica' : d <= 15 ? 'prio-alta' : '') + '">' + V.fdate(a.nextService) + '</span>'; } }
      ],
      onRow: function (rid) { assetDetail(V.byId('assets', rid)); }
    });
  };

  function assetDetail(a) {
    var wos = V.all('workOrders').filter(function (w) { return w.site_id === a.site_id; });
    var plans = V.all('maintenancePlans').filter(function (m) { return m.asset_id === a.id; });
    UI.drawer({
      eyebrow: a.type, title: a.name, size: 'xl',
      subtitle: E(a.brand + ' ' + a.model) + ' · serial ' + E(a.serial),
      body: '<div class="grid g2 mb4">' +
          kv('Cliente', '<a href="#clientes/' + a.customer_id + '">' + E(V.customerName(a.customer_id)) + '</a>') +
          kv('Ubicación', E(V.siteName(a.site_id))) + kv('Fabricante', E(a.brand)) + kv('Modelo', E(a.model)) +
          kv('Serial', E(a.serial)) + kv('Capacidad', E(a.capacity)) +
          kv('Instalado', V.fdate(a.installedAt)) + kv('Garantía hasta', V.fdate(a.warrantyUntil)) +
          kv('Último servicio', V.fdate(a.lastService)) + kv('Próximo servicio', V.fdate(a.nextService)) +
        '</div>' +
        '<h4 class="mb2">Planes de mantenimiento</h4>' +
        (plans.length ? '<div class="col mb4" style="gap:6px">' + plans.map(function (m) {
          return '<div class="file-row"><span class="file-ico">' + I('wrench', 15) + '</span>' +
            '<span><b class="small" style="display:block">' + E(m.name) + '</b>' +
            '<span class="xs muted">' + E(m.frequency) + ' · próximo ' + V.fdate(m.nextDate) + '</span></span></div>';
        }).join('') + '</div>' : '<p class="small muted mb4">Sin planes asociados.</p>') +
        '<h4 class="mb2">Historial de intervenciones en el sitio</h4>' +
        (wos.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Orden</th><th>Trabajo</th><th>Fecha</th><th class="right">Estado</th></tr></thead><tbody>' +
          wos.map(function (w) {
            return '<tr><td><a href="#ordenes/' + w.id + '"><b>' + E(w.number) + '</b></a></td><td>' + E(w.title) + '</td>' +
              '<td class="small">' + V.fdate(w.start) + '</td><td class="right">' + UI.badge(V.WO_STATES, w.status) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="small muted">Sin intervenciones registradas.</p>') +
        '<h4 class="mt6 mb2">Documentos</h4>' +
        ((a.docs || []).length ? '<div class="col" style="gap:6px">' + a.docs.map(function (d) {
          return '<div class="file-row"><span class="file-ico">' + I('file', 15) + '</span><b class="small">' + E(d) + '</b></div>';
        }).join('') + '</div>' : '<p class="small muted">Sin documentos.</p>'),
      footer: '<button class="btn btn-outline" data-close>Cerrar</button>' +
        (V.can('activos', 'editar') ? '<button class="btn btn-primary" id="ed">Editar activo</button>' : ''),
      onMount: function (w) {
        var e = w.querySelector('#ed'); if (e) e.addEventListener('click', function () { UI.closeTop(); editAsset(a); });
      }
    });
  }

  function editAsset(a) {
    var isNew = !a;
    a = a || { name: '', type: 'Tablero eléctrico', brand: '', model: '', serial: '', capacity: '',
               customer_id: '', site_id: '', installedAt: V.ymd(V.today()), warrantyUntil: V.ymd(V.addDays(V.today(), 365)),
               lastService: null, nextService: V.ymd(V.addDays(V.today(), 180)), docs: [], photos: 0 };
    UI.modal({
      title: isNew ? 'Nuevo activo' : 'Editar activo', size: 'wide',
      body: '<div class="grid g2">' +
        '<div class="field"><label for="nm">Nombre <span class="req">*</span></label><input class="input" id="nm" value="' + E(a.name) + '"></div>' +
        '<div class="field"><label for="ty">Tipo</label><select class="select" id="ty">' +
          ['Tablero eléctrico','Generador','UPS','Transformador','Puesta a tierra','Equipo crítico','Circuito / área']
            .map(function (x) { return '<option' + (a.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="br">Fabricante</label><input class="input" id="br" value="' + E(a.brand) + '"></div>' +
        '<div class="field"><label for="md">Modelo</label><input class="input" id="md" value="' + E(a.model) + '"></div>' +
        '<div class="field"><label for="sr">Serial</label><input class="input" id="sr" value="' + E(a.serial) + '"></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="cu">Cliente</label><select class="select" id="cu">' + opt(V.all('customers'), a.customer_id) + '</select></div>' +
        '<div class="field"><label for="si">Ubicación</label><select class="select" id="si"></select></div>' +
        '<div class="field"><label for="cp">Capacidad</label><input class="input" id="cp" value="' + E(a.capacity) + '" placeholder="250 kVA / 400 V"></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="ia">Fecha de instalación</label><input class="input" id="ia" type="date" value="' + (a.installedAt || '') + '"></div>' +
        '<div class="field"><label for="wu">Garantía hasta</label><input class="input" id="wu" type="date" value="' + (a.warrantyUntil || '') + '"></div>' +
        '<div class="field"><label for="ns">Próximo servicio</label><input class="input" id="ns" type="date" value="' + (a.nextService || '') + '"></div></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="sv">Guardar</button>',
      onMount: function (m) {
        var cu = m.querySelector('#cu'), si = m.querySelector('#si');
        function sync() { si.innerHTML = opt(H.sitesOf(cu.value), a.site_id); }
        cu.addEventListener('change', sync); sync();
        m.querySelector('#sv').addEventListener('click', function () {
          var n = m.querySelector('#nm').value.trim();
          if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
          var data = { name: n, type: m.querySelector('#ty').value, brand: m.querySelector('#br').value.trim(),
            model: m.querySelector('#md').value.trim(), serial: m.querySelector('#sr').value.trim(),
            capacity: m.querySelector('#cp').value.trim(), customer_id: cu.value, site_id: si.value,
            installedAt: m.querySelector('#ia').value, warrantyUntil: m.querySelector('#wu').value,
            nextService: m.querySelector('#ns').value };
          if (isNew) { data.lastService = null; data.docs = []; data.photos = 0; V.insert('assets', data); }
          else V.update('assets', a.id, data);
          V.logAudit(isNew ? 'CREATE' : 'UPDATE', 'asset', a.id || n, n);
          UI.closeTop(); UI.toast('Activo guardado.', 'ok'); APP.reload();
        });
      }
    });
  }

  /* ============================================================
     Q) DOCUMENTOS Y CERTIFICADOS §6.17
     ============================================================ */
  views.documentos = function (el) {
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Documentos y certificados',
      sub: 'Repositorio por cliente, sitio, proyecto y orden, con versiones, visibilidad y vencimientos',
      actions: V.can('documentos', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('upload', 15) + ' Subir documento</button>' : ''
    });
    var venc = V.all('documents').filter(function (d) { return d.expires && V.daysTo(d.expires) <= 30; });
    if (venc.length) {
      el.insertAdjacentHTML('beforeend', '<div class="banner banner-warn mb4">' + I('alert', 16) +
        '<div><b>' + venc.length + ' documento(s) por vencer:</b> ' +
        venc.map(function (d) { return E(d.name) + ' (' + V.frel(d.expires) + ')'; }).join(' · ') + '</div></div>');
    }
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', function () {
      UI.modal({ title: 'Subir documento',
        body: '<div class="dropzone" id="dz">' + I('upload', 24) + '<div class="mt2 small">Arrastra el archivo o haz clic para seleccionarlo</div></div>' +
          '<div class="grid g2 mt4">' +
          '<div class="field"><label for="ct">Categoría</label><select class="select" id="ct">' +
            ['Planos','Permisos','Inspecciones','Certificados','Fichas técnicas','Garantías','Contratos','Actas']
              .map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label for="vs">Visibilidad</label><select class="select" id="vs"><option value="interno">Solo interno</option><option value="cliente">Visible al cliente</option></select></div></div>' +
          '<div class="grid g2 mt4">' +
          '<div class="field"><label for="cu">Cliente</label><select class="select" id="cu"><option value="">— Ninguno —</option>' + opt(V.all('customers')) + '</select></div>' +
          '<div class="field"><label for="ex">Vencimiento (opcional)</label><input class="input" id="ex" type="date"></div></div>' +
          '<div class="field mt4"><label for="nm">Nombre del documento</label><input class="input" id="nm" placeholder="certificado-puesta-a-tierra.pdf"></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>',
        onMount: function (m) {
          UI.uploader(m.querySelector('#dz'), function () { if (!m.querySelector('#nm').value) m.querySelector('#nm').value = 'documento-' + Date.now() + '.pdf'; });
          m.querySelector('#ok').addEventListener('click', function () {
            var n = m.querySelector('#nm').value.trim();
            if (!n) { UI.toast('Indica el nombre del documento.', 'err'); return; }
            V.insert('documents', { name: n, category: m.querySelector('#ct').value,
              customer_id: m.querySelector('#cu').value || null, site_id: null, project_id: null, wo_id: null,
              visibility: m.querySelector('#vs').value, version: 1, size: '—',
              expires: m.querySelector('#ex').value || null, uploadedBy: V.getSession().user_id, date: V.ymd(V.today()) });
            V.logAudit('CREATE', 'document', n, m.querySelector('#ct').value);
            UI.closeTop(); UI.toast('Documento registrado.', 'ok'); APP.reload();
          });
        } });
    });

    UI.table(host, {
      rows: function () { return V.all('documents'); },
      search: function (d) { return d.name + ' ' + d.category + ' ' + V.customerName(d.customer_id); },
      placeholder: 'Buscar documento…', exportName: 'voltx-documentos', sort: 'date', dir: 'desc',
      filters: [
        { key: 'cat', label: 'Todas las categorías', options: H.uniq(V.all('documents').map(function (d) { return d.category; })).map(function (x) { return { value: x, label: x }; }), match: function (r, v) { return r.category === v; } },
        { key: 'vis', label: 'Toda visibilidad', options: [{ value: 'interno', label: 'Solo interno' }, { value: 'cliente', label: 'Visible al cliente' }], match: function (r, v) { return r.visibility === v; } }
      ],
      cols: [
        { key: 'name', label: 'Documento', render: function (d) {
            return '<div class="row gap2"><span class="file-ico">' + I('file', 15) + '</span><div style="min-width:0">' +
              '<div class="bold truncate">' + E(d.name) + '</div><div class="xs muted">v' + d.version + ' · ' + E(d.size) + ' · ' + E(V.userName(d.uploadedBy)) + '</div></div></div>'; } },
        { key: 'category', label: 'Categoría', render: function (d) { return '<span class="chip">' + E(d.category) + '</span>'; } },
        { key: 'cus', label: 'Vinculado a', sortVal: function (d) { return V.customerName(d.customer_id); },
          render: function (d) {
            var parts = [];
            if (d.customer_id) parts.push('<a href="#clientes/' + d.customer_id + '">' + E(V.customerName(d.customer_id)) + '</a>');
            if (d.project_id) parts.push('<a href="#proyectos/' + d.project_id + '">' + E((V.byId('projects', d.project_id) || {}).code || '') + '</a>');
            if (d.wo_id) parts.push('<a href="#ordenes/' + d.wo_id + '">' + E((V.byId('workOrders', d.wo_id) || {}).number || '') + '</a>');
            return '<span class="small">' + (parts.join(' · ') || '—') + '</span>'; } },
        { key: 'visibility', label: 'Visibilidad', render: function (d) {
            return d.visibility === 'cliente' ? '<span class="badge b-green">Cliente</span>' : '<span class="badge b-gray">Interno</span>'; } },
        { key: 'date', label: 'Fecha', render: function (d) { return V.fdate(d.date); } },
        { key: 'expires', label: 'Vence', render: function (d) {
            if (!d.expires) return '<span class="muted">—</span>';
            var dd = V.daysTo(d.expires);
            return '<span class="small ' + (dd < 0 ? 'prio-critica' : dd <= 30 ? 'prio-alta' : '') + '">' + V.fdate(d.expires) + '</span>'; } },
        { key: 'ac', label: '', sortable: false, export: false, right: true, render: function () {
            return '<button class="btn btn-ghost btn-sm btn-icon" title="Descargar (URL firmada temporal)">' + I('download', 15) + '</button>'; } }
      ],
      onRow: function (rid) {
        var d = V.byId('documents', rid);
        UI.modal({ title: d.name, subtitle: d.category + ' · versión ' + d.version,
          body: '<div class="col">' + kv('Categoría', E(d.category)) + kv('Versión', 'v' + d.version) +
            kv('Tamaño', E(d.size)) + kv('Subido por', E(V.userName(d.uploadedBy))) + kv('Fecha', V.fdate(d.date)) +
            kv('Visibilidad', d.visibility === 'cliente' ? 'Visible al cliente' : 'Solo interno') +
            kv('Vencimiento', d.expires ? V.fdate(d.expires) : '—') +
            '<div class="banner banner-info mt4">' + I('lock', 15) + '<div>La descarga se sirve mediante una URL firmada temporal con acceso controlado por permisos.</div></div></div>',
          footer: '<button class="btn btn-outline" data-close>Cerrar</button>' +
            (V.can('documentos', 'editar') ? '<button class="btn btn-outline" id="tog">Cambiar visibilidad</button>' : '') +
            '<button class="btn btn-primary" id="dl">' + I('download', 15) + ' Descargar</button>',
          onMount: function (m) {
            m.querySelector('#dl').addEventListener('click', function () { UI.toast('Demo: la descarga requiere el object storage del backend.'); });
            var t = m.querySelector('#tog');
            if (t) t.addEventListener('click', function () {
              V.update('documents', d.id, { visibility: d.visibility === 'cliente' ? 'interno' : 'cliente' });
              V.logAudit('UPDATE', 'document', d.name, 'Visibilidad cambiada');
              UI.closeTop(); UI.toast('Visibilidad actualizada.', 'ok'); APP.reload();
            });
          } });
      }
    });
  };

  /* ============================================================
     R) INCIDENCIAS, GARANTÍAS Y RETRABAJOS §6.18
     ============================================================ */
  views.incidencias = function (el, id) {
    if (id) return ticketDetail(el, id);
    var host = document.createElement('div');
    el.innerHTML = PH({
      title: 'Incidencias, garantías y retrabajos',
      sub: 'Tickets vinculados a cliente, proyecto u orden, con SLA, causa raíz y costo de retrabajo',
      actions: V.can('incidencias', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva incidencia</button>' : ''
    });
    var tks = V.all('tickets');
    el.insertAdjacentHTML('beforeend', '<div class="grid g4 mb4">' +
      UI.kpi({ label: 'Abiertas', value: tks.filter(function (t) { return ['OPEN','IN_PROGRESS','WAITING'].indexOf(t.status) >= 0; }).length, icon: 'alert' }) +
      UI.kpi({ label: 'Por garantía', value: tks.filter(function (t) { return t.type === 'garantia'; }).length, icon: 'shield' }) +
      UI.kpi({ label: 'SLA vencido', value: tks.filter(function (t) { return V.daysTo(t.sla) < 0 && ['RESOLVED','CLOSED'].indexOf(t.status) < 0; }).length, icon: 'clock', trend: 'down' }) +
      UI.kpi({ label: 'Costo de retrabajos', value: V.money(tks.reduce(function (a, t) { return a + (t.reworkCost || 0); }, 0)), icon: 'dollar' }) +
      '</div>');
    el.appendChild(host);
    var b = el.querySelector('#new'); if (b) b.addEventListener('click', newTicket);

    UI.table(host, {
      rows: function () { return V.all('tickets'); },
      search: function (t) { return t.number + ' ' + t.subject + ' ' + V.customerName(t.customer_id); },
      placeholder: 'Buscar incidencia…', exportName: 'voltx-incidencias', sort: 'created_at', dir: 'desc',
      filters: [
        { key: 'st', label: 'Todos los estados', options: stateOpts(V.TICKET_STATES), match: function (r, v) { return r.status === v; } },
        { key: 'ty', label: 'Toda clasificación', options: [['garantia','Garantía'],['retrabajo','Retrabajo'],['falla','Nueva falla'],['consulta','Consulta']].map(function (x) { return { value: x[0], label: x[1] }; }), match: function (r, v) { return r.type === v; } }
      ],
      cols: [
        { key: 'number', label: 'Número', render: function (t) { return '<b>' + E(t.number) + '</b>'; } },
        { key: 'subject', label: 'Asunto', render: function (t) { return '<div class="bold">' + E(t.subject) + '</div><div class="xs muted">' + E(V.customerName(t.customer_id)) + '</div>'; } },
        { key: 'type', label: 'Clasificación', render: function (t) {
            var cls = { garantia: 'b-orange', retrabajo: 'b-amber', falla: 'b-red', consulta: 'b-blue' }[t.type] || 'b-gray';
            return '<span class="badge ' + cls + '">' + E({ garantia: 'Garantía', retrabajo: 'Retrabajo', falla: 'Nueva falla', consulta: 'Consulta' }[t.type] || t.type) + '</span>'; } },
        { key: 'priority', label: 'Prioridad', render: function (t) { return UI.badge(V.PRIORITIES, t.priority); } },
        { key: 'sla', label: 'SLA', render: function (t) {
            var d = V.daysTo(t.sla), done = ['RESOLVED','CLOSED'].indexOf(t.status) >= 0;
            return '<span class="small ' + (!done && d < 0 ? 'prio-critica' : !done && d <= 1 ? 'prio-alta' : '') + '">' + V.fdate(t.sla) + '</span>'; } },
        { key: 'assignee', label: 'Responsable', render: function (t) {
            var n = V.techName(t.assignee); if (n === '—') n = V.userName(t.assignee);
            return '<span class="small">' + E(n) + '</span>'; } },
        { key: 'wo_id', label: 'Orden origen', render: function (t) {
            return t.wo_id ? '<a href="#ordenes/' + t.wo_id + '">' + E((V.byId('workOrders', t.wo_id) || {}).number || '') + '</a>' : '<span class="muted">—</span>'; } },
        { key: 'status', label: 'Estado', right: true, render: function (t) { return UI.badge(V.TICKET_STATES, t.status); } }
      ],
      onRow: function (rid) { location.hash = 'incidencias/' + rid; }
    });
  };

  function newTicket() {
    UI.modal({
      title: 'Nueva incidencia', size: 'wide',
      body: '<div class="field"><label for="sb">Asunto <span class="req">*</span></label><input class="input" id="sb"></div>' +
        '<div class="grid g2 mt4">' +
        '<div class="field"><label for="cu">Cliente</label><select class="select" id="cu">' + opt(V.all('customers')) + '</select></div>' +
        '<div class="field"><label for="wo">Orden relacionada</label><select class="select" id="wo"><option value="">— Ninguna —</option>' +
          opt(V.all('workOrders'), null, function (w) { return w.id; }, function (w) { return w.number + ' — ' + w.title; }) + '</select></div></div>' +
        '<div class="grid g3 mt4">' +
        '<div class="field"><label for="ty">Clasificación</label><select class="select" id="ty">' +
          '<option value="garantia">Garantía</option><option value="retrabajo">Retrabajo</option><option value="falla">Nueva falla</option><option value="consulta">Consulta</option></select></div>' +
        '<div class="field"><label for="pr">Prioridad</label><select class="select" id="pr">' +
          Object.keys(V.PRIORITIES).map(function (k) { return '<option value="' + k + '"' + (k === 'normal' ? ' selected' : '') + '>' + V.PRIORITIES[k].label + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="sl">SLA de resolución</label><input class="input" id="sl" type="date" value="' + V.ymd(V.addDays(V.today(), 2)) + '"></div></div>' +
        '<div class="field mt4"><label for="as">Asignar a</label><select class="select" id="as">' + opt(V.all('technicians')) + '</select></div>' +
        '<div class="field mt4"><label for="de">Descripción <span class="req">*</span></label><textarea class="textarea" id="de"></textarea></div>' +
        '<div class="field mt4"><label>Evidencias</label><div class="dropzone" id="dz">' + I('camera', 20) + '<div class="small mt2">Adjuntar fotos o documentos</div></div></div>' +
        '<div id="warn" class="mt4"></div>',
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear incidencia</button>',
      onMount: function (m) {
        UI.uploader(m.querySelector('#dz'));
        m.querySelector('#wo').addEventListener('change', function () {
          var w = V.byId('workOrders', this.value);
          if (!w) { m.querySelector('#warn').innerHTML = ''; return; }
          m.querySelector('#cu').value = w.customer_id;
          var s = V.byId('services', w.service_id);
          var dias = s ? s.warranty : 90;
          var trans = -V.daysTo(w.end);
          var enGarantia = trans <= dias;
          m.querySelector('#ty').value = enGarantia ? 'garantia' : 'falla';
          m.querySelector('#warn').innerHTML = '<div class="banner banner-' + (enGarantia ? 'success' : 'warn') + '">' + I('shield', 15) +
            '<div><b>' + (enGarantia ? 'Dentro del período de garantía' : 'Fuera del período de garantía') + '.</b> ' +
            'La orden se ejecutó hace ' + trans + ' días y la garantía del servicio es de ' + dias + ' días. ' +
            'La clasificación automática queda sujeta a validación.</div></div>';
        });
        m.querySelector('#ok').addEventListener('click', function () {
          var sb = m.querySelector('#sb').value.trim(), de = m.querySelector('#de').value.trim();
          if (!sb || !de) { UI.toast('Asunto y descripción son obligatorios.', 'err'); return; }
          var t = V.insert('tickets', { number: V.nextNumber('ticket'), customer_id: m.querySelector('#cu').value,
            site_id: null, wo_id: m.querySelector('#wo').value || null, subject: sb,
            type: m.querySelector('#ty').value, priority: m.querySelector('#pr').value, status: 'OPEN',
            sla: m.querySelector('#sl').value, assignee: m.querySelector('#as').value, description: de,
            rootCause: '', resolution: '', reworkCost: 0 });
          V.logActivity('ticket', t.id, 'Creó la incidencia ' + t.number, 'create');
          V.logAudit('CREATE', 'ticket', t.number, sb);
          UI.closeTop(); UI.toast('Incidencia ' + t.number + ' creada.', 'ok'); location.hash = 'incidencias/' + t.id;
        });
      }
    });
  }

  function ticketDetail(el, id) {
    var t = V.byId('tickets', id);
    if (!t) { el.innerHTML = PH({ title: 'Incidencia' }) + UI.errorState('La incidencia no existe.'); return; }
    var slaLate = V.daysTo(t.sla) < 0 && ['RESOLVED', 'CLOSED'].indexOf(t.status) < 0;

    var h = PH({
      crumbs: [{ label: 'Incidencias', href: '#incidencias' }, { label: t.number }],
      title: t.subject,
      sub: t.number + ' · ' + E(V.customerName(t.customer_id)) + ' · ' + UI.badge(V.TICKET_STATES, t.status) + ' ' + UI.badge(V.PRIORITIES, t.priority),
      actions: (V.can('ordenes', 'crear') && ['RESOLVED','CLOSED'].indexOf(t.status) < 0 ? '<button class="btn btn-outline btn-sm" id="nwo">' + I('clipboard', 15) + ' Generar orden de retrabajo</button>' : '') +
        (V.can('incidencias', 'editar') ? '<button class="btn btn-primary btn-sm" id="res">' + I('check', 15) + ' Resolver / cerrar</button>' : '')
    });

    if (slaLate) h += '<div class="banner banner-danger mb4">' + I('clock', 16) + '<div><b>SLA vencido.</b> El compromiso de resolución era el ' + V.fdate(t.sla) + '.</div></div>';

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Descripción del problema</h3></div><div class="card-b"><p>' + E(t.description) + '</p></div></div>' +
      (t.rootCause || t.resolution ? '<div class="card"><div class="card-h"><h3>Análisis y resolución</h3></div><div class="card-b col">' +
        (t.rootCause ? '<div><b class="small">Causa raíz</b><p class="mt2">' + E(t.rootCause) + '</p></div>' : '') +
        (t.resolution ? '<div><b class="small">Resolución</b><p class="mt2">' + E(t.resolution) + '</p></div>' : '') +
        (t.reworkCost ? '<div class="spread"><span class="small bold">Costo del retrabajo</span><b class="mono">' + V.money(t.reworkCost) + '</b></div>' : '') +
        '</div></div>' : '') +
      '<div class="card"><div class="card-h"><h3>Comentarios</h3></div><div class="card-b col">' +
        (function () {
          var cs = V.all('comments').filter(function (c) { return c.entity === 'ticket' && c.entity_id === t.id; });
          return cs.length ? cs.map(function (c) {
            return '<div class="file-row" style="align-items:flex-start"><span class="av sm">' + E(V.initials(V.userName(c.user_id))) + '</span>' +
              '<span style="min-width:0"><b class="xs">' + E(V.userName(c.user_id)) + '</b> <span class="xs muted">' + V.frel(c.at) + '</span>' +
              '<p class="small mt2">' + E(c.text) + '</p></span></div>';
          }).join('') : '<p class="small muted">Sin comentarios.</p>';
        })() +
        (V.can('incidencias', 'editar') ? '<div class="field"><textarea class="textarea" id="cm" style="min-height:60px" placeholder="Agregar comentario…"></textarea>' +
          '<button class="btn btn-outline btn-sm mt2" id="cadd">Comentar</button></div>' : '') +
      '</div></div></div>';

    h += '<div class="col"><div class="card"><div class="card-b col" style="gap:10px">' +
      kv('Cliente', '<a href="#clientes/' + t.customer_id + '">' + E(V.customerName(t.customer_id)) + '</a>') +
      kv('Clasificación', E({ garantia: 'Garantía', retrabajo: 'Retrabajo', falla: 'Nueva falla', consulta: 'Consulta' }[t.type] || t.type)) +
      kv('Prioridad', UI.badge(V.PRIORITIES, t.priority)) + kv('SLA', V.fdate(t.sla)) +
      kv('Responsable', E(V.techName(t.assignee) !== '—' ? V.techName(t.assignee) : V.userName(t.assignee))) +
      (t.wo_id ? kv('Orden origen', '<a href="#ordenes/' + t.wo_id + '">' + E((V.byId('workOrders', t.wo_id) || {}).number || '') + '</a>') : '') +
      kv('Creada', V.fdatetime(t.created_at)) +
      '</div></div></div></div>';

    el.innerHTML = h;
    var r = el.querySelector('#res');
    if (r) r.addEventListener('click', function () {
      UI.modal({ title: 'Resolver incidencia', subtitle: t.number,
        body: '<div class="field"><label for="rc">Causa raíz <span class="req">*</span></label><textarea class="textarea" id="rc" style="min-height:70px">' + E(t.rootCause) + '</textarea></div>' +
          '<div class="field mt4"><label for="rs">Resolución aplicada <span class="req">*</span></label><textarea class="textarea" id="rs" style="min-height:70px">' + E(t.resolution) + '</textarea></div>' +
          '<div class="grid g2 mt4"><div class="field"><label for="rw">Costo del retrabajo</label><input class="input" id="rw" type="number" step="0.01" value="' + (t.reworkCost || 0) + '"></div>' +
          '<div class="field"><label for="ns">Estado final</label><select class="select" id="ns"><option value="RESOLVED">Resuelto</option><option value="CLOSED">Cerrado con conformidad del cliente</option></select></div></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>',
        onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
          var rc = m.querySelector('#rc').value.trim(), rs = m.querySelector('#rs').value.trim();
          if (!rc || !rs) { UI.toast('Causa raíz y resolución son obligatorias.', 'err'); return; }
          V.update('tickets', t.id, { rootCause: rc, resolution: rs, reworkCost: +m.querySelector('#rw').value || 0, status: m.querySelector('#ns').value });
          V.logActivity('ticket', t.id, 'Resolvió la incidencia ' + t.number, 'status');
          V.logAudit('UPDATE', 'ticket', t.number, 'Estado → ' + m.querySelector('#ns').value);
          UI.closeTop(); UI.toast('Incidencia actualizada.', 'ok'); APP.reload();
        }); } });
    });
    var nw = el.querySelector('#nwo');
    if (nw) nw.addEventListener('click', function () {
      H.newWO({ customer_id: t.customer_id, site_id: (V.byId('workOrders', t.wo_id) || {}).site_id });
    });
    var ca = el.querySelector('#cadd');
    if (ca) ca.addEventListener('click', function () {
      var txt = el.querySelector('#cm').value.trim();
      if (!txt) { UI.toast('Escribe un comentario.', 'err'); return; }
      V.insert('comments', { entity: 'ticket', entity_id: t.id, user_id: V.getSession().user_id, text: txt, visible: true, at: new Date().toISOString() });
      UI.toast('Comentario agregado.', 'ok'); APP.reload();
    });
  }
})();
