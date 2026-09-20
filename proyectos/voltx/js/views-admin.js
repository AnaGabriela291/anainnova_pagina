/* ============================================================
   VOLTX — Reportes y KPIs (§15), Automatizaciones (§14),
   Usuarios y permisos (§2.2, §13), Configuración (§5, §U),
   Suscripción y plan (§16).
   ============================================================ */
(function () {
  'use strict';
  var I = UI.icon, E = UI.esc, V = VOLTX, PH = APP.pageHeader, views = APP.views;
  var H = APP.helpers, kv = H.kv, opt = H.opt;

  /* ============================================================
     S) REPORTES, KPIs Y ANALÍTICA §15
     ============================================================ */
  views.reportes = function (el) {
    var tab = 'comercial';
    function render() {
      var h = PH({
        title: 'Reportes y analítica',
        sub: 'Comercial, operaciones, inventario, finanzas, clientes y técnicos',
        actions: '<button class="btn btn-outline btn-sm" id="exp">' + I('download', 15) + ' Exportar CSV</button>' +
                 '<button class="btn btn-primary btn-sm" id="prt">' + I('print', 15) + ' Imprimir informe</button>'
      });
      h += '<div class="card"><div class="tabs" id="tabs">' +
        [['comercial', 'Comercial'], ['operaciones', 'Operaciones'], ['inventario', 'Inventario'],
         ['finanzas', 'Finanzas'], ['clientes', 'Clientes'], ['tecnicos', 'Técnicos']]
          .map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
        '</div><div class="card-b" id="tc"></div></div>';
      el.innerHTML = h;
      var tc = el.querySelector('#tc');
      tc.innerHTML = { comercial: comercial, operaciones: operaciones, inventario: inventario,
                       finanzas: finanzas, clientes: clientes, tecnicos: tecnicos }[tab]();

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; render(); });
      });
      el.querySelector('#exp').addEventListener('click', function () { exportTab(tab); });
      el.querySelector('#prt').addEventListener('click', function () {
        UI.printDoc('Reporte ' + tab, '<div class="doc"><h1>' + E(V.myTenant().name) + '</h1>' +
          '<p style="color:#6B7280">Reporte de ' + tab + ' · ' + V.fdate(new Date(), true) + '</p><hr style="margin:16px 0">' +
          tc.innerHTML.replace(/<button[\s\S]*?<\/button>/g, '') + '</div>');
      });
    }

    function metric(label, value, sub, tone) {
      return '<div class="kpi"><span class="kpi-label">' + E(label) + '</span>' +
        '<div class="kpi-val">' + value + '</div>' + (sub ? '<div class="kpi-sub ' + (tone || '') + '">' + sub + '</div>' : '') + '</div>';
    }
    function tableOf(head, rows) {
      if (!rows.length) return UI.emptyState({ icon: 'chart', title: 'Sin datos', text: 'Todavía no hay información suficiente para este reporte.' });
      return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        head.map(function (x, i) { return '<th' + (i ? ' class="right"' : '') + '>' + E(x) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.map(function (r) {
          return '<tr>' + r.map(function (c, i) { return '<td' + (i ? ' class="right"' : '') + '>' + c + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    function monthSeries(fn) {
      var out = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date(); d.setMonth(d.getMonth() - i);
        out.push({ label: V.MONTHS[d.getMonth()], value: fn(d) });
      }
      return out;
    }

    /* §15.1 comercial */
    function comercial() {
      var reqs = V.all('requests'), qs = V.all('quotes');
      var aprob = qs.filter(function (q) { return q.status === 'APPROVED'; });
      var rech = qs.filter(function (q) { return ['REJECTED', 'EXPIRED'].indexOf(q.status) >= 0; });
      var env = qs.filter(function (q) { return ['SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED'].indexOf(q.status) >= 0; });
      var pipeline = qs.filter(function (q) { return ['SENT', 'VIEWED', 'REVIEW'].indexOf(q.status) >= 0; })
        .reduce(function (a, q) { return a + V.quoteTotals(q).total; }, 0);
      var fuentes = H.uniq(reqs.map(function (r) { return r.channel; }));
      var perdidas = reqs.filter(function (r) { return r.status === 'LOST'; });

      return '<div class="grid g4">' +
          metric('Solicitudes recibidas', reqs.length, 'En el período') +
          metric('Presupuestos enviados', env.length, aprob.length + ' aprobados · ' + rech.length + ' perdidos') +
          metric('Tasa de conversión', Math.round((aprob.length / Math.max(1, env.length)) * 100) + '%', 'Enviado → aprobado', 'up') +
          metric('Valor del pipeline', V.money(pipeline), 'Presupuestos vivos') +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Leads por fuente</h4>' +
          tableOf(['Canal', 'Solicitudes', 'Ganadas', 'Conversión'], fuentes.map(function (f) {
            var list = reqs.filter(function (r) { return r.channel === f; });
            var won = list.filter(function (r) { return r.status === 'WON'; }).length;
            return ['<b>' + E(f) + '</b>', list.length, won, Math.round((won / Math.max(1, list.length)) * 100) + '%'];
          })) + '</div>' +
          '<div><h4 class="mb2">Estado de los presupuestos</h4>' +
          tableOf(['Estado', 'Cantidad', 'Monto'], Object.keys(V.QUOTE_STATES).map(function (k) {
            var list = qs.filter(function (q) { return q.status === k; });
            if (!list.length) return null;
            return [UI.badge(V.QUOTE_STATES, k), list.length, V.money(list.reduce(function (a, q) { return a + V.quoteTotals(q).total; }, 0))];
          }).filter(Boolean)) + '</div>' +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Presupuestos emitidos por mes</h4>' +
          UI.bars(monthSeries(function (d) { return qs.filter(function (q) { return new Date(q.created_at).getMonth() === d.getMonth(); }).length; })) + '</div>' +
          '<div><h4 class="mb2">Motivos de pérdida</h4>' +
          tableOf(['Motivo', 'Casos'], H.uniq(perdidas.map(function (p) { return p.lostReason || 'Sin especificar'; })).map(function (m) {
            return ['<b>' + E(m) + '</b>', perdidas.filter(function (p) { return (p.lostReason || 'Sin especificar') === m; }).length];
          })) +
          '<p class="xs muted mt4">Tiempo promedio de aprobación: <b>' +
            (function () {
              var d = aprob.map(function (q) { return Math.max(1, Math.round((new Date(q.updated_at || q.created_at) - new Date(q.created_at)) / 86400000)); });
              return d.length ? (d.reduce(function (a, x) { return a + x; }, 0) / d.length).toFixed(1) : '—';
            })() + ' días</b></p></div>' +
        '</div>';
    }

    /* §15.2 operaciones */
    function operaciones() {
      var wos = V.all('workOrders');
      var cerradas = wos.filter(function (w) { return w.status === 'CLOSED'; });
      var atrasadas = V.overdueWOs();
      var tiempos = cerradas.map(function (w) { return (w.timeEntries || []).reduce(function (a, t) { return a + (t.min || 0); }, 0); }).filter(Boolean);
      var promTrabajo = tiempos.length ? tiempos.reduce(function (a, x) { return a + x; }, 0) / tiempos.length : 0;
      var viajes = wos.reduce(function (a, w) { return a.concat((w.timeEntries || []).filter(function (t) { return t.type === 'viaje' && t.min; }).map(function (t) { return t.min; })); }, []);
      var retrab = V.all('tickets').filter(function (t) { return ['retrabajo', 'garantia'].indexOf(t.type) >= 0; });

      return '<div class="grid g4">' +
          metric('Órdenes totales', wos.length, cerradas.length + ' cerradas') +
          metric('Cumplimiento de agenda', Math.round(((wos.length - atrasadas.length) / Math.max(1, wos.length)) * 100) + '%', atrasadas.length + ' atrasadas', atrasadas.length ? 'down' : 'up') +
          metric('Tiempo promedio de trabajo', (promTrabajo / 60).toFixed(1) + ' h', 'Sobre órdenes cerradas') +
          metric('Tiempo promedio de viaje', viajes.length ? Math.round(viajes.reduce(function (a, x) { return a + x; }, 0) / viajes.length) + ' min' : '—', 'Por orden') +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Órdenes por estado</h4>' +
          '<div class="row gap4" style="align-items:center">' +
          UI.donut(Object.keys(V.WO_STATES).map(function (k) {
            var col = { DRAFT: '#9CA3AF', SCHEDULED: '#2563EB', ASSIGNED: '#3B82F6', EN_ROUTE: '#F97316', ON_SITE: '#EA580C',
                        IN_PROGRESS: '#E85D04', PAUSED: '#F59E0B', COMPLETED: '#22C55E', REVIEW: '#FBBF24',
                        CLOSED: '#16A34A', CANCELLED: '#DC2626' }[k];
            return { value: wos.filter(function (w) { return w.status === k; }).length, color: col };
          }).filter(function (s) { return s.value; }), 160, 'órdenes') +
          '<div class="legend">' + Object.keys(V.WO_STATES).map(function (k) {
            var n = wos.filter(function (w) { return w.status === k; }).length;
            if (!n) return '';
            var col = { DRAFT: '#9CA3AF', SCHEDULED: '#2563EB', ASSIGNED: '#3B82F6', EN_ROUTE: '#F97316', ON_SITE: '#EA580C',
                        IN_PROGRESS: '#E85D04', PAUSED: '#F59E0B', COMPLETED: '#22C55E', REVIEW: '#FBBF24',
                        CLOSED: '#16A34A', CANCELLED: '#DC2626' }[k];
            return '<span class="li"><i class="sw" style="background:' + col + '"></i>' + E(V.WO_STATES[k].label) + ' <b>' + n + '</b></span>';
          }).join('') + '</div></div></div>' +
          '<div><h4 class="mb2">Órdenes por tipo de trabajo</h4>' +
          tableOf(['Tipo', 'Órdenes', 'Cerradas', 'Horas'], Object.keys(V.WO_TYPES).map(function (k) {
            var list = wos.filter(function (w) { return w.type === k; });
            var hrs = list.reduce(function (a, w) { return a + (w.timeEntries || []).reduce(function (x, t) { return x + (t.min || 0); }, 0); }, 0) / 60;
            return ['<b>' + E(V.WO_TYPES[k]) + '</b>', list.length, list.filter(function (w) { return w.status === 'CLOSED'; }).length, hrs.toFixed(1)];
          })) + '</div>' +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Órdenes completadas por técnico</h4>' +
          tableOf(['Técnico', 'Completadas', 'Retrabajos', 'Utilización'], V.all('technicians').map(function (t) {
            var list = wos.filter(function (w) { return (w.technicians || []).indexOf(t.id) >= 0; });
            var min = list.reduce(function (a, w) { return a + (w.timeEntries || []).reduce(function (x, e) { return x + (e.min || 0); }, 0); }, 0);
            return ['<b>' + E(t.name) + '</b>', list.filter(function (w) { return ['CLOSED', 'COMPLETED'].indexOf(w.status) >= 0; }).length,
                    t.kpi.retrabajos, Math.min(100, Math.round((min / 60) / 8 / Math.max(1, 5) * 100)) + '%'];
          })) + '</div>' +
          '<div><h4 class="mb2">Backlog y retrabajos</h4>' +
          tableOf(['Indicador', 'Valor'], [
            ['Órdenes en backlog (sin asignar)', wos.filter(function (w) { return !(w.technicians || []).length && ['CLOSED', 'CANCELLED'].indexOf(w.status) < 0; }).length],
            ['Órdenes vencidas', atrasadas.length],
            ['Incidencias por garantía', retrab.filter(function (t) { return t.type === 'garantia'; }).length],
            ['Retrabajos registrados', retrab.filter(function (t) { return t.type === 'retrabajo'; }).length],
            ['Costo total de retrabajos', V.money(V.all('tickets').reduce(function (a, t) { return a + (t.reworkCost || 0); }, 0))]
          ]) + '</div>' +
        '</div>';
    }

    /* §15.3 inventario */
    function inventario() {
      var prods = V.all('products');
      var valor = prods.reduce(function (a, p) { return a + V.stockOf(p) * p.cost; }, 0);
      var consumo = V.all('stockMovements').filter(function (m) { return m.type === 'consumo'; });
      var ajustes = V.all('stockMovements').filter(function (m) { return m.type === 'ajuste'; });

      return '<div class="grid g4">' +
          metric('Valor del inventario', V.money(valor), prods.length + ' SKU') +
          metric('Materiales bajo mínimo', V.lowStock().length, 'Requieren reposición', V.lowStock().length ? 'down' : 'up') +
          metric('Consumo registrado', consumo.reduce(function (a, m) { return a + Math.abs(m.qty); }, 0), 'Unidades en órdenes') +
          metric('Diferencias por ajuste', ajustes.reduce(function (a, m) { return a + Math.abs(m.qty); }, 0), ajustes.length + ' ajuste(s)', ajustes.length ? 'down' : '') +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Valor por categoría</h4>' +
          tableOf(['Categoría', 'SKU', 'Unidades', 'Valor'], H.uniq(prods.map(function (p) { return p.category; })).map(function (c) {
            var list = prods.filter(function (p) { return p.category === c; });
            return ['<b>' + E(c) + '</b>', list.length, list.reduce(function (a, p) { return a + V.stockOf(p); }, 0),
                    V.money(list.reduce(function (a, p) { return a + V.stockOf(p) * p.cost; }, 0))];
          })) + '</div>' +
          '<div><h4 class="mb2">Stock crítico</h4>' +
          tableOf(['Material', 'Disponible', 'Mínimo', 'Reposición'], V.lowStock().map(function (p) {
            return ['<b>' + E(p.name) + '</b>', '<span class="prio-critica mono">' + V.stockOf(p) + '</span>', p.min, (p.max - V.stockOf(p)) + ' ' + E(p.unit)];
          })) + '</div>' +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Consumo por orden de trabajo</h4>' +
          tableOf(['Referencia', 'Movimientos', 'Unidades'], H.uniq(consumo.map(function (m) { return m.ref; })).map(function (r) {
            var list = consumo.filter(function (m) { return m.ref === r; });
            return ['<b>' + E(r) + '</b>', list.length, list.reduce(function (a, m) { return a + Math.abs(m.qty); }, 0)];
          })) + '</div>' +
          '<div><h4 class="mb2">Existencias por almacén</h4>' +
          tableOf(['Almacén', 'SKU', 'Valor'], V.all('warehouses').map(function (wh) {
            var list = prods.filter(function (p) { return (p.stock[wh.id] || 0) > 0; });
            return ['<b>' + E(wh.name) + '</b>', list.length, V.money(list.reduce(function (a, p) { return a + p.stock[wh.id] * p.cost; }, 0))];
          })) + '</div>' +
        '</div>';
    }

    /* §15.4 finanzas */
    function finanzas() {
      var invs = V.all('invoices').filter(function (i) { return i.status !== 'VOID'; });
      var ingresos = invs.reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0);
      var cobrado = V.all('payments').reduce(function (a, p) { return a + p.amount; }, 0);
      var porCobrar = invs.reduce(function (a, i) { return a + Math.max(0, V.invoiceTotals(i).balance); }, 0);
      var gastos = V.all('expenses').reduce(function (a, e) { return a + e.amount; }, 0);
      var mo = V.all('workOrders').reduce(function (a, w) {
        var min = (w.timeEntries || []).reduce(function (x, t) { return x + (t.min || 0); }, 0);
        var tec = V.byId('technicians', (w.technicians || [])[0]);
        return a + (min / 60) * ((tec && tec.rate) || 12);
      }, 0);
      var margen = ingresos > 0 ? ((ingresos - gastos - mo) / ingresos) * 100 : 0;

      return '<div class="grid g4">' +
          metric('Ingresos facturados', V.money(ingresos), invs.length + ' facturas') +
          metric('Cobrado', V.money(cobrado), Math.round((cobrado / Math.max(1, ingresos)) * 100) + '% del total', 'up') +
          metric('Por cobrar', V.money(porCobrar), V.overdueInvoices().length + ' vencidas', porCobrar ? 'down' : '') +
          metric('Margen bruto', margen.toFixed(1) + '%', 'Ingresos − materiales − M.O.', margen >= 25 ? 'up' : 'down') +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Cobros por mes</h4>' +
          UI.bars(monthSeries(function (d) {
            return V.all('payments').filter(function (p) { return new Date(p.date).getMonth() === d.getMonth(); })
              .reduce(function (a, p) { return a + p.amount; }, 0);
          }), V.money) + '</div>' +
          '<div><h4 class="mb2">Estructura de costos</h4>' +
          tableOf(['Concepto', 'Monto', '% de ingresos'], [
            ['<b>Ingresos</b>', V.money(ingresos), '100%'],
            ['Materiales y gastos', '-' + V.money(gastos), (gastos / Math.max(1, ingresos) * 100).toFixed(1) + '%'],
            ['Mano de obra', '-' + V.money(mo), (mo / Math.max(1, ingresos) * 100).toFixed(1) + '%'],
            ['<b>Margen</b>', '<b>' + V.money(ingresos - gastos - mo) + '</b>', '<b>' + margen.toFixed(1) + '%</b>']
          ]) +
          '<p class="xs muted mt2">Ticket promedio por factura: <b>' + V.money(ingresos / Math.max(1, invs.length)) + '</b></p></div>' +
        '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Margen por proyecto</h4>' +
          tableOf(['Proyecto', 'Presupuesto', 'Costo', 'Margen'], V.all('projects').map(function (p) {
            var f = V.projectFinance(p);
            return ['<b>' + E(p.code) + '</b><div class="xs muted">' + E(p.name) + '</div>', V.money(p.budget), V.money(f.cost),
              '<span class="badge ' + (f.margin >= 25 ? 'b-green' : f.margin >= 10 ? 'b-amber' : 'b-red') + '">' + f.margin.toFixed(0) + '%</span>'];
          })) + '</div>' +
          '<div><h4 class="mb2">Margen por tipo de servicio</h4>' +
          tableOf(['Servicio', 'Precio', 'Costo', 'Margen'], V.all('services').map(function (s) {
            var m = ((s.price - s.cost) / s.price) * 100;
            return ['<b>' + E(s.name) + '</b>', V.money(s.price), V.money(s.cost),
              '<span class="badge ' + (m >= 40 ? 'b-green' : m >= 25 ? 'b-amber' : 'b-red') + '">' + m.toFixed(0) + '%</span>'];
          })) + '</div>' +
        '</div>';
    }

    /* §15.5 clientes */
    function clientes() {
      var cus = V.all('customers');
      var nuevos = cus.filter(function (c) { return V.daysTo(c.created_at) > -90; });
      var recurrentes = cus.filter(function (c) {
        return V.all('workOrders').filter(function (w) { return w.customer_id === c.id && w.status === 'CLOSED'; }).length > 1;
      });
      return '<div class="grid g4">' +
          metric('Clientes activos', cus.length, nuevos.length + ' nuevos (90 días)') +
          metric('Clientes recurrentes', recurrentes.length, Math.round((recurrentes.length / Math.max(1, cus.length)) * 100) + '% de la base') +
          metric('Incidencias abiertas', V.all('tickets').filter(function (t) { return ['OPEN', 'IN_PROGRESS', 'WAITING'].indexOf(t.status) >= 0; }).length, 'En atención') +
          metric('Mantenimientos próximos', V.upcomingMaintenance().length, 'Dentro de la ventana de alerta') +
        '</div>' +
        '<div class="mt6"><h4 class="mb2">Ranking de clientes</h4>' +
        tableOf(['Cliente', 'Tipo', 'Órdenes', 'Facturado', 'Saldo', 'Incidencias'],
          cus.map(function (c) {
            var wos = V.all('workOrders').filter(function (w) { return w.customer_id === c.id; });
            var fact = V.all('invoices').filter(function (i) { return i.customer_id === c.id && i.status !== 'VOID'; });
            var total = fact.reduce(function (a, i) { return a + V.invoiceTotals(i).total; }, 0);
            var bal = fact.reduce(function (a, i) { return a + Math.max(0, V.invoiceTotals(i).balance); }, 0);
            return { sort: total, row: ['<a href="#clientes/' + c.id + '"><b>' + E(c.name) + '</b></a>',
              '<span class="chip">' + E(c.type) + '</span>', wos.length, V.money(total),
              bal > 0.01 ? '<span class="mono" style="color:var(--danger)">' + V.money(bal) + '</span>' : '—',
              V.all('tickets').filter(function (t) { return t.customer_id === c.id; }).length] };
          }).sort(function (a, b) { return b.sort - a.sort; }).map(function (x) { return x.row; })) + '</div>' +
        '<div class="grid g2 mt6">' +
          '<div><h4 class="mb2">Distribución por segmento</h4>' +
          tableOf(['Segmento', 'Clientes', 'Facturado'], H.uniq(cus.map(function (c) { return c.type; })).map(function (t) {
            var list = cus.filter(function (c) { return c.type === t; });
            var total = list.reduce(function (a, c) {
              return a + V.all('invoices').filter(function (i) { return i.customer_id === c.id && i.status !== 'VOID'; })
                .reduce(function (x, i) { return x + V.invoiceTotals(i).total; }, 0);
            }, 0);
            return ['<b>' + E(t) + '</b>', list.length, V.money(total)];
          })) + '</div>' +
          '<div><h4 class="mb2">Origen de la cartera</h4>' +
          tableOf(['Origen', 'Clientes'], H.uniq(cus.map(function (c) { return c.source; })).map(function (s) {
            return ['<b>' + E(s) + '</b>', cus.filter(function (c) { return c.source === s; }).length];
          })) + '</div>' +
        '</div>';
    }

    /* técnicos */
    function tecnicos() {
      var tecs = V.all('technicians');
      return '<div class="grid g4">' +
          metric('Técnicos activos', tecs.filter(function (t) { return t.active; }).length, tecs.filter(function (t) { return t.type === 'contratista'; }).length + ' contratistas') +
          metric('Puntualidad promedio', Math.round(tecs.reduce(function (a, t) { return a + t.kpi.puntualidad; }, 0) / Math.max(1, tecs.length)) + '%', 'Sobre citas cumplidas') +
          metric('Horas registradas', tecs.reduce(function (a, t) { return a + t.kpi.horas; }, 0), 'Acumuladas') +
          metric('Certificaciones por vencer', V.expiringCerts().length, 'Dentro de 30 días', V.expiringCerts().length ? 'down' : 'up') +
        '</div>' +
        '<div class="mt6"><h4 class="mb2">Productividad por técnico</h4>' +
        tableOf(['Técnico', 'Nivel', 'Completadas', 'Puntualidad', 'Retrabajos', 'Valoración', 'Costo/h'],
          tecs.map(function (t) {
            return ['<a href="#tecnicos/' + t.id + '"><b>' + E(t.name) + '</b></a>', E(t.level), t.kpi.completadas,
              '<span class="badge ' + (t.kpi.puntualidad >= 90 ? 'b-green' : 'b-amber') + '">' + t.kpi.puntualidad + '%</span>',
              t.kpi.retrabajos, t.kpi.rating + ' / 5', V.money(t.rate)];
          })) + '</div>' +
        '<div class="mt6"><h4 class="mb2">Certificaciones</h4>' +
        tableOf(['Técnico', 'Certificación', 'Vence', 'Estado'],
          tecs.reduce(function (acc, t) {
            return acc.concat((t.certifications || []).map(function (c) {
              var d = V.daysTo(c.expires);
              return ['<b>' + E(t.name) + '</b>', E(c.name), V.fdate(c.expires),
                d < 0 ? '<span class="badge b-red">Vencida</span>' : d <= 30 ? '<span class="badge b-amber">' + d + ' días</span>' : '<span class="badge b-green">Vigente</span>'];
            }));
          }, [])) + '</div>';
    }

    function exportTab(t) {
      var rows = [], cols = [{ label: 'Concepto', key: 'k' }, { label: 'Valor', key: 'v' }];
      if (t === 'comercial') {
        rows = V.all('quotes').map(function (q) { return { k: q.number, v: V.money(V.quoteTotals(q).total) + ' · ' + V.QUOTE_STATES[q.status].label }; });
      } else if (t === 'operaciones') {
        rows = V.all('workOrders').map(function (w) { return { k: w.number, v: w.title + ' · ' + V.WO_STATES[w.status].label }; });
      } else if (t === 'inventario') {
        rows = V.all('products').map(function (p) { return { k: p.sku + ' ' + p.name, v: V.stockOf(p) + ' ' + p.unit }; });
      } else if (t === 'finanzas') {
        rows = V.all('invoices').map(function (i) { return { k: i.number, v: V.money(V.invoiceTotals(i).total) + ' · saldo ' + V.money(V.invoiceTotals(i).balance) }; });
      } else if (t === 'clientes') {
        rows = V.all('customers').map(function (c) { return { k: c.name, v: c.type + ' · ' + c.phone }; });
      } else {
        rows = V.all('technicians').map(function (x) { return { k: x.name, v: x.kpi.completadas + ' órdenes · ' + x.kpi.puntualidad + '%' }; });
      }
      V.download('voltx-reporte-' + t + '.csv', V.toCSV(rows, cols));
      UI.toast('Reporte exportado.', 'ok');
    }
    render();
  };

  /* ============================================================
     AUTOMATIZACIONES §14
     ============================================================ */
  views.automatizaciones = function (el) {
    function render() {
      var auts = V.all('automations');
      var h = PH({
        title: 'Automatizaciones',
        sub: 'WHEN evento + IF condiciones + THEN acciones · notificaciones in-app, correo y canales externos',
        actions: V.can('automatizaciones', 'crear') ? '<button class="btn btn-primary btn-sm" id="new">' + I('plus', 15) + ' Nueva automatización</button>' : ''
      });
      h += '<div class="grid g4">' +
        UI.kpi({ label: 'Automatizaciones activas', value: auts.filter(function (a) { return a.active; }).length + ' / ' + auts.length, icon: 'workflow' }) +
        UI.kpi({ label: 'Ejecuciones acumuladas', value: auts.reduce(function (a, x) { return a + x.runs; }, 0), icon: 'refresh' }) +
        UI.kpi({ label: 'Notificaciones enviadas', value: V.all('notifications').length, icon: 'bell' }) +
        UI.kpi({ label: 'Canales', value: 'In-app · Email · WhatsApp', icon: 'send' }) +
        '</div>';

      h += '<div class="col mt4">' + auts.map(function (a) {
        return '<div class="card"><div class="card-b">' +
          '<div class="spread"><div class="row gap2"><span class="kpi-ico">' + I('workflow', 16) + '</span>' +
          '<div><b>' + E(a.name) + '</b><div class="xs muted">' + a.runs + ' ejecuciones</div></div></div>' +
          '<label class="switch"><input type="checkbox" data-a="' + a.id + '"' + (a.active ? ' checked' : '') +
          (V.can('automatizaciones', 'editar') ? '' : ' disabled') + '><span></span></label></div>' +
          '<div class="grid g3 mt4">' +
          '<div><div class="xs bold" style="color:var(--info)">CUANDO</div><div class="small mt2">' + E(a.when) + '</div></div>' +
          '<div><div class="xs bold" style="color:var(--warning)">SI</div><div class="small mt2">' + E(a.condition) + '</div></div>' +
          '<div><div class="xs bold" style="color:var(--primary-600)">ENTONCES</div><div class="col mt2" style="gap:3px">' +
            a.then.map(function (t) { return '<span class="row gap1 small">' + I('check', 12) + E(t) + '</span>'; }).join('') + '</div></div>' +
          '</div></div></div>';
      }).join('') + '</div>';

      /* eventos automáticos de referencia §14.2 */
      h += '<div class="card mt6"><div class="card-h"><h3>Eventos disponibles del sistema</h3></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Evento</th><th>Automatización sugerida</th></tr></thead><tbody>' +
        [['Presupuesto enviado', 'Correo al cliente + recordatorio si no responde'],
         ['Presupuesto por vencer', 'Aviso a ventas y al cliente'],
         ['Orden programada para mañana', 'Recordatorio a cliente y técnico'],
         ['Técnico asignado', 'Notificación al técnico'],
         ['Orden completada', 'Enviar informe y solicitar validación'],
         ['Factura por vencer / vencida', 'Recordatorio previo y posterior'],
         ['Stock bajo el mínimo', 'Alerta a compras y almacén'],
         ['Certificación por vencer', 'Aviso al admin y al técnico'],
         ['Mantenimiento próximo', 'Crear o recordar la orden preventiva']]
        .map(function (r) { return '<tr><td><b>' + E(r[0]) + '</b></td><td class="small muted">' + E(r[1]) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';

      /* centro de notificaciones */
      h += '<div class="card mt6"><div class="card-h"><h3>Centro de notificaciones</h3>' +
        '<a href="#configuracion/notificaciones" class="small">Preferencias</a></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Notificación</th><th>Destinatario</th><th>Canal</th><th class="right">Enviada</th></tr></thead><tbody>' +
        V.all('notifications').map(function (n) {
          return '<tr><td><b>' + E(n.title) + '</b><div class="xs muted">' + E(n.body) + '</div></td>' +
            '<td class="small">' + E(V.userName(n.user_id)) + '</td>' +
            '<td><span class="chip">In-app + email</span></td>' +
            '<td class="right small muted">' + V.frel(n.at) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      el.innerHTML = h;
      el.querySelectorAll('[data-a]').forEach(function (sw) {
        sw.addEventListener('change', function () {
          V.update('automations', this.dataset.a, { active: this.checked });
          V.logAudit('UPDATE', 'automation', this.dataset.a, this.checked ? 'Activada' : 'Desactivada');
          UI.toast('Automatización ' + (this.checked ? 'activada' : 'desactivada') + '.', 'ok');
        });
      });
      var nb = el.querySelector('#new');
      if (nb) nb.addEventListener('click', function () {
        UI.modal({ title: 'Nueva automatización', size: 'wide',
          body: '<div class="field"><label for="nm">Nombre <span class="req">*</span></label><input class="input" id="nm"></div>' +
            '<div class="field mt4"><label for="wh">CUANDO ocurra el evento</label><select class="select" id="wh">' +
              ['Presupuesto enviado','Presupuesto por vencer','Orden programada para mañana','Técnico asignado',
               'Orden completada','Factura vence','Stock bajo mínimo','Certificación por vencer','Mantenimiento próximo']
              .map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
            '<div class="field mt4"><label for="cn">SI se cumple la condición</label><input class="input" id="cn" placeholder="Ej.: saldo > 0 y 3 días de vencida"></div>' +
            '<div class="field mt4"><label>ENTONCES ejecutar</label><div class="col" style="gap:4px">' +
              ['Enviar email al cliente','Notificar al usuario responsable','Notificar al técnico','Crear tarea interna',
               'Generar PDF','Marcar alerta en el dashboard','Crear orden de trabajo','Sugerir orden de compra']
              .map(function (x) { return '<label class="check"><input type="checkbox" data-th value="' + E(x) + '"><span>' + E(x) + '</span></label>'; }).join('') +
            '</div></div>',
          footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear</button>',
          onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
            var n = m.querySelector('#nm').value.trim();
            var th = Array.prototype.slice.call(m.querySelectorAll('[data-th]:checked')).map(function (x) { return x.value; });
            if (!n || !th.length) { UI.toast('Indica el nombre y al menos una acción.', 'err'); return; }
            V.insert('automations', { name: n, when: m.querySelector('#wh').value,
              condition: m.querySelector('#cn').value.trim() || 'Siempre', then: th, active: true, runs: 0 });
            V.logAudit('CREATE', 'automation', n, th.join(', '));
            UI.closeTop(); UI.toast('Automatización creada.', 'ok'); render();
          }); } });
      });
    }
    render();
  };

  /* ============================================================
     T) USUARIOS Y PERMISOS §2.2, §13
     ============================================================ */
  views.usuarios = function (el) {
    var tab = 'usuarios';
    function render() {
      var h = PH({
        title: 'Usuarios y permisos',
        sub: 'RBAC configurable por módulo y acción · principio de mínimo privilegio',
        actions: V.can('usuarios', 'crear') ? '<button class="btn btn-primary btn-sm" id="inv">' + I('mail', 15) + ' Invitar usuario</button>' : ''
      });
      h += '<div class="card"><div class="tabs" id="tabs">' +
        [['usuarios', 'Usuarios'], ['roles', 'Roles y permisos'], ['auditoria', 'Audit log'], ['seguridad', 'Seguridad']]
          .map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
        '</div><div id="tc"></div></div>';
      el.innerHTML = h;
      var tc = el.querySelector('#tc');

      if (tab === 'usuarios') {
        UI.table(tc, {
          rows: function () { return V.all('users'); },
          search: function (u) { return u.name + ' ' + u.email + ' ' + V.ROLES[u.role].label; },
          placeholder: 'Buscar usuario…', exportName: 'voltx-usuarios',
          filters: [{ key: 'rl', label: 'Todos los roles', options: Object.keys(V.ROLES).map(function (k) { return { value: k, label: V.ROLES[k].label }; }), match: function (r, v) { return r.role === v; } }],
          cols: [
            { key: 'name', label: 'Usuario', render: function (u) {
                return '<div class="row gap2">' + UI.avatar(u.name, u.role === 'owner' ? 'dark' : '') +
                  '<div><div class="bold">' + E(u.name) + '</div><div class="xs muted">' + E(u.email) + '</div></div></div>'; } },
            { key: 'role', label: 'Rol', render: function (u) { return '<span class="badge ' + (u.role === 'owner' ? 'b-black' : 'b-orange') + '">' + E(V.ROLES[u.role].label) + '</span>'; } },
            { key: 'branch_id', label: 'Sucursal', render: function (u) { return '<span class="small">' + E((V.byId('branches', u.branch_id) || {}).name || '—') + '</span>'; } },
            { key: 'mods', label: 'Módulos', right: true, sortVal: function (u) { return Object.keys(V.ROLES[u.role].perms).length; },
              render: function (u) { var n = Object.keys(V.ROLES[u.role].perms).length; return n ? n : '<span class="muted">Portal</span>'; } },
            { key: 'twoFA', label: '2FA', render: function (u) { return u.twoFA ? '<span class="badge b-green">Activo</span>' : '<span class="badge b-gray">Inactivo</span>'; } },
            { key: 'lastLogin', label: 'Último acceso', render: function (u) { return '<span class="small">' + V.frel(u.lastLogin) + '</span>'; } },
            { key: 'active', label: 'Estado', right: true, render: function (u) { return u.active ? '<span class="badge b-green">Activo</span>' : '<span class="badge b-red">Suspendido</span>'; } }
          ],
          onRow: function (rid) { userDetail(V.byId('users', rid)); }
        });
      }

      if (tab === 'roles') {
        tc.innerHTML = '<div class="card-b">' +
          '<div class="banner banner-info mb4">' + I('shield', 15) +
          '<div>Matriz de permisos por rol. Las acciones disponibles son: ver, crear, editar, eliminar, aprobar, asignar, exportar y administrar. El rol <b>Cliente</b> accede únicamente al portal de autoservicio.</div></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="min-width:180px">Módulo</th>' +
          Object.keys(V.ROLES).filter(function (k) { return k !== 'cliente'; }).map(function (k) {
            return '<th class="center" style="text-align:center">' + E(V.ROLES[k].label.split(' /')[0]) + '</th>';
          }).join('') + '</tr></thead><tbody>' +
          V.MODULES.map(function (m) {
            return '<tr><td class="bold">' + E(m) + '</td>' +
              Object.keys(V.ROLES).filter(function (k) { return k !== 'cliente'; }).map(function (k) {
                var p = V.ROLES[k].perms[m];
                if (!p) return '<td style="text-align:center"><span class="muted">—</span></td>';
                var full = p.length >= 8;
                return '<td style="text-align:center" title="' + E(p.join(', ')) + '">' +
                  '<span class="badge ' + (full ? 'b-green' : 'b-orange') + ' no-dot">' + (full ? 'total' : p.length + ' acc.') + '</span></td>';
              }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="grid g3 mt6">' + Object.keys(V.ROLES).map(function (k) {
            var r = V.ROLES[k];
            return '<div class="card"><div class="card-b tight"><b class="small">' + E(r.label) + '</b>' +
              '<p class="xs muted mt2">' + E(r.desc) + '</p>' +
              '<div class="mt2 xs"><b>' + (Object.keys(r.perms).length || 'Portal del cliente') + '</b>' +
              (Object.keys(r.perms).length ? ' módulos habilitados' : '') + '</div></div></div>';
          }).join('') + '</div>' +
          (V.can('usuarios', 'administrar') ? '<button class="btn btn-outline btn-sm mt6" id="newrole">' + I('plus', 14) + ' Crear rol personalizado</button>' : '') +
          '</div>';
        var nr = tc.querySelector('#newrole');
        if (nr) nr.addEventListener('click', function () {
          UI.modal({ title: 'Crear rol personalizado', size: 'wide',
            body: '<div class="field"><label for="rn">Nombre del rol</label><input class="input" id="rn" placeholder="Ej.: Supervisor de campo"></div>' +
              '<div class="field mt4"><label>Permisos por módulo</label><div class="tbl-wrap" style="max-height:340px;overflow:auto">' +
              '<table class="tbl"><thead><tr><th>Módulo</th>' + V.ACTIONS.map(function (a) { return '<th style="text-align:center">' + E(a) + '</th>'; }).join('') + '</tr></thead><tbody>' +
              V.MODULES.map(function (m) {
                return '<tr><td class="small bold">' + E(m) + '</td>' + V.ACTIONS.map(function (a) {
                  return '<td style="text-align:center"><input type="checkbox" data-p="' + m + ':' + a + '" style="accent-color:var(--primary-600)"></td>';
                }).join('') + '</tr>';
              }).join('') + '</tbody></table></div></div>',
            footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear rol</button>',
            onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
              var n = m.querySelector('#rn').value.trim();
              if (!n) { UI.toast('Indica el nombre del rol.', 'err'); return; }
              var perms = {};
              m.querySelectorAll('[data-p]:checked').forEach(function (x) {
                var parts = x.dataset.p.split(':');
                perms[parts[0]] = (perms[parts[0]] || []).concat([parts[1]]);
              });
              var key = n.toLowerCase().replace(/\s+/g, '_');
              V.ROLES[key] = { label: n, desc: 'Rol personalizado de la empresa', perms: perms, home: 'app.html' };
              V.logAudit('CREATE', 'roles', key, n + ' · ' + Object.keys(perms).length + ' módulos');
              UI.closeTop(); UI.toast('Rol creado. Queda disponible al invitar usuarios en esta sesión.', 'ok'); render();
            }); } });
        });
      }

      if (tab === 'auditoria') {
        UI.table(tc, {
          rows: function () { return V.all('audit'); },
          search: function (a) { return a.action + ' ' + a.entity + ' ' + a.detail + ' ' + V.userName(a.user_id); },
          placeholder: 'Buscar en el audit log…', exportName: 'voltx-auditoria', sort: 'at', dir: 'desc',
          filters: [{ key: 'ac', label: 'Todas las acciones',
            options: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map(function (x) { return { value: x, label: x }; }),
            match: function (r, v) { return r.action === v; } }],
          cols: [
            { key: 'at', label: 'Fecha', render: function (a) { return '<div class="small">' + V.fdate(a.at) + '</div><div class="xs muted mono">' + V.hm(a.at) + '</div>'; } },
            { key: 'user_id', label: 'Usuario', render: function (a) { return '<div class="row gap2">' + UI.avatar(V.userName(a.user_id), 'sm') + '<span class="small">' + E(V.userName(a.user_id)) + '</span></div>'; } },
            { key: 'action', label: 'Acción', render: function (a) {
                var cls = { CREATE: 'b-green', UPDATE: 'b-blue', DELETE: 'b-red', LOGIN: 'b-gray' }[a.action] || 'b-gray';
                return '<span class="badge ' + cls + '">' + E(a.action) + '</span>'; } },
            { key: 'entity', label: 'Entidad', render: function (a) { return '<span class="mono small">' + E(a.entity) + '</span><div class="xs muted">' + E(a.entity_id) + '</div>'; } },
            { key: 'detail', label: 'Detalle', render: function (a) { return '<span class="small">' + E(a.detail) + '</span>'; } },
            { key: 'ip', label: 'IP', right: true, render: function (a) { return '<span class="xs muted mono">' + E(a.ip) + '</span>'; } }
          ]
        });
      }

      if (tab === 'seguridad') {
        tc.innerHTML = '<div class="card-b col">' +
          '<div class="grid g2">' +
          secCard('Aislamiento por tenant', 'Cada consulta filtra por tenant_id; un registro de otra empresa nunca se devuelve.', true, 'shield') +
          secCard('RBAC granular', 'Permisos por módulo y acción, con roles predefinidos y personalizados.', true, 'key') +
          secCard('2FA para administradores', 'Verificación en dos pasos obligatoria para el rol propietario.', true, 'lock') +
          secCard('Cookies HttpOnly / Secure / SameSite', 'Sesiones protegidas y renovación controlada.', true, 'lock') +
          secCard('Rate limiting', 'Protección de endpoints sensibles y bloqueo tras intentos fallidos.', true, 'alert') +
          secCard('URLs firmadas temporales', 'Los archivos sensibles se sirven con enlaces caducables.', true, 'file') +
          secCard('Cifrado TLS en tránsito', 'Y cifrado en reposo del proveedor cloud.', true, 'shield') +
          secCard('Audit log de cambios críticos', 'Permisos, facturas, pagos, inventario, estados y eliminaciones.', true, 'list') +
          secCard('Backups automáticos', 'Respaldo diario con restauración probada.', true, 'refresh') +
          secCard('Análisis antivirus de archivos', 'Previsto para clientes corporativos en fase Enterprise.', false, 'camera') +
          secCard('SSO / SAML', 'Disponible en el plan Enterprise.', false, 'key') +
          secCard('Exportación de datos del tenant', 'La empresa puede descargar toda su información.', true, 'download') +
          '</div>' +
          '<div class="card mt4"><div class="card-h"><h3>Sesiones y dispositivos activos</h3></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Usuario</th><th>Dispositivo</th><th>IP</th><th class="right">Último acceso</th></tr></thead><tbody>' +
          V.all('users').filter(function (u) { return u.role !== 'cliente'; }).slice(0, 6).map(function (u) {
            return '<tr><td><b>' + E(u.name) + '</b></td><td class="small">Chrome · Windows</td>' +
              '<td class="xs muted mono">190.202.11.' + (4 + V.all('users').indexOf(u)) + '</td>' +
              '<td class="right small">' + V.frel(u.lastLogin) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>' +
          '<div class="banner banner-brand mt4">' + I('download', 16) +
          '<div><b>Política de retención:</b> los datos operativos se conservan mientras la suscripción esté activa y 90 días después de su cancelación. ' +
          '<button class="btn btn-outline btn-sm mt2" id="expall">Exportar todos los datos del tenant</button></div></div>' +
          '</div>';
        tc.querySelector('#expall').addEventListener('click', function () {
          var db = V.db(), out = {};
          Object.keys(db).forEach(function (k) {
            if (Array.isArray(db[k])) out[k] = db[k].filter(function (r) { return r.tenant_id === undefined || r.tenant_id === V.tenantId(); });
          });
          V.download('voltx-export-' + V.tenantId() + '.json', JSON.stringify(out, null, 2), 'application/json');
          V.logAudit('CREATE', 'data_export', V.tenantId(), 'Exportación completa del tenant');
          UI.toast('Exportación generada.', 'ok');
        });
      }

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; render(); });
      });
      var ib = el.querySelector('#inv');
      if (ib) ib.addEventListener('click', inviteUser);
    }
    function secCard(title, text, on, ico) {
      return '<div class="file-row" style="align-items:flex-start"><span class="file-ico" style="' +
        (on ? '' : 'background:var(--muted-bg);color:var(--muted)') + '">' + I(ico, 15) + '</span>' +
        '<span style="min-width:0"><b class="small" style="display:block">' + E(title) + '</b>' +
        '<span class="xs muted">' + E(text) + '</span></span>' +
        '<span style="margin-left:auto">' + (on ? '<span class="badge b-green">Activo</span>' : '<span class="badge b-gray">Enterprise</span>') + '</span></div>';
    }

    function inviteUser() {
      UI.modal({ title: 'Invitar usuario',
        body: '<div class="field"><label for="nm">Nombre <span class="req">*</span></label><input class="input" id="nm"></div>' +
          '<div class="field mt4"><label for="em">Correo <span class="req">*</span></label><input class="input" id="em" type="email"></div>' +
          '<div class="grid g2 mt4">' +
          '<div class="field"><label for="rl">Rol</label><select class="select" id="rl">' +
            Object.keys(V.ROLES).map(function (k) { return '<option value="' + k + '"' + (k === 'tecnico' ? ' selected' : '') + '>' + V.ROLES[k].label + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label for="br">Sucursal</label><select class="select" id="br">' + opt(V.all('branches')) + '</select></div></div>' +
          '<div id="tecbox" class="mt4"></div>' +
          '<div class="banner banner-info mt4">' + I('mail', 15) + '<div>Se enviará una invitación con enlace de activación válido por 7 días.</div></div>',
        footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Enviar invitación</button>',
        onMount: function (m) {
          function sync() {
            m.querySelector('#tecbox').innerHTML = m.querySelector('#rl').value === 'tecnico'
              ? '<div class="grid g3">' +
                '<div class="field"><label for="zn">Zona</label><input class="input" id="zn" placeholder="Caracas Este"></div>' +
                '<div class="field"><label for="lv">Nivel</label><select class="select" id="lv"><option>Junior</option><option>Semi senior</option><option>Senior</option></select></div>' +
                '<div class="field"><label for="rt">Costo por hora</label><input class="input" id="rt" type="number" step="0.5" value="10"></div></div>'
              : '';
          }
          m.querySelector('#rl').addEventListener('change', sync); sync();
          m.querySelector('#ok').addEventListener('click', function () {
            var n = m.querySelector('#nm').value.trim(), e = m.querySelector('#em').value.trim();
            if (!n || !e) { UI.toast('Nombre y correo son obligatorios.', 'err'); return; }
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { UI.toast('El correo no es válido.', 'err'); return; }
            var role = m.querySelector('#rl').value;
            var u = V.insert('users', { name: n, email: e, role: role, branch_id: m.querySelector('#br').value,
              phone: '', active: true, twoFA: role === 'owner', lastLogin: null });
            if (role === 'tecnico') {
              var t = V.insert('technicians', { user_id: u.id, name: n, branch_id: u.branch_id, type: 'empleado',
                level: (m.querySelector('#lv') || {}).value || 'Junior', rate: +((m.querySelector('#rt') || {}).value || 10),
                phone: '', zone: (m.querySelector('#zn') || {}).value || '', skills: [], certifications: [],
                schedule: 'Lun–Vie 08:00–17:00', vehicle: '—', tools: [],
                kpi: { puntualidad: 100, completadas: 0, retrabajos: 0, horas: 0, rating: 5 },
                lat: 40 + Math.random() * 25, lng: 25 + Math.random() * 45, active: true });
              V.update('users', u.id, { technician_id: t.id });
            }
            V.logAudit('CREATE', 'invitations', e, 'Invitado como ' + V.ROLES[role].label);
            UI.closeTop(); UI.toast('Invitación enviada a ' + e + '.', 'ok'); render(); APP.refreshChrome();
          });
        } });
    }

    function userDetail(u) {
      var r = V.ROLES[u.role];
      UI.drawer({
        eyebrow: r.label, title: u.name, size: 'xl', subtitle: E(u.email),
        body: '<div class="grid g2 mb4">' +
            kv('Rol', '<span class="badge b-orange">' + E(r.label) + '</span>') +
            kv('Sucursal', E((V.byId('branches', u.branch_id) || {}).name || '—')) +
            kv('Teléfono', E(u.phone || '—')) + kv('2FA', u.twoFA ? 'Activo' : 'Inactivo') +
            kv('Último acceso', u.lastLogin ? V.fdatetime(u.lastLogin) : 'Nunca') +
            kv('Estado', u.active ? '<span class="badge b-green">Activo</span>' : '<span class="badge b-red">Suspendido</span>') +
            (u.technician_id ? kv('Ficha de técnico', '<a href="#tecnicos/' + u.technician_id + '">Ver ficha</a>') : '') +
            (u.customer_id ? kv('Cliente asociado', '<a href="#clientes/' + u.customer_id + '">' + E(V.customerName(u.customer_id)) + '</a>') : '') +
          '</div>' +
          '<h4 class="mb2">Permisos efectivos</h4>' +
          (Object.keys(r.perms).length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Módulo</th><th>Acciones permitidas</th></tr></thead><tbody>' +
            Object.keys(r.perms).map(function (m) {
              return '<tr><td class="bold small">' + E(m) + '</td><td>' + r.perms[m].map(function (a) { return '<span class="chip">' + E(a) + '</span>'; }).join(' ') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
            : '<div class="banner banner-info">' + I('user', 15) + '<div>Este usuario accede exclusivamente al portal del cliente, restringido a sus propios datos.</div></div>') +
          '<h4 class="mt6 mb2">Actividad registrada</h4>' +
          UI.timeline(V.all('audit').filter(function (a) { return a.user_id === u.id; }).slice(0, 8).map(function (a) {
            return { icon: 'list', text: '<b>' + E(a.action) + '</b> ' + E(a.entity) + ' — ' + E(a.detail), meta: V.fdatetime(a.at) };
          })),
        footer: '<button class="btn btn-outline" data-close>Cerrar</button>' +
          (V.can('usuarios', 'administrar') && u.id !== V.getSession().user_id ?
            '<button class="btn btn-ghost" id="sus">' + (u.active ? 'Suspender' : 'Reactivar') + '</button>' +
            '<button class="btn btn-primary" id="chg">Cambiar rol</button>' : ''),
        onMount: function (w) {
          var s = w.querySelector('#sus');
          if (s) s.addEventListener('click', function () {
            UI.confirm({ title: u.active ? '¿Suspender el usuario?' : '¿Reactivar el usuario?',
              body: u.active ? 'No podrá iniciar sesión hasta que se reactive.' : 'Recuperará el acceso con su rol actual.',
              ok: u.active ? 'Suspender' : 'Reactivar', danger: u.active }, function () {
                V.update('users', u.id, { active: !u.active });
                V.logAudit('UPDATE', 'users', u.email, u.active ? 'Suspendido' : 'Reactivado');
                UI.closeAll(); UI.toast('Usuario actualizado.', 'ok'); render();
              });
          });
          var c = w.querySelector('#chg');
          if (c) c.addEventListener('click', function () {
            UI.modal({ title: 'Cambiar rol de ' + u.name,
              body: '<div class="field"><label for="nr">Nuevo rol</label><select class="select" id="nr">' +
                Object.keys(V.ROLES).map(function (k) { return '<option value="' + k + '"' + (k === u.role ? ' selected' : '') + '>' + V.ROLES[k].label + '</option>'; }).join('') + '</select></div>' +
                '<div class="banner banner-warn mt4">' + I('alert', 15) + '<div>El cambio de rol modifica los permisos inmediatamente y queda registrado en el audit log.</div></div>',
              footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Cambiar</button>',
              onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
                var nr = m.querySelector('#nr').value;
                V.update('users', u.id, { role: nr });
                V.logAudit('UPDATE', 'user_roles', u.email, u.role + ' → ' + nr);
                UI.closeAll(); UI.toast('Rol actualizado.', 'ok'); render(); APP.refreshChrome();
              }); } });
          });
        }
      });
    }
    render();
  };

  /* ============================================================
     U) CONFIGURACIÓN DE EMPRESA §5, §U
     ============================================================ */
  views.configuracion = function (el, param) {
    var tab = param || 'empresa';
    function render() {
      var t = V.myTenant();
      var h = PH({
        title: 'Configuración de la empresa',
        sub: 'Datos fiscales, moneda, zona horaria, impuestos, numeraciones, branding, plantillas, notificaciones y sucursales'
      });
      h += '<div class="card"><div class="tabs" id="tabs">' +
        [['empresa', 'Empresa'], ['fiscal', 'Impuestos y numeración'], ['branding', 'Branding y plantillas'],
         ['sucursales', 'Sucursales'], ['notificaciones', 'Notificaciones'], ['integraciones', 'Integraciones']]
          .map(function (x) { return '<button data-t="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') +
        '</div><div class="card-b" id="tc"></div></div>';
      el.innerHTML = h;
      var tc = el.querySelector('#tc');
      var ro = !V.can('configuracion', 'editar');

      if (tab === 'empresa') {
        tc.innerHTML = '<div class="grid g2">' +
          fld('nm', 'Nombre comercial', t.name) + fld('ln', 'Razón social', t.legalName) +
          fld('tx', 'Identificación fiscal', t.taxId) + fld('ph', 'Teléfono', t.phone) +
          fld('em', 'Correo', t.email) + fld('wb', 'Sitio web', t.website) +
          '</div>' +
          '<div class="field mt4"><label for="ad">Dirección</label><textarea class="textarea" id="ad" style="min-height:64px"' + (ro ? ' readonly' : '') + '>' + E(t.address) + '</textarea></div>' +
          '<div class="grid g3 mt4">' +
          sel('cy', 'País', ['Venezuela', 'Colombia', 'México', 'Panamá', 'España', 'Chile', 'Perú'], t.country) +
          sel('cu', 'Moneda', ['USD', 'EUR', 'COP', 'MXN', 'CLP', 'PEN'], t.currency) +
          sel('tz', 'Zona horaria', ['America/Caracas', 'America/Bogota', 'America/Mexico_City', 'America/Panama', 'Europe/Madrid', 'America/Santiago'], t.timezone) +
          '</div>' +
          '<div class="field mt4"><label for="pt">Condiciones comerciales por defecto</label><textarea class="textarea" id="pt"' + (ro ? ' readonly' : '') + '>' + E(t.paymentTerms) + '</textarea></div>' +
          (ro ? '' : '<button class="btn btn-primary mt6" id="save">Guardar cambios</button>');
      }

      if (tab === 'fiscal') {
        tc.innerHTML = '<div class="grid g3">' +
          fld('tn', 'Nombre del impuesto', t.taxName) +
          '<div class="field"><label for="tr">Tasa (%)</label><input class="input" id="tr" type="number" value="' + t.taxRate + '"' + (ro ? ' readonly' : '') + '></div>' +
          '<div class="field"><label for="mm">Margen mínimo exigido (%)</label><input class="input" id="mm" type="number" value="' + t.minMargin + '"' + (ro ? ' readonly' : '') + '></div>' +
          '</div>' +
          '<h4 class="mt6 mb2">Numeración de documentos</h4>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Documento</th><th>Prefijo</th><th class="right">Siguiente número</th><th>Ejemplo</th></tr></thead><tbody>' +
          [['Presupuestos', 'qp', t.quotePrefix, 'quote', 4], ['Órdenes de trabajo', 'wp', t.woPrefix, 'wo', 6], ['Facturas', 'ip', t.invoicePrefix, 'invoice', 4]]
            .map(function (r) {
              var n = (V.db().counters[V.tenantId()] || {})[r[3]] || 0;
              return '<tr><td class="bold">' + E(r[0]) + '</td>' +
                '<td><input class="input" id="' + r[1] + '" value="' + E(r[2]) + '" style="width:110px"' + (ro ? ' readonly' : '') + '></td>' +
                '<td class="right mono">' + (n + 1) + '</td>' +
                '<td class="mono small muted">' + E(r[2]) + '-' + new Date().getFullYear() + '-' + V.pad(n + 1, r[4]) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
          '<div class="field mt6"><label for="qv">Vigencia por defecto de los presupuestos (días)</label>' +
          '<input class="input" id="qv" type="number" value="' + t.quoteValidity + '" style="max-width:160px"' + (ro ? ' readonly' : '') + '></div>' +
          '<div class="banner banner-info mt4">' + I('info', 15) +
          '<div>La facturación fiscal oficial depende del país y de la integración seleccionada. VOLTX genera la documentación y el control financiero operativo.</div></div>' +
          (ro ? '' : '<button class="btn btn-primary mt6" id="save">Guardar cambios</button>');
      }

      if (tab === 'branding') {
        tc.innerHTML = '<div class="grid g2"><div>' +
          '<h4 class="mb2">Logo de la empresa</h4>' +
          '<div class="row gap4"><div class="av xl" style="background:' + t.color + ';color:#fff;border-radius:14px">' + E(t.initials) + '</div>' +
          '<div class="col"><div class="dropzone" id="dz" style="padding:16px">' + I('upload', 18) + '<div class="xs mt2">Subir logo (PNG o SVG)</div></div>' +
          '<p class="xs muted">Se usará en los PDF de presupuestos, informes, certificados y facturas.</p></div></div>' +
          '<div class="field mt6"><label for="cl">Color de acento</label>' +
          '<input class="input" id="cl" type="color" value="' + t.color + '" style="max-width:100px;padding:4px"' + (ro ? ' disabled' : '') + '></div>' +
          '</div><div>' +
          '<h4 class="mb2">Plantillas de documentos</h4><div class="col" style="gap:8px">' +
          [['Presupuesto / cotización', 'file'], ['Informe de inspección', 'search'], ['Informe de servicio', 'clipboard'],
           ['Certificado de trabajo', 'shield'], ['Acta de entrega', 'pen'], ['Factura', 'receipt']]
            .map(function (r) {
              return '<div class="file-row"><span class="file-ico">' + I(r[1], 15) + '</span>' +
                '<b class="small">' + E(r[0]) + '</b><span style="margin-left:auto" class="badge b-green">Configurada</span></div>';
            }).join('') + '</div>' +
          '<div class="banner banner-brand mt4">' + I('info', 15) +
          '<div>Los PDF llevan el logo y los datos de tu empresa; VOLTX solo aparece como pie de página opcional.</div></div>' +
          '</div></div>' +
          (ro ? '' : '<button class="btn btn-primary mt6" id="save">Guardar cambios</button>');
        UI.uploader(tc.querySelector('#dz'));
      }

      if (tab === 'sucursales') {
        tc.innerHTML = '<div class="col">' + V.all('branches').map(function (b) {
          return '<div class="file-row"><span class="file-ico">' + I('building', 15) + '</span>' +
            '<span style="min-width:0"><b class="small" style="display:block">' + E(b.name) + (b.main ? ' <span class="badge b-orange no-dot">Principal</span>' : '') + '</b>' +
            '<span class="xs muted">' + E(b.address) + ' · ' + E(b.phone) + '</span></span>' +
            '<span style="margin-left:auto" class="small muted">' +
            V.all('users').filter(function (u) { return u.branch_id === b.id; }).length + ' usuarios · ' +
            V.all('workOrders').filter(function (w) { return w.branch_id === b.id; }).length + ' órdenes</span></div>';
        }).join('') + '</div>' +
        (V.can('configuracion', 'crear') ? '<button class="btn btn-outline btn-sm mt4" id="nb">' + I('plus', 14) + ' Agregar sucursal</button>' : '') +
        '<div class="banner banner-info mt4">' + I('info', 15) +
        '<div>Cada registro operativo lleva <code>branch_id</code>; los reportes permiten filtrar por sucursal o consolidar toda la empresa.</div></div>';
        var nb = tc.querySelector('#nb');
        if (nb) nb.addEventListener('click', function () {
          UI.modal({ title: 'Nueva sucursal',
            body: '<div class="field"><label for="bn">Nombre <span class="req">*</span></label><input class="input" id="bn"></div>' +
              '<div class="field mt4"><label for="ba">Dirección</label><input class="input" id="ba"></div>' +
              '<div class="field mt4"><label for="bp">Teléfono</label><input class="input" id="bp"></div>',
            footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>',
            onMount: function (m) { m.querySelector('#ok').addEventListener('click', function () {
              var n = m.querySelector('#bn').value.trim();
              if (!n) { UI.toast('El nombre es obligatorio.', 'err'); return; }
              V.insert('branches', { name: n, address: m.querySelector('#ba').value.trim(), phone: m.querySelector('#bp').value.trim(), main: false });
              V.logAudit('CREATE', 'branches', n, 'Sucursal creada');
              UI.closeTop(); UI.toast('Sucursal agregada.', 'ok'); render();
            }); } });
        });
      }

      if (tab === 'notificaciones') {
        var evs = [['Nueva solicitud recibida', 1, 1, 0], ['Presupuesto aprobado o rechazado', 1, 1, 1],
          ['Presupuesto por vencer', 1, 1, 0], ['Orden asignada', 1, 1, 1], ['Orden completada', 1, 1, 0],
          ['Factura vencida', 1, 1, 1], ['Pago recibido', 1, 0, 0], ['Stock bajo mínimo', 1, 1, 0],
          ['Certificación por vencer', 1, 1, 0], ['Mantenimiento próximo', 1, 1, 0], ['Nueva incidencia del cliente', 1, 1, 1]];
        tc.innerHTML = '<p class="small muted mb4">Preferencias por tipo de evento y canal para tu usuario.</p>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Evento</th>' +
          ['In-app', 'Email', 'WhatsApp'].map(function (c) { return '<th style="text-align:center">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
          evs.map(function (e, i) {
            return '<tr><td class="bold small">' + E(e[0]) + '</td>' +
              [1, 2, 3].map(function (c) {
                return '<td style="text-align:center"><label class="switch"><input type="checkbox" data-n="' + i + '-' + c + '"' +
                  (e[c] ? ' checked' : '') + (ro ? ' disabled' : '') + '><span></span></label></td>';
              }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="banner banner-warn mt4">' + I('info', 15) +
          '<div>WhatsApp funciona con enlace manual en el MVP; la API oficial se habilita como add-on en los planes avanzados.</div></div>' +
          (ro ? '' : '<button class="btn btn-primary mt6" id="save">Guardar preferencias</button>');
      }

      if (tab === 'integraciones') {
        tc.innerHTML = '<div class="grid g2">' +
          [['Correo transaccional', 'Invitaciones, cotizaciones, recordatorios y facturas.', 'mail', 'Conectado'],
           ['Mapas y geocodificación', 'Direcciones, mapa operativo y rutas al sitio.', 'map', 'Conectado'],
           ['Pasarela de pago SaaS', 'Cobro de la suscripción de VOLTX.', 'dollar', 'Conectado'],
           ['Pagos de clientes finales', 'Para que tus clientes paguen en línea desde el portal.', 'receipt', 'Disponible'],
           ['WhatsApp Business API', 'Notificaciones y conversación estructurada.', 'phone', 'Add-on'],
           ['Calendario externo (Google / Microsoft)', 'Sincronización de la agenda de los técnicos.', 'calendar', 'Próximamente'],
           ['Contabilidad y facturación fiscal', 'Conectores por país.', 'chart', 'Próximamente'],
           ['Firma digital avanzada', 'Cuando el mercado la exija; el MVP usa aceptación digital con trazabilidad.', 'pen', 'Próximamente'],
           ['API pública y webhooks', 'REST /api/v1 con OpenAPI, payloads firmados e idempotency keys.', 'workflow', 'Plan Business']]
          .map(function (r) {
            var cls = { Conectado: 'b-green', Disponible: 'b-blue', 'Add-on': 'b-orange', Próximamente: 'b-gray', 'Plan Business': 'b-black' }[r[3]];
            return '<div class="card"><div class="card-b tight"><div class="spread">' +
              '<div class="row gap2"><span class="kpi-ico">' + I(r[2], 16) + '</span><b class="small">' + E(r[0]) + '</b></div>' +
              '<span class="badge ' + cls + ' no-dot">' + E(r[3]) + '</span></div>' +
              '<p class="xs muted mt2">' + E(r[1]) + '</p></div></div>';
          }).join('') + '</div>' +
          '<div class="card mt6"><div class="card-h"><h3>API y webhooks</h3></div><div class="card-b">' +
          '<p class="small muted mb4">Prefijo <code>/api/v1</code> con documentación OpenAPI. Endpoints principales:</p>' +
          '<div class="row wrap gap2">' + ['/auth','/tenants','/users','/customers','/sites','/service-requests','/inspections',
            '/quotes','/projects','/work-orders','/technicians','/inventory','/purchase-orders','/invoices','/payments','/documents','/reports']
            .map(function (e) { return '<span class="chip mono">' + E(e) + '</span>'; }).join('') + '</div>' +
          '<div class="field mt6"><label for="ak">Clave de API</label>' +
          '<div class="row gap2"><input class="input mono" id="ak" readonly value="vx_live_' + V.tenantId().slice(4, 12) + '••••••••••••"><button class="btn btn-outline" id="cp">' + I('copy', 15) + '</button></div>' +
          '<span class="hint">Los payloads salientes se firman y usan idempotency keys.</span></div>' +
          '</div></div>';
        tc.querySelector('#cp').addEventListener('click', function () { UI.copy('vx_live_' + V.tenantId().slice(4, 12)); });
      }

      el.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { tab = this.dataset.t; location.hash = 'configuracion/' + tab; render(); });
      });
      var sv = el.querySelector('#save');
      if (sv) sv.addEventListener('click', function () {
        var g = function (id) { var e = el.querySelector('#' + id); return e ? e.value : undefined; };
        var patch = {};
        [['nm', 'name'], ['ln', 'legalName'], ['tx', 'taxId'], ['ph', 'phone'], ['em', 'email'], ['wb', 'website'],
         ['ad', 'address'], ['cy', 'country'], ['cu', 'currency'], ['tz', 'timezone'], ['pt', 'paymentTerms'],
         ['tn', 'taxName'], ['qp', 'quotePrefix'], ['wp', 'woPrefix'], ['ip', 'invoicePrefix'], ['cl', 'color']]
          .forEach(function (p) { var v = g(p[0]); if (v !== undefined) patch[p[1]] = v; });
        [['tr', 'taxRate'], ['mm', 'minMargin'], ['qv', 'quoteValidity']].forEach(function (p) {
          var v = g(p[0]); if (v !== undefined) patch[p[1]] = +v || 0;
        });
        V.update('tenants', V.tenantId(), patch);
        V.logAudit('UPDATE', 'company_settings', V.tenantId(), 'Configuración actualizada');
        UI.toast('Configuración guardada.', 'ok'); render();
      });
    }
    function fld(id, label, val) {
      return '<div class="field"><label for="' + id + '">' + E(label) + '</label><input class="input" id="' + id + '" value="' + E(val || '') + '"' +
        (V.can('configuracion', 'editar') ? '' : ' readonly') + '></div>';
    }
    function sel(id, label, options, val) {
      return '<div class="field"><label for="' + id + '">' + E(label) + '</label><select class="select" id="' + id + '"' +
        (V.can('configuracion', 'editar') ? '' : ' disabled') + '>' +
        options.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + E(o) + '</option>'; }).join('') + '</select></div>';
    }
    render();
  };

  /* ============================================================
     SUSCRIPCIÓN Y PLAN §16
     ============================================================ */
  views.suscripcion = function (el) {
    var sub = V.all('subscriptions')[0] || {};
    var plan = V.db().plans.filter(function (p) { return p.id === sub.plan_id; })[0] || {};
    var users = V.all('users').filter(function (u) { return u.role !== 'cliente'; }).length;
    var wosMes = V.all('workOrders').filter(function (w) { return new Date(w.created_at).getMonth() === new Date().getMonth(); }).length;
    var dias = V.daysTo(sub.renewsAt);

    var h = PH({
      title: 'Suscripción y plan',
      sub: 'Lo que tu empresa paga a VOLTX · separado de la facturación que emites a tus clientes',
      actions: '<button class="btn btn-outline btn-sm" id="fact">' + I('receipt', 15) + ' Historial de pagos</button>' +
               '<button class="btn btn-primary btn-sm" id="up">' + I('star', 15) + ' Cambiar de plan</button>'
    });

    if (sub.status === 'trial') {
      h += '<div class="banner banner-warn mb4">' + I('clock', 16) + '<div><b>Prueba gratuita:</b> quedan ' + Math.max(0, dias) +
        ' día(s). Elige un plan para no perder el acceso a tus datos.</div></div>';
    } else if (dias <= 7) {
      h += '<div class="banner banner-brand mb4">' + I('refresh', 16) + '<div>Tu plan se renueva automáticamente el ' + V.fdate(sub.renewsAt, true) + ' con ' + E(sub.method) + '.</div></div>';
    }

    h += '<div class="grid g-2-1"><div class="col">' +
      '<div class="card"><div class="card-h"><h3>Plan actual</h3>' +
        '<span class="badge ' + (sub.status === 'active' ? 'b-green' : 'b-amber') + '">' + (sub.status === 'active' ? 'Activo' : 'En prueba') + '</span></div>' +
      '<div class="card-b"><div class="spread">' +
        '<div><div style="font-size:28px;font-weight:800;color:var(--black)">' + E(plan.name) + '</div>' +
        '<div class="muted small">$' + plan.price + ' / mes · facturación ' + E(sub.interval) + '</div></div>' +
        '<div class="right"><div class="xs muted">Próxima renovación</div><b>' + V.fdate(sub.renewsAt) + '</b>' +
        '<div class="xs muted">' + E(sub.method) + '</div></div></div>' +
      '<div class="grid g3 mt6">' +
        usage('Usuarios', users, plan.users) +
        usage('Órdenes este mes', wosMes, plan.orders) +
        usage('Almacenamiento (GB)', 12, plan.storage) +
      '</div>' +
      '<h4 class="mt6 mb2">Incluido en tu plan</h4><div class="grid g2">' +
        (plan.features || []).map(function (f) { return '<div class="row gap2 small">' + I('check', 14) + E(f) + '</div>'; }).join('') +
      '</div></div></div>' +

      '<div class="card"><div class="card-h"><h3>Planes disponibles</h3></div><div class="card-b"><div class="grid g3">' +
      V.db().plans.map(function (p) {
        var cur = p.id === sub.plan_id;
        return '<div class="price ' + (cur ? 'hot' : '') + '" style="padding:18px">' +
          (cur ? '<span class="badge b-orange no-dot" style="align-self:flex-start">Tu plan</span>' : '') +
          '<h3 style="font-size:17px">' + E(p.name) + '</h3>' +
          '<div class="amt" style="font-size:26px">$' + p.price + '<span class="muted" style="font-size:13px;font-weight:500">/mes</span></div>' +
          '<p class="xs muted">' + p.users + ' usuarios · ' + p.orders + ' órdenes/mes · ' + p.storage + ' GB</p>' +
          '<ul>' + p.features.slice(0, 5).map(function (f) { return '<li style="font-size:12.5px">' + I('check', 13) + '<span>' + E(f) + '</span></li>'; }).join('') + '</ul>' +
          (cur ? '<button class="btn btn-outline btn-sm btn-block" disabled>Plan actual</button>'
               : '<button class="btn ' + (p.price > plan.price ? 'btn-primary' : 'btn-outline') + ' btn-sm btn-block" data-p="' + p.id + '">' +
                 (p.price > plan.price ? 'Mejorar' : 'Cambiar') + '</button>') +
          '</div>';
      }).join('') + '</div></div></div>' +

      '<div class="card"><div class="card-h"><h3>Add-ons</h3></div><div class="card-b col" style="gap:8px">' +
      [['WhatsApp Business API', 19], ['Automatizaciones avanzadas', 15], ['Multi-sucursal adicional', 12],
       ['API y webhooks', 25], ['SSO / SAML', 49], ['Almacenamiento +100 GB', 9]]
        .map(function (a) {
          return '<div class="file-row"><span class="file-ico">' + I('plus', 15) + '</span>' +
            '<b class="small">' + E(a[0]) + '</b><span style="margin-left:auto" class="row gap2">' +
            '<b class="mono">$' + a[1] + '/mes</b><button class="btn btn-outline btn-sm" data-add="' + E(a[0]) + '">Agregar</button></span></div>';
        }).join('') + '</div></div></div>';

    h += '<div class="col">' +
      '<div class="card"><div class="card-h"><h3>Datos de facturación</h3></div><div class="card-b col" style="gap:10px">' +
        kv('Empresa', E(V.myTenant().legalName)) + kv('Identificación fiscal', E(V.myTenant().taxId)) +
        kv('Correo de facturación', E(V.myTenant().email)) + kv('Método de pago', E(sub.method)) +
        kv('Asientos contratados', sub.seats) + kv('Asientos usados', sub.usedSeats) +
        kv('Cliente desde', V.fdate(sub.startedAt)) +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Últimos cargos</h3></div><div class="tbl-wrap"><table class="tbl"><tbody>' +
      [0, 1, 2, 3].map(function (i) {
        var d = new Date(); d.setMonth(d.getMonth() - i);
        return '<tr><td><b class="small">' + E(V.MONTHS_L[d.getMonth()]) + ' ' + d.getFullYear() + '</b>' +
          '<div class="xs muted">Plan ' + E(plan.name) + '</div></td>' +
          '<td class="right"><b class="mono">$' + plan.price + '</b><div class="xs" style="color:var(--success)">Pagado</div></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-b">' +
        '<div class="banner banner-info">' + I('info', 15) +
        '<div>La facturación de VOLTX es independiente de las facturas que tu empresa emite a sus clientes desde el módulo de Facturación.</div></div>' +
        '<button class="btn btn-ghost btn-sm btn-block mt4" id="cancel">Cancelar suscripción</button>' +
      '</div></div></div></div>';

    el.innerHTML = h;

    el.querySelectorAll('[data-p]').forEach(function (b) {
      b.addEventListener('click', function () {
        var np = V.db().plans.filter(function (x) { return x.id === this.dataset.p; }.bind(this))[0];
        UI.confirm({ title: '¿Cambiar al plan ' + np.name + '?',
          body: 'El nuevo cargo será de $' + np.price + '/mes con prorrateo del período en curso. Límites: ' +
            np.users + ' usuarios, ' + np.orders + ' órdenes/mes y ' + np.storage + ' GB.', ok: 'Confirmar cambio' },
          function () {
            V.update('subscriptions', sub.id, { plan_id: np.id, amount: np.price, seats: np.users, status: 'active' });
            V.logAudit('UPDATE', 'subscriptions', sub.id, 'Plan → ' + np.name);
            UI.toast('Plan actualizado a ' + np.name + '.', 'ok'); APP.reload();
          });
      });
    });
    el.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = this.dataset.add;
        UI.confirm({ title: '¿Agregar el add-on?', body: n + ' se sumará a tu próxima factura.', ok: 'Agregar' }, function () {
          V.logAudit('UPDATE', 'subscriptions', sub.id, 'Add-on: ' + n);
          UI.toast('Add-on «' + n + '» agregado.', 'ok');
        });
      });
    });
    el.querySelector('#up').addEventListener('click', function () { window.scrollTo({ top: 400, behavior: 'smooth' }); });
    el.querySelector('#fact').addEventListener('click', function () {
      UI.modal({ title: 'Historial de pagos de la suscripción',
        body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Período</th><th>Plan</th><th class="right">Monto</th><th class="right">Estado</th></tr></thead><tbody>' +
          [0,1,2,3,4,5].map(function (i) {
            var d = new Date(); d.setMonth(d.getMonth() - i);
            return '<tr><td>' + E(V.MONTHS_L[d.getMonth()]) + ' ' + d.getFullYear() + '</td><td>' + E(plan.name) + '</td>' +
              '<td class="right mono">$' + plan.price + '</td><td class="right"><span class="badge b-green">Pagado</span></td></tr>';
          }).join('') + '</tbody></table></div>' });
    });
    el.querySelector('#cancel').addEventListener('click', function () {
      UI.confirm({ title: '¿Cancelar la suscripción?',
        body: 'Conservarás el acceso hasta el ' + V.fdate(sub.renewsAt, true) + '. Tus datos se mantienen 90 días para que puedas exportarlos.',
        ok: 'Cancelar suscripción', danger: true },
        function () { UI.toast('Solicitud de cancelación registrada. Te contactará el equipo de soporte.', 'ok'); });
    });

    function usage(label, used, limit) {
      var pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
      return '<div><div class="spread small"><span class="muted">' + E(label) + '</span><b>' + used + ' / ' + limit + '</b></div>' +
        '<div class="bar mt2 ' + (pct > 90 ? 'r' : pct > 70 ? 'a' : 'g') + '"><i style="width:' + pct + '%"></i></div></div>';
    }
  };
})();
