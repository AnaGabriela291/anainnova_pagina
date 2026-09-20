/* ============================================================
   VOLTX — Capa de datos
   Simula la API REST /api/v1 + PostgreSQL descritos en la
   especificación (§10, §11, §12) sobre localStorage.
   Todo registro operativo lleva tenant_id (§5.3) y timestamps.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'voltx.db.v1';
  var SESSION = 'voltx.session.v1';

  /* ---------- helpers ---------- */
  function pad(n, l) { return String(n).padStart(l || 2, '0'); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function iso(d) { return new Date(d).toISOString(); }
  function ymd(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function at(dayOffset, h, m) { var d = addDays(today(), dayOffset); d.setHours(h, m || 0, 0, 0); return d.toISOString(); }
  var _uid = 0;
  function uid(p) { _uid++; return (p || 'id') + '_' + Date.now().toString(36) + _uid.toString(36); }

  /* ============================================================
     CATÁLOGOS DE ESTADO — §10.3 máquinas de estado
     ============================================================ */
  var WO_STATES = {
    DRAFT:       { label: 'Borrador',     badge: 'b-gray',   next: ['SCHEDULED', 'CANCELLED'] },
    SCHEDULED:   { label: 'Programada',   badge: 'b-blue',   next: ['ASSIGNED', 'DRAFT', 'CANCELLED'] },
    ASSIGNED:    { label: 'Asignada',     badge: 'b-blue',   next: ['EN_ROUTE', 'SCHEDULED', 'CANCELLED'] },
    EN_ROUTE:    { label: 'En camino',    badge: 'b-orange', next: ['ON_SITE', 'ASSIGNED', 'CANCELLED'] },
    ON_SITE:     { label: 'En sitio',     badge: 'b-orange', next: ['IN_PROGRESS', 'CANCELLED'] },
    IN_PROGRESS: { label: 'En ejecución', badge: 'b-orange', next: ['PAUSED', 'COMPLETED'] },
    PAUSED:      { label: 'Pausada',      badge: 'b-amber',  next: ['IN_PROGRESS', 'CANCELLED'] },
    COMPLETED:   { label: 'Completada',   badge: 'b-green',  next: ['REVIEW'] },
    REVIEW:      { label: 'Validación',   badge: 'b-amber',  next: ['CLOSED', 'IN_PROGRESS'] },
    CLOSED:      { label: 'Cerrada',      badge: 'b-green',  next: [] },
    CANCELLED:   { label: 'Cancelada',    badge: 'b-red',    next: [] }
  };
  var QUOTE_STATES = {
    DRAFT:    { label: 'Borrador', badge: 'b-gray',   next: ['REVIEW', 'CANCELLED'] },
    REVIEW:   { label: 'Revisión', badge: 'b-amber',  next: ['SENT', 'DRAFT'] },
    SENT:     { label: 'Enviado',  badge: 'b-blue',   next: ['VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED'] },
    VIEWED:   { label: 'Visto',    badge: 'b-blue',   next: ['APPROVED', 'REJECTED', 'EXPIRED'] },
    APPROVED: { label: 'Aprobado', badge: 'b-green',  next: [] },
    REJECTED: { label: 'Rechazado',badge: 'b-red',    next: ['DRAFT'] },
    EXPIRED:  { label: 'Vencido',  badge: 'b-red',    next: ['DRAFT'] },
    CANCELLED:{ label: 'Anulado',  badge: 'b-gray',   next: [] }
  };
  var REQ_STATES = {
    NEW:        { label: 'Nueva',             badge: 'b-orange' },
    CONTACTED:  { label: 'Contactada',        badge: 'b-blue' },
    SCHEDULED:  { label: 'Visita programada', badge: 'b-blue' },
    QUOTING:    { label: 'Cotizando',         badge: 'b-amber' },
    WON:        { label: 'Ganada',            badge: 'b-green' },
    LOST:       { label: 'Perdida',           badge: 'b-red' },
    CANCELLED:  { label: 'Cancelada',         badge: 'b-gray' }
  };
  var INV_STATES = {
    DRAFT:    { label: 'Borrador', badge: 'b-gray' },
    ISSUED:   { label: 'Emitida',  badge: 'b-blue' },
    PARTIAL:  { label: 'Parcial',  badge: 'b-amber' },
    PAID:     { label: 'Pagada',   badge: 'b-green' },
    OVERDUE:  { label: 'Vencida',  badge: 'b-red' },
    VOID:     { label: 'Anulada',  badge: 'b-gray' }
  };
  var PROJECT_STATES = {
    PLANNING:  { label: 'Planificación', badge: 'b-gray' },
    ACTIVE:    { label: 'En ejecución',  badge: 'b-orange' },
    ON_HOLD:   { label: 'En pausa',      badge: 'b-amber' },
    COMPLETED: { label: 'Completado',    badge: 'b-green' },
    CLOSED:    { label: 'Cerrado',       badge: 'b-green' },
    CANCELLED: { label: 'Cancelado',     badge: 'b-red' }
  };
  var TICKET_STATES = {
    OPEN:        { label: 'Abierto',     badge: 'b-orange' },
    IN_PROGRESS: { label: 'En proceso',  badge: 'b-blue' },
    WAITING:     { label: 'En espera',   badge: 'b-amber' },
    RESOLVED:    { label: 'Resuelto',    badge: 'b-green' },
    CLOSED:      { label: 'Cerrado',     badge: 'b-gray' }
  };
  var PO_STATES = {
    DRAFT:     { label: 'Borrador',   badge: 'b-gray' },
    PENDING:   { label: 'Por aprobar',badge: 'b-amber' },
    APPROVED:  { label: 'Aprobada',   badge: 'b-blue' },
    PARTIAL:   { label: 'Recibida parcial', badge: 'b-amber' },
    RECEIVED:  { label: 'Recibida',   badge: 'b-green' },
    CANCELLED: { label: 'Cancelada',  badge: 'b-red' }
  };
  var PRIORITIES = {
    baja:    { label: 'Baja',    badge: 'b-gray' },
    normal:  { label: 'Normal',  badge: 'b-blue' },
    alta:    { label: 'Alta',    badge: 'b-amber' },
    critica: { label: 'Crítica', badge: 'b-red' }
  };
  var WO_TYPES = {
    instalacion:  'Instalación',
    mantenimiento:'Mantenimiento',
    inspeccion:   'Inspección',
    emergencia:   'Emergencia',
    correccion:   'Corrección'
  };

  /* ============================================================
     RBAC — §2.1, §2.2, §13
     ============================================================ */
  var MODULES = ['dashboard','clientes','solicitudes','inspecciones','presupuestos','proyectos','ordenes',
    'agenda','mapa','tecnicos','inventario','compras','facturacion','mantenimientos','activos','documentos',
    'incidencias','reportes','automatizaciones','usuarios','configuracion','suscripcion','servicios'];
  var ACTIONS = ['ver','crear','editar','eliminar','aprobar','asignar','exportar','administrar'];

  function grant(mods, acts) {
    var p = {}; mods.forEach(function (m) { p[m] = acts.slice(); }); return p;
  }
  var ALL = ACTIONS.slice();
  var ROLES = {
    owner: {
      label: 'Propietario / Admin', desc: 'Control total de la organización',
      perms: grant(MODULES, ALL), home: 'app.html'
    },
    coordinador: {
      label: 'Coordinador operativo', desc: 'Planifica y asigna el trabajo',
      perms: Object.assign(
        grant(['dashboard','clientes','solicitudes','inspecciones','proyectos','ordenes','agenda','mapa',
               'tecnicos','mantenimientos','activos','documentos','incidencias','reportes','servicios'],
              ['ver','crear','editar','asignar','exportar']),
        grant(['presupuestos','inventario'], ['ver']),
        grant(['ordenes'], ['ver','crear','editar','asignar','aprobar','exportar'])
      ), home: 'app.html'
    },
    ventas: {
      label: 'Ventas / Presupuestos', desc: 'Oportunidades y cotizaciones',
      perms: Object.assign(
        grant(['dashboard','clientes','solicitudes','inspecciones','presupuestos','servicios','documentos','reportes'],
              ['ver','crear','editar','exportar']),
        grant(['proyectos','ordenes','agenda','facturacion'], ['ver'])
      ), home: 'app.html'
    },
    almacen: {
      label: 'Almacén / Compras', desc: 'Controla materiales y compras',
      perms: Object.assign(
        grant(['dashboard','inventario','compras','activos','documentos','reportes'],
              ['ver','crear','editar','exportar','aprobar']),
        grant(['ordenes','proyectos','clientes'], ['ver'])
      ), home: 'app.html'
    },
    finanzas: {
      label: 'Finanzas', desc: 'Cobros y rentabilidad',
      perms: Object.assign(
        grant(['dashboard','facturacion','reportes','documentos','compras'], ['ver','crear','editar','exportar','aprobar']),
        grant(['clientes','presupuestos','proyectos','ordenes','inventario'], ['ver'])
      ), home: 'app.html'
    },
    tecnico: {
      label: 'Técnico electricista', desc: 'Ejecuta trabajos en campo',
      perms: Object.assign(
        grant(['ordenes','inspecciones','mantenimientos'], ['ver','editar']),
        grant(['dashboard','clientes','activos','documentos','inventario'], ['ver'])
      ), home: 'tecnico.html'
    },
    cliente: {
      label: 'Cliente', desc: 'Consulta y solicita servicios',
      perms: {}, home: 'cliente.html'
    }
  };

  /* ============================================================
     SEED — dos tenants para probar aislamiento (§18.1, §20)
     ============================================================ */
  function seed() {
    var db = {
      plans: [
        { id: 'plan_starter', name: 'Starter', price: 39, users: 5, orders: 150, storage: 5,
          features: ['Clientes y ubicaciones','Presupuestos y PDF','Órdenes de trabajo','Agenda','Evidencias y firma','Facturas básicas','Portal cliente básico'] },
        { id: 'plan_pro', name: 'Pro', price: 89, users: 15, orders: 600, storage: 50,
          features: ['Todo Starter','Proyectos e hitos','Inventario','Portal del cliente completo','Reportes','Automatizaciones básicas','Mantenimientos'] },
        { id: 'plan_business', name: 'Business', price: 189, users: 50, orders: 3000, storage: 250,
          features: ['Todo Pro','Multi-sucursal','Compras y proveedores','Permisos avanzados','API y webhooks','Analítica avanzada','Soporte prioritario'] }
      ],
      tenants: [], branches: [], users: [], customers: [], contacts: [], sites: [], requests: [],
      inspections: [], services: [], quotes: [], projects: [], milestones: [], workOrders: [],
      technicians: [], absences: [], products: [], warehouses: [], stockMovements: [], vendors: [],
      purchaseOrders: [], assets: [], maintenancePlans: [], invoices: [], payments: [], expenses: [],
      documents: [], tickets: [], notifications: [], comments: [], activity: [], audit: [],
      automations: [], subscriptions: [], counters: {}
    };

    /* ----- TENANT 1: Electro Andes (demo principal) ----- */
    var T1 = 'tnt_electroandes';
    db.tenants.push({
      id: T1, name: 'Electro Andes C.A.', legalName: 'Electro Andes, C.A.', taxId: 'J-40123456-7',
      country: 'Venezuela', currency: 'USD', timezone: 'America/Caracas', locale: 'es-VE',
      phone: '+58 212 555 4400', email: 'contacto@electroandes.com', website: 'electroandes.com',
      address: 'Av. Principal de Los Ruices, Edif. Tecno, Piso 3, Caracas',
      type: 'empresa_pequena', techCount: 6, color: '#E85D04', initials: 'EA',
      taxRate: 16, taxName: 'IVA', quotePrefix: 'COT', woPrefix: 'OT', invoicePrefix: 'FAC',
      paymentTerms: 'Pago 50% anticipo, 50% contra entrega. Garantía de 90 días sobre mano de obra.',
      quoteValidity: 15, minMargin: 25, created_at: iso(addDays(today(), -420))
    });
    db.subscriptions.push({
      id: 'sub_1', tenant_id: T1, plan_id: 'plan_pro', status: 'active', seats: 15, usedSeats: 9,
      startedAt: iso(addDays(today(), -420)), renewsAt: iso(addDays(today(), 12)),
      amount: 89, interval: 'mensual', method: 'Visa •••• 4242'
    });
    db.branches.push(
      { id: 'br_1', tenant_id: T1, name: 'Sede Caracas', address: 'Los Ruices, Caracas', phone: '+58 212 555 4400', main: true },
      { id: 'br_2', tenant_id: T1, name: 'Sucursal Valencia', address: 'Av. Bolívar Norte, Valencia', phone: '+58 241 555 1120', main: false }
    );

    /* ----- TENANT 2: aislamiento (§18.1) ----- */
    var T2 = 'tnt_lumina';
    db.tenants.push({
      id: T2, name: 'Lumina Instalaciones', legalName: 'Lumina Instalaciones SAS', taxId: 'J-41987654-1',
      country: 'Colombia', currency: 'USD', timezone: 'America/Bogota', locale: 'es-CO',
      phone: '+57 601 555 8800', email: 'hola@lumina.co', website: 'lumina.co',
      address: 'Calle 93 #12-45, Bogotá', type: 'instalador', techCount: 2, color: '#2563EB', initials: 'LI',
      taxRate: 19, taxName: 'IVA', quotePrefix: 'CT', woPrefix: 'OT', invoicePrefix: 'FV',
      paymentTerms: 'Pago contra entrega.', quoteValidity: 10, minMargin: 20,
      created_at: iso(addDays(today(), -90))
    });
    db.subscriptions.push({
      id: 'sub_2', tenant_id: T2, plan_id: 'plan_starter', status: 'trial', seats: 5, usedSeats: 2,
      startedAt: iso(addDays(today(), -12)), renewsAt: iso(addDays(today(), 2)),
      amount: 39, interval: 'mensual', method: '—'
    });
    db.branches.push({ id: 'br_3', tenant_id: T2, name: 'Sede Bogotá', address: 'Calle 93, Bogotá', phone: '+57 601 555 8800', main: true });

    /* ----- usuarios ----- */
    function U(id, t, name, email, role, extra) {
      return Object.assign({
        id: id, tenant_id: t, name: name, email: email, role: role, branch_id: 'br_1',
        phone: '+58 414 555 ' + (1000 + db.users.length), active: true, twoFA: role === 'owner',
        lastLogin: iso(addDays(today(), -(db.users.length % 4))), created_at: iso(addDays(today(), -400))
      }, extra || {});
    }
    db.users.push(
      U('usr_ana',   T1, 'Ana Guerrero',   'ana@electroandes.com',    'owner'),
      U('usr_luis',  T1, 'Luis Marcano',   'luis@electroandes.com',   'coordinador'),
      U('usr_rosa',  T1, 'Rosa Delgado',   'rosa@electroandes.com',   'ventas'),
      U('usr_jose',  T1, 'José Rondón',    'jose@electroandes.com',   'tecnico',  { technician_id: 'tec_1' }),
      U('usr_pedro', T1, 'Pedro Silva',    'pedro@electroandes.com',  'tecnico',  { technician_id: 'tec_2' }),
      U('usr_maria', T1, 'María Colmenar', 'maria@electroandes.com',  'tecnico',  { technician_id: 'tec_3', branch_id: 'br_2' }),
      U('usr_carl',  T1, 'Carlos Pérez',   'carlos@electroandes.com', 'almacen'),
      U('usr_yani',  T1, 'Yanira Ochoa',   'yanira@electroandes.com', 'finanzas'),
      U('usr_cli1',  T1, 'Gabriel Ruiz',   'gabriel@torresdelparque.com', 'cliente', { customer_id: 'cus_1' }),
      U('usr_cli2',  T1, 'Marta Ovalles',  'marta@panaderialaespiga.com', 'cliente', { customer_id: 'cus_2' }),
      U('usr_l1',    T2, 'Diego Salas',    'diego@lumina.co',         'owner',    { branch_id: 'br_3' }),
      U('usr_l2',    T2, 'Nora Pinto',     'nora@lumina.co',          'tecnico',  { branch_id: 'br_3', technician_id: 'tec_9' })
    );

    /* ----- técnicos §6.11 ----- */
    db.technicians.push(
      { id: 'tec_1', tenant_id: T1, user_id: 'usr_jose', name: 'José Rondón', branch_id: 'br_1',
        type: 'empleado', level: 'Senior', rate: 14, phone: '+58 414 555 2201', zone: 'Caracas Este',
        skills: ['Residencial','Tableros','Iluminación','Puesta a tierra'],
        certifications: [{ name: 'Electricista Clase A', expires: ymd(addDays(today(), 210)) },
                         { name: 'Trabajo en altura', expires: ymd(addDays(today(), 24)) }],
        schedule: 'Lun–Vie 07:00–16:00', vehicle: 'Camioneta #1 (AB-123CD)',
        tools: ['Pinza amperimétrica','Megóhmetro','Set destornilladores aislados'],
        kpi: { puntualidad: 94, completadas: 128, retrabajos: 2, horas: 1240, rating: 4.8 },
        lat: 38, lng: 28, active: true },
      { id: 'tec_2', tenant_id: T1, user_id: 'usr_pedro', name: 'Pedro Silva', branch_id: 'br_1',
        type: 'empleado', level: 'Semi senior', rate: 11, phone: '+58 414 555 2202', zone: 'Caracas Oeste',
        skills: ['Comercial','Canalización','Mantenimiento','Generadores'],
        certifications: [{ name: 'Electricista Clase B', expires: ymd(addDays(today(), 120)) }],
        schedule: 'Lun–Vie 07:00–16:00', vehicle: 'Moto #3',
        tools: ['Multímetro','Taladro percutor'],
        kpi: { puntualidad: 88, completadas: 96, retrabajos: 5, horas: 980, rating: 4.4 },
        lat: 62, lng: 55, active: true },
      { id: 'tec_3', tenant_id: T1, user_id: 'usr_maria', name: 'María Colmenar', branch_id: 'br_2',
        type: 'contratista', level: 'Senior', rate: 15, phone: '+58 424 555 2203', zone: 'Valencia',
        skills: ['Industrial','Tableros','UPS','Termografía'],
        certifications: [{ name: 'Termografía Nivel I', expires: ymd(addDays(today(), 400)) },
                         { name: 'Seguridad eléctrica NFPA 70E', expires: ymd(addDays(today(), -6)) }],
        schedule: 'Lun–Sáb 08:00–17:00', vehicle: 'Propio',
        tools: ['Cámara termográfica','Analizador de redes'],
        kpi: { puntualidad: 97, completadas: 74, retrabajos: 1, horas: 720, rating: 4.9 },
        lat: 25, lng: 70, active: true },
      { id: 'tec_9', tenant_id: T2, user_id: 'usr_l2', name: 'Nora Pinto', branch_id: 'br_3',
        type: 'empleado', level: 'Junior', rate: 9, phone: '+57 310 555 0099', zone: 'Bogotá Norte',
        skills: ['Residencial'], certifications: [], schedule: 'Lun–Vie 08:00–17:00', vehicle: '—', tools: [],
        kpi: { puntualidad: 90, completadas: 12, retrabajos: 0, horas: 110, rating: 4.5 },
        lat: 50, lng: 50, active: true }
    );
    db.absences.push(
      { id: 'abs_1', tenant_id: T1, technician_id: 'tec_2', from: ymd(addDays(today(), 9)), to: ymd(addDays(today(), 13)), reason: 'Vacaciones' }
    );

    /* ----- clientes, contactos, ubicaciones §6.2 ----- */
    db.customers.push(
      { id: 'cus_1', tenant_id: T1, kind: 'empresa', name: 'Torres del Parque', taxId: 'J-30112233-4',
        type: 'comercial', email: 'admin@torresdelparque.com', phone: '+58 212 555 7710', whatsapp: '+58 412 555 7710',
        address: 'Av. Andrés Bello, Torre A, Caracas', tags: ['Condominio','Contrato anual'], source: 'Referido',
        owner_user_id: 'usr_rosa', paymentTerms: '30 días', creditLimit: 8000, branch_id: 'br_1',
        notes: 'Administración exige factura a nombre del condominio. Acceso por estacionamiento sótano 1.',
        created_at: iso(addDays(today(), -300)) },
      { id: 'cus_2', tenant_id: T1, kind: 'empresa', name: 'Panadería La Espiga', taxId: 'J-31556677-8',
        type: 'comercial', email: 'marta@panaderialaespiga.com', phone: '+58 212 555 3390', whatsapp: '+58 414 555 3390',
        address: 'Calle Real de Sabana Grande 45, Caracas', tags: ['PYME'], source: 'Google',
        owner_user_id: 'usr_rosa', paymentTerms: 'Contado', creditLimit: 0, branch_id: 'br_1',
        notes: 'Horno eléctrico trifásico; no se puede cortar energía antes de las 14:00.',
        created_at: iso(addDays(today(), -180)) },
      { id: 'cus_3', tenant_id: T1, kind: 'persona', name: 'Familia Hernández', taxId: 'V-12345678',
        type: 'residencial', email: 'jhernandez@mail.com', phone: '+58 414 555 9021', whatsapp: '+58 414 555 9021',
        address: 'Urb. El Cafetal, Qta. Milagros, Caracas', tags: ['Residencial'], source: 'Instagram',
        owner_user_id: 'usr_rosa', paymentTerms: 'Contado', creditLimit: 0, branch_id: 'br_1',
        notes: '', created_at: iso(addDays(today(), -70)) },
      { id: 'cus_4', tenant_id: T1, kind: 'empresa', name: 'Industrias Metalcorp', taxId: 'J-29887766-5',
        type: 'industrial', email: 'mantenimiento@metalcorp.com', phone: '+58 241 555 6600', whatsapp: '',
        address: 'Zona Industrial Norte, Galpón 14, Valencia', tags: ['Industrial','Contrato mantenimiento'], source: 'Licitación',
        owner_user_id: 'usr_ana', paymentTerms: '45 días', creditLimit: 25000, branch_id: 'br_2',
        notes: 'Requiere permiso de trabajo y charla de seguridad antes de cada intervención.',
        created_at: iso(addDays(today(), -240)) },
      { id: 'cus_5', tenant_id: T1, kind: 'empresa', name: 'Constructora Vega', taxId: 'J-40998877-2',
        type: 'constructor', email: 'obras@constructoravega.com', phone: '+58 212 555 1188', whatsapp: '+58 412 555 1188',
        address: 'Av. Francisco de Miranda, Caracas', tags: ['Contratista'], source: 'Referido',
        owner_user_id: 'usr_ana', paymentTerms: '60 días', creditLimit: 40000, branch_id: 'br_1',
        notes: '', created_at: iso(addDays(today(), -120)) },
      { id: 'cus_9', tenant_id: T2, kind: 'persona', name: 'Andrés Beltrán', taxId: 'CC-79123456',
        type: 'residencial', email: 'andres@mail.co', phone: '+57 310 555 4433', whatsapp: '',
        address: 'Cra 15 #85-20, Bogotá', tags: [], source: 'Web', owner_user_id: 'usr_l1',
        paymentTerms: 'Contado', creditLimit: 0, branch_id: 'br_3', notes: '', created_at: iso(addDays(today(), -30)) }
    );
    db.contacts.push(
      { id: 'con_1', tenant_id: T1, customer_id: 'cus_1', name: 'Gabriel Ruiz', role: 'Administrador', email: 'gabriel@torresdelparque.com', phone: '+58 412 555 7711', primary: true },
      { id: 'con_2', tenant_id: T1, customer_id: 'cus_1', name: 'Hilda Paz', role: 'Conserje', email: '', phone: '+58 416 555 7712', primary: false },
      { id: 'con_3', tenant_id: T1, customer_id: 'cus_2', name: 'Marta Ovalles', role: 'Propietaria', email: 'marta@panaderialaespiga.com', phone: '+58 414 555 3390', primary: true },
      { id: 'con_4', tenant_id: T1, customer_id: 'cus_4', name: 'Ing. Raúl Pérez', role: 'Jefe de mantenimiento', email: 'rperez@metalcorp.com', phone: '+58 414 555 6601', primary: true }
    );
    db.sites.push(
      { id: 'sit_1', tenant_id: T1, customer_id: 'cus_1', name: 'Torre A — Áreas comunes', address: 'Av. Andrés Bello, Torre A, Caracas',
        propertyType: 'Edificio residencial', access: 'Portería 24h. Solicitar llave del cuarto de tableros.', lat: 30, lng: 24, notes: 'Tablero principal en sótano 1.' },
      { id: 'sit_2', tenant_id: T1, customer_id: 'cus_1', name: 'Torre B — Sala de bombas', address: 'Av. Andrés Bello, Torre B, Caracas',
        propertyType: 'Edificio residencial', access: 'Acceso por sótano 2.', lat: 34, lng: 30, notes: '' },
      { id: 'sit_3', tenant_id: T1, customer_id: 'cus_2', name: 'Local Sabana Grande', address: 'Calle Real de Sabana Grande 45, Caracas',
        propertyType: 'Local comercial', access: 'Abre 6:00 a.m.', lat: 55, lng: 40, notes: 'Acometida trifásica 100 A.' },
      { id: 'sit_4', tenant_id: T1, customer_id: 'cus_3', name: 'Casa principal', address: 'Urb. El Cafetal, Qta. Milagros, Caracas',
        propertyType: 'Vivienda unifamiliar', access: 'Timbre. Perro en el jardín.', lat: 68, lng: 62, notes: '' },
      { id: 'sit_5', tenant_id: T1, customer_id: 'cus_4', name: 'Planta Norte', address: 'Zona Industrial Norte, Galpón 14, Valencia',
        propertyType: 'Planta industrial', access: 'Permiso de trabajo obligatorio.', lat: 22, lng: 74, notes: 'Subestación 500 kVA.' },
      { id: 'sit_6', tenant_id: T1, customer_id: 'cus_5', name: 'Obra Residencias Aurora', address: 'Av. Río de Janeiro, Caracas',
        propertyType: 'Obra en construcción', access: 'Casco y botas obligatorios.', lat: 48, lng: 18, notes: '' },
      { id: 'sit_9', tenant_id: T2, customer_id: 'cus_9', name: 'Apartamento 402', address: 'Cra 15 #85-20, Bogotá',
        propertyType: 'Apartamento', access: '', lat: 50, lng: 50, notes: '' }
    );

    /* ----- catálogo de servicios §6.5 ----- */
    function S(id, t, name, cat, unit, price, cost, dur, mats, chk, war) {
      return { id: id, tenant_id: t, name: name, category: cat, unit: unit, price: price, cost: cost,
               duration: dur, materials: mats, checklist: chk, warranty: war, active: true };
    }
    db.services.push(
      S('svc_1', T1, 'Instalación de circuito dedicado', 'Circuitos y tableros', 'punto', 120, 62, 2.5,
        ['prd_1','prd_2','prd_3'], ['Corte seguro de energía','Tendido de cable','Montaje de breaker','Prueba de continuidad','Torque de bornes','Etiquetado','Foto final'], 90),
      S('svc_2', T1, 'Instalación de tomacorriente', 'Circuitos y tableros', 'punto', 35, 16, 0.5,
        ['prd_4','prd_1'], ['Verificar polaridad','Prueba con tester','Foto final'], 90),
      S('svc_3', T1, 'Montaje de tablero eléctrico 12 circuitos', 'Circuitos y tableros', 'servicio', 480, 260, 8,
        ['prd_5','prd_2','prd_1'], ['Fijación del gabinete','Barraje y puesta a tierra','Identificación de circuitos','Medición de aislamiento','Prueba de disparo','Acta de entrega'], 180),
      S('svc_4', T1, 'Mantenimiento preventivo de tablero', 'Mantenimiento', 'servicio', 180, 70, 3,
        ['prd_6'], ['Inspección visual','Limpieza y sopleteado','Reapriete de conexiones','Termografía','Medición de cargas','Informe técnico'], 60),
      S('svc_5', T1, 'Inspección y diagnóstico eléctrico', 'Inspecciones', 'servicio', 90, 35, 1.5,
        [], ['Medición de tensión y corriente','Revisión de protecciones','Verificación de puesta a tierra','Registro fotográfico','Informe de hallazgos'], 0),
      S('svc_6', T1, 'Instalación de luminaria LED', 'Iluminación', 'punto', 28, 12, 0.4,
        ['prd_7'], ['Montaje','Conexión','Prueba de encendido','Foto final'], 90),
      S('svc_7', T1, 'Sistema de puesta a tierra', 'Protección', 'servicio', 620, 340, 10,
        ['prd_8','prd_9'], ['Excavación','Instalación de electrodos','Soldadura exotérmica','Medición de resistencia (<25Ω)','Certificado de medición'], 365),
      S('svc_8', T1, 'Mantenimiento de planta eléctrica', 'Generadores y respaldo', 'servicio', 350, 160, 5,
        ['prd_10'], ['Cambio de aceite y filtros','Prueba de arranque','Medición de transferencia','Revisión de baterías','Informe'], 90),
      S('svc_9', T1, 'Canalización eléctrica EMT', 'Canalización', 'metro', 18, 8, 0.25,
        ['prd_11','prd_12'], ['Trazado','Fijación de grapas','Curvado','Alineación','Foto final'], 90),
      S('svc_10', T1, 'Atención de emergencia eléctrica', 'Emergencias', 'hora', 65, 25, 1,
        [], ['Diagnóstico','Aseguramiento del área','Reparación provisional o definitiva','Recomendaciones'], 30),
      S('svc_90', T2, 'Instalación de tomacorriente', 'Circuitos', 'punto', 30, 14, 0.5, [], ['Prueba con tester'], 60)
    );

    /* ----- inventario §6.12 ----- */
    db.warehouses.push(
      { id: 'wh_1', tenant_id: T1, name: 'Almacén Caracas', type: 'almacen', address: 'Los Ruices, Caracas' },
      { id: 'wh_2', tenant_id: T1, name: 'Camioneta #1 — José', type: 'vehiculo', address: 'Móvil' },
      { id: 'wh_3', tenant_id: T1, name: 'Almacén Valencia', type: 'almacen', address: 'Valencia' },
      { id: 'wh_9', tenant_id: T2, name: 'Bodega Bogotá', type: 'almacen', address: 'Bogotá' }
    );
    function P(id, t, sku, name, cat, unit, cost, price, stock, min, max, brand) {
      return { id: id, tenant_id: t, sku: sku, name: name, category: cat, unit: unit, cost: cost,
               price: price, brand: brand || '', min: min, max: max, barcode: '77' + sku.replace(/\D/g, '') + '001',
               stock: stock, reserved: 0, active: true };
    }
    db.products.push(
      P('prd_1',  T1, 'CBL-12-THHN', 'Cable THHN #12 AWG (m)',            'Conductores',  'm',   0.85, 1.6,  { wh_1: 1200, wh_2: 180, wh_3: 400 }, 500, 3000, 'Cabel'),
      P('prd_2',  T1, 'BRK-1P-20',   'Breaker 1P 20 A enchufable',        'Protecciones', 'und', 6.4,  12,   { wh_1: 48,  wh_2: 12,  wh_3: 20 },  30, 150, 'Schneider'),
      P('prd_3',  T1, 'TUB-EMT-12',  'Tubería EMT 1/2" (3 m)',            'Canalización', 'und', 4.2,  8,    { wh_1: 60,  wh_2: 10,  wh_3: 25 },  40, 200, 'Conduit'),
      P('prd_4',  T1, 'TOM-DUP-15',  'Tomacorriente doble polarizado 15 A','Salidas',     'und', 2.1,  4.5,  { wh_1: 140, wh_2: 30,  wh_3: 50 },  60, 300, 'Leviton'),
      P('prd_5',  T1, 'TAB-12C',     'Tablero 12 circuitos c/ barra',     'Tableros',     'und', 78,   145,  { wh_1: 6,   wh_2: 0,   wh_3: 3 },   5,  20,  'Eaton'),
      P('prd_6',  T1, 'KIT-MNT-TB',  'Kit mantenimiento tablero',         'Consumibles',  'kit', 14,   30,   { wh_1: 18,  wh_2: 4,   wh_3: 6 },   10, 40,  ''),
      P('prd_7',  T1, 'LUM-LED-18',  'Luminaria LED 18 W empotrable',     'Iluminación',  'und', 9.5,  19,   { wh_1: 22,  wh_2: 8,   wh_3: 14 },  40, 150, 'Philips'),
      P('prd_8',  T1, 'ELE-TIE-58',  'Electrodo de tierra 5/8" x 2,4 m',  'Puesta a tierra','und',16,   32,   { wh_1: 9,   wh_2: 2,   wh_3: 4 },   8,  30,  'Erico'),
      P('prd_9',  T1, 'CBL-2-DES',   'Cable desnudo #2 AWG (m)',          'Conductores',  'm',   2.4,  4.6,  { wh_1: 85,  wh_2: 0,   wh_3: 30 },  60, 300, 'Cabel'),
      P('prd_10', T1, 'FIL-GEN-K',   'Kit filtros planta eléctrica',      'Generadores',  'kit', 42,   85,   { wh_1: 3,   wh_2: 0,   wh_3: 1 },   4,  12,  'Perkins'),
      P('prd_11', T1, 'GRP-EMT-12',  'Grapa EMT 1/2"',                    'Canalización', 'und', 0.22, 0.6,  { wh_1: 480, wh_2: 120, wh_3: 200 }, 200,1500, ''),
      P('prd_12', T1, 'CUR-EMT-12',  'Curva EMT 1/2" 90°',                'Canalización', 'und', 0.95, 2.1,  { wh_1: 70,  wh_2: 18,  wh_3: 26 },  50, 250, ''),
      P('prd_90', T2, 'TOM-15',      'Tomacorriente 15 A',                'Salidas',      'und', 2,    4,    { wh_9: 40 }, 20, 100, '')
    );
    db.products.forEach(function (p) {
      p.kits = [];
    });

    /* ----- proveedores y compras §6.13 ----- */
    db.vendors.push(
      { id: 'ven_1', tenant_id: T1, name: 'Eléctricos del Centro', taxId: 'J-30445566-1', contact: 'Sr. Arturo Ruiz',
        email: 'ventas@electricoscentro.com', phone: '+58 212 555 2200', address: 'Catia, Caracas', terms: '15 días', rating: 4.5 },
      { id: 'ven_2', tenant_id: T1, name: 'Importadora Voltio', taxId: 'J-31778899-3', contact: 'Ing. Lucía Mena',
        email: 'compras@voltio.com', phone: '+58 212 555 4411', address: 'La Yaguara, Caracas', terms: 'Contado', rating: 4.1 },
      { id: 'ven_3', tenant_id: T1, name: 'Suministros Valencia', taxId: 'J-29556644-9', contact: 'Sra. Elena Prado',
        email: 'ventas@suvalencia.com', phone: '+58 241 555 7733', address: 'Valencia', terms: '30 días', rating: 3.9 }
    );
    db.purchaseOrders.push(
      { id: 'po_1', tenant_id: T1, number: 'OC-2026-0011', vendor_id: 'ven_1', status: 'RECEIVED',
        date: ymd(addDays(today(), -14)), expected: ymd(addDays(today(), -9)), warehouse_id: 'wh_1',
        project_id: 'prj_1', createdBy: 'usr_carl', approvedBy: 'usr_ana', notes: '',
        items: [{ product_id: 'prd_1', qty: 600, cost: 0.83, received: 600 },
                { product_id: 'prd_2', qty: 24, cost: 6.2, received: 24 }] },
      { id: 'po_2', tenant_id: T1, number: 'OC-2026-0012', vendor_id: 'ven_2', status: 'PARTIAL',
        date: ymd(addDays(today(), -4)), expected: ymd(addDays(today(), 1)), warehouse_id: 'wh_1',
        project_id: null, createdBy: 'usr_carl', approvedBy: 'usr_ana', notes: 'Pendiente saldo de luminarias.',
        items: [{ product_id: 'prd_7', qty: 60, cost: 9.2, received: 20 },
                { product_id: 'prd_12', qty: 100, cost: 0.9, received: 100 }] },
      { id: 'po_3', tenant_id: T1, number: 'OC-2026-0013', vendor_id: 'ven_3', status: 'PENDING',
        date: ymd(today()), expected: ymd(addDays(today(), 5)), warehouse_id: 'wh_3',
        project_id: null, createdBy: 'usr_carl', approvedBy: null, notes: 'Requiere aprobación por monto > $500.',
        items: [{ product_id: 'prd_5', qty: 6, cost: 76, received: 0 },
                { product_id: 'prd_8', qty: 12, cost: 15.5, received: 0 }] }
    );

    /* ----- solicitudes / leads §6.3 ----- */
    db.requests.push(
      { id: 'req_1', tenant_id: T1, number: 'SOL-2026-0041', customer_id: 'cus_1', site_id: 'sit_2',
        channel: 'Portal cliente', service: 'Mantenimiento', title: 'Falla intermitente en bombas de agua',
        description: 'El tablero de las bombas dispara el breaker principal dos o tres veces al día. Ya cambiamos el breaker y sigue.',
        priority: 'alta', status: 'QUOTING', owner_user_id: 'usr_rosa', due: ymd(addDays(today(), 2)),
        files: ['tablero-bombas.jpg'], created_at: iso(addDays(today(), -3)), lostReason: '' },
      { id: 'req_2', tenant_id: T1, number: 'SOL-2026-0042', customer_id: 'cus_3', site_id: 'sit_4',
        channel: 'WhatsApp', service: 'Instalación', title: 'Puntos eléctricos para cocina nueva',
        description: 'Necesito 3 tomacorrientes 20 A para cocina y un circuito dedicado para el horno.',
        priority: 'normal', status: 'SCHEDULED', owner_user_id: 'usr_rosa', due: ymd(addDays(today(), 6)),
        files: [], created_at: iso(addDays(today(), -2)), lostReason: '' },
      { id: 'req_3', tenant_id: T1, number: 'SOL-2026-0043', customer_id: null, site_id: null,
        channel: 'Web', service: 'Inspección', title: 'Lead: Clínica Los Samanes — inspección general',
        leadName: 'Clínica Los Samanes', leadEmail: 'admin@clinicalossamanes.com', leadPhone: '+58 212 555 9090',
        description: 'Solicitan inspección eléctrica general previa a ampliación del área de emergencias.',
        priority: 'normal', status: 'NEW', owner_user_id: 'usr_rosa', due: ymd(addDays(today(), 4)),
        files: [], created_at: iso(addDays(today(), -1)), lostReason: '' },
      { id: 'req_4', tenant_id: T1, number: 'SOL-2026-0044', customer_id: 'cus_2', site_id: 'sit_3',
        channel: 'Teléfono', service: 'Emergencia', title: 'Sin energía en zona de hornos',
        description: 'Se fue la energía del área de hornos esta mañana.',
        priority: 'critica', status: 'WON', owner_user_id: 'usr_luis', due: ymd(today()),
        files: [], created_at: iso(addDays(today(), -6)), lostReason: '' },
      { id: 'req_5', tenant_id: T1, number: 'SOL-2026-0045', customer_id: 'cus_5', site_id: 'sit_6',
        channel: 'Manual', service: 'Instalación', title: 'Acometida provisional de obra',
        description: 'Requieren acometida provisional trifásica para la obra Aurora.',
        priority: 'normal', status: 'LOST', owner_user_id: 'usr_ana', due: ymd(addDays(today(), -8)),
        files: [], created_at: iso(addDays(today(), -25)), lostReason: 'Precio — contrataron a otro proveedor' },
      { id: 'req_9', tenant_id: T2, number: 'SOL-2026-0003', customer_id: 'cus_9', site_id: 'sit_9',
        channel: 'Web', service: 'Instalación', title: 'Cambio de tomas en apartamento',
        description: 'Cambiar 8 tomacorrientes.', priority: 'normal', status: 'NEW', owner_user_id: 'usr_l1',
        due: ymd(addDays(today(), 3)), files: [], created_at: iso(addDays(today(), -1)), lostReason: '' }
    );

    /* ----- inspecciones §6.4 ----- */
    db.inspections.push(
      { id: 'ins_1', tenant_id: T1, number: 'INS-2026-0018', request_id: 'req_1', customer_id: 'cus_1', site_id: 'sit_2',
        technician_id: 'tec_1', date: at(-2, 9, 0), status: 'COMPLETED', template: 'Tablero y protecciones',
        answers: [
          { q: 'Tensión L1-N', a: '121 V', ok: true },
          { q: 'Tensión L2-N', a: '118 V', ok: true },
          { q: 'Corriente de carga', a: '46 A (nominal 40 A)', ok: false },
          { q: 'Resistencia de aislamiento', a: '0,9 MΩ', ok: false },
          { q: 'Puesta a tierra', a: '18 Ω', ok: true },
          { q: 'Estado de borneras', a: 'Bornes flojos y con oxidación', ok: false }
        ],
        risks: ['Sobrecarga del circuito de bombas','Aislamiento degradado en el cable de alimentación','Riesgo de arco por bornes flojos'],
        recommendations: 'Sustituir el tramo de cable de alimentación, redimensionar la protección a 50 A y reapretar todo el barraje. Se recomienda mantenimiento preventivo semestral.',
        photos: ['tablero-general.jpg','bornes-oxidados.jpg','medicion-aislamiento.jpg'],
        signature: true, created_at: iso(addDays(today(), -2)) },
      { id: 'ins_2', tenant_id: T1, number: 'INS-2026-0019', request_id: 'req_2', customer_id: 'cus_3', site_id: 'sit_4',
        technician_id: 'tec_2', date: at(3, 14, 0), status: 'SCHEDULED', template: 'Levantamiento residencial',
        answers: [], risks: [], recommendations: '', photos: [], signature: false, created_at: iso(addDays(today(), -1)) }
    );

    /* ----- presupuestos §6.6 ----- */
    function Q(id, t, num, cus, sit, status, ver, items, opts) {
      opts = opts || {};
      return Object.assign({
        id: id, tenant_id: t, number: num, customer_id: cus, site_id: sit, contact_id: null,
        status: status, version: ver, currency: 'USD', taxRate: 16,
        discount: opts.discount || 0, items: items,
        scope: opts.scope || '', exclusions: opts.exclusions || '', terms: opts.terms || '',
        warranty: opts.warranty || '90 días sobre mano de obra y materiales instalados.',
        validUntil: opts.validUntil, owner_user_id: opts.owner || 'usr_rosa',
        request_id: opts.request || null, inspection_id: opts.inspection || null,
        advance: opts.advance || 50, notes: opts.notes || '',
        history: opts.history || [], created_at: opts.created || iso(addDays(today(), -5))
      });
    }
    db.quotes.push(
      Q('quo_1', T1, 'COT-2026-0087', 'cus_1', 'sit_2', 'SENT', 2, [
        { type: 'servicio', ref: 'svc_3', desc: 'Reemplazo de tablero de bombas 12 circuitos', qty: 1, unit: 'servicio', price: 480, cost: 260 },
        { type: 'material', ref: 'prd_9', desc: 'Cable desnudo #2 AWG para barraje', qty: 12, unit: 'm', price: 4.6, cost: 2.4 },
        { type: 'servicio', ref: 'svc_4', desc: 'Mantenimiento preventivo del tablero general', qty: 1, unit: 'servicio', price: 180, cost: 70 },
        { type: 'mano_obra', ref: null, desc: 'Cuadrilla 2 técnicos — jornada adicional', qty: 8, unit: 'hora', price: 22, cost: 12 }
      ], {
        scope: 'Sustitución del tablero de la sala de bombas de la Torre B, incluyendo barraje de tierra, identificación de circuitos y pruebas de funcionamiento.',
        exclusions: 'No incluye obra civil, pintura ni sustitución de las bombas.',
        terms: 'Pago 50% al aprobar y 50% contra entrega. Los trabajos se ejecutan en horario diurno de lunes a viernes.',
        validUntil: ymd(addDays(today(), 4)), request: 'req_1', inspection: 'ins_1',
        history: [
          { v: 1, at: iso(addDays(today(), -5)), by: 'usr_rosa', note: 'Versión inicial' },
          { v: 2, at: iso(addDays(today(), -3)), by: 'usr_rosa', note: 'Se agregó mantenimiento del tablero general a solicitud del cliente' }
        ], created: iso(addDays(today(), -5))
      }),
      Q('quo_2', T1, 'COT-2026-0088', 'cus_3', 'sit_4', 'DRAFT', 1, [
        { type: 'servicio', ref: 'svc_1', desc: 'Circuito dedicado para horno eléctrico', qty: 1, unit: 'punto', price: 120, cost: 62 },
        { type: 'servicio', ref: 'svc_2', desc: 'Tomacorriente 20 A en mesón de cocina', qty: 3, unit: 'punto', price: 35, cost: 16 }
      ], { scope: 'Adecuación eléctrica de cocina.', validUntil: ymd(addDays(today(), 15)), request: 'req_2', created: iso(addDays(today(), -1)) }),
      Q('quo_3', T1, 'COT-2026-0085', 'cus_4', 'sit_5', 'APPROVED', 1, [
        { type: 'servicio', ref: 'svc_4', desc: 'Mantenimiento preventivo — 6 tableros de planta', qty: 6, unit: 'servicio', price: 180, cost: 70 },
        { type: 'servicio', ref: 'svc_8', desc: 'Mantenimiento de planta eléctrica 250 kVA', qty: 1, unit: 'servicio', price: 350, cost: 160 },
        { type: 'material', ref: 'prd_10', desc: 'Kit de filtros', qty: 1, unit: 'kit', price: 85, cost: 42 }
      ], { scope: 'Programa de mantenimiento preventivo trimestral.', validUntil: ymd(addDays(today(), 20)),
           owner: 'usr_ana', created: iso(addDays(today(), -18)),
           history: [{ v: 1, at: iso(addDays(today(), -18)), by: 'usr_ana', note: 'Versión inicial' }] }),
      Q('quo_4', T1, 'COT-2026-0082', 'cus_5', 'sit_6', 'EXPIRED', 3, [
        { type: 'servicio', ref: 'svc_9', desc: 'Canalización EMT obra Aurora', qty: 320, unit: 'm', price: 18, cost: 8 }
      ], { validUntil: ymd(addDays(today(), -6)), owner: 'usr_ana', created: iso(addDays(today(), -30)) }),
      Q('quo_5', T1, 'COT-2026-0089', 'cus_2', 'sit_3', 'APPROVED', 1, [
        { type: 'servicio', ref: 'svc_10', desc: 'Atención de emergencia — zona de hornos', qty: 3, unit: 'hora', price: 65, cost: 25 },
        { type: 'material', ref: 'prd_2', desc: 'Breaker 1P 20 A', qty: 2, unit: 'und', price: 12, cost: 6.4 }
      ], { validUntil: ymd(addDays(today(), 10)), created: iso(addDays(today(), -6)) })
    );

    /* ----- proyectos §6.7 ----- */
    db.projects.push(
      { id: 'prj_1', tenant_id: T1, code: 'PRY-2026-007', name: 'Mantenimiento preventivo anual Metalcorp',
        customer_id: 'cus_4', site_id: 'sit_5', quote_id: 'quo_3', manager_user_id: 'usr_luis',
        team: ['tec_3', 'tec_2'], status: 'ACTIVE', progress: 45,
        start: ymd(addDays(today(), -12)), end: ymd(addDays(today(), 26)),
        realStart: ymd(addDays(today(), -12)), realEnd: null,
        budget: 1515, cost: 0, branch_id: 'br_2',
        description: 'Programa trimestral de mantenimiento preventivo de tableros y planta eléctrica de la Planta Norte.',
        changeOrders: [{ id: 'co_1', desc: 'Termografía adicional en subestación', amount: 240, status: 'Aprobado', date: ymd(addDays(today(), -4)) }] },
      { id: 'prj_2', tenant_id: T1, code: 'PRY-2026-008', name: 'Adecuación eléctrica Torres del Parque',
        customer_id: 'cus_1', site_id: 'sit_1', quote_id: null, manager_user_id: 'usr_luis',
        team: ['tec_1'], status: 'PLANNING', progress: 5,
        start: ymd(addDays(today(), 7)), end: ymd(addDays(today(), 40)),
        realStart: null, realEnd: null, budget: 4200, cost: 0, branch_id: 'br_1',
        description: 'Renovación de tableros y alumbrado de áreas comunes de ambas torres.', changeOrders: [] }
    );
    db.milestones.push(
      { id: 'mil_1', tenant_id: T1, project_id: 'prj_1', name: 'Inspección inicial y termografía', due: ymd(addDays(today(), -8)), done: true },
      { id: 'mil_2', tenant_id: T1, project_id: 'prj_1', name: 'Mantenimiento tableros 1 al 3', due: ymd(addDays(today(), -2)), done: true },
      { id: 'mil_3', tenant_id: T1, project_id: 'prj_1', name: 'Mantenimiento tableros 4 al 6', due: ymd(addDays(today(), 8)), done: false },
      { id: 'mil_4', tenant_id: T1, project_id: 'prj_1', name: 'Mantenimiento de planta eléctrica', due: ymd(addDays(today(), 18)), done: false },
      { id: 'mil_5', tenant_id: T1, project_id: 'prj_1', name: 'Informe final y acta de entrega', due: ymd(addDays(today(), 25)), done: false },
      { id: 'mil_6', tenant_id: T1, project_id: 'prj_2', name: 'Levantamiento y diseño', due: ymd(addDays(today(), 12)), done: false },
      { id: 'mil_7', tenant_id: T1, project_id: 'prj_2', name: 'Suministro de materiales', due: ymd(addDays(today(), 20)), done: false }
    );

    /* ----- órdenes de trabajo §6.8 ----- */
    function WO(o) {
      var base = {
        tenant_id: T1, branch_id: 'br_1', project_id: null, quote_id: null, request_id: null,
        priority: 'normal', type: 'instalacion', technicians: [], helpers: [],
        checklist: [], materials: [], timeEntries: [], photos: [], signature: null,
        result: '', observations: '', recommendations: '', internalNotes: '',
        history: [], created_at: iso(addDays(today(), -2)), createdBy: 'usr_luis'
      };
      return Object.assign(base, o);
    }
    function chk(list, doneCount) {
      return list.map(function (c, i) { return { text: c, done: i < (doneCount || 0), required: true }; });
    }
    db.workOrders.push(
      WO({ id: 'wo_1', number: 'OT-2026-000121', customer_id: 'cus_1', site_id: 'sit_2',
        title: 'Reapriete y limpieza de tablero de bombas', type: 'mantenimiento', priority: 'alta',
        status: 'IN_PROGRESS', start: at(0, 8, 0), end: at(0, 11, 0), estimated: 3,
        technicians: ['tec_1'], service_id: 'svc_4',
        description: 'Atender disparos intermitentes detectados en la inspección INS-2026-0018.',
        checklist: chk(['Inspección visual','Limpieza y sopleteado','Reapriete de conexiones','Termografía','Medición de cargas','Informe técnico'], 3),
        materials: [{ product_id: 'prd_6', planned: 1, used: 1, warehouse_id: 'wh_2' }],
        timeEntries: [{ type: 'viaje', from: at(0, 7, 30), to: at(0, 8, 5), min: 35 },
                      { type: 'trabajo', from: at(0, 8, 5), to: null, min: null }],
        photos: [{ tag: 'antes', name: 'tablero-antes.jpg' }, { tag: 'durante', name: 'reapriete.jpg' }],
        history: [
          { status: 'DRAFT', at: iso(addDays(today(), -3)), by: 'usr_luis', note: 'Creada desde inspección' },
          { status: 'SCHEDULED', at: iso(addDays(today(), -3)), by: 'usr_luis', note: '' },
          { status: 'ASSIGNED', at: iso(addDays(today(), -2)), by: 'usr_luis', note: 'Asignada a José Rondón' },
          { status: 'EN_ROUTE', at: at(0, 7, 30), by: 'usr_jose', note: '' },
          { status: 'ON_SITE', at: at(0, 8, 5), by: 'usr_jose', note: '' },
          { status: 'IN_PROGRESS', at: at(0, 8, 10), by: 'usr_jose', note: '' }
        ] }),
      WO({ id: 'wo_2', number: 'OT-2026-000122', customer_id: 'cus_3', site_id: 'sit_4',
        title: 'Inspección técnica para adecuación de cocina', type: 'inspeccion', priority: 'normal',
        status: 'ASSIGNED', start: at(0, 14, 0), end: at(0, 15, 30), estimated: 1.5,
        technicians: ['tec_2'], service_id: 'svc_5', request_id: 'req_2',
        description: 'Levantamiento de puntos y verificación de capacidad del tablero existente.',
        checklist: chk(['Medición de tensión y corriente','Revisión de protecciones','Verificación de puesta a tierra','Registro fotográfico','Informe de hallazgos'], 0),
        history: [
          { status: 'DRAFT', at: iso(addDays(today(), -2)), by: 'usr_rosa', note: '' },
          { status: 'SCHEDULED', at: iso(addDays(today(), -2)), by: 'usr_luis', note: '' },
          { status: 'ASSIGNED', at: iso(addDays(today(), -1)), by: 'usr_luis', note: 'Asignada a Pedro Silva' }
        ] }),
      WO({ id: 'wo_3', number: 'OT-2026-000123', customer_id: 'cus_4', site_id: 'sit_5', branch_id: 'br_2',
        title: 'Mantenimiento preventivo tableros 4 al 6', type: 'mantenimiento', priority: 'normal',
        status: 'SCHEDULED', start: at(2, 8, 0), end: at(2, 16, 0), estimated: 8,
        technicians: ['tec_3'], service_id: 'svc_4', project_id: 'prj_1',
        description: 'Tercera jornada del programa preventivo trimestral.',
        checklist: chk(['Inspección visual','Limpieza y sopleteado','Reapriete de conexiones','Termografía','Medición de cargas','Informe técnico'], 0),
        materials: [{ product_id: 'prd_6', planned: 3, used: 0, warehouse_id: 'wh_3' }],
        history: [{ status: 'DRAFT', at: iso(addDays(today(), -5)), by: 'usr_luis', note: '' },
                  { status: 'SCHEDULED', at: iso(addDays(today(), -5)), by: 'usr_luis', note: '' }] }),
      WO({ id: 'wo_4', number: 'OT-2026-000118', customer_id: 'cus_2', site_id: 'sit_3',
        title: 'Emergencia — sin energía en zona de hornos', type: 'emergencia', priority: 'critica',
        status: 'CLOSED', start: at(-6, 10, 0), end: at(-6, 13, 0), estimated: 3,
        technicians: ['tec_1'], service_id: 'svc_10', request_id: 'req_4', quote_id: 'quo_5',
        description: 'Pérdida total de energía en el circuito de hornos.',
        checklist: chk(['Diagnóstico','Aseguramiento del área','Reparación provisional o definitiva','Recomendaciones'], 4),
        materials: [{ product_id: 'prd_2', planned: 2, used: 2, warehouse_id: 'wh_2' }],
        timeEntries: [{ type: 'viaje', from: at(-6, 9, 20), to: at(-6, 10, 0), min: 40 },
                      { type: 'trabajo', from: at(-6, 10, 0), to: at(-6, 12, 50), min: 170 }],
        photos: [{ tag: 'antes', name: 'breaker-quemado.jpg' }, { tag: 'despues', name: 'breaker-nuevo.jpg' }],
        signature: { name: 'Marta Ovalles', at: at(-6, 13, 0) },
        result: 'Breaker principal del circuito de hornos quemado por sobrecarga. Sustituido por dos unidades de 20 A y redistribución de cargas.',
        recommendations: 'Instalar circuito independiente para el segundo horno antes de 60 días.',
        history: [
          { status: 'DRAFT', at: at(-6, 9, 0), by: 'usr_luis', note: '' },
          { status: 'ASSIGNED', at: at(-6, 9, 5), by: 'usr_luis', note: 'Emergencia — asignación inmediata' },
          { status: 'EN_ROUTE', at: at(-6, 9, 20), by: 'usr_jose', note: '' },
          { status: 'ON_SITE', at: at(-6, 10, 0), by: 'usr_jose', note: '' },
          { status: 'IN_PROGRESS', at: at(-6, 10, 5), by: 'usr_jose', note: '' },
          { status: 'COMPLETED', at: at(-6, 12, 55), by: 'usr_jose', note: 'Firmada por el cliente' },
          { status: 'REVIEW', at: at(-6, 14, 0), by: 'usr_luis', note: '' },
          { status: 'CLOSED', at: at(-5, 9, 0), by: 'usr_luis', note: 'Validada y facturada' }
        ], created_at: at(-6, 9, 0) }),
      WO({ id: 'wo_5', number: 'OT-2026-000119', customer_id: 'cus_4', site_id: 'sit_5', branch_id: 'br_2',
        title: 'Mantenimiento preventivo tableros 1 al 3', type: 'mantenimiento', priority: 'normal',
        status: 'CLOSED', start: at(-4, 8, 0), end: at(-4, 16, 0), estimated: 8,
        technicians: ['tec_3'], service_id: 'svc_4', project_id: 'prj_1',
        checklist: chk(['Inspección visual','Limpieza y sopleteado','Reapriete de conexiones','Termografía','Medición de cargas','Informe técnico'], 6),
        materials: [{ product_id: 'prd_6', planned: 3, used: 3, warehouse_id: 'wh_3' }],
        timeEntries: [{ type: 'trabajo', from: at(-4, 8, 0), to: at(-4, 15, 30), min: 450 }],
        signature: { name: 'Ing. Raúl Pérez', at: at(-4, 16, 0) },
        result: 'Tres tableros intervenidos sin hallazgos críticos.',
        history: [{ status: 'SCHEDULED', at: iso(addDays(today(), -10)), by: 'usr_luis', note: '' },
                  { status: 'ASSIGNED', at: iso(addDays(today(), -9)), by: 'usr_luis', note: '' },
                  { status: 'COMPLETED', at: at(-4, 15, 40), by: 'usr_maria', note: '' },
                  { status: 'CLOSED', at: at(-3, 10, 0), by: 'usr_luis', note: '' }],
        created_at: iso(addDays(today(), -10)) }),
      WO({ id: 'wo_6', number: 'OT-2026-000124', customer_id: 'cus_1', site_id: 'sit_1',
        title: 'Cambio de 14 luminarias LED en pasillos', type: 'instalacion', priority: 'baja',
        status: 'DRAFT', start: at(4, 9, 0), end: at(4, 13, 0), estimated: 4,
        technicians: [], service_id: 'svc_6',
        description: 'Sustitución de luminarias fluorescentes por LED 18 W.',
        checklist: chk(['Montaje','Conexión','Prueba de encendido','Foto final'], 0),
        materials: [{ product_id: 'prd_7', planned: 14, used: 0, warehouse_id: 'wh_1' }],
        history: [{ status: 'DRAFT', at: iso(addDays(today(), -1)), by: 'usr_luis', note: '' }] }),
      WO({ id: 'wo_7', number: 'OT-2026-000120', customer_id: 'cus_5', site_id: 'sit_6',
        title: 'Revisión de acometida provisional', type: 'inspeccion', priority: 'normal',
        status: 'COMPLETED', start: at(-1, 9, 0), end: at(-1, 11, 0), estimated: 2,
        technicians: ['tec_2'], service_id: 'svc_5',
        checklist: chk(['Medición de tensión y corriente','Revisión de protecciones','Verificación de puesta a tierra','Registro fotográfico','Informe de hallazgos'], 5),
        timeEntries: [{ type: 'trabajo', from: at(-1, 9, 0), to: at(-1, 10, 45), min: 105 }],
        signature: { name: 'Ing. de obra', at: at(-1, 11, 0) },
        result: 'Acometida en condiciones aceptables; se recomienda reforzar el anclaje del tablero de obra.',
        history: [{ status: 'SCHEDULED', at: iso(addDays(today(), -4)), by: 'usr_luis', note: '' },
                  { status: 'ASSIGNED', at: iso(addDays(today(), -3)), by: 'usr_luis', note: '' },
                  { status: 'COMPLETED', at: at(-1, 11, 0), by: 'usr_pedro', note: 'Pendiente de validación' }] }),
      WO({ id: 'wo_8', number: 'OT-2026-000125', customer_id: 'cus_2', site_id: 'sit_3',
        title: 'Instalación de circuito dedicado para segundo horno', type: 'instalacion', priority: 'alta',
        status: 'SCHEDULED', start: at(1, 14, 0), end: at(1, 17, 0), estimated: 3,
        technicians: [], service_id: 'svc_1',
        description: 'Derivado de la recomendación de la OT-2026-000118.',
        checklist: chk(['Corte seguro de energía','Tendido de cable','Montaje de breaker','Prueba de continuidad','Torque de bornes','Etiquetado','Foto final'], 0),
        materials: [{ product_id: 'prd_1', planned: 28, used: 0, warehouse_id: 'wh_1' },
                    { product_id: 'prd_2', planned: 1, used: 0, warehouse_id: 'wh_1' }],
        history: [{ status: 'DRAFT', at: iso(addDays(today(), -1)), by: 'usr_luis', note: '' },
                  { status: 'SCHEDULED', at: iso(addDays(today(), -1)), by: 'usr_luis', note: '' }] }),
      WO({ id: 'wo_9', number: 'OT-2026-000117', customer_id: 'cus_3', site_id: 'sit_4',
        title: 'Revisión de cortocircuito en habitación principal', type: 'correccion', priority: 'alta',
        status: 'CLOSED', start: at(-9, 15, 0), end: at(-9, 17, 0), estimated: 2,
        technicians: ['tec_1'], service_id: 'svc_10',
        checklist: chk(['Diagnóstico','Aseguramiento del área','Reparación provisional o definitiva','Recomendaciones'], 4),
        signature: { name: 'J. Hernández', at: at(-9, 17, 0) },
        result: 'Empalme deteriorado dentro de caja de paso. Reemplazado.',
        history: [{ status: 'CLOSED', at: at(-8, 9, 0), by: 'usr_luis', note: '' }],
        created_at: iso(addDays(today(), -10)) }),
      WO({ id: 'wo_10', tenant_id: T2, branch_id: 'br_3', number: 'OT-2026-000004', customer_id: 'cus_9', site_id: 'sit_9',
        title: 'Cambio de tomacorrientes', type: 'instalacion', priority: 'normal',
        status: 'ASSIGNED', start: at(1, 9, 0), end: at(1, 12, 0), estimated: 3,
        technicians: ['tec_9'], service_id: 'svc_90', createdBy: 'usr_l1',
        checklist: chk(['Prueba con tester'], 0),
        history: [{ status: 'ASSIGNED', at: iso(addDays(today(), -1)), by: 'usr_l1', note: '' }] })
    );

    /* ----- activos §6.16 ----- */
    db.assets.push(
      { id: 'ast_1', tenant_id: T1, customer_id: 'cus_1', site_id: 'sit_2', name: 'Tablero sala de bombas TB-02',
        type: 'Tablero eléctrico', brand: 'Eaton', model: 'BR-1224', serial: 'EA-88231', capacity: '24 circuitos / 125 A',
        installedAt: ymd(addDays(today(), -900)), warrantyUntil: ymd(addDays(today(), -170)), lastService: ymd(addDays(today(), -2)),
        nextService: ymd(addDays(today(), 88)), docs: ['ficha-tecnica-eaton.pdf'], photos: 1 },
      { id: 'ast_2', tenant_id: T1, customer_id: 'cus_4', site_id: 'sit_5', name: 'Planta eléctrica 250 kVA',
        type: 'Generador', brand: 'Perkins', model: 'P250-3', serial: 'PK-556120', capacity: '250 kVA / 400 V',
        installedAt: ymd(addDays(today(), -1500)), warrantyUntil: ymd(addDays(today(), -400)), lastService: ymd(addDays(today(), -95)),
        nextService: ymd(addDays(today(), 18)), docs: ['manual-perkins.pdf','ultimo-informe.pdf'], photos: 3 },
      { id: 'ast_3', tenant_id: T1, customer_id: 'cus_4', site_id: 'sit_5', name: 'UPS sala de servidores',
        type: 'UPS', brand: 'APC', model: 'Smart-UPS 10kVA', serial: 'APC-77120', capacity: '10 kVA',
        installedAt: ymd(addDays(today(), -600)), warrantyUntil: ymd(addDays(today(), 130)), lastService: ymd(addDays(today(), -180)),
        nextService: ymd(addDays(today(), 5)), docs: [], photos: 0 },
      { id: 'ast_4', tenant_id: T1, customer_id: 'cus_2', site_id: 'sit_3', name: 'Tablero principal local',
        type: 'Tablero eléctrico', brand: 'Schneider', model: 'Easy9', serial: 'SC-11234', capacity: '12 circuitos / 100 A',
        installedAt: ymd(addDays(today(), -1200)), warrantyUntil: ymd(addDays(today(), -800)), lastService: ymd(addDays(today(), -6)),
        nextService: ymd(addDays(today(), 174)), docs: [], photos: 2 }
    );

    /* ----- mantenimientos §6.15 ----- */
    db.maintenancePlans.push(
      { id: 'mp_1', tenant_id: T1, name: 'Preventivo trimestral Metalcorp', customer_id: 'cus_4', site_id: 'sit_5',
        asset_id: 'ast_2', service_id: 'svc_8', frequency: 'trimestral', nextDate: ymd(addDays(today(), 18)),
        lastDate: ymd(addDays(today(), -72)), active: true, contract: 'CTR-2026-03', alertDays: 7, technician_id: 'tec_3' },
      { id: 'mp_2', tenant_id: T1, name: 'Preventivo semestral tablero bombas', customer_id: 'cus_1', site_id: 'sit_2',
        asset_id: 'ast_1', service_id: 'svc_4', frequency: 'semestral', nextDate: ymd(addDays(today(), 88)),
        lastDate: ymd(addDays(today(), -2)), active: true, contract: '', alertDays: 14, technician_id: 'tec_1' },
      { id: 'mp_3', tenant_id: T1, name: 'Revisión anual UPS servidores', customer_id: 'cus_4', site_id: 'sit_5',
        asset_id: 'ast_3', service_id: 'svc_4', frequency: 'anual', nextDate: ymd(addDays(today(), 5)),
        lastDate: ymd(addDays(today(), -360)), active: true, contract: 'CTR-2026-03', alertDays: 10, technician_id: 'tec_3' }
    );

    /* ----- facturación §6.14 ----- */
    db.invoices.push(
      { id: 'inv_1', tenant_id: T1, number: 'FAC-2026-0231', customer_id: 'cus_2', quote_id: 'quo_5', wo_id: 'wo_4',
        project_id: null, status: 'PAID', date: ymd(addDays(today(), -5)), due: ymd(addDays(today(), -5)),
        items: [{ desc: 'Atención de emergencia — 3 h', qty: 3, price: 65 }, { desc: 'Breaker 1P 20 A', qty: 2, price: 12 }],
        taxRate: 16, discount: 0, notes: '' },
      { id: 'inv_2', tenant_id: T1, number: 'FAC-2026-0232', customer_id: 'cus_4', quote_id: 'quo_3', wo_id: null,
        project_id: 'prj_1', status: 'PARTIAL', date: ymd(addDays(today(), -12)), due: ymd(addDays(today(), 3)),
        items: [{ desc: 'Anticipo 50% — Programa preventivo trimestral', qty: 1, price: 757.5 }],
        taxRate: 16, discount: 0, notes: 'Anticipo del contrato CTR-2026-03.' },
      { id: 'inv_3', tenant_id: T1, number: 'FAC-2026-0228', customer_id: 'cus_1', quote_id: null, wo_id: 'wo_9',
        project_id: null, status: 'OVERDUE', date: ymd(addDays(today(), -40)), due: ymd(addDays(today(), -10)),
        items: [{ desc: 'Reparación de cortocircuito', qty: 1, price: 130 }, { desc: 'Materiales varios', qty: 1, price: 24 }],
        taxRate: 16, discount: 0, notes: '' },
      { id: 'inv_4', tenant_id: T1, number: 'FAC-2026-0233', customer_id: 'cus_5', quote_id: null, wo_id: 'wo_7',
        project_id: null, status: 'ISSUED', date: ymd(addDays(today(), -1)), due: ymd(addDays(today(), 14)),
        items: [{ desc: 'Inspección de acometida provisional', qty: 1, price: 90 }],
        taxRate: 16, discount: 0, notes: '' }
    );
    db.payments.push(
      { id: 'pay_1', tenant_id: T1, invoice_id: 'inv_1', amount: 254.04, date: ymd(addDays(today(), -5)),
        method: 'Transferencia', ref: 'TRF-88213', notes: '' },
      { id: 'pay_2', tenant_id: T1, invoice_id: 'inv_2', amount: 500, date: ymd(addDays(today(), -10)),
        method: 'Transferencia', ref: 'TRF-77120', notes: 'Abono parcial' }
    );
    db.expenses.push(
      { id: 'exp_1', tenant_id: T1, project_id: 'prj_1', wo_id: null, category: 'Materiales', desc: 'Compra OC-2026-0011',
        amount: 646.8, date: ymd(addDays(today(), -14)), vendor_id: 'ven_1' },
      { id: 'exp_2', tenant_id: T1, project_id: 'prj_1', wo_id: 'wo_5', category: 'Viáticos', desc: 'Traslado Valencia',
        amount: 85, date: ymd(addDays(today(), -4)), vendor_id: null },
      { id: 'exp_3', tenant_id: T1, project_id: null, wo_id: 'wo_4', category: 'Materiales', desc: 'Breakers de emergencia',
        amount: 12.8, date: ymd(addDays(today(), -6)), vendor_id: 'ven_2' }
    );

    /* ----- documentos §6.17 ----- */
    db.documents.push(
      { id: 'doc_1', tenant_id: T1, name: 'Informe de inspección INS-2026-0018.pdf', category: 'Inspecciones',
        customer_id: 'cus_1', site_id: 'sit_2', project_id: null, wo_id: null, visibility: 'cliente',
        version: 1, size: '842 KB', expires: null, uploadedBy: 'usr_jose', date: ymd(addDays(today(), -2)) },
      { id: 'doc_2', tenant_id: T1, name: 'Certificado de puesta a tierra Planta Norte.pdf', category: 'Certificados',
        customer_id: 'cus_4', site_id: 'sit_5', project_id: 'prj_1', wo_id: null, visibility: 'cliente',
        version: 2, size: '1,2 MB', expires: ymd(addDays(today(), 300)), uploadedBy: 'usr_ana', date: ymd(addDays(today(), -60)) },
      { id: 'doc_3', tenant_id: T1, name: 'Plano unifilar Torre A.dwg', category: 'Planos',
        customer_id: 'cus_1', site_id: 'sit_1', project_id: 'prj_2', wo_id: null, visibility: 'interno',
        version: 3, size: '4,6 MB', expires: null, uploadedBy: 'usr_luis', date: ymd(addDays(today(), -30)) },
      { id: 'doc_4', tenant_id: T1, name: 'Permiso de trabajo Metalcorp.pdf', category: 'Permisos',
        customer_id: 'cus_4', site_id: 'sit_5', project_id: 'prj_1', wo_id: null, visibility: 'interno',
        version: 1, size: '320 KB', expires: ymd(addDays(today(), 9)), uploadedBy: 'usr_luis', date: ymd(addDays(today(), -20)) },
      { id: 'doc_5', tenant_id: T1, name: 'Acta de entrega OT-2026-000118.pdf', category: 'Actas',
        customer_id: 'cus_2', site_id: 'sit_3', project_id: null, wo_id: 'wo_4', visibility: 'cliente',
        version: 1, size: '410 KB', expires: null, uploadedBy: 'usr_jose', date: ymd(addDays(today(), -6)) },
      { id: 'doc_6', tenant_id: T1, name: 'Garantía instalación cocina.pdf', category: 'Garantías',
        customer_id: 'cus_3', site_id: 'sit_4', project_id: null, wo_id: 'wo_9', visibility: 'cliente',
        version: 1, size: '180 KB', expires: ymd(addDays(today(), 80)), uploadedBy: 'usr_ana', date: ymd(addDays(today(), -9)) }
    );

    /* ----- incidencias §6.18 ----- */
    db.tickets.push(
      { id: 'tk_1', tenant_id: T1, number: 'INC-2026-0032', customer_id: 'cus_3', site_id: 'sit_4', wo_id: 'wo_9',
        subject: 'Vuelve a saltar el breaker de la habitación', type: 'garantia', priority: 'alta', status: 'IN_PROGRESS',
        sla: ymd(addDays(today(), 1)), assignee: 'tec_1', description: 'Dos semanas después de la reparación volvió a fallar.',
        rootCause: '', resolution: '', reworkCost: 0, created_at: iso(addDays(today(), -1)) },
      { id: 'tk_2', tenant_id: T1, number: 'INC-2026-0031', customer_id: 'cus_1', site_id: 'sit_1', wo_id: null,
        subject: 'Consulta sobre factura vencida FAC-2026-0228', type: 'consulta', priority: 'normal', status: 'WAITING',
        sla: ymd(addDays(today(), 2)), assignee: 'usr_yani', description: 'El condominio pide desglose del trabajo facturado.',
        rootCause: '', resolution: '', reworkCost: 0, created_at: iso(addDays(today(), -3)) },
      { id: 'tk_3', tenant_id: T1, number: 'INC-2026-0029', customer_id: 'cus_4', site_id: 'sit_5', wo_id: 'wo_5',
        subject: 'Etiquetado incompleto en tablero 2', type: 'retrabajo', priority: 'normal', status: 'RESOLVED',
        sla: ymd(addDays(today(), -2)), assignee: 'tec_3', description: 'Faltó identificar 4 circuitos.',
        rootCause: 'Checklist marcado sin verificación final.', resolution: 'Se completó el etiquetado y se reforzó el checklist obligatorio.',
        reworkCost: 45, created_at: iso(addDays(today(), -8)) }
    );

    /* ----- automatizaciones §14.2 ----- */
    db.automations.push(
      { id: 'aut_1', tenant_id: T1, name: 'Recordatorio de presupuesto sin respuesta', when: 'Presupuesto enviado',
        condition: 'Sin respuesta en 3 días', then: ['Enviar email al cliente', 'Crear tarea para ventas'], active: true, runs: 42 },
      { id: 'aut_2', tenant_id: T1, name: 'Aviso de presupuesto por vencer', when: 'Presupuesto por vencer',
        condition: 'Faltan 2 días para la vigencia', then: ['Notificar a ventas', 'Enviar email al cliente'], active: true, runs: 18 },
      { id: 'aut_3', tenant_id: T1, name: 'Recordatorio de visita', when: 'Orden programada para mañana',
        condition: 'Estado = SCHEDULED o ASSIGNED', then: ['Notificar al técnico', 'Enviar email al cliente'], active: true, runs: 210 },
      { id: 'aut_4', tenant_id: T1, name: 'Informe al completar orden', when: 'Orden completada',
        condition: 'Siempre', then: ['Generar PDF de informe', 'Enviar al cliente', 'Solicitar validación'], active: true, runs: 156 },
      { id: 'aut_5', tenant_id: T1, name: 'Cobranza de factura vencida', when: 'Factura vence',
        condition: 'Saldo > 0 y 3 días de vencida', then: ['Email de cobranza', 'Tarea para finanzas', 'Marcar alerta'], active: true, runs: 27 },
      { id: 'aut_6', tenant_id: T1, name: 'Alerta de stock bajo', when: 'Stock bajo mínimo',
        condition: 'Disponible < mínimo', then: ['Alertar a compras', 'Sugerir orden de compra'], active: true, runs: 64 },
      { id: 'aut_7', tenant_id: T1, name: 'Certificación por vencer', when: 'Certificación por vencer',
        condition: 'Faltan 30 días', then: ['Avisar al admin', 'Avisar al técnico'], active: true, runs: 9 },
      { id: 'aut_8', tenant_id: T1, name: 'Mantenimiento próximo', when: 'Mantenimiento próximo',
        condition: 'Según días de alerta del plan', then: ['Crear orden preventiva', 'Notificar al coordinador'], active: false, runs: 31 }
    );

    /* ----- notificaciones §14.1 ----- */
    db.notifications.push(
      { id: 'ntf_1', tenant_id: T1, user_id: 'usr_ana', type: 'danger', title: 'Factura vencida',
        body: 'FAC-2026-0228 de Torres del Parque lleva 10 días vencida.', link: '#facturacion/inv_3', read: false, at: iso(addDays(today(), 0)) },
      { id: 'ntf_2', tenant_id: T1, user_id: 'usr_ana', type: 'warning', title: 'Presupuesto por vencer',
        body: 'COT-2026-0087 vence en 4 días y aún no tiene respuesta.', link: '#presupuestos/quo_1', read: false, at: iso(addDays(today(), 0)) },
      { id: 'ntf_3', tenant_id: T1, user_id: 'usr_ana', type: 'warning', title: 'Stock bajo',
        body: '5 materiales están por debajo del mínimo.', link: '#inventario', read: false, at: iso(addDays(today(), 0)) },
      { id: 'ntf_4', tenant_id: T1, user_id: 'usr_ana', type: 'info', title: 'Orden completada',
        body: 'OT-2026-000120 fue completada y espera validación.', link: '#ordenes/wo_7', read: true, at: iso(addDays(today(), -1)) },
      { id: 'ntf_5', tenant_id: T1, user_id: 'usr_ana', type: 'danger', title: 'Certificación vencida',
        body: 'María Colmenar: NFPA 70E venció hace 6 días.', link: '#tecnicos/tec_3', read: false, at: iso(addDays(today(), -1)) }
    );

    /* ----- actividad / auditoría ----- */
    db.activity.push(
      { id: 'act_1', tenant_id: T1, entity: 'work_order', entity_id: 'wo_1', user_id: 'usr_jose',
        text: 'Cambió el estado a En ejecución', at: at(0, 8, 10), kind: 'status' },
      { id: 'act_2', tenant_id: T1, entity: 'quote', entity_id: 'quo_1', user_id: 'usr_rosa',
        text: 'Envió el presupuesto V2 por correo a gabriel@torresdelparque.com', at: iso(addDays(today(), -3)), kind: 'send' },
      { id: 'act_3', tenant_id: T1, entity: 'invoice', entity_id: 'inv_2', user_id: 'usr_yani',
        text: 'Registró un pago parcial de $500,00', at: iso(addDays(today(), -10)), kind: 'payment' },
      { id: 'act_4', tenant_id: T1, entity: 'inspection', entity_id: 'ins_1', user_id: 'usr_jose',
        text: 'Completó la inspección y cargó 3 fotografías', at: iso(addDays(today(), -2)), kind: 'doc' },
      { id: 'act_5', tenant_id: T1, entity: 'customer', entity_id: 'cus_3', user_id: 'usr_rosa',
        text: 'Creó el cliente Familia Hernández', at: iso(addDays(today(), -70)), kind: 'create' }
    );
    db.audit.push(
      { id: 'aud_1', tenant_id: T1, user_id: 'usr_ana', action: 'UPDATE', entity: 'role_permissions',
        entity_id: 'coordinador', detail: 'Agregó permiso aprobar en módulo ordenes', ip: '190.202.11.4', at: iso(addDays(today(), -7)) },
      { id: 'aud_2', tenant_id: T1, user_id: 'usr_yani', action: 'CREATE', entity: 'payment',
        entity_id: 'pay_2', detail: 'Pago de $500,00 sobre FAC-2026-0232', ip: '190.202.11.9', at: iso(addDays(today(), -10)) },
      { id: 'aud_3', tenant_id: T1, user_id: 'usr_carl', action: 'UPDATE', entity: 'stock_movement',
        entity_id: 'sm_3', detail: 'Ajuste de inventario: -4 und BRK-1P-20', ip: '190.202.11.7', at: iso(addDays(today(), -3)) },
      { id: 'aud_4', tenant_id: T1, user_id: 'usr_ana', action: 'DELETE', entity: 'quote',
        entity_id: 'COT-2026-0084', detail: 'Anuló presupuesto duplicado', ip: '190.202.11.4', at: iso(addDays(today(), -15)) }
    );

    /* ----- movimientos de stock ----- */
    db.stockMovements.push(
      { id: 'sm_1', tenant_id: T1, product_id: 'prd_1', type: 'entrada', qty: 600, warehouse_id: 'wh_1',
        ref: 'OC-2026-0011', user_id: 'usr_carl', at: iso(addDays(today(), -9)), notes: '' },
      { id: 'sm_2', tenant_id: T1, product_id: 'prd_2', type: 'consumo', qty: -2, warehouse_id: 'wh_2',
        ref: 'OT-2026-000118', user_id: 'usr_jose', at: at(-6, 12, 0), notes: '' },
      { id: 'sm_3', tenant_id: T1, product_id: 'prd_2', type: 'ajuste', qty: -4, warehouse_id: 'wh_1',
        ref: 'Conteo cíclico', user_id: 'usr_carl', at: iso(addDays(today(), -3)), notes: 'Diferencia en conteo físico' },
      { id: 'sm_4', tenant_id: T1, product_id: 'prd_6', type: 'transferencia', qty: 4, warehouse_id: 'wh_2',
        ref: 'Almacén Caracas → Camioneta #1', user_id: 'usr_carl', at: iso(addDays(today(), -5)), notes: '' },
      { id: 'sm_5', tenant_id: T1, product_id: 'prd_6', type: 'consumo', qty: -3, warehouse_id: 'wh_3',
        ref: 'OT-2026-000119', user_id: 'usr_maria', at: at(-4, 15, 0), notes: '' }
    );

    db.counters[T1] = { quote: 89, wo: 125, invoice: 233, request: 45, inspection: 19, ticket: 32, po: 13, project: 8 };
    db.counters[T2] = { quote: 3, wo: 4, invoice: 2, request: 3, inspection: 1, ticket: 1, po: 1, project: 1 };
    db.seededAt = iso(new Date());
    return db;
  }

  /* ============================================================
     DB + API
     ============================================================ */
  var db = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); if (db && db.tenants) return db; }
    } catch (e) { /* storage bloqueado */ }
    db = seed();
    save();
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* cuota / modo privado */ }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} db = seed(); save(); }

  /* ---------- sesión ---------- */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(SESSION, JSON.stringify(s)); } catch (e) {}
  }
  function logout() { try { localStorage.removeItem(SESSION); } catch (e) {} }

  function login(email, userId) {
    // La autenticación es previa al tenant: se busca en la tabla global,
    // sin el filtro de aislamiento que aplica byId().
    var u = userId ? db.users.filter(function (x) { return x.id === userId; })[0]
                   : db.users.filter(function (x) { return x.email.toLowerCase() === String(email).toLowerCase(); })[0];
    if (!u) return null;
    u.lastLogin = iso(new Date());
    var s = { user_id: u.id, tenant_id: u.tenant_id, role: u.role, at: iso(new Date()) };
    setSession(s); save();
    return s;
  }

  /* ---------- consultas con aislamiento de tenant (§13) ---------- */
  function tenantId() { var s = getSession(); return s ? s.tenant_id : null; }
  function all(coll, tid) {
    tid = tid || tenantId();
    var rows = db[coll] || [];
    if (!rows.length || rows[0].tenant_id === undefined) return rows.slice();
    return rows.filter(function (r) { return r.tenant_id === tid; });
  }
  function byId(coll, id) {
    var r = (db[coll] || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return null;
    // Aislamiento: nunca devolver un registro de otro tenant (§18.1)
    if (r.tenant_id !== undefined && tenantId() && r.tenant_id !== tenantId()) return null;
    return r;
  }
  function where(coll, fn) { return all(coll).filter(fn); }
  function insert(coll, row) {
    row.id = row.id || uid(coll.slice(0, 3));
    row.tenant_id = row.tenant_id || tenantId();
    row.created_at = row.created_at || iso(new Date());
    row.created_by = row.created_by || (getSession() || {}).user_id;
    db[coll].push(row); save();
    return row;
  }
  function update(coll, id, patch) {
    var r = byId(coll, id); if (!r) return null;
    Object.assign(r, patch, { updated_at: iso(new Date()) });
    save(); return r;
  }
  function remove(coll, id) {
    var r = byId(coll, id); if (!r) return false;
    db[coll] = db[coll].filter(function (x) { return x.id !== id; });
    save(); return true;
  }

  function nextNumber(kind) {
    var t = tenantId(), tn = byId('tenants', t) || {};
    db.counters[t] = db.counters[t] || {};
    db.counters[t][kind] = (db.counters[t][kind] || 0) + 1;
    var n = db.counters[t][kind], y = new Date().getFullYear();
    var pref = { quote: tn.quotePrefix || 'COT', wo: tn.woPrefix || 'OT', invoice: tn.invoicePrefix || 'FAC',
                 request: 'SOL', inspection: 'INS', ticket: 'INC', po: 'OC', project: 'PRY' }[kind];
    var width = kind === 'wo' ? 6 : 4;
    save();
    return pref + '-' + y + '-' + pad(n, width);
  }

  /* ---------- permisos ---------- */
  function can(module, action) {
    var s = getSession(); if (!s) return false;
    var role = ROLES[s.role]; if (!role) return false;
    var p = role.perms[module];
    return !!(p && p.indexOf(action || 'ver') >= 0);
  }

  /* ---------- registro de actividad y auditoría ---------- */
  function logActivity(entity, entityId, text, kind) {
    var s = getSession() || {};
    db.activity.unshift({ id: uid('act'), tenant_id: tenantId(), entity: entity, entity_id: entityId,
      user_id: s.user_id, text: text, at: iso(new Date()), kind: kind || 'update' });
    save();
  }
  function logAudit(action, entity, entityId, detail) {
    var s = getSession() || {};
    db.audit.unshift({ id: uid('aud'), tenant_id: tenantId(), user_id: s.user_id, action: action,
      entity: entity, entity_id: entityId, detail: detail, ip: '190.202.11.4', at: iso(new Date()) });
    save();
  }
  function notify(userId, type, title, body, link) {
    db.notifications.unshift({ id: uid('ntf'), tenant_id: tenantId(), user_id: userId, type: type,
      title: title, body: body, link: link || '', read: false, at: iso(new Date()) });
    save();
  }

  /* ---------- transición de estado de orden (§6.8, §10.3) ---------- */
  function woTransition(woId, to, note) {
    var wo = byId('workOrders', woId);
    if (!wo) return { ok: false, error: 'Orden no encontrada.' };
    var def = WO_STATES[wo.status];
    if (!def || def.next.indexOf(to) < 0) {
      return { ok: false, error: 'Transición no permitida: ' + (WO_STATES[wo.status] || {}).label + ' → ' + (WO_STATES[to] || {}).label };
    }
    // Regla: no cerrar/completar con checklist obligatorio incompleto
    if (to === 'COMPLETED') {
      var pend = (wo.checklist || []).filter(function (c) { return c.required && !c.done; });
      if (pend.length) return { ok: false, error: 'Faltan ' + pend.length + ' pasos obligatorios del checklist.' };
      if (!wo.signature) return { ok: false, error: 'Falta la firma del cliente para completar la orden.' };
    }
    if (to === 'ASSIGNED' && !(wo.technicians || []).length) {
      return { ok: false, error: 'Debes asignar al menos un técnico.' };
    }
    var s = getSession() || {};
    wo.status = to;
    wo.history = wo.history || [];
    wo.history.push({ status: to, at: iso(new Date()), by: s.user_id, note: note || '' });
    // Consumo de materiales al completar → movimiento de inventario (§18.1)
    if (to === 'COMPLETED') {
      (wo.materials || []).forEach(function (m) {
        if (m.used > 0 && !m._posted) {
          consume(m.product_id, m.warehouse_id, m.used, wo.number);
          m._posted = true;
        }
      });
    }
    logActivity('work_order', woId, 'Cambió el estado a ' + WO_STATES[to].label, 'status');
    logAudit('UPDATE', 'work_order', wo.number, 'Estado → ' + to + (note ? ' · ' + note : ''));
    save();
    return { ok: true, wo: wo };
  }

  function consume(productId, warehouseId, qty, ref) {
    var p = byId('products', productId); if (!p) return;
    p.stock[warehouseId] = Math.max(0, (p.stock[warehouseId] || 0) - qty);
    db.stockMovements.unshift({ id: uid('sm'), tenant_id: tenantId(), product_id: productId, type: 'consumo',
      qty: -qty, warehouse_id: warehouseId, ref: ref, user_id: (getSession() || {}).user_id,
      at: iso(new Date()), notes: '' });
    save();
  }
  function stockOf(p) {
    return Object.keys(p.stock || {}).reduce(function (a, k) { return a + (p.stock[k] || 0); }, 0);
  }

  /* ---------- cálculos ---------- */
  function quoteTotals(q) {
    var sub = (q.items || []).reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    var cost = (q.items || []).reduce(function (a, i) { return a + i.qty * (i.cost || 0); }, 0);
    var disc = sub * (q.discount || 0) / 100;
    var base = sub - disc;
    var tax = base * (q.taxRate || 0) / 100;
    var total = base + tax;
    var margin = base > 0 ? ((base - cost) / base) * 100 : 0;
    return { sub: sub, cost: cost, disc: disc, base: base, tax: tax, total: total,
             margin: margin, advance: total * (q.advance || 0) / 100 };
  }
  function invoiceTotals(inv) {
    var sub = (inv.items || []).reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    var disc = sub * (inv.discount || 0) / 100;
    var base = sub - disc;
    var tax = base * (inv.taxRate || 0) / 100;
    var total = base + tax;
    var paid = all('payments').filter(function (p) { return p.invoice_id === inv.id; })
                              .reduce(function (a, p) { return a + p.amount; }, 0);
    return { sub: sub, disc: disc, base: base, tax: tax, total: total, paid: paid, balance: total - paid };
  }
  function projectFinance(prj) {
    var mats = all('expenses').filter(function (e) { return e.project_id === prj.id; })
                              .reduce(function (a, e) { return a + e.amount; }, 0);
    var wos = all('workOrders').filter(function (w) { return w.project_id === prj.id; });
    var labor = wos.reduce(function (a, w) {
      var min = (w.timeEntries || []).reduce(function (x, t) { return x + (t.min || 0); }, 0);
      var tec = byId('technicians', (w.technicians || [])[0]);
      return a + (min / 60) * ((tec && tec.rate) || 12);
    }, 0);
    var income = all('invoices').filter(function (i) { return i.project_id === prj.id && i.status !== 'VOID'; })
                                .reduce(function (a, i) { return a + invoiceTotals(i).total; }, 0);
    var cost = mats + labor;
    return { income: income, materials: mats, labor: labor, cost: cost,
             margin: prj.budget > 0 ? ((prj.budget - cost) / prj.budget) * 100 : 0 };
  }

  /* ---------- formato ---------- */
  function money(n, cur) {
    cur = cur || 'USD';
    var v = (Math.round((n || 0) * 100) / 100).toFixed(2);
    var parts = v.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return '$' + parts[0] + ',' + parts[1];
  }
  var MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var MONTHS_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var DOWS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  function fdate(d, long) {
    if (!d) return '—';
    d = new Date(d);
    if (isNaN(d)) return '—';
    return long ? d.getDate() + ' de ' + MONTHS_L[d.getMonth()] + ' de ' + d.getFullYear()
                : pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fdatetime(d) { if (!d) return '—'; return fdate(d) + ' · ' + hm(d); }
  function frel(d) {
    if (!d) return '—';
    var diff = (new Date(d) - new Date()) / 86400000;
    var ad = Math.abs(diff);
    if (ad < 1 / 24) return 'hace minutos';
    if (ad < 1) return diff > 0 ? 'en ' + Math.round(ad * 24) + ' h' : 'hace ' + Math.round(ad * 24) + ' h';
    if (ad < 30) return diff > 0 ? 'en ' + Math.round(ad) + ' días' : 'hace ' + Math.round(ad) + ' días';
    return fdate(d);
  }
  function daysTo(d) { return Math.ceil((new Date(d) - today()) / 86400000); }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('');
  }

  /* ---------- exportar CSV ---------- */
  function toCSV(rows, cols) {
    var head = cols.map(function (c) { return '"' + c.label + '"'; }).join(';');
    var body = rows.map(function (r) {
      return cols.map(function (c) {
        var v = typeof c.value === 'function' ? c.value(r) : r[c.key];
        return '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\n');
    return '﻿' + head + '\n' + body;
  }
  function download(name, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }

  /* ---------- helpers de dominio ---------- */
  function customerName(id) { var c = byId('customers', id); return c ? c.name : '—'; }
  function siteName(id) { var s = byId('sites', id); return s ? s.name : '—'; }
  function userName(id) { var u = byId('users', id); return u ? u.name : '—'; }
  function techName(id) { var t = byId('technicians', id); return t ? t.name : '—'; }
  function me() { var s = getSession(); return s ? byId('users', s.user_id) : null; }
  function myTenant() { return byId('tenants', tenantId()); }

  function lowStock() {
    return all('products').filter(function (p) { return stockOf(p) < p.min; });
  }
  function overdueInvoices() {
    return all('invoices').filter(function (i) {
      var t = invoiceTotals(i);
      return t.balance > 0.01 && new Date(i.due) < today() && i.status !== 'VOID';
    });
  }
  function expiringQuotes() {
    return all('quotes').filter(function (q) {
      return ['SENT', 'VIEWED', 'REVIEW'].indexOf(q.status) >= 0 && daysTo(q.validUntil) <= 5;
    });
  }
  function expiringCerts() {
    var out = [];
    all('technicians').forEach(function (t) {
      (t.certifications || []).forEach(function (c) {
        if (daysTo(c.expires) <= 30) out.push({ tech: t, cert: c, days: daysTo(c.expires) });
      });
    });
    return out;
  }
  function upcomingMaintenance() {
    return all('maintenancePlans').filter(function (m) {
      return m.active && daysTo(m.nextDate) <= (m.alertDays || 7);
    });
  }
  function overdueWOs() {
    return all('workOrders').filter(function (w) {
      return ['CLOSED', 'CANCELLED', 'COMPLETED', 'REVIEW'].indexOf(w.status) < 0 && new Date(w.end) < new Date();
    });
  }

  /* ---------- exportación ---------- */
  global.VOLTX = {
    // constantes
    WO_STATES: WO_STATES, QUOTE_STATES: QUOTE_STATES, REQ_STATES: REQ_STATES, INV_STATES: INV_STATES,
    PROJECT_STATES: PROJECT_STATES, TICKET_STATES: TICKET_STATES, PO_STATES: PO_STATES,
    PRIORITIES: PRIORITIES, WO_TYPES: WO_TYPES, ROLES: ROLES, MODULES: MODULES, ACTIONS: ACTIONS,
    MONTHS: MONTHS, MONTHS_L: MONTHS_L, DOWS: DOWS,
    // núcleo
    load: load, save: save, reset: reset, db: function () { return db; },
    getSession: getSession, setSession: setSession, login: login, logout: logout,
    all: all, byId: byId, where: where, insert: insert, update: update, remove: remove,
    can: can, tenantId: tenantId, nextNumber: nextNumber, uid: uid,
    logActivity: logActivity, logAudit: logAudit, notify: notify,
    woTransition: woTransition, consume: consume, stockOf: stockOf,
    quoteTotals: quoteTotals, invoiceTotals: invoiceTotals, projectFinance: projectFinance,
    // formato
    money: money, fdate: fdate, fdatetime: fdatetime, frel: frel, ymd: ymd, hm: hm,
    daysTo: daysTo, addDays: addDays, today: today, initials: initials, pad: pad,
    toCSV: toCSV, download: download,
    // dominio
    customerName: customerName, siteName: siteName, userName: userName, techName: techName,
    me: me, myTenant: myTenant, lowStock: lowStock, overdueInvoices: overdueInvoices,
    expiringQuotes: expiringQuotes, expiringCerts: expiringCerts,
    upcomingMaintenance: upcomingMaintenance, overdueWOs: overdueWOs
  };

  load();
})(window);
