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
    setupLongPressEditor();
});

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
    if (!navigator.onLine) {
        return;
    }
    
    try {
        const response = await fetch('data.json');
        if (response.ok) {
            appData = await response.json();
            renderTestsList();
        } else {
            // Initialize with empty data
            appData = { tests: [] };
            renderTestsList();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        appData = { tests: [] };
        renderTestsList();
    }
}

// Render Tests List
function renderTestsList() {
    const carousel = document.getElementById('testCarousel');
    carousel.innerHTML = '';
    
    if (appData.tests.length === 0) {
        carousel.innerHTML = '<div class="loading">No tests available. Use the editor to add tests.</div>';
        return;
    }
    
    // Sort tests by date (newest first)
    const sortedTests = [...appData.tests].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTests.forEach(test => {
        const card = createTestCard(test);
        carousel.appendChild(card);
    });
}

// Create Test Card
function createTestCard(test) {
    const card = document.createElement('div');
    card.className = 'test-card';
    
    const dateObj = new Date(test.date);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    card.innerHTML = `
        <div class="results-banner">Results are out</div>
        <h3>${test.name}</h3>
        <div class="test-meta">
            <span class="meta-item">
                <span class="meta-icon">📅</span> ${formattedDate}
            </span>
            <span class="meta-item">
                <span class="meta-icon">⏱</span> ${test.duration || '180 Min'}
            </span>
            <span class="meta-item">
                <span class="meta-icon">💻</span> ${test.mode}
            </span>
        </div>
        <button class="btn-link" onclick="viewSyllabus('${test.id}')">
            📄 View Syllabus
        </button>
        <div class="test-actions">
            <button class="btn-outline" onclick="reattemptTest('${test.id}')">Re-attempt</button>
            <button class="btn-primary" onclick="viewResult('${test.id}')">View Result</button>
        </div>
    `;
    
    return card;
}

// View Syllabus (Placeholder)
function viewSyllabus(testId) {
    // Placeholder - does nothing
    console.log('View syllabus for:', testId);
}

// Reattempt Test (Placeholder)
function reattemptTest(testId) {
    // Placeholder - does nothing
    console.log('Reattempt test:', testId);
}

// View Result
function viewResult(testId) {
    currentTestId = testId;
    const test = appData.tests.find(t => t.id === testId);
    if (!test) return;
    
    // Populate result view
    document.getElementById('resultTestName').textContent = test.name;
    const dateObj = new Date(test.date);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('resultTestInfo').textContent = `${formattedDate} • ${test.mode} Mode`;
    
    // Score
    const totalScore = test.myResult.subjects.maths.score + 
                       test.myResult.subjects.physics.score + 
                       test.myResult.subjects.chemistry.score;
    document.getElementById('userScore').textContent = totalScore;
    document.getElementById('maxScore').textContent = test.myResult.maxScore || 300;
    document.getElementById('classAvg').textContent = test.classAverage || 80;
    
    // Rankings
    document.getElementById('airRank').textContent = test.myResult.rankings.air.rank.toLocaleString();
    document.getElementById('airTotal').textContent = test.myResult.rankings.air.total.toLocaleString();
    document.getElementById('airPercentile').textContent = calculatePercentile(test.myResult.rankings.air.rank, test.myResult.rankings.air.total) + ' Percentile';
    
    document.getElementById('centerRank').textContent = test.myResult.rankings.center.rank.toLocaleString();
    document.getElementById('centerTotal').textContent = test.myResult.rankings.center.total.toLocaleString();
    document.getElementById('centerPercentile').textContent = calculatePercentile(test.myResult.rankings.center.rank, test.myResult.rankings.center.total) + ' percentile';
    
    document.getElementById('campusRank').textContent = test.myResult.rankings.campus.rank.toLocaleString();
    document.getElementById('campusTotal').textContent = test.myResult.rankings.campus.total.toLocaleString();
    document.getElementById('campusPercentile').textContent = calculatePercentile(test.myResult.rankings.campus.rank, test.myResult.rankings.campus.total) + ' percentile';
    
    // Question details
    const correctMarks = test.myResult.correctQuestions * 4;
    const incorrectMarks = test.myResult.incorrectQuestions * 1;
    const totalQuestions = test.myResult.correctQuestions + test.myResult.incorrectQuestions + test.myResult.unattemptedQuestions;
    const correctPercent = Math.round((test.myResult.correctQuestions / totalQuestions) * 100);
    
    document.getElementById('correctPercent').textContent = correctPercent + '%';
    document.getElementById('correctCount').textContent = test.myResult.correctQuestions;
    document.getElementById('correctMarks').textContent = correctMarks.toFixed(2);
    document.getElementById('incorrectCount').textContent = test.myResult.incorrectQuestions;
    document.getElementById('incorrectMarks').textContent = incorrectMarks.toFixed(2);
    document.getElementById('unattemptedCount').textContent = test.myResult.unattemptedQuestions;
    document.getElementById('avgTime').textContent = test.myResult.avgTimePerQuestion || '02:23';
    
    // Subject table
    const subjectTableBody = document.getElementById('subjectTableBody');
    subjectTableBody.innerHTML = `
        <tr>
            <td class="subject-name">MATHS</td>
            <td>${test.myResult.subjects.maths.score}</td>
            <td>${test.myResult.subjects.maths.correct}</td>
            <td>${test.myResult.subjects.maths.incorrect}</td>
            <td class="subject-arrow">›</td>
        </tr>
        <tr>
            <td class="subject-name">PHYSICS</td>
            <td>${test.myResult.subjects.physics.score}</td>
            <td>${test.myResult.subjects.physics.correct}</td>
            <td>${test.myResult.subjects.physics.incorrect}</td>
            <td class="subject-arrow">›</td>
        </tr>
        <tr>
            <td class="subject-name">CHEMISTRY</td>
            <td>${test.myResult.subjects.chemistry.score}</td>
            <td>${test.myResult.subjects.chemistry.correct}</td>
            <td>${test.myResult.subjects.chemistry.incorrect}</td>
            <td class="subject-arrow">›</td>
        </tr>
    `;
    
    // Leaderboard preview
    renderLeaderboardPreview(test);
    
    switchView('resultView');
}

// Calculate Percentile
function calculatePercentile(rank, total) {
    const percentile = ((total - rank) / total) * 100;
    return percentile.toFixed(2);
}

// Render Leaderboard Preview
function renderLeaderboardPreview(test) {
    const preview = document.getElementById('leaderboardPreview');
    preview.innerHTML = '';
    
    const topStudents = test.leaderboard.slice(0, 5);
    
    topStudents.forEach(student => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        let badgeClass = '';
        if (student.rank <= 3) {
            badgeClass = `rank-${student.rank}`;
        }
        
        item.innerHTML = `
            <div class="rank-badge ${badgeClass}">
                <span class="rank-number">${student.rank}</span>
            </div>
            <div class="leader-name">${student.name}</div>
            <div class="leader-score">${student.score}</div>
        `;
        
        preview.appendChild(item);
    });
    
    // Add "View Details" button
    const viewDetailsBtn = document.createElement('button');
    viewDetailsBtn.className = 'btn-primary';
    viewDetailsBtn.textContent = 'View Details';
    viewDetailsBtn.style.marginTop = '15px';
    viewDetailsBtn.onclick = () => viewLeaderboard(test.id);
    preview.appendChild(viewDetailsBtn);
}

// View Leaderboard
function viewLeaderboard(testId) {
    const test = appData.tests.find(t => t.id === testId);
    if (!test) return;
    
    const tableBody = document.getElementById('leaderboardTableBody');
    tableBody.innerHTML = '';
    
    test.leaderboard.forEach(student => {
        const row = document.createElement('tr');
        
        let badgeClass = '';
        if (student.rank <= 3) {
            badgeClass = `rank-${student.rank}`;
        }
        
        row.innerHTML = `
            <td class="fixed-col rank-col">
                <div class="rank-badge ${badgeClass}">
                    <span class="rank-number">${student.rank}</span>
                </div>
            </td>
            <td class="fixed-col name-col">${student.name}</td>
            <td>${student.score}</td>
            <td>${student.correctQs}</td>
            <td>${student.incorrectQs}</td>
            <td>${student.timeTaken}</td>
            <td>${student.chemistry}</td>
            <td>${student.maths}</td>
            <td>${student.physics}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update user row
    const totalScore = test.myResult.subjects.maths.score + 
                       test.myResult.subjects.physics.score + 
                       test.myResult.subjects.chemistry.score;
    
    document.getElementById('userAirRank').textContent = test.myResult.rankings.air.rank;
    document.getElementById('userLeaderboardScore').textContent = totalScore;
    document.getElementById('userLeaderboardCorrect').textContent = test.myResult.correctQuestions;
    document.getElementById('userLeaderboardIncorrect').textContent = test.myResult.incorrectQuestions;
    document.getElementById('userLeaderboardTime').textContent = test.myResult.avgTimePerQuestion || '2H 59M';
    document.getElementById('userLeaderboardChem').textContent = test.myResult.subjects.chemistry.score;
    document.getElementById('userLeaderboardMaths').textContent = test.myResult.subjects.maths.score;
    document.getElementById('userLeaderboardPhys').textContent = test.myResult.subjects.physics.score;
    
    switchView('leaderboardView');
}

// Go Back
function goBack() {
    switchView('testsListView');
}

function goBackFromLeaderboard() {
    switchView('resultView');
}

// Switch View
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;
}

// Setup Event Listeners
function setupEventListeners() {
    // Ranking panels swipe
    const rankingPanels = document.getElementById('rankingPanels');
    let startX = 0;
    let currentIndex = 0;
    
    rankingPanels.addEventListener('scroll', function() {
        const panelWidth = rankingPanels.querySelector('.ranking-panel').offsetWidth + 15;
        const newIndex = Math.round(rankingPanels.scrollLeft / panelWidth);
        
        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
            updatePanelIndicators(currentIndex);
        }
    });
    
    // Detail tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchDetailTab(tabName);
        });
    });
}

// Update Panel Indicators
function updatePanelIndicators(index) {
    document.querySelectorAll('.indicator').forEach((indicator, i) => {
        if (i === index) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Switch Detail Tab
function switchDetailTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.detail-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Setup 3-Second Long Press Editor
function setupLongPressEditor() {
    const testsBtn = document.getElementById('testsNavBtn');
    if (!testsBtn) {
        console.error('Tests button not found!');
        return;
    }
    
    let pressTimer;
    let progressIndicator;
    
    // Create visual progress indicator
    progressIndicator = document.createElement('div');
    progressIndicator.id = 'pressProgress';
    progressIndicator.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 6px;
        background: rgba(200, 200, 200, 0.3);
        border-radius: 3px;
        overflow: hidden;
        display: none;
        z-index: 1000;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: #0066ff;
        transition: width 3s linear;
    `;
    progressIndicator.appendChild(progressBar);
    document.body.appendChild(progressIndicator);
    
    // Touch events (mobile)
    testsBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startPress();
    });
    
    testsBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        cancelPress();
    });
    
    testsBtn.addEventListener('touchmove', function(e) {
        cancelPress();
    });
    
    // Mouse events (desktop)
    testsBtn.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startPress();
    });
    
    testsBtn.addEventListener('mouseup', function(e) {
        e.preventDefault();
        cancelPress();
    });
    
    testsBtn.addEventListener('mouseleave', function() {
        cancelPress();
    });
    
    function startPress() {
        // Show and animate progress bar
        progressIndicator.style.display = 'block';
        progressBar.style.width = '100%';
        
        // Set timer for 3 seconds
        pressTimer = setTimeout(() => {
            cancelPress();
            openEditor();
        }, 3000); // ✅ CHANGED TO 3 SECONDS
    }
    
    function cancelPress() {
        clearTimeout(pressTimer);
        progressIndicator.style.display = 'none';
        progressBar.style.width = '0%';
        // Remove transition temporarily to reset instantly
        progressBar.style.transition = 'none';
        setTimeout(() => {
            progressBar.style.transition = 'width 3s linear';
        }, 10);
    }
}

// Open Editor
function openEditor() {
    // Populate test selector
    const testSelector = document.getElementById('testSelector');
    testSelector.innerHTML = '<option value="new">+ Create New Test</option>';
    
    appData.tests.forEach(test => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.name;
        testSelector.appendChild(option);
    });
    
    // Reset form for new test
    editorMode = 'new';
    currentEditingTestId = null;
    resetEditorForm();
    
    // Show delete button only when editing
    document.getElementById('deleteTestBtn').style.display = 'none';
    
    switchView('editorView');
}

// Close Editor
function closeEditor() {
    switchView(currentView === 'editorView' ? 'testsListView' : currentView);
}

// Load Test in Editor
function loadTestInEditor() {
    const testSelector = document.getElementById('testSelector');
    const testId = testSelector.value;
    
    if (testId === 'new') {
        editorMode = 'new';
        currentEditingTestId = null;
        resetEditorForm();
        document.getElementById('deleteTestBtn').style.display = 'none';
    } else {
        editorMode = 'edit';
        currentEditingTestId = testId;
        const test = appData.tests.find(t => t.id === testId);
        if (test) {
            populateEditorForm(test);
            document.getElementById('deleteTestBtn').style.display = 'block';
        }
    }
}

// Reset Editor Form
function resetEditorForm() {
    document.getElementById('editTestName').value = '';
    document.getElementById('editTestDate').value = '';
    document.getElementById('editTestMode').value = 'CBT';
    document.getElementById('editClassAvg').value = '';
    document.getElementById('editCorrect').value = '';
    document.getElementById('editIncorrect').value = '';
    document.getElementById('editUnattempted').value = '';
    document.getElementById('editAvgTime').value = '';
    document.getElementById('editAirRank').value = '';
    document.getElementById('editAirTotal').value = '';
    document.getElementById('editCenterRank').value = '';
    document.getElementById('editCenterTotal').value = '';
    document.getElementById('editCampusRank').value = '';
    document.getElementById('editCampusTotal').value = '';
    document.getElementById('editMathsScore').value = '';
    document.getElementById('editMathsCorrect').value = '';
    document.getElementById('editMathsIncorrect').value = '';
    document.getElementById('editPhysicsScore').value = '';
    document.getElementById('editPhysicsCorrect').value = '';
    document.getElementById('editPhysicsIncorrect').value = '';
    document.getElementById('editChemistryScore').value = '';
    document.getElementById('editChemistryCorrect').value = '';
    document.getElementById('editChemistryIncorrect').value = '';
    
    // Generate leaderboard editor
    generateLeaderboardEditor([]);
}

// Populate Editor Form
function populateEditorForm(test) {
    document.getElementById('editTestName').value = test.name;
    document.getElementById('editTestDate').value = test.date;
    document.getElementById('editTestMode').value = test.mode;
    document.getElementById('editClassAvg').value = test.classAverage || '';
    document.getElementById('editCorrect').value = test.myResult.correctQuestions;
    document.getElementById('editIncorrect').value = test.myResult.incorrectQuestions;
    document.getElementById('editUnattempted').value = test.myResult.unattemptedQuestions;
    document.getElementById('editAvgTime').value = test.myResult.avgTimePerQuestion || '';
    document.getElementById('editAirRank').value = test.myResult.rankings.air.rank;
    document.getElementById('editAirTotal').value = test.myResult.rankings.air.total;
    document.getElementById('editCenterRank').value = test.myResult.rankings.center.rank;
    document.getElementById('editCenterTotal').value = test.myResult.rankings.center.total;
    document.getElementById('editCampusRank').value = test.myResult.rankings.campus.rank;
    document.getElementById('editCampusTotal').value = test.myResult.rankings.campus.total;
    document.getElementById('editMathsScore').value = test.myResult.subjects.maths.score;
    document.getElementById('editMathsCorrect').value = test.myResult.subjects.maths.correct;
    document.getElementById('editMathsIncorrect').value = test.myResult.subjects.maths.incorrect;
    document.getElementById('editPhysicsScore').value = test.myResult.subjects.physics.score;
    document.getElementById('editPhysicsCorrect').value = test.myResult.subjects.physics.correct;
    document.getElementById('editPhysicsIncorrect').value = test.myResult.subjects.physics.incorrect;
    document.getElementById('editChemistryScore').value = test.myResult.subjects.chemistry.score;
    document.getElementById('editChemistryCorrect').value = test.myResult.subjects.chemistry.correct;
    document.getElementById('editChemistryIncorrect').value = test.myResult.subjects.chemistry.incorrect;
    
    // Generate leaderboard editor
    generateLeaderboardEditor(test.leaderboard);
}

// Generate Leaderboard Editor
function generateLeaderboardEditor(leaderboard) {
    const container = document.getElementById('leaderboardEditor');
    container.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const student = leaderboard.find(s => s.rank === i) || {
            rank: i,
            name: '',
            score: '',
            correctQs: '',
            incorrectQs: '',
            timeTaken: '',
            maths: '',
            physics: '',
            chemistry: ''
        };
        
        const entry = document.createElement('div');
        entry.className = 'student-entry';
        entry.innerHTML = `
            <h5>Rank ${i}</h5>
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="student${i}Name" value="${student.name}" placeholder="Student Name">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Score</label>
                    <input type="number" id="student${i}Score" value="${student.score}" placeholder="250">
                </div>
                <div class="form-group">
                    <label>Correct Qs</label>
                    <input type="number" id="student${i}Correct" value="${student.correctQs}" placeholder="65">
                </div>
                <div class="form-group">
                    <label>Incorrect Qs</label>
                    <input type="number" id="student${i}Incorrect" value="${student.incorrectQs}" placeholder="5">
                </div>
            </div>
            <div class="form-group">
                <label>Time Taken</label>
                <input type="text" id="student${i}Time" value="${student.timeTaken}" placeholder="2H 45M">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Maths</label>
                    <input type="number" id="student${i}Maths" value="${student.maths}" placeholder="90">
                </div>
                <div class="form-group">
                    <label>Physics</label>
                    <input type="number" id="student${i}Physics" value="${student.physics}" placeholder="100">
                </div>
                <div class="form-group">
                    <label>Chemistry</label>
                    <input type="number" id="student${i}Chem" value="${student.chemistry}" placeholder="60">
                </div>
            </div>
        `;
        
        container.appendChild(entry);
    }
}

// Save Editor Changes
async function saveEditorChanges() {
    // Collect form data
    const testData = {
        id: editorMode === 'new' ? 'test_' + Date.now() : currentEditingTestId,
        name: document.getElementById('editTestName').value,
        date: document.getElementById('editTestDate').value,
        mode: document.getElementById('editTestMode').value,
        duration: '180 Min',
        classAverage: parseInt(document.getElementById('editClassAvg').value) || 80,
        myResult: {
            correctQuestions: parseInt(document.getElementById('editCorrect').value) || 0,
            incorrectQuestions: parseInt(document.getElementById('editIncorrect').value) || 0,
            unattemptedQuestions: parseInt(document.getElementById('editUnattempted').value) || 0,
            avgTimePerQuestion: document.getElementById('editAvgTime').value || '02:23',
            maxScore: 300,
            rankings: {
                air: {
                    rank: parseInt(document.getElementById('editAirRank').value) || 0,
                    total: parseInt(document.getElementById('editAirTotal').value) || 0
                },
                center: {
                    rank: parseInt(document.getElementById('editCenterRank').value) || 0,
                    total: parseInt(document.getElementById('editCenterTotal').value) || 0
                },
                campus: {
                    rank: parseInt(document.getElementById('editCampusRank').value) || 0,
                    total: parseInt(document.getElementById('editCampusTotal').value) || 0
                }
            },
            subjects: {
                maths: {
                    score: parseInt(document.getElementById('editMathsScore').value) || 0,
                    correct: parseInt(document.getElementById('editMathsCorrect').value) || 0,
                    incorrect: parseInt(document.getElementById('editMathsIncorrect').value) || 0
                },
                physics: {
                    score: parseInt(document.getElementById('editPhysicsScore').value) || 0,
                    correct: parseInt(document.getElementById('editPhysicsCorrect').value) || 0,
                    incorrect: parseInt(document.getElementById('editPhysicsIncorrect').value) || 0
                },
                chemistry: {
                    score: parseInt(document.getElementById('editChemistryScore').value) || 0,
                    correct: parseInt(document.getElementById('editChemistryCorrect').value) || 0,
                    incorrect: parseInt(document.getElementById('editChemistryIncorrect').value) || 0
                }
            }
        },
        leaderboard: []
    };
    
    // Collect leaderboard data
    for (let i = 1; i <= 10; i++) {
        const name = document.getElementById(`student${i}Name`).value;
        if (name) {
            testData.leaderboard.push({
                rank: i,
                name: name,
                score: parseInt(document.getElementById(`student${i}Score`).value) || 0,
                correctQs: parseInt(document.getElementById(`student${i}Correct`).value) || 0,
                incorrectQs: parseInt(document.getElementById(`student${i}Incorrect`).value) || 0,
                timeTaken: document.getElementById(`student${i}Time`).value || '',
                maths: parseInt(document.getElementById(`student${i}Maths`).value) || 0,
                physics: parseInt(document.getElementById(`student${i}Physics`).value) || 0,
                chemistry: parseInt(document.getElementById(`student${i}Chem`).value) || 0
            });
        }
    }
    
    // Update appData
    if (editorMode === 'new') {
        appData.tests.push(testData);
    } else {
        const index = appData.tests.findIndex(t => t.id === currentEditingTestId);
        if (index !== -1) {
            appData.tests[index] = testData;
        }
    }
    
    // Save to GitHub
    await saveToGithub();
    
    // Refresh UI
    renderTestsList();
    closeEditor();
    
    alert('Test saved successfully!');
}

// Delete Current Test
async function deleteCurrentTest() {
    if (!currentEditingTestId) return;
    
    if (confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
        appData.tests = appData.tests.filter(t => t.id !== currentEditingTestId);
        await saveToGithub();
        renderTestsList();
        closeEditor();
        alert('Test deleted successfully!');
    }
}

// Load Github Token
function loadGithubToken() {
    const token = localStorage.getItem('githubToken');
    if (token) {
        document.getElementById('githubToken').value = token;
    }
}

// Save Github Token
function saveGithubToken() {
    const token = document.getElementById('githubToken').value;
    if (token) {
        localStorage.setItem('githubToken', token);
        alert('GitHub token saved!');
    }
}

// Save to GitHub
async function saveToGithub() {
    const token = localStorage.getItem('githubToken');
    if (!token) {
        alert('Please set your GitHub token first in the editor settings.');
        return;
    }
    
    try {
        await updateGithubFile(token, appData);
        console.log('Data synced to GitHub');
    } catch (error) {
        console.error('Error syncing to GitHub:', error);
        alert('Failed to sync to GitHub. Please check your token and try again.');
    }
                             }
