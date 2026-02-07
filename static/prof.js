document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const drillTextDiv = document.getElementById('drill-text');
    const timerDisplay = document.getElementById('live-timer');
    const configOptions = document.getElementById('config-options');
    const aiText = document.getElementById('ai-text');
    const resultsPanel = document.getElementById('results-panel');
    const drillContainer = document.getElementById('drill-container');
    const user = localStorage.getItem('beristales_name') || 'Pro';

    // State
    let testMode = 'time'; 
    let testLimit = 30;    
    let isRunning = false;
    let isFinished = false;
    let timerInterval = null;
    let startTime = null;
    let wordsArray = [];
    
    // Typing State
    let currentWordIndex = 0;
    let currentCharIndex = 0; 
    let correctChars = 0;
    let totalChars = 0;

    // Graph Data
    let wpmHistoryLabels = [];
    let wpmHistoryData = [];
    let chartInstance = null;

    // --- CONFIGURATION ---
    window.setMode = (mode) => {
        testMode = mode;
        updateConfigUI();
        resetTest();
    };

    window.setLimit = (limit) => {
        testLimit = limit;
        updateConfigUI();
        resetTest();
    };

    function updateConfigUI() {
        if (testMode === 'time') {
            configOptions.innerHTML = `
                <span class="config-opt ${testLimit===15?'active':''}" onclick="setLimit(15)">15</span>
                <span class="config-opt ${testLimit===30?'active':''}" onclick="setLimit(30)">30</span>
                <span class="config-opt ${testLimit===60?'active':''}" onclick="setLimit(60)">60</span>
            `;
            timerDisplay.innerText = testLimit;
        } else {
            configOptions.innerHTML = `
                <span class="config-opt ${testLimit===10?'active':''}" onclick="setLimit(10)">10</span>
                <span class="config-opt ${testLimit===25?'active':''}" onclick="setLimit(25)">25</span>
                <span class="config-opt ${testLimit===50?'active':''}" onclick="setLimit(50)">50</span>
            `;
            timerDisplay.innerText = "0 / " + testLimit;
        }
        document.querySelectorAll('.config-group:first-child .config-opt').forEach(el => {
            el.classList.toggle('active', el.innerText.toLowerCase() === testMode);
        });
    }

    async function fetchWords() {
        const count = testMode === 'words' ? testLimit : 100; 
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
            
            // Add Letters
            word.split('').forEach(char => {
                const charSpan = document.createElement("letter");
                charSpan.innerText = char;
                wordSpan.appendChild(charSpan);
            });
            
            // Add Space as a visible/targetable character
            const spaceSpan = document.createElement("letter");
            spaceSpan.innerHTML = "&nbsp;"; // Non-breaking space for visual width
            spaceSpan.className = "space-char"; 
            wordSpan.appendChild(spaceSpan);
            
            drillTextDiv.appendChild(wordSpan);
        });
        
        updateCursor();
    }

    // --- CURSOR LOGIC (The Orange Block) ---
    function updateCursor() {
        // Remove old cursor
        const allLetters = drillTextDiv.querySelectorAll('letter');
        allLetters.forEach(l => l.classList.remove('current'));
        
        // Find current word
        const words = drillTextDiv.querySelectorAll('.word');
        
        // Update Active Word Highlight
        words.forEach(w => w.classList.remove('active'));
        if (words[currentWordIndex]) {
            const activeWord = words[currentWordIndex];
            activeWord.classList.add('active');
            
            // Scroll Active Word into View
            const wordTop = activeWord.offsetTop;
            const containerScroll = drillTextDiv.scrollTop;
            if (wordTop - containerScroll > 100) {
                drillTextDiv.scrollTo({ top: wordTop - 50, behavior: 'smooth' });
            }

            // Apply Cursor to specific letter
            const letters = activeWord.querySelectorAll('letter');
            if (letters[currentCharIndex]) {
                letters[currentCharIndex].classList.add('current');
            }
        }
    }

    // --- TYPING HANDLER ---
    document.addEventListener('keydown', (e) => {
        if (isFinished) {
            if (e.key === "Tab") resetTest();
            return;
        }
        
        if (!isRunning && e.key.length === 1 && !e.ctrlKey && !e.altKey) {
            startTest();
        }
        
        if (!isRunning) return;

        // Prevent Scroll
        if (e.key === " ") e.preventDefault();

        // Data
        const activeWord = drillTextDiv.querySelectorAll('.word')[currentWordIndex];
        const letters = activeWord.querySelectorAll('letter');
        const isSpaceTarget = currentCharIndex === letters.length - 1; // Last char is always our space
        
        // --- 1. BACKSPACE ---
        if (e.key === "Backspace") {
            if (currentCharIndex > 0) {
                currentCharIndex--;
                const letter = letters[currentCharIndex];
                
                // Remove extra/incorrect classes
                letter.className = letter.classList.contains('space-char') ? 'space-char' : '';
                // Handle extra letters (if we implement overtyping later)
                
                updateCursor();
            }
            return;
        }

        // Ignore modifiers
        if (e.key.length !== 1) return;

        // --- 2. TYPING LOGIC ---
        // Handling Space (Next Word)
        if (e.key === " ") {
            if (isSpaceTarget) {
                // Correct Space Typed
                letters[currentCharIndex].classList.add('correct');
                correctChars++; // Count space as correct char
                totalChars++;
                
                // Move to next word
                currentWordIndex++;
                currentCharIndex = 0;
                
                // Check End (Words Mode)
                if (testMode === 'words') {
                    timerDisplay.innerText = currentWordIndex + " / " + testLimit;
                    if (currentWordIndex >= testLimit) finishTest();
                }
                
                updateCursor();
            } else {
                // Early Space (Skipping rest of word)
                // Mark current letter incorrect and jump? 
                // Or just mark incorrect and stay? Monkeytype usually jumps on space.
                
                // Implementation: Mark current char incorrect, but don't jump yet to allow correction?
                // No, standard behavior is space = submit word.
                
                // Let's force user to type correctly. 
                // If they type space early, mark the current letter as incorrect (if it wasn't space).
                letters[currentCharIndex].classList.add('incorrect');
                totalChars++;
                currentCharIndex++;
                updateCursor();
            }
            return;
        }

        // Handling Characters
        if (!isSpaceTarget) {
            const expectedChar = letters[currentCharIndex].innerText;
            
            if (e.key === expectedChar) {
                letters[currentCharIndex].classList.add('correct');
                correctChars++;
            } else {
                letters[currentCharIndex].classList.add('incorrect');
            }
            
            totalChars++;
            currentCharIndex++;
            updateCursor();
        } else {
            // Typing a letter when expecting space (Overtyping)
            // For now, just block or mark space incorrect
            letters[currentCharIndex].classList.add('incorrect');
            // We stay on space until space is pressed
        }
    });

    function startTest() {
        isRunning = true;
        startTime = Date.now();
        
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
        aiText.innerText = "Focus on flow, not just speed.";
    }

    function recordWPM() {
        const minutes = (Date.now() - startTime) / 60000;
        const wpm = Math.round((correctChars / 5) / (minutes || 0.001));
        wpmHistoryData.push(wpm);
        wpmHistoryLabels.push(Math.round(minutes * 60) + "s");
    }

    function finishTest() {
        isRunning = false;
        isFinished = true;
        clearInterval(timerInterval);
        
        const minutes = (Date.now() - startTime) / 60000;
        const wpm = Math.round((correctChars / 5) / (minutes || 0.001));
        const acc = Math.round((correctChars / totalChars) * 100) || 0;
        
        // Consistency
        const mean = wpmHistoryData.reduce((a, b) => a + b, 0) / wpmHistoryData.length;
        const variance = wpmHistoryData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmHistoryData.length;
        const consistency = Math.round(100 - Math.sqrt(variance)) || 0;

        showResults(wpm, acc, consistency);
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
            data: {
                labels: wpmHistoryLabels,
                datasets: [{
                    label: 'WPM',
                    data: wpmHistoryData,
                    borderColor: '#ff9f43',
                    backgroundColor: 'rgba(255, 159, 67, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        
        // Force Panel Height Recalculation (CSS Fix)
        document.querySelector('.glass-panel').style.height = 'auto';
    }

    window.restartTest = function() {
        resetTest();
    };

    function resetTest() {
        clearInterval(timerInterval);
        isRunning = false;
        isFinished = false;
        startTime = null;
        currentWordIndex = 0;
        currentCharIndex = 0;
        correctChars = 0;
        totalChars = 0;
        wpmHistoryData = [];
        wpmHistoryLabels = [];
        
        drillContainer.style.display = 'block';
        resultsPanel.style.display = 'none';
        
        if (testMode === 'time') timerDisplay.innerText = testLimit;
        else timerDisplay.innerText = "0 / " + testLimit;
        
        fetchWords();
    }

    // Initial Load
    updateConfigUI();
    resetTest();
});