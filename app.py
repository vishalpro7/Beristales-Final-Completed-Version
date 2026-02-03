# app.py
from flask import Flask, render_template, request, jsonify
import random
from tutor_words import letter_words

# To this:
from tutor_words import letter_words, combination_words

app = Flask(__name__)

# Practice sentences (4 pangrams)
practice_sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "Sphinx of black quartz, judge my vow.",
    "How quickly daft jumping zebras vex."
]

# Final assessment sentences
assessment_sentences = [
    "Jackdaws love my big sphinx of quartz.",
    "The five boxing wizards jump quickly.",
    "How vexingly quick daft zebras jump.",
    "Bright vixens jump; dozy fowl quack."
]

# -----------------------
# Homepage
# -----------------------
@app.route('/')
def home():
    return render_template('index.html')

# -----------------------
# Beginner Mode
# -----------------------
@app.route('/beginner')
def beginner():
    name = request.args.get('name', 'Learner')
    return render_template('beginner.html', username=name, rounds=practice_sentences)

# -----------------------
# Touch Typing Mode
# -----------------------
@app.route('/touch')
def touch():
    name = request.args.get('name', 'Learner')
    return render_template('touchtype/touch.html', username=name, rounds=practice_sentences)

# -----------------------
# Advanced/Professional Mode
# -----------------------
@app.route('/prof')
def prof():
    name = request.args.get('name', 'Learner')
    return render_template('prof.html', username=name, rounds=practice_sentences)

# -----------------------
# Analyze typed sentence
# -----------------------
@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    typed = data.get('typed', '')
    expected = data.get('expected', '')
    mistakes = {}

    # Count mistakes per letter
    for t_char, e_char in zip(typed, expected):
        if t_char != e_char:
            mistakes[e_char.lower()] = mistakes.get(e_char.lower(), 0) + 1

    # Extra/missing letters
    if len(expected) > len(typed):
        for c in expected[len(typed):]:
            mistakes[c.lower()] = mistakes.get(c.lower(), 0) + 1
    elif len(typed) > len(expected):
        for c in typed[len(expected):]:
            mistakes[c.lower()] = mistakes.get(c.lower(), 0) + 1

    total_keys = max(len(expected), len(typed))
    correct_chars = total_keys - sum(mistakes.values())
    acc = round((correct_chars / total_keys) * 100) if total_keys > 0 else 0

    feedback = f"You completed the sentence! Accuracy: {acc}%"
    suggestions = [{"letter": k, "count": v} for k, v in mistakes.items()]

    return jsonify({"feedback": feedback, "suggestions": suggestions, "mistakes": mistakes, "accuracy": acc})

# -----------------------
# Tutor words based on mistakes
# -----------------------
@app.route('/tutor_words', methods=['POST'])
def tutor_words():
    data = request.get_json()
    mistakes = data.get('mistakes', {})
    # Sorted for alphabetical Module 1: A, Module 2: B logic
    failed_letters = sorted([l.lower() for l in mistakes.keys() if l.isalpha()])
    
    modules = []
    
    # Isolation Modules
    for char in failed_letters:
        if char in letter_words:
            modules.append({
                "name": f"Module {char.upper()}: Isolation",
                "words": random.sample(letter_words[char], min(5, len(letter_words[char])))
            })

    # Combination Modules
    if len(failed_letters) >= 2:
        for i in range(len(failed_letters)):
            for j in range(i + 1, len(failed_letters)):
                pair = failed_letters[i] + failed_letters[j]
                if pair in combination_words:
                    modules.append({
                        "name": f"Module {pair.upper()}: Combination",
                        "words": random.sample(combination_words[pair], min(4, len(combination_words[pair])))
                    })

    return jsonify({"modules": modules})
# -----------------------
# Final assessment
# -----------------------
@app.route('/assessment', methods=['GET'])
def assessment():
    sentence = random.choice(assessment_sentences)
    return jsonify({"sentence": sentence})

# -----------------------
if __name__ == '__main__':
    app.run(debug=True)
