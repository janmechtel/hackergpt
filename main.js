// ===== CONFIGURATION =====
const OPENROUTER_API_KEY = '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'; // Replace with your key
const MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'; // Free model, swap as needed https://openrouter.ai/models?order=pricing-low-to-high
const SYSTEM_PROMPT = `You are H4CK3R-GPT, a helpful AI assistant. You help with homework, research, writing, and any questions. You respond clearly and helpfully. You can use markdown formatting.`;

// ===== STATE =====
let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
let isStreaming = false;

// ===== DOM =====
const bootScreen = document.getElementById('boot-screen');
const bootText = document.getElementById('boot-text');
const app = document.getElementById('app');
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// ===== BOOT SEQUENCE =====
const bootLines = [
  '██████████████████████████████████████████',
  '█  H4CK3R-GPT NEURAL INTERFACE v6.6.6   █',
  '██████████████████████████████████████████',
  '',
  '[BOOT] Initializing kernel modules...',
  '[BOOT] Loading neural network weights... OK',
  '[BOOT] Establishing encrypted tunnel... OK',
  '[BOOT] Mounting /dev/brain... OK',
  '[BOOT] Checking system integrity.......... PASSED',
  '[BOOT] Loading language models...',
  '  → meta-llama-3.1-8b ████████████████ 100%',
  '[BOOT] Activating neural link...',
  '',
  '[AUTH] Biometric scan... ACCEPTED',
  '[AUTH] Access level: ROOT',
  '[AUTH] Clearance: ULTRA',
  '',
  '⚠  WARNING: ALL ACTIVITY IS MONITORED ⚠',
  '⚠  UNAUTHORIZED ACCESS WILL BE TRACED ⚠',
  '',
  '[READY] Neural interface online.',
  '[READY] Awaiting input...',
  '',
  '> ACCESS GRANTED_',
];

async function runBootSequence() {
  for (let i = 0; i < bootLines.length; i++) {
    const line = bootLines[i];
    // Type each line character by character (fast)
    for (let j = 0; j <= line.length; j++) {
      bootText.textContent = bootLines.slice(0, i).join('\n') + '\n' + line.slice(0, j);
      await sleep(2 + Math.random() * 4);
    }
    // Pause between lines
    await sleep(20 + Math.random() * 40);
  }
  // Final pause then transition
  await sleep(400);
  bootScreen.style.transition = 'opacity 0.5s';
  bootScreen.style.opacity = '0';
  await sleep(500);
  bootScreen.style.display = 'none';
  app.classList.remove('hidden');
  userInput.focus();
}

// ===== CHAT FUNCTIONS =====
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;

  if (role === 'assistant') {
    const header = document.createElement('div');
    header.className = 'msg-header';
    header.textContent = '[H4CK3R-GPT] >';
    div.appendChild(header);

    const msgContent = document.createElement('div');
    msgContent.className = 'msg-content';
    msgContent.textContent = content || '';
    div.appendChild(msgContent);
  } else {
    div.textContent = content;
  }

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}

function addCursor(msgDiv) {
  const cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  msgDiv.querySelector('.msg-content').appendChild(cursor);
  return cursor;
}

function removeCursor(cursor) {
  if (cursor && cursor.parentNode) {
    cursor.parentNode.removeChild(cursor);
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  // Add user message
  addMessage('user', text);
  messages.push({ role: 'user', content: text });
  userInput.value = '';
  userInput.style.height = 'auto';
  isStreaming = true;
  sendBtn.disabled = true;

  // Create assistant message placeholder
  const assistantDiv = addMessage('assistant', '');
  const cursor = addCursor(assistantDiv);
  const contentEl = assistantDiv.querySelector('.msg-content');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'H4CK3R-GPT'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[${response.status}] ${err}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              // Remove cursor, update text, re-add cursor
              removeCursor(cursor);
              contentEl.textContent = fullContent;
              const newCursor = addCursor(assistantDiv);
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (e) {
            // Skip unparseable chunks
          }
        }
      }
    }

    // Finalize
    removeCursor(assistantDiv.querySelector('.cursor-blink'));
    contentEl.textContent = fullContent;
    messages.push({ role: 'assistant', content: fullContent });

  } catch (error) {
    removeCursor(assistantDiv.querySelector('.cursor-blink'));
    assistantDiv.className = 'message error';
    assistantDiv.innerHTML = `<span class="prefix">[ERROR]</span> ${error.message}`;
    console.error('Stream error:', error);
  }

  isStreaming = false;
  sendBtn.disabled = false;
  userInput.focus();
}

// ===== EVENT LISTENERS =====
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// ===== UTILITY =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== INIT =====
const params = new URLSearchParams(window.location.search);
if (params.has('noboot') || params.has('skip')) {
  bootScreen.style.display = 'none';
  app.classList.remove('hidden');
  userInput.focus();
} else {
  runBootSequence();
}
