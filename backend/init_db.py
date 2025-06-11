import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'banner_data.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    impressions INTEGER NOT NULL,
    ctr REAL NOT NULL,
    month TEXT NOT NULL
)
''')
cursor.executemany('''
INSERT INTO banners (name, impressions, ctr, month) VALUES (?, ?, ?, ?)
''', [
    ("Banner A", 15000, 5.0, "2024-05"),
    ("Banner B", 20000, 7.0, "2024-05"),
    ("Banner C", 12000, 4.5, "2024-05")
])
conn.commit()
conn.close() 