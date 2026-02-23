document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('beristales_uid');
    
    if (!userId) {
        alert("You must be logged in to view your portfolio.");
        window.location.href = '/';
        return;
    }

    try {
        // 1. Fetch data from backend
        const res = await fetch(`/api/user-stats/${userId}`);
        const data = await res.json();
        
        if (data.status === "success") {
            processStats(data.stats);
        }
    } catch (e) {
        console.error("Failed to load portfolio stats:", e);
    }
});

function processStats(stats) {
    if (stats.length === 0) return; // No data yet

    // 2. Calculate Top Level Metrics
    let topWpm = 0;
    let totalAcc = 0;

    const wpmHistory = [];
    const labels = [];
    const dateCounts = {}; // For Heatmap

    stats.forEach((test, index) => {
        // Max WPM
        if (test.wpm > topWpm) topWpm = test.wpm;
        // Accuracy Sum
        totalAcc += test.accuracy;

        // Graph Data
        wpmHistory.push(test.wpm);
        labels.push(`Test ${index + 1}`);

        // Heatmap Data (Extract just the YYYY-MM-DD)
        const dateObj = new Date(test.timestamp + "Z"); // SQLite usually stores in UTC
        const dateStr = dateObj.toISOString().split('T')[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const avgAcc = Math.round(totalAcc / stats.length);

    // Update HTML
    document.getElementById('tot-tests').innerText = stats.length;
    document.getElementById('top-wpm').innerText = topWpm;
    document.getElementById('avg-acc').innerText = avgAcc + '%';

    // 3. Render Chart
    renderChart(labels, wpmHistory);

    // 4. Render Heatmap
    renderHeatmap(dateCounts);
}

function renderChart(labels, data) {
    const ctx = document.getElementById('progressionChart').getContext('2d');
    
    // Grab theme color from CSS variables to make graph match theme
    const style = getComputedStyle(document.body);
    const accentColor = style.getPropertyValue('--accent-color').trim() || '#00d2ff';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Words Per Minute (Overall)',
                data: data,
                borderColor: accentColor,
                backgroundColor: accentColor + '33', // Add transparency
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#fff'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } },
                x: { grid: { display: false }, ticks: { color: '#aaa' } }
            }
        }
    });
}

function renderHeatmap(dateCounts) {
    const heatmapDiv = document.getElementById('heatmap');
    heatmapDiv.innerHTML = '';

    // Generate last 30 days
    const today = new Date();
    const daysToShow = 60; // Show 60 boxes
    
    for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const count = dateCounts[dateStr] || 0;
        
        const box = document.createElement('div');
        box.className = 'heatmap-box';
        box.title = `${count} tests on ${dateStr}`;

        // Determine Heat Level (Color Intensity)
        if (count > 0 && count <= 2) box.classList.add('heat-1');
        else if (count >= 3 && count <= 5) box.classList.add('heat-2');
        else if (count >= 6 && count <= 9) box.classList.add('heat-3');
        else if (count >= 10) box.classList.add('heat-4');

        heatmapDiv.appendChild(box);
    }
}