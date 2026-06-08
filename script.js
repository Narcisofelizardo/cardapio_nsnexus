const currency = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const state = {
  data: null,
  items: [],
  category: 'Todos',
  search: '',
  cart: [],
  slideIndex: 0,
  modalItem: null
};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

async function loadData() {
  /*
    Corrigido: agora funciona abrindo o index.html direto no navegador.
    O sistema usa data/menu.js primeiro. Em servidor/hospedagem, também pode usar data/menu.json como fallback.
  */
  if (window.MENU_DATA) {
    state.data = window.MENU_DATA;
  } else {
    const response = await fetch('data/menu.json');
    state.data = await response.json();
  }

  state.items = state.data.items;
  applyBranding();
  renderHighlights();
  renderCategoryChips();
  renderMenu();
  renderFeatured();
  renderTestimonials();
  attachEvents();
  bootReveal();
  setTimeout(() => $('#loader').classList.add('hide'), 950);
}

function applyBranding() {
  const b = state.data.branding;
  $('#brandName').textContent = b.name;
  $('#brandTagline').textContent = b.tagline;
  $('#brandDescription').textContent = b.description;
  $('#heroImage').src = b.heroImage;
  $('#brandLogo').src = b.logo;
  $('#ratingStat').textContent = `${b.rating} ★`;
  $('#deliveryStat').textContent = b.deliveryTime;
  document.title = `${b.name} | Cardápio Digital Premium`;
}

function renderHighlights() {
  $('#highlightList').innerHTML = state.data.highlights.map(h => `
    <div class="feature-box reveal">
      <strong>${h.title}</strong>
      <p>${h.text}</p>
    </div>
  `).join('');
}

function renderCategoryChips() {
  const categories = ['Todos', ...state.data.categories];
  $('#categoryChips').innerHTML = categories.map(cat => `
    <button class="chip-btn ${state.category === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>
  `).join('');
}

function getFilteredItems() {
  return state.items.filter(item => {
    const matchCategory = state.category === 'Todos' || item.category === state.category;
    const q = state.search.trim().toLowerCase();
    const joined = `${item.name} ${item.description} ${item.category} ${item.badge}`.toLowerCase();
    const matchSearch = !q || joined.includes(q);
    return matchCategory && matchSearch;
  });
}

function renderMenu() {
  const items = getFilteredItems();
  $('#menuGrid').innerHTML = items.map(item => `
    <article class="card reveal">
      <div class="card-media">
        <span class="badge">${item.badge}</span>
        <button class="fav-btn" title="favoritar">❤</button>
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="card-body">
        <div class="card-topline">
          <h4 class="card-title">${item.name}</h4>
          <div class="price">${currency(item.price)}</div>
        </div>
        <p class="card-text">${item.description}</p>
        <div class="meta-row">
          <div class="meta-pills">
            <span class="meta-pill">★ ${item.rating}</span>
            <span class="meta-pill">⏱ ${item.prepTime}</span>
          </div>
          <small>${item.category}</small>
        </div>
        <div class="card-actions">
          <button class="btn-mini secondary" data-view="${item.id}">Ver mais</button>
          <button class="btn-mini primary" data-add="${item.id}">Adicionar</button>
        </div>
      </div>
    </article>
  `).join('');

  wireMenuButtons();
  bootReveal();
}

function renderFeatured() {
  const items = state.items.filter(item => item.featured);
  $('#slides').innerHTML = items.map((item, i) => `
    <div class="slide ${i === 0 ? 'active' : ''}" data-slide-index="${i}">
      <img src="${item.image}" alt="${item.name}" />
      <div class="slide-content">
        <span class="badge" style="position:static; display:inline-flex; margin-bottom:14px;">${item.badge}</span>
        <h4>${item.name}</h4>
        <p>${item.description}</p>
        <div class="hero-actions">
          <button class="btn-primary" onclick="openItem(${item.id})">Pedir agora</button>
          <button class="btn-secondary" onclick="addToCart(${item.id})">Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  `).join('');

  setInterval(() => {
    const slides = $$('.slide');
    if (!slides.length) return;
    slides[state.slideIndex]?.classList.remove('active');
    state.slideIndex = (state.slideIndex + 1) % slides.length;
    slides[state.slideIndex]?.classList.add('active');
  }, 4200);
}

function renderTestimonials() {
  $('#testimonialGrid').innerHTML = state.data.testimonials.map(t => `
    <article class="quote reveal">
      <p>“${t.text}”</p>
      <strong>${t.name}</strong>
    </article>
  `).join('');
}

function wireMenuButtons() {
  $$('[data-add]').forEach(btn => btn.onclick = () => addToCart(Number(btn.dataset.add)));
  $$('[data-view]').forEach(btn => btn.onclick = () => openItem(Number(btn.dataset.view)));
}

function addToCart(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  const existing = state.cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...item, qty: 1 });
  renderCart();
  openCart();
  pulseCart();
}
window.addToCart = addToCart;

function pulseCart() {
  const btn = $('#cartBtn');
  btn.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.08)' },
    { transform: 'scale(1)' }
  ], { duration: 280, easing: 'ease-out' });
}

function updateQty(id, delta) {
  const entry = state.cart.find(i => i.id === id);
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
}

function removeItem(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  $('#cartCount').textContent = count;

  if (!state.cart.length) {
    $('#cartItems').innerHTML = `
      <div class="empty-state">
        <div>
          <div style="font-size:2rem; margin-bottom:8px">🛒</div>
          <strong>Nenhum item adicionado</strong>
          <p>Adicione produtos para testar a experiência completa.</p>
        </div>
      </div>
    `;
  } else {
    $('#cartItems').innerHTML = state.cart.map(item => `
      <article class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div>
          <strong>${item.name}</strong>
          <span>${currency(item.price)} • ${item.category}</span>
          <div class="qty">
            <button onclick="updateQty(${item.id}, -1)">−</button>
            <strong>${item.qty}</strong>
            <button onclick="updateQty(${item.id}, 1)">+</button>
          </div>
          <div class="remove-link" onclick="removeItem(${item.id})">Remover</div>
        </div>
        <div class="price-col">
          <strong>${currency(item.price * item.qty)}</strong>
        </div>
      </article>
    `).join('');
  }

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = state.cart.length ? 6 : 6;
  $('#subtotal').textContent = currency(subtotal);
  $('#fee').textContent = currency(fee);
  $('#total').textContent = currency(subtotal + fee);
}
window.updateQty = updateQty;
window.removeItem = removeItem;

function openCart() {
  $('#cartDrawer').classList.add('open');
  $('#backdrop').classList.add('show');
  document.body.classList.add('menu-open');
}
function closeCart() {
  $('#cartDrawer').classList.remove('open');
  if (!$('#itemModal').classList.contains('show')) {
    $('#backdrop').classList.remove('show');
    document.body.classList.remove('menu-open');
  }
}

function openItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  state.modalItem = item;
  $('#modalImage').src = item.image;
  $('#modalTitle').textContent = item.name;
  $('#modalBadge').textContent = item.badge;
  $('#modalDescription').textContent = item.description;
  $('#modalPrep').textContent = `⏱ ${item.prepTime}`;
  $('#modalRate').textContent = `★ ${item.rating}`;
  $('#modalCategory').textContent = item.category;
  $('#modalPrice').textContent = currency(item.price);
  $('#itemModal').classList.add('show');
  $('#backdrop').classList.add('show');
  document.body.classList.add('menu-open');
}
window.openItem = openItem;

function closeModal() {
  $('#itemModal').classList.remove('show');
  if (!$('#cartDrawer').classList.contains('open')) {
    $('#backdrop').classList.remove('show');
    document.body.classList.remove('menu-open');
  }
}

function getWhatsAppUrl(singleItem = null) {
  const num = state.data.branding.whatsapp.replace(/\D/g, '');
  const list = singleItem ? [{ ...singleItem, qty: 1 }] : state.cart;
  const total = list.reduce((sum, item) => sum + item.price * item.qty, 0) + 6;
  const lines = [
    `Olá! Quero fazer um pedido no *${state.data.branding.name}*.` ,
    '',
    '*Itens:*'
  ];
  list.forEach(item => {
    lines.push(`• ${item.qty}x ${item.name} — ${currency(item.price * item.qty)}`);
  });
  if (!list.length) {
    lines.push('• Ainda estou escolhendo, mas quero atendimento.');
  }
  lines.push('', `*Total estimado:* ${currency(total)}`, '', 'Pode confirmar meu pedido?');
  return `https://wa.me/${num}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function checkoutWhats(singleItem = null) {
  window.open(getWhatsAppUrl(singleItem), '_blank');
}

function attachEvents() {
  $('#searchInput').addEventListener('input', e => {
    state.search = e.target.value;
    renderMenu();
  });

  $('#categoryChips').addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    state.category = btn.dataset.category;
    renderCategoryChips();
    renderMenu();
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#backdrop').addEventListener('click', () => {
    closeCart();
    closeModal();
  });
  $('#closeModal').addEventListener('click', closeModal);
  $('#modalAddBtn').addEventListener('click', () => state.modalItem && addToCart(state.modalItem.id));
  $('#modalWhatsBtn').addEventListener('click', () => state.modalItem && checkoutWhats(state.modalItem));
  $('#checkoutBtn').addEventListener('click', () => checkoutWhats());
  $('#heroWhatsBtn').addEventListener('click', () => checkoutWhats());
  $('#ctaWhatsBtn').addEventListener('click', () => checkoutWhats());
  $('#ctaCartBtn').addEventListener('click', openCart);
  $('#floatingWhats').addEventListener('click', () => checkoutWhats());
}

function bootReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('show');
    });
  }, { threshold: .12 });

  $$('.reveal').forEach(el => observer.observe(el));
}

loadData().catch(err => {
  console.error(err);
  $('#loader').innerHTML = `<div class="loader-box"><strong>Erro ao carregar o cardápio</strong><span>Confira se a pasta data/menu.js está junto do index.html.</span></div>`;
});
