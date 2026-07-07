// Import modern Modular Firebase v12+ Web Core Libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged, deleteUser, updateProfile } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getDatabase, ref, set, onValue, push, serverTimestamp as rdbTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

// --- FIRATION INFRASTRUCTURE SUITE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD9BmV4XKXuMWa4PZHpb7Bbt-rHs61m3lE",
  authDomain: "absensi-polri.firebaseapp.com",
  databaseURL: "https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-polri",
  storageBucket: "absensi-polri.firebasestorage.app",
  messagingSenderId: "19006760644",
  appId: "1:19006760644:web:b980f54aea123e92ed4b91"
};

// Initialize Nodes
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rdb = getDatabase(app);
const storage = getStorage(app);

// Application Core Runtime Storage Context State
let currentUserInstance = null;
let activeSessionReference = null;
let abortControllerInstance = null;
let localUploadBlob = null;

// LLM Micro-Routing Provider Factory Integration Suite Engine
const AI_ORCHESTRATOR = {
    async queryProvider(prompt, configuration, trackingCallback) {
        const payload = {
            model: configuration.model || "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            stream: true
        };
        
        // Dynamic construction logic depending on operational keys injected into settings
        let targetEndpoint = "https://api.openai.com/v1/chat/completions";
        if(configuration.provider === "deepseek") targetEndpoint = "https://api.deepseek.com/v1/chat/completions";
        if(configuration.provider === "groq") targetEndpoint = "https://api.groq.com/openai/v1/chat/completions";

        try {
            const response = await fetch(targetEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${configuration.token}`
                },
                body: JSON.stringify(payload),
                signal: configuration.signal
            });

            if (!response.ok) throw new Error(`HTTP Error Variant: ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedString = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter(line => line.trim() !== "");
                
                for (const line of lines) {
                    if (line.includes("[DONE]")) continue;
                    if (line.startsWith("data: ")) {
                        try {
                            const parsed = JSON.parse(line.replace("data: ", ""));
                            const token = parsed.choices[0]?.delta?.content || "";
                            accumulatedString += token;
                            trackingCallback(accumulatedString);
                        } catch (e) { /* Guarding segment parsing errors */ }
                    }
                }
            }
            return accumulatedString;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error("Stream connection physically broken by manual command interrupt.");
            }
            throw error;
        }
    }
};

// --- INITIAL VIEWPORT SWITCHING MECHANICS ---
document.querySelectorAll(".nav-links li").forEach(navItem => {
    navItem.addEventListener("click", () => {
        const destinationView = navItem.getAttribute("data-view");
        switchAppView(destinationView);
    });
});

function switchAppView(viewId) {
    document.querySelectorAll(".app-view").forEach(view => view.classList.remove("active-view"));
    document.querySelectorAll(".nav-links li").forEach(li => li.classList.remove("active"));
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add("active-view");
        const matchingLink = document.querySelector(`.nav-links li[data-view="${viewId}"]`);
        if (matchingLink) matchingLink.classList.add("active");
    }
    // Auto collapse layout overlay if visible inside mobile views
    document.getElementById("sidebar").classList.remove("open");
}

// Sidebar Drawer UI Controls toggle mechanics
document.getElementById("toggleSidebar").addEventListener("click", () => document.getElementById("sidebar").classList.add("open"));
document.getElementById("closeSidebar").addEventListener("click", () => document.getElementById("sidebar").classList.remove("open"));

// Light Dark Core Variable Toggling Matrix
document.getElementById("themeToggle").addEventListener("click", () => {
    const rootElement = document.documentElement;
    const currentTheme = rootElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    rootElement.setAttribute("data-theme", nextTheme);
    document.getElementById("themeToggle").innerHTML = nextTheme === "dark" ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
});

// --- AUTHENTICATION STATE WATCHDOG LIFECYCLE MANAGEMENT ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserInstance = user;
        document.getElementById("authModal").classList.remove("active");
        showToastNotification(`Session identity mapped securely: ${user.uid.substring(0, 8)}`);
        
        // Provision global structural profile changes details on sidebars
        document.getElementById("navUsername").innerText = user.displayName || "Operator Node";
        document.getElementById("navAvatar").src = user.photoURL || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150";
        
        // Fire up Realtime Operational Database Presence Vectors
        initializeUserPresence(user);
        syncDashboardStats();
    } else {
        currentUserInstance = null;
        document.getElementById("authModal").classList.add("active");
    }
});

// Auth Handlers Form Submit logic binding
document.getElementById("emailAuthForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        showToastNotification(`Auth Refusal Error: ${err.message}`);
    }
});

document.getElementById("googleLoginBtn").addEventListener("click", async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (err) {
        showToastNotification(`OAuth Connection Failure: ${err.message}`);
    }
});

document.getElementById("anonymousLoginBtn").addEventListener("click", async () => {
    try {
        await signInAnonymously(auth);
    } catch (err) {
        showToastNotification(`Sandbox Key Deployment Error: ${err.message}`);
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    if(activeSessionReference) set(activeSessionReference, null);
    signOut(auth);
});

// --- REALTIME PRESENCE MACHINE ARCHITECTURE ---
function initializeUserPresence(user) {
    const sessionPushRef = push(ref(rdb, 'telemetry/sessions'));
    activeSessionReference = ref(rdb, `telemetry/online_nodes/${user.uid}`);
    
    set(activeSessionReference, {
        uid: user.uid,
        lastSeen: rdbTimestamp(),
        deviceUserAgent: navigator.userAgent
    });

    // Mirror updates to general platform counts
    onValue(ref(rdb, 'telemetry/online_nodes'), (snapshot) => {
        const connectionObject = snapshot.val();
        const globalCount = connectionObject ? Object.keys(connectionObject).length : 1;
        document.getElementById("liveVisitorsCount").innerText = globalCount;
        document.getElementById("statOnlineUsers").innerText = globalCount;
    });
}

// --- SEARCH ENGINE INTERACTION WORKFLOW ---
const mainSearchForm = document.getElementById("mainSearchForm");
mainSearchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const queryTerm = document.getElementById("mainSearchInput").value.trim();
    if (!queryTerm) return;

    // Direct routing initialization logic
    switchAppView("ai-search-view");
    document.getElementById("searchQueryDisplay").innerText = `"${queryTerm}"`;
    const responseBox = document.getElementById("searchResponseContent");
    
    // Inject Loading Sequence UI Matrix
    responseBox.innerHTML = `
        <div class="skeleton-loader">
            <div class="skeleton-line width-80"></div>
            <div class="skeleton-line width-100"></div>
            <div class="skeleton-line width-60"></div>
        </div>
    `;

    // Extract User System Configuration Matrices
    const provider = document.getElementById("apiProviderSelect").value;
    const token = document.getElementById("apiKeyInput").value || "MOCK_DEVELOPER_ISOLATED_TOKEN";

    abortControllerInstance = new AbortController();

    try {
        // Log transaction to persistent indexing cluster before execution complete
        if (currentUserInstance) {
            await addDoc(collection(db, "search_records"), {
                userId: currentUserInstance.uid,
                query: queryTerm,
                timestamp: new Date(),
                isPinned: false
            });
        }

        await AI_ORCHESTRATOR.queryProvider(queryTerm, {
            provider: provider,
            token: token,
            signal: abortControllerInstance.signal
        }, (streamedChunk) => {
            // Render structured engine returns securely via safety sanitized markdown transforms
            responseBox.innerHTML = marked.parse(streamedChunk);
        });

    } catch (err) {
        responseBox.innerHTML = `<span style="color: #ff0055;"><i class="fa-solid fa-triangle-exclamation"></i> execution structural failure: ${err.message}</span>`;
    }
});

// --- FULL CHAT INTERACTION PARADIGM ---
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessagesContainer = document.getElementById("chatMessages");
const imageUploadInput = document.getElementById("chatImageUpload");

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawInput = chatInput.value.trim();
    if(!rawInput && !localUploadBlob) return;

    // Commit input display layout change sequences
    appendMessageBubble(rawInput, 'user-message');
    chatInput.value = "";
    
    // Construct dynamic response anchor within layout
    const aiResponseBubble = appendMessageBubble("", 'ai-message');
    const innerBubbleTextSpan = aiResponseBubble.querySelector(".message-bubble");
    
    document.getElementById("typingIndicator").style.display = "flex";
    abortControllerInstance = new AbortController();
    
    const config = {
        provider: document.getElementById("apiProviderSelect").value,
        token: document.getElementById("apiKeyInput").value || "MOCK_DEVELOPER_ISOLATED_TOKEN",
        signal: abortControllerInstance.signal
    };

    try {
        let enhancedPrompt = rawInput;
        if(localUploadBlob) {
            // Secure transaction sequence to cloud store
            const storagePathRef = storageRef(storage, `context_payloads/${Date.now()}_${localUploadBlob.name}`);
            const uploadSnapshot = await uploadBytes(storagePathRef, localUploadBlob);
            const downloadUrl = await getDownloadURL(uploadSnapshot.ref);
            enhancedPrompt += ` [Attached Context Document Media Reference Matrix: ${downloadUrl}]`;
            
            // Wipe variable container states out safely
            localUploadBlob = null;
            document.getElementById("imagePreviewContainer").style.display = "none";
        }

        await AI_ORCHESTRATOR.queryProvider(enhancedPrompt, config, (latestStreamState) => {
            innerBubbleTextSpan.innerHTML = marked.parse(latestStreamState);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        });

        // Sync data down to base collections
        if(currentUserInstance) {
            await addDoc(collection(db, "chat_records"), {
                userId: currentUserInstance.uid,
                prompt: rawInput,
                timestamp: new Date()
            });
        }

    } catch(err) {
        innerBubbleTextSpan.innerHTML = `<span style="color: #ff0055;">Thread execution terminated. Engine reason: ${err.message}</span>`;
    } finally {
        document.getElementById("typingIndicator").style.display = "none";
    }
});

function appendMessageBubble(text, classModifier) {
    const msgWrapper = document.createElement("div");
    msgWrapper.className = `message ${classModifier}`;
    
    const iconType = classModifier === 'user-message' ? 'fa-user-astronaut' : 'fa-robot';
    msgWrapper.innerHTML = `
        <div class="message-avatar"><i class="fa-solid ${iconType}"></i></div>
        <div class="message-bubble">${text}</div>
    `;
    chatMessagesContainer.appendChild(msgWrapper);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    return msgWrapper;
}

// Handle Context Attachment Selection Changes
imageUploadInput.addEventListener("change", (e) => {
    const selectedFile = e.target.files[0];
    if(selectedFile) {
        localUploadBlob = selectedFile;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById("imagePreview").src = event.target.result;
            document.getElementById("imagePreviewContainer").style.display = "block";
        };
        reader.readAsDataURL(selectedFile);
    }
});
document.getElementById("removePreviewBtn").addEventListener("click", () => {
    localUploadBlob = null;
    document.getElementById("imagePreviewContainer").style.display = "none";
});

// --- OPERATIONAL CORE ANALYTICS SYNCHRONIZER ---
async function syncDashboardStats() {
    if(!currentUserInstance) return;
    
    // Create live telemetry listeners via snapshot loops
    const searchHistoryQuery = query(collection(db, "search_records"), where("userId", "==", currentUserInstance.uid));
    onSnapshot(searchHistoryQuery, (snapshot) => {
        document.getElementById("statTotalSearches").innerText = snapshot.size;
        renderHistoryLists(snapshot.docs);
    });

    const dialogueQuery = query(collection(db, "chat_records"), where("userId", "==", currentUserInstance.uid));
    onSnapshot(dialogueQuery, (snapshot) => {
        document.getElementById("statTotalChats").innerText = snapshot.size;
    });
}

function renderHistoryLists(docArray) {
    const listWrapper = document.getElementById("historyList");
    if(docArray.length === 0) {
        listWrapper.innerHTML = `<div class="empty-placeholder">Your timeline is completely empty.</div>`;
        return;
    }
    listWrapper.innerHTML = "";
    docArray.forEach(documentReference => {
        const record = documentReference.data();
        const row = document.createElement("div");
        row.className = "history-item-row glass";
        row.style.padding = "15px";
        row.style.margin = "10px 0";
        row.style.display = "flex";
        row.style.justifyContent = "between";
        row.style.alignItems = "center";
        row.innerHTML = `
            <div>
                <strong style="color: var(--accent-neon);">${record.query}</strong>
                <div style="font-size:0.75rem; color: var(--text-secondary);">${record.timestamp.toDate().toLocaleString()}</div>
            </div>
            <button class="icon-btn delete-rec-btn" data-id="${documentReference.id}"><i class="fa-solid fa-trash"></i></button>
        `;
        listWrapper.appendChild(row);
    });

    // Connect purge element query handlers
    listWrapper.querySelectorAll(".delete-rec-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const documentTargetId = btn.getAttribute("data-id");
            await deleteDoc(doc(db, "search_records", documentTargetId));
            showToastNotification("Record decoupled from matrix layer.");
        });
    });
}

// Global Core UI Alerts Display Machine
function showToastNotification(message) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// --- INITIALIZATION INTERCEPT ENGINE ---
window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js")
        .then(() => console.log("Nexus Cache Core service optimization offline structural pipelines operational."))
        .catch(err => console.error("Service worker registration exception intercepted:", err));
    }
});
  
