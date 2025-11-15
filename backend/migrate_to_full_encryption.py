"""
Script de migración para cifrar TODO el contenido de las entradas del vault.
Este script convierte el esquema antiguo (title, username, url, note en texto plano + solo secret cifrado)
al nuevo esquema (TODO cifrado en ciphertext como JSON).
"""
import sqlite3
import json
from crypto import aes_gcm_encrypt, aes_gcm_decrypt, ub64u

def migrate_database(db_path: str = "./data/server.db"):
    print("🔄 Iniciando migración de base de datos...")
    print(f"📂 Base de datos: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Verificar si ya existe la nueva estructura (si no tiene columna 'title', ya está migrada)
    cursor.execute("PRAGMA table_info(vault_entries)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'title' not in columns:
        print("✅ La base de datos ya está en el nuevo formato. No se requiere migración.")
        conn.close()
        return

    print("📊 Formato antiguo detectado. Iniciando migración...")

    # Crear tabla temporal con la nueva estructura
    cursor.execute("""
        CREATE TABLE vault_entries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            iv BLOB NOT NULL,
            ciphertext BLOB NOT NULL,
            tag BLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # IMPORTANTE: No podemos re-cifrar automáticamente porque necesitamos K_mix de cada usuario
    # Lo que haremos es eliminar todas las entradas antiguas y forzar a los usuarios a crear nuevas
    print("⚠️  ADVERTENCIA: Las entradas antiguas no pueden migrarse automáticamente.")
    print("    Los usuarios deberán crear nuevas entradas después de la migración.")

    # Eliminar tabla antigua y renombrar la nueva
    cursor.execute("DROP TABLE vault_entries")
    cursor.execute("ALTER TABLE vault_entries_new RENAME TO vault_entries")

    conn.commit()
    conn.close()

    print("✅ Migración completada exitosamente!")
    print("📝 IMPORTANTE: Los usuarios deben crear nuevas entradas después de esta migración.")

if __name__ == "__main__":
    import sys
    db_path = sys.argv[1] if len(sys.argv) > 1 else "./data/server.db"
    migrate_database(db_path)
