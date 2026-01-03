import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "dbname": "nebula_finance",
    "user": "postgres",
    "password": "Patrick12@",
    "host": "localhost",
    "port": 5432,
}

def get_conn():
    return psycopg2.connect(cursor_factory=RealDictCursor, **DB_CONFIG)
