from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import requests

app = FastAPI(title="DS ROYAL E-commerce CTO API")

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
@app.get("/api/admin/stats")
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

@app.get("/api/admin/orders")
def get_admin_orders():
    conn = sqlite3.connect("ds_royal.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/admin/sourcing")
def run_sourcing_bot():
    try:
        response = requests.get("https://fakestoreapi.com/products?limit=5")
        if response.status_code == 200:
            api_products = response.json()
            new_gadgets = []
            for p in api_products:
                price_str = f"{p['price']} €"
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
    
    # Intelligence Artificielle basée sur des règles (Moteur V1)
    if "bonjour" in msg or "salut" in msg:
        reply = "Bonjour ! Je suis l'IA de DS ROYAL. Comment puis-je vous aider aujourd'hui ?"
    elif "aspirateur" in msg:
        cursor.execute("SELECT title, price FROM products WHERE title LIKE '%Aspirateur%'")
        prod = cursor.fetchone()
        if prod:
            reply = f"Nous avons notre fameux {prod[0]} au prix incroyable de {prod[1]}. Il est parfait pour un nettoyage 100% automatisé."
        else:
            reply = "Nous n'avons plus d'aspirateurs en stock pour le moment, notre Robot d'importation est en train d'en chercher !"
    elif "prix" in msg or "combien" in msg or "coûte" in msg:
        reply = "Tous nos produits haut de gamme ont des prix extrêmement compétitifs affichés sur notre vitrine. Vous souhaitez un renseignement sur un produit précis ?"
    elif "produit" in msg or "catalogue" in msg or "gadget" in msg:
        cursor.execute("SELECT COUNT(*) FROM products")
        count = cursor.fetchone()[0]
        reply = f"Nous avons actuellement {count} produits exceptionnels en catalogue, spécialement sourcés par l'Intelligence Artificielle de notre Directeur Technique."
    elif "commande" in msg or "achat" in msg:
        reply = "Pour passer une commande, il vous suffit de cliquer sur 'Ajouter au Panier' sur le produit de votre choix, puis d'ouvrir votre panier et passer à la caisse. Le système s'occupera du reste."
    else:
        reply = "C'est très intéressant ! En tant qu'assistant virtuel, je peux vous renseigner sur notre catalogue (Aspirateurs, Purificateurs...). Que recherchez-vous exactement ?"
        
    conn.close()
    return ChatResponse(reply=reply)
