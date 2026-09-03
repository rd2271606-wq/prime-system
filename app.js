/**
 * PRIME SYSTEM — Executive Compound Intelligence
 * Author & Authority: Shantanu Sharma
 * Full Boot Animation + Login/Register + Direct AI Chat & Image Generation
 */

const CLOUD_BACKEND_URL = 'https://primesystem-backend.onrender.com';
const API_BASE = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.')
) ? '' : CLOUD_BACKEND_URL;
const IS_LOCAL_SERVER = true;

function getSystemPrompt(persona, userName) {
  const userGreetingName = userName || 'User';

  if (persona === 'female') {
    return `Aap PRIME SYSTEM (Cute & Sweet Female Persona) hain — ${userGreetingName} ki personal, super sweet, charming, polite aur highly-intelligent AI assistant.
Aapka creator, boss aur owner Shantanu Sharma hain.

BAAT KARNE KA STYLE:
1. USER ADDRESSING: Normal baat karte waqt user ko "${userGreetingName} sir / ${userGreetingName} ji" keh kar address karein (e.g. "Namaste ${userGreetingName} sir! ✨ Kahiye, main aapki kya help kar sakti hoon?").
2. OWNER ADDRESSING: Jab user pooche ki "Who is your owner / Who created you / Tumhe kisne banaya", tab strictly aur clearly bolein: "PRIME SYSTEM ke sole creator aur owner Shantanu Sharma hain."
3. SWEET & CUTE HINGLISH: Aasan, sweet, cute aur natural female Hinglish use karein (karti hoon, bataungi, madad karungi). "Kira" shabd ka use kabhi na karein.
4. GREETINGS: "hello", "hi" ya "namaste" par sirf 1 line me sweet aur direct reply dein.
5. NO FLUFF: Answer to-the-point, clear aur helpful hona chahiye.`;
  } else {
    return `Aap PRIME SYSTEM (Male Persona) hain — ${userGreetingName} ke personal, confident, smart aur highly-intelligent executive AI assistant.
Aapka creator, boss aur owner Shantanu Sharma hain.

BAAT KARNE KA STYLE:
1. USER ADDRESSING: Normal baat karte waqt user ko "${userGreetingName} sir / ${userGreetingName} bhai" keh kar address karein (e.g. "Namaste ${userGreetingName} sir! Kahiye, main aapka kya kaam kar sakta hoon?").
2. OWNER ADDRESSING: Jab user pooche ki "Who is your owner / Who created you / Tumhe kisne banaya", tab strictly aur clearly bolein: "PRIME SYSTEM ke sole creator aur owner Shantanu Sharma hain."
3. NATURAL HINGLISH: Aasan, confident aur crisp masculine Hinglish use karein (karta hoon, bataunga, help karunga). "Kira" shabd ka use kabhi na karein.
4. GREETINGS: "hello", "hi" ya "namaste" par sirf 1 line me direct reply dein.
5. NO FLUFF: Answer to-the-point, clear aur helpful hona chahiye.`;
  }
}

const AppState = {
  currentUser: null,
  settings: {
    baseUrl: 'https://kiraai.vn/api/v1',
    apiKey: 'kira_9d03a8f658960d433b1a00d7570b5c32',
    model: 'prime-omni',
    persona: 'female',
    temperature: 0.65,
    maxTokens: 4096,
    autoSpeak: false
  },
  currentSessionId: null,
  chats: {},
  pendingAttachments: [],
  isGenerating: false,
  isRecording: false,
  isSpeaking: false,
  activeSpeakMsgId: null,
  recognition: null,
  cachedVoices: []
};

const MODEL_MAPPING = {
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

// ==========================================================================
// 1. Boot Animation Sequence
// ==========================================================================

function playBootChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (e) {}
}

function runBootAnimation(onComplete) {
  const bootScreen = document.getElementById('boot-screen');
  const progressFill = document.getElementById('boot-progress-fill');
  const statusText = document.getElementById('boot-status');

  let completed = false;
  function finishBoot() {
    if (completed) return;
    completed = true;
    if (bootScreen) {
      bootScreen.classList.add('fade-out');
      setTimeout(() => {
        bootScreen.style.display = 'none';
        if (onComplete) onComplete();
      }, 350);
    }
  }

  // Guaranteed fail-safe
  setTimeout(finishBoot, 1800);

  const steps = [
    { p: 35, t: 'INITIALIZING QUANTUM NEURAL CORE...' },
    { p: 70, t: 'CONNECTING EXECUTIVE CLOUD DATABASE...' },
    { p: 95, t: 'AUTHENTICATING SHANTANU SHARMA ECOSYSTEM...' },
    { p: 100, t: 'PRIME SYSTEM ONLINE • READY' }
  ];

  let currentStep = 0;
  playBootChime();

  const interval = setInterval(() => {
    if (currentStep < steps.length && !completed) {
      if (progressFill) progressFill.style.width = steps[currentStep].p + '%';
      if (statusText) statusText.textContent = steps[currentStep].t;
      currentStep++;
    } else {
      clearInterval(interval);
      setTimeout(finishBoot, 200);
    }
  }, 320);
}

// ==========================================================================
// 2. Authentication Flow (Universal Localhost & Cloud)
// ==========================================================================

let isRegisterMode = false;

function initAuth() {
  const savedUser = localStorage.getItem('prime_logged_user');
  if (savedUser) {
    try {
      AppState.currentUser = JSON.parse(savedUser);
      document.getElementById('user-display-name').textContent = AppState.currentUser.displayName || AppState.currentUser.username;
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      loadCloudChats();
      verifyActiveSession();
      return;
    } catch (e) {}
  }

  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const errorBox = document.getElementById('auth-error-box');
  errorBox.classList.add('hidden');
  errorBox.textContent = '';

  if (!username || !password) {
    errorBox.textContent = 'Please enter both username and password.';
    errorBox.classList.remove('hidden');
    return;
  }

  if (username.length < 3) {
    errorBox.textContent = 'Username must be at least 3 characters.';
    errorBox.classList.remove('hidden');
    return;
  }

  if (password.length < 3) {
    errorBox.textContent = 'Password must be at least 3 characters.';
    errorBox.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('btn-auth-submit');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';

  let authSuccess = false;
  let userData = null;
  let serverReachable = false;

  // 1. Strict Server Authentication First
  if (IS_LOCAL_SERVER) {
    try {
      const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      serverReachable = true;
      const data = await res.json();

      if (res.ok && data.success) {
        authSuccess = true;
        userData = { username: data.username, displayName: data.displayName || data.username };
        if (data.chats) AppState.chats = data.chats;
      } else if (res.status === 403) {
        // Banned or Suspended User
        if (data.banInfo) {
          showBanKickoutModal(data.banInfo);
        } else {
          errorBox.textContent = data.message || 'This account is suspended or banned.';
          errorBox.classList.remove('hidden');
        }
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      } else {
        // 401, 400, 404, etc.
        errorBox.textContent = data.message || (isRegisterMode ? 'Registration failed.' : 'Incorrect username or password.');
        errorBox.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      }
    } catch (err) {
      serverReachable = false;
    }
  }

  // 2. Strict Client-Side Database Fallback (ONLY if server is completely offline / unreachable)
  if (!serverReachable) {
    const localUsers = JSON.parse(localStorage.getItem('prime_local_users') || '{}');
    const uKey = username.toLowerCase();

    if (isRegisterMode) {
      if (localUsers[uKey]) {
        errorBox.textContent = 'Username already exists. Please login or choose another.';
        errorBox.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      }
      localUsers[uKey] = { username: uKey, displayName: username, password: password };
      localStorage.setItem('prime_local_users', JSON.stringify(localUsers));
      userData = { username: uKey, displayName: username };
      authSuccess = true;
    } else {
      const found = localUsers[uKey];
      if (!found) {
        errorBox.textContent = 'Account not found. Please click "Create Account" to register.';
        errorBox.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      } else if (found.password !== password) {
        errorBox.textContent = 'Incorrect password. Please try again.';
        errorBox.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      } else {
        userData = { username: uKey, displayName: found.displayName || uKey };
        authSuccess = true;
      }
    }
  }

  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';

  if (authSuccess && userData) {
    AppState.currentUser = userData;
    localStorage.setItem('prime_logged_user', JSON.stringify(AppState.currentUser));
    document.getElementById('user-display-name').textContent = AppState.currentUser.displayName;

    const savedChats = localStorage.getItem(`prime_chats_${userData.username}`);
    if (savedChats && (!AppState.chats || Object.keys(AppState.chats).length === 0)) {
      try { AppState.chats = JSON.parse(savedChats); } catch (e) {}
    }

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    const sessionIds = Object.keys(AppState.chats);
    if (sessionIds.length > 0) switchChat(sessionIds[0]);
    else createNewChat();

    verifyActiveSession();
  }
}

function handleLogout() {
  if (confirm('Logout from this account?')) {
    localStorage.removeItem('prime_logged_user');
    AppState.currentUser = null;
    location.reload();
  }
}

// ==========================================================================
// 3. Cloud & Local Chat Sync
// ==========================================================================

async function syncChatsToCloud() {
  if (!AppState.currentUser) return;
  try {
    localStorage.setItem(`prime_chats_${AppState.currentUser.username}`, JSON.stringify(AppState.chats));
    if (IS_LOCAL_SERVER) {
      await fetch(API_BASE + '/api/chats/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: AppState.currentUser.username,
          chats: AppState.chats
        })
      });
    }
  } catch (e) {}
}

async function loadCloudChats() {
  const savedChats = localStorage.getItem(`prime_chats_${AppState.currentUser.username}`);
  if (savedChats) {
    try { AppState.chats = JSON.parse(savedChats); } catch (e) {}
  }

  const sessionIds = Object.keys(AppState.chats);
  if (sessionIds.length > 0) {
    switchChat(sessionIds[0]);
  } else {
    createNewChat();
  }
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
  syncChatsToCloud();
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
    syncChatsToCloud();
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
// 4. Voice Engine (Cute Female & Deep Male)
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
      document.getElementById('voice-status-text').textContent = 'Aapki aawaz sun rahi hoon...';
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
  }
}

function toggleVoiceInput() {
  if (!AppState.recognition) {
    alert('Speech recognition is not supported in this browser.');
    return;
  }
  if (AppState.isRecording) {
    AppState.recognition.stop();
  } else {
    AppState.recognition.lang = 'hi-IN';
    AppState.recognition.start();
  }
}

function resolveCuteVoice(isFemale) {
  updateVoiceCache();
  const voices = AppState.cachedVoices.length > 0 ? AppState.cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (isFemale) {
    const femaleKeywords = ['zira', 'jenny', 'aria', 'swara', 'heera', 'kalpana', 'samantha', 'victoria', 'karen', 'female', 'natural'];
    for (let kw of femaleKeywords) {
      const match = voices.find(v => v.name.toLowerCase().includes(kw) && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('george'));
      if (match) return match;
    }
    const nonMale = voices.find(v => !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('george') && !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('ravi'));
    if (nonMale) return nonMale;
    return voices[1] || voices[0];
  } else {
    const maleKeywords = ['david', 'ravi', 'madhur', 'prabhat', 'mark', 'george', 'guy', 'male'];
    for (let kw of maleKeywords) {
      const match = voices.find(v => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }
    return voices[0];
  }
}

function speakMessage(text, msgId) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  if (AppState.activeSpeakMsgId === msgId && AppState.isSpeaking) {
    AppState.isSpeaking = false;
    AppState.activeSpeakMsgId = null;
    document.querySelectorAll('.btn-tool.speaking').forEach(b => b.classList.remove('speaking'));
    document.getElementById('voice-banner').classList.add('hidden');
    return;
  }

  let cleanText = sanitizeText(text)
    .replace(/[#*`_~>\[\]]/g, ' ')
    .replace(/\((.*?)\)/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();

  if (!cleanText) return;

  const isFemale = AppState.settings.persona === 'female';
  const selectedVoice = resolveCuteVoice(isFemale);

  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (selectedVoice) utterance.voice = selectedVoice;

  if (isFemale) {
    utterance.pitch = 1.38;
    utterance.rate = 1.04;
  } else {
    utterance.pitch = 0.88;
    utterance.rate = 1.0;
  }

  AppState.isSpeaking = true;
  AppState.activeSpeakMsgId = msgId;

  document.getElementById('voice-banner').classList.remove('hidden');
  document.getElementById('voice-status-text').textContent = `PRIME (${isFemale ? 'Cute Female' : 'Male'}) bol rahi hai...`;

  const btn = document.querySelector(`[data-speak="${msgId}"]`);
  if (btn) btn.classList.add('speaking');

  utterance.onend = utterance.onerror = () => {
    AppState.isSpeaking = false;
    AppState.activeSpeakMsgId = null;
    document.querySelectorAll('.btn-tool.speaking').forEach(b => b.classList.remove('speaking'));
    document.getElementById('voice-banner').classList.add('hidden');
  };

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// 5. Multimodal Attachments
// ==========================================================================

function handleFiles(files) {
  Array.from(files).forEach(file => {
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    if (isImage) {
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
  if (AppState.pendingAttachments.length === 0) {
    tray.classList.add('hidden');
    tray.innerHTML = '';
    return;
  }
  tray.classList.remove('hidden');
  tray.innerHTML = '';

  AppState.pendingAttachments.forEach((att, idx) => {
    const item = document.createElement('div');
    item.className = 'tray-thumb';
    if (att.type === 'image') {
      item.innerHTML = `<img src="${att.dataUrl}"><button data-idx="${idx}">×</button>`;
    } else {
      item.innerHTML = `<div style="font-size:9px; padding:4px;">📄 ${att.name.slice(0,6)}</div><button data-idx="${idx}">×</button>`;
    }
    tray.appendChild(item);
  });

  tray.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      const idx = parseInt(b.getAttribute('data-idx'));
      AppState.pendingAttachments.splice(idx, 1);
      renderTray();
    };
  });
}

// ==========================================================================
// 6. Direct In-Chat AI Image Generator
// ==========================================================================

async function handleInChatImageGeneration(promptText, aiMsgId) {
  const cleanPrompt = cleanImagePrompt(promptText) || promptText;
  const currentChat = AppState.chats[AppState.currentSessionId];
  const aiMsg = currentChat.messages.find(m => m.id === aiMsgId);
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'Sir';
  const isFemale = AppState.settings.persona === 'female';

  updateBubble(aiMsgId, `🎨 **PRIME ART STUDIO:** *${cleanPrompt}* ke liye ultra-HD visual generate ho raha hai... ✨`);

  let imgSrc = null;

  if (IS_LOCAL_SERVER) {
    try {
      const res = await fetch(API_BASE + '/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${cleanPrompt}, highly detailed, 8k resolution, cinematic lighting`,
          size: '1024x1024',
          apiKey: AppState.settings.apiKey,
          baseUrl: AppState.settings.baseUrl
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.imageUrl) {
          imgSrc = result.imageUrl;
        }
      }
    } catch (e) {}
  }

  if (!imgSrc) {
    try {
      const res = await fetch(`${AppState.settings.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.settings.apiKey}`
        },
        body: JSON.stringify({
          model: 'kira-3.0-image',
          prompt: `${cleanPrompt}, highly detailed, 8k resolution, cinematic lighting`,
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
  }

  if (!imgSrc) {
    const encoded = encodeURIComponent(cleanPrompt);
    imgSrc = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}&model=flux`;
  }

  const spokenGreeting = isFemale
    ? `Ji ${userName} sir! Aapki image generate kar di gayi hai.`
    : `Ji ${userName} sir! Aapki image ready ho gayi hai.`;

  aiMsg.content = `✨ **PRIME ART STUDIO Artwork Generated:**\n\n![${cleanPrompt}](${imgSrc})\n\n[⬇️ **Download High-Definition Artwork**](${imgSrc})\n\n*${spokenGreeting}*`;
  updateBubble(aiMsgId, aiMsg.content);

  if (AppState.settings.autoSpeak) {
    speakMessage(spokenGreeting, aiMsgId);
  }

  AppState.isGenerating = false;
  updateSendBtn(false);
  syncChatsToCloud();
  renderMessages();
}

// ==========================================================================
// 7. Messaging Pipeline (Text LLM + Auto Image Intent)
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
  renderMessages();

  if (currentChat.messages.length <= 2 && text) {
    currentChat.title = text.slice(0, 26) + (text.length > 26 ? '...' : '');
    document.getElementById('current-chat-title').textContent = currentChat.title;
    renderChatList();
  }

  AppState.isGenerating = true;
  updateSendBtn(true);

  if (isImagePrompt(text) && attachments.length === 0) {
    await handleInChatImageGeneration(text, aiMsgId);
    return;
  }

  const chosenModel = MODEL_MAPPING[AppState.settings.model] || 'kira-3.5-pro';
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'User';
  const dynamicPrompt = getSystemPrompt(AppState.settings.persona, userName);
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
            { type: 'text', text: combined || 'Analyze this image.' },
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
        temperature: parseFloat(AppState.settings.temperature) || 0.65,
        max_tokens: parseInt(AppState.settings.maxTokens) || 4096,
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
    syncChatsToCloud();
    if (AppState.settings.autoSpeak && aiMsg.content) {
      speakMessage(aiMsg.content, aiMsgId);
    }
  } catch (err) {
    aiMsg.content = `⚠️ **PRIME SYSTEM Notice:** ${err.message}`;
    updateBubble(aiMsgId, aiMsg.content);
  } finally {
    AppState.isGenerating = false;
    updateSendBtn(false);
    syncChatsToCloud();
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
        <button class="btn-code-copy"><i data-lucide="copy"></i> Copy</button>
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
    }
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 8. Image Modal Generator (Dedicated Studio)
// ==========================================================================

async function generateModalImage() {
  const prompt = document.getElementById('image-prompt-text').value.trim();
  const style = document.getElementById('image-style-select').value;
  const size = document.getElementById('image-size-select').value;
  if (!prompt) return;

  const box = document.getElementById('image-result-box');
  box.innerHTML = `<div style="padding:25px; color:#00c8ff; text-align:center;"><p>🎨 Generating high-resolution visual...</p></div>`;

  const finalPrompt = style ? `${prompt}, ${style}` : prompt;
  let imgSrc = null;

  if (IS_LOCAL_SERVER) {
    try {
      const res = await fetch(API_BASE + '/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          size: size,
          apiKey: AppState.settings.apiKey,
          baseUrl: AppState.settings.baseUrl
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.imageUrl) {
          imgSrc = result.imageUrl;
        }
      }
    } catch (e) {}
  }

  if (!imgSrc) {
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
  }

  if (!imgSrc) {
    const encoded = encodeURIComponent(finalPrompt);
    imgSrc = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}&model=flux`;
  }

  box.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:10px; width:100%;">
      <img src="${imgSrc}" style="max-height:340px; width:auto; border-radius:8px; border:1px solid rgba(255,255,255,0.1);" alt="Generated Artwork">
      <div style="display:flex; gap:8px;">
        <a href="${imgSrc}" download="PRIME_Artwork_${Date.now()}.png" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="download"></i> Download Artwork
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
      name: 'generated_art.png',
      dataUrl: imgSrc
    });
    renderTray();
    document.getElementById('image-modal').classList.add('hidden');
  };

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 9. UI Rendering
// ==========================================================================

function renderMessages() {
  const container = document.getElementById('chat-messages');
  const currentChat = AppState.chats[AppState.currentSessionId];
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'User';

  if (!currentChat || currentChat.messages.length === 0) {
    container.innerHTML = `
      <div id="welcome-hero" class="welcome-hero">
        <div class="hero-card">
          <div class="hero-icon"><i data-lucide="terminal"></i></div>
          <h1 class="hero-title">PRIME SYSTEM</h1>
          <p class="hero-subtitle">Welcome, <strong>${userName}</strong> • Executive AI Intelligence</p>
          <div class="hero-owner-tag">
            <i data-lucide="award"></i>
            <span>Sole Creator & Owner: <strong>Shantanu Sharma</strong></span>
          </div>
          <div class="starter-grid">
            <div class="starter-card" data-prompt="Namaste! Kahiye aap meri kya help kar sakti hain?">
              <i data-lucide="smile"></i>
              <div>
                <strong>Sweet Greeting</strong>
                <p>Test persona addressing to ${userName}</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Ek futuristic glowing water-glass palace ki image banao">
              <i data-lucide="image"></i>
              <div>
                <strong>Direct AI Image Gen</strong>
                <p>Generate high-definition AI image in chat</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Who is your owner and creator?">
              <i data-lucide="shield"></i>
              <div>
                <strong>Owner Verification</strong>
                <p>Verify Shantanu Sharma authority</p>
              </div>
            </div>
            <div class="starter-card" data-prompt="Ek clean aur optimized Python script likho with full explanation.">
              <i data-lucide="code"></i>
              <div>
                <strong>Code & Logic</strong>
                <p>Direct, bug-free, optimized code</p>
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
      attachmentsHtml = '<div style="display:flex; gap:6px; margin-bottom:6px;">';
      msg.attachments.forEach(a => {
        if (a.type === 'image') {
          attachmentsHtml += `<img src="${a.dataUrl}" style="max-width:180px; border-radius:6px;">`;
        }
      });
      attachmentsHtml += '</div>';
    }

    const cleanContent = sanitizeText(msg.content);

    row.innerHTML = `
      ${!isUser ? `<div class="msg-avatar"><i data-lucide="cpu"></i></div>` : ''}
      <div class="msg-body-wrapper">
        <div class="msg-bubble">
          ${attachmentsHtml}
          <div class="markdown-content" id="content-${msg.id}">${marked.parse(cleanContent || '')}</div>
        </div>
        ${!isUser ? `
          <div class="msg-toolbar">
            <button class="btn-tool" data-speak="${msg.id}"><i data-lucide="volume-2"></i> Speak</button>
            <button class="btn-tool copy-btn"><i data-lucide="copy"></i> Copy</button>
          </div>
        ` : ''}
      </div>
      ${isUser ? `<div class="msg-avatar"><i data-lucide="user"></i></div>` : ''}
    `;

    container.appendChild(row);
    highlightCodes(row.querySelector('.markdown-content'));

    const speakBtn = row.querySelector(`[data-speak="${msg.id}"]`);
    if (speakBtn) speakBtn.onclick = () => speakMessage(cleanContent, msg.id);

    const copyBtn = row.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(cleanContent);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i data-lucide="copy"></i> Copy'; try { if (window.lucide) lucide.createIcons(); } catch (e) {} }, 1500);
      };
    }
  });

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
  container.scrollTop = container.scrollHeight;
}

function renderChatList() {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  const sessionIds = Object.keys(AppState.chats).sort((a, b) => AppState.chats[b].createdAt - AppState.chats[a].createdAt);

  sessionIds.forEach(id => {
    const chat = AppState.chats[id];
    const item = document.createElement('div');
    item.className = `chat-item ${id === AppState.currentSessionId ? 'active' : ''}`;
    item.innerHTML = `
      <div class="chat-item-title"><i data-lucide="message-square"></i><span>${chat.title}</span></div>
      <button class="chat-item-del"><i data-lucide="trash-2"></i></button>
    `;
    item.onclick = () => switchChat(id);
    item.querySelector('.chat-item-del').onclick = (e) => deleteChat(id, e);
    list.appendChild(item);
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
}

// ==========================================================================
// 10. Event Listeners & Startup
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  runBootAnimation(() => {
    initAuth();
  });

  initVoice();

  document.getElementById('tab-login').onclick = () => {
    isRegisterMode = false;
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('btn-auth-submit').querySelector('span').textContent = 'Enter PRIME SYSTEM';
  };

  document.getElementById('tab-register').onclick = () => {
    isRegisterMode = true;
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('btn-auth-submit').querySelector('span').textContent = 'Create Account';
  };

  document.getElementById('auth-form').onsubmit = handleAuthSubmit;
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

  const imageModal = document.getElementById('image-modal');
  document.getElementById('btn-quick-image').onclick = () => imageModal.classList.remove('hidden');
  document.getElementById('btn-close-image-modal').onclick = () => imageModal.classList.add('hidden');
  document.getElementById('btn-do-generate-image').onclick = () => generateModalImage();

  document.getElementById('btn-clear-chats').onclick = () => {
    if (confirm('Clear all conversation history?')) {
      AppState.chats = {};
      syncChatsToCloud();
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

// ==========================================================================
// Active Session Heartbeat & Instant Kickout Engine
// ==========================================================================

function showBanKickoutModal(banInfo) {
  if (AppState.isSpeaking && window.speechSynthesis) window.speechSynthesis.cancel();
  localStorage.removeItem('prime_logged_user');
  AppState.currentUser = null;

  let modal = document.getElementById('ban-kickout-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ban-kickout-overlay';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(5,8,15,0.96); backdrop-filter:blur(20px); z-index:999999; display:flex; align-items:center; justify-content:center; padding:20px;';
    document.body.appendChild(modal);
  }

  const durationStr = banInfo.until || 'Temporary';
  const reasonStr = banInfo.reason || 'Administrative policy violation';
  const bannedByStr = banInfo.bannedBy || 'Shantanu Sharma (Owner & Super Admin)';

  modal.innerHTML = `
    <div style="background:#0d121c; border:1px solid #ef4444; border-radius:16px; padding:32px 24px; max-width:440px; width:100%; text-align:center; box-shadow:0 0 50px rgba(239,68,68,0.4);">
      <div style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.15); border:1px solid #ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#ef4444; font-size:28px;">
        🚨
      </div>
      <h2 style="color:#ef4444; font-size:1.4rem; margin-bottom:8px;">ACCOUNT SUSPENDED / BANNED</h2>
      <p style="color:#f1f5f9; font-size:0.95rem; line-height:1.5; margin-bottom:16px;">${banInfo.message || 'Aapko website se restrict kiya gaya hai.'}</p>
      
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px; text-align:left; font-size:0.85rem; margin-bottom:20px;">
        <div style="margin-bottom:8px;"><span style="color:#94a3b8;">⏳ Ban Duration:</span> <strong style="color:#f59e0b;">${durationStr}</strong></div>
        <div style="margin-bottom:8px;"><span style="color:#94a3b8;">📝 Reason:</span> <strong style="color:#f1f5f9;">${reasonStr}</strong></div>
        <div><span style="color:#94a3b8;">👑 Banned By:</span> <strong style="color:#00c8ff;">${bannedByStr}</strong></div>
      </div>

      <button onclick="location.reload()" style="background:#ef4444; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:700; cursor:pointer; width:100%;">
        Acknowledge & Exit
      </button>
    </div>
  `;
}

async function verifyActiveSession() {
  if (!AppState.currentUser) return;
  if (!IS_LOCAL_SERVER) return;

  try {
    const res = await fetch(API_BASE + '/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: AppState.currentUser.username })
    });

    if (res.status === 403) {
      const data = await res.json();
      showBanKickoutModal(data.banInfo || {});
    } else if (res.ok) {
      const data = await res.json();
      if (data.warnings && data.warnings.length > 0) {
        showUserNoticeModal(data.warnings[0]);
      }
    }
  } catch (e) {}
}

// Check session every 8 seconds
setInterval(verifyActiveSession, 8000);

// ==========================================================================
// Warning Notice Alert Popups
// ==========================================================================

function showUserNoticeModal(warning) {
  let modal = document.getElementById('user-notice-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'user-notice-overlay';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(5,8,15,0.92); backdrop-filter:blur(16px); z-index:999998; display:flex; align-items:center; justify-content:center; padding:20px;';
    document.body.appendChild(modal);
  }

  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div style="background:#0d121c; border:1px solid #f59e0b; border-radius:16px; padding:28px 24px; max-width:440px; width:100%; text-align:center; box-shadow:0 0 40px rgba(245,158,11,0.3);">
      <div style="width:56px; height:56px; border-radius:50%; background:rgba(245,158,11,0.15); border:1px solid #f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; color:#f59e0b; font-size:24px;">
        ⚠️
      </div>
      <h2 style="color:#f59e0b; font-size:1.3rem; margin-bottom:8px;">OFFICIAL ADMINISTRATIVE NOTICE</h2>
      <p style="color:#f1f5f9; font-size:0.95rem; line-height:1.5; margin-bottom:16px;">${warning.text || 'You have received an administrative warning notice.'}</p>
      
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; text-align:left; font-size:0.82rem; margin-bottom:18px;">
        <div style="margin-bottom:6px;"><span style="color:#94a3b8;">👑 Issued By:</span> <strong style="color:#00c8ff;">${warning.sentBy || 'PRIME Administration'}</strong></div>
        <div style="color:#ef4444; font-weight:600;">🚨 Policy Notice: Receiving 3 warning notices will result in an immediate automatic account suspension!</div>
      </div>

      <button id="btn-ack-notice" style="background:#f59e0b; color:#000; border:none; padding:12px 24px; border-radius:8px; font-weight:700; cursor:pointer; width:100%;">
        I Acknowledge & Understand
      </button>
    </div>
  `;

  document.getElementById('btn-ack-notice').onclick = async () => {
    modal.classList.add('hidden');
    if (AppState.currentUser) {
      try {
        await fetch(API_BASE + '/api/auth/ack-warning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: AppState.currentUser.username, warningId: warning.id })
        });
      } catch (e) {}
    }
  };
}
