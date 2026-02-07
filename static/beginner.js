document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const aiText = document.getElementById('ai-text');
    const drillTextDiv = document.getElementById('drill-text');
    const phaseDisplay = document.getElementById('phase-display');
    const phaseName = document.getElementById('phase-name');
    const resultsPanel = document.getElementById('results-panel');
    const drillContainer = document.getElementById('drill-container');
    const keyboardWrapper = document.getElementById('keyboard-wrapper');
    const continueBtn = document.getElementById('continue-btn');
    const viewModulesBtn = document.getElementById('view-modules-btn'); // NEW BUTTON
    const moduleListModal = document.getElementById('module-list-modal'); // NEW MODAL
    const moduleListContainer = document.getElementById('module-list-content'); // NEW LIST AREA
    const user = localStorage.getItem('beristales_name') || 'Learner';

    // State
    let state = 'TUTORIAL'; 
    let moduleQueue = [];
    let currentModule = null;
    let textToType = "";
    let currentIndex = 0;
    let mistakes = []; 
    let startTime = null;
    let chartInstance = null;
    
    let wpmHistoryLabels = [];
    let wpmHistoryData = [];
    let wpmInterval = null;

    const tutorialText = 
        "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Sphinx of black quartz judge my vow. " + 
        "Complex typing requires mastering subtle transitions. Many users struggle with frequent pairs like the in there or he in where. " +
        "You might find received difficult due to the ei sequence or perhaps awkward trips up your left hand. " +
        "Finally we introduce rare characters and uneven flows. Words like jazz buzzwords cozy and quixotic force your fingers to stretch. " +
        "Can you type zephyr or jinx without pausing? Precision is key here.";

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
        speak(`Welcome, ${user}. Let's analyze your current skill level. Type the text below.`);
        phaseDisplay.style.visibility = 'visible';
        startDrill(tutorialText);
    }

    function startDrill(text) {
        textToType = text;
        currentIndex = 0;
        mistakes = []; 
        startTime = null;
        
        wpmHistoryLabels = [];
        wpmHistoryData = [];
        if (wpmInterval) clearInterval(wpmInterval);

        // Render Text (Handle Newlines)
        const htmlText = text.split('').map(char => {
            if (char === '\n') return '<br>';
            return `<span>${char}</span>`;
        }).join('');
        
        drillTextDiv.innerHTML = htmlText;
        drillTextDiv.scrollTop = 0;
        updateCursor(); 
        
        if (state === 'TEACHING' || state === 'TUTORIAL' || state === 'MODULE_RETRY') {
            keyboardWrapper.style.opacity = 1;
            const firstChar = text.replace(/\n/g, '')[0];
            highlightKey(firstChar);
        } else {
            keyboardWrapper.style.opacity = 0.3; 
            clearKeys();
        }

        resultsPanel.style.display = 'none';
        viewModulesBtn.style.display = 'none'; // Hide extra button during drills
        drillContainer.style.display = 'block';

        window.removeEventListener('keydown', handleInput);
        window.addEventListener('keydown', handleInput);
    }

    function startWpmTracking() {
        if (wpmInterval) clearInterval(wpmInterval);
        let seconds = 0;
        wpmHistoryLabels.push("0s");
        wpmHistoryData.push(0);

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
        
        // --- FIX 1: PREVENT SPACEBAR SCROLLING ---
        if (e.key === " ") e.preventDefault(); 

        if (!startTime) {
            startTime = Date.now();
            startWpmTracking(); 
        }

        let expected = textToType[currentIndex];
        
        // Skip hidden newlines in logic
        while (expected === '\n') {
            currentIndex++;
            expected = textToType[currentIndex];
        }

        const spans = drillTextDiv.querySelectorAll('span');
        const typed = e.key;

        // Auto-Scroll Logic (Safe Check)
        const currentSpan = spans[currentIndex];
        if (currentSpan) {
            if (currentSpan.offsetTop > drillTextDiv.scrollTop + drillTextDiv.clientHeight - 60) {
                drillTextDiv.scrollTo({ top: currentSpan.offsetTop - 100, behavior: 'smooth' });
            }
        }

        flashKey(typed);

        if (typed === expected) {
            if (spans[currentIndex]) {
                spans[currentIndex].classList.add('correct');
                spans[currentIndex].classList.remove('current');
            }
            currentIndex++;
            
            while (currentIndex < textToType.length && textToType[currentIndex] === '\n') {
                currentIndex++;
            }

            if (currentIndex < textToType.length) {
                updateCursor();
                if (state !== 'ASSESS_MODULE' && state !== 'FINAL_ASSESS') highlightKey(textToType[currentIndex]);
            } else {
                finishDrill();
            }
        } else {
            let prevChar = currentIndex > 0 ? textToType[currentIndex - 1] : 'START';
            if (spans[currentIndex] && !spans[currentIndex].classList.contains('incorrect')) {
                mistakes.push({ expected: expected, typed: typed, prev: prevChar });
            }
            if (spans[currentIndex]) spans[currentIndex].classList.add('incorrect');
        }
    }

    function updateCursor() {
        const spans = drillTextDiv.querySelectorAll('span');
        spans.forEach(s => s.classList.remove('current'));
        
        let spanIndex = 0;
        for(let i=0; i<currentIndex; i++) {
            if(textToType[i] !== '\n') spanIndex++;
        }

        if (spans[spanIndex]) {
            spans[spanIndex].classList.add('current');
            
            // Ensure cursor is visible
            const spanTop = spans[spanIndex].offsetTop;
            const relativeTop = spanTop - drillTextDiv.scrollTop;
            if (relativeTop > drillTextDiv.clientHeight * 0.7) {
                drillTextDiv.scrollTo({ top: spanTop - 100, behavior: 'smooth' });
            }
        }
    }

    function finishDrill() {
        window.removeEventListener('keydown', handleInput);
        if (wpmInterval) clearInterval(wpmInterval);
        
        const timeMin = (Date.now() - startTime) / 60000;
        const wpm = Math.round((textToType.replace(/\n/g,'').length / 5) / (timeMin || 0.01));
        const accuracy = Math.round(((textToType.replace(/\n/g,'').length - mistakes.length) / textToType.replace(/\n/g,'').length) * 100);
        
        wpmHistoryLabels.push("End");
        wpmHistoryData.push(wpm);

        if (state === 'TUTORIAL') {
            handleTutorialEnd(wpm, accuracy);
        } else if (state === 'TEACHING') {
            speak("Practice complete. Starting Module Assessment.");
            startAssessment();
        } else if (state === 'MODULE_RETRY') {
            speak("Correction complete. Retrying Assessment.");
            startAssessment();
        } else if (state === 'ASSESS_MODULE') {
            handleModuleAssessment(accuracy, wpm);
        } else if (state === 'FINAL_ASSESS') {
            handleFinalAssessment(accuracy, wpm);
        } else if (state === 'LATCH_REMEDIAL') {
            speak("Latch complete. Retaking Final Exam.");
            setTimeout(startFinalAssessment, 2000);
        }
    }

    async function handleTutorialEnd(wpm, acc) {
        speak("Analysis complete. Generating personalized curriculum...");
        showResults(wpm, acc);

        const res = await fetch('/api/beginner/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mistakes: mistakes }) 
        });
        const data = await res.json();
        moduleQueue = data.modules;

        // --- NEW FEATURE: View Modules Button ---
        viewModulesBtn.style.display = 'inline-block';
        viewModulesBtn.onclick = () => showModuleList();

        continueBtn.onclick = () => {
            speak(`Starting ${moduleQueue.length} modules.`);
            setTimeout(nextModule, 1000);
        };
    }

    // --- NEW: Render Module List ---
    function showModuleList() {
        moduleListContainer.innerHTML = "";
        moduleQueue.forEach((mod, index) => {
            const div = document.createElement("div");
            div.className = "module-item";
            
            // Style based on type
            let badgeClass = mod.type === 'remedial' ? 'badge-red' : 'badge-blue';
            let badgeText = mod.type === 'remedial' ? 'REMEDIAL' : 'STANDARD';

            div.innerHTML = `
                <div class="mod-number">${index + 1}</div>
                <div class="mod-info">
                    <div class="mod-name">${mod.name}</div>
                    <span class="mod-badge ${badgeClass}">${badgeText}</span>
                </div>
            `;
            moduleListContainer.appendChild(div);
        });
        moduleListModal.style.display = "flex";
    }

    // Close modal when clicking outside is handled in HTML/inline script usually, 
    // but lets add a close button logic here if needed or reuse existing modal logic.
    // For now, we assume the user clicks the "Close" button in the modal HTML.

    function nextModule() {
        if (moduleQueue.length === 0) {
            fetch('/api/beginner/final')
                .then(r => r.json())
                .then(data => {
                    tutorialTextFinal = data.text; 
                    startFinalAssessment(data.text);
                });
            return;
        }

        currentModule = moduleQueue.shift();
        state = 'TEACHING';
        document.getElementById('phase-display').innerHTML = `MODULE: <span style="color:white;">${currentModule.name}</span>`;
        speak(`Module: ${currentModule.name}. Practice Mode.`);
        startDrill(currentModule.practice_text);
    }

    // ... (Rest of the functions: startAssessment, handleModuleAssessment, etc. remain the same) ...
    // Note: Ensure you keep the rest of the file logic intact as provided in the previous turn.
    // I am omitting the unchanged bottom half for brevity, but you should keep it.
    
    function startAssessment() {
        state = 'ASSESS_MODULE';
        document.getElementById('phase-display').innerHTML = `MODULE: <span style="color:white;">${currentModule.name} (Test)</span>`;
        speak("Assessment Mode. Accuracy is critical.");
        startDrill(currentModule.assess_text);
    }

    async function handleModuleAssessment(acc, wpm) {
        if (acc < 100) {
            speak("Mistakes detected. Generating immediate correction drill...");
            const res = await fetch('/api/beginner/retry', {
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
                speak(`Focus on these patterns: ${data.message}`);
                startDrill(data.text);
            };
        } else {
            speak("Module Mastered. Moving to next.");
            showResults(wpm, acc);
            continueBtn.innerText = "Next Module";
            viewModulesBtn.style.display = 'inline-block'; // Allow viewing remaining modules
            continueBtn.onclick = () => nextModule();
        }
    }

    let tutorialTextFinal = ""; 
    function startFinalAssessment(textOverride) {
        state = 'FINAL_ASSESS';
        document.getElementById('phase-display').innerHTML = `STATUS: <span style="color:var(--accent-color);">FINAL EXAM</span>`;
        speak("Final Examination. This will be long. Stay focused.");
        let text = textOverride || tutorialTextFinal;
        startDrill(text); 
    }

    async function handleFinalAssessment(acc, wpm) {
        if (acc < 100) {
            speak("Final Exam Failed. Analyzing for Latch Modules...");
            const res = await fetch('/api/beginner/latch', {
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
                speak("Mistakes were minor. Retaking Final Exam.");
                setTimeout(() => startFinalAssessment(), 2000);
            }
        } else {
            showResults(wpm, acc);
            speak("Congratulations! You have effectively mastered Beginner Typing.");
            continueBtn.innerText = "Finish & Home";
            continueBtn.onclick = () => window.location.href = '/';
        }
    }

    function highlightKey(char) {
        clearKeys();
        if(!char) return;
        if (char === ' ') char = 'space';
        if (char === '.') char = 'period'; 
        const key = document.getElementById('key-' + char.toLowerCase());
        if (key) key.classList.add('active');
    }

    function clearKeys() {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('active'));
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

    init();
});