// --- GESTION DU THEME (DARK / LIGHT MODE) ---
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
        btn.textContent = '🌙';
    } else {
        root.style.setProperty('--bg-primary', '#0a0a0f');
        root.style.setProperty('--bg-secondary', '#13131a');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#a3a3b5');
        root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
        btn.textContent = '☀️';
    }
}

const productGrid = document.getElementById('productGrid');
let allProducts = [];
let currentCategory = 'All';

const BASE_URL = 'http://127.0.0.1:8000/api'; // API URL

// Fonction qui contacte l'API (Le cerveau)
async function fetchAndRenderProducts() {
    try {
        const response = await fetch(`${BASE_URL}/products`);
        
        if (!response.ok) {
            throw new Error('Erreur de connexion');
        }

        const products = await response.json();
        allProducts = products;
        renderProducts(allProducts);
        
    } catch (error) {
        console.error("Erreur:", error);
        productGrid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">Connexion en cours avec l'Intelligence Artificielle...</p>`;
    }
}

function renderProducts(productsToRender) {
    productGrid.innerHTML = '';
    if(productsToRender.length === 0) {
        productGrid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">Aucun produit trouvé pour cette recherche.</p>`;
        return;
    }

    productsToRender.forEach((prod, index) => {
        const delay = index * 0.1;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animation = `fadeUp 0.6s ease-out ${delay}s backwards`;
        
        card.innerHTML = `
            <div class="product-img-container" style="cursor: pointer;" onclick="showQuickView(${prod.id})">
                <img src="${prod.image}" alt="${prod.title}" class="product-img">
                <div class="quick-view-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.3s;">
                    <span style="color:white; font-weight:bold; border:1px solid white; padding:10px 20px; border-radius:20px;">Vue Rapide</span>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <span style="font-size: 0.85rem; color: var(--accent-color); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${prod.tag}</span>
                    <h3 class="product-title" style="margin-top: 0.5rem; cursor: pointer;" onclick="showQuickView(${prod.id})">${prod.title}</h3>
                </div>
                <div class="product-price">${prod.price}</div>
            </div>
            <button class="btn" onclick="addToCart(${prod.id})">Ajouter au Panier</button>
        `;
        
        // Add hover effect manually to the product card for the overlay
        card.addEventListener('mouseenter', () => card.querySelector('.quick-view-overlay').style.opacity = '1');
        card.addEventListener('mouseleave', () => card.querySelector('.quick-view-overlay').style.opacity = '0');
        
        productGrid.appendChild(card);
    });
}

// System de filtre
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

// Vue Rapide (Quick View)
window.showQuickView = function(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    const modal = document.getElementById('quickViewModal');
    const body = document.getElementById('quickViewBody');
    
    body.innerHTML = `
        <div style="border-radius: 15px; overflow: hidden; height: 100%; min-height: 300px; background: #fff;">
            <img src="${product.image}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div style="display: flex; flex-direction: column; justify-content: center;">
            <span style="color: var(--accent-color); font-weight: bold; letter-spacing: 2px;">${product.tag}</span>
            <h2 style="font-size: 2.5rem; margin: 10px 0;">${product.title}</h2>
            <p style="color: var(--text-secondary); line-height: 1.8; margin-bottom: 20px;">Ce produit sélectionné par notre intelligence artificielle redéfinit les standards de l'innovation. Profitez de fonctionnalités exclusives conçues pour améliorer votre quotidien de manière durable.</p>
            <div style="font-size: 2rem; font-weight: 800; color: var(--accent-color); margin-bottom: 30px;">${product.price}</div>
            <button class="btn btn-primary" onclick="addToCart(${product.id}); closeQuickView();" style="font-size:1.2rem; padding: 15px;">Ajouter au Panier</button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

window.closeQuickView = function() {
    document.getElementById('quickViewModal').style.display = 'none';
}

// Fonction panier avec micro-animation fluide
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
        cartBtn.textContent = `Panier (${cartCount})`;
        
        // Ajoute la classe d'animation pulse
        cartBtn.classList.add('pulse');
        cartBtn.style.background = 'var(--gradient-1)';
        cartBtn.style.color = 'white';
        
        // Enlève l'animation pour pouvoir la rejouer
        setTimeout(() => {
            cartBtn.classList.remove('pulse');
            cartBtn.style.background = 'transparent';
            cartBtn.style.color = 'var(--accent-color)';
        }, 400);

        renderCart();
    }
}

window.removeFromCart = function(index) {
    cartItems.splice(index, 1);
    cartCount--;
    cartBtn.textContent = `Panier (${cartCount})`;
    renderCart();
}

window.checkout = async function() {
    if(cartItems.length === 0) {
        alert("Votre panier est vide.");
        return;
    }
    
    // Preparation for API
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
            alert("✅ " + data.message + "\n\n(Simulation de la passerelle Stripe terminée avec succès)");
            cartItems = [];
            cartCount = 0;
            cartBtn.textContent = `Panier (0)`;
            toggleCart();
        } else {
            alert("Erreur: " + data.detail);
        }
    } catch(err) {
        alert("Erreur réseau avec les serveurs de paiement.");
        console.error(err);
    }
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotalPrice');
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top:20px;">Votre panier est vide.</p>';
        cartTotalEl.textContent = '0.00 €';
        return;
    }

    let html = '';
    let total = 0;

    cartItems.forEach((item, index) => {
        let price = parseFloat(item.price.replace('€', '').trim());
        if(isNaN(price)) price = 0; // Sécurité si c'est formaté bizarrement
        total += price;

        html += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${item.price}</div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${index})">🗑</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotalEl.textContent = total.toFixed(2) + ' €';
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // 1. Demande les vrais produits à notre Base de Données !
    fetchAndRenderProducts();
});

// --- LOGIQUE DU CHATBOT IA ---
const chatbot = document.getElementById('chatbot');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const chatToggleIcon = document.getElementById('chat-toggle-icon');

function toggleChat() {
    chatbot.classList.toggle('closed');
    chatToggleIcon.textContent = chatbot.classList.contains('closed') ? '▲' : '▼';
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Affiche le message de l'utilisateur
    appendMessage(text, 'user-message');
    chatInput.value = '';

    // L'ajout d'une fonction de simulation de réflexion
    setTimeout(async () => {
        try {
            const response = await fetch(`${BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            appendMessage(data.reply, 'bot-message');
        } catch (error) {
            appendMessage("Désolé, mes serveurs neuronaux sont en maintenance.", 'bot-message');
        }
    }, 500);
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}
