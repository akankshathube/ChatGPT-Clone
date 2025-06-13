document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const messagesContainer = document.getElementById("messages");
  const welcomeScreen = document.getElementById("welcomeScreen");
  const newChatBtn = document.getElementById("newChatBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const chatList = document.getElementById("chatList");
  const promptButtons = document.querySelectorAll(".prompt-btn");

  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.className = `${savedTheme}-theme`;
  updateThemeIcon();

  let conversationHistory = [];
  let currentChatId = Date.now().toString();

  loadChatHistory();

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.body.className = `${newTheme}-theme`;
    localStorage.setItem("theme", newTheme);
    updateThemeIcon();
  });

  function updateThemeIcon() {
    const isDark = document.body.classList.contains("dark-theme");
    themeToggleBtn.innerHTML = `<i class="fas fa-${
      isDark ? "sun" : "moon"
    }"></i>`;
  }

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt;
      userInput.value = prompt;
      userInput.focus();
    });
  });

  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
  });

  newChatBtn.addEventListener("click", () => {
    startNewChat();
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all chat history?")) {
      localStorage.removeItem("chatHistory");
      chatList.innerHTML = "";
      startNewChat();
    }
  });

  function startNewChat() {
    if (conversationHistory.length > 0) {
      const lastUserMessage = conversationHistory.find(
        (msg) => msg.role === "user"
      )?.content;
      const lastAssistantMessage = conversationHistory.find(
        (msg) => msg.role === "assistant"
      )?.content;
      if (lastUserMessage && lastAssistantMessage) {
        saveChatToHistory(lastUserMessage, lastAssistantMessage);
      }
    }

    messagesContainer.innerHTML = "";
    welcomeScreen.style.display = "block";
    userInput.value = "";
    userInput.style.height = "auto";
    conversationHistory = [];
    currentChatId = Date.now().toString();
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();

    if (!message) return;

    welcomeScreen.style.display = "none";

    addMessage(message, "user");
    userInput.value = "";
    userInput.style.height = "auto";

    try {
      const loadingDiv = document.createElement("div");
      loadingDiv.className = "thinking-container";
      loadingDiv.innerHTML = `
        <div class="spinner"></div>
        <span>Thinking...</span>
      `;
      messagesContainer.appendChild(loadingDiv);

      const aiResponse = await getAIResponse(message);

      loadingDiv.style.opacity = "0";
      loadingDiv.style.transform = "translateY(-10px)";
      setTimeout(() => {
        if (loadingDiv.parentNode === messagesContainer) {
          messagesContainer.removeChild(loadingDiv);
        }
      }, 300);

      addMessage(aiResponse, "assistant");

      saveChatToHistory(message, aiResponse);
    } catch (error) {
      console.error("Error:", error);
      const loadingDiv = document.querySelector(".thinking-container");
      if (loadingDiv) {
        loadingDiv.style.opacity = "0";
        loadingDiv.style.transform = "translateY(-10px)";
        setTimeout(() => {
          if (loadingDiv.parentNode === messagesContainer) {
            messagesContainer.removeChild(loadingDiv);
          }
        }, 300);
      }
      addMessage(
        `Error: ${error.message}. Please check the console for more details.`,
        "assistant"
      );
    }
  });

  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const iconDiv = document.createElement("div");
    iconDiv.className = "message-icon";
    if (sender === "assistant") {
      iconDiv.innerHTML = '<i class="fas fa-robot"></i>';
    } else {
      iconDiv.innerHTML = '<i class="fas fa-user"></i>';
    }
    messageDiv.appendChild(iconDiv);

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = text;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.title = "Copy message";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      });
    });

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(copyBtn);
    messagesContainer.appendChild(messageDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    conversationHistory.push({
      role: sender === "user" ? "user" : "assistant",
      content: text,
    });
  }

  // Function to get AI response from OpenAI API
  async function getAIResponse(message) {
    // TODO: Replace with your OpenAI API key
    // Get your API key from: https://platform.openai.com/api-keys
    const API_KEY = "YOUR_OPENAI_API_KEY_HERE";
    const API_URL = "https://api.openai.com/v1/chat/completions";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            ...conversationHistory,
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        throw new Error(
          `API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Detailed Error:", error);
      throw new Error(`Error: ${error.message}`);
    }
  }

  // Local Storage Functions
  function saveChatToHistory(userMessage, aiResponse) {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    const chat = {
      id: currentChatId,
      timestamp: Date.now(),
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      ],
    };

    chatHistory.unshift(chat);
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    updateChatList();
  }

  function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    updateChatList();
  }

  function updateChatList() {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    chatList.innerHTML = "";

    chatHistory.forEach((chat) => {
      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.innerHTML = `
        <div class="chat-preview">${chat.messages[0].content.substring(
          0,
          50
        )}...</div>
        <div class="chat-time">${new Date(
          chat.timestamp
        ).toLocaleString()}</div>
      `;
      chatItem.addEventListener("click", () => loadChat(chat));
      chatList.appendChild(chatItem);
    });
  }

  function loadChat(chat) {
    currentChatId = chat.id;
    messagesContainer.innerHTML = "";
    welcomeScreen.style.display = "none";
    conversationHistory = [];

    chat.messages.forEach((message) => {
      addMessage(message.content, message.role);
    });
  }

  // Handle Enter key (send message) and Shift+Enter (new line)
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });
});
