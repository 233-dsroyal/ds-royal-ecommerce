from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import requests
import jwt
import stripe
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta

# --- CONFIGURATION PRODUCTION ---
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://adorable-fox-92c60e.netlify.app")
EMAIL_USER = os.environ.get("EMAIL_USER", "")
EMAIL_PASS = os.environ.get("EMAIL_PASS", "")

def send_order_email(amount, items):
    if not EMAIL_USER or not EMAIL_PASS:
        return
    try:
        msg = MIMEText(f"Bonjour, une commande de {amount}€ pour les articles suivants a été passée :\n{items}\nBravo ! L'empire grandit.")
        msg['Subject'] = 'Nouvelle Commande DS ROYAL'
        msg['From'] = EMAIL_USER
        msg['To'] = EMAIL_USER
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"Erreur envoi email: {e}")

# --- CONFIGURATION PRODUCTION ---
DB_PATH = os.environ.get("DB_PATH", "ds_royal.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "DS_ROYAL_EMPIRE_SECRET_KEY_2026")
ALGORITHM = "HS256"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "empire2026")

app = FastAPI(title="DS ROYAL E-commerce CTO API", version="2.0")

# Configuration CORS pour autoriser le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODÈLES DE DONNÉES ---
class Product(BaseModel):
    id: int
    title: str
    price: str
    image: str
    tag: str

class CheckoutItem(BaseModel):
    product_id: int
    title: str
    price: str

class CheckoutRequest(BaseModel):
    items: List[CheckoutItem]

class LoginRequest(BaseModel):
    password: str

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# --- BASE DE DONNÉES ---
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect(DB_PATH)
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
    cursor.execute("SELECT count(*) FROM products")
    if cursor.fetchone()[0] == 0:
        sample_data = [
            ("Aspirateur Robot Intelligent IA", "349.99 €", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop", "Nettoyage Auto"),
            ("Purificateur d'Air Royal", "129.50 €", "https://images.unsplash.com/photo-1585241936939-fdd7c31d102a?q=80&w=600&auto=format&fit=crop", "Maison Zen"),
            ("Lumière d'Ambiance 360° Neon", "89.00 €", "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=600&auto=format&fit=crop", "Setup Design"),
            ("Casque Audio Sans Fil Premium", "199.99 €", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop", "Tech Premium"),
            ("Lampe de Bureau LED Futuriste", "69.90 €", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop", "Setup Design"),
            ("Enceinte Bluetooth Lévitation", "159.00 €", "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=600&auto=format&fit=crop", "Tech Premium"),
        ]
        cursor.executemany("INSERT INTO products (title, price, image, tag) VALUES (?, ?, ?, ?)", sample_data)
        conn.commit()
    conn.close()

init_db()

# --- ROUTES API ---
@app.get("/")
def read_root():
    return {"status": "online", "message": "🚀 Le cerveau IA de DS ROYAL est en ligne et 100% opérationnel !", "version": "2.0"}

@app.get("/api/products", response_model=List[Product])
def get_products():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/products/{product_id}", response_model=Product)
def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Produit introuvable dans le catalogue.")
    return dict(row)

# --- SYSTÈME DE COMMANDE ---
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
            
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if STRIPE_SECRET_KEY:
        try:
            line_items = []
            for item in req.items:
                try:
                    val = int(float(item.price.replace("€", "").strip()) * 100)
                except ValueError:
                    val = 0
                line_items.append({
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {'name': item.title},
                        'unit_amount': val,
                    },
                    'quantity': 1,
                })
            
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f"{FRONTEND_URL}/?payment=success",
                cancel_url=f"{FRONTEND_URL}/?payment=cancel",
            )
            cursor.execute("INSERT INTO orders (items, total_amount, status) VALUES (?, ?, ?)", 
                           (", ".join(item_titles), total, "En attente ✅"))
            conn.commit()
            conn.close()
            send_order_email(total, ", ".join(item_titles))
            return {"status": "success", "checkout_url": session.url}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(e)}")
    else:
        cursor.execute("INSERT INTO orders (items, total_amount, status) VALUES (?, ?, ?)", 
                       (", ".join(item_titles), total, "Payé ✅ (Test)"))
        conn.commit()
        conn.close()
        send_order_email(total, ", ".join(item_titles))
        return {"status": "success", "message": f"Commande confirmée ! Total : {total:.2f} €. Merci pour votre achat chez DS ROYAL !"}

# --- AUTHENTIFICATION ADMIN ---
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

@app.post("/api/admin/login")
def admin_login(req: LoginRequest):
    if req.password == ADMIN_PASSWORD:
        token = jwt.encode({"sub": "admin", "exp": datetime.utcnow() + timedelta(hours=12)}, SECRET_KEY, algorithm=ALGORITHM)
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Accès refusé. Mot de passe incorrect.")

# --- TABLEAU DE BORD ADMIN ---
@app.get("/api/admin/stats", dependencies=[Depends(verify_token)])
def get_admin_stats():
    conn = sqlite3.connect(DB_PATH)
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
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/admin/sourcing", dependencies=[Depends(verify_token)])
def run_sourcing_bot():
    try:
        response = requests.get("https://fakestoreapi.com/products?limit=5", timeout=10)
        if response.status_code == 200:
            api_products = response.json()
            new_gadgets = []
            for p in api_products:
                cost = float(p['price'])
                selling_price = round(cost * 1.40, 2)
                price_str = f"{selling_price} €"
                category = "Tech Premium" if p['category'] == 'electronics' else p['category'].title()
                new_gadgets.append((p['title'], price_str, p['image'], category))
            
            conn = sqlite3.connect(DB_PATH)
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
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=500, detail="Timeout - Le réseau fournisseur est lent.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CHATBOT IA ---
@app.post("/api/chat", response_model=ChatResponse)
def chat_bot(req: ChatRequest):
    msg = req.message.lower()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if "bonjour" in msg or "salut" in msg or "hello" in msg or "hi" in msg:
        reply = "Bonjour et bienvenue ! 👑 Je suis l'IA Commerciale de DS ROYAL. Comment puis-je vous aider à trouver le gadget parfait aujourd'hui ?"
    elif "aspirateur" in msg or "robot" in msg:
        cursor.execute("SELECT title, price FROM products WHERE title LIKE '%Aspirateur%' OR title LIKE '%Robot%'")
        prod = cursor.fetchone()
        if prod:
            reply = f"Excellent choix ! Nous avons notre fameux {prod[0]} à seulement {prod[1]}. Il s'occupe de tout pendant que vous profitez de la vie. Voulez-vous l'ajouter au panier ?"
        else:
            reply = "Nos robots sont en cours de réapprovisionnement ! Notre IA de sourcing travaille 24/7 pour trouver les meilleurs modèles."
    elif "casque" in msg or "audio" in msg or "musique" in msg:
        cursor.execute("SELECT title, price FROM products WHERE title LIKE '%Casque%' OR title LIKE '%Audio%' OR title LIKE '%Enceinte%'")
        prod = cursor.fetchone()
        if prod:
            reply = f"Pour les amateurs de son, je recommande notre {prod[0]} à {prod[1]}. Une qualité sonore exceptionnelle, digne de DS ROYAL."
        else:
            reply = "Notre collection audio arrive bientôt ! Restez connecté."
    elif "lumière" in msg or "lampe" in msg or "led" in msg:
        cursor.execute("SELECT title, price FROM products WHERE title LIKE '%Lumière%' OR title LIKE '%Lampe%' OR title LIKE '%LED%'")
        prod = cursor.fetchone()
        if prod:
            reply = f"Pour créer l'ambiance parfaite : {prod[0]} à {prod[1]}. Un bijou de design qui transforme n'importe quel espace."
        else:
            reply = "Notre gamme d'éclairage design sera bientôt disponible !"
    elif "prix" in msg or "combien" in msg or "coûte" in msg or "cher" in msg:
        reply = "Chez DS ROYAL, nous proposons l'excellence à des prix justes. Nos produits vont de 69€ à 349€. Quel type de produit vous intéresse ?"
    elif "produit" in msg or "catalogue" in msg or "gadget" in msg or "quoi" in msg:
        cursor.execute("SELECT COUNT(*) FROM products")
        count = cursor.fetchone()[0]
        reply = f"Notre collection comprend {count} pièces d'exception sourcées par notre IA. Catégories : 🏠 Maison Zen, 🖥️ Tech Premium, 🧹 Nettoyage Auto, 🎨 Setup Design. Laquelle vous attire ?"
    elif "commande" in msg or "achat" in msg or "acheter" in msg or "panier" in msg:
        reply = "C'est simple ! Cliquez sur 'Ajouter au Panier', puis 'Passer à la caisse'. Paiement 100% sécurisé par Stripe. Livraison rapide garantie ! 🚀"
    elif "livraison" in msg or "délai" in msg or "expédition" in msg:
        reply = "Nous livrons en 3-5 jours ouvrés en France métropolitaine. Livraison express disponible en 24h pour les commandes passées avant 14h. 📦"
    elif "retour" in msg or "rembours" in msg or "garantie" in msg:
        reply = "Satisfaction garantie ! Retour gratuit sous 30 jours. Garantie constructeur de 2 ans sur tous nos produits. Votre confiance est notre priorité."
    elif "remise" in msg or "promo" in msg or "réduction" in msg or "code" in msg:
        reply = "Nos prix sont déjà optimisés par notre IA. Cependant, ajoutez 3+ articles au panier et l'algorithme pourrait vous réserver une surprise... 😏"
    elif "merci" in msg or "super" in msg or "top" in msg:
        reply = "Tout le plaisir est pour moi ! 🙏 DS ROYAL est honoré de vous servir. N'hésitez pas à revenir, je suis disponible 24/7."
    elif "qui" in msg and ("es" in msg or "êtes" in msg):
        reply = "Je suis l'Intelligence Artificielle Commerciale de DS ROYAL 🤖. Je connais chaque produit de notre catalogue et je suis là pour vous guider vers le choix parfait !"
    else:
        reply = "Je suis spécialisé dans notre catalogue DS ROYAL (Tech, Maison, Design). Dites-moi ce que vous cherchez et je trouverai la perle rare pour vous ! 💎"
        
    conn.close()
    return ChatResponse(reply=reply)

# Health check pour Render
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
