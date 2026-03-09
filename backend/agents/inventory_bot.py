import sqlite3
import time
import random
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ds_royal.db")

print("🤖 [Agent Logistique IA] Vérification des niveaux de stock...")
time.sleep(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, title, stock_count FROM products")
    products = cursor.fetchall()
    
    for p in products:
        prod_id, title, raw_stock = p
        stock: int = 15 if raw_stock is None else int(raw_stock)
            
        if stock > 0:
            decrease = random.randint(0, 3)
            new_stock = max(0, stock - decrease)
            if new_stock < 5 and stock >= 5:
                print(f"⚠️ Alerte : {title} n'a plus que {new_stock} unités ! La rareté augmente.")
        else:
            new_stock = random.randint(10, 30)
            print(f"📦 Réapprovisionnement IA effectué pour: {title} (+{new_stock} unités)")
            
        cursor.execute("UPDATE products SET stock_count = ? WHERE id = ?", (new_stock, prod_id))
        
    conn.commit()
    print("✅ Le niveau des stocks a été mis à jour sur la boutique.")
except Exception as e:
    print(f"Erreur Agent Logistique: {e}")
finally:
    conn.close()
