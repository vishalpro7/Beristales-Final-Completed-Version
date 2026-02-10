document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const aiText = document.getElementById('ai-text');
    const drillTextDiv = document.getElementById('drill-text');
    const phaseDisplay = document.getElementById('phase-display');
    const resultsPanel = document.getElementById('results-panel');
    const drillContainer = document.getElementById('drill-container');
    const keyboardWrapper = document.getElementById('keyboard-wrapper');
    const handGraphic = document.getElementById('hand-graphic');
    const guideText = document.getElementById('guide-text');
    const continueBtn = document.getElementById('continue-btn');
    const viewModulesBtn = document.getElementById('view-modules-btn');
    const moduleListModal = document.getElementById('module-list-modal');
    const moduleListContainer = document.getElementById('module-list-content');
    const user = localStorage.getItem('beristales_name') || 'Learner';

    // State Variables
    let state = 'TUTORIAL'; 
    let moduleQueue = [];
    let currentModule = null;
    let textToType = "";
    let currentIndex = 0;
    let mistakes = []; 
    let startTime = null;
    let chartInstance = null;
    let sightedMistakes = [];
    
    // Graph Vars
    let wpmHistoryLabels = [];
    let wpmHistoryData = [];
    let wpmInterval = null;

    const tutorialText = 
        "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Sphinx of black quartz judge my vow. " + 
        "Touch typing requires trusting your fingers. Do not look down. Feel the bumps on F and J. " +
        "We must compare how you type when you look versus when you rely on muscle memory. " +
        "Precision in the blind phase is the ultimate goal. Keep your hands floating above the keys.";

    function speak(text, delay=0) {
        setTimeout(() => {
            aiText.style.opacity = 0;
            setTimeout(() => {
                aiText.innerText = text;
                aiText.style.opacity = 1;
            }, 300);
        }, delay);
    }

    function init() {
        speak(`Welcome to the Soul of Beristales, ${user}. First, I need to teach you the hand positions.`);
        phaseDisplay.style.visibility = 'visible';
        startDrill("asdf jkl; asdf jkl; gh ty bn vm");
    }

    const fingerMap = {
        'q':'f-l-pinky', 'a':'f-l-pinky', 'z':'f-l-pinky',
        'w':'f-l-ring', 's':'f-l-ring', 'x':'f-l-ring',
        'e':'f-l-middle', 'd':'f-l-middle', 'c':'f-l-middle',
        'r':'f-l-index', 'f':'f-l-index', 'v':'f-l-index', 't':'f-l-index', 'g':'f-l-index', 'b':'f-l-index',
        'y':'f-r-index', 'h':'f-r-index', 'n':'f-r-index', 'u':'f-r-index', 'j':'f-r-index', 'm':'f-r-index',
        'i':'f-r-middle', 'k':'f-r-middle', ',':'f-r-middle',
        'o':'f-r-ring', 'l':'f-r-ring', '.':'f-r-ring',
        'p':'f-r-pinky', ';':'f-r-pinky',
        ' ':'f-r-thumb'
    };

    function startDrill(text) {
        // --- FIX 1: Sanitize Text (Remove \r) ---
        textToType = text.replace(/\r/g, '');
        currentIndex = 0;
        mistakes = []; 
        startTime = null;
        
        wpmHistoryLabels = ["0s"];
        wpmHistoryData = [0];
        if (wpmInterval) clearInterval(wpmInterval);

        // Render Text
        const htmlText = textToType.split('').map(char => {
            if (char === '\n') return '<br>';
            return `<span>${char}</span>`;
        }).join('');
        drillTextDiv.innerHTML = htmlText;
        drillTextDiv.scrollTop = 0;
        
        // Initial Cursor
        updateCursor(); 
        
        // Visual Aids Logic
        const showAids = ['TUTORIAL', 'TEST_SIGHTED', 'TEACHING_SIGHTED', 'TEACHING_BLIND', 'MODULE_RETRY'].includes(state);
        
        if (showAids) {
            keyboardWrapper.style.opacity = 1;
            handGraphic.style.opacity = 1;
            guideText.innerText = "GUIDE: USE THE HIGHLIGHTED FINGER";
            // Highlight first valid char
            let firstChar = textToType[0];
            if (firstChar === '\n') firstChar = textToType.replace(/^\n+/, '')[0]; 
            highlightKeyAndFinger(firstChar);
        } else {
            keyboardWrapper.style.opacity = 0; 
            handGraphic.style.opacity = 0;
            guideText.innerText = "NO VISUAL AIDS. TRUST YOUR FINGERS.";
            clearKeys();
        }

        resultsPanel.style.display = 'none';
        viewModulesBtn.style.display = 'none';
        drillContainer.style.display = 'block';

        window.removeEventListener('keydown', handleInput);
        window.addEventListener('keydown', handleInput);
    }

    function startWpmTracking() {
        if (wpmInterval) clearInterval(wpmInterval);
        let seconds = 0;
        wpmInterval = setInterval(() => {
            seconds += 2;
            if (!startTime) return;
            const minutes = (Date.now() - startTime) / 60000;
            const currentWpm = Math.round((currentIndex / 5) / (minutes || 0.001));
            wpmHistoryLabels.push(seconds + "s");
            wpmHistoryData.push(currentWpm);
        }, 2000);
    }

    function handleInput(e) {
        if (["Shift","CapsLock","Control","Alt"].includes(e.key)) return;
        if (e.key === " ") e.preventDefault(); 

        if (!startTime) {
            startTime = Date.now();
            startWpmTracking(); 
        }

        let expected = textToType[currentIndex];
        
        // --- FIX 2: Safer Newline Skip ---
        while (expected === '\n' && currentIndex < textToType.length) {
            currentIndex++;
            expected = textToType[currentIndex];
        }
        
        // End of drill check after skip
        if (currentIndex >= textToType.length) {
            finishDrill();
            return;
        }

        const spans = drillTextDiv.querySelectorAll('span');
        const typed = e.key;

        // Auto-Scroll Check (Before typing)
        updateScroll(spans);

        if (state !== 'TEST_BLIND' && state !== 'ASSESS_MODULE' && state !== 'FINAL_ASSESS') flashKey(typed);

        if (typed === expected) {
            // Find current span index
            let spanIndex = getSpanIndex(currentIndex);
            if (spans[spanIndex]) {
                spans[spanIndex].classList.add('correct');
                spans[spanIndex].classList.remove('current');
            }
            currentIndex++;
            
            // Skip trailing newlines
            while (currentIndex < textToType.length && textToType[currentIndex] === '\n') {
                currentIndex++;
            }

            if (currentIndex < textToType.length) {
                updateCursor();
                if (['TUTORIAL', 'TEST_SIGHTED', 'TEACHING_SIGHTED', 'TEACHING_BLIND', 'MODULE_RETRY'].includes(state)) {
                    highlightKeyAndFinger(textToType[currentIndex]);
                }
            } else {
                finishDrill();
            }
        } else {
            let prevChar = currentIndex > 0 ? textToType[currentIndex - 1] : 'START';
            let spanIndex = getSpanIndex(currentIndex);
            if (spans[spanIndex] && !spans[spanIndex].classList.contains('incorrect')) {
                mistakes.push({ expected: expected, typed: typed, prev: prevChar });
            }
            if (spans[spanIndex]) spans[spanIndex].classList.add('incorrect');
        }
    }

    // --- FIX 3: Robust Span Indexing ---
    // Helper to calculate which <span> matches the current text index (ignoring \n which are <br>)
    function getSpanIndex(textIdx) {
        let spanIdx = 0;
        for(let i=0; i<textIdx; i++) {
            if(textToType[i] !== '\n') spanIdx++;
        }
        return spanIdx;
    }

    function updateCursor() {
        const spans = drillTextDiv.querySelectorAll('span');
        spans.forEach(s => s.classList.remove('current'));
        
        let spanIndex = getSpanIndex(currentIndex);

        if (spans[spanIndex]) {
            spans[spanIndex].classList.add('current');
            updateScroll(spans, spanIndex);
        }
    }

    function updateScroll(spans, idx) {
        let targetIndex = idx !== undefined ? idx : getSpanIndex(currentIndex);
        const currentSpan = spans[targetIndex];
        
        if (currentSpan) {
            const spanTop = currentSpan.offsetTop;
            const containerScrollTop = drillTextDiv.scrollTop;
            const containerHeight = drillTextDiv.clientHeight;
            
            const relativeTop = spanTop - containerScrollTop;
            
            // Scroll if in the bottom 35% of the screen
            if (relativeTop > containerHeight * 0.65) {
                drillTextDiv.scrollTo({
                    top: spanTop - 100, // Move line to top area
                    behavior: 'smooth'
                });
            }
        }
    }

    function finishDrill() {
        window.removeEventListener('keydown', handleInput);
        if (wpmInterval) clearInterval(wpmInterval);
        
        const cleanLen = textToType.replace(/\n/g,'').length;
        const timeMin = (Date.now() - startTime) / 60000;
        const wpm = Math.round((cleanLen / 5) / (timeMin || 0.01));
        const accuracy = Math.round(((cleanLen - mistakes.length) / cleanLen) * 100);
        
        wpmHistoryLabels.push("End");
        wpmHistoryData.push(wpm);

        if (state === 'TUTORIAL') {
            speak("Tutorial Complete. Now, look at the keyboard and type this baseline test.");
            state = 'TEST_SIGHTED';
            document.getElementById('phase-display').innerHTML = `PHASE: <span style="color:white;">Baseline (Sighted)</span>`;
            setTimeout(() => startDrill(tutorialText), 2000);
        } else if (state === 'TEST_SIGHTED') {
            sightedMistakes = [...mistakes]; 
            speak("Baseline recorded. Now, type the SAME text WITHOUT looking at the keyboard.");
            state = 'TEST_BLIND';
            document.getElementById('phase-display').innerHTML = `PHASE: <span style="color:var(--accent-secondary);">Baseline (Blind)</span>`;
            setTimeout(() => startDrill(tutorialText), 2000);
        } else if (state === 'TEST_BLIND') {
            handleAnalysis(wpm, accuracy);
        } else if (state === 'TEACHING_SIGHTED') {
            speak("Good. Now type the same text, but DO NOT look at the keyboard.");
            state = 'TEACHING_BLIND';
            startDrill(textToType);
        } else if (state === 'TEACHING_BLIND') {
            speak("Training complete. Starting Module Assessment (No Aids).");
            startAssessment();
        } else if (state === 'MODULE_RETRY') {
            speak("Correction done. Retrying Assessment.");
            startAssessment();
        } else if (state === 'ASSESS_MODULE') {
            handleModuleAssessment(accuracy, wpm);
        } else if (state === 'FINAL_ASSESS') {
            handleFinalAssessment(accuracy, wpm);
        } else if (state === 'LATCH_REMEDIAL') {
            speak("Latch Complete. Retaking Final Exam.");
            setTimeout(startFinalAssessment, 2000);
        }
    }

    async function handleAnalysis(wpm, acc) {
        speak("Analyzing Sight vs. Blind differentials...");
        showResults(wpm, acc);

        const res = await fetch('/api/touch/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                sighted_mistakes: sightedMistakes,
                blind_mistakes: mistakes 
            }) 
        });
        const data = await res.json();
        moduleQueue = data.modules;

        viewModulesBtn.style.display = 'inline-block';
        viewModulesBtn.onclick = () => showModuleList();

        continueBtn.onclick = () => {
            speak(`I've generated ${moduleQueue.length} Touch Modules for you.`);
            setTimeout(nextModule, 1000);
        };
    }

    function nextModule() {
        if (moduleQueue.length === 0) {
            fetch('/api/touch/final')
                .then(r => r.json())
                .then(data => {
                    tutorialTextFinal = data.text; 
                    startFinalAssessment(data.text);
                });
            return;
        }

        currentModule = moduleQueue.shift();
        state = 'TEACHING_SIGHTED';
        document.getElementById('phase-display').innerHTML = `MODULE: <span style="color:white;">${currentModule.name}</span>`;
        speak(`Module: ${currentModule.name}. Phase 1: Look at the keyboard.`);
        startDrill(currentModule.practice_text);
    }

    function startAssessment() {
        state = 'ASSESS_MODULE';
        document.getElementById('phase-display').innerHTML = `MODULE: <span style="color:white;">${currentModule.name} (Test)</span>`;
        speak("Assessment Phase. No Visual Aids. Blind Type only.");
        startDrill(currentModule.assess_text);
    }

    async function handleModuleAssessment(acc, wpm) {
        if (acc < 100) {
            speak("Blind typing error detected. Generating correction drill...");
            const res = await fetch('/api/touch/retry', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ mistakes: mistakes })
            });
            const data = await res.json();
            
            state = 'MODULE_RETRY';
            document.getElementById('phase-display').innerHTML = `STATUS: <span style="color:#ff4757;">Correction</span>`;
            showResults(wpm, acc);
            
            continueBtn.innerText = "Start Correction";
            continueBtn.onclick = () => {
                speak(`Focus on these keys: ${data.message}`);
                startDrill(data.text);
            };
        } else {
            speak("Module Mastered. Next.");
            showResults(wpm, acc);
            continueBtn.innerText = "Next Module";
            continueBtn.onclick = () => nextModule();
        }
    }

    let tutorialTextFinal = ""; 
    function startFinalAssessment(textOverride) {
        state = 'FINAL_ASSESS';
        document.getElementById('phase-display').innerHTML = `STATUS: <span style="color:var(--accent-color);">FINAL EXAM</span>`;
        speak("Final Touch Examination. Complete blindness required.");
        let text = textOverride || tutorialTextFinal;
        startDrill(text); 
    }

    async function handleFinalAssessment(acc, wpm) {
        if (acc < 100) {
            speak("Final Exam Failed. Analyzing for Latch Modules...");
            const res = await fetch('/api/touch/latch', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ mistakes: mistakes })
            });
            const data = await res.json();
            if(data.modules && data.modules.length > 0) {
                data.modules.forEach(m => moduleQueue.unshift(m));
                showResults(wpm, acc);
                continueBtn.innerText = "Start Latch Phase";
                continueBtn.onclick = () => nextModule(); 
            } else {
                speak("Minor errors. Retaking Final Exam.");
                setTimeout(() => startFinalAssessment(), 2000);
            }
        } else {
            showResults(wpm, acc);
            speak("Congratulations! You have mastered Touch Typing.");
            continueBtn.innerText = "Finish & Home";
            continueBtn.onclick = () => window.location.href = '/';
        }
    }

    function highlightKeyAndFinger(char) {
        clearKeys();
        if(!char) return;
        if (char === ' ') char = 'space';
        if (char === '.') char = '.';
        
        const key = document.getElementById('key-' + char.toLowerCase());
        if (key) key.classList.add('active');

        const fingerId = fingerMap[char.toLowerCase()];
        if (fingerId) {
            const finger = document.getElementById(fingerId);
            if(finger) finger.classList.add('active');
        }
    }

    function clearKeys() {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('active'));
        document.querySelectorAll('.finger').forEach(f => f.classList.remove('active'));
    }

    function flashKey(char) {
        if (char === ' ') char = 'space';
        const key = document.getElementById('key-' + char.toLowerCase());
        if (key) {
            key.style.transform = "scale(0.9)";
            setTimeout(() => key.style.transform = "scale(1)", 100);
        }
    }

    function showResults(wpm, acc) {
        drillContainer.style.display = 'none';
        resultsPanel.style.display = 'block';
        document.getElementById('res-wpm').innerText = wpm;
        document.getElementById('res-acc').innerText = acc + '%';
        
        const ctx = document.getElementById('wpmChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: wpmHistoryLabels, 
                datasets: [{
                    label: 'WPM Flow',
                    data: wpmHistoryData, 
                    borderColor: '#ff9f43',
                    backgroundColor: 'rgba(255, 159, 67, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } }
                }
            }
        });
    }

    // --- NEW: UPDATED RENDER LOGIC FOR CARDS ---
    function showModuleList() {
        // Create scrollable container
        moduleListContainer.innerHTML = '<div class="module-list"></div>';
        const list = moduleListContainer.querySelector('.module-list');

        moduleQueue.forEach((mod, index) => {
            const div = document.createElement("div");
            div.className = "module-item";
            
            // Determine styles
            const isRemedial = mod.type === 'remedial';
            const badgeClass = isRemedial ? 'badge-remedial' : 'badge-core';
            const badgeText = isRemedial ? 'REMEDIAL' : 'CORE';

            // Generate Glassmorphism Card HTML
            div.innerHTML = `
                <div class="mod-left">
                    <div class="mod-number">${index + 1}</div>
                    <div class="mod-info">
                        <div class="mod-title">${mod.name}</div>
                        <div class="mod-badge ${badgeClass}">${badgeText}</div>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
        moduleListModal.style.display = "flex";
    }

    init();
});