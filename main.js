// ============================================================
// 1) 아래 두 값만 본인의 Supabase 프로젝트 값으로 바꾸세요.
//    절대로 secret/service_role key를 넣지 마세요.
// ============================================================
const SUPABASE_URL = "https://akkuwwgfgyaebgliwlvq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_goBkoCRpnUs039fZXCY8ag_HYUu8aR6";

const IS_CONFIGURED =
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

const db = IS_CONFIGURED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const categories = [
  { key: "ones", name: "Aces", rule: "1의 합" },
  { key: "twos", name: "Deuces", rule: "2의 합" },
  { key: "threes", name: "Threes", rule: "3의 합" },
  { key: "fours", name: "Fours", rule: "4의 합" },
  { key: "fives", name: "Fives", rule: "5의 합" },
  { key: "sixes", name: "Sixes", rule: "6의 합" },
  { key: "choice", name: "Choice", rule: "모든 주사위의 합" },
  { key: "fourKind", name: "Four of a Kind", rule: "같은 숫자 4개 이상" },
  { key: "fullHouse", name: "Full House", rule: "2개 + 3개" },
  { key: "smallStraight", name: "Small Straight", rule: "연속 4개 → 15점" },
  { key: "largeStraight", name: "Large Straight", rule: "연속 5개 → 30점" },
  { key: "yacht", name: "Yacht", rule: "5개 모두 같음 → 50점" }
];

const state = {
  page: "home",
  maxPlayers: 4,
  session: null,
  profile: null,
  activeRoom: null,
  roomPlayers: [],
  gameState: null,
  scores: [],
  messages: [],
  presenceChannel: null,
  roomChannel: null,
  roomChannelRoomId: null,
  toastTimer: null,
  busy: false
};

const el = id => document.getElementById(id);

const pages = {
  home: el("page-home"),
  account: el("page-account"),
  lobby: el("page-lobby"),
  game: el("page-game")
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function setBusy(value) {
  state.busy = value;
  document.querySelectorAll("button").forEach(button => {
    if (button.dataset.alwaysEnabled === "true") return;
    if (button.classList.contains("nav-btn") || button.classList.contains("brand")) return;
  });
}

function requireConfigured() {
  if (IS_CONFIGURED) return true;
  el("setupModal").classList.remove("hidden");
  return false;
}

function normalizeUsername(value) {
  return value.trim().replace(/\s+/g, "");
}

function validUsername(value) {
  return /^[A-Za-z0-9가-힣_-]{3,20}$/.test(value);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function usernameToInternalEmail(username) {
  const normalized = normalizeUsername(username).toLocaleLowerCase();
  const hash = await sha256Hex(normalized);
  return `u_${hash.slice(0, 40)}@playground.example.com`;
}

function currentUserId() {
  return state.session?.user?.id || null;
}

function isLoggedIn() {
  return Boolean(currentUserId());
}

function currentUsername() {
  return state.profile?.username || "게스트";
}

function navigate(page) {
  if ((page === "lobby" || page === "game") && !isLoggedIn()) {
    page = "account";
    showToast("온라인 게임은 로그인 후 이용할 수 있습니다.");
  }

  state.page = page;

  Object.entries(pages).forEach(([name, node]) => {
    node.classList.toggle("active", name === page);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === page);
  });

  if (page === "home") refreshHome();
  if (page === "account") renderAccount();
  if (page === "lobby") refreshLobby();
  if (page === "game") {
    if (!state.activeRoom || state.activeRoom.status !== "playing") {
      navigate("lobby");
      return;
    }
    enterGameRoom();
  }

  updatePresence();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderHeader() {
  el("headerUserText").textContent = currentUsername();
  el("headerAccountBtn").textContent = isLoggedIn() ? "프로필" : "로그인";
}

function setConnectionBadge(ok, text) {
  const badge = el("connectionBadge");
  badge.textContent = text;
  badge.classList.toggle("connection-ok", ok);
  badge.classList.toggle("connection-error", !ok);
}

async function init() {
  if (!requireConfigured()) {
    setConnectionBadge(false, "SETUP REQUIRED");
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  state.session = session;

  if (session) await loadProfile();

  db.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) await loadProfile();
    else state.profile = null;

    renderHeader();
    renderAccount();
    await refreshHome();

    if (!session && (state.page === "lobby" || state.page === "game")) {
      cleanupRoomChannel();
      navigate("account");
    }

    updatePresence();
  });

  await initPresence();
  renderHeader();
  setConnectionBadge(true, "ONLINE");
  await refreshHome();

  if (session) {
    await refreshActiveRoom();
  }

  navigate("home");
}

async function initPresence() {
  const presenceKey =
    sessionStorage.getItem("playground_presence_key") ||
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random()}`;

  sessionStorage.setItem("playground_presence_key", presenceKey);

  state.presenceChannel = db.channel("playground-global", {
    config: { presence: { key: presenceKey } }
  });

  state.presenceChannel
    .on("presence", { event: "sync" }, () => {
      const presence = state.presenceChannel.presenceState();
      const entries = Object.values(presence).flat();
      const playingUsers = new Set(
        entries
          .filter(item => item.page === "game" && item.user_id)
          .map(item => item.user_id)
      );
      const playing = playingUsers.size;
      el("homePlayingCount").textContent = playing;
      el("yachtPlayerCount").textContent = `${playing}명 플레이 중`;
    })
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await updatePresence();
      }
    });
}

async function renderAccount() {
  el("authView").classList.toggle("hidden", isLoggedIn());
  el("profileView").classList.toggle("hidden", !isLoggedIn());

  if (!isLoggedIn()) return;

  if (!state.profile) await loadProfile();
  if (!state.profile) return;

  const { wins, losses, draws, username } = state.profile;
  const games = wins + losses + draws;
  const winRate = games
    ? Math.round((wins / games) * 1000) / 10
    : 0;

  el("profileName").textContent = username;
  el("profileAvatar").textContent =
    username[0]?.toUpperCase() || "P";

  el("statGames").textContent = games;
  el("statWins").textContent = wins;
  el("statLosses").textContent = losses;
  el("statDraws").textContent = draws;
  el("statWinRate").textContent = `${winRate}%`;

  const { data: history, error } = await db
    .from("match_history")
    .select("result, score, player_count, created_at")
    .eq("user_id", currentUserId())
    .order("created_at", { ascending: false })
    .limit(20);

  const container = el("matchHistory");
  container.innerHTML = "";

  if (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty-state">
        <span>경기 기록을 불러오지 못했습니다.</span>
      </div>
    `;

    return;
  }

  if (!history?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>아직 경기 기록이 없습니다.</span>
      </div>
    `;

    return;
  }

  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const label =
      item.result === "win"
        ? "승"
        : item.result === "loss"
          ? "패"
          : "무";

    const resultClass =
      item.result === "win"
        ? "result-win"
        : item.result === "loss"
          ? "result-loss"
          : "result-draw";

    row.innerHTML = `
      <div>
        <strong>
          Yacht Dice · ${item.score}점 ·
          ${item.player_count}인 경기
        </strong>
        <small>
          ${new Date(item.created_at).toLocaleString("ko-KR")}
        </small>
      </div>

      <strong class="${resultClass}">
        ${label}
      </strong>
    `;

    container.appendChild(row);
  });
}

async function updatePresence() {
  if (!state.presenceChannel) return;

  try {
    await state.presenceChannel.track({
      page: state.page,
      user_id: currentUserId(),
      username: currentUsername(),
      room_id: state.activeRoom?.id || null,
      updated_at: new Date().toISOString()
    });
  } catch {
    // Presence failure must not block gameplay.
  }
}

async function refreshHome() {
  if (!IS_CONFIGURED) return;

  try {
    const { data, error } = await db.rpc("get_public_stats");
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    el("homeAccountCount").textContent = row?.total_accounts ?? 0;
    setConnectionBadge(true, "ONLINE");
  } catch (error) {
    console.error(error);
    setConnectionBadge(false, "DB ERROR");
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.authTab === tab);
  });

  el("loginForm").classList.toggle("active", tab === "login");
  el("signupForm").classList.toggle("active", tab === "signup");
  el("authMessage").textContent = "";
}

async function loadProfile() {
  if (!isLoggedIn()) {
    state.profile = null;
    return;
  }

  let { data, error } = await db
    .from("profiles")
    .select("id, username, wins, losses, draws")
    .eq("id", currentUserId())
    .maybeSingle();

  if (!error && !data) {
    const repair = await db.rpc("ensure_my_profile");

    if (repair.error) {
      console.error("ensure_my_profile failed:", repair.error);
      state.profile = null;
      return;
    }

    const retry = await db
      .from("profiles")
      .select("id, username, wins, losses, draws")
      .eq("id", currentUserId())
      .maybeSingle();

    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    console.error("profile load failed:", error);
    state.profile = null;
    return;
  }

  state.profile = data;
}

async function ensureProfileReady() {
  if (!isLoggedIn()) {
    throw new Error("로그인이 필요합니다.");
  }

  if (state.profile?.id === currentUserId()) {
    return state.profile;
  }

  await loadProfile();

  if (!state.profile) {
    const { error } = await db.rpc("ensure_my_profile");
    if (error) throw error;
    await loadProfile();
  }

  if (!state.profile) {
    throw new Error(
      "사용자 프로필을 준비하지 못했습니다. Supabase DB 패치를 적용해 주세요."
    );
  }

  return state.profile;
}

function roomErrorMessage(error) {
  const message = error?.message || "";

  if (
    message.includes("Could not find the function") ||
    message.includes("schema cache") ||
    message.includes("ensure_my_profile")
  ) {
    return "Supabase의 방 생성 함수가 설치되지 않았습니다. supabase_room_fix.sql을 실행해 주세요.";
  }

  if (
    message.includes("foreign key") ||
    message.includes("profiles") ||
    message.includes("profile")
  ) {
    return "계정 프로필 연결에 문제가 있습니다. DB 복구 패치를 적용한 뒤 다시 로그인해 주세요.";
  }

  if (message.includes("active room")) {
    return "이미 참가 중인 대기방 또는 진행 중인 게임이 있습니다.";
  }

  if (message.includes("login required") || message.includes("JWT")) {
    return "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.";
  }

  return message || "방을 만들지 못했습니다.";
}

async function signup(event) {
  event.preventDefault();
  if (!requireConfigured()) return;

  const username = normalizeUsername(el("signupId").value);
  const password = el("signupPassword").value;
  const confirmPassword = el("signupPasswordConfirm").value;
  const message = el("authMessage");

  message.textContent = "";

  if (!validUsername(username)) {
    message.textContent = "아이디는 3–20자의 한글/영문/숫자/_/-만 사용할 수 있습니다.";
    return;
  }

  if (password.length < 8) {
    message.textContent = "비밀번호는 8자 이상으로 설정하세요.";
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = "비밀번호 확인이 일치하지 않습니다.";
    return;
  }

  try {
    const email = await usernameToInternalEmail(username);

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;

    if (!data.session) {
      message.textContent =
        "계정은 생성되었지만 로그인 세션이 없습니다. Supabase에서 Confirm email을 꺼야 합니다.";
      return;
    }

    el("signupForm").reset();
    showToast("계정이 생성되었습니다.");
    await loadProfile();
    renderHeader();
    await renderAccount();
  } catch (error) {
    console.error(error);
    message.textContent =
      error.message?.includes("Database error")
        ? "이미 사용 중인 아이디이거나 DB 설정을 확인해야 합니다."
        : (error.message || "계정을 만들지 못했습니다.");
  }
}

async function login(event) {
  event.preventDefault();
  if (!requireConfigured()) return;

  const username = normalizeUsername(el("loginId").value);
  const password = el("loginPassword").value;
  const message = el("authMessage");

  message.textContent = "";

  try {
    const email = await usernameToInternalEmail(username);
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;

    el("loginForm").reset();
    showToast(`${username}님, 로그인되었습니다.`);
  } catch (error) {
    console.error(error);
    message.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
  }
}

async function logout() {
  cleanupRoomChannel();
  state.activeRoom = null;
  state.roomPlayers = [];
  state.gameState = null;
  state.scores = [];
  state.messages = [];
  await db.auth.signOut();
  navigate("home");
}

async function refreshActiveRoom() {
  if (!isLoggedIn()) {
    state.activeRoom = null;
    return null;
  }

  const { data, error } = await db.rpc("get_my_active_room");
  if (error) {
    console.error(error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  state.activeRoom = row?.room_id ? {
    id: row.room_id,
    code: row.room_code,
    status: row.room_status,
    maxPlayers: row.max_players,
    hostId: row.host_id
  } : null;

  return state.activeRoom;
}

async function refreshLobby() {
  if (!isLoggedIn()) return;

  await refreshActiveRoom();

  const hasRoom = Boolean(state.activeRoom);
  el("lobbyActions").classList.toggle("hidden", hasRoom);
  el("activeRoomPanel").classList.toggle("hidden", !hasRoom);

  document.querySelectorAll(".count-btn").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.count) === state.maxPlayers);
  });

  if (!hasRoom) {
    cleanupRoomChannel();
    return;
  }

  await subscribeRoom(state.activeRoom.id);
  await loadRoomPlayers();
  renderActiveRoom();

  if (state.activeRoom.status === "playing") {
    el("resumeRoomBtn").classList.remove("hidden");
  }
}

async function createRoom() {
  if (state.busy) return;

  if (!isLoggedIn()) {
    navigate("account");
    showToast("로그인 후 방을 만들 수 있습니다.");
    return;
  }

  state.busy = true;

  const button = el("createRoomBtn");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "방 만드는 중...";

  try {
    await ensureProfileReady();

    const { data, error } = await db.rpc("create_yacht_room", {
      p_max_players: state.maxPlayers
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.room_id || !row?.room_code) {
      throw new Error("서버가 올바른 방 정보를 반환하지 않았습니다.");
    }

    state.activeRoom = {
      id: row.room_id,
      code: row.room_code,
      status: "waiting",
      maxPlayers: state.maxPlayers,
      hostId: currentUserId()
    };

    showToast(`방 ${row.room_code}이 생성되었습니다.`);

    await refreshLobby();
    await updatePresence();

  } catch (error) {
    console.error("createRoom failed:", error);
    showToast(roomErrorMessage(error));

  } finally {
    state.busy = false;
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function joinRoom(event) {
  event.preventDefault();
  if (state.busy) return;

  const code = el("roomCodeInput").value.trim().toUpperCase();
  if (!/^[A-F0-9]{6}$/.test(code)) {
    showToast("6자리 방 코드를 입력하세요.");
    return;
  }

  state.busy = true;

  try {
    await ensureProfileReady();
  
    const { error } = await db.rpc("join_yacht_room", {
      p_room_code: code
    });

    if (error) throw error;

    el("joinRoomForm").reset();
    showToast("방에 입장했습니다.");
    await refreshLobby();
  } catch (error) {
    console.error(error);
    showToast(
      roomErrorMessage(error).replace("방을 만들지", "방에 입장하지")
    );
  } finally {
    state.busy = false;
  }
}

async function loadRoomPlayers() {
  if (!state.activeRoom) return;

  const { data, error } = await db
    .from("room_players")
    .select("seat, user_id, profiles(username)")
    .eq("room_id", state.activeRoom.id)
    .order("seat", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.roomPlayers = (data || []).map(row => ({
    seat: row.seat,
    userId: row.user_id,
    username: row.profiles?.username || "Player"
  }));
}

function renderActiveRoom() {
  if (!state.activeRoom) return;

  const room = state.activeRoom;
  const isHost = room.hostId === currentUserId();

  el("roomCodeText").textContent = room.code;
  el("roomStatusBadge").textContent = room.status.toUpperCase();
  el("roomCapacityText").textContent =
    `${state.roomPlayers.length} / ${room.maxPlayers}명`;

  const container = el("roomPlayerList");
  container.innerHTML = "";

  state.roomPlayers.forEach(player => {
    const row = document.createElement("div");
    row.className = `room-player-row ${player.userId === currentUserId() ? "me" : ""}`;
    row.innerHTML = `
      <span class="room-player-seat">${player.seat}</span>
      <strong>${escapeHTML(player.username)}</strong>
      <small>${player.userId === room.hostId ? "HOST" : ""}</small>
    `;
    container.appendChild(row);
  });

  const canStart =
    room.status === "waiting" &&
    isHost &&
    state.roomPlayers.length >= 2;

  el("startRoomBtn").classList.toggle("hidden", !canStart);
  el("resumeRoomBtn").classList.toggle("hidden", room.status !== "playing");
  el("leaveRoomBtn").classList.toggle("hidden", room.status === "playing");
}

async function startRoom() {
  if (!state.activeRoom || state.busy) return;

  state.busy = true;
  try {
    const { error } = await db.rpc("start_yacht_room", {
      p_room_id: state.activeRoom.id
    });

    if (error) throw error;

    await refreshActiveRoom();
    await loadRoomPlayers();
    navigate("game");
  } catch (error) {
    console.error(error);
    showToast(error.message || "게임을 시작하지 못했습니다.");
  } finally {
    state.busy = false;
  }
}

async function leaveWaitingRoom() {
  if (!state.activeRoom) return;

  try {
    const { error } = await db.rpc("leave_yacht_room", {
      p_room_id: state.activeRoom.id
    });

    if (error) throw error;

    cleanupRoomChannel();
    state.activeRoom = null;
    state.roomPlayers = [];
    showToast("방에서 나왔습니다.");
    await refreshLobby();
  } catch (error) {
    console.error(error);
    showToast(error.message || "방에서 나가지 못했습니다.");
  }
}

async function subscribeRoom(roomId) {
  if (state.roomChannel && state.roomChannelRoomId === roomId) return;

  cleanupRoomChannel();

  state.roomChannel = db
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      async payload => {
        if (payload.new?.status) {
          state.activeRoom = {
            ...state.activeRoom,
            status: payload.new.status,
            code: payload.new.code,
            maxPlayers: payload.new.max_players,
            hostId: payload.new.host_id
          };
        }
        await handleRoomRefresh();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
      handleRoomRefresh
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_states", filter: `room_id=eq.${roomId}` },
      handleGameRefresh
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "yacht_scores", filter: `room_id=eq.${roomId}` },
      handleGameRefresh
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      payload => {
        if (!state.messages.some(message => message.id === payload.new.id)) {
          state.messages.push(payload.new);
          renderChat();
        }
      }
    )
    .subscribe();

  state.roomChannelRoomId = roomId;
}

function cleanupRoomChannel() {
  if (state.roomChannel && db) {
    db.removeChannel(state.roomChannel);
  }
  state.roomChannel = null;
  state.roomChannelRoomId = null;
}

async function handleRoomRefresh() {
  if (!state.activeRoom) return;

  const roomId = state.activeRoom.id;
  const { data: room, error } = await db
    .from("rooms")
    .select("id, code, status, max_players, host_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!room) {
    cleanupRoomChannel();
    state.activeRoom = null;
    state.roomPlayers = [];
    if (state.page === "game") navigate("home");
    else if (state.page === "lobby") refreshLobby();
    return;
  }

  state.activeRoom = {
    id: room.id,
    code: room.code,
    status: room.status,
    maxPlayers: room.max_players,
    hostId: room.host_id
  };

  await loadRoomPlayers();

  if (state.page === "lobby") {
    renderActiveRoom();
    if (state.activeRoom.status === "playing") {
      navigate("game");
      return;
    }
  }

  if (state.page === "game") {
    await loadGameData();
    renderGame();
  }
}

async function enterGameRoom() {
  if (!state.activeRoom) return;

  await subscribeRoom(state.activeRoom.id);
  await loadRoomPlayers();
  await loadGameData();
  await loadMessages();
  renderGame();
  updatePresence();
}

async function loadGameData() {
  if (!state.activeRoom) return;

  const [stateResult, scoreResult] = await Promise.all([
    db
      .from("game_states")
      .select("room_id, current_seat, dice, held, rolls_left, has_rolled, finished, updated_at")
      .eq("room_id", state.activeRoom.id)
      .single(),
    db
      .from("yacht_scores")
      .select("user_id, category, score")
      .eq("room_id", state.activeRoom.id)
  ]);

  if (stateResult.error) {
    console.error(stateResult.error);
    return;
  }

  if (scoreResult.error) {
    console.error(scoreResult.error);
    return;
  }

  state.gameState = stateResult.data;
  state.scores = scoreResult.data || [];

  if (state.gameState.finished || state.activeRoom.status === "finished") {
    await showGameOver();
  }
}

function currentTurnPlayer() {
  if (!state.gameState) return null;
  return state.roomPlayers.find(player => player.seat === state.gameState.current_seat) || null;
}

function isMyTurn() {
  return currentTurnPlayer()?.userId === currentUserId();
}

function playerScoreMap(userId) {
  const map = {};
  state.scores
    .filter(row => row.user_id === userId)
    .forEach(row => { map[row.category] = row.score; });
  return map;
}

function totalFor(userId) {
  return state.scores
    .filter(row => row.user_id === userId)
    .reduce((sum, row) => sum + row.score, 0);
}

function renderGame() {
  if (!state.gameState) return;

  el("gameRoomCode").textContent = state.activeRoom?.code || "------";

  renderPlayerStrip();
  renderDice();
  renderScoreTable();
  renderGameHud();
  renderChat();
}

function renderPlayerStrip() {
  const strip = el("playerStrip");
  strip.innerHTML = "";

  state.roomPlayers.forEach(player => {
    const chip = document.createElement("div");
    chip.className =
      `player-chip ${player.seat === state.gameState.current_seat ? "active" : ""}`;

    chip.innerHTML = `
      <span class="player-chip-name">${escapeHTML(player.username)}</span>
      <span class="player-chip-score">${totalFor(player.userId)}점</span>
    `;
    strip.appendChild(chip);
  });
}

function renderDice() {
  const area = el("diceArea");
  area.innerHTML = "";

  (state.gameState.dice || [1, 1, 1, 1, 1]).forEach((value, index) => {
    const button = document.createElement("button");
    button.className = `die ${state.gameState.held?.[index] ? "held" : ""}`;
    button.textContent = value;
    button.disabled = !isMyTurn() || !state.gameState.has_rolled || state.gameState.finished;

    button.addEventListener("click", async () => {
      if (!isMyTurn() || state.busy) return;
      state.busy = true;
      try {
        const { error } = await db.rpc("toggle_yacht_hold", {
          p_room_id: state.activeRoom.id,
          p_die_index: index + 1
        });
        if (error) throw error;
      } catch (error) {
        console.error(error);
        showToast(error.message || "주사위를 고정하지 못했습니다.");
      } finally {
        state.busy = false;
      }
    });

    area.appendChild(button);
  });
}

function previewScore(category, dice) {
  const counts = new Map();
  dice.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  const sum = dice.reduce((a, b) => a + b, 0);
  const unique = [...new Set(dice)].sort((a, b) => a - b);

  if (category === "ones") return dice.filter(v => v === 1).length;
  if (category === "twos") return dice.filter(v => v === 2).length * 2;
  if (category === "threes") return dice.filter(v => v === 3).length * 3;
  if (category === "fours") return dice.filter(v => v === 4).length * 4;
  if (category === "fives") return dice.filter(v => v === 5).length * 5;
  if (category === "sixes") return dice.filter(v => v === 6).length * 6;
  if (category === "choice") return sum;
  if (category === "fourKind") return [...counts.values()].some(v => v >= 4) ? sum : 0;
  if (category === "fullHouse") {
    const c = [...counts.values()].sort((a, b) => a - b);
    return c.length === 2 && c[0] === 2 && c[1] === 3 ? sum : 0;
  }
  if (category === "smallStraight") {
    return (
      [1,2,3,4].every(v => unique.includes(v)) ||
      [2,3,4,5].every(v => unique.includes(v)) ||
      [3,4,5,6].every(v => unique.includes(v))
    ) ? 15 : 0;
  }
  if (category === "largeStraight") {
    const s = JSON.stringify(unique);
    return s === JSON.stringify([1,2,3,4,5]) ||
           s === JSON.stringify([2,3,4,5,6]) ? 30 : 0;
  }
  if (category === "yacht") return counts.size === 1 ? 50 : 0;
  return 0;
}

function renderScoreTable() {
  const player = currentTurnPlayer();
  const table = el("scoreTable");
  table.innerHTML = "";
  if (!player) return;

  const scoreMap = playerScoreMap(player.userId);

  categories.forEach(category => {
    const used = Object.prototype.hasOwnProperty.call(scoreMap, category.key);
    const canChoose =
      isMyTurn() &&
      state.gameState.has_rolled &&
      !used &&
      !state.gameState.finished;

    const preview = state.gameState.has_rolled
      ? previewScore(category.key, state.gameState.dice)
      : null;

    const button = document.createElement("button");
    button.className = `score-row ${used ? "used" : ""}`;
    button.disabled = !canChoose;

    button.innerHTML = `
      <span>
        <span class="score-name">${category.name}</span>
        <span class="score-rule">${category.rule}</span>
      </span>
      <span class="score-value ${canChoose ? "score-preview" : ""}">
        ${used ? scoreMap[category.key] : state.gameState.has_rolled ? preview : "—"}
      </span>
    `;

    if (canChoose) {
      button.addEventListener("click", () => chooseScore(category.key));
    }

    table.appendChild(button);
  });
}

function renderGameHud() {
  const player = currentTurnPlayer();
  if (!player) return;

  const used = Object.keys(playerScoreMap(player.userId)).length;

  el("currentPlayerText").textContent = player.username;
  el("roundText").textContent = `${Math.min(used + 1, 12)} / 12`;
  el("rollsText").textContent = state.gameState.rolls_left;
  el("scoreSheetPlayer").textContent = `${player.username}의 점수표`;
  el("totalScore").textContent = totalFor(player.userId);

  const rollBtn = el("rollBtn");
  rollBtn.disabled =
    !isMyTurn() ||
    state.gameState.rolls_left <= 0 ||
    state.gameState.finished;

  rollBtn.textContent = state.gameState.has_rolled ? "다시 굴리기" : "주사위 굴리기";

  if (state.gameState.finished) {
    el("statusText").textContent = "게임이 종료되었습니다.";
  } else if (isMyTurn()) {
    el("statusText").textContent =
      state.gameState.rolls_left > 0
        ? "자신의 차례입니다."
        : "굴리기를 모두 사용했습니다. 점수 항목을 선택하세요.";
  } else {
    el("statusText").textContent = `${player.username}님의 차례를 기다리는 중입니다.`;
  }
}

async function rollDice() {
  if (!state.activeRoom || state.busy || !isMyTurn()) return;

  state.busy = true;
  try {
    const { error } = await db.rpc("roll_yacht_dice", {
      p_room_id: state.activeRoom.id
    });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    showToast(error.message || "주사위를 굴리지 못했습니다.");
  } finally {
    state.busy = false;
  }
}

async function chooseScore(category) {
  if (!state.activeRoom || state.busy || !isMyTurn()) return;

  state.busy = true;
  try {
    const { error } = await db.rpc("choose_yacht_score", {
      p_room_id: state.activeRoom.id,
      p_category: category
    });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    showToast(error.message || "점수를 확정하지 못했습니다.");
  } finally {
    state.busy = false;
  }
}

async function handleGameRefresh() {
  if (!state.activeRoom) return;
  await loadGameData();
  if (state.page === "game") renderGame();
}

async function loadMessages() {
  if (!state.activeRoom) return;

  const { data, error } = await db
    .from("messages")
    .select("id, room_id, sender_id, sender_name, body, created_at")
    .eq("room_id", state.activeRoom.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  state.messages = data || [];
}

function renderChat() {
  const container = el("chatMessages");
  container.innerHTML = "";

  if (!state.messages.length) {
    container.innerHTML = `<div class="chat-empty">아직 메시지가 없습니다.</div>`;
  } else {
    state.messages.forEach(message => {
      const item = document.createElement("div");
      item.className = "chat-message";
      item.innerHTML = `
        <strong>${escapeHTML(message.sender_name)}</strong>
        <p>${escapeHTML(message.body)}</p>
      `;
      container.appendChild(item);
    });
  }

  el("chatCount").textContent = state.messages.length;
  container.scrollTop = container.scrollHeight;
}

async function sendChat(event) {
  event.preventDefault();
  if (!state.activeRoom) return;

  const input = el("chatInput");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";

  try {
    const { error } = await db.rpc("send_room_message", {
      p_room_id: state.activeRoom.id,
      p_body: body
    });

    if (error) throw error;
  } catch (error) {
    console.error(error);
    showToast(error.message || "메시지를 보내지 못했습니다.");
  }
}

async function showGameOver() {
  if (!state.activeRoom) return;

  const { data, error } = await db.rpc("get_yacht_rankings", {
    p_room_id: state.activeRoom.id
  });

  if (error) {
    console.error(error);
    return;
  }

  const list = el("rankingList");
  list.innerHTML = "";

  (data || []).forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "ranking-row";
    item.innerHTML = `
      <strong>${index + 1}</strong>
      <span>${escapeHTML(row.username)}</span>
      <strong>${row.total_score}점</strong>
    `;
    list.appendChild(item);
  });

  el("gameOverModal").classList.remove("hidden");
  await loadProfile();
  if (state.page === "account") await renderAccount();
}

async function copyRoomCode() {
  if (!state.activeRoom) return;
  try {
    await navigator.clipboard.writeText(state.activeRoom.code);
    showToast("방 코드를 복사했습니다.");
  } catch {
    showToast(`방 코드: ${state.activeRoom.code}`);
  }
}

function leaveGameScreen() {
  el("gameOverModal").classList.add("hidden");
  navigate("home");
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
el("logoutBtn").addEventListener("click", logout);

document.querySelectorAll(".count-btn").forEach(button => {
  button.addEventListener("click", () => {
    state.maxPlayers = Number(button.dataset.count);
    document.querySelectorAll(".count-btn").forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.count) === state.maxPlayers);
    });
  });
});

el("createRoomBtn").addEventListener("click", createRoom);
el("joinRoomForm").addEventListener("submit", joinRoom);
el("copyRoomCodeBtn").addEventListener("click", copyRoomCode);
el("startRoomBtn").addEventListener("click", startRoom);
el("resumeRoomBtn").addEventListener("click", () => navigate("game"));
el("leaveRoomBtn").addEventListener("click", leaveWaitingRoom);

el("rollBtn").addEventListener("click", rollDice);
el("chatForm").addEventListener("submit", sendChat);
el("leaveGameBtn").addEventListener("click", leaveGameScreen);
el("finishGameBtn").addEventListener("click", leaveGameScreen);

window.addEventListener("beforeunload", () => {
  if (state.presenceChannel) state.presenceChannel.untrack();
});

init();
