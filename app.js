// Global State
let appData = {
    tests: []
};

let currentTestId = null;
let currentView = 'testsListView';
let editorMode = 'new'; // 'new' or 'edit'
let currentEditingTestId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkOnlineStatus();
    loadGithubToken();
    loadData();
    setupEventListeners();
    setupMultiTapEditor(); // ✅ NEW
});

// -------------------- MULTI TAP EDITOR (5 taps) --------------------
function setupMultiTapEditor() {
    const testsBtn = document.getElementById('testsNavBtn');
    if (!testsBtn) return;

    let tapCount = 0;
    let tapTimer = null;

    const REQUIRED_TAPS = 5;
    const RESET_TIME = 3000; // 3 seconds

    testsBtn.addEventListener('click', (e) => {
        tapCount++;

        if (tapCount === 1) {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, RESET_TIME);
        }

        if (tapCount >= REQUIRED_TAPS) {
            tapCount = 0;
            clearTimeout(tapTimer);
            openEditor();
        }
    });
}
// ------------------------------------------------------------------

// Check Online Status
function checkOnlineStatus() {
    const offlineOverlay = document.getElementById('offlineOverlay');

    function updateStatus() {
        if (!navigator.onLine) {
            offlineOverlay.classList.remove('hidden');
        } else {
            offlineOverlay.classList.add('hidden');
        }
    }

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
}

// Load Data from GitHub
async function loadData() {
    if (!navigator.onLine) return;

    try {
        const response = await fetch('data.json');
        if (response.ok) {
            appData = await response.json();
        } else {
            appData = { tests: [] };
        }
    } catch {
        appData = { tests: [] };
    }

    renderTestsList();
}

// Render Tests List
function renderTestsList() {
    const carousel = document.getElementById('testCarousel');
    carousel.innerHTML = '';

    if (appData.tests.length === 0) {
        carousel.innerHTML = '<div class="loading">No tests available. Use the editor to add tests.</div>';
        return;
    }

    const sortedTests = [...appData.tests].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedTests.forEach(test => {
        carousel.appendChild(createTestCard(test));
    });
}

// Create Test Card
function createTestCard(test) {
    const card = document.createElement('div');
    card.className = 'test-card';

    const formattedDate = new Date(test.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
    });

    card.innerHTML = `
        <div class="results-banner">Results are out</div>
        <h3>${test.name}</h3>
        <div class="test-meta">
            <span>📅 ${formattedDate}</span>
            <span>⏱ ${test.duration || '180 Min'}</span>
            <span>💻 ${test.mode}</span>
        </div>
        <button class="btn-link" onclick="viewSyllabus('${test.id}')">📄 View Syllabus</button>
        <div class="test-actions">
            <button class="btn-outline" onclick="reattemptTest('${test.id}')">Re-attempt</button>
            <button class="btn-primary" onclick="viewResult('${test.id}')">View Result</button>
        </div>
    `;
    return card;
}

// Placeholders
function viewSyllabus(id) { console.log(id); }
function reattemptTest(id) { console.log(id); }

// View Result
function viewResult(testId) {
    currentTestId = testId;
    const test = appData.tests.find(t => t.id === testId);
    if (!test) return;

    document.getElementById('resultTestName').textContent = test.name;
    document.getElementById('resultTestInfo').textContent =
        `${test.date} • ${test.mode} Mode`;

    const totalScore =
        test.myResult.subjects.maths.score +
        test.myResult.subjects.physics.score +
        test.myResult.subjects.chemistry.score;

    document.getElementById('userScore').textContent = totalScore;
    document.getElementById('maxScore').textContent = 300;

    renderLeaderboardPreview(test);
    switchView('resultView');
}

// Leaderboard Preview
function renderLeaderboardPreview(test) {
    const preview = document.getElementById('leaderboardPreview');
    preview.innerHTML = '';

    test.leaderboard.slice(0, 5).forEach(s => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `<strong>${s.rank}</strong> ${s.name} - ${s.score}`;
        preview.appendChild(div);
    });

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = 'View Details';
    btn.onclick = () => viewLeaderboard(test.id);
    preview.appendChild(btn);
}

// View Leaderboard
function viewLeaderboard(testId) {
    const test = appData.tests.find(t => t.id === testId);
    if (!test) return;

    const body = document.getElementById('leaderboardTableBody');
    body.innerHTML = '';

    test.leaderboard.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s.rank}</td>
            <td>${s.name}</td>
            <td>${s.score}</td>
            <td>${s.correctQs}</td>
            <td>${s.incorrectQs}</td>
            <td>${s.timeTaken}</td>
        `;
        body.appendChild(row);
    });

    switchView('leaderboardView');
}

// Navigation
function goBack() { switchView('testsListView'); }
function goBackFromLeaderboard() { switchView('resultView'); }

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;
}

// Editor
function openEditor() {
    const selector = document.getElementById('testSelector');
    selector.innerHTML = '<option value="new">+ Create New Test</option>';

    appData.tests.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        selector.appendChild(opt);
    });

    editorMode = 'new';
    currentEditingTestId = null;
    resetEditorForm();
    document.getElementById('deleteTestBtn').style.display = 'none';

    switchView('editorView');
}

function closeEditor() {
    switchView('testsListView');
}

// GitHub Token
function loadGithubToken() {
    const t = localStorage.getItem('githubToken');
    if (t) document.getElementById('githubToken').value = t;
}

function saveGithubToken() {
    const t = document.getElementById('githubToken').value;
    localStorage.setItem('githubToken', t);
    alert('GitHub token saved');
}
