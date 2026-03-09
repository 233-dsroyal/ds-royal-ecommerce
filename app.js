// ============================================================
// DS ROYAL - APPLICATION PRINCIPALE v2.0
// ============================================================

// --- CONFIGURATION INTELLIGENTE (Auto-détection local/production) ---
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api'
    : 'https://ds-royal-api.onrender.com/api'; // ← Cette URL sera mise à jour après déploiement Render

// --- GESTION DU THÈME (DARK / LIGHT MODE) ---
let currentTheme = localStorage.getItem('theme') || 'dark';
applyTheme();

window.toggleTheme = function() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
}

function applyTheme() {
    const root = document.documentElement;
    const btn = document.getElementById('themeToggle');
    if(currentTheme === 'light') {
        root.style.setProperty('--bg-primary', '#f5f5f7');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--text-primary', '#1d1d1f');
        root.style.setProperty('--text-secondary', '#86868b');
        root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
        if(btn) btn.textContent = '🌙';
    } else {
        root.style.setProperty('--bg-primary', '#0a0a0f');
        root.style.setProperty('--bg-secondary', '#13131a');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#a3a3b5');
        root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
        if(btn) btn.textContent = '☀️';
    }
}

// --- GESTION DES PRODUITS ---
const productGrid = document.getElementById('productGrid');
let allProducts = [];
let currentCategory = 'All';

async function fetchAndRenderProducts() {
    try {
        // Afficher un skeleton loader pendant le chargement
        productGrid.innerHTML = Array(6).fill('').map(() => `
            <div class="product-card" style="animation: fadeUp 0.6s ease-out backwards;">
                <div class="product-img-container" style="background: linear-gradient(90deg, #1a1a24 25%, #252535 50%, #1a1a24 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                <div style="padding: 1rem 0;">
                    <div style="height: 20px; width: 70%; background: #1a1a24; border-radius: 10px; margin-bottom: 10px;"></div>
                    <div style="height: 15px; width: 40%; background: #1a1a24; border-radius: 10px;"></div>
                </div>
            </div>
        `).join('');

        const response = await fetch(`${BASE_URL}/products`);
        if (!response.ok) throw new Error('Erreur de connexion');

        const products = await response.json();
        allProducts = products;
        renderProducts(allProducts);
        
    } catch (error) {
        console.error("Erreur:", error);
        // Fallback avec des produits de démonstration si l'API est indisponible
        allProducts = [
            { id: 1, title: "Aspirateur Robot Intelligent IA", price: "349.99 €", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop", tag: "Nettoyage Auto" },
            { id: 2, title: "Purificateur d'Air Royal", price: "129.50 €", image: "https://images.unsplash.com/photo-1585241936939-fdd7c31d102a?q=80&w=600&auto=format&fit=crop", tag: "Maison Zen" },
            { id: 3, title: "Lumière d'Ambiance 360° Neon", price: "89.00 €", image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=600&auto=format&fit=crop", tag: "Setup Design" },
            { id: 4, title: "Casque Audio Sans Fil Premium", price: "199.99 €", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop", tag: "Tech Premium" },
            { id: 5, title: "Lampe de Bureau LED Futuriste", price: "69.90 €", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop", tag: "Setup Design" },
            { id: 6, title: "Enceinte Bluetooth Lévitation", price: "159.00 €", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=600&auto=format&fit=crop", tag: "Tech Premium" },
        ];
        renderProducts(allProducts);
    }
}

function renderProducts(productsToRender) {
    productGrid.innerHTML = '';
    if(productsToRender.length === 0) {
        productGrid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1; font-size: 1.2rem;">Aucun produit trouvé pour cette recherche. 🔍</p>`;
        return;
    }

    productsToRender.forEach((prod, index) => {
        const delay = index * 0.08;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animation = `fadeUp 0.6s ease-out ${delay}s backwards`;
        
        card.innerHTML = `
            <div class="product-img-container" style="cursor: pointer; position: relative;" onclick="showQuickView(${prod.id})">
                <img src="${prod.image}" alt="${prod.title}" class="product-img" loading="lazy">
                <div class="quick-view-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.3s;">
                    <span style="color:white; font-weight:bold; border:1px solid white; padding:10px 20px; border-radius:20px; backdrop-filter: blur(5px);">👁️ Vue Rapide</span>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <span style="font-size: 0.8rem; color: var(--accent-color); text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${prod.tag}</span>
                    <h3 class="product-title" style="margin-top: 0.5rem; cursor: pointer;" onclick="showQuickView(${prod.id})">${prod.title}</h3>
                </div>
                <div class="product-price">
                    ${prod.original_price ? `<span style="text-decoration: line-through; color: var(--text-secondary); font-size: 0.95rem; margin-right: 8px;">${prod.original_price}</span>` : ''}
                    ${prod.price}
                    ${prod.original_price ? `<span style="background: rgba(255,107,107,0.2); color: #ff6b6b; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 10px; vertical-align: middle;">FLASH</span>` : ''}
                </div>
            </div>
            ${prod.stock_count !== null && prod.stock_count < 5 ? `<div style="color: #ff6b6b; font-size: 0.85rem; font-weight: bold; margin-bottom: 15px; text-align: center; animation: pulseGlow 2s infinite;">🔥 Vite, plus que ${prod.stock_count} en stock !</div>` : ''}
            <button class="btn add-to-cart-btn" onclick="addToCart(${prod.id})">
                <span class="btn-text">🛒 Ajouter au Panier</span>
            </button>
        `;
        
        card.addEventListener('mouseenter', () => card.querySelector('.quick-view-overlay').style.opacity = '1');
        card.addEventListener('mouseleave', () => card.querySelector('.quick-view-overlay').style.opacity = '0');
        
        productGrid.appendChild(card);
    });
}

// --- FILTRES ---
window.filterProducts = function() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = allProducts;
    
    if (currentCategory !== 'All') {
        filtered = filtered.filter(p => p.tag === currentCategory);
    }
    
    if (term) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(term));
    }
    
    renderProducts(filtered);
}

window.filterCategory = function(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.opacity = '0.7';
    });
    btn.classList.add('active');
    btn.style.opacity = '1';
    
    filterProducts();
}

// --- VUE RAPIDE (QUICK VIEW) ---
window.showQuickView = function(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    const modal = document.getElementById('quickViewModal');
    const body = document.getElementById('quickViewBody');
    
    body.innerHTML = `
        <div style="border-radius: 15px; overflow: hidden; height: 100%; min-height: 300px; background: #1a1a24; display: flex; align-items: center; justify-content: center;">
            <img src="${product.image}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div style="display: flex; flex-direction: column; justify-content: center;">
            <span style="color: var(--accent-color); font-weight: bold; letter-spacing: 2px; text-transform: uppercase; font-size: 0.9rem;">${product.tag}</span>
            <h2 style="font-size: 2.2rem; margin: 10px 0; line-height: 1.2;">${product.title}</h2>
            <p style="color: var(--text-secondary); line-height: 1.8; margin-bottom: 20px;">Ce produit sélectionné par notre intelligence artificielle redéfinit les standards de l'innovation. Profitez de fonctionnalités exclusives conçues pour améliorer votre quotidien de manière durable.</p>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-color);">
                    ${product.original_price ? `<span style="text-decoration: line-through; color: var(--text-secondary); font-size: 1.5rem; margin-right: 15px;">${product.original_price}</span>` : ''}
                    ${product.price}
                </div>
                ${product.stock_count !== null && product.stock_count < 5 ? 
                    `<span style="background: rgba(255,107,107,0.1); color: #ff6b6b; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; animation: pulseGlow 2s infinite;">🔥 Plus que ${product.stock_count} dispo !</span>` : 
                    `<span style="background: rgba(46,204,113,0.1); color: #2ecc71; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">En Stock</span>`
                }
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="addToCart(${product.id}); closeQuickView();" style="font-size:1.1rem; padding: 15px; flex: 1;">🛒 Ajouter au Panier</button>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                <div style="display: flex; gap: 20px; color: var(--text-secondary); font-size: 0.9rem;">
                    <span>🚚 Livraison 3-5 jours</span>
                    <span>🔒 Paiement sécurisé</span>
                    <span>↩️ Retour 30 jours</span>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

window.closeQuickView = function() {
    document.getElementById('quickViewModal').style.display = 'none';
}

// --- PANIER ---
let cartCount = 0;
let cartItems = [];
const cartBtn = document.querySelector('.cart-btn');

window.toggleCart = function() {
    document.getElementById('cartModal').classList.toggle('active');
    renderCart();
}

window.addToCart = function(id) {
    const product = allProducts.find(p => p.id === id);
    if(product) {
        cartItems.push(product);
        cartCount++;
        cartBtn.textContent = `🛒 Panier (${cartCount})`;
        
        cartBtn.classList.add('pulse');
        cartBtn.style.background = 'var(--gradient-1)';
        cartBtn.style.color = 'white';
        cartBtn.style.borderColor = 'transparent';
        
        // Notification toast
        showToast(`✅ ${product.title} ajouté au panier !`);
        
        setTimeout(() => {
            cartBtn.classList.remove('pulse');
            cartBtn.style.background = 'transparent';
            cartBtn.style.color = 'var(--accent-color)';
            cartBtn.style.borderColor = 'var(--accent-color)';
        }, 600);

        renderCart();
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: linear-gradient(135deg, #d4af37, #f9e596);
        color: #000;
        padding: 15px 25px;
        border-radius: 15px;
        font-weight: 600;
        font-size: 0.95rem;
        z-index: 9999;
        animation: fadeUp 0.4s ease-out;
        box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4);
        max-width: 350px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.removeFromCart = function(index) {
    cartItems.splice(index, 1);
    cartCount--;
    cartBtn.textContent = `🛒 Panier (${cartCount})`;
    if(cartCount === 0) cartBtn.textContent = 'Panier (0)';
    renderCart();
}

window.checkout = async function() {
    if(cartItems.length === 0) {
        alert("Votre panier est vide.");
        return;
    }
    
    const checkoutBtn = document.querySelector('.cart-footer .btn-primary');
    checkoutBtn.textContent = '⏳ Traitement en cours...';
    checkoutBtn.disabled = true;
    
    const itemsPayload = cartItems.map(item => ({
        product_id: item.id,
        title: item.title,
        price: item.price
    }));

    try {
        const response = await fetch(`${BASE_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsPayload })
        });
        
        const data = await response.json();
        
        if(response.ok) {
            if(data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                showToast("✅ " + data.message);
                cartItems = [];
                cartCount = 0;
                cartBtn.textContent = 'Panier (0)';
                setTimeout(() => toggleCart(), 1500);
            }
        } else {
            alert("Erreur: " + data.detail);
        }
    } catch(err) {
        alert("Erreur réseau. Veuillez réessayer.");
        console.error(err);
    } finally {
        checkoutBtn.textContent = 'Passer à la caisse';
        checkoutBtn.disabled = false;
    }
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotalPrice');
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top:20px;">Votre panier est vide. 🛒</p>';
        cartTotalEl.textContent = '0.00 €';
        return;
    }

    let html = '';
    let total = 0;

    cartItems.forEach((item, index) => {
        let price = parseFloat(item.price.replace('€', '').trim());
        if(isNaN(price)) price = 0;
        total += price;

        html += `
            <div class="cart-item" style="animation: fadeUp 0.3s ease-out ${index * 0.05}s backwards;">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${item.price}</div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${index})" title="Retirer">🗑</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotalEl.textContent = total.toFixed(2) + ' €';
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('payment') === 'success') {
        setTimeout(() => showToast("✅ Paiement réussi ! Votre commande est en préparation."), 1000);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('payment') === 'cancel') {
        setTimeout(() => showToast("❌ Le paiement a été annulé."), 1000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchAndRenderProducts();
    
    // Animation d'entrée fluide du hero
    const heroElements = document.querySelectorAll('.hero-content > *');
    heroElements.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        setTimeout(() => {
            el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 300 + (i * 200));
    });
    // Lance les agents frontend
    scheduleNextNotification();
});

// --- AGENT DE PREUVE SOCIALE (SOCIAL PROOF BOT) ---
const firstNames = ["Lucas", "Emma", "Thomas", "Chloé", "Alexandre", "Camille", "Hugo", "Léa", "Maxime", "Sarah"];
const cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Rennes"];

function triggerLiveSaleNotification() {
    if (allProducts.length === 0) return;
    
    const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
    const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const timeAgo = Math.floor(Math.random() * 59) + 1;
    
    const container = document.getElementById('live-notifications');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'live-social-toast';
    toast.innerHTML = `
        <img src="${randomProduct.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
        <div>
            <div style="font-weight: bold; margin-bottom: 3px;">${randomName} de ${randomCity}</div>
            <div style="color: var(--text-secondary); font-size: 0.85rem;">A acheté <strong>${randomProduct.title}</strong></div>
            <div style="color: var(--accent-color); font-size: 0.75rem; margin-top: 5px;">Il y a ${timeAgo} min - <em>Vérifié par l'IA</em> ✅</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Supprime l'alerte après 5s
    setTimeout(() => {
        toast.style.animation = 'fadeOutDown 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Lancer le bot de preuve sociale avec un délai aléatoire entre 10s et 25s
function scheduleNextNotification() {
    const delay = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000;
    setTimeout(() => {
        triggerLiveSaleNotification();
        scheduleNextNotification();
    }, delay);
}

// --- CHATBOT IA ---
const chatbot = document.getElementById('chatbot');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const chatToggleIcon = document.getElementById('chat-toggle-icon');

function toggleChat() {
    chatbot.classList.toggle('closed');
    chatToggleIcon.textContent = chatbot.classList.contains('closed') ? '▲' : '▼';
    if(!chatbot.classList.contains('closed')) {
        chatInput.focus();
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user-message');
    chatInput.value = '';
    
    // Indicateur de frappe
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.innerHTML = '<span>●</span><span>●</span><span>●</span>';
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        typingDiv.remove();
        appendMessage(data.reply, 'bot-message');
    } catch (error) {
        typingDiv.remove();
        appendMessage("Désolé, mes serveurs sont en maintenance. Réessayez dans un instant. 🔧", 'bot-message');
    }
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    msgDiv.style.animation = 'fadeUp 0.3s ease-out';
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}
