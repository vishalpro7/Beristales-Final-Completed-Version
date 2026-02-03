document.addEventListener('DOMContentLoaded', () => {
    const dashboardView = document.getElementById('dashboard-view'), typingView = document.getElementById('typing-view');
    const nextView = document.getElementById('next-view'), textArea = document.getElementById('text-area');
    const startBtn = document.getElementById('startBtn'), nextBtn = document.getElementById('nextBtn');
    const overlay = document.getElementById('overlay'), overlayBtn = document.getElementById('overlayBtn');
    const aiMistakesSummary = document.getElementById('ai-mistakes-summary'), moduleNameTag = document.getElementById('module-name');

    let mode = "initial", moduleQueue = [], currentRounds = [], roundPos = 0;
    let spans = [], caretIndex = 0, running = false, mistakes = {}, startTime = null, totalTyped = 0, correctCount = 0;

    const assessmentSentences = [
        "The quick brown fox jumps over the lazy dog",
        "Pack my box with five dozen liquor jugs",
        "Sphinx of black quartz judge my vow",
        "How quickly daft jumping zebras vex"
    ];

    function renderRound() {
        textArea.innerHTML = "";
        const sentence = currentRounds[roundPos];
        if (!sentence) { handlePhaseEnd(); return; }
        sentence.split("").forEach(ch => {
            const sp = document.createElement('span');
            sp.textContent = ch;
            textArea.appendChild(sp);
        });
        spans = [...textArea.querySelectorAll('span')];
        caretIndex = 0;
        updatePointer();
        document.getElementById('round-index').textContent = roundPos + 1;
    }

    function updatePointer() {
        spans.forEach(s => s.classList.remove('current'));
        if (spans[caretIndex]) spans[caretIndex].classList.add('current');
    }

    const proceed = () => { nextView.style.display = "none"; typingView.style.display = "block"; startNextModule(); };
    nextBtn.onclick = proceed;

    startBtn.onclick = () => {
        dashboardView.style.display = "none"; typingView.style.display = "block"; startBtn.style.visibility = "hidden";
        currentRounds = assessmentSentences; renderRound(); running = true; textArea.focus();
    };

    document.onkeydown = (e) => {
        if (nextView.style.display === "block" && e.key === " ") { e.preventDefault(); proceed(); return; }
        if (!running || ["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
        if (!startTime) startTime = Date.now();
        if (e.key === "Backspace" && caretIndex > 0) {
            caretIndex--; if (spans[caretIndex].className === "correct") correctCount--;
            spans[caretIndex].className = ""; totalTyped--; updatePointer(); return;
        }
        if (e.key.length === 1) {
            totalTyped++; const expected = spans[caretIndex].textContent;
            if (e.key === expected) { spans[caretIndex].className = "correct"; correctCount++; }
            else { spans[caretIndex].className = "incorrect"; mistakes[expected.toLowerCase()] = (mistakes[expected.toLowerCase()] || 0) + 1; }
            caretIndex++; updatePointer(); updateStats();
            if (caretIndex >= spans.length) { roundPos++; if (roundPos < currentRounds.length) renderRound(); else handlePhaseEnd(); }
        }
    };

    function updateStats() {
        const elapsed = (Date.now() - startTime) / 60000;
        document.getElementById('wpm').textContent = Math.round((correctCount / 5) / elapsed) || 0;
        document.getElementById('accuracy').textContent = Math.round((correctCount / totalTyped) * 100) + "%";
    }

    async function handlePhaseEnd() {
        running = false;
        if (mode === "initial") {
            const res = await fetch('/tutor_words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mistakes }) });
            const data = await res.json();
            moduleQueue = data.modules; 
            const keys = Object.keys(mistakes).filter(k => k.match(/[a-z]/)).sort().map(k => k.toUpperCase());
            aiMistakesSummary.innerHTML = keys.length > 0 ? keys.join(", ") : "Perfect!";
            overlay.style.display = "flex";
        } else if (mode === "tutor") { typingView.style.display = "none"; nextView.style.display = "block"; }
        else { location.reload(); }
    }

    overlayBtn.onclick = () => { overlay.style.display = "none"; mode = "tutor"; startNextModule(); };

    function startNextModule() {
        const mod = moduleQueue.shift();
        if (!mod) { location.reload(); return; }
        document.getElementById('module-display').style.visibility = "visible";
        moduleNameTag.textContent = mod.name;
        currentRounds = mod.words; roundPos = 0; renderRound(); running = true; textArea.focus();
    }
});