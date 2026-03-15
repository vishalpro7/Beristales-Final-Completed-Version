import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import random
import time
from flask import Flask, render_template, request, jsonify, g
from tutor_words import letter_words, combination_words, beginner_curriculum, master_word_list

app = Flask(__name__)

# --- DATABASE CONFIGURATION ---
# REPLACE '****' WITH YOUR ACTUAL NEON PASSWORD: npg_vQRP80cXgsCB
DATABASE_URL = "postgresql://neondb_owner:npg_vQRP80cXgsCB@ep-hidden-queen-a1irnw50-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def get_db():
    if 'db' not in g:
        # Connect to Neon PostgreSQL
        g.db = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initializes the database with PostgreSQL compatible tables."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Create Users Table (SERIAL is used instead of AUTOINCREMENT in Postgres)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        );
    ''')
    
    # Create Stats Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            mode TEXT,
            wpm INTEGER,
            accuracy REAL,
            mistakes TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    
    conn.commit()
    cur.close()
    conn.close()
    print("Database initialized successfully on Neon!")

# --- Routes ---
@app.route('/')
def home(): 
    return render_template('index.html')

@app.route('/beginner')
def beginner(): 
    return render_template('beginner.html', username=request.args.get('name', 'Learner'))

@app.route('/touch')
def touch(): 
    return render_template('touch.html', username=request.args.get('name', 'Learner'))

@app.route('/prof')
def prof(): 
    return render_template('prof.html', username=request.args.get('name', 'Learner'))

@app.route('/portfolio')
def portfolio(): 
    return render_template('portfolio.html', username=request.args.get('name', 'Learner'))

# --- CORE APIs ---
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    name = data.get('name')
    if not name: return jsonify({"error": "Name required"}), 400
    
    conn = get_db()
    cur = conn.cursor()
    
    # Check if user exists (Uses %s placeholder for Postgres)
    cur.execute("SELECT * FROM users WHERE name = %s", (name,))
    user = cur.fetchone()
    
    if not user:
        # Postgres requires 'RETURNING id' to get the ID of the inserted row
        cur.execute("INSERT INTO users (name) VALUES (%s) RETURNING id", (name,))
        conn.commit()
        user_id = cur.fetchone()['id']
    else:
        user_id = user['id']
        
    cur.close()
    return jsonify({"id": user_id, "name": name})

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    data = request.get_json()
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Uses %s placeholders
        cur.execute("""
            INSERT INTO stats (user_id, mode, wpm, accuracy, mistakes) 
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data.get('userId'), 
            data.get('mode'), 
            data.get('wpm'), 
            data.get('accuracy'), 
            json.dumps(data.get('mistakes', []))
        ))
        
        conn.commit()
        cur.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error saving stats: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/user-stats/<int:user_id>', methods=['GET'])
def get_user_stats(user_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Fetch stats ordered by time
        cur.execute("SELECT mode, wpm, accuracy, timestamp FROM stats WHERE user_id = %s ORDER BY timestamp ASC", (user_id,))
        rows = cur.fetchall()
        
        # RealDictCursor already returns rows as dicts, but we clean the timestamp
        stats_list = []
        for row in rows:
            row_dict = dict(row)
            # Convert timestamp to string for JSON serialization
            if row_dict.get('timestamp'):
                row_dict['timestamp'] = str(row_dict['timestamp'])
            stats_list.append(row_dict)
        
        cur.close()
        return jsonify({"status": "success", "stats": stats_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SHARED TEXT GENERATOR ---
def generate_bulk_text(targets, type="practice"):
    relevant_words = []
    if targets == "all":
        relevant_words = master_word_list
    else:
        for t in targets:
            matches = [w for w in master_word_list if t in w]
            relevant_words.extend(matches)
        if len(relevant_words) < 20:
            relevant_words.extend(random.sample(master_word_list, 50))

    word_count = 90 if type == "practice" else 220
    if type == "final": word_count = 650

    generated_text = []
    current_para = []
    
    for i in range(word_count):
        word = random.choice(relevant_words)
        current_para.append(word)
        if len(current_para) > 45: 
            generated_text.append(" ".join(current_para))
            current_para = []
            
    if current_para: generated_text.append(" ".join(current_para))
    return "\n\n".join(generated_text)


# ==========================================
#           BEGINNER MODE APIs
# ==========================================

@app.route('/api/beginner/analyze', methods=['POST'])
def beginner_analyze():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    
    error_counts = {}
    for m in mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): error_counts[char] = error_counts.get(char, 0) + 1

    final_modules = []
    
    for char, count in error_counts.items():
        if count >= 1: 
            final_modules.append({
                "name": f"Focus: Key '{char.upper()}'", "type": "remedial",
                "practice_text": generate_bulk_text([char], "practice"),
                "assess_text": generate_bulk_text([char], "assessment")
            })

    for m in beginner_curriculum:
        mod_copy = m.copy()
        mod_copy["practice_text"] = generate_bulk_text(list(m['chars']), "practice")
        mod_copy["assess_text"] = generate_bulk_text(list(m['chars']), "assessment")
        final_modules.append(mod_copy)

    return jsonify({"modules": final_modules})

@app.route('/api/beginner/retry', methods=['POST'])
def beginner_retry():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    wpm = data.get('wpm', 0)
    acc = data.get('acc', 0)
    
    # 1. Generate Heatmap Data
    heatmap = {}
    failed_chars = set()
    for m in mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): 
            heatmap[char] = heatmap.get(char, 0) + 1
            failed_chars.add(char)
            
    # 2. Bigram (Combination) Analysis
    bigrams = {}
    for m in mistakes:
        prev = m.get('prev', '').lower()
        curr = m.get('expected', '').lower()
        if prev.isalpha() and curr.isalpha():
            pair = f"{prev}-{curr}"
            bigrams[pair] = bigrams.get(pair, 0) + 1
            
    # Sort combinations by how many times they failed them
    sorted_bigrams = sorted(bigrams.items(), key=lambda x: x[1], reverse=True)
    top_bigrams = [b[0] for b in sorted_bigrams[:2]] # Get top 2 worst combinations
    
    # 3. Dynamic Intelligence Generation
    if acc == 100:
        analysis_text = f"Flawless execution! You maintained a steady speed of {wpm} WPM with zero structural errors. Your muscular memory for this sequence is perfectly calibrated."
    elif acc >= 90:
        if top_bigrams:
            analysis_text = f"Excellent focus. Your overall accuracy remained high at {acc}%, but my analysis shows a slight hesitation during the transition between keys. Specifically, you struggled with the '{top_bigrams[0].upper()}' combination. Review the heatmap below before we target this."
        else:
            analysis_text = f"Good performance at {wpm} WPM. You had a few isolated misstrikes, but no major structural weaknesses. Let's run a quick targeted correction."
    else:
        if len(top_bigrams) >= 2:
            analysis_text = f"We need to slow down and focus on precision. Your speed was {wpm} WPM, but your finger travel broke down specifically on the '{top_bigrams[0].upper()}' and '{top_bigrams[1].upper()}' combinations. This caused an {100-acc}% error rate. Look at the red zones on your heatmap."
        elif top_bigrams:
            analysis_text = f"Your baseline speed is decent, but you are experiencing 'key drift' causing an accuracy of {acc}%. The algorithm detected a severe muscular hesitation on the '{top_bigrams[0].upper()}' sequence. Let's aggressively target this weakness."
        else:
            analysis_text = f"Your accuracy dropped to {acc}%. You are striking keys inconsistently across the board. Take a deep breath, review the heatmap to see your weakest zones, and let's try again with a focus on pure accuracy."

    # Return the new smart data to the frontend
    return jsonify({
        "text": generate_bulk_text(list(failed_chars), "practice"), 
        "message": analysis_text,
        "heatmap": heatmap
    })

@app.route('/api/beginner/final', methods=['GET'])
def beginner_final(): return jsonify({"text": generate_bulk_text("all", "final")})

@app.route('/api/beginner/latch', methods=['POST'])
def beginner_latch():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    transitions = set()
    for m in mistakes:
        prev = m.get('prev', '').lower()
        curr = m.get('expected', '').lower()
        if prev.isalpha() and curr.isalpha(): transitions.add(prev + curr)
    
    modules = []
    for pair in transitions:
        modules.append({
            "name": f"Latch: '{pair.upper()}' Flow", "type": "latch",
            "practice_text": generate_bulk_text([pair], "practice"),
            "assess_text": generate_bulk_text([pair], "assessment")
        })
    return jsonify({"modules": modules})


# ==========================================
#           TOUCH TYPING APIs
# ==========================================

touch_curriculum = [
    {"name": "Touch Module 1: Index Fingers (F, J, G, H)", "chars": "fjgh"},
    {"name": "Touch Module 2: Middle Fingers (D, K, E, I)", "chars": "dkei"},
    {"name": "Touch Module 3: Ring Fingers (S, L, W, O)", "chars": "slwo"},
    {"name": "Touch Module 4: Pinky Fingers (A, ;, Q, P)", "chars": "a;qp"},
    {"name": "Touch Module 5: Bottom Row Reaches (V, B, N, M)", "chars": "vbnm"},
    {"name": "Touch Module 6: Corners (Z, X, C, ,, .)", "chars": "zxc,."},
    {"name": "Touch Module 7: Capital Shifts", "chars": "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {"name": "Touch Module 8: Full Keyboard Integration", "chars": "all"}
]

@app.route('/api/touch/analyze', methods=['POST'])
def touch_analyze():
    data = request.get_json()
    sighted_mistakes = data.get('sighted_mistakes', [])
    blind_mistakes = data.get('blind_mistakes', [])
    
    error_counts = {}
    for m in blind_mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): error_counts[char] = error_counts.get(char, 0) + 2
    for m in sighted_mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): error_counts[char] = error_counts.get(char, 0) + 3

    final_modules = []
    
    sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
    for char, score in sorted_errors:
        if score >= 2:
            final_modules.append({
                "name": f"Muscle Memory Fix: Key '{char.upper()}'", "type": "remedial",
                "practice_text": generate_bulk_text([char], "practice"),
                "assess_text": generate_bulk_text([char], "assessment")
            })

    for m in touch_curriculum:
        mod_copy = m.copy()
        chars = list(master_word_list) if m['chars'] == "all" else list(m['chars'])
        mod_copy["practice_text"] = generate_bulk_text(chars, "practice")
        mod_copy["assess_text"] = generate_bulk_text(chars, "assessment")
        final_modules.append(mod_copy)

    return jsonify({"modules": final_modules})

@app.route('/api/touch/retry', methods=['POST'])
def touch_retry():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    failed_chars = set()
    for m in mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): failed_chars.add(char)
    return jsonify({"text": generate_bulk_text(list(failed_chars), "practice"), "message": f"Detected drift on keys: {', '.join(failed_chars).upper()}"})

@app.route('/api/touch/latch', methods=['POST'])
def touch_latch():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    transitions = set()
    for m in mistakes:
        prev = m.get('prev', '').lower()
        curr = m.get('expected', '').lower()
        if prev.isalpha() and curr.isalpha(): transitions.add(prev + curr)
    
    modules = []
    for pair in transitions:
        modules.append({
            "name": f"Latch: '{pair.upper()}' Transition", "type": "latch",
            "practice_text": generate_bulk_text([pair], "practice"),
            "assess_text": generate_bulk_text([pair], "assessment")
        })
    return jsonify({"modules": modules})

@app.route('/api/touch/final', methods=['GET'])
def touch_final(): return jsonify({"text": generate_bulk_text("all", "final")})

@app.route('/api/prof/words', methods=['GET'])
def get_prof_words():
    count = request.args.get('count', default=50, type=int)
    words = random.choices(master_word_list, k=count)
    return jsonify({"words": words})

# --- Main Entry Point ---
if __name__ == '__main__':
    # Initialize the Neon database tables if they don't exist
    try:
        init_db()
    except Exception as e:
        print(f"Database Init Error (Check connection string): {e}")
        
    app.run(debug=True, port=3001)