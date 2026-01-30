// GitHub Sync Functions

// GitHub Configuration
// These values should be updated with your actual repository details
const GITHUB_CONFIG = {
    owner: 'Dronsharma17',  // Replace with your GitHub username
    repo: 'test-results-app',        // Replace with your repository name
    branch: 'main',                  // Usually 'main' or 'master'
    filePath: 'data.json'           // Path to data file in repository
};

/**
 * Update file in GitHub repository
 * @param {string} token - GitHub Personal Access Token
 * @param {object} data - Data to save
 */
async function updateGithubFile(token, data) {
    const { owner, repo, branch, filePath } = GITHUB_CONFIG;
    
    // Get current file SHA (required for updating)
    const currentFile = await getGithubFile(token);
    const sha = currentFile ? currentFile.sha : null;
    
    // Convert data to base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    
    // Prepare request
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const payload = {
        message: `Update test data - ${new Date().toISOString()}`,
        content: content,
        branch: branch
    };
    
    if (sha) {
        payload.sha = sha;
    }
    
    // Send request
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message}`);
    }
    
    return await response.json();
}

/**
 * Get current file from GitHub
 * @param {string} token - GitHub Personal Access Token
 */
async function getGithubFile(token) {
    const { owner, repo, branch, filePath } = GITHUB_CONFIG;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) {
            return null; // File doesn't exist yet
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch file from GitHub');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        return null;
    }
}

/**
 * Fetch data from GitHub
 * @param {string} token - GitHub Personal Access Token (optional)
 */
async function fetchFromGithub(token = null) {
    const { owner, repo, branch, filePath } = GITHUB_CONFIG;
    
    // Try to fetch from raw GitHub URL (no auth needed for public repos)
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    
    try {
        const response = await fetch(rawUrl);
        
        if (response.ok) {
            return await response.json();
        }
        
        // If raw URL fails and we have a token, try API
        if (token) {
            const fileData = await getGithubFile(token);
            if (fileData && fileData.content) {
                const decoded = decodeURIComponent(escape(atob(fileData.content)));
                return JSON.parse(decoded);
            }
        }
        
        return { tests: [] };
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        return { tests: [] };
    }
}

/**
 * Initialize GitHub sync on app start
 */
async function initGithubSync() {
    const token = localStorage.getItem('githubToken');
    
    try {
        const data = await fetchFromGithub(token);
        return data;
    } catch (error) {
        console.error('Error initializing GitHub sync:', error);
        return { tests: [] };
    }
}

/**
 * Validate GitHub token
 * @param {string} token - GitHub Personal Access Token
 */
async function validateGithubToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
}
