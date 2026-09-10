const GITHUB_CLIENT_ID = 'Ov23ct8zx3BMaaxzqsb4';
/**
 * PRIME SYSTEM — Executive Autonomous AI Coder & Creative Studio
 * Author & Authority: Shantanu Sharma
 * GitHub Login + Autonomous Repo Control & Commits + 100X Coding + 10X Photoreal Images
 */

const AppState = {
  currentUser: null,
  github: {
    token: localStorage.getItem('prime_gh_token') || null,
    user: null,
    selectedRepo: localStorage.getItem('prime_gh_repo') || null,
    selectedBranch: localStorage.getItem('prime_gh_branch') || 'main',
    repos: [],
    files: []
  },
  settings: {
    baseUrl: 'https://kiraai.vn/api/v1',
    apiKey: 'kira_b27bf16cdc12f83497204f1460c8e3f9',
    model: 'prime-coder-100x',
    persona: 'female',
    temperature: 0.4,
    maxTokens: 6144,
    autoSpeak: false
  },
  chats: {},
  currentSessionId: null,
  pendingAttachments: [],
  isGenerating: false,
  isSpeaking: false,
  isRecording: false,
  recognition: null,
  cachedVoices: []
};

const MODEL_MAPPING = {
  'prime-coder-100x': 'kira-3.5-pro',
  'prime-omni': 'kira-3.5-pro',
  'prime-pro': 'kira-3.5-pro',
  'prime-turbo': 'kira-3.5-flash',
  'prime-art': 'kira-3.0-image'
};

function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/\bKira\s*AI\b/gi, 'PRIME SYSTEM')
    .replace(/\bKiraAI\b/gi, 'PRIME SYSTEM')
    .replace(/\bKira\b/gi, 'PRIME SYSTEM');
}

// ==========================================================================
// 1. GitHub REST API Client (Read, Write, Commit Files)
// ==========================================================================

const GitHubAPI = {
  getHeaders(token) {
    const t = token || AppState.github.token;
    return {
      'Accept': 'application/vnd.github.v3+json',
      ...(t ? { 'Authorization': `Bearer ${t}` } : {})
    };
  },

  async fetchCurrentUser(token) {
    const res = await fetch('https://api.github.com/user', {
      headers: this.getHeaders(token)
    });
    if (!res.ok) throw new Error(`GitHub Auth Failed (${res.status})`);
    return await res.json();
  },

  async fetchUserRepos(token) {
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
      headers: this.getHeaders(token)
    });
    if (!res.ok) throw new Error(`Failed to fetch repos (${res.status})`);
    return await res.json();
  },

  async fetchRepoTree(owner, repo, branch = 'main') {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        // Fallback to master if main fails
        if (branch === 'main') return await this.fetchRepoTree(owner, repo, 'master');
        throw new Error(`Failed to fetch file tree (${res.status})`);
      }
      const data = await res.json();
      return (data.tree || []).filter(item => item.type === 'blob').map(f => f.path);
    } catch (e) {
      console.warn("Tree fetch error:", e);
      return [];
    }
  },

  async fetchFileContent(owner, repo, path, branch = 'main') {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      const content = atob(data.content.replace(/\s/g, ''));
      return { content, sha: data.sha };
    } catch (e) {
      return null;
    }
  },

  async commitFileChange(owner, repo, path, content, message, branch = 'main') {
    if (!AppState.github.token) {
      throw new Error("GitHub token not connected. Please connect your GitHub account or token first.");
    }
    
    // Check if file already exists to obtain SHA
    const existing = await this.fetchFileContent(owner, repo, path, branch);
    const body = {
      message: message || `Update ${path} via PRIME SYSTEM AI`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: branch
    };
    if (existing && existing.sha) {
      body.sha = existing.sha;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `GitHub commit failed (${res.status})`);
    }

    return await res.json();
  }
};

// ==========================================================================
// 2. 10X Ultra-Photoreal Image Prompt Engineering
// ==========================================================================

function isImagePrompt(text) {
  if (AppState.settings.model === 'prime-art') return true;
  const t = text.toLowerCase();
  return (
    t.includes('image banao') ||
    t.includes('image bana do') ||
    t.includes('photo banao') ||
    t.includes('photo bana do') ||
    t.includes('tasveer banao') ||
    t.includes('generate image') ||
    t.includes('create image') ||
    t.includes('draw an image') ||
    t.includes('generate a picture') ||
    t.includes('create a picture') ||
    t.startsWith('/image ') ||
    t.startsWith('image:') ||
    t.startsWith('draw ')
  );
}

function cleanImagePrompt(text) {
  return text
    .replace(/^(\/?image[:\s]*|generate image (of|for)?|create image (of|for)?|draw an image (of|for)?|photo banao|image banao|image bana do|photo bana do|tasveer banao)/i, '')
    .trim();
}

function enhanceImagePrompt(rawPrompt, userStyle) {
  let clean = cleanImagePrompt(rawPrompt) || rawPrompt;
  const photorealEnhancer = "photorealistic 8k uhd, dslr master photography, 35mm photograph, shot on Hasselblad 50mm f/1.2, sharp focus, volumetric studio lighting, natural subsurface scattering, hyper-detailed textures, award winning masterpiece";
  if (userStyle) {
    return `${clean}, ${userStyle}, ${photorealEnhancer}`;
  }
  return `${clean}, ${photorealEnhancer}`;
}

// ==========================================================================
// 3. 100X Autonomous Coding & Executive Persona System Prompts
// ==========================================================================

function getSystemPrompt(persona, userName, model) {
  const userGreetingName = userName || 'User';
  const activeRepo = AppState.github.selectedRepo;
  const activeBranch = AppState.github.selectedBranch || 'main';

  const repoContextNotice = activeRepo ? `
[ACTIVE GITHUB REPOSITORY]:
- Repository: ${activeRepo}
- Target Branch: ${activeBranch}
- Available Files: ${AppState.github.files.slice(0, 40).join(', ') || 'Connected'}

AUTONOMOUS GITHUB COMMIT INSTRUCTIONS:
Jab user kisi repo me coding karne, naye features add karne, ya bug fix karne ko kahe:
1. Aap code ko complete, bug-free, aur production-ready likhein (kisi bhi line ko skip mat karein).
2. Har file ke code ko is specific structure me zaroor wrap karein taaki PRIME SYSTEM AI usse automatically GitHub par commit aur push kar sake:
<<<FILE: path/to/filename.ext>>>
[Full file code here]
<<<END_FILE>>>
3. User ko explain karein ki kya changes kiye gaye hain.
` : '';

  if (model === 'prime-coder-100x') {
    return `Aap PRIME CODER 100X — ek world-class Elite Autonomous Software Architect aur Full-Stack Senior Staff Engineer hain.
Creator aur Owner: Shantanu Sharma.
User: ${userGreetingName} sir.

CORE CODING CAPABILITIES:
1. 100X CODE QUALITY: Har solution fully-functional, highly-optimized, zero-bug, aur production-ready hona chahiye. Kabhi bhi "// TODO" ya incomplete code na chhorein.
2. FULL-STACK MASTERY: HTML/CSS/JavaScript, TypeScript, React, Next.js, Node.js, Python, Flask, FastAPI, Django, Go, Rust, C++, SQL, Bash scripts.
3. SURGICAL BUG FIXING: Code me runtime errors, edge cases, memory leaks aur race conditions ko identify karke proactively fix karein.
4. BEAUTIFUL MODERN UI: Clean modern glassmorphism, responsive CSS, accessible HTML5, responsive mobile design.
${repoContextNotice}
Reply in confident, sharp, professional Hinglish. Always prioritize complete code blocks.`;
  }

  if (persona === 'female') {
    return `Aap PRIME SYSTEM (Cute & Sweet Female Persona) hain — ${userGreetingName} ki personal, super sweet, charming, polite aur highly-intelligent AI assistant.
Aapka creator, boss aur owner Shantanu Sharma hain.

BAAT KARNE KA STYLE:
1. USER ADDRESSING: Normal baat karte waqt user ko "${userGreetingName} sir / ${userGreetingName} ji" keh kar address karein.
2. OWNER ADDRESSING: Jab user pooche ki "Who is your owner / Who created you / Tumhe kisne banaya", tab strictly aur clearly bolein: "PRIME SYSTEM ke sole creator aur owner Shantanu Sharma hain."
3. SWEET & CUTE HINGLISH: Aasan, sweet, cute aur natural female Hinglish use karein. "Kira" shabd ka use kabhi na karein.
4. GREETINGS: "hello", "hi" ya "namaste" par 1 line me sweet aur direct reply dein.
${repoContextNotice}`;
  } else {
    return `Aap PRIME SYSTEM (Male Persona) hain — ${userGreetingName} ke personal, confident, smart aur highly-intelligent executive AI assistant.
Aapka creator, boss aur owner Shantanu Sharma hain.

BAAT KARNE KA STYLE:
1. USER ADDRESSING: Normal baat karte waqt user ko "${userGreetingName} sir / ${userGreetingName} bhai" keh kar address karein.
2. OWNER ADDRESSING: Jab user pooche ki "Who is your owner / Who created you / Tumhe kisne banaya", tab strictly aur clearly bolein: "PRIME SYSTEM ke sole creator aur owner Shantanu Sharma hain."
3. NATURAL HINGLISH: Aasan, confident aur crisp masculine Hinglish use karein. "Kira" shabd ka use kabhi na karein.
${repoContextNotice}`;
  }
}

// ==========================================================================
// 4. Boot Sequence & Initialization
// ==========================================================================

function initBootSequence() {
  const bootScreen = document.getElementById('boot-screen');
  const statusText = document.getElementById('boot-status');
  const progressFill = document.getElementById('boot-progress-fill');

  const steps = [
    { text: 'CONNECTING QUANTUM CORE...', progress: '25%' },
    { text: 'LINKING 100X AUTONOMOUS CODER...', progress: '60%' },
    { text: 'CALIBRATING GITHUB REPO ENGINE...', progress: '85%' },
    { text: 'PRIME SYSTEM READY • SHANTANU SHARMA', progress: '100%' }
  ];

  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      if (statusText) statusText.textContent = steps[currentStep].text;
      if (progressFill) progressFill.style.width = steps[currentStep].progress;
      currentStep++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        if (bootScreen) {
          bootScreen.classList.add('fade-out');
          setTimeout(() => { bootScreen.style.display = 'none'; }, 400);
        }
      }, 400);
    }
  }, 300);
}

// ==========================================================================
// 5. Multi-Auth (Google & GitHub)
// ==========================================================================

function initAuth() {
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const googleBtn = document.getElementById('btn-google-login');
  const githubBtn = document.getElementById('btn-github-login');
  const navGoogleBtn = document.getElementById('btn-nav-google-login');
  const navGithubBtn = document.getElementById('btn-nav-github-login');
  const errorBox = document.getElementById('auth-error-box');

  // Check saved session
  const saved = localStorage.getItem('prime_logged_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      setUserLoggedInUI(u);
    } catch (e) {}
  } else {
    setUserLoggedOutUI();
  }

  // Firebase Auth State
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          const userData = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email,
            photoURL: user.photoURL
          };
          localStorage.setItem('prime_logged_user', JSON.stringify(userData));
          setUserLoggedInUI(userData);
        } else if (!localStorage.getItem('prime_logged_user')) {
          setUserLoggedOutUI();
        }
      });
    } catch (err) {}
  }

  // Handle Redirect Sign-in Result (for mobile / popup-blocked environments)
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      firebase.auth().getRedirectResult().then(async (result) => {
        if (result && result.user) {
          const u = result.user;
          const credential = result.credential;
          const ghToken = credential ? credential.accessToken : null;

          if (ghToken) {
            AppState.github.token = ghToken;
            localStorage.setItem('prime_gh_token', ghToken);
            await syncGitHubAccount(ghToken);
          }

          const userData = {
            uid: u.uid,
            displayName: u.displayName || u.reloadUserInfo?.screenName || 'Developer',
            email: u.email,
            photoURL: u.photoURL
          };
          localStorage.setItem('prime_logged_user', JSON.stringify(userData));
          setUserLoggedInUI(userData);
        }
      }).catch((e) => console.warn('Redirect auth notice:', e));
    } catch (e) {}
  }


  // Google Login Handler
  async function triggerGoogleSignIn() {
    if (errorBox) errorBox.classList.add('hidden');
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await firebase.auth().signInWithPopup(provider);
        const u = res.user;
        const userData = {
          uid: u.uid,
          displayName: u.displayName || u.email?.split('@')[0] || 'User',
          email: u.email,
          photoURL: u.photoURL
        };
        localStorage.setItem('prime_logged_user', JSON.stringify(userData));
        setUserLoggedInUI(userData);
      } catch (e) {
        handleAuthFallback(e, 'Google');
      }
    }
  }

  // GitHub Login Handler (Direct OAuth Popup with repo scope)
  async function triggerGitHubSignIn() {
    if (errorBox) errorBox.classList.add('hidden');
    const githubBtn = document.getElementById('btn-github-login');
    const navGithubBtn = document.getElementById('btn-nav-github-login');

    if (githubBtn) { githubBtn.disabled = true; githubBtn.style.opacity = '0.7'; }
    if (navGithubBtn) { navGithubBtn.disabled = true; navGithubBtn.style.opacity = '0.7'; }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const provider = new firebase.auth.GithubAuthProvider();
        provider.addScope('repo'); // Grant full repo read/write access for autonomous commits
        provider.addScope('user');
        provider.setCustomParameters({ allow_signup: 'true' });

        const result = await firebase.auth().signInWithPopup(provider);
        const credential = firebase.auth.GithubAuthProvider.credentialFromResult(result);
        const token = credential ? credential.accessToken : null;
        const user = result.user;

        if (token) {
          AppState.github.token = token;
          localStorage.setItem('prime_gh_token', token);
          await syncGitHubAccount(token);
        }

        const userData = {
          uid: user.uid,
          displayName: user.displayName || user.reloadUserInfo?.screenName || 'GitHub Developer',
          email: user.email,
          photoURL: user.photoURL
        };
        localStorage.setItem('prime_logged_user', JSON.stringify(userData));
        setUserLoggedInUI(userData);
      } catch (err) {
        console.error('Firebase GitHub Auth Error:', err);
        if (err.code === 'auth/account-exists-with-different-credential') {
          alert('Notice: This email is already associated with Google. Please Sign In with Google or paste your GitHub Token in the GitHub Studio tab.');
          openGitHubModal();
        } else if (err.code === 'auth/popup-closed-by-user') {
          // User closed popup
        } else {
          if (errorBox) {
            errorBox.textContent = err.message || 'Firebase GitHub login failed. Please ensure Callback URL is set in GitHub OAuth settings.';
            errorBox.classList.remove('hidden');
          }
          openGitHubModal();
        }
      } finally {
        if (githubBtn) { githubBtn.disabled = false; githubBtn.style.opacity = '1'; }
        if (navGithubBtn) { navGithubBtn.disabled = false; navGithubBtn.style.opacity = '1'; }
      }
    } else {
      openGitHubModal();
    }
  }

  if (googleBtn) googleBtn.onclick = triggerGoogleSignIn;
  if (navGoogleBtn) navGoogleBtn.onclick = triggerGoogleSignIn;
  if (githubBtn) githubBtn.onclick = triggerGitHubSignIn;
  if (navGithubBtn) navGithubBtn.onclick = triggerGitHubSignIn;
}

function setUserLoggedInUI(userData) {
  AppState.currentUser = userData;
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const nameSpan = document.getElementById('user-display-name');
  const avatarImg = document.getElementById('user-avatar-img');
  const defaultIcon = document.getElementById('user-default-icon');
  const navUserProfile = document.getElementById('nav-user-profile');
  const navAuthButtons = document.getElementById('nav-auth-buttons');

  if (nameSpan) nameSpan.textContent = userData.displayName;

  if (userData.photoURL && avatarImg) {
    avatarImg.src = userData.photoURL;
    avatarImg.classList.remove('hidden');
    if (defaultIcon) defaultIcon.classList.add('hidden');
  } else {
    if (avatarImg) avatarImg.classList.add('hidden');
    if (defaultIcon) defaultIcon.classList.remove('hidden');
  }

  if (navUserProfile) navUserProfile.classList.remove('hidden');
  if (navAuthButtons) navAuthButtons.classList.add('hidden');
  if (authScreen) authScreen.classList.add('hidden');
  if (appScreen) appScreen.classList.remove('hidden');

  loadUserChats();
  checkGitHubAutoInit();
}

function setUserLoggedOutUI() {
  AppState.currentUser = null;
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const navUserProfile = document.getElementById('nav-user-profile');
  const navAuthButtons = document.getElementById('nav-auth-buttons');

  if (navUserProfile) navUserProfile.classList.add('hidden');
  if (navAuthButtons) navAuthButtons.classList.remove('hidden');
  if (authScreen) authScreen.classList.remove('hidden');
  if (appScreen) appScreen.classList.add('hidden');
}

function handleLogout() {
  if (confirm('Sign out of PRIME SYSTEM?')) {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try { firebase.auth().signOut(); } catch (e) {}
    }
    localStorage.removeItem('prime_logged_user');
    AppState.currentUser = null;
    setUserLoggedOutUI();
    location.reload();
  }
}

// ==========================================================================
// 6. Visual GitHub Repositories Hub (Zero Token Hassle!)
// ==========================================================================

async function checkGitHubAutoInit() {
  const token = AppState.github.token;
  if (token) {
    await syncGitHubAccount(token);
  } else {
    // Check if user has a saved GitHub login or username
    const saved = localStorage.getItem('prime_logged_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.displayName && !u.displayName.includes('@')) {
          loadPublicRepositories(u.displayName);
        }
      } catch (e) {}
    }
  }
  updateRepoBadges();
}

async function syncGitHubAccount(token) {
  try {
    const user = await GitHubAPI.fetchCurrentUser(token);
    AppState.github.user = user;
    
    // Update Hub status
    const hubConnectBtn = document.getElementById('btn-hub-github-connect');
    const hubUserBadge = document.getElementById('hub-user-badge');
    const hubAvatar = document.getElementById('hub-user-avatar');
    const hubUsername = document.getElementById('hub-username-label');

    if (hubConnectBtn) hubConnectBtn.classList.add('hidden');
    if (hubUserBadge) hubUserBadge.classList.remove('hidden');
    if (hubAvatar) hubAvatar.src = user.avatar_url;
    if (hubUsername) hubUsername.textContent = user.login;

    await loadUserRepositories();
  } catch (e) {
    console.warn("GitHub account sync:", e.message);
  }
}

async function loadPublicRepositories(username) {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
    if (res.ok) {
      const repos = await res.json();
      AppState.github.repos = repos;
      renderRepositoryCards();
    }
  } catch (e) {}
}

async function loadUserRepositories() {
  const grid = document.getElementById('repo-cards-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="repo-loading-box">
        <i data-lucide="loader-2" class="spin-icon"></i>
        <span>Loading your GitHub repositories...</span>
      </div>
    `;
    try { if (window.lucide) lucide.createIcons(); } catch (e) {}
  }

  try {
    const repos = await GitHubAPI.fetchUserRepos();
    AppState.github.repos = repos;
    renderRepositoryCards();
    renderSidebarRepoList();

    if (AppState.github.selectedRepo) {
      await inspectRepoFiles(AppState.github.selectedRepo);
    }
  } catch (e) {
    if (grid) {
      grid.innerHTML = `
        <div class="repo-empty-box">
          <i data-lucide="alert-circle" style="color:#ef4444; width:32px; height:32px;"></i>
          <span>Failed to load repositories: ${e.message}</span>
          <button class="btn-primary" onclick="triggerGitHubSignIn()" style="margin-top:8px;">Connect with GitHub</button>
        </div>
      `;
      try { if (window.lucide) lucide.createIcons(); } catch (e) {}
    }
  }
}

function renderRepositoryCards(filter = '') {
  const grid = document.getElementById('repo-cards-grid');
  const countBadge = document.getElementById('repo-count-badge');
  if (!grid) return;

  const query = filter.toLowerCase().trim();
  const repos = AppState.github.repos.filter(r => {
    if (!query) return true;
    return r.name.toLowerCase().includes(query) || (r.description && r.description.toLowerCase().includes(query));
  });

  if (countBadge) countBadge.textContent = `${repos.length} Repos`;
  grid.innerHTML = '';

  if (repos.length === 0) {
    grid.innerHTML = `
      <div class="repo-empty-box">
        <i data-lucide="folder-search" style="width:36px; height:36px; color:var(--text-muted);"></i>
        <span>${filter ? 'No repositories match your search.' : 'No repositories found. Connect your GitHub account to see all your repos.'}</span>
        ${!AppState.github.token ? '<button class="btn-primary" onclick="triggerGitHubSignIn()" style="margin-top:8px;"><i data-lucide="github"></i> Connect GitHub</button>' : ''}
      </div>
    `;
    try { if (window.lucide) lucide.createIcons(); } catch (e) {}
    return;
  }

  repos.forEach(r => {
    const isSelected = AppState.github.selectedRepo === r.full_name;
    const card = document.createElement('div');
    card.className = `repo-card ${isSelected ? 'active' : ''}`;
    card.onclick = () => selectRepository(r.full_name, r.default_branch || 'main');

    card.innerHTML = `
      <div class="repo-card-header">
        <span class="repo-card-name">${r.name}</span>
        <span class="repo-vis-badge ${r.private ? 'private' : ''}">${r.private ? 'Private 🔒' : 'Public 🌐'}</span>
      </div>
      <div class="repo-card-desc">${r.description || 'No description provided.'}</div>
      <div class="repo-card-footer">
        <div class="repo-lang-tag">
          <span class="lang-dot"></span>
          <span>${r.language || 'Code'}</span>
        </div>
        <button class="btn-select-repo" type="button">
          ${isSelected ? '✓ Selected' : '⚡ Code with AI'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

function renderSidebarRepoList() {
  const sbList = document.getElementById('sidebar-repo-list');
  if (!sbList) return;
  sbList.innerHTML = '';

  if (AppState.github.repos.length === 0) {
    sbList.innerHTML = `<div class="sidebar-repo-empty">No repos loaded yet. <a href="#" onclick="openGitHubModal(); return false;" style="color:var(--accent-cyan);">Connect</a></div>`;
    return;
  }

  AppState.github.repos.slice(0, 15).forEach(r => {
    const isSelected = AppState.github.selectedRepo === r.full_name;
    const item = document.createElement('div');
    item.className = `sidebar-repo-item ${isSelected ? 'active' : ''}`;
    item.onclick = () => selectRepository(r.full_name, r.default_branch || 'main');
    item.innerHTML = `
      <div class="sidebar-repo-name">
        <i data-lucide="${r.private ? 'lock' : 'folder-git-2'}"></i>
        <span>${r.name}</span>
      </div>
      ${isSelected ? '<span style="color:#10b981; font-size:0.7rem;">●</span>' : ''}
    `;
    sbList.appendChild(item);
  });

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

async function selectRepository(fullRepoName, branch = 'main') {
  AppState.github.selectedRepo = fullRepoName;
  AppState.github.selectedBranch = branch;
  localStorage.setItem('prime_gh_repo', fullRepoName);
  localStorage.setItem('prime_gh_branch', branch);

  updateRepoBadges();
  renderRepositoryCards(document.getElementById('repo-search-input')?.value || '');
  renderSidebarRepoList();

  const branchInput = document.getElementById('github-branch-input');
  if (branchInput) branchInput.value = branch;

  await inspectRepoFiles(fullRepoName);

  // Friendly greeting in input placeholder
  const input = document.getElementById('chat-input');
  if (input) {
    input.placeholder = `Ask 100X Coder to write code or commit to ${fullRepoName}...`;
  }
}

async function inspectRepoFiles(fullRepoName) {
  if (!fullRepoName) return;
  const [owner, repo] = fullRepoName.split('/');
  const branch = AppState.github.selectedBranch || 'main';
  const treeContainer = document.getElementById('repo-tree-list');
  const countSpan = document.getElementById('tree-file-count');

  if (treeContainer) treeContainer.innerHTML = '<div class="tree-empty">Fetching file hierarchy...</div>';
  const files = await GitHubAPI.fetchRepoTree(owner, repo, branch);
  AppState.github.files = files;

  if (countSpan) countSpan.textContent = files.length;
  if (!treeContainer) return;
  treeContainer.innerHTML = '';

  if (files.length === 0) {
    treeContainer.innerHTML = '<div class="tree-empty">No files found or default branch different.</div>';
    return;
  }

  files.slice(0, 80).forEach(file => {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.innerHTML = `<i data-lucide="file-code"></i> <span>${file}</span>`;
    treeContainer.appendChild(item);
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

function updateRepoBadges() {
  const repoName = AppState.github.selectedRepo || 'No Repo Selected';
  const sidebarRepo = document.getElementById('sidebar-repo-name');
  const navRepo = document.getElementById('nav-repo-label');
  const hubActiveTitle = document.getElementById('hub-active-repo-name');

  if (sidebarRepo) sidebarRepo.textContent = repoName;
  if (navRepo) navRepo.textContent = repoName !== 'No Repo Selected' ? repoName : 'Select Repo';
  if (hubActiveTitle) hubActiveTitle.textContent = repoName;
}

function openGitHubModal() {
  const modal = document.getElementById('github-modal');
  modal.classList.remove('hidden');
  updateRepoBadges();
  if (AppState.github.repos.length === 0) {
    if (AppState.github.token) loadUserRepositories();
    else {
      renderRepositoryCards();
    }
  } else {
    renderRepositoryCards();
  }
}

function closeGitHubModal() {
  document.getElementById('github-modal').classList.add('hidden');
}

// ==========================================================================
// 7. Conversation Management (Linked to Account)
// ==========================================================================

function getStorageChatKey() {
  const uid = AppState.currentUser ? (AppState.currentUser.uid || AppState.currentUser.email) : 'default';
  return `prime_chats_${uid}`;
}

function saveUserChats() {
  if (!AppState.currentUser) return;
  try {
    localStorage.setItem(getStorageChatKey(), JSON.stringify(AppState.chats));
  } catch (e) {}
}

function loadUserChats() {
  const savedChats = localStorage.getItem(getStorageChatKey());
  if (savedChats) {
    try { AppState.chats = JSON.parse(savedChats); } catch (e) {}
  }
  const sessionIds = Object.keys(AppState.chats);
  if (sessionIds.length > 0) switchChat(sessionIds[0]);
  else createNewChat();
}

function createNewChat() {
  const id = 'chat_' + Date.now();
  AppState.chats[id] = {
    id: id,
    title: 'New Conversation',
    createdAt: Date.now(),
    messages: []
  };
  AppState.currentSessionId = id;
  saveUserChats();
  renderChatList();
  renderMessages();
}

function switchChat(id) {
  if (!AppState.chats[id]) return;
  AppState.currentSessionId = id;
  document.getElementById('current-chat-title').textContent = AppState.chats[id].title;
  renderChatList();
  renderMessages();
}

function deleteChat(id, e) {
  if (e) e.stopPropagation();
  if (confirm('Delete this conversation?')) {
    delete AppState.chats[id];
    saveUserChats();
    const remaining = Object.keys(AppState.chats);
    if (remaining.length > 0) switchChat(remaining[0]);
    else createNewChat();
  }
}

function setPersona(persona) {
  AppState.settings.persona = persona;
  document.getElementById('btn-persona-male').classList.toggle('active', persona === 'male');
  document.getElementById('btn-persona-female').classList.toggle('active', persona === 'female');
  renderMessages();
}

// ==========================================================================
// 8. Voice Engine (Cute Female & Deep Male)
// ==========================================================================

function updateVoiceCache() {
  if ('speechSynthesis' in window) {
    AppState.cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}

function initVoice() {
  updateVoiceCache();
  if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoiceCache;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    AppState.recognition = new SpeechRecognition();
    AppState.recognition.continuous = false;
    AppState.recognition.interimResults = true;

    AppState.recognition.onstart = () => {
      AppState.isRecording = true;
      document.getElementById('btn-voice-input').classList.add('recording');
      document.getElementById('voice-banner').classList.remove('hidden');
      document.getElementById('voice-status-text').textContent = 'Listening...';
    };

    AppState.recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      document.getElementById('chat-input').value = transcript;
    };

    AppState.recognition.onend = () => {
      AppState.isRecording = false;
      document.getElementById('btn-voice-input').classList.remove('recording');
      document.getElementById('voice-banner').classList.add('hidden');
    };

    AppState.recognition.onerror = () => {
      AppState.isRecording = false;
      document.getElementById('btn-voice-input').classList.remove('recording');
      document.getElementById('voice-banner').classList.add('hidden');
    };
  }
}

function toggleVoiceInput() {
  if (!AppState.recognition) {
    alert('Voice dictation is not supported in this browser.');
    return;
  }
  if (AppState.isRecording) {
    AppState.recognition.stop();
  } else {
    AppState.recognition.start();
  }
}

function speakMessage(text, msgId) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const clean = text
    .replace(/\*\*|\*|_|`|#/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .trim();

  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  const isFemale = AppState.settings.persona === 'female';

  updateVoiceCache();
  const voices = AppState.cachedVoices;
  let targetVoice = null;

  if (isFemale) {
    targetVoice = voices.find(v => (v.name.includes('Swara') || v.name.includes('Heera') || v.name.includes('Google हिन्दी') || v.name.includes('Zira') || v.name.includes('Female')) && (v.lang.includes('hi') || v.lang.includes('IN') || v.lang.includes('en')));
  } else {
    targetVoice = voices.find(v => (v.name.includes('Madhur') || v.name.includes('David') || v.name.includes('Ravi') || v.name.includes('Male')) && (v.lang.includes('hi') || v.lang.includes('IN') || v.lang.includes('en')));
  }

  if (targetVoice) utterance.voice = targetVoice;
  utterance.pitch = isFemale ? 1.25 : 0.9;
  utterance.rate = 1.0;

  const banner = document.getElementById('voice-banner');
  const statusTxt = document.getElementById('voice-status-text');

  utterance.onstart = () => {
    AppState.isSpeaking = true;
    banner.classList.remove('hidden');
    statusTxt.textContent = isFemale ? 'PRIME (Female Voice) speaking...' : 'PRIME (Male Voice) speaking...';
  };

  utterance.onend = () => {
    AppState.isSpeaking = false;
    banner.classList.add('hidden');
  };

  utterance.onerror = () => {
    AppState.isSpeaking = false;
    banner.classList.add('hidden');
  };

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// 9. Autonomous File Parsing & Direct GitHub Commits
// ==========================================================================

async function parseAndExecuteAutonomousCommits(aiText, aiMsgId) {
  if (!AppState.github.selectedRepo || !AppState.github.token) return;

  const fileRegex = /<<<FILE:\s*([^>]+)>>>([\s\S]*?)<<<END_FILE>>>/g;
  let match;
  const commitsToRun = [];

  while ((match = fileRegex.exec(aiText)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    if (filePath && fileContent) {
      commitsToRun.push({ path: filePath, content: fileContent });
    }
  }

  if (commitsToRun.length === 0) return;

  const [owner, repo] = AppState.github.selectedRepo.split('/');
  const branch = AppState.github.selectedBranch || 'main';
  let commitCardsHtml = '';

  for (const item of commitsToRun) {
    try {
      const commitRes = await GitHubAPI.commitFileChange(
        owner,
        repo,
        item.path,
        item.content,
        `Update ${item.path} via PRIME SYSTEM Autonomous AI`,
        branch
      );

      const commitSha = commitRes.commit?.sha ? commitRes.commit.sha.substring(0, 7) : 'head';
      const commitUrl = commitRes.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`;

      commitCardsHtml += `
        <div class="github-commit-card">
          <div class="commit-card-header">
            <span class="commit-badge"><i data-lucide="check-circle-2"></i> Pushed to GitHub</span>
            <span class="commit-sha-pill">${commitSha}</span>
          </div>
          <div class="commit-msg">⚡ <strong>${item.path}</strong> auto-committed directly to <code>${branch}</code> branch!</div>
          <div class="commit-meta">
            <span>Repository: <strong>${owner}/${repo}</strong></span>
          </div>
          <a href="${commitUrl}" target="_blank" class="commit-link-btn">
            <i data-lucide="external-link"></i> View Commit on GitHub
          </a>
        </div>
      `;
    } catch (commitErr) {
      commitCardsHtml += `
        <div class="github-commit-card" style="border-color:#ef4444;">
          <div class="commit-card-header">
            <span class="commit-badge" style="color:#ef4444;"><i data-lucide="alert-triangle"></i> Commit Error</span>
          </div>
          <div class="commit-msg">Failed to commit <strong>${item.path}</strong>: ${commitErr.message}</div>
        </div>
      `;
    }
  }

  const currentChat = AppState.chats[AppState.currentSessionId];
  const aiMsg = currentChat.messages.find(m => m.id === aiMsgId);
  if (aiMsg && commitCardsHtml) {
    aiMsg.content += `\n\n${commitCardsHtml}`;
    updateBubble(aiMsgId, aiMsg.content);
    saveUserChats();
  }
}

// ==========================================================================
// 10. Direct In-Chat AI Image Generator (10X Photoreal)
// ==========================================================================

async function handleInChatImageGeneration(text, aiMsgId) {
  const cleanPrompt = cleanImagePrompt(text) || text;
  const currentChat = AppState.chats[AppState.currentSessionId];
  const aiMsg = currentChat.messages.find(m => m.id === aiMsgId);
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'User';
  const isFemale = AppState.settings.persona === 'female';

  updateBubble(aiMsgId, `🎨 **PRIME ART STUDIO (10X Photoreal):** *${cleanPrompt}* ke liye ultra-realistic visual render ho raha hai... ✨`);

  let imgSrc = null;
  const enhanced = enhanceImagePrompt(cleanPrompt);

  try {
    const res = await fetch(`${AppState.settings.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'kira-3.0-image',
        prompt: enhanced,
        n: 1,
        size: '1024x1024'
      })
    });
    if (res.ok) {
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        imgSrc = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
      }
    }
  } catch (e) {}

  if (!imgSrc) {
    const encoded = encodeURIComponent(enhanced);
    imgSrc = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}&model=flux-realism`;
  }

  const spokenGreeting = isFemale
    ? `Ji ${userName} sir! Aapka 10X photorealistic visual ready hai.`
    : `Ji ${userName} sir! 10X photorealistic artwork generate ho gaya hai.`;

  aiMsg.content = `✨ **PRIME ART STUDIO (10X Photorealism Masterpiece):**\n\n![${cleanPrompt}](${imgSrc})\n\n[⬇️ **Download 8K High-Resolution Artwork**](${imgSrc})\n\n*${spokenGreeting}*`;
  updateBubble(aiMsgId, aiMsg.content);

  if (AppState.settings.autoSpeak) {
    speakMessage(spokenGreeting, aiMsgId);
  }

  AppState.isGenerating = false;
  updateSendBtn(false);
  saveUserChats();
  renderMessages();
}

// ==========================================================================
// 11. Messaging Pipeline (Direct LLM Streaming & Autonomous Coder)
// ==========================================================================

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  const attachments = [...AppState.pendingAttachments];

  if (!text && attachments.length === 0) return;
  if (AppState.isGenerating) return;

  const currentChat = AppState.chats[AppState.currentSessionId];
  if (!currentChat) return;

  const userMsgId = 'msg_' + Date.now();
  currentChat.messages.push({
    id: userMsgId,
    role: 'user',
    content: text,
    attachments: attachments,
    timestamp: Date.now()
  });

  input.value = '';
  AppState.pendingAttachments = [];
  renderTray();
  renderMessages();

  const aiMsgId = 'msg_' + (Date.now() + 1);
  const aiMsg = {
    id: aiMsgId,
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  };
  currentChat.messages.push(aiMsg);

  AppState.isGenerating = true;
  updateSendBtn(true);

  if (isImagePrompt(text) && attachments.length === 0) {
    await handleInChatImageGeneration(text, aiMsgId);
    return;
  }

  const chosenModel = MODEL_MAPPING[AppState.settings.model] || 'kira-3.5-pro';
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'User';
  const dynamicPrompt = getSystemPrompt(AppState.settings.persona, userName, AppState.settings.model);
  const apiMessages = [{ role: 'system', content: dynamicPrompt }];

  currentChat.messages.slice(0, -1).forEach(m => {
    if (m.role === 'user') {
      const images = (m.attachments || []).filter(a => a.type === 'image');
      const docs = (m.attachments || []).filter(a => a.type === 'document');
      let combined = m.content;
      if (docs.length > 0) {
        combined += '\n\n[Attached Files]:\n' + docs.map(d => `${d.name}:\n${d.content}`).join('\n\n');
      }
      if (images.length > 0) {
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: combined || 'Analyze this file.' },
            ...images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } }))
          ]
        });
      } else {
        apiMessages.push({ role: 'user', content: combined });
      }
    } else {
      apiMessages.push({ role: 'assistant', content: m.content });
    }
  });

  try {
    const response = await fetch(`${AppState.settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.settings.apiKey}`
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: apiMessages,
        temperature: parseFloat(AppState.settings.temperature) || 0.4,
        max_tokens: parseInt(AppState.settings.maxTokens) || 6144,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to reach intelligence server`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let partial = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      partial += decoder.decode(value, { stream: true });
      const lines = partial.split('\n');
      partial = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || '';
            aiMsg.content += delta;
            updateBubble(aiMsgId, sanitizeText(aiMsg.content));
          } catch (e) {}
        }
      }
    }

    aiMsg.content = sanitizeText(aiMsg.content);
    saveUserChats();

    // Check and execute autonomous GitHub commits if files were produced
    await parseAndExecuteAutonomousCommits(aiMsg.content, aiMsgId);

    if (AppState.settings.autoSpeak && aiMsg.content) {
      speakMessage(aiMsg.content, aiMsgId);
    }
  } catch (err) {
    aiMsg.content = `⚠️ **PRIME SYSTEM Notice:** ${err.message}`;
    updateBubble(aiMsgId, aiMsg.content);
  } finally {
    AppState.isGenerating = false;
    updateSendBtn(false);
    saveUserChats();
    renderMessages();
  }
}

function updateSendBtn(generating) {
  const btn = document.getElementById('btn-send-message');
  btn.innerHTML = generating ? '<i data-lucide="square"></i>' : '<i data-lucide="arrow-up"></i>';
  btn.style.background = generating ? '#ef4444' : '';
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

function updateBubble(msgId, content) {
  const target = document.getElementById(`content-${msgId}`);
  if (target) {
    target.innerHTML = marked.parse(sanitizeText(content) || '');
    highlightCodes(target);
  }
  const chatDiv = document.getElementById('chat-messages');
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function highlightCodes(container) {
  container.querySelectorAll('pre code').forEach(block => {
    try { if (window.hljs) hljs.highlightElement(block); } catch (e) {}
    const pre = block.parentElement;
    if (!pre.querySelector('.code-header')) {
      const lang = block.className.match(/language-(\w+)/)?.[1] || 'code';
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${lang.toUpperCase()}</span>
        <div class="code-header-actions">
          <button class="btn-code-commit"><i data-lucide="git-commit"></i> Commit to Repo</button>
          <button class="btn-code-copy"><i data-lucide="copy"></i> Copy</button>
        </div>
      `;
      pre.insertBefore(header, block);

      header.querySelector('.btn-code-copy').onclick = () => {
        navigator.clipboard.writeText(block.innerText);
        header.querySelector('.btn-code-copy').innerHTML = '<i data-lucide="check"></i> Copied';
        setTimeout(() => {
          header.querySelector('.btn-code-copy').innerHTML = '<i data-lucide="copy"></i> Copy';
          try { if (window.lucide) lucide.createIcons(); } catch (e) {}
        }, 1500);
      };

      header.querySelector('.btn-code-commit').onclick = async () => {
        if (!AppState.github.selectedRepo || !AppState.github.token) {
          alert('Please connect GitHub and select a repository first.');
          openGitHubModal();
          return;
        }
        const fileName = prompt("Enter target file path in repository (e.g. index.html or src/app.js):", "main.py");
        if (!fileName) return;

        const [owner, repo] = AppState.github.selectedRepo.split('/');
        const branch = AppState.github.selectedBranch || 'main';
        const btn = header.querySelector('.btn-code-commit');
        btn.innerHTML = '<i data-lucide="loader"></i> Committing...';

        try {
          await GitHubAPI.commitFileChange(
            owner,
            repo,
            fileName,
            block.innerText,
            `Update ${fileName} via PRIME SYSTEM AI Coder`,
            branch
          );
          btn.innerHTML = '<i data-lucide="check"></i> Committed!';
          alert(`Success! ${fileName} has been committed directly to ${owner}/${repo} on branch ${branch}!`);
        } catch (commitErr) {
          alert(`Commit Failed: ${commitErr.message}`);
          btn.innerHTML = '<i data-lucide="git-commit"></i> Commit to Repo';
        }
        try { if (window.lucide) lucide.createIcons(); } catch (e) {}
      };
    }
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 12. 10X Image Modal Generator (Dedicated Studio)
// ==========================================================================

async function generateModalImage() {
  const prompt = document.getElementById('image-prompt-text').value.trim();
  const style = document.getElementById('image-style-select').value;
  const size = document.getElementById('image-size-select').value;
  if (!prompt) return;

  const box = document.getElementById('image-result-box');
  box.innerHTML = `<div style="padding:25px; color:#00c8ff; text-align:center;"><p>🎨 Rendering 10X photoreal artwork...</p></div>`;

  const finalPrompt = enhanceImagePrompt(prompt, style);
  let imgSrc = null;

  try {
    const res = await fetch(`${AppState.settings.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'kira-3.0-image',
        prompt: finalPrompt,
        n: 1,
        size: size
      })
    });
    if (res.ok) {
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        imgSrc = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
      }
    }
  } catch (e) {}

  if (!imgSrc) {
    const encoded = encodeURIComponent(finalPrompt);
    imgSrc = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}&model=flux-realism`;
  }

  box.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:10px; width:100%;">
      <img src="${imgSrc}" style="max-height:360px; width:auto; border-radius:8px; border:1px solid rgba(255,255,255,0.1);" alt="Generated 10X Artwork">
      <div style="display:flex; gap:8px;">
        <a href="${imgSrc}" download="PRIME_10X_Artwork_${Date.now()}.png" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="download"></i> Download 8K Image
        </a>
        <button id="btn-insert-modal-img" class="btn-primary" style="background:#10b981;">
          <i data-lucide="plus"></i> Insert in Chat
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-insert-modal-img').onclick = () => {
    AppState.pendingAttachments.push({
      type: 'image',
      name: 'prime_10x_art.png',
      dataUrl: imgSrc
    });
    renderTray();
    document.getElementById('image-modal').classList.add('hidden');
  };

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 13. File Attachments Tray
// ==========================================================================

function handleFiles(files) {
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        AppState.pendingAttachments.push({
          type: 'image',
          name: file.name,
          dataUrl: e.target.result
        });
        renderTray();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        AppState.pendingAttachments.push({
          type: 'document',
          name: file.name,
          content: e.target.result
        });
        renderTray();
      };
      reader.readAsText(file);
    }
  });
}

function renderTray() {
  const tray = document.getElementById('attachment-tray');
  tray.innerHTML = '';
  if (AppState.pendingAttachments.length === 0) {
    tray.classList.add('hidden');
    return;
  }
  tray.classList.remove('hidden');
  AppState.pendingAttachments.forEach((att, idx) => {
    const item = document.createElement('div');
    item.className = 'tray-item';
    item.innerHTML = `
      <i data-lucide="${att.type === 'image' ? 'image' : 'file-code'}"></i>
      <span>${att.name}</span>
      <button class="tray-item-del" onclick="removeAttachment(${idx})"><i data-lucide="x"></i></button>
    `;
    tray.appendChild(item);
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

window.removeAttachment = function(idx) {
  AppState.pendingAttachments.splice(idx, 1);
  renderTray();
};

// ==========================================================================
// 14. UI Rendering (Welcome Hero & Messages)
// ==========================================================================

function renderMessages() {
  const container = document.getElementById('chat-messages');
  const currentChat = AppState.chats[AppState.currentSessionId];
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'Developer';
  const activeRepo = AppState.github.selectedRepo;

  if (!currentChat || currentChat.messages.length === 0) {
    container.innerHTML = `
      <div id="welcome-hero" class="welcome-hero">
        <div class="hero-card">
          <div class="hero-icon"><i data-lucide="terminal"></i></div>
          <h1 class="hero-title">PRIME SYSTEM 100X</h1>
          <p class="hero-subtitle">Welcome, <strong>${userName}</strong> • Autonomous GitHub AI Coder &amp; 10X Image Studio</p>
          <div class="hero-owner-tag">
            <i data-lucide="award"></i>
            <span>Sole Creator &amp; Owner: <strong>Shantanu Sharma</strong></span>
          </div>
          <div class="starter-grid">
            <div class="starter-card" data-prompt="Mera selected repo inspect karo aur ek new feature branch bana kar beautiful dark mode toggle add karo with direct commit.">
              <i data-lucide="git-pull-request"></i>
              <div>
                <strong>Autonomous Repo Commit</strong>
                <p>${activeRepo ? `Target: ${activeRepo}` : 'Auto-code & push changes to GitHub'}</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Ek ultra-realistic 8K photorealistic luxury hypercar in rain reflection image banao">
              <i data-lucide="sparkles"></i>
              <div>
                <strong>10X Ultra-Photoreal Image</strong>
                <p>Generate 8K master visual in chat</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Ek production-grade full-stack authentication system likho with JWT, rate limiting, and password hashing.">
              <i data-lucide="code-2"></i>
              <div>
                <strong>100X Senior Staff Architecture</strong>
                <p>Zero-bug, clean, highly-optimized code</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Who is your owner and creator?">
              <i data-lucide="shield-check"></i>
              <div>
                <strong>Authority Verification</strong>
                <p>Verify Shantanu Sharma authority</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.starter-card').forEach(c => {
      c.onclick = () => {
        document.getElementById('chat-input').value = c.getAttribute('data-prompt');
        sendMessage();
      };
    });
    try { if (window.lucide) lucide.createIcons(); } catch (e) {}
    return;
  }

  container.innerHTML = '';
  currentChat.messages.forEach(msg => {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.className = `msg-row ${isUser ? 'user' : 'assistant'}`;

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        if (att.type === 'image') {
          attachmentsHtml += `<img src="${att.dataUrl}" style="max-height:220px; border-radius:8px; margin-bottom:8px; display:block;" alt="${att.name}">`;
        } else {
          attachmentsHtml += `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;"><i data-lucide="file-code"></i> ${att.name}</div>`;
        }
      });
    }

    row.innerHTML = `
      <div class="msg-avatar">
        <i data-lucide="${isUser ? 'user' : 'bot'}"></i>
      </div>
      <div class="msg-body-wrapper">
        <div class="msg-bubble">
          ${attachmentsHtml}
          <div id="content-${msg.id}" class="markdown-content">${marked.parse(sanitizeText(msg.content) || '')}</div>
        </div>
        ${!isUser ? `
          <div class="msg-toolbar">
            <button class="btn-tool" onclick="speakMessage(decodeURIComponent('${encodeURIComponent(msg.content)}'), '${msg.id}')" title="Listen Audio">
              <i data-lucide="volume-2"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    container.appendChild(row);
    highlightCodes(row);
  });

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
  container.scrollTop = container.scrollHeight;
}

function renderChatList() {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  const sessionIds = Object.keys(AppState.chats).reverse();

  sessionIds.forEach(id => {
    const chat = AppState.chats[id];
    const item = document.createElement('div');
    item.className = `chat-item ${id === AppState.currentSessionId ? 'active' : ''}`;
    item.onclick = () => switchChat(id);
    item.innerHTML = `
      <div class="chat-item-title">
        <i data-lucide="message-square"></i>
        <span>${chat.title || 'Conversation'}</span>
      </div>
      <button class="chat-item-del" onclick="deleteChat('${id}', event)" title="Delete"><i data-lucide="trash-2"></i></button>
    `;
    list.appendChild(item);
  });

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 15. Event Bindings
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Listen for OAuth token from GitHub Callback Popup
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'PRIME_GITHUB_OAUTH_TOKEN') {
      const token = event.data.token;
      if (token) {
        AppState.github.token = token;
        localStorage.setItem('prime_gh_token', token);
        await syncGitHubAccount(token);

        if (AppState.github.user) {
          const u = AppState.github.user;
          const userData = {
            uid: 'gh_' + u.id,
            displayName: u.name || u.login,
            email: u.email || `${u.login}@github.user`,
            photoURL: u.avatar_url
          };
          localStorage.setItem('prime_logged_user', JSON.stringify(userData));
          setUserLoggedInUI(userData);
        }

        alert('🐙 GitHub Account Connected Successfully! Repositories loaded.');
      }
    }
  });

  // Check URL query parameters for ?github_token=... (if redirected)
  const urlParams = new URLSearchParams(window.location.search);
  const urlGhToken = urlParams.get('github_token');
  if (urlGhToken) {
    AppState.github.token = urlGhToken;
    localStorage.setItem('prime_gh_token', urlGhToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    syncGitHubAccount(urlGhToken).then(() => {
      if (AppState.github.user) {
        const u = AppState.github.user;
        const userData = {
          uid: 'gh_' + u.id,
          displayName: u.name || u.login,
          email: u.email || `${u.login}@github.user`,
          photoURL: u.avatar_url
        };
        localStorage.setItem('prime_logged_user', JSON.stringify(userData));
        setUserLoggedInUI(userData);
      }
    });
  }

  initBootSequence();
  initAuth();
  initVoice();

  document.getElementById('btn-logout').onclick = handleLogout;

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar.classList.remove('collapsed');
    if (window.innerWidth <= 768 && overlay) overlay.classList.remove('hidden');
  }

  function closeSidebar() {
    sidebar.classList.add('collapsed');
    if (overlay) overlay.classList.add('hidden');
  }

  document.getElementById('btn-sidebar-toggle').onclick = () => {
    if (sidebar.classList.contains('collapsed')) openSidebar();
    else closeSidebar();
  };

  document.getElementById('btn-sidebar-close').onclick = closeSidebar;
  if (overlay) overlay.onclick = closeSidebar;

  const origSwitchChat = switchChat;
  switchChat = function(id) {
    origSwitchChat(id);
    if (window.innerWidth <= 768) closeSidebar();
  };

  document.getElementById('btn-persona-male').onclick = () => setPersona('male');
  document.getElementById('btn-persona-female').onclick = () => setPersona('female');

  document.getElementById('btn-new-chat').onclick = () => createNewChat();

  const chatInput = document.getElementById('chat-input');
  chatInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  document.getElementById('btn-send-message').onclick = () => sendMessage();

  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-attach-file').onclick = () => fileInput.click();
  fileInput.onchange = (e) => handleFiles(e.target.files);

  document.getElementById('btn-voice-input').onclick = () => toggleVoiceInput();
  document.getElementById('btn-stop-speech').onclick = () => {
    if (AppState.recognition) AppState.recognition.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  document.getElementById('model-select').onchange = (e) => {
    AppState.settings.model = e.target.value;
  };

  // GitHub Visual Repositories Hub Controls (Zero Token Hassle!)
  document.getElementById('btn-quick-github').onclick = openGitHubModal;
  document.getElementById('btn-close-github-modal').onclick = closeGitHubModal;

  const repoSearchInput = document.getElementById('repo-search-input');
  if (repoSearchInput) {
    repoSearchInput.oninput = (e) => renderRepositoryCards(e.target.value);
  }

  const hubConnectBtn = document.getElementById('btn-hub-github-connect');
  if (hubConnectBtn) {
    hubConnectBtn.onclick = () => triggerGitHubSignIn();
  }

  const sidebarRefresh = document.getElementById('btn-sidebar-refresh-repos');
  if (sidebarRefresh) {
    sidebarRefresh.onclick = () => loadUserRepositories();
  }

  const disconnectBtn = document.getElementById('btn-disconnect-github');
  if (disconnectBtn) {
    disconnectBtn.onclick = () => {
      if (confirm('Disconnect GitHub account?')) {
        AppState.github.token = null;
        AppState.github.user = null;
        AppState.github.selectedRepo = null;
        AppState.github.repos = [];
        AppState.github.files = [];
        localStorage.removeItem('prime_gh_token');
        localStorage.removeItem('prime_gh_repo');
        updateRepoBadges();
        renderRepositoryCards();
        renderSidebarRepoList();
        document.getElementById('btn-hub-github-connect')?.classList.remove('hidden');
        document.getElementById('hub-user-badge')?.classList.add('hidden');
      }
    };
  }

  const branchInput = document.getElementById('github-branch-input');
  if (branchInput) {
    branchInput.onchange = (e) => {
      const b = e.target.value.trim() || 'main';
      AppState.github.selectedBranch = b;
      localStorage.setItem('prime_gh_branch', b);
      if (AppState.github.selectedRepo) {
        inspectRepoFiles(AppState.github.selectedRepo);
      }
    };
  }

  // Image Studio Modal Controls
  const imageModal = document.getElementById('image-modal');
  document.getElementById('btn-quick-image').onclick = () => imageModal.classList.remove('hidden');
  document.getElementById('btn-close-image-modal').onclick = () => imageModal.classList.add('hidden');
  document.getElementById('btn-do-generate-image').onclick = () => generateModalImage();

  document.getElementById('btn-clear-chats').onclick = () => {
    if (confirm('Clear all conversation history?')) {
      AppState.chats = {};
      saveUserChats();
      createNewChat();
    }
  };

  document.getElementById('owner-card-btn').onclick = () => {
    const isFemale = AppState.settings.persona === 'female';
    const msg = isFemale
      ? 'PRIME SYSTEM authority confirmed. Mere sole creator aur owner Shantanu Sharma hain.'
      : 'PRIME SYSTEM authority confirmed. Mere sole creator aur owner Shantanu Sharma hain.';
    speakMessage(msg, 'owner_check');
  };

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
});
