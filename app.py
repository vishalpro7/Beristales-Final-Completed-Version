import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import random
import time
from collections import Counter
from flask import Flask, render_template, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from tutor_words import letter_words, combination_words, beginner_curriculum, master_word_list
import google.generativeai as genai

app = Flask(__name__)

# Configure Gemini API
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# --- DATABASE CONFIGURATION ---
DATABASE_URL = "postgresql://neondb_owner:npg_vQRP80cXgsCB@ep-hidden-queen-a1irnw50-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def get_db():
    if 'db' not in g:
        g.db = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);''')
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;")
    cur.execute('''CREATE TABLE IF NOT EXISTS stats (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), mode TEXT, wpm INTEGER, accuracy REAL, mistakes TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);''')
    cur.execute('''CREATE TABLE IF NOT EXISTS progress (user_id INTEGER REFERENCES users(id), mode TEXT, state_data TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, mode));''')
    conn.commit()
    cur.close()
    conn.close()

# --- Routes ---
@app.route('/')
def home(): return render_template('index.html')

@app.route('/beginner')
def beginner(): return render_template('beginner.html', username=request.args.get('name', 'Learner'))

@app.route('/touch')
def touch(): return render_template('touch.html', username=request.args.get('name', 'Learner'))

@app.route('/prof')
def prof(): return render_template('prof.html', username=request.args.get('name', 'Learner'))

@app.route('/portfolio')
def portfolio(): return render_template('portfolio.html', username=request.args.get('name', 'Learner'))

# --- CORE APIs & SECURE AUTH ---
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    name = data.get('name')
    password = data.get('password')
    if not name or not password: return jsonify({"error": "Name and password required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE name = %s", (name,))
    user = cur.fetchone()
    if not user:
        hashed_pw = generate_password_hash(password)
        cur.execute("INSERT INTO users (name, password_hash) VALUES (%s, %s) RETURNING id", (name, hashed_pw))
        conn.commit()
        user_id = cur.fetchone()['id']
        message = "Account created successfully."
    else:
        user_id = user['id']
        if user.get('password_hash') is None:
            hashed_pw = generate_password_hash(password)
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_pw, user_id))
            conn.commit()
            message = "Legacy account secured with new password."
        elif check_password_hash(user['password_hash'], password):
            message = "Login successful."
        else:
            cur.close()
            return jsonify({"error": "Incorrect password."}), 401
    cur.close()
    return jsonify({"id": user_id, "name": name, "message": message})

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    data = request.get_json()
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""INSERT INTO stats (user_id, mode, wpm, accuracy, mistakes) VALUES (%s, %s, %s, %s, %s)""", (data.get('userId'), data.get('mode'), data.get('wpm'), data.get('accuracy'), json.dumps(data.get('mistakes', []))))
        conn.commit()
        cur.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user-stats/<int:user_id>', methods=['GET'])
def get_user_stats(user_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT mode, wpm, accuracy, timestamp FROM stats WHERE user_id = %s ORDER BY timestamp ASC", (user_id,))
        rows = cur.fetchall()
        stats_list = []
        for row in rows:
            row_dict = dict(row)
            if row_dict.get('timestamp'): row_dict['timestamp'] = str(row_dict['timestamp'])
            stats_list.append(row_dict)
        cur.close()
        return jsonify({"status": "success", "stats": stats_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/progress/save', methods=['POST'])
def save_progress():
    data = request.get_json()
    user_id = data.get('userId')
    mode = data.get('mode')
    state_data = json.dumps(data.get('stateData', {}))
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""INSERT INTO progress (user_id, mode, state_data) VALUES (%s, %s, %s) ON CONFLICT (user_id, mode) DO UPDATE SET state_data = EXCLUDED.state_data, timestamp = CURRENT_TIMESTAMP""", (user_id, mode, state_data))
        conn.commit()
        cur.close()
        return jsonify({"status": "Progress saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/progress/load/<int:user_id>/<mode>', methods=['GET'])
def load_progress(user_id, mode):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT state_data FROM progress WHERE user_id = %s AND mode = %s", (user_id, mode))
        row = cur.fetchone()
        cur.close()
        if row and row['state_data']: return jsonify({"status": "success", "stateData": json.loads(row['state_data'])})
        return jsonify({"status": "none"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_bulk_text(targets, type="practice"):
    relevant_words = []
    if targets == "all":
        relevant_words = master_word_list
    else:
        for t in targets:
            matches = [w for w in master_word_list if t in w]
            relevant_words.extend(matches)
        if len(relevant_words) < 20: relevant_words.extend(random.sample(master_word_list, 50))
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

# --- THE TELEMETRY EXTRACTION ENGINE ---
def extract_telemetry_targets(mistakes_list):
    """
    This is the core logic that proves to the jury we are tracking LATENCY,
    not just missed characters. It sorts by the longest hesitation gaps.
    """
    if not mistakes_list: return ["e", "a", "t"]
    
    # Sort mistakes by latency_ms descending (Find the worst hesitations)
    sorted_mistakes = sorted(mistakes_list, key=lambda x: x.get('latency_ms', 0), reverse=True)
    
    targets = []
    for m in sorted_mistakes:
        prev = str(m.get('prev', '')).lower()
        expected = str(m.get('expected', '')).lower()
        # If it's a valid bigram transition
        if prev and prev not in ['start', '\n', ' '] and prev.isalpha() and expected.isalpha():
            targets.append(prev + expected)
        elif expected.isalpha():
            targets.append(expected)
            
    # Deduplicate while preserving worst-latency order
    seen = set()
    unique_targets = []
    for t in targets:
        if t not in seen:
            seen.add(t)
            unique_targets.append(t)
            
    if not unique_targets: return ["t", "h", "e"]
    return unique_targets[:3] # Return the top 3 worst spatial drift areas


# --- BEGINNER MODE APIs ---
@app.route('/api/beginner/analyze', methods=['POST'])
def beginner_analyze():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    targets = extract_telemetry_targets(mistakes)

    modules = []
    # Generate a Remedial Module based on their worst latency transitions
    modules.append({
        "name": f"Targeted Bigrams: {', '.join(targets).upper()}",
        "type": "remedial",
        "practice_text": generate_bulk_text(targets, "practice"),
        "assess_text": generate_bulk_text(targets, "practice")
    })
    # Add a core module
    modules.append({
        "name": "Core: Rhythm & Flow",
        "type": "core",
        "practice_text": generate_bulk_text("all", "practice"),
        "assess_text": generate_bulk_text("all", "practice")
    })

    return jsonify({"modules": modules})

@app.route('/api/beginner/retry', methods=['POST'])
def beginner_retry():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    targets = extract_telemetry_targets(mistakes)

    heatmap = {}
    for m in mistakes:
        key = m.get('expected', '').lower()
        if key: heatmap[key] = heatmap.get(key, 0) + 1

    try:
        prompt = f"The user failed a typing module. They showed extreme latency and errors on these specific key transitions: {', '.join(targets)}. Write exactly 2 short sentences of analytical feedback. Tell them to focus on these specific transitions."
        model = genai.GenerativeModel('gemini-2.5-flash')
        msg = model.generate_content(prompt).text.strip()
    except Exception:
        msg = f"I detected high latency around the transitions {', '.join(targets)}. Let's isolate these movements to rebuild your muscle memory."

    return jsonify({
        "message": msg,
        "heatmap": heatmap,
        "text": generate_bulk_text(targets, "practice")
    })

@app.route('/api/beginner/latch', methods=['POST'])
def beginner_latch():
    data = request.get_json()
    targets = extract_telemetry_targets(data.get('mistakes', []))
    modules = [{
        "name": f"Latch Drill: {', '.join(targets).upper()}",
        "type": "remedial",
        "practice_text": generate_bulk_text(targets, "practice"),
        "assess_text": generate_bulk_text(targets, "practice")
    }]
    return jsonify({"modules": modules})

@app.route('/api/beginner/final', methods=['GET'])
def beginner_final():
    return jsonify({"text": generate_bulk_text("all", "final")})


# --- TOUCH TYPING MODE APIs ---
@app.route('/api/touch/analyze', methods=['POST'])
def touch_analyze():
    data = request.get_json()
    blind_mistakes = data.get('blind_mistakes', [])
    # Analyze the blind mistakes to find where muscle memory broke without eyes
    targets = extract_telemetry_targets(blind_mistakes)

    modules = []
    modules.append({
        "name": f"Spatial Drift Fix: {', '.join(targets).upper()}",
        "type": "remedial",
        "practice_text": generate_bulk_text(targets, "practice"),
        "assess_text": generate_bulk_text(targets, "practice")
    })
    modules.append({
        "name": "Core: Blind Execution",
        "type": "core",
        "practice_text": generate_bulk_text("all", "practice"),
        "assess_text": generate_bulk_text("all", "practice")
    })
    return jsonify({"modules": modules})

@app.route('/api/touch/retry', methods=['POST'])
def touch_retry():
    data = request.get_json()
    mistakes = data.get('mistakes', [])
    targets = extract_telemetry_targets(mistakes)

    try:
        prompt = f"The user is doing blind touch typing and failed on these key transitions: {', '.join(targets)}. Give 1 short, punchy sentence telling them to trust their fingers and focus on these specific keys."
        model = genai.GenerativeModel('gemini-2.5-flash')
        msg = model.generate_content(prompt).text.strip()
    except Exception:
        msg = f"Stop looking down. Keep your hands anchored and focus strictly on {', '.join(targets)}."

    return jsonify({"message": msg, "text": generate_bulk_text(targets, "practice")})

@app.route('/api/touch/latch', methods=['POST'])
def touch_latch():
    data = request.get_json()
    targets = extract_telemetry_targets(data.get('mistakes', []))
    modules = [{
        "name": f"Blind Latch: {', '.join(targets).upper()}",
        "type": "remedial",
        "practice_text": generate_bulk_text(targets, "practice"),
        "assess_text": generate_bulk_text(targets, "practice")
    }]
    return jsonify({"modules": modules})

@app.route('/api/touch/final', methods=['GET'])
def touch_final():
    return jsonify({"text": generate_bulk_text("all", "final")})


# --- PROFESSIONAL MODE APIs ---
@app.route('/api/prof/words', methods=['GET'])
def get_prof_words():
    count = request.args.get('count', default=50, type=int)
    words = random.choices(master_word_list, k=count)
    return jsonify({"words": words})

@app.route('/api/prof/analyze', methods=['POST'])
def prof_analyze():
    data = request.get_json()
    wpm = data.get('wpm', 0)
    acc = data.get('acc', 0)
    time_taken = data.get('time', 0)
    
    peak_wpm = data.get('peak_wpm', wpm)
    longest_pause = data.get('longest_pause', 0)
    top_errors = data.get('top_errors', 'None')

    prompt = f"""
    You are Beristales Pro, an elite but highly practical AI typing coach.
    A human user just finished a 'Professional Mode' sprint. Analyze these advanced metrics:
    
    - Average Speed: {wpm} WPM
    - Peak Speed (Fastest Burst): {peak_wpm} WPM
    - Sustained Accuracy: {acc}%
    - Longest Pause / Hesitation: {longest_pause} seconds
    - Most Failed Keys: {top_errors}
    - Total Duration: {time_taken} seconds

    Write ONE single, highly insightful paragraph (maximum 3 sentences) analyzing their performance. 
    Speak directly to the user in the first person ("I noticed your...", "Your data shows..."). 
    Explain exactly where they did well, and where they lost rhythm (referencing their pause time and specific failed keys).
    CRITICAL RULE: True intelligence is explaining difficult things simply. Do NOT use overly exaggerated sci-fi jargon.
    Do not use emojis. Do not introduce yourself. Output the analysis directly.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return jsonify({"message": response.text.strip()})
    except Exception as e:
        print(f"Gemini API Error: {e}")
        fallback_msg = f"Analysis: You sustained {wpm} WPM, but peaked at {peak_wpm} WPM. Focus on consistency, specifically avoiding hesitations on keys like {top_errors}."
        return jsonify({"message": fallback_msg})

if __name__ == '__main__':
    app.run(debug=True, port=5000)