const firebaseConfig = {
    apiKey: "AIzaSyBhcPBHL7ZYwBkvXgwvwApfMn8Zi-8e2OA",
    authDomain: "cowclicker-caa77.firebaseapp.com",
    databaseURL: "https://cowclicker-caa77-default-rtdb.firebaseio.com",
    projectId: "cowclicker-caa77",
    storageBucket: "cowclicker-caa77.appspot.com",
    messagingSenderId: "787128420241",
    appId: "1:787128420241:web:ee86c36cb0dda77e733c30"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let userId, userRef;
let milkCollected = 0;
let coins = 0;
let farmerLevel = 0;
let farmerMilkPerSec = 0;
let intervalId;

// Handle Google Auth Login
const loginBtn = document.getElementById('login-btn');
const gameSection = document.getElementById('game-section');
const authSection = document.getElementById('auth-section');
const usernameDisplay = document.getElementById('username-display');
const leaderboardList = document.getElementById('leaderboard');

// Handle user login
loginBtn.addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then((result) => {
        userId = result.user.uid;
        userRef = db.ref('users/' + userId);

        // Check if user has a username set
        userRef.once('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData && userData.username) {
                initGame(userData.username);
            } else {
                promptUsername();
            }
        });
    }).catch((error) => {
        console.error('Login failed:', error);
    });
});

// Prompt username input
function promptUsername() {
    const username = prompt('Please enter your username (3-32 chars):');
    if (username.length >= 3 && username.length <= 32) {
        db.ref('usernames').once('value', (snapshot) => {
            if (snapshot.hasChild(username)) {
                alert('Username already taken!');
                promptUsername();
            } else {
                // Save username to Firebase
                db.ref('usernames/' + username).set(userId);
                userRef.set({ username, milkCollected, coins, farmerLevel, farmerName: '' });
                initGame(username);
            }
        });
    } else {
        alert('Invalid username length!');
        promptUsername();
    }
}

// Initialize game
function initGame(username) {
    authSection.classList.add('d-none');
    gameSection.classList.remove('d-none');
    usernameDisplay.innerHTML = username;

    // Load user data
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        milkCollected = data.milkCollected || 0;
        coins = data.coins || 0;
        farmerLevel = data.farmerLevel || 0;
        farmerMilkPerSec = farmerLevel * 1;  // Each level adds 1 milk per second
        updateDisplay();
    });

    startFarmer();
    updateLeaderboard();
}

// Update display
function updateDisplay() {
    document.getElementById('milk-count').innerText = milkCollected;
    document.getElementById('coins-count').innerText = coins;
    document.getElementById('farmer-level').innerText = farmerLevel;
    document.getElementById('milk-per-sec').innerText = farmerMilkPerSec;
}

// Cow click event
document.getElementById('cow-clicker').addEventListener('click', () => {
    milkCollected++;
    document.getElementById('milk-count').innerText = milkCollected;
    if (milkCollected % 100 === 0) {
        coins += 10;
        document.getElementById('coins-count').innerText = coins;
    }
    userRef.update({ milkCollected, coins });
});

// Buy farmer upgrade
document.getElementById('buy-farmer-btn').addEventListener('click', () => {
    if (coins >= 10) {
        coins -= 10;
        farmerLevel++;
        farmerMilkPerSec = farmerLevel * 1;
        userRef.update({ coins, farmerLevel });
        updateDisplay();
        startFarmer();
    } else {
        alert('Not enough coins!');
    }
});

// Set farmer name
document.getElementById('set-farmer-name-btn').addEventListener('click', () => {
    const farmerName = document.getElementById('farmer-name').value;
    if (farmerName.length >= 3 && farmerName.length <= 32) {
        userRef.update({ farmerName });
        alert('Farmer name set!');
    } else {
        alert('Invalid name length!');
    }
});

// Start farmer automation
function startFarmer() {
    if (intervalId) clearInterval(intervalId);
    if (farmerMilkPerSec > 0) {
        intervalId = setInterval(() => {
            milkCollected += farmerMilkPerSec;
            document.getElementById('milk-count').innerText = milkCollected;
            if (milkCollected % 100 === 0) {
                coins += 10;
                document.getElementById('coins-count').innerText = coins;
            }
            userRef.update({ milkCollected, coins });
        }, 1000);
    }
}

// Update leaderboard
function updateLeaderboard() {
    db.ref('users').orderByChild('milkCollected').limitToLast(10).on('value', (snapshot) => {
        leaderboardList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            leaderboardList.innerHTML += `<li>${data.username}: ${data.milkCollected} liters</li>`;
        });
    });
}