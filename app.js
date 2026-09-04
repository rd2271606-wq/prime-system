/**
 * PRIME SYSTEM — Executive Compound AI & Creative Studio
 * Author & Authority: Shantanu Sharma
 * Firebase Google Sign-In + Direct Ultra-Fast AI Chat & Image Generation
 */

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

function enhanceImagePrompt(rawPrompt, userStyle) {
  let clean = cleanImagePrompt(rawPrompt);
  const realismTags = "photorealistic, 8k uhd, cinematic lighting, highly detailed textures, master photography, 35mm photograph, sharp focus, natural colors, realistic skin, volumetric lighting, dslr";
  if (userStyle) {
    return `${clean}, ${userStyle}, ${realismTags}`;
  }
  return `${clean}, ${realismTags}`;
}

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

// ==========================================================================
// 1. Boot Sequence & Initialization
// ==========================================================================

function initBootSequence() {
  const bootScreen = document.getElementById('boot-screen');
  const statusText = document.getElementById('boot-status');
  const progressFill = document.getElementById('boot-progress-fill');

  const steps = [
    { text: 'CONNECTING QUANTUM CORE...', progress: '25%' },
    { text: 'INITIALIZING EXECUTIVE INTELLIGENCE...', progress: '60%' },
    { text: 'CALIBRATING DUAL PERSONA ENGINE...', progress: '85%' },
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
  }, 350);
}

// ==========================================================================
// 2. Firebase Google Authentication Engine (Header + Modal Integration)
// ==========================================================================

function initFirebaseAuth() {
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const modalGoogleBtn = document.getElementById('btn-google-login');
  const navGoogleBtn = document.getElementById('btn-nav-google-login');
  const navUserProfile = document.getElementById('nav-user-profile');
  const errorBox = document.getElementById('auth-error-box');

  // Check saved local user session first for instant UI response
  const saved = localStorage.getItem('prime_logged_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      setUserLoggedInUI(u);
    } catch (e) {}
  } else {
    setUserLoggedOutUI();
  }

  // Firebase Auth Real-Time State Observer
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
        } else {
          if (!localStorage.getItem('prime_logged_user')) {
            setUserLoggedOutUI();
          }
        }
      });
    } catch (err) {
      console.warn("Firebase Auth Listener Error:", err);
    }
  }

  // Google Sign-In Execution Function
  async function triggerGoogleSignIn() {
    if (errorBox) errorBox.classList.add('hidden');
    if (modalGoogleBtn) { modalGoogleBtn.disabled = true; modalGoogleBtn.style.opacity = '0.7'; }
    if (navGoogleBtn) { navGoogleBtn.disabled = true; navGoogleBtn.style.opacity = '0.7'; }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        const userData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          photoURL: user.photoURL
        };
        localStorage.setItem('prime_logged_user', JSON.stringify(userData));
        setUserLoggedInUI(userData);
        if (modalGoogleBtn) { modalGoogleBtn.disabled = false; modalGoogleBtn.style.opacity = '1'; }
        if (navGoogleBtn) { navGoogleBtn.disabled = false; navGoogleBtn.style.opacity = '1'; }
        return;
      } catch (firebaseErr) {
        console.warn("Firebase Google Popup:", firebaseErr);
        
        // Handle Unauthorized Domain or Localhost Setup gracefully
        if (firebaseErr.code === 'auth/unauthorized-domain' || firebaseErr.code === 'auth/invalid-api-key' || firebaseErr.code === 'auth/configuration-not-found' || firebaseErr.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
          const promptName = prompt("Firebase Domain Setup Notice: Please enter your Google display name or email to continue:", "User");
          if (promptName) {
            const cleanName = promptName.includes('@') ? promptName.split('@')[0] : promptName;
            const fallbackUser = {
              uid: 'google_' + Date.now(),
              displayName: cleanName,
              email: promptName.includes('@') ? promptName : `${cleanName.toLowerCase()}@gmail.com`,
              photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`
            };
            localStorage.setItem('prime_logged_user', JSON.stringify(fallbackUser));
            setUserLoggedInUI(fallbackUser);
            if (modalGoogleBtn) { modalGoogleBtn.disabled = false; modalGoogleBtn.style.opacity = '1'; }
            if (navGoogleBtn) { navGoogleBtn.disabled = false; navGoogleBtn.style.opacity = '1'; }
            return;
          }
        }

        if (errorBox) {
          errorBox.textContent = firebaseErr.message || 'Google sign in failed. Please try again.';
          errorBox.classList.remove('hidden');
        }
      }
    } else {
      const promptName = prompt("Enter your Name or Gmail to continue:", "User");
      if (promptName) {
        const cleanName = promptName.includes('@') ? promptName.split('@')[0] : promptName;
        const fallbackUser = {
          uid: 'google_' + Date.now(),
          displayName: cleanName,
          email: promptName.includes('@') ? promptName : `${cleanName.toLowerCase()}@gmail.com`,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`
        };
        localStorage.setItem('prime_logged_user', JSON.stringify(fallbackUser));
        setUserLoggedInUI(fallbackUser);
      }
    }

    if (modalGoogleBtn) { modalGoogleBtn.disabled = false; modalGoogleBtn.style.opacity = '1'; }
    if (navGoogleBtn) { navGoogleBtn.disabled = false; navGoogleBtn.style.opacity = '1'; }
  }

  // Attach click listeners to both modal and navbar Google buttons
  if (modalGoogleBtn) modalGoogleBtn.onclick = triggerGoogleSignIn;
  if (navGoogleBtn) navGoogleBtn.onclick = triggerGoogleSignIn;
}

function setUserLoggedInUI(userData) {
  AppState.currentUser = userData;
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const nameSpan = document.getElementById('user-display-name');
  const avatarImg = document.getElementById('user-avatar-img');
  const defaultIcon = document.getElementById('user-default-icon');
  const navUserProfile = document.getElementById('nav-user-profile');
  const navGoogleBtn = document.getElementById('btn-nav-google-login');

  if (nameSpan) nameSpan.textContent = userData.displayName;

  if (userData.photoURL && avatarImg) {
    avatarImg.src = userData.photoURL;
    avatarImg.classList.remove('hidden');
    if (defaultIcon) defaultIcon.classList.add('hidden');
  } else {
    if (avatarImg) avatarImg.classList.add('hidden');
    if (defaultIcon) defaultIcon.classList.remove('hidden');
  }

  // Update Header/Navbar UI
  if (navUserProfile) navUserProfile.classList.remove('hidden');
  if (navGoogleBtn) navGoogleBtn.classList.add('hidden');

  // Dismiss Auth Modal & Reveal Main Application
  if (authScreen) authScreen.classList.add('hidden');
  if (appScreen) appScreen.classList.remove('hidden');

  loadUserChats();
}

function setUserLoggedOutUI() {
  AppState.currentUser = null;
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');
  const navUserProfile = document.getElementById('nav-user-profile');
  const navGoogleBtn = document.getElementById('btn-nav-google-login');

  if (navUserProfile) navUserProfile.classList.add('hidden');
  if (navGoogleBtn) navGoogleBtn.classList.remove('hidden');
  if (authScreen) authScreen.classList.remove('hidden');
  if (appScreen) appScreen.classList.add('hidden');
}

function handleLogout() {
  if (confirm('Are you sure you want to sign out of PRIME SYSTEM?')) {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try { firebase.auth().signOut(); } catch (e) {}
    }
    localStorage.removeItem('prime_logged_user');
    AppState.currentUser = null;
    AppState.chats = {};
    if (AppState.isSpeaking && window.speechSynthesis) window.speechSynthesis.cancel();
    setUserLoggedOutUI();
    location.reload();
  }
}

// ==========================================================================
// 3. Conversation Management (Linked to Google Account)
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
// 5. File Attachments
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
      <i data-lucide="${att.type === 'image' ? 'image' : 'file-text'}"></i>
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
// 6. Direct In-Chat AI Image Generator
// ==========================================================================

async function handleInChatImageGeneration(text, aiMsgId) {
  const cleanPrompt = cleanImagePrompt(text) || text;
  const currentChat = AppState.chats[AppState.currentSessionId];
  const aiMsg = currentChat.messages.find(m => m.id === aiMsgId);
  const userName = AppState.currentUser ? AppState.currentUser.displayName : 'User';
  const isFemale = AppState.settings.persona === 'female';

  updateBubble(aiMsgId, `🎨 **PRIME ART STUDIO:** *${cleanPrompt}* ke liye visual generate ho raha hai... ✨`);

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
    ? `Ji ${userName} sir! Aapki image generate kar di gayi hai.`
    : `Ji ${userName} sir! Aapki image ready ho gayi hai.`;

  aiMsg.content = `✨ **PRIME ART STUDIO Artwork Generated:**\n\n![${cleanPrompt}](${imgSrc})\n\n[⬇️ **Download High-Definition Artwork**](${imgSrc})\n\n*${spokenGreeting}*`;
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
// 7. Messaging Pipeline (Direct LLM Streaming)
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
    saveUserChats();
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
  box.innerHTML = `<div style="padding:25px; color:#00c8ff; text-align:center;"><p>🎨 Generating visual...</p></div>`;

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
      msg.attachments.forEach(att => {
        if (att.type === 'image') {
          attachmentsHtml += `<img src="${att.dataUrl}" style="max-height:220px; border-radius:8px; margin-bottom:8px; display:block;" alt="${att.name}">`;
        } else {
          attachmentsHtml += `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;"><i data-lucide="file"></i> ${att.name}</div>`;
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
// 10. Event Bindings
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  initFirebaseAuth();
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
