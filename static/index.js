let targetRoute = "";
const loginInput = document.getElementById('username'); 
const passwordInput = document.getElementById('password'); // NEW: Grabbing the password field
const modal = document.getElementById('login-modal');
const loginErrorText = document.getElementById('login-error'); // NEW: Grabbing the error text box

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

function goToPortfolio() {
    const name = localStorage.getItem('beristales_name');
    const uid = localStorage.getItem('beristales_uid');
    if (name && uid) {
        window.location.href = `/portfolio?name=${encodeURIComponent(name)}`;
    } else {
        // If they click the portfolio but aren't logged in, prompt them
        targetRoute = 'portfolio'; // Set target so it knows where to go after login
        document.getElementById('login-modal').style.display = "flex"; 
    }
}

// Perform Login via API
async function performLogin() {
    const name = loginInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Safety check just in case
    if (name.length < 2 || password.length < 4) {
        loginErrorText.innerText = "Invalid credentials.";
        loginErrorText.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, password: password }) // UPGRADED: Sending password to Python
        });
        
        const data = await res.json();
        
        // NEW: If the Python backend throws an error (like a 401 Incorrect Password)
        if (!res.ok) {
            loginErrorText.innerText = data.error || "Login failed.";
            loginErrorText.style.display = 'block';
            
            // Add a little shake animation to the password box for premium feel
            passwordInput.style.transform = "translateX(5px)";
            setTimeout(() => passwordInput.style.transform = "translateX(-5px)", 100);
            setTimeout(() => passwordInput.style.transform = "translateX(5px)", 200);
            setTimeout(() => passwordInput.style.transform = "translateX(0)", 300);
            return;
        }
        
        // Success!
        if (data.id) {
            localStorage.setItem('beristales_name', data.name);
            localStorage.setItem('beristales_uid', data.id);
            
            // Close modal with animation
            modal.style.display = "none";
            loginErrorText.style.display = 'none'; // Clear errors
            
            updateGreeting(data.name);
            
            // Navigate after small delay for effect
            if (targetRoute === 'portfolio') {
                setTimeout(goToPortfolio, 300);
            } else {
                setTimeout(() => goToMode(data.name), 300);
            }
        }
    } catch (e) {
        console.error("Login failed", e);
        loginErrorText.innerText = "Backend connection error. Is app.py running?";
        loginErrorText.style.display = 'block';
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
        const initials = name.split('_')[0].substring(0,2).toUpperCase();
        if(avatar) avatar.textContent = initials;
    }
}

function goToMode(name) {
    window.location.href = `/${targetRoute}?name=${encodeURIComponent(name)}`;
}

// Support for "Enter" key on BOTH inputs
function handleEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        if (typeof validateLogin === "function") {
            validateLogin();
        } else {
            performLogin();
        }
    }
}
loginInput.addEventListener("keypress", handleEnter);
if (passwordInput) passwordInput.addEventListener("keypress", handleEnter);

// Close modal if clicking outside
window.onclick = function(event) {
    // Only close if we click the dark background, NOT the content box itself
    if (event.target == modal) {
        modal.style.display = "none";
    }
    
    // Keep theme modal logic intact
    const themeModal = document.getElementById('theme-modal');
    if (event.target == themeModal) {
        themeModal.style.display = "none";
    }
}

window.onload = () => {
    const name = localStorage.getItem('beristales_name');
    if(name) updateGreeting(name);
};