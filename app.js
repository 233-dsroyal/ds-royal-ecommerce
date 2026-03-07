const productGrid = document.getElementById('productGrid');
let allProducts = [];

// Fonction qui contacte l'API (Le cerveau) pour obtenir les vrais produits de la base de données
async function fetchAndRenderProducts() {
    try {
        const response = await fetch('https://ds-royal-api.onrender.com/api/products');
        
        if (!response.ok) {
            throw new Error('Erreur de connexion au coffre-fort DS ROYAL');
        }

        const products = await response.json();
        allProducts = products;
        
        products.forEach((prod, index) => {
            // Délai d'animation pour un effet de cascade au chargement
            const delay = index * 0.2;
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.animation = `fadeUp 0.6s ease-out ${delay}s backwards`;
            
            card.innerHTML = `
                <div class="product-img-container">
                    <img src="${prod.image}" alt="${prod.title}" class="product-img">
                </div>
                <div class="product-info">
                    <div>
                        <span style="font-size: 0.85rem; color: var(--accent-color); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${prod.tag}</span>
                        <h3 class="product-title" style="margin-top: 0.5rem;">${prod.title}</h3>
                    </div>
                    <div class="product-price">${prod.price}</div>
                </div>
                <!-- Logique pour envoyer la commande prévue plus tard -->
                <button class="btn" onclick="addToCart(${prod.id})">Ajouter au Panier</button>
            `;
            
            productGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Aucun produit n'a pu être chargé:", error);
        productGrid.innerHTML = `<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">Connexion en cours avec l'Intelligence Artificielle de DS ROYAL...</p>`;
    }
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
        const response = await fetch('https://ds-royal-api.onrender.com/api/checkout', {
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
            const response = await fetch('https://ds-royal-api.onrender.com/api/chat', {
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
