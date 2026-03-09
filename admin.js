// ============================================================
// DS ROYAL - ADMIN DASHBOARD v2.0
// ============================================================

// --- CONFIGURATION INTELLIGENTE (Auto-détection local/production) ---
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api/admin'
    : 'https://ds-royal-api.onrender.com/api/admin';

function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function checkAuth(response) {
    if (response.status === 401) {
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').textContent = 'Session expirée. Reconnexion requise.';
        localStorage.removeItem('adminToken');
        throw new Error('Non autorisé');
    }
}

async function fetchStats() {
    try {
        const response = await fetch(`${BASE_URL}/stats`, { headers: getAuthHeaders() });
        checkAuth(response);
        const stats = await response.json();
        
        // Animation compteur
        animateValue('statsRevenue', stats.revenue);
        animateValue('statsOrders', stats.orders);
        animateValue('statsProducts', stats.products);
    } catch (err) {
        console.error('Erreur stats:', err);
    }
}

function animateValue(elementId, finalValue) {
    const el = document.getElementById(elementId);
    el.style.transition = 'transform 0.3s';
    el.style.transform = 'scale(1.1)';
    setTimeout(() => {
        el.textContent = finalValue;
        el.style.transform = 'scale(1)';
    }, 150);
}

async function fetchOrders() {
    try {
        const response = await fetch(`${BASE_URL}/orders`, { headers: getAuthHeaders() });
        checkAuth(response);
        const orders = await response.json();
        
        const tbody = document.getElementById('ordersTableBody');
        
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">Aucune commande pour le moment. L'empire se construit ! 🚀</td></tr>`;
            return;
        }

        let html = '';
        orders.forEach((order, index) => {
            const d = new Date(order.date);
            const dateStr = d.toLocaleDateString('fr-FR', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const itemsCut = order.items.length > 50 ? order.items.substring(0, 50) + "..." : order.items;

            html += `
                <tr style="animation: fadeUp 0.4s ease-out ${index * 0.05}s backwards;">
                    <td style="font-weight: 600;">#DS-${1000 + order.id}</td>
                    <td>${dateStr}</td>
                    <td title="${order.items}">${itemsCut}</td>
                    <td style="color: var(--accent-color); font-weight: bold;">${order.total_amount.toFixed(2)} €</td>
                    <td><span class="status-badge">${order.status}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (err) {
        console.error('Erreur orders:', err);
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ff6b6b;">Erreur de connexion au Cerveau IA.</td></tr>`;
    }
}

window.refreshAdmin = async function() {
    const btn = document.querySelector('.nav-actions .btn');
    btn.textContent = '⏳ Actualisation...';
    btn.style.opacity = '0.5';
    
    await fetchStats();
    await fetchOrders();
    
    setTimeout(() => {
        btn.textContent = '🔄 Actualiser les données';
        btn.style.opacity = '1';
    }, 500);
}

window.runSourcingBot = async function() {
    const btn = document.getElementById('sourcingBtn');
    const originalText = btn.textContent;
    btn.textContent = '🤖 Scan en cours...';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    try {
        const response = await fetch(`${BASE_URL}/sourcing`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        checkAuth(response);
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            refreshAdmin();
        } else {
            alert('Erreur: ' + data.detail);
        }
    } catch (err) {
        console.error('Erreur Bot:', err);
        alert('Erreur de connexion avec le Cerveau IA.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// --- SYSTÈME D'AUTHENTIFICATION ---
window.loginAdmin = async function() {
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.querySelector('.login-box .btn-primary');
    
    loginBtn.textContent = '⏳ Vérification...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('adminToken', data.token);
            document.getElementById('loginOverlay').style.display = 'none';
            errorEl.style.display = 'none';
            document.getElementById('adminPassword').value = '';
            refreshAdmin();
        } else {
            errorEl.style.display = 'block';
            errorEl.textContent = '❌ Mot de passe incorrect.';
        }
    } catch (err) {
        errorEl.style.display = 'block';
        errorEl.textContent = '🔌 Erreur de connexion au Cerveau IA.';
    } finally {
        loginBtn.textContent = 'Déverrouiller';
        loginBtn.disabled = false;
    }
}

window.logoutAdmin = function() {
    localStorage.removeItem('adminToken');
    document.getElementById('loginOverlay').style.display = 'flex';
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('adminToken')) {
        document.getElementById('loginOverlay').style.display = 'flex';
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
        refreshAdmin();
    }
    
    // Auto-refresh toutes les 30s
    setInterval(() => {
        if (localStorage.getItem('adminToken')) {
            refreshAdmin();
        }
    }, 30000);
});
