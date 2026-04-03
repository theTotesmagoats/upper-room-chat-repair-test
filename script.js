// Main application logic for The Upper Room Chat
// Source of truth: messages.json, bios.json, typing-beats.json, config.json

let messagesData = null;
let biosData = null;
let typingBeatsData = null;
let configData = null;

let currentMsgIndex = 0;
let isPlaying = true;
let playbackTimer = null;
let selectedSpeed = 'normal';
let baseDelay = 4500;

// State variables for scroll tracking
let userPausedLive = false;
let unseenCount = 0;
let lastScrollTop = 0;
let followScrollToken = 0;
let suppressScrollListener = false;

// DOM Elements
const chat = document.getElementById('chat');
const participantCountEl = document.getElementById('participant-count');
const speedControlsContainer = document.getElementById('speed-controls');
const scrollBtn = document.getElementById('scroll-btn');
const newIndicator = document.getElementById('new-indicator');
const scriptureBanner = document.getElementById('scripture-banner');
const bioPopover = document.getElementById('bio-popover');

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  // Load all JSON data concurrently
  Promise.all([
    fetch('messages.json').then(r => r.json()),
    fetch('bios.json').then(r => r.json()),
    fetch('typing-beats.json').then(r => r.json()),
    fetch('config.json').then(r => r.json())
  ])
  .then(([messages, bios, typingBeats, config]) => {
    messagesData = messages;
    biosData = bios;
    typingBeatsData = typingBeats;
    configData = config;

    // Initialize speed and delay from config
    selectedSpeed = config.defaultSpeed || 'normal';
    baseDelay = config.speeds[selectedSpeed]?.delay || 4500;

    // Update participant count
    const participants = new Set(
      messages.filter(m => m.from).map(m => m.from)
    ).size;
    participantCountEl.textContent = `${participants} participants`;

    // Build speed controls
    renderSpeedControls(config.speeds);

    // Remove loading state and start playback
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
      loadingState.remove();
    }

    // Start message playback
    startPlayback();

  })
  .catch(err => {
    console.error('App initialization failed:', err);
    showFatalErrorUI(`Failed to load chat data. Please refresh or try again later.`);
  });
}

function renderSpeedControls(speeds) {
  speedControlsContainer.innerHTML = '';
  
  for (const [key, speedConfig] of Object.entries(speeds)) {
    const btn = document.createElement('button');
    btn.className = `speed-btn ${key === selectedSpeed ? 'active' : ''}`;
    btn.dataset.speed = key;
    btn.textContent = speedConfig.label;
    
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      selectedSpeed = key;
      baseDelay = speedConfig.delay;
      
      // Restart playback loop with new delay
      if (playbackTimer) {
        clearTimeout(playbackTimer);
        playbackTimer = null;
        playNextMessage();
      }
    });
    
    speedControlsContainer.appendChild(btn);
  }
}

function showFatalErrorUI(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fatal-error';
  errorDiv.style.cssText = `
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; background: #f2f2f7; padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  
  const card = document.createElement('div');
  card.style.cssText = `
    max-width: 500px; width: 100%; background: white;
    border-radius: 16px; padding: 32px; text-align: center;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  `;
  
  card.innerHTML = `
    <h2 style="color: #d63031; font-size: 24px; margin-bottom: 16px;">Something went wrong</h2>
    <p style="color: #555; line-height: 1.5;">${message}</p>
    <button onclick="location.reload()" style="
      mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg font-medium
      border-none cursor-pointer hover:bg-blue-700 transition-colors;
    ">Try Again</button>
  `;
  
  errorDiv.appendChild(card);
  document.body.appendChild(errorDiv);
}

function startPlayback() {
  currentMsgIndex = 0;
  isPlaying = true;
  playNextMessage();
}

function playNextMessage() {
  if (!isPlaying || !messagesData || currentMsgIndex >= messagesData.length) {
    return;
  }

  const msg = messagesData[currentMsgIndex];
  renderMessage(msg);

  // Determine delay based on message type
  let delay = baseDelay;
  
  if (msg.day) {
    delay = baseDelay * 3; // Longer pause for day markers
  } else if (msg.context || msg.note || msg.type === 'verse') {
    delay = baseDelay * 2;
  }

  currentMsgIndex++;
  playbackTimer = setTimeout(playNextMessage, delay);
}

function renderMessage(msg) {
  const chatDiv = document.getElementById('chat');

  // Handle day markers
  if (msg.day) {
    const el = document.createElement('div');
    el.className = `day-marker ${msg.day.toLowerCase().includes('pentecost') ? 'pentecost-day' : ''}`;
    el.textContent = msg.day;
    chatDiv.appendChild(el);
    return;
  }

  // Handle context blocks
  if (msg.context) {
    const el = document.createElement('div');
    el.className = `context-box ${msg.context.includes('Pentecost') ? 'pentecost-box' : ''}`;
    el.textContent = msg.content;
    chatDiv.appendChild(el);
    return;
  }

  // Handle notes
  if (msg.note) {
    const el = document.createElement('div');
    el.className = 'note';
    el.style.cssText = `
      text-align: center; font-size: 12px; color: #666;
      margin: 10px auto; max-width: 300px; font-style: italic;
    `;
    el.textContent = msg.note;
    chatDiv.appendChild(el);
    return;
  }

  // Handle verses
  if (msg.type === 'verse') {
    const bannerEl = document.createElement('div');
    bannerEl.className = 'scripture-banner';
    bannerEl.dataset.tone = msg.tone || '';
    
    let tagText = msg.tag || 'Scripture';
    if (msg.side === 'right' && !msg.tag) tagText = 'Rumor in the city';
    
    bannerEl.innerHTML = `
      <div class="scripture-banner-tag">${tagText}</div>
      <div class="scripture-banner-text">"${msg.verseText}"</div>
      <div class="scripture-banner-citation">${msg.citation}</div>
    `;
    
    // Show banner with timing
    chatDiv.appendChild(bannerEl);
    setTimeout(() => bannerEl.classList.add('visible'), 50);
    const wordCount = msg.verseText.split(/\s+/).length;
    const displayTime = Math.max(
      configData?.scripture?.minWordsDisplayTime || 5200,
      Math.min(configData?.scripture?.maxWordsDisplayTime || 9200, 
               wordCount * (configData?.scripture?.wordsPerSecond || 260) / 10)
    );
    
    setTimeout(() => {
      bannerEl.classList.remove('visible');
      setTimeout(() => bannerEl.remove(), 500);
    }, displayTime);
    return;
  }

  // Handle normal messages
  if (msg.from && msg.text) {
    const el = document.createElement('div');
    el.className = `message ${msg.side === 'right' ? 'right' : 'left'}${msg.emotional ? ' emotional' : ''}${msg.pentecostFire ? ' pentecost-fire' : ''}`;
    
    el.innerHTML = `
      <button class="contact-trigger" data-contact="${msg.from}" aria-label="View ${msg.from}'s bio">
        <span class="contact-name">${msg.from}</span>
      </button>
      <div class="bubble${msg.side === 'right' ? ' right' : ''}${msg.emotional ? ' emotional' : ''}${msg.pentecostFire ? ' pentecost-fire' : ''}">${escapeHtml(msg.text)}</div>
    `;
    
    // Add click handler for bio
    const trigger = el.querySelector('.contact-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => showBio(msg.from));
    }
    
    chatDiv.appendChild(el);
    
    // Check for typing beats after this message
    checkTypingBeat(msg.text, msg.from, msg.side, msg.charClass || '');
  }

  scrollToBottom();
}

function checkTypingBeat(text, from, side, charClass) {
  const beat = typingBeatsData?.find(b => 
    (b.afterText === text && b.from === from)
  );
  
  if (beat) {
    showTypingIndicator(beat.duration);
  }
}

function showTypingIndicator(duration) {
  const chatDiv = document.getElementById('chat');
  const el = document.createElement('div');
  el.className = 'message typing-indicator';
  
  el.innerHTML = `
    <span class="typing-dots">
      <span></span><span></span><span></span>
    </span>
    <span class="typing-caption">...</span>
  `;
  
  chatDiv.appendChild(el);
  
  // Auto fade after duration
  setTimeout(() => {
    el.classList.add('fade-away');
    setTimeout(() => el.remove(), 250);
  }, duration + 100);
}

function showBio(contactName) {
  const bio = biosData?.[contactName];
  if (!bio) return;

  bioName.textContent = contactName;
  bioRole.textContent = bio.role;
  bioSummary.textContent = bio.summary;
  bioRelation.textContent = `To Jesus: ${bio.relation}`;
  bioWhy.textContent = `Why he is here: ${bio.why}`;

  bioPopover.classList.add('visible');
}

// Hide bio when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.contact-trigger') && !bioPopover.contains(e.target)) {
    bioPopover.classList.remove('visible');
  }
});

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
  
  // Show scroll button if scrolled up
  const threshold = configData?.scroll?.thresholdPixelsFromBottom || 90;
  if (chat.scrollHeight - chat.scrollTop - chat.clientHeight > threshold) {
    scrollBtn.classList.add('visible');
  } else {
    scrollBtn.classList.remove('visible');
  }
}

function scrollToBottomAndReset() {
  scrollToBottom();
  unseenCount = 0;
  newIndicator.classList.remove('visible');
}

// Scroll listener for new messages
chat.addEventListener('scroll', () => {
  if (userPausedLive) return;
  
  const threshold = configData?.scroll?.thresholdPixelsFromBottom || 90;
  const fromBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight;
  
  if (fromBottom <= threshold) {
    scrollBtn.classList.remove('visible');
    newIndicator.classList.remove('visible');
  } else if (!userPausedLive && fromBottom > threshold * 2) {
    unseenCount++;
    if (unseenCount >= 3) {
      scrollBtn.classList.add('visible');
    }
  }
});

// Event listeners for controls
scrollBtn.addEventListener('click', scrollToBottomAndReset);

newIndicator.addEventListener('click', () => {
  userPausedLive = false;
  scrollToBottomAndReset();
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose resumeLiveFollow for backwards compatibility with old HTML
window.resumeLiveFollow = scrollToBottomAndReset;