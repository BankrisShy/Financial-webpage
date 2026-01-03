from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from db_conn import get_conn

app = Flask(__name__)
CORS(app)  # abilita CORS per tutte le origin, semplice e diretto.[web:180][web:192]


@app.route("/api/categories", methods=["GET"])
def get_categories():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, icon FROM categories ORDER BY id;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)

@app.route("/api/categories", methods=["POST"])
def create_category():
    data = request.get_json(force=True)
    name = data.get("name")
    icon = data.get("icon")

    if not name:
        return jsonify({"error": "Name required"}), 400

    conn = get_conn()
    cur = conn.cursor()

    # opzionale: evita duplicati
    cur.execute("SELECT id FROM categories WHERE name = %s", (name,))
    if cur.fetchone() is not None:
        cur.close()
        conn.close()
        return jsonify({"error": "Category already exists"}), 400

    cur.execute(
        "INSERT INTO categories (name, icon) VALUES (%s, %s) RETURNING id;",
        (name, icon),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id": new_id, "name": name, "icon": icon}), 201


@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 
            t.id,
            t.amount,
            t.description,
            t.date,
            c.id AS category_id,
            c.name AS category_name,
            c.icon AS category_icon
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        ORDER BY t.date DESC;
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    # adatta il formato per il frontend
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "amount": float(r["amount"]),
            "description": r["description"],
            "date": r["date"].isoformat(),
            "category": {
                "id": r["category_id"],
                "name": r["category_name"],
                "icon": r["category_icon"],
            },
        })
    return jsonify(result)


@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    data = request.get_json(force=True)
    amount = data.get("amount")
    description = data.get("description")
    category_id = data.get("category_id")
    date_str = data.get("date")

    if amount is None or category_id is None or date_str is None:
        return jsonify({"error": "Missing fields"}), 400

    try:
        date_val = datetime.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    conn = get_conn()
    cur = conn.cursor()

    # verifica categoria
    cur.execute("SELECT id FROM categories WHERE id = %s", (category_id,))
    if cur.fetchone() is None:
        cur.close()
        conn.close()
        return jsonify({"error": "Category not found"}), 400

    cur.execute(
        """
        INSERT INTO transactions (amount, description, date, category_id)
        VALUES (%s, %s, %s, %s)
        RETURNING id;
        """,
        (amount, description, date_val, category_id),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id": new_id}), 201


if __name__ == "__main__":
    app.run(debug=True)
