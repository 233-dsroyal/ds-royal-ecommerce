const BASE_URL = 'http://127.0.0.1:8000/api/admin'; // TODO: Change back to Render for production

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
        
        document.getElementById('statsRevenue').textContent = stats.revenue;
        document.getElementById('statsOrders').textContent = stats.orders;
        document.getElementById('statsProducts').textContent = stats.products;
    } catch (err) {
        console.error('Erreur stats:', err);
    }
}

async function fetchOrders() {
    try {
        const response = await fetch(`${BASE_URL}/orders`, { headers: getAuthHeaders() });
        checkAuth(response);
        const orders = await response.json();
        
        const tbody = document.getElementById('ordersTableBody');
        
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">Aucune commande pour le moment. Votre IA travaille à l'acquisition.</td></tr>`;
            return;
        }

        let html = '';
        orders.forEach(order => {
            // Formater la date en Français propre
            const d = new Date(order.date);
            const dateStr = d.toLocaleDateString('fr-FR', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // Formater le texte des items (pour éviter qu'il soit trop long)
            const itemsCut = order.items.length > 50 ? order.items.substring(0, 50) + "..." : order.items;

            html += `
                <tr>
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
    btn.textContent = 'Actualisation...';
    btn.style.opacity = '0.5';
    
    await fetchStats();
    await fetchOrders();
    
    setTimeout(() => {
        btn.textContent = 'Actualiser les données';
        btn.style.opacity = '1';
    }, 500);
}

window.runSourcingBot = async function() {
    const btn = document.getElementById('sourcingBtn');
    const originalText = btn.textContent;
    btn.textContent = '🤖 Scan en cours...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${BASE_URL}/sourcing`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        checkAuth(response);
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            refreshAdmin(); // Rafraichit les stats pour voir les nouveaux produits
        } else {
            alert('Erreur: ' + data.detail);
        }
    } catch (err) {
        console.error('Erreur Bot:', err);
        alert('Erreur de connexion avec le Cerveau IA.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- SYSTÈME D'AUTHENTIFICATION ---
window.loginAdmin = async function() {
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('loginError');
    
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
            errorEl.textContent = 'Mot de passe incorrect.';
        }
    } catch (err) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Erreur de connexion au Cerveau IA.';
    }
}

window.logoutAdmin = function() {
    localStorage.removeItem('adminToken');
    document.getElementById('loginOverlay').style.display = 'flex';
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si un token existe
    if (!localStorage.getItem('adminToken')) {
        document.getElementById('loginOverlay').style.display = 'flex';
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
        refreshAdmin();
    }
    
    // Rafraichissement toutes les 30s
    setInterval(() => {
        if (localStorage.getItem('adminToken')) {
            refreshAdmin();
        }
    }, 30000);
});
