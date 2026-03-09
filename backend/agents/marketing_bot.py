import sqlite3
import time
import random
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ds_royal.db")

print("🤖 [Agent Marketing IA] Initialisation de la stratégie de vente...")
time.sleep(1)
print("📊 Analyse des tendances de conversion en cours...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, title, price, original_price FROM products")
    products = cursor.fetchall()
    
    if products:
        # Reset previous flash sales
        for p in products:
            if p[3]:
                cursor.execute("UPDATE products SET price = ?, original_price = NULL WHERE id = ?", (p[3], p[0]))
        
        # Reload products
        cursor.execute("SELECT id, title, price FROM products")
        products = cursor.fetchall()
        
        flash_count = min(3, max(1, len(products) // 2))
        if flash_count > 0:
            flash_products = random.sample(products, flash_count)
            print(f"🎯 L'Agent a ciblé {len(flash_products)} produits pour une promotion flash (-20%) !")
            
            for p in flash_products:
                prod_id, title, current_price_str = p[0], p[1], p[2]
                try:
                    current_price = float(current_price_str.replace("€", "").strip())
                    new_price = round(current_price * 0.8, 2)
                    new_price_str = f"{new_price} €"
                    
                    cursor.execute("UPDATE products SET original_price = ?, price = ? WHERE id = ?", (current_price_str, new_price_str, prod_id))
                    print(f"  🏷️ FLASH SALE activée sur le front-end : {title} passe à {new_price_str} (anc. {current_price_str})")
                except ValueError:
                    pass
            conn.commit()
            print("🚀 La vente flash est désormais Live sur le site de DS ROYAL !")
    else:
        print("🚨 Aucun produit trouvé dans la base.")
except Exception as e:
    print(f"⚠️ Erreur Agent Marketing : {e}")
finally:
    conn.close()
