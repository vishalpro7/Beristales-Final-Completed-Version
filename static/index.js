let targetRoute = "";
const loginInput = document.getElementById('username-input');
const modal = document.getElementById('login-modal');

// Check Auth
function checkAuth(route) {
    targetRoute = route;
    const userId = localStorage.getItem('beristales_uid');
    const name = localStorage.getItem('beristales_name');
    
    if (userId && name) {
        goToMode(name);
    } else {
        // Show the pop-up modal
        modal.style.display = "flex";
        loginInput.focus();
    }
}

// Perform Login via API
async function performLogin() {
    const name = loginInput.value.trim();
    if (name.length < 2) {
        alert("Please enter a valid name.");
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        
        if (data.id) {
            localStorage.setItem('beristales_name', data.name);
            localStorage.setItem('beristales_uid', data.id);
            
            // Close modal with animation
            modal.style.display = "none";
            
            updateGreeting(data.name);
            
            // Navigate after small delay for effect
            setTimeout(() => goToMode(data.name), 300);
        }
    } catch (e) {
        console.error("Login failed", e);
        alert("Backend error. Is app.py running?");
    }
}

function updateGreeting(name) {
    const greetArea = document.getElementById('user-greeting');
    const nameSpan = document.getElementById('display-name');
    const avatar = document.querySelector('.user-badge .avatar');
    
    if(greetArea) {
        // Use Flex to align avatar and text
        greetArea.style.display = "flex";
        nameSpan.textContent = name;
        
        // Update avatar initials
        const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        if(avatar) avatar.textContent = initials;
    }
}

function goToMode(name) {
    window.location.href = `/${targetRoute}?name=${encodeURIComponent(name)}`;
}

// Support for "Enter" key in login
loginInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        performLogin();
    }
});

// Close modal if clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

window.onload = () => {
    const name = localStorage.getItem('beristales_name');
    if(name) updateGreeting(name);
};