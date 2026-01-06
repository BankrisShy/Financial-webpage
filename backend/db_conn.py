import os
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # fallback locale per sviluppo sul PC
    DB_CONFIG = {
        "dbname": "nebula_finance",
        "user": "postgres",
        "password": "Patrick12@",  # o quello che usi in locale
        "host": "localhost",
        "port": 5432,
    }

    def get_conn():
        return psycopg2.connect(cursor_factory=RealDictCursor, **DB_CONFIG)
else:
    # Render: usa la URL tipo postgres://user:pass@host:port/db
    def get_conn():
        # Render di solito dà postgres://... ma psycopg2 accetta anche postgresql:// [web:36][web:35]
        url = DATABASE_URL.replace("postgres://", "postgresql://")
        return psycopg2.connect(url, cursor_factory=RealDictCursor)
