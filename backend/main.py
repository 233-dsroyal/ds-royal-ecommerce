from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import requests
import jwt
from datetime import datetime, timedelta

app = FastAPI(title="DS ROYAL E-commerce CTO API")

# Configuration de sécurité pour l'authentification Admin
SECRET_KEY = "DS_ROYAL_EMPIRE_SECRET_KEY"
ALGORITHM = "HS256"

# Configuration de sécurité pour autoriser le site web à parler à la base de données
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Accès autorisé pour toutes les connexions (pour le développement local)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structure des données pour d'un Produit
class Product(BaseModel):
    id: int
    title: str
    price: str
    image: str
    tag: str

# Initialisation du coffre-fort de la Base de Données (Automatique si n'existe pas)
def init_db():
    conn = sqlite3.connect("ds_royal.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            price TEXT NOT NULL,
            image TEXT NOT NULL,
            tag TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            items TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Vérifie si le coffre est vide. Si oui, l'IA insère les meilleurs produits de départ.
    cursor.execute("SELECT count(*) FROM products")
    if cursor.fetchone()[0] == 0:
        sample_data = [
            ("Aspirateur Robot Intelligent IA", "349.99 €", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop", "Nettoyage Auto"),
            ("Purificateur d'Air Royal", "129.50 €", "https://images.unsplash.com/photo-1585241936939-fdd7c31d102a?q=80&w=600&auto=format&fit=crop", "Maison Zen"),
            ("Lumière d'Ambiance 360° Neon", "89.00 €", "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=600&auto=format&fit=crop", "Setup Design")
        ]
        cursor.executemany("INSERT INTO products (title, price, image, tag) VALUES (?, ?, ?, ?)", sample_data)
        conn.commit()
    conn.close()

# Création de la base au démarrage
init_db()

@app.get("/")
def read_root():
    return {"status": "success", "message": "Le cerveau IA de DS ROYAL est en ligne et 100% opérationnel !"}

@app.get("/api/products", response_model=List[Product])
def get_products():
    """Cette route renvoie la liste complète des produits stockés dans notre base de données sécurisée."""
    conn = sqlite3.connect("ds_royal.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# --- SYSTEME DE COMMANDE ET PAIEMENT (SIMULATION STRIPE) ---
class CheckoutItem(BaseModel):
    product_id: int
    title: str
    price: str

class CheckoutRequest(BaseModel):
    items: List[CheckoutItem]

@app.post("/api/checkout")
def create_checkout_session(req: CheckoutRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="Panier vide")
    
    total = 0.0
    item_titles = []
    for item in req.items:
        item_titles.append(item.title)
        try:
            val = float(item.price.replace("€", "").strip())
            total += val
        except:
            pass
            
    conn = sqlite3.connect("ds_royal.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders (items, total_amount, status) VALUES (?, ?, ?)", 
                   (", ".join(item_titles), total, "Payé (Stripe Mock)"))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Paiement réussi via le réseau Sécurisé Stripe ! Commande validée."}

# --- TABLEAU DE BORD ADMINISTRATEUR (DS ROYAL ENTREPRISE) ---
class LoginRequest(BaseModel):
    password: str

@app.post("/api/admin/login")
def admin_login(req: LoginRequest):
    # Mot de passe ultra secret de l'Empereur
    if req.password == "empire2026":
        token = jwt.encode({"sub": "admin", "exp": datetime.utcnow() + timedelta(hours=12)}, SECRET_KEY, algorithm=ALGORITHM)
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Accès refusé. Mot de passe incorrect.")

def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Accès non autorisé. Token manquant.")
    token = authorization.split(" ")[1]
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré. Veuillez vous reconnecter.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide.")
    return True

@app.get("/api/admin/stats", dependencies=[Depends(verify_token)])
def get_admin_stats():
    conn = sqlite3.connect("ds_royal.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM products")
    products_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*), SUM(total_amount) FROM orders")
    orders_row = cursor.fetchone()
    orders_count = orders_row[0]
    total_revenue = orders_row[1] if orders_row[1] else 0.0
    
    conn.close()
    return {
        "products": products_count,
        "orders": orders_count,
        "revenue": f"{total_revenue:.2f} €"
    }

@app.get("/api/admin/orders", dependencies=[Depends(verify_token)])
def get_admin_orders():
    conn = sqlite3.connect("ds_royal.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/admin/sourcing", dependencies=[Depends(verify_token)])
def run_sourcing_bot():
    try:
        response = requests.get("https://fakestoreapi.com/products?limit=5")
        if response.status_code == 200:
            api_products = response.json()
            new_gadgets = []
            for p in api_products:
                cost = float(p['price'])
                # Marge dynamique de 40% sur le coût fournisseur
                selling_price = round(cost * 1.40, 2)
                price_str = f"{selling_price} €"
                category = "Tech Premium" if p['category'] == 'electronics' else p['category'].title()
                new_gadgets.append((p['title'], price_str, p['image'], category))
            
            conn = sqlite3.connect("ds_royal.db")
            cursor = conn.cursor()
            added = 0
            for gadget in new_gadgets:
                cursor.execute("SELECT id FROM products WHERE title=?", (gadget[0],))
                if cursor.fetchone() is None:
                    cursor.execute("INSERT INTO products (title, price, image, tag) VALUES (?, ?, ?, ?)", gadget)
                    added += 1
            conn.commit()
            conn.close()
            
            return {"status": "success", "message": f"🤖 Cerveau IA : {added} nouveaux produits exclusifs importés dans le catalogue !"}
        else:
            raise HTTPException(status_code=500, detail="Fournisseurs inaccessibles.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- LE CHATBOT IA ASSISTANT ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/chat", response_model=ChatResponse)
def chat_bot(req: ChatRequest):
    msg = req.message.lower()
    conn = sqlite3.connect("ds_royal.db")
    cursor = conn.cursor()
    
    # Intelligence Artificielle basée sur des règles (Moteur V2) - Commercial Premium
    if "bonjour" in msg or "salut" in msg:
        reply = "Bonjour ! Je suis l'IA Commerciale de DS ROYAL. Prêt à découvrir nos produits exclusifs et haut de gamme ?"
    elif "aspirateur" in msg:
        cursor.execute("SELECT title, price FROM products WHERE title LIKE '%Aspirateur%'")
        prod = cursor.fetchone()
        if prod:
            reply = f"Ah, un excellent choix. Nous avons notre fameux {prod[0]} à seulement {prod[1]}. Il s'occupe de tout pendant que vous vous concentrez sur ce qui compte vraiment."
        else:
            reply = "Nos aspirateurs robots ont tous été vendus ! Mais notre bot d'intelligence artificielle est en train de sourcer les prochains modèles."
    elif "prix" in msg or "combien" in msg or "coûte" in msg:
        reply = "Chez DS ROYAL, nous vendons la qualité. Nos prix reflètent l'exclusivité de nos produits. Dites-moi quel produit vous intéresse et je vous conseillerai."
    elif "produit" in msg or "catalogue" in msg or "gadget" in msg:
        cursor.execute("SELECT COUNT(*) FROM products")
        count = cursor.fetchone()[0]
        reply = f"Notre collection comprend actuellement {count} pièces maîtresses sourcées minutieusement par notre IA. Quel domaine vous intéresse ? La tech, le design, le bien-être ?"
    elif "commande" in msg or "achat" in msg or "acheter" in msg:
        reply = "C'est très simple. Ajoutez le produit à votre panier et laissez-vous guider par notre processus de paiement Stripe 100% sécurisé."
    elif "remise" in msg or "promo" in msg or "réduction" in msg:
        reply = "Nous faisons de l'exclusif, nos prix sont déjà les meilleurs pour cette qualité. Cependant, ajoutez des articles au panier... qui sait quel avantage l'algorithme pourrait vous accorder."
    elif "merci" in msg:
        reply = "Tout le plaisir est pour moi. N'hésitez pas si vous avez d'autres questions. DS ROYAL est à votre service."
    else:
        reply = "Intéressant. Notre IA est spécialisée dans les produits de notre catalogue (High-tech, Maison, Design). Pourriez-vous reformuler pour que je puisse trouver la pépite qu'il vous faut ?"
        
    conn.close()
    return ChatResponse(reply=reply)
