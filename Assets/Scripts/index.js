const firebaseConfig = {
    apiKey: "AIzaSyBhcPBHL7ZYwBkvXgwvwApfMn8Zi-8e2OA",
    authDomain: "cowclicker-caa77.firebaseapp.com",
    databaseURL: "https://cowclicker-caa77-default-rtdb.firebaseio.com",
    projectId: "cowclicker-caa77",
    storageBucket: "cowclicker-caa77.appspot.com",
    messagingSenderId: "787128420241",
    appId: "1:787128420241:web:ee86c36cb0dda77e733c30"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let progress = 0;
let milkPerClick = 10;

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        checkIfNewUser(user);
    }).catch(error => {
        console.error('Google Sign-In Error', error);
    });
}

function checkIfNewUser(user) {
    const userRef = db.ref(`/users/${user.uid}`);
    userRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            startGame(user.uid);
        } else {
            promptForUsername(user.uid);
        }
    });
}

function promptForUsername(uid) {
    const username = prompt('Create a unique username (3-32 characters):');
    if (username.length >= 3 && username.length <= 32) {
        db.ref('/users').orderByChild('username').equalTo(username).once('value', snapshot => {
            if (snapshot.exists()) {
                alert('Username already taken! Try a different one.');
                promptForUsername(uid);
            } else {
                db.ref(`/users/${uid}`).set({
                    username: username,
                    totalMilk: 0,
                    coins: 0,
                    farmerLevel: 1,
                    farmerName: "Default Farmer",
                    farmerUpgradeProgress: 0,
                    lastUpdateTime: firebase.database.ServerValue.TIMESTAMP
                });
                startGame(uid);
            }
        });
    } else {
        alert('Invalid username. Must be 3-32 characters.');
        promptForUsername(uid);
    }
}

function startGame(uid) {
    document.getElementById('gameSection').style.display = 'block';
    loadLeaderboard();
    startAutoMilk(uid);
}

function milkCow() {
    if (progress < 100) {
        progress += milkPerClick;
        if (progress >= 100) {
            progress = 0;
            collectMilk();
        }
        document.getElementById('milkProgress').style.width = `${progress}%`;
    }
}

function collectMilk() {
    const userId = auth.currentUser.uid;
    const userRef = db.ref(`/users/${userId}`);
    userRef.transaction(user => {
        if (user) {
            const milkEarned = 5;
            const coinsEarned = 10;
            user.totalMilk += milkEarned;
            user.coins += coinsEarned;
        }
        return user;
    });
}

function startAutoMilk(userId) {
    setInterval(() => {
        const userRef = db.ref(`/users/${userId}`);
        userRef.transaction(user => {
            if (user) {
                const milkPerSecond = user.farmerLevel;
                user.totalMilk += milkPerSecond;
                user.lastUpdateTime = firebase.database.ServerValue.TIMESTAMP;
            }
            return user;
        });
    }, 1000);
}

function upgradeFarmer() {
    const userId = auth.currentUser.uid;
    const userRef = db.ref(`/users/${userId}`);
    userRef.transaction(user => {
        if (user && user.coins > 0) {
            const upgradeCost = 20 * Math.pow(2, user.farmerLevel - 1);
            const remainingCost = upgradeCost - user.farmerUpgradeProgress;

            if (user.coins >= remainingCost) {
                user.coins -= remainingCost;
                user.farmerLevel += 1;
                user.farmerUpgradeProgress = 0;
            } else {
                user.farmerUpgradeProgress += user.coins;
                user.coins = 0;
            }
        }
        return user;
    });
}

function loadLeaderboard() {
    db.ref('/users')
        .orderByChild('totalMilk')
        .limitToLast(10)
        .once('value', (snapshot) => {
            const leaderboard = [];
            snapshot.forEach(childSnapshot => {
                leaderboard.push({
                    username: childSnapshot.val().username,
                    totalMilk: childSnapshot.val().totalMilk
                });
            });
            displayLeaderboard(leaderboard.reverse());
        });
}

function displayLeaderboard(leaderboard) {
    const leaderboardTable = document.getElementById('leaderboard').getElementsByTagName('tbody')[0];
    leaderboardTable.innerHTML = '';
    leaderboard.forEach((user, index) => {
        leaderboardTable.innerHTML += `<tr>
          <td>${index + 1}</td>
          <td>${user.username}</td>
          <td>${user.totalMilk} liters</td>
        </tr>`;
    });
}