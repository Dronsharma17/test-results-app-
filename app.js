// Global State
let appData = {
    tests: []
};

let currentTestId = null;
let currentView = 'testsListView';
let editorMode = 'new';
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

function viewSyllabus(testId) {
    console.log('View syllabus for:', testId);
}

function reattemptTest(testId) {
    console.log('Reattempt test:', testId);
}

// View Result
function viewResult(testId) {
    currentTestId = testId;
    const test = appData.tests.find(t => t.id === testId);
    if (!test) return;
    
    document.getElementById('resultTestName').textContent = test.name;
    const dateObj = new Date(test.date);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('resultTestInfo').textContent = `${formattedDate} • ${test.mode} Mode`;
    
    // Calculate total score from subjects
    const totalScore = test.myResult.subjects.maths.score + 
                       test.myResult.subjects.physics.score + 
                       test.myResult.subjects.chemistry.score;
    
    document.getElementById('userScore').textContent = totalScore;
    document.getElementById('maxScore').textContent = test.myResult.maxScore || 300;
    document.getElementById('classAvg').textContent = test.classAverage || 80;
    
    document.getElementById('airRank').textContent = test.myResult.rankings.air.rank.toLocaleString();
    document.getElementById('airTotal').textContent = test.myResult.rankings.air.total.toLocaleString();
    document.getElementById('airPercentile').textContent = calculatePercentile(test.myResult.rankings.air.rank, test.myResult.rankings.air.total) + ' Percentile';
    
    document.getElementById('centerRank').textContent = test.myResult.rankings.center.rank.toLocaleString();
    document.getElementById('centerTotal').textContent = test.myResult.rankings.center.total.toLocaleString();
    document.getElementById('centerPercentile').textContent = calculatePercentile(test.myResult.rankings.center.rank, test.myResult.rankings.center.total) + ' percentile';
    
    document.getElementById('campusRank').textContent = test.myResult.rankings.campus.rank.toLocaleString();
    document.getElementById('campusTotal').textContent = test.myResult.rankings.campus.total.toLocaleString();
    document.getElementById('campusPercentile').textContent = calculatePercentile(test.myResult.rankings.campus.rank, test.myResult.rankings.campus.total) + ' percentile';
    
    // ✅ UPDATED: Handle marking schemes
    let correctMarks, incorrectMarks;
    
    if (test.myResult.maxScore === 300) {
        // For 300 marks: AUTO-CALCULATE using +4, -1 scheme
        correctMarks = test.myResult.correctQuestions * 4;
        incorrectMarks = test.myResult.incorrectQuestions * 1;
    } else {
        // For 180/186 marks: USE MANUALLY ENTERED VALUES
        correctMarks = test.myResult.correctMarks || 0;
        incorrectMarks = test.myResult.incorrectMarks || 0;
    }
    
    const totalQuestions = test.myResult.correctQuestions + test.myResult.incorrectQuestions + test.myResult.unattemptedQuestions;
    const correctPercent = totalQuestions > 0 ? Math.round((test.myResult.correctQuestions / totalQuestions) * 100) : 0;
    
    document.getElementById('correctPercent').textContent = correctPercent + '%';
    document.getElementById('correctCount').textContent = test.myResult.correctQuestions;
    document.getElementById('correctMarks').textContent = correctMarks.toFixed(2);
    document.getElementById('incorrectCount').textContent = test.myResult.incorrectQuestions;
    document.getElementById('incorrectMarks').textContent = incorrectMarks.toFixed(2);
    document.getElementById('unattemptedCount').textContent = test.myResult.unattemptedQuestions;
    document.getElementById('avgTime').textContent = test.myResult.avgTimePerQuestion || '02:23';
    
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
    
    renderLeaderboardPreview(test);
    switchView('resultView');
}

function calculatePercentile(rank, total) {
    const percentile = ((total - rank) / total) * 100;
    return percentile.toFixed(2);
}

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
    
    const viewDetailsBtn = document.createElement('button');
    viewDetailsBtn.className = 'btn-primary';
    viewDetailsBtn.textContent = 'View Details';
    viewDetailsBtn.style.marginTop = '15px';
    viewDetailsBtn.onclick = () => viewLeaderboard(test.id);
    preview.appendChild(viewDetailsBtn);
}

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

function goBack() {
    switchView('testsListView');
}

function goBackFromLeaderboard() {
    switchView('resultView');
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;
}

function setupEventListeners() {
    const rankingPanels = document.getElementById('rankingPanels');
    let currentIndex = 0;
    
    rankingPanels.addEventListener('scroll', function() {
        const panelWidth = rankingPanels.querySelector('.ranking-panel').offsetWidth + 15;
        const newIndex = Math.round(rankingPanels.scrollLeft / panelWidth);
        
        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
            updatePanelIndicators(currentIndex);
        }
    });
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchDetailTab(tabName);
        });
    });
}

function updatePanelIndicators(index) {
    document.querySelectorAll('.indicator').forEach((indicator, i) => {
        if (i === index) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function switchDetailTab(tabName) {
    document.querySelectorAll('.detail-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function setupLongPressEditor() {
    const testsBtn = document.getElementById('testsNavBtn');
    if (!testsBtn) {
        console.error('Tests button not found!');
        return;
    }
    
    let pressTimer;
    let progressIndicator;
    
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
        transition: width 6s linear;
    `;
    progressIndicator.appendChild(progressBar);
    document.body.appendChild(progressIndicator);
    
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
        progressIndicator.style.display = 'block';
        progressBar.style.width = '100%';
        pressTimer = setTimeout(() => {
            cancelPress();
            openEditor();
        }, 6000);
    }
    
    function cancelPress() {
        clearTimeout(pressTimer);
        progressIndicator.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.style.transition = 'none';
        setTimeout(() => {
            progressBar.style.transition = 'width 6s linear';
        }, 10);
    }
}

// ✅ UPDATED: Open Editor
function openEditor() {
    console.log('🔓 Opening Editor');
    
    editorMode = 'new';
    currentEditingTestId = null;
    
    const testSelector = document.getElementById('testSelector');
    testSelector.innerHTML = '<option value="new">+ Create New Test</option>';
    
    appData.tests.forEach(test => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.name;
        testSelector.appendChild(option);
    });
    
    testSelector.value = 'new';
    resetEditorForm();
    document.getElementById('deleteTestBtn').style.display = 'none';
    
    toggleMarkingSchemeFields();
    
    switchView('editorView');
}

function closeEditor() {
    switchView(currentView === 'editorView' ? 'testsListView' : currentView);
}

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
    
    toggleMarkingSchemeFields();
}

// ✅ NEW: Toggle fields based on max marks
function toggleMarkingSchemeFields() {
    const maxMarks = parseInt(document.getElementById('editMaxMarks').value);
    const manualMarksSection = document.getElementById('manualMarksSection');
    
    if (maxMarks === 180 || maxMarks === 186) {
        // Show manual entry fields for 180/186 marks
        manualMarksSection.style.display = 'block';
    } else {
        // Hide for 300 marks (auto-calculation)
        manualMarksSection.style.display = 'none';
    }
}

function resetEditorForm() {
    document.getElementById('editTestName').value = '';
    document.getElementById('editTestDate').value = '';
    document.getElementById('editTestMode').value = 'CBT';
    document.getElementById('editMaxMarks').value = '300';
    document.getElementById('editClassAvg').value = '';
    document.getElementById('editCorrect').value = '';
    document.getElementById('editIncorrect').value = '';
    document.getElementById('editUnattempted').value = '';
    document.getElementById('editAvgTime').value = '';
    document.getElementById('editCorrectMarks').value = '';
    document.getElementById('editIncorrectMarks').value = '';
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
    
    generateLeaderboardEditor([]);
    toggleMarkingSchemeFields();
}

function populateEditorForm(test) {
    document.getElementById('editTestName').value = test.name;
    document.getElementById('editTestDate').value = test.date;
    document.getElementById('editTestMode').value = test.mode;
    document.getElementById('editMaxMarks').value = test.myResult.maxScore || 300;
    document.getElementById('editClassAvg').value = test.classAverage || '';
    document.getElementById('editCorrect').value = test.myResult.correctQuestions;
    document.getElementById('editIncorrect').value = test.myResult.incorrectQuestions;
    document.getElementById('editUnattempted').value = test.myResult.unattemptedQuestions;
    document.getElementById('editAvgTime').value = test.myResult.avgTimePerQuestion || '';
    document.getElementById('editCorrectMarks').value = test.myResult.correctMarks || '';
    document.getElementById('editIncorrectMarks').value = test.myResult.incorrectMarks || '';
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
    
    generateLeaderboardEditor(test.leaderboard);
    toggleMarkingSchemeFields();
}

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

// ✅ UPDATED: Save with validation and manual marks support
async function saveEditorChanges() {
    const testName = document.getElementById('editTestName').value.trim();
    const testDate = document.getElementById('editTestDate').value;
    
    if (!testName) {
        alert('⚠️ Please enter a test name!');
        return;
    }
    
    if (!testDate) {
        alert('⚠️ Please select a test date!');
        return;
    }
    
    console.log('💾 Saving test...');
    console.log('Editor Mode:', editorMode);
    
    const maxScore = parseInt(document.getElementById('editMaxMarks').value);
    
    const testData = {
        id: editorMode === 'new' ? 'test_' + Date.now() : currentEditingTestId,
        name: testName,
        date: testDate,
        mode: document.getElementById('editTestMode').value,
        duration: '180 Min',
        classAverage: parseInt(document.getElementById('editClassAvg').value) || 80,
        myResult: {
            correctQuestions: parseInt(document.getElementById('editCorrect').value) || 0,
            incorrectQuestions: parseInt(document.getElementById('editIncorrect').value) || 0,
            unattemptedQuestions: parseInt(document.getElementById('editUnattempted').value) || 0,
            avgTimePerQuestion: document.getElementById('editAvgTime').value || '02:23',
            maxScore: maxScore,
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
    
    // ✅ Add manual marks for 180/186 tests
    if (maxScore === 180 || maxScore === 186) {
        testData.myResult.correctMarks = parseFloat(document.getElementById('editCorrectMarks').value) || 0;
        testData.myResult.incorrectMarks = parseFloat(document.getElementById('editIncorrectMarks').value) || 0;
    }
    
    console.log('Max Score:', maxScore);
    
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
    
    if (editorMode === 'new') {
        console.log('✅ Adding NEW test');
        appData.tests.push(testData);
    } else {
        console.log('✏️ Editing EXISTING test');
        const index = appData.tests.findIndex(t => t.id === currentEditingTestId);
        if (index !== -1) {
            appData.tests[index] = testData;
        }
    }
    
    console.log('Total tests now:', appData.tests.length);
    
    await saveToGithub();
    renderTestsList();
    closeEditor();
    alert('Test saved successfully!');
}

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

function loadGithubToken() {
    const token = localStorage.getItem('githubToken');
    if (token) {
        document.getElementById('githubToken').value = token;
    }
}

function saveGithubToken() {
    const token = document.getElementById('githubToken').value;
    if (token) {
        localStorage.setItem('githubToken', token);
        alert('GitHub token saved!');
    }
}

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
