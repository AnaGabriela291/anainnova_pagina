/* ===========================================================
   PODYUM — lógica de la tienda
   -----------------------------------------------------------
   👉 CAMBIA AQUÍ EL NÚMERO DE WHATSAPP (código de país + número,
      sin +, sin espacios y sin guiones).
   =========================================================== */
const WHATSAPP = '584120000000';
const ENVIO_GRATIS = 60;

/* ---------------- Catálogo ---------------- */
const PRODUCTOS = [
  {
    id:'pod-001',
    nombre:'Classic Logo Tee — Negro',
    precio:24, antes:null,
    cats:['oversize','logo'],
    img:'img/tee-negra-duo.jpg', alt:'img/tee-negra-espalda.jpg',
    etiquetas:[{t:'NUEVO',c:'wine'}],
    colores:['#1A1A1A','#F2F2F2','#D8CBB9','#7A2233'],
    desc:'La PODYUM de siempre. Logo frontal en tinta blanca de alta cobertura sobre algodón peinado 180 gr, con hombro caído y cuerpo boxy.'
  },
  {
    id:'pod-002',
    nombre:'Classic Logo Tee — Blanco',
    precio:24, antes:null,
    cats:['oversize','logo'],
    img:'img/tee-blanca-duo.jpg', alt:null,
    etiquetas:[],
    colores:['#F2F2F2','#1A1A1A','#D8CBB9','#7A2233'],
    desc:'Misma caída, versión luminosa. Logo negro al frente y emblema grande en la espalda. Tela opaca que no transparenta.'
  },
  {
    id:'pod-003',
    nombre:'Classic Logo Tee — Vinotinto',
    precio:26, antes:null,
    cats:['oversize','logo','color'],
    img:'img/tee-vino.jpg', alt:'img/model-vino.jpg',
    etiquetas:[{t:'MÁS VENDIDA',c:'sand'}],
    colores:['#7A2233','#1A1A1A','#D8CBB9','#F2F2F2'],
    desc:'El color de la casa. Vinotinto profundo teñido en pieza, con estampado frontal blanco que resalta a distancia.'
  },
  {
    id:'pod-004',
    nombre:'Classic Logo Tee — Arena',
    precio:26, antes:null,
    cats:['oversize','logo','color'],
    img:'img/tee-arena.jpg', alt:null,
    etiquetas:[{t:'DROP LIMITADO',c:''}],
    colores:['#D8CBB9','#1A1A1A','#7A2233','#F2F2F2'],
    desc:'Tono arena cálido para combinar con todo. Estampado en la espalda y bolsillo limpio al frente. Lote corto.'
  },
  {
    id:'pod-005',
    nombre:'Columns Graphic Tee',
    precio:29, antes:null,
    cats:['oversize','grafica'],
    img:'img/tee-columnas.jpg', alt:'img/tee-negra-rack.jpg',
    etiquetas:[{t:'EDICIÓN LIMITADA',c:'wine'}],
    colores:['#1A1A1A'],
    desc:'Estampado fotográfico de columnas clásicas en alta definición. Impresión DTF de gran formato sobre base negra.'
  },
  {
    id:'pod-006',
    nombre:'Poster Oversize Tee',
    precio:29, antes:null,
    cats:['oversize','grafica'],
    img:'img/tee-poster.jpg', alt:null,
    etiquetas:[{t:'NUEVO',c:'wine'}],
    colores:['#F2F2F2','#1A1A1A'],
    desc:'Gráfica tipo póster editorial al frente. La pieza más llamativa de la colección, pensada para usarse sola.'
  },
  {
    id:'pod-007',
    nombre:'Emblem Back Tee',
    precio:27, antes:null,
    cats:['oversize','grafica','logo'],
    img:'img/tee-negra-espalda.jpg', alt:'img/tee-negra-duo.jpg',
    etiquetas:[],
    colores:['#1A1A1A','#D8CBB9'],
    desc:'Logo horizontal centrado en la espalda y pecho limpio. La favorita de quienes prefieren algo más discreto al frente.'
  },
  {
    id:'pod-008',
    nombre:'Essential Basic Tee',
    precio:19, antes:24,
    cats:['basica'],
    img:'img/tee-lisa-duo.jpg', alt:null,
    etiquetas:[{t:'-21%',c:'wine'}],
    colores:['#1A1A1A','#F2F2F2'],
    desc:'Sin estampado, solo corte. El mismo patrón oversize y la misma tela, para armar tu base sin gastar de más.'
  }
];

const TALLAS = ['S','M','L','XL','XXL'];
const NOMBRE_COLOR = {
  '#1A1A1A':'Negro', '#F2F2F2':'Blanco', '#D8CBB9':'Arena', '#7A2233':'Vinotinto'
};

/* ---------------- Utilidades ---------------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const money = n => '$' + n.toFixed(2);

let toastTimer;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

/* ---------------- Render del grid ---------------- */
let filtroActivo = 'all';
let busqueda = '';

function tarjeta(p){
  const tags = p.etiquetas.map(e =>
    `<span class="tagline ${e.c ? 'tagline--' + e.c : ''}">${e.t}</span>`).join('');
  const alt = p.alt ? `<img class="alt" src="${p.alt}" alt="" loading="lazy">` : '';
  const sw = p.colores.map((c,i) =>
    `<span class="sw ${i===0?'is-on':''}" style="background:${c}" title="${NOMBRE_COLOR[c]||''}"></span>`).join('');
  const precio = p.antes
    ? `<b>${money(p.precio)}</b><s>${money(p.antes)}</s><span class="off">AHORRAS ${money(p.antes-p.precio)}</span>`
    : `<b>${money(p.precio)}</b>`;

  return `
  <article class="card" data-id="${p.id}">
    <div class="card__media">
      <div class="card__tags">${tags}</div>
      <button class="fav" aria-label="Guardar en favoritos">
        <svg viewBox="0 0 24 24"><path d="M12 20s-7.2-4.5-7.2-9.2A4 4 0 0 1 12 8.2a4 4 0 0 1 7.2 2.6C19.2 15.5 12 20 12 20z" stroke-linejoin="round"/></svg>
      </button>
      <img src="${p.img}" alt="${p.nombre}" loading="lazy">
      ${alt}
      <div class="card__quick">
        <button class="btn btn--dark js-add">
          <span class="t-full">AÑADIR AL CARRITO</span>
          <span class="t-short">AÑADIR</span>
        </button>
        <button class="btn btn--icon js-view" aria-label="Vista rápida">
          <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>
        </button>
      </div>
    </div>
    <div class="card__body">
      <h3 class="card__name">${p.nombre}</h3>
      <div class="card__price">${precio}</div>
      <div class="swatches">${sw}</div>
    </div>
  </article>`;
}

function render(){
  const lista = PRODUCTOS.filter(p => {
    const okCat = filtroActivo === 'all' || p.cats.includes(filtroActivo);
    const okTxt = !busqueda || (p.nombre + ' ' + p.desc + ' ' + p.cats.join(' '))
                    .toLowerCase().includes(busqueda);
    return okCat && okTxt;
  });
  $('#grid').innerHTML = lista.map(tarjeta).join('');
  $('#empty').hidden = lista.length > 0;
}

function setFiltro(f){
  filtroActivo = f;
  $$('#filters .chip').forEach(c => c.classList.toggle('is-on', c.dataset.filter === f));
  render();
}

/* ---------------- Carrito ---------------- */
let carrito = [];
try { carrito = JSON.parse(localStorage.getItem('podyum_cart')) || []; } catch(e){ carrito = []; }

function guardar(){
  try { localStorage.setItem('podyum_cart', JSON.stringify(carrito)); } catch(e){}
}

function totalItems(){ return carrito.reduce((s,i) => s + i.qty, 0); }
function subtotal(){ return carrito.reduce((s,i) => s + i.precio * i.qty, 0); }

function pintarCarrito(){
  const n = totalItems();
  $('#cartCount').textContent = n;
  $('#drawerCount').textContent = n;
  $('#subtotal').textContent = money(subtotal());

  const falta = ENVIO_GRATIS - subtotal();
  $('#shipNote').textContent = n === 0
    ? `Envío gratis en compras desde ${money(ENVIO_GRATIS)}.`
    : (falta > 0 ? `Te faltan ${money(falta)} para el envío gratis.`
                 : '¡Tienes envío gratis en este pedido! 🎉');

  if(!carrito.length){
    $('#drawerBody').innerHTML = `
      <div class="cart-empty">
        <img src="img/icono-negro.png" alt="">
        <p>Tu carrito está vacío.</p>
        <button class="btn btn--dark btn--sm" onclick="document.getElementById('drawerClose').click()">VER CAMISAS</button>
      </div>`;
    return;
  }

  $('#drawerBody').innerHTML = carrito.map((i, idx) => `
    <div class="citem">
      <img src="${i.img}" alt="${i.nombre}">
      <div class="citem__info">
        <h5 class="citem__name">${i.nombre}</h5>
        <p class="citem__meta">Talla ${i.talla} · ${NOMBRE_COLOR[i.color] || 'Color único'}</p>
        <div class="citem__bottom">
          <div class="qty">
            <button data-act="menos" data-idx="${idx}" aria-label="Quitar uno">−</button>
            <span>${i.qty}</span>
            <button data-act="mas" data-idx="${idx}" aria-label="Agregar uno">+</button>
          </div>
          <span class="citem__price">${money(i.precio * i.qty)}</span>
        </div>
        <a href="#" class="citem__del" data-act="borrar" data-idx="${idx}">Eliminar</a>
      </div>
    </div>`).join('');
}

function agregar(p, talla, color, qty = 1){
  const existe = carrito.find(i => i.id === p.id && i.talla === talla && i.color === color);
  if(existe) existe.qty += qty;
  else carrito.push({
    id:p.id, nombre:p.nombre, precio:p.precio, img:p.img, talla, color, qty
  });
  guardar();
  pintarCarrito();
  toast(`${p.nombre} · talla ${talla} agregada`);
}

/* ---------------- Drawer ---------------- */
function abrirDrawer(){
  $('#drawer').classList.add('is-on');
  $('#overlay').classList.add('is-on');
  document.body.style.overflow = 'hidden';
}
function cerrarTodo(){
  $('#drawer').classList.remove('is-on');
  $('#overlay').classList.remove('is-on');
  $('#modal').classList.remove('is-on');
  document.body.style.overflow = '';
}

/* ---------------- Quick view ---------------- */
function quickView(p){
  const precio = p.antes
    ? `<b>${money(p.precio)}</b><s>${money(p.antes)}</s>`
    : `<b>${money(p.precio)}</b>`;

  $('#modalBox').innerHTML = `
    <div class="qv__media">
      <button class="qv__x" id="qvClose" aria-label="Cerrar">&times;</button>
      <img src="${p.img}" alt="${p.nombre}">
    </div>
    <div class="qv__info">
      <span class="qv__cat">${p.cats.join(' · ').toUpperCase()}</span>
      <h3 class="qv__name">${p.nombre}</h3>
      <div class="qv__price">${precio}</div>
      <p class="qv__desc">${p.desc}</p>

      <div class="qv__row">
        <span class="qv__label">Color: <span id="qvColorName">${NOMBRE_COLOR[p.colores[0]] || 'Único'}</span></span>
        <div class="colors">
          ${p.colores.map((c,i) => `<button class="color ${i===0?'is-on':''}" style="background:${c}" data-color="${c}" aria-label="${NOMBRE_COLOR[c]||'Color'}"></button>`).join('')}
        </div>
      </div>

      <div class="qv__row">
        <span class="qv__label">Talla <span>· corte oversize, si dudas pide una menos</span></span>
        <div class="sizes">
          ${TALLAS.map((t,i) => `<button class="size ${i===1?'is-on':''}" data-size="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <div class="qv__buy">
        <button class="btn btn--dark" id="qvAdd" style="flex:1">AÑADIR AL CARRITO</button>
        <button class="btn btn--wine" id="qvBuy">COMPRAR YA</button>
      </div>

      <div class="qv__guide">
        <span><svg viewBox="0 0 24 24"><path d="M3 7h12v10H3zM15 10h3l3 3v4h-6z"/><circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg> Envío en 24-72h</span>
        <span><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9" stroke-linecap="round"/><path d="M20 4v4.5h-4.5" stroke-linecap="round"/></svg> Cambio de talla gratis</span>
      </div>
    </div>`;

  const box = $('#modalBox');
  box.querySelector('#qvClose').onclick = cerrarTodo;

  $$('.size', box).forEach(b => b.onclick = () => {
    $$('.size', box).forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on');
  });
  $$('.color', box).forEach(b => b.onclick = () => {
    $$('.color', box).forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on');
    $('#qvColorName', box).textContent = NOMBRE_COLOR[b.dataset.color] || 'Único';
  });

  const leer = () => ({
    talla: $('.size.is-on', box).dataset.size,
    color: $('.color.is-on', box).dataset.color
  });

  box.querySelector('#qvAdd').onclick = () => {
    const s = leer(); agregar(p, s.talla, s.color); cerrarTodo(); abrirDrawer();
  };
  box.querySelector('#qvBuy').onclick = () => {
    const s = leer(); agregar(p, s.talla, s.color); cerrarTodo(); irAWhatsApp();
  };

  $('#modal').classList.add('is-on');
  document.body.style.overflow = 'hidden';
}

/* ---------------- Checkout por WhatsApp ---------------- */
function irAWhatsApp(){
  if(!carrito.length){ toast('Tu carrito está vacío'); return; }
  let txt = '¡Hola PODYUM! 👋 Quiero hacer este pedido:\n\n';
  carrito.forEach(i => {
    txt += `• ${i.nombre}\n   Talla ${i.talla} · ${NOMBRE_COLOR[i.color] || 'Color único'} · x${i.qty} — ${money(i.precio * i.qty)}\n`;
  });
  txt += `\nTotal: ${money(subtotal())}`;
  txt += subtotal() >= ENVIO_GRATIS ? ' (con envío gratis)' : '';
  txt += '\n\n¿Me confirman disponibilidad y forma de pago?';
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank');
}

/* ===========================================================
   EVENTOS
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  render();
  pintarCarrito();

  /* --- Grid: añadir, vista rápida, favoritos, swatches --- */
  $('#grid').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if(!card) return;
    const p = PRODUCTOS.find(x => x.id === card.dataset.id);

    if(e.target.closest('.js-add')){ agregar(p, 'M', p.colores[0]); abrirDrawer(); return; }
    if(e.target.closest('.js-view')){ quickView(p); return; }
    if(e.target.closest('.fav')){
      const f = e.target.closest('.fav');
      f.classList.toggle('is-on');
      toast(f.classList.contains('is-on') ? 'Guardada en favoritos ♥' : 'Quitada de favoritos');
      return;
    }
    if(e.target.classList.contains('sw')){
      $$('.sw', card).forEach(s => s.classList.remove('is-on'));
      e.target.classList.add('is-on');
      return;
    }
    if(e.target.closest('.card__media')) quickView(p);
  });

  /* --- Filtros --- */
  $('#filters').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(chip) setFiltro(chip.dataset.filter);
  });
  $$('[data-filter]').forEach(el => {
    if(el.closest('#filters')) return;
    el.addEventListener('click', () => setFiltro(el.dataset.filter));
  });
  $('#showAll').addEventListener('click', () => setFiltro('all'));

  /* --- Carrito --- */
  $('#cartBtn').addEventListener('click', abrirDrawer);
  $('#drawerClose').addEventListener('click', cerrarTodo);
  $('#keepShopping').addEventListener('click', cerrarTodo);
  $('#overlay').addEventListener('click', cerrarTodo);
  $('#modal').addEventListener('click', e => { if(e.target.id === 'modal') cerrarTodo(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') cerrarTodo(); });

  $('#drawerBody').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if(!b) return;
    e.preventDefault();
    const i = +b.dataset.idx;
    if(b.dataset.act === 'mas')   carrito[i].qty++;
    if(b.dataset.act === 'menos') carrito[i].qty > 1 ? carrito[i].qty-- : carrito.splice(i,1);
    if(b.dataset.act === 'borrar')carrito.splice(i,1);
    guardar(); pintarCarrito();
  });

  $('#checkout').addEventListener('click', e => { e.preventDefault(); irAWhatsApp(); });
  $('#waFloat').addEventListener('click', e => {
    e.preventDefault();
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('¡Hola PODYUM! Tengo una consulta sobre las camisas 👕')}`, '_blank');
  });

  /* --- Buscador --- */
  $('#searchBtn').addEventListener('click', () => {
    $('#searchbar').classList.toggle('is-open');
    if($('#searchbar').classList.contains('is-open')) setTimeout(() => $('#searchInput').focus(), 220);
  });
  $('#searchClose').addEventListener('click', () => {
    $('#searchbar').classList.remove('is-open');
    $('#searchInput').value = ''; busqueda = ''; render();
  });
  $('#searchInput').addEventListener('input', e => {
    busqueda = e.target.value.trim().toLowerCase();
    if(busqueda) filtroActivo = 'all';
    $$('#filters .chip').forEach(c => c.classList.toggle('is-on', c.dataset.filter === filtroActivo));
    render();
    if(busqueda) $('#productos').scrollIntoView({behavior:'smooth'});
  });

  /* --- Menú móvil --- */
  $('#burger').addEventListener('click', () => {
    $('#nav').classList.toggle('is-on');
    $('#burger').classList.toggle('is-on');
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => {
    $('#nav').classList.remove('is-on');
    $('#burger').classList.remove('is-on');
  }));

  /* --- Header con sombra al hacer scroll --- */
  const header = $('#header');
  addEventListener('scroll', () => header.classList.toggle('is-stuck', scrollY > 60), {passive:true});

  /* --- Anuncios rotativos --- */
  const rots = $$('#rotator .topbar__rot');
  let r = 0;
  setInterval(() => {
    rots[r].classList.remove('is-on');
    r = (r + 1) % rots.length;
    rots[r].classList.add('is-on');
  }, 4200);

  /* --- Newsletter --- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    $('#newsOk').hidden = false;
    $('#newsEmail').value = '';
    toast('¡Gracias! Ya estás en la lista.');
  });
});
