let targetRoute = "";
const loginInput = document.getElementById('username-input');

// 1. Support for "Enter" key
loginInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("login-submit").click();
    }
});

// 2. Check if user is authenticated before opening mode
function checkAuth(route) {
    targetRoute = route;
    const name = localStorage.getItem('beristales_name');
    
    if (name) {
        goToMode(name);
    } else {
        document.getElementById('login-modal').style.display = "flex";
        loginInput.focus();
    }
}

// 3. Handle the Login Process
function performLogin() {
    const name = loginInput.value.trim();
    
    if (name.length >= 2) {
        localStorage.setItem('beristales_name', name);
        document.getElementById('login-modal').style.display = "none";
        updateGreeting(name);
        
        // Brief delay for visual feedback before navigation
        setTimeout(() => {
            goToMode(name);
        }, 300);
    } else {
        alert("Please enter a valid name (at least 2 characters).");
    }
}

function updateGreeting(name) {
    const greetArea = document.getElementById('user-greeting');
    if (greetArea) {
        greetArea.style.display = "block";
        document.getElementById('display-name').textContent = name;
        document.getElementById('welcome-text').textContent = `Welcome ${name} to Beristales`;
    }
}

function goToMode(name) {
    // Navigates to the Python route with the name param
    window.location.href = `/${targetRoute}?name=${encodeURIComponent(name)}`;
}

// 4. Persistence: Restore session on page load
window.onload = () => {
    const name = localStorage.getItem('beristales_name');
    if (name) updateGreeting(name);
};