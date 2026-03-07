import sqlite3
import time
import requests

print("🤖 [Robot Importateur DS ROYAL] Initialisation des protocoles de recherche...")
time.sleep(1)
print("📡 Scan des bases de données de fournisseurs mondiaux en cours...")

try:
    # On simule un appel à des fournisseurs avec l'API Fakestore
    response = requests.get("https://fakestoreapi.com/products?limit=5")
    if response.status_code == 200:
        api_products = response.json()
        new_gadgets = []
        for p in api_products:
            # FakeStore API donne des prix en $ on ajoute € par convention au catalogue
            price_str = f"{p['price']} €"
            category = "Tech Premium" if p['category'] == 'electronics' else p['category'].title()
            new_gadgets.append((p['title'], price_str, p['image'], category))
        print("✅ Fournisseurs trouvés, données téléchargées !")
    else:
        new_gadgets = []
        print("⚠️ Erreur de connexion au réseau des fournisseurs.")
except Exception as e:
    print(f"⚠️ Erreur système import: {e}")
    new_gadgets = []

# S'il y a un souci réseau, on ajoute toujours quelques gadgets exclusifs de secours
if not new_gadgets:
    new_gadgets = [
        ("Montre Connectée Holo-Tech", "199.99 €", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=600&auto=format&fit=crop", "Wearable Future"),
        ("Clavier Laser Infrarouge", "59.00 €", "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=600&auto=format&fit=crop", "Workspace"),
        ("Enceinte Lévitation Magnétique", "149.50 €", "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=600&auto=format&fit=crop", "Audio Premium")
    ]

# Connexion au Coffre-fort
conn = sqlite3.connect("ds_royal.db")
cursor = conn.cursor()

added_count = 0

print("-" * 50)
for gadget in new_gadgets:
    print(f"🔍 Analyse du produit : {gadget[0][:30]}...")
    time.sleep(0.4)
    
    # Vérifie si le produit n'est pas déjà dans la base
    cursor.execute("SELECT id FROM products WHERE title=?", (gadget[0],))
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO products (title, price, image, tag) VALUES (?, ?, ?, ?)", gadget)
        print(f"  ✅ Succès : Injecté dans la base de données au prix de {gadget[1]}")
        added_count += 1
    else:
        print(f"  ⚠️ Ignoré : Ce produit est déjà en rayon.")
        
print("-" * 50)
conn.commit()
conn.close()

if added_count > 0:
    print(f"🎉 Mission accomplie, Patron ! {added_count} nouveaux produits ont été ajoutés et sont DIRECTEMENT visibles sur la boutique en ligne.")
else:
    print("🤖 Le catalogue est déjà à jour, Patron.")
