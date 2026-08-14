const STORAGE = {
  accounts: "playground.accounts.v2",
  session: "playground.session.v2",
  game: "playground.yacht.game.v2"
};

const categories = [
  { key: "ones", name: "Aces", rule: "1의 합", score: d => sumOfFace(d, 1) },
  { key: "twos", name: "Deuces", rule: "2의 합", score: d => sumOfFace(d, 2) },
  { key: "threes", name: "Threes", rule: "3의 합", score: d => sumOfFace(d, 3) },
  { key: "fours", name: "Fours", rule: "4의 합", score: d => sumOfFace(d, 4) },
  { key: "fives", name: "Fives", rule: "5의 합", score: d => sumOfFace(d, 5) },
  { key: "sixes", name: "Sixes", rule: "6의 합", score: d => sumOfFace(d, 6) },
  { key: "choice", name: "Choice", rule: "모든 주사위의 합", score: d => sum(d) },
  { key: "fourKind", name: "Four of a Kind", rule: "같은 숫자 4개 이상", score: scoreFourKind },
  { key: "fullHouse", name: "Full House", rule: "2개 + 3개", score: scoreFullHouse },
  { key: "smallStraight", name: "Small Straight", rule: "연속 4개 → 15점", score: scoreSmallStraight },
  { key: "largeStraight", name: "Large Straight", rule: "연속 5개 → 30점", score: scoreLargeStraight },
  { key: "yacht", name: "Yacht", rule: "5개 모두 같음 → 50점", score: scoreYacht }
];

const state = {
  page: "home",
  lobbyCount: 2,
  game: loadJSON(STORAGE.game, null),
  toastTimer: null
};

const el = id => document.getElementById(id);

const pages = {
  home: el("page-home"),
  account: el("page-account"),
  lobby: el("page-lobby"),
  game: el("page-game")
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getAccounts() {
  return loadJSON(STORAGE.accounts, {});
}

function saveAccounts(accounts) {
  saveJSON(STORAGE.accounts, accounts);
}

function getSessionUser() {
  return localStorage.getItem(STORAGE.session) || "";
}

function setSessionUser(username) {
  if (username) localStorage.setItem(STORAGE.session, username);
  else localStorage.removeItem(STORAGE.session);
  renderHeader();
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeUsername(value) {
  return value.trim().replace(/\s+/g, "");
}

function validUsername(value) {
  return /^[A-Za-z0-9가-힣_-]{3,20}$/.test(value);
}

function nowString() {
  return new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function navigate(page) {
  state.page = page;
  Object.entries(pages).forEach(([name, node]) => {
    node.classList.toggle("active", name === page);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === page);
  });

  if (page === "home") renderHome();
  if (page === "account") renderAccount();
  if (page === "lobby") renderLobby();
  if (page === "game") {
    if (!state.game || state.game.finished) {
      navigate("lobby");
      return;
    }
    renderGame();
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderHeader() {
  const user = getSessionUser();
  el("headerUserText").textContent = user || "게스트";
  el("headerAccountBtn").textContent = user ? "프로필" : "로그인";
}

function renderHome() {
  const accounts = getAccounts();
  const activePlayers = state.game && !state.game.finished ? state.game.players.length : 0;

  el("homePlayingCount").textContent = activePlayers;
  el("yachtPlayerCount").textContent = `${activePlayers}명 플레이 중`;
  el("homeAccountCount").textContent = Object.keys(accounts).length;
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.authTab === tab);
  });

  el("loginForm").classList.toggle("active", tab === "login");
  el("signupForm").classList.toggle("active", tab === "signup");
  el("authMessage").textContent = "";
}

function renderAccount() {
  const username = getSessionUser();
  el("authView").classList.toggle("hidden", Boolean(username));
  el("profileView").classList.toggle("hidden", !username);

  if (!username) return;

  const accounts = getAccounts();
  const account = accounts[username];

  if (!account) {
    setSessionUser("");
    renderAccount();
    return;
  }

  const stats = account.stats || defaultStats();
  const games = stats.wins + stats.losses + stats.draws;
  const winRate = games ? Math.round((stats.wins / games) * 1000) / 10 : 0;

  el("profileName").textContent = username;
  el("profileAvatar").textContent = username[0].toUpperCase();
  el("statGames").textContent = games;
  el("statWins").textContent = stats.wins;
  el("statLosses").textContent = stats.losses;
  el("statDraws").textContent = stats.draws;
  el("statWinRate").textContent = `${winRate}%`;

  const history = account.history || [];
  const container = el("matchHistory");
  container.innerHTML = "";

  if (!history.length) {
    container.innerHTML = `<div class="empty-state"><span>아직 경기 기록이 없습니다.</span></div>`;
    return;
  }

  history.slice(0, 12).forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";
    const resultClass =
      item.result === "승" ? "result-win" :
      item.result === "패" ? "result-loss" : "result-draw";

    row.innerHTML = `
      <div>
        <strong>Yacht Dice · ${escapeHTML(item.summary)}</strong>
        <small>${escapeHTML(item.date)}</small>
      </div>
      <strong class="${resultClass}">${item.result}</strong>
    `;
    container.appendChild(row);
  });
}

function defaultStats() {
  return { wins: 0, losses: 0, draws: 0 };
}

async function signup(event) {
  event.preventDefault();

  const username = normalizeUsername(el("signupId").value);
  const password = el("signupPassword").value;
  const confirm = el("signupPasswordConfirm").value;
  const message = el("authMessage");

  if (!validUsername(username)) {
    message.textContent = "아이디는 3–20자의 한글/영문/숫자/_/-만 사용할 수 있습니다.";
    return;
  }

  if (password.length < 4) {
    message.textContent = "비밀번호는 4자 이상이어야 합니다.";
    return;
  }

  if (password !== confirm) {
    message.textContent = "비밀번호 확인이 일치하지 않습니다.";
    return;
  }

  const accounts = getAccounts();
  if (accounts[username]) {
    message.textContent = "이미 존재하는 아이디입니다.";
    return;
  }

  accounts[username] = {
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    stats: defaultStats(),
    history: []
  };

  saveAccounts(accounts);
  setSessionUser(username);
  el("signupForm").reset();
  showToast("계정이 생성되었습니다.");
  renderAccount();
  renderHome();
}

async function login(event) {
  event.preventDefault();

  const username = normalizeUsername(el("loginId").value);
  const password = el("loginPassword").value;
  const accounts = getAccounts();
  const account = accounts[username];
  const message = el("authMessage");

  if (!account) {
    message.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
    return;
  }

  const hash = await hashPassword(password);
  if (hash !== account.passwordHash) {
    message.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
    return;
  }

  setSessionUser(username);
  el("loginForm").reset();
  message.textContent = "";
  showToast(`${username}님, 로그인되었습니다.`);
  renderAccount();
}

function renderLobby() {
  document.querySelectorAll(".count-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.count) === state.lobbyCount);
  });

  const container = el("playerNameInputs");
  const existing = [...container.querySelectorAll("input")].map(input => input.value);
  const loggedIn = getSessionUser();

  container.innerHTML = "";

  for (let i = 0; i < state.lobbyCount; i++) {
    const label = document.createElement("label");
    label.className = "player-name-field";

    const defaultValue = existing[i] || (i === 0 && loggedIn ? loggedIn : `Player ${i + 1}`);
    label.innerHTML = `
      플레이어 ${i + 1}
      <input class="player-name-input" maxlength="18" value="${escapeAttr(defaultValue)}" />
    `;
    container.appendChild(label);
  }
}

function createNewGame(names) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: Date.now(),
    players: names.map(name => ({
      name,
      scores: {}
    })),
    currentPlayer: 0,
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    hasRolled: false,
    messages: [
      {
        sender: "System",
        text: "게임이 시작되었습니다.",
        time: Date.now()
      }
    ],
    finished: false
  };
}

function startGameFromLobby() {
  const names = [...document.querySelectorAll(".player-name-input")]
    .map(input => input.value.trim());

  if (names.some(name => !name)) {
    showToast("모든 플레이어 이름을 입력하세요.");
    return;
  }

  const lowered = names.map(name => name.toLocaleLowerCase());
  if (new Set(lowered).size !== names.length) {
    showToast("플레이어 이름은 서로 달라야 합니다.");
    return;
  }

  state.game = createNewGame(names);
  saveGame();
  navigate("game");
}

function saveGame() {
  if (state.game) saveJSON(STORAGE.game, state.game);
  else localStorage.removeItem(STORAGE.game);
  renderHome();
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function sumOfFace(values, face) {
  return values.filter(value => value === face).length * face;
}

function countValues(values) {
  const map = {};
  values.forEach(value => {
    map[value] = (map[value] || 0) + 1;
  });
  return Object.values(map);
}

function scoreFourKind(values) {
  return countValues(values).some(count => count >= 4) ? sum(values) : 0;
}

function scoreFullHouse(values) {
  const counts = countValues(values).sort((a, b) => a - b);
  return counts.length === 2 && counts[0] === 2 && counts[1] === 3 ? sum(values) : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function scoreSmallStraight(values) {
  const unique = uniqueSorted(values);
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];

  return patterns.some(pattern => pattern.every(value => unique.includes(value))) ? 15 : 0;
}

function scoreLargeStraight(values) {
  const value = JSON.stringify(uniqueSorted(values));
  return value === JSON.stringify([1, 2, 3, 4, 5]) ||
         value === JSON.stringify([2, 3, 4, 5, 6]) ? 30 : 0;
}

function scoreYacht(values) {
  return new Set(values).size === 1 ? 50 : 0;
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function playerTotal(player) {
  return sum(Object.values(player.scores));
}

function renderGame() {
  const game = state.game;
  if (!game) return;

  renderPlayerStrip();
  renderDice();
  renderScoreTable();
  renderChat();
  renderGameHud();
}

function renderPlayerStrip() {
  const strip = el("playerStrip");
  strip.innerHTML = "";

  state.game.players.forEach((player, index) => {
    const chip = document.createElement("div");
    chip.className = `player-chip ${index === state.game.currentPlayer ? "active" : ""}`;
    chip.innerHTML = `
      <span class="player-chip-name">${escapeHTML(player.name)}</span>
      <span class="player-chip-score">${playerTotal(player)}점</span>
    `;
    strip.appendChild(chip);
  });
}

function renderDice() {
  const area = el("diceArea");
  area.innerHTML = "";

  state.game.dice.forEach((value, index) => {
    const button = document.createElement("button");
    button.className = `die ${state.game.held[index] ? "held" : ""}`;
    button.textContent = value;
    button.disabled = !state.game.hasRolled;
    button.setAttribute("aria-label", `${index + 1}번째 주사위 ${value}`);

    button.addEventListener("click", () => {
      if (!state.game.hasRolled) return;
      state.game.held[index] = !state.game.held[index];
      saveGame();
      renderDice();
    });

    area.appendChild(button);
  });
}

function renderScoreTable() {
  const player = state.game.players[state.game.currentPlayer];
  const table = el("scoreTable");
  table.innerHTML = "";

  categories.forEach(category => {
    const used = Object.prototype.hasOwnProperty.call(player.scores, category.key);
    const preview = state.game.hasRolled ? category.score(state.game.dice) : null;

    const button = document.createElement("button");
    button.className = `score-row ${used ? "used" : ""}`;
    button.disabled = used || !state.game.hasRolled;

    button.innerHTML = `
      <span>
        <span class="score-name">${category.name}</span>
        <span class="score-rule">${category.rule}</span>
      </span>
      <span class="score-value ${!used && state.game.hasRolled ? "score-preview" : ""}">
        ${used ? player.scores[category.key] : state.game.hasRolled ? preview : "—"}
      </span>
    `;

    if (!used) {
      button.addEventListener("click", () => chooseScore(category));
    }

    table.appendChild(button);
  });
}

function renderGameHud() {
  const game = state.game;
  const player = game.players[game.currentPlayer];
  const used = Object.keys(player.scores).length;

  el("currentPlayerText").textContent = player.name;
  el("roundText").textContent = `${Math.min(used + 1, categories.length)} / ${categories.length}`;
  el("rollsText").textContent = game.rollsLeft;
  el("scoreSheetPlayer").textContent = `${player.name}의 점수표`;
  el("totalScore").textContent = playerTotal(player);

  const rollBtn = el("rollBtn");
  rollBtn.disabled = game.rollsLeft === 0;
  rollBtn.textContent = game.hasRolled ? "다시 굴리기" : "주사위 굴리기";
}

function rollDice() {
  const game = state.game;
  if (!game || game.rollsLeft <= 0) return;

  for (let i = 0; i < game.dice.length; i++) {
    if (!game.held[i]) game.dice[i] = randomDie();
  }

  game.hasRolled = true;
  game.rollsLeft -= 1;

  el("statusText").textContent =
    game.rollsLeft > 0
      ? "고정할 주사위를 선택하거나 점수를 확정하세요."
      : "굴리기를 모두 사용했습니다. 점수 항목을 하나 선택하세요.";

  saveGame();
  renderGame();
}

function chooseScore(category) {
  const game = state.game;
  const player = game.players[game.currentPlayer];

  if (!game.hasRolled || Object.prototype.hasOwnProperty.call(player.scores, category.key)) return;

  player.scores[category.key] = category.score(game.dice);

  if (isGameComplete()) {
    finishGame();
    return;
  }

  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  resetTurn();
  game.messages.push({
    sender: "System",
    text: `${game.players[game.currentPlayer].name}님의 차례입니다.`,
    time: Date.now()
  });

  saveGame();
  el("statusText").textContent = "다음 플레이어의 차례입니다. 주사위를 굴리세요.";
  renderGame();
}

function isGameComplete() {
  return state.game.players.every(player =>
    Object.keys(player.scores).length === categories.length
  );
}

function resetTurn() {
  state.game.dice = [1, 1, 1, 1, 1];
  state.game.held = [false, false, false, false, false];
  state.game.rollsLeft = 3;
  state.game.hasRolled = false;
}

function getRankings() {
  return state.game.players
    .map(player => ({ name: player.name, score: playerTotal(player) }))
    .sort((a, b) => b.score - a.score);
}

function finishGame() {
  state.game.finished = true;
  recordLoggedInResult();
  saveGame();

  const rankings = getRankings();
  const rankingList = el("rankingList");
  rankingList.innerHTML = "";

  rankings.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ranking-row";
    row.innerHTML = `
      <strong>${index + 1}</strong>
      <span>${escapeHTML(item.name)}</span>
      <strong>${item.score}점</strong>
    `;
    rankingList.appendChild(row);
  });

  el("gameOverModal").classList.remove("hidden");
}

function recordLoggedInResult() {
  const username = getSessionUser();
  if (!username) return;

  const accounts = getAccounts();
  const account = accounts[username];
  if (!account) return;

  const player = state.game.players.find(p => p.name === username);
  if (!player) return;

  const rankings = getRankings();
  const topScore = rankings[0].score;
  const topPlayers = rankings.filter(item => item.score === topScore);
  const myScore = playerTotal(player);

  let result;
  if (myScore === topScore && topPlayers.length === 1) result = "승";
  else if (myScore === topScore) result = "무";
  else result = "패";

  account.stats ||= defaultStats();
  account.history ||= [];

  if (result === "승") account.stats.wins += 1;
  else if (result === "패") account.stats.losses += 1;
  else account.stats.draws += 1;

  account.history.unshift({
    game: "Yacht Dice",
    result,
    date: nowString(),
    summary: `${myScore}점 · ${state.game.players.length}인 경기`
  });

  account.history = account.history.slice(0, 50);
  saveAccounts(accounts);
}

function renderChat() {
  const container = el("chatMessages");
  const messages = state.game.messages || [];
  container.innerHTML = "";

  if (!messages.length) {
    container.innerHTML = `<div class="chat-empty">아직 메시지가 없습니다.</div>`;
  } else {
    messages.slice(-80).forEach(message => {
      const item = document.createElement("div");
      item.className = "chat-message";
      item.innerHTML = `
        <strong>${escapeHTML(message.sender)}</strong>
        <p>${escapeHTML(message.text)}</p>
      `;
      container.appendChild(item);
    });
  }

  el("chatCount").textContent = messages.length;
  container.scrollTop = container.scrollHeight;
}

function sendChat(event) {
  event.preventDefault();
  if (!state.game) return;

  const input = el("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const sender = state.game.players[state.game.currentPlayer].name;
  state.game.messages ||= [];
  state.game.messages.push({
    sender,
    text: text.slice(0, 120),
    time: Date.now()
  });

  input.value = "";
  saveGame();
  renderChat();
}

function leaveGame() {
  if (state.game && !state.game.finished) {
    const ok = confirm("진행 중인 게임을 나가면 현재 게임 기록이 삭제됩니다. 나가시겠습니까?");
    if (!ok) return;
  }

  state.game = null;
  saveGame();
  el("gameOverModal").classList.add("hidden");
  navigate("home");
}

function playAgain() {
  if (!state.game) return;
  const names = state.game.players.map(player => player.name);
  state.game = createNewGame(names);
  saveGame();
  el("gameOverModal").classList.add("hidden");
  navigate("game");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

// Navigation
document.querySelectorAll("[data-nav]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.nav));
});

el("headerAccountBtn").addEventListener("click", () => navigate("account"));
el("openYachtBtn").addEventListener("click", () => navigate("lobby"));

document.querySelectorAll(".auth-tab").forEach(button => {
  button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
});

el("signupForm").addEventListener("submit", signup);
el("loginForm").addEventListener("submit", login);

el("logoutBtn").addEventListener("click", () => {
  setSessionUser("");
  showToast("로그아웃되었습니다.");
  renderAccount();
});

document.querySelectorAll(".count-btn").forEach(button => {
  button.addEventListener("click", () => {
    state.lobbyCount = Number(button.dataset.count);
    renderLobby();
  });
});

el("startYachtBtn").addEventListener("click", startGameFromLobby);
el("rollBtn").addEventListener("click", rollDice);
el("chatForm").addEventListener("submit", sendChat);
el("leaveGameBtn").addEventListener("click", leaveGame);
el("playAgainBtn").addEventListener("click", playAgain);
el("finishGameBtn").addEventListener("click", () => {
  state.game = null;
  saveGame();
  el("gameOverModal").classList.add("hidden");
  navigate("home");
});

// Keep multiple tabs in the same browser reasonably in sync.
window.addEventListener("storage", event => {
  if (event.key === STORAGE.accounts || event.key === STORAGE.session) {
    renderHeader();
    if (state.page === "account") renderAccount();
    if (state.page === "home") renderHome();
  }

  if (event.key === STORAGE.game) {
    state.game = loadJSON(STORAGE.game, null);
    if (state.page === "game" && state.game && !state.game.finished) renderGame();
    if (state.page === "home") renderHome();
  }
});

renderHeader();
renderLobby();
renderHome();
navigate("home");
