document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const drillTextDiv = document.getElementById('drill-text');
    const timerDisplay = document.getElementById('live-timer');
    const configOptions = document.getElementById('config-options');
    const aiText = document.getElementById('ai-text');
    const resultsPanel = document.getElementById('results-panel');
    const drillContainer = document.getElementById('drill-container');
    const toastEl = document.getElementById('toast');
    const user = localStorage.getItem('beristales_name') || 'Pro';

    // State
    let testMode = 'time'; 
    let testLimit = 30;    
    let isRunning = false;
    let isFinished = false;
    let timerInterval = null;
    let startTime = null;
    let wordsArray = [];
    
    // ADVANCED TELEMETRY STATE
    let currentWordIndex = 0;
    let currentCharIndex = 0; 
    let correctChars = 0;
    let totalChars = 0;
    
    let maxPauseMs = 0;
    let lastKeyTime = null;
    let keyErrors = {}; 

    // Graph Data
    let wpmHistoryLabels = [];
    let wpmHistoryData = [];
    let chartInstance = null;

    // --- CONFIGURATION & TOASTS ---
    window.showToast = (msg, isWarning=false) => {
        toastEl.innerText = msg;
        toastEl.style.color = isWarning ? '#ff4757' : 'var(--accent-color)';
        toastEl.style.borderColor = isWarning ? '#ff4757' : 'var(--accent-color)';
        toastEl.style.boxShadow = isWarning ? '0 0 20px rgba(255, 71, 87, 0.5)' : '0 0 20px var(--accent-glow)';
        toastEl.style.opacity = 1;
        toastEl.style.transform = 'translate(-50%, 0px)';
        setTimeout(() => {
            toastEl.style.opacity = 0;
            toastEl.style.transform = 'translate(-50%, 20px)';
        }, 3500);
    };

    window.setMode = (mode) => {
        testMode = mode;
        testLimit = mode === 'time' ? 30 : 25;
        updateConfigUI();
        resetTest();
    };

    window.setLimit = (limit) => {
        testLimit = limit;
        updateConfigUI();
        resetTest();
    };

    window.toggleCustom = () => {
        const input = document.getElementById('custom-limit-input');
        const btn = document.getElementById('custom-opt-btn');
        if(input.style.display === 'none') {
            input.style.display = 'inline-block';
            btn.classList.add('active');
            input.focus();
        } else {
            input.style.display = 'none';
            btn.classList.remove('active');
        }
    };

    window.applyCustom = (val) => {
        let num = parseInt(val);
        if (isNaN(num) || num <= 0) return;
        
        if (num > 10000) {
            num = 10000;
            showToast("System maxed out at 10,000. Good luck.", true);
        } else if (testMode === 'words' && num >= 5000) {
            showToast(`${num} words? Prepare for severe finger fatigue.`, true);
        } else if (testMode === 'words' && num >= 1000) {
            showToast(`Marathon mode engaged. Maintain your stamina.`);
        } else if (testMode === 'time' && num >= 3600) {
            showToast(`An hour of typing? Absolute madness.`, true);
        } else if (testMode === 'time' && num >= 600) {
            showToast(`10+ minute sprint. Find your flow state.`);
        }

        testLimit = num;
        updateConfigUI();
        resetTest();
    };

    function updateConfigUI() {
        if (testMode === 'time') {
            configOptions.innerHTML = `
                <span class="config-opt ${testLimit===15?'active':''}" onclick="setLimit(15)">15</span>
                <span class="config-opt ${testLimit===30?'active':''}" onclick="setLimit(30)">30</span>
                <span class="config-opt ${testLimit===60?'active':''}" onclick="setLimit(60)">60</span>
                <span class="config-opt ${testLimit===120?'active':''}" onclick="setLimit(120)">120</span>
            `;
            timerDisplay.innerText = testLimit;
        } else {
            configOptions.innerHTML = `
                <span class="config-opt ${testLimit===10?'active':''}" onclick="setLimit(10)">10</span>
                <span class="config-opt ${testLimit===25?'active':''}" onclick="setLimit(25)">25</span>
                <span class="config-opt ${testLimit===50?'active':''}" onclick="setLimit(50)">50</span>
                <span class="config-opt ${testLimit===100?'active':''}" onclick="setLimit(100)">100</span>
            `;
            timerDisplay.innerText = "0 / " + testLimit;
        }
        
        // Custom Input UI
        const isCustom = ![15,30,60,120,10,25,50,100].includes(testLimit);
        configOptions.innerHTML += `
            <div style="display: inline-flex; align-items: center; margin-left: 10px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 10px;">
                <span class="config-opt ${isCustom?'active':''}" id="custom-opt-btn" onclick="toggleCustom()">Custom</span>
                <input type="number" id="custom-limit-input" style="display: ${isCustom?'inline-block':'none'};" min="1" max="10000" placeholder="#" value="${isCustom ? testLimit : ''}" onchange="applyCustom(this.value)" onkeydown="if(event.key==='Enter') applyCustom(this.value)">
            </div>
        `;
        
        document.querySelectorAll('#config-bar > .config-group:first-child .config-opt').forEach(el => {
            el.classList.toggle('active', el.innerText.toLowerCase() === testMode);
        });
    }

    async function fetchWords() {
        const count = testMode === 'words' ? Math.min(testLimit + 10, 500) : 200; 
        const res = await fetch(`/api/prof/words?count=${count}`);
        const data = await res.json();
        wordsArray = data.words;
        renderWords();
    }

    function renderWords() {
        drillTextDiv.innerHTML = "";
        wordsArray.forEach((word) => {
            const wordSpan = document.createElement("div");
            wordSpan.className = "word";
            word.split('').forEach(char => {
                const charSpan = document.createElement("letter");
                charSpan.innerText = char;
                wordSpan.appendChild(charSpan);
            });
            const spaceSpan = document.createElement("letter");
            spaceSpan.innerHTML = "&nbsp;"; 
            spaceSpan.className = "space-char"; 
            wordSpan.appendChild(spaceSpan);
            drillTextDiv.appendChild(wordSpan);
        });
        updateCursor();
    }

    function updateCursor() {
        const allLetters = drillTextDiv.querySelectorAll('letter');
        allLetters.forEach(l => l.classList.remove('current'));
        const words = drillTextDiv.querySelectorAll('.word');
        words.forEach(w => w.classList.remove('active'));
        
        if (words[currentWordIndex]) {
            const activeWord = words[currentWordIndex];
            activeWord.classList.add('active');
            
            const wordTop = activeWord.offsetTop;
            const containerScroll = drillTextDiv.scrollTop;
            if (wordTop - containerScroll > 100) {
                drillTextDiv.scrollTo({ top: wordTop - 50, behavior: 'smooth' });
            }

            const letters = activeWord.querySelectorAll('letter');
            if (letters[currentCharIndex]) {
                letters[currentCharIndex].classList.add('current');
            }
        }
    }

    // --- TELEMETRY ENGINE HANDLER ---
    document.addEventListener('keydown', (e) => {
        if (isFinished) {
            if (e.key === "Tab") { e.preventDefault(); resetTest(); }
            return;
        }
        
        if (!isRunning && e.key.length === 1 && !e.ctrlKey && !e.altKey && document.activeElement.id !== 'custom-limit-input') {
            startTest();
        }
        
        if (!isRunning) return;
        if (e.key === " ") e.preventDefault();
        
        // Track longest pause explicitly
        const now = Date.now();
        if (lastKeyTime) {
            const pause = now - lastKeyTime;
            if (pause > maxPauseMs) maxPauseMs = pause;
        }
        lastKeyTime = now;

        const activeWord = drillTextDiv.querySelectorAll('.word')[currentWordIndex];
        if(!activeWord) return;
        
        const letters = activeWord.querySelectorAll('letter');
        const isSpaceTarget = currentCharIndex === letters.length - 1; 
        
        if (e.key === "Backspace") {
            if (currentCharIndex > 0) {
                currentCharIndex--;
                const letter = letters[currentCharIndex];
                letter.className = letter.classList.contains('space-char') ? 'space-char' : '';
                updateCursor();
            }
            return;
        }

        if (e.key.length !== 1) return;

        if (e.key === " ") {
            if (isSpaceTarget) {
                letters[currentCharIndex].classList.add('correct');
                correctChars++; 
                totalChars++;
                currentWordIndex++;
                currentCharIndex = 0;
                
                if (testMode === 'words') {
                    timerDisplay.innerText = currentWordIndex + " / " + testLimit;
                    if (currentWordIndex >= testLimit) finishTest();
                }
                
                // Fetch more words if reaching the end
                if (testMode === 'time' && currentWordIndex >= wordsArray.length - 20) {
                    fetchWords(); 
                }
                
                updateCursor();
            } else {
                letters[currentCharIndex].classList.add('incorrect');
                keyErrors['SPACE'] = (keyErrors['SPACE'] || 0) + 1;
                totalChars++;
                currentCharIndex++;
                updateCursor();
            }
            return;
        }

        if (!isSpaceTarget) {
            const expectedChar = letters[currentCharIndex].innerText;
            
            if (e.key === expectedChar) {
                letters[currentCharIndex].classList.add('correct');
                correctChars++;
            } else {
                letters[currentCharIndex].classList.add('incorrect');
                // Track exact key error
                keyErrors[expectedChar] = (keyErrors[expectedChar] || 0) + 1;
            }
            
            totalChars++;
            currentCharIndex++;
            updateCursor();
        } else {
            letters[currentCharIndex].classList.add('incorrect');
        }
    });

    function startTest() {
        isRunning = true;
        startTime = Date.now();
        lastKeyTime = startTime;
        
        if (testMode === 'time') {
            let timeLeft = testLimit;
            timerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.innerText = timeLeft;
                recordWPM();
                if (timeLeft <= 0) finishTest();
            }, 1000);
        } else {
            timerInterval = setInterval(recordWPM, 1000);
        }
        aiText.innerText = "Telemetry active. Assessing biomechanics.";
    }

    function recordWPM() {
        const minutes = (Date.now() - startTime) / 60000;
        const wpm = Math.round((correctChars / 5) / (minutes || 0.001));
        wpmHistoryData.push(wpm);
        wpmHistoryLabels.push(Math.round(minutes * 60) + "s");
    }

    async function finishTest() {
        isRunning = false;
        isFinished = true;
        clearInterval(timerInterval);
        
        const minutes = (Date.now() - startTime) / 60000;
        const wpm = Math.round((correctChars / 5) / (minutes || 0.001));
        const acc = Math.round((correctChars / totalChars) * 100) || 0;
        const timeTakenSecs = Math.round(minutes * 60);
        
        // COMPILE ADVANCED METRICS
        const peakWpm = wpmHistoryData.length > 0 ? Math.max(...wpmHistoryData, wpm) : wpm;
        const longestPauseSecs = (maxPauseMs / 1000).toFixed(2);
        
        let topErrorsStr = "None";
        if (Object.keys(keyErrors).length > 0) {
            topErrorsStr = Object.entries(keyErrors)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(err => `'${err[0].toUpperCase()}' (${err[1]}x)`)
                .join(', ');
        }

        const mean = wpmHistoryData.reduce((a, b) => a + b, 0) / (wpmHistoryData.length || 1);
        const variance = wpmHistoryData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (wpmHistoryData.length || 1);
        const consistency = Math.round(100 - Math.sqrt(variance)) || 0;

        showResults(wpm, acc, consistency);

        document.getElementById('analysis-section').style.display = 'block';
        document.getElementById('analysis-text').innerHTML = '<i>Processing biomechanical telemetry...</i>';
        
        try {
            const aiRes = await fetch('/api/prof/analyze', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    wpm: wpm, 
                    acc: acc, 
                    time: timeTakenSecs, 
                    words: currentWordIndex,
                    peak_wpm: peakWpm,
                    longest_pause: longestPauseSecs,
                    top_errors: topErrorsStr
                })
            });
            const aiData = await aiRes.json();
            renderAnalysis(aiData.message);
        } catch (e) {
            renderAnalysis(`Local telemetry processed: Sustained ${wpm} WPM. Peak velocity logged at ${peakWpm} WPM. Precision drift noted on ${topErrorsStr}.`);
        }

        const userId = localStorage.getItem('beristales_uid');
        if (userId) {
            fetch('/api/save-stats', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: userId, mode: 'Professional', wpm: wpm, accuracy: acc, mistakes: [] })
            }).catch(err => console.error(err));
        }
    }

    function renderAnalysis(message) {
        const analysisText = document.getElementById('analysis-text');
        analysisText.innerHTML = '';
        let i = 0;
        function type() {
            if (i < message.length) {
                analysisText.innerHTML += message.charAt(i);
                i++;
                setTimeout(type, 15); 
            }
        }
        setTimeout(type, 200);
    }

    function showResults(wpm, acc, con) {
        drillContainer.style.display = 'none';
        resultsPanel.style.display = 'block';
        document.getElementById('res-wpm').innerText = wpm;
        document.getElementById('res-acc').innerText = acc + '%';
        document.getElementById('res-con').innerText = con + '%';
        
        const ctx = document.getElementById('wpmChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: wpmHistoryLabels, datasets: [{ label: 'WPM', data: wpmHistoryData, borderColor: '#ff9f43', backgroundColor: 'rgba(255, 159, 67, 0.2)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        document.querySelector('.glass-panel').style.height = 'auto';
    }

    window.restartTest = function() { resetTest(); };

    function resetTest() {
        clearInterval(timerInterval);
        isRunning = false;
        isFinished = false;
        startTime = null;
        currentWordIndex = 0;
        currentCharIndex = 0;
        correctChars = 0;
        totalChars = 0;
        maxPauseMs = 0;
        lastKeyTime = null;
        keyErrors = {};
        wpmHistoryData = [];
        wpmHistoryLabels = [];
        
        drillContainer.style.display = 'block';
        resultsPanel.style.display = 'none';
        document.getElementById('analysis-section').style.display = 'none';
        document.getElementById('analysis-text').innerHTML = '';
        
        if (testMode === 'time') timerDisplay.innerText = testLimit;
        else timerDisplay.innerText = "0 / " + testLimit;
        
        fetchWords();
    }

    updateConfigUI();
    resetTest();
});