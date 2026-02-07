import sqlite3
import json
import random
import time
from flask import Flask, render_template, request, jsonify, g
from tutor_words import letter_words, combination_words, beginner_curriculum, master_word_list

app = Flask(__name__)
DATABASE = 'beristales.db'

# --- Database Setup ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None: db.close()

def init_db():
    with app.app_context():
        db = get_db()
        db.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)')
        db.execute('CREATE TABLE IF NOT EXISTS stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, mode TEXT, wpm INTEGER, accuracy REAL, mistakes TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
        db.commit()

# --- Routes ---
@app.route('/')
def home(): return render_template('index.html')
@app.route('/beginner')
def beginner(): return render_template('beginner.html', username=request.args.get('name', 'Learner'))
@app.route('/touch')
def touch(): return render_template('touch.html', username=request.args.get('name', 'Learner'))
@app.route('/prof')
def prof(): return render_template('prof.html', username=request.args.get('name', 'Learner'))

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    name = data.get('name')
    if not name: return jsonify({"error": "Name required"}), 400
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE name = ?", (name,))
    user = cur.fetchone()
    if not user:
        cur = db.execute("INSERT INTO users (name) VALUES (?)", (name,))
        db.commit()
        user_id = cur.lastrowid
    else: user_id = user['id']
    return jsonify({"id": user_id, "name": name})

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    data = request.get_json()
    try:
        db = get_db()
        db.execute("INSERT INTO stats (user_id, mode, wpm, accuracy, mistakes) VALUES (?, ?, ?, ?, ?)",
            (data.get('userId'), data.get('mode'), data.get('wpm'), data.get('accuracy'), json.dumps(data.get('mistakes', []))))
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"error": str(e)}), 500

# --- SHARED TEXT GENERATOR (Used by Beginner & Touch) ---
def generate_bulk_text(targets, type="practice"):
    """
    Generates text blocks.
    Practice: ~90 words. Assessment: ~220 words. Final: ~650 words.
    """
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
    
    # Custom Remedial Modules
    for char, count in error_counts.items():
        if count >= 1: 
            final_modules.append({
                "name": f"Focus: Key '{char.upper()}'", "type": "remedial",
                "practice_text": generate_bulk_text([char], "practice"),
                "assess_text": generate_bulk_text([char], "assessment")
            })

    # Default Curriculum
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
    failed_chars = set()
    for m in mistakes:
        char = m.get('expected', '').lower()
        if char.isalpha(): failed_chars.add(char)
    return jsonify({"text": generate_bulk_text(list(failed_chars), "practice"), "message": f"Focus on {', '.join(failed_chars).upper()}"})

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


# ==========================================
#           PROFESSIONAL MODE APIs
# ==========================================

@app.route('/api/prof/words', methods=['GET'])
def get_prof_words():
    count = request.args.get('count', default=50, type=int)
    # Get random words from master list
    words = random.choices(master_word_list, k=count)
    return jsonify({"words": words})


# --- Legacy / Fallback ---
@app.route('/tutor_words', methods=['POST'])
def tutor_words_route(): return jsonify({"modules": []})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=3000)