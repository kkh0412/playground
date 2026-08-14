// ============================================================
// 1) 아래 두 값만 본인의 Supabase 프로젝트 값으로 바꾸세요.
//    절대로 secret/service_role key를 넣지 마세요.
// ============================================================
const SUPABASE_URL = "https://akkuwwgfgyaebgliwlvq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_goBkoCRpnUs039fZXCY8ag_HYUu8aR6";

const IS_CONFIGURED =
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

const MANUAL_SESSION_BACKUP_KEY =
  "playground_supabase_session_backup_v13";

const db = IS_CONFIGURED
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: window.localStorage
        }
      }
    )
  : null;

function saveManualSessionBackup(session) {
  if (!session?.access_token || !session?.refresh_token) return;

  try {
    localStorage.setItem(
      MANUAL_SESSION_BACKUP_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || null
      })
    );
  } catch (error) {
    console.error("manual session backup:", error);
  }
}

function readManualSessionBackup() {
  try {
    const raw = localStorage.getItem(MANUAL_SESSION_BACKUP_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw);

    if (!saved?.access_token || !saved?.refresh_token) {
      return null;
    }

    return saved;
  } catch (error) {
    console.error("manual session read:", error);
    return null;
  }
}

function clearManualSessionBackup() {
  try {
    localStorage.removeItem(MANUAL_SESSION_BACKUP_KEY);
  } catch {}
}

async function restoreAuthSession() {
  // 1. First use Supabase's own persisted browser session.
  try {
    const {
      data: { session },
      error
    } = await db.auth.getSession();

    if (error) {
      console.error("getSession on boot:", error);
    }

    if (session) {
      saveManualSessionBackup(session);
      return session;
    }
  } catch (error) {
    console.error("getSession on boot:", error);
  }

  // 2. Fallback to the exact token pair saved at the last successful auth
  //    event. setSession will refresh the pair if the access token expired.
  const saved = readManualSessionBackup();
  if (!saved) return null;

  try {
    const { data, error } = await db.auth.setSession({
      access_token: saved.access_token,
      refresh_token: saved.refresh_token
    });

    if (error) {
      console.error("manual setSession restore:", error);

      const message = String(error.message || "").toLowerCase();

      // Only erase the backup when Supabase explicitly says the token pair
      // is invalid. Network/transient failures must not log the player out.
      if (
        message.includes("refresh token") &&
        (
          message.includes("invalid") ||
          message.includes("not found") ||
          message.includes("already used")
        )
      ) {
        clearManualSessionBackup();
      }

      return null;
    }

    if (data?.session) {
      saveManualSessionBackup(data.session);
      return data.session;
    }
  } catch (error) {
    // Keep backup on a transient network problem.
    console.error("manual session restore exception:", error);
  }

  return null;
}

const PAGE_STORAGE_KEY = "playground_current_page_v3";
const SPECTATOR_STORAGE_KEY = "playground_spectator_room_v3";

const LANGUAGE_STORAGE_KEY = "playground_language_v1";
const STATIC_I18N = [[".brand > span:last-child", "대관령산양의 놀이터", "DGL Goral Playground", "text"], [".main-nav [data-nav=\"home\"]", "홈", "Home", "text"], [".main-nav [data-nav=\"account\"]", "내 계정", "Account", "text"], ["#adminNavBtn", "관리자", "Admin", "text"], [".hero-panel .eyebrow", "대관령산양 제작 놀이터", "PLAYGROUND BY DGL GORAL", "text"], [".hero-panel h1", "대관령산양의<br />놀이터", "DGL GORAL<br />PLAYGROUND", "html"], [".hero-copy", "공개방에서 새로운 사람을 만나거나, 비공개방에서 친구들과 실시간으로 플레이하세요.", "Meet new players in public rooms or play with friends in private rooms in real time.", "text"], [".hero-stats article:nth-of-type(1) span", "현재 플레이 중", "Playing now", "text"], [".hero-stats article:nth-of-type(1) small", "실시간 접속 기준", "Real-time presence", "text"], [".hero-stats article:nth-of-type(2) span", "등록된 계정", "Registered accounts", "text"], [".hero-stats article:nth-of-type(2) small", "놀이터 전체", "Across Playground", "text"], ["#page-home .section-block:nth-of-type(2) .eyebrow", "게임", "GAMES", "text"], ["#page-home .section-block:nth-of-type(2) h2", "게임 선택", "Choose a game", "text"], [".game-card.featured h3", "요트 다이스", "Yacht Dice", "text"], [".game-card.featured .game-card-body > p", "2–4명이 각자의 기기에서 접속해 즐기는 온라인 턴제 주사위 게임입니다.", "An online turn-based dice game for 2–4 players on separate devices.", "text"], ["#openYachtBtn", "게임방으로", "Open rooms", "text"], [".game-card:nth-of-type(2) .game-meta", "준비 중", "Coming soon", "text"], [".game-card:nth-of-type(2) h3", "체스", "Chess", "text"], [".game-card:nth-of-type(2) .game-card-body > p", "친구와 즐기는 클래식 체스.", "Classic chess with a friend.", "text"], [".game-card:nth-of-type(2) button", "준비 중", "Coming soon", "text"], [".game-card:nth-of-type(3) .game-meta", "준비 중", "Coming soon", "text"], [".game-card:nth-of-type(3) h3", "카드 게임", "Card Game", "text"], [".game-card:nth-of-type(3) .game-card-body > p", "다음 미니게임을 위한 자리입니다.", "Reserved for the next mini game.", "text"], [".game-card:nth-of-type(3) button", "준비 중", "Coming soon", "text"], [".home-chat-section .eyebrow", "전체 채팅", "GLOBAL CHAT", "text"], [".home-chat-section h2", "전체 채팅", "Global chat", "text"], ["#globalChatForm > button", "전송", "Send", "text"], ["#globalChatLoginHint", "로그인하면 전체 채팅에 참여할 수 있습니다.", "Sign in to join the global chat.", "text"], [".feedback-section .eyebrow", "피드백", "FEEDBACK", "text"], [".feedback-section h2", "개발자에게 피드백", "Send feedback to the developer", "text"], [".feedback-copy strong", "불편한 점이나 추가했으면 하는 기능을 알려주세요.", "Tell the developer about bugs, usability issues, or features you want.", "text"], [".feedback-copy p", "보낸 내용은 관리자만 확인할 수 있습니다.", "Only the administrator can view submitted feedback.", "text"], ["#feedbackSubmitBtn", "피드백 보내기", "Send feedback", "text"], ["#feedbackLoginHint", "로그인하면 개발자에게 피드백을 보낼 수 있습니다.", "Sign in to send feedback to the developer.", "text"], ["#feedbackKind option[value=\"bug\"]", "버그 신고", "Bug report", "text"], ["#feedbackKind option[value=\"feature\"]", "기능 제안", "Feature request", "text"], ["#feedbackKind option[value=\"ui\"]", "화면 / 사용성", "UI / usability", "text"], ["#feedbackKind option[value=\"other\"]", "기타", "Other", "text"], ["#page-account .page-title .eyebrow", "계정", "ACCOUNT", "text"], ["#page-account .page-title h1", "내 계정", "My account", "text"], ["#page-account .page-title > p:last-child", "아이디와 비밀번호로 로그인하고 승패 기록을 확인합니다.", "Sign in with your ID and password and review your match record.", "text"], [".auth-tab[data-auth-tab=\"login\"]", "로그인", "Sign in", "text"], [".auth-tab[data-auth-tab=\"signup\"]", "계정 만들기", "Create account", "text"], ["#loginForm button", "로그인", "Sign in", "text"], ["#signupForm button", "계정 만들기", "Create account", "text"], [".account-note h3", "온라인 계정", "Online account", "text"], [".profile-head .eyebrow", "플레이어 프로필", "PLAYER PROFILE", "text"], [".profile-head div:nth-of-type(2) > p:last-child", "놀이터 온라인 프로필", "Playground online profile", "text"], ["#logoutBtn", "로그아웃", "Sign out", "text"], [".profile-stats article:nth-of-type(1) span", "전체 경기", "Games", "text"], [".profile-stats article:nth-of-type(2) span", "승", "Wins", "text"], [".profile-stats article:nth-of-type(3) span", "패", "Losses", "text"], [".profile-stats article:nth-of-type(4) span", "무", "Draws", "text"], [".profile-stats article:nth-of-type(5) span", "요트 횟수", "Yahtzees", "text"], [".profile-stats article:nth-of-type(6) span", "승률", "Win rate", "text"], [".history-card .eyebrow", "경기 기록", "MATCH HISTORY", "text"], [".history-card h2", "최근 경기", "Recent matches", "text"], [".back-home-btn", "← 홈으로", "← Home", "text"], ["#page-lobby .page-title .eyebrow", "요트 다이스", "YACHT DICE", "text"], ["#page-lobby .page-title h1", "온라인 게임방", "Online rooms", "text"], ["#page-lobby .page-title > p:last-child", "공개방을 찾아 바로 참여하거나, 비공개방 코드를 이용해 친구들과 플레이하세요.", "Join a public room directly or use a private room code to play with friends.", "text"], [".lobby-card:nth-of-type(1) .eyebrow", "방 만들기", "CREATE ROOM", "text"], [".lobby-card:nth-of-type(1) h2", "방 만들기", "Create room", "text"], ["#publicRoomBtn strong", "공개방", "Public room", "text"], ["#publicRoomBtn small", "누구나 목록에서 참여", "Anyone can join from the list", "text"], ["#privateRoomBtn strong", "비공개방", "Private room", "text"], ["#privateRoomBtn small", "방 코드로만 참여", "Join by room code only", "text"], ["#createRoomBtn", "새 방 만들기", "Create new room", "text"], [".lobby-card:nth-of-type(2) .eyebrow", "방 입장", "JOIN ROOM", "text"], [".lobby-card:nth-of-type(2) h2", "방 코드로 입장", "Join by code", "text"], ["#joinRoomForm button", "입장", "Join", "text"], ["#publicRoomsPanel .eyebrow", "공개방", "PUBLIC ROOMS", "text"], ["#publicRoomsPanel h2", "공개방", "Public rooms", "text"], ["#refreshPublicRoomsBtn", "새로고침", "Refresh", "text"], ["#activeRoomPanel .eyebrow", "내 방", "YOUR ROOM", "text"], ["#copyRoomCodeBtn", "코드 복사", "Copy code", "text"], ["#startRoomBtn", "게임 시작", "Start game", "text"], ["#resumeRoomBtn", "게임으로 돌아가기", "Return to game", "text"], ["#leaveRoomBtn", "방 나가기", "Leave room", "text"], ["#leaveGameBtn", "← 홈으로", "← Home", "text"], ["#gameModeBadge", "관전 중", "SPECTATING", "text"], [".turn-info > div:nth-of-type(1) .label", "현재 차례", "Current turn", "text"], [".turn-info > div:nth-of-type(2) .label", "라운드", "Round", "text"], [".turn-info > div:nth-of-type(3) .label", "남은 굴리기", "Rolls left", "text"], ["#rollBtn", "주사위 굴리기", "Roll dice", "text"], [".help strong", "조작법", "Controls", "text"], [".score-header .eyebrow", "점수표", "SCORE SHEETS", "text"], ["#scoreSheetPlayer", "모든 플레이어 점수표", "All player score sheets", "text"], [".total-box span", "내 총점", "My total", "text"], [".chat-header .eyebrow", "방 채팅", "ROOM CHAT", "text"], [".chat-header h2", "채팅", "Chat", "text"], ["#chatForm > button", "전송", "Send", "text"], ["#page-admin .page-title .eyebrow", "관리자 콘솔", "ADMIN CONSOLE", "text"], ["#page-admin .page-title h1", "관리자 모드", "Admin console", "text"], ["#page-admin .page-title p:last-child", "계정, 게임방, 경기 기록과 최근 채팅 현황을 확인합니다.", "Review accounts, rooms, match history, chat logs, and feedback.", "text"], ["#page-admin .admin-card:nth-of-type(1) .eyebrow", "사용자", "USERS", "text"], ["#page-admin .admin-card:nth-of-type(1) h2", "사용자", "Users", "text"], ["#page-admin .admin-card:nth-of-type(2) .eyebrow", "게임방", "ROOMS", "text"], ["#page-admin .admin-card:nth-of-type(2) h2", "게임방", "Rooms", "text"], ["#page-admin .admin-card:nth-of-type(3) .eyebrow", "경기", "MATCHES", "text"], ["#page-admin .admin-card:nth-of-type(3) h2", "최근 경기", "Recent matches", "text"], ["#page-admin .admin-card:nth-of-type(4) .eyebrow", "채팅 기록", "CHAT LOG", "text"], ["#page-admin .admin-card:nth-of-type(4) h2", "최근 채팅", "Recent chat", "text"], [".admin-feedback-card .eyebrow", "피드백", "FEEDBACK", "text"], [".admin-feedback-card h2", "개발자 피드백", "Developer feedback", "text"], ["#gameOverModal .eyebrow", "게임 종료", "GAME OVER", "text"], ["#gameOverModal h2", "게임 종료", "Game over", "text"], ["#finishGameBtn", "홈으로", "Go home", "text"], ["#setupModal .eyebrow", "설정 필요", "SETUP REQUIRED", "text"], ["#setupModal h2", "Supabase 설정이 필요합니다", "Supabase setup required", "text"], [".yahtzee-kicker", "같은 눈 다섯 개", "FIVE OF A KIND", "text"], [".yahtzee-celebration-card > strong", "요트!", "YAHTZEE!", "text"], ["#roomNameInput", "예: 초보 환영! 가볍게 한 판", "e.g. Beginners welcome!", "placeholder"], ["#roomCodeInput", "예: A1B2C3", "e.g. A1B2C3", "placeholder"], ["#feedbackBody", "개발자에게 전달할 내용을 입력하세요.", "Enter feedback for the developer.", "placeholder"], ["#globalChatInput", "모두에게 메시지를 보내세요", "Send a message to everyone", "placeholder"], ["#chatInput", "메시지를 입력하세요", "Enter a message", "placeholder"]];

function preferredLanguage() {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "ko";
}

function tr(ko, en) {
  return (state?.language || preferredLanguage()) === "en" ? en : ko;
}


STATIC_I18N.push(
  ["#lobbyChatTitle", "방 채팅", "Room chat", "text"],
  ["#lobbyChatSendBtn", "전송", "Send", "text"],
  ["#lobbyChatInput", "메시지를 입력하세요", "Enter a message", "placeholder"],
  [".waiting-chat-panel .eyebrow", "방 채팅", "ROOM CHAT", "text"]
);

STATIC_I18N.push(
  [".account-note p:nth-of-type(1)",
    "비밀번호는 웹페이지에 저장하지 않고 Supabase Auth가 처리합니다. 경기 기록은 서버 DB에 저장되어 다른 기기에서 로그인해도 유지됩니다.",
    "Passwords are handled by Supabase Auth and are not stored by this webpage. Match records are stored in the server database and remain available across devices.",
    "text"],
  [".account-note p:nth-of-type(2)",
    "현재 버전은 아이디/비밀번호 방식에 맞추기 위해 내부 인증용 이메일을 자동 생성합니다. 비밀번호 분실 복구 기능은 아직 제공하지 않습니다.",
    "This version generates an internal authentication email for ID/password login. Password recovery is not available yet.",
    "text"],
  ["#setupModal .setup-card > p:last-child",
    "main.js 상단의 URL과 Publishable key를 입력한 뒤 다시 배포하세요.",
    "Enter the URL and Publishable key at the top of main.js, then redeploy.",
    "text"]
);

function setLeadingText(selector, ko, en) {
  const node = document.querySelector(selector);
  if (!node) return;
  const text = tr(ko, en);
  const child = [...node.childNodes].find(
    item => item.nodeType === Node.TEXT_NODE && item.nodeValue.trim()
  );
  if (child) child.nodeValue = `\n                ${text}\n                `;
}


function getAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
  return state.audioContext;
}

function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(430, now + 0.045);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

function playDiceClack(ctx, strength = 1) {
  const now = ctx.currentTime;
  const master = ctx.createGain();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(
    0.05 * strength,
    now + 0.003
  );
  master.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.075
  );

  // Low plastic/wood body impact.
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();

  body.type = "sine";
  body.frequency.setValueAtTime(
    155 + Math.random() * 55,
    now
  );
  body.frequency.exponentialRampToValueAtTime(
    90 + Math.random() * 25,
    now + 0.065
  );

  bodyGain.gain.setValueAtTime(0.75, now);
  bodyGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.07
  );

  // Short higher-frequency edge click.
  const edge = ctx.createOscillator();
  const edgeGain = ctx.createGain();

  edge.type = "triangle";
  edge.frequency.setValueAtTime(
    520 + Math.random() * 180,
    now
  );
  edge.frequency.exponentialRampToValueAtTime(
    230 + Math.random() * 90,
    now + 0.028
  );

  edgeGain.gain.setValueAtTime(0.24, now);
  edgeGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.032
  );

  body.connect(bodyGain);
  edge.connect(edgeGain);
  bodyGain.connect(master);
  edgeGain.connect(master);
  master.connect(ctx.destination);

  body.start(now);
  edge.start(now);
  body.stop(now + 0.08);
  edge.stop(now + 0.04);
}

function scheduleNextDiceClack(sound, immediate = false) {
  if (!sound || state.rollSound !== sound) return;

  const fire = () => {
    if (state.rollSound !== sound) return;

    playDiceClack(
      sound.ctx,
      0.55 + Math.random() * 0.5
    );

    scheduleNextDiceClack(sound, false);
  };

  if (immediate) {
    fire();
    return;
  }

  // Irregular impacts sound much closer to physical dice than looped noise.
  const delay = 55 + Math.floor(Math.random() * 85);
  sound.timer = window.setTimeout(fire, delay);
}

function startDiceRollSound() {
  stopDiceRollSound();

  const ctx = getAudioContext();
  if (!ctx) return;

  const sound = {
    ctx,
    timer: null
  };

  state.rollSound = sound;
  scheduleNextDiceClack(sound, true);
}

function stopDiceRollSound() {
  const sound = state.rollSound;
  if (!sound) return;

  if (sound.timer) {
    clearTimeout(sound.timer);
  }

  state.rollSound = null;

  // One final, slightly stronger landing impact.
  playDiceClack(sound.ctx, 0.9);
}

function applyStaticLanguage() {
  document.documentElement.lang = state.language;
  document.title = tr("대관령산양의 놀이터", "DGL Goral Playground");

  for (const [selector, ko, en, mode] of STATIC_I18N) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const value = tr(ko, en);
    if (mode === "html") node.innerHTML = value;
    else if (mode === "placeholder") node.placeholder = value;
    else node.textContent = value;
  }

  setLeadingText("#loginForm label:nth-of-type(1)", "아이디", "User ID");
  setLeadingText("#loginForm label:nth-of-type(2)", "비밀번호", "Password");
  setLeadingText("#signupForm label:nth-of-type(1)", "아이디", "User ID");
  setLeadingText("#signupForm label:nth-of-type(2)", "비밀번호", "Password");
  setLeadingText("#signupForm label:nth-of-type(3)", "비밀번호 확인", "Confirm password");
  setLeadingText(".lobby-card:nth-of-type(1) > label:nth-of-type(1)", "방 이름", "Room name");
  setLeadingText(".lobby-card:nth-of-type(1) > .field-label:nth-of-type(2)", "공개 설정", "Visibility");
  setLeadingText(".player-count-picker", "", "");
  const playerPicker = document.querySelector(".player-count-picker");
  if (playerPicker?.parentElement) {
    const child = [...playerPicker.parentElement.childNodes].find(
      item => item.nodeType === Node.TEXT_NODE && item.nodeValue.trim()
    );
    if (child) child.nodeValue = `\n              ${tr("최대 인원", "Max players")}\n              `;
  }
  setLeadingText("#joinRoomForm label", "방 코드", "Room code");
  setLeadingText("#feedbackForm > label:nth-of-type(1)", "종류", "Type");
  setLeadingText("#feedbackForm > label:nth-of-type(2)", "내용", "Message");

  el("languageToggleBtn").textContent = state.language === "ko" ? "EN" : "KO";

  if (el("yahtzeeCelebration").classList.contains("hidden")) {
    el("yahtzeeCelebrationPlayer").textContent =
      tr("축하합니다!", "Congratulations!");
  }
}

function applyLanguage({ rerender = true } = {}) {
  applyStaticLanguage();
  renderHeader();
  updateBgmButton();
  setFeedbackAvailability();

  if (!rerender) return;
  renderGlobalChat();
  renderPublicRooms();
  if (state.activeRoom) renderActiveRoom();
  if (state.gameState && state.page === "game") renderGame();
  if (state.adminData && state.page === "admin") renderAdminDashboard();
}

function toggleLanguage() {
  state.language = state.language === "ko" ? "en" : "ko";
  localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
  applyLanguage();
}

const UPPER_CATEGORY_KEYS = [
  "ones", "twos", "threes", "fours", "fives", "sixes"
];

const categories = [
  { key: "ones", section: "upper", koName: "에이스", enName: "Aces", koRule: "1의 눈 총합", enRule: "Sum of ones" },
  { key: "twos", section: "upper", koName: "듀스", enName: "Deuces", koRule: "2의 눈 총합", enRule: "Sum of twos" },
  { key: "threes", section: "upper", koName: "쓰리", enName: "Threes", koRule: "3의 눈 총합", enRule: "Sum of threes" },
  { key: "fours", section: "upper", koName: "포", enName: "Fours", koRule: "4의 눈 총합", enRule: "Sum of fours" },
  { key: "fives", section: "upper", koName: "파이브", enName: "Fives", koRule: "5의 눈 총합", enRule: "Sum of fives" },
  { key: "sixes", section: "upper", koName: "식스", enName: "Sixes", koRule: "6의 눈 총합", enRule: "Sum of sixes" },
  { key: "choice", section: "lower", koName: "초이스", enName: "Choice", koRule: "주사위 5개의 총합", enRule: "Sum of all five dice" },
  { key: "fourKind", section: "lower", koName: "포 오브 어 카인드", enName: "4 of a Kind", koRule: "같은 눈 4개 이상이면 전체 합", enRule: "Four or more of one value: sum all dice" },
  { key: "fullHouse", section: "lower", koName: "풀 하우스", enName: "Full House", koRule: "같은 눈 3개와 2개면 25점", enRule: "Three of one value and two of another: 25" },
  { key: "smallStraight", section: "lower", koName: "스몰 스트레이트", enName: "Small Straight", koRule: "연속된 눈 4개면 30점", enRule: "Four consecutive values: 30" },
  { key: "largeStraight", section: "lower", koName: "라지 스트레이트", enName: "Large Straight", koRule: "연속된 눈 5개면 40점", enRule: "Five consecutive values: 40" },
  { key: "yacht", section: "lower", koName: "요트", enName: "Yahtzee", koRule: "5개가 모두 같으면 50점", enRule: "All five dice equal: 50" }
];

function categoryName(category) {
  return state.language === "en" ? category.enName : category.koName;
}

function categoryRule(category) {
  return state.language === "en" ? category.enRule : category.koRule;
}


const BGM_LOCAL_SRC = "audio/bgm.mp3";
const BGM_RAW_FALLBACK =
  "https://raw.githubusercontent.com/kkh0412/playground/main/audio/bgm.mp3";

const BGM_TRACKS = [
  { title: "About That Oldie", artist: "Vibe Tracks", start: 0, stamp: "00:00" },
  { title: "Claudio The Worm", artist: "The Green Orbs", start: 113, stamp: "01:53" },
  { title: "Splashing Around", artist: "The Green Orbs", start: 234, stamp: "03:54" },
  { title: "Whistling Down the Road", artist: "Silent Partner", start: 389, stamp: "06:29" },
  { title: "At The Fair", artist: "The Green Orbs", start: 519, stamp: "08:39" },
  { title: "Bike Rides", artist: "The Green Orbs", start: 639, stamp: "10:39" },
  { title: "How it Began", artist: "Silent Partner", start: 751, stamp: "12:31" },
  { title: "Sugar Zone", artist: "Silent Partner", start: 933, stamp: "15:33" },
  { title: "Bubble Bath", artist: "The Green Orbs", start: 1047, stamp: "17:27" },
  { title: "If I Had a Chicken", artist: "Kevin MacLeod", start: 1222, stamp: "20:22" },
  { title: "Ponies and Balloons", artist: "The Green Orbs", start: 1372, stamp: "22:52" },
  { title: "Rainy Day Games", artist: "The Green Orbs", start: 1555, stamp: "25:55" },
  { title: "Beat Your Competition", artist: "Vibe Tracks", start: 1678, stamp: "27:58" },
  { title: "Blue Skies", artist: "Silent Partner", start: 1852, stamp: "30:52" },
  { title: "Spring In My Step", artist: "Silent Partner", start: 2015, stamp: "33:35" },
  { title: "Springtime Family Band", artist: "The Green Orbs", start: 2135, stamp: "35:35" },
  { title: "Mr Turtle", artist: "The Green Orbs", start: 2272, stamp: "37:52" },
  { title: "Mr Sunny Face", artist: "Wayne Jones", start: 2397, stamp: "39:57" },
  { title: "Dog and Pony Show", artist: "Silent Partner", start: 2501, stamp: "41:41" },
  { title: "7th Floor Tango", artist: "Silent Partner", start: 2593, stamp: "43:13" }
];

const CHAT_EMOJIS = [
  "😀","😆","😂","🤣","😊","😍","😎","🤔",
  "😱","😭","😡","🥳","👍","👎","👏","🙏",
  "🔥","✨","🎲","🎉","💯","❤️","🐐","🏆"
];

const state = {
  page: "home",
  language: preferredLanguage(),
  authBooting: true,
  maxPlayers: 4,
  roomIsPublic: true,
  publicRooms: [],
  publicRoomPoller: null,
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
  diceAnimating: false,
  displayDice: null,
  optimisticHolds: {},
  holdVersions: [0, 0, 0, 0, 0],
  yahtzeeCelebrationTimer: null,
  lastCelebratedRollId: null,
  adminData: null,
  audioContext: null,
  rollSound: null,
  bgmEnabled: false,
  bgmTrackIndex: 0,
  bgmSegmentMonitor: null,
  bgmResolvedSrc: null,
  bgmResolvePromise: null,
  roomBgm: null,
  bgmLastDriftCheck: 0,
  bgmPlaybackBlocked: false,
  bgmSyncTimer: null,
  bgmLastSharedPushAt: 0,
  accountGuardPoller: null,
  accountGuardMisses: 0,
  adminPoller: null,
  adminRefreshInFlight: false,
  toastTimer: null,
  busy: false
};

const holdRequestQueues = [
  Promise.resolve(),
  Promise.resolve(),
  Promise.resolve(),
  Promise.resolve(),
  Promise.resolve()
];

const el = id => document.getElementById(id);

const pages = {
  home: el("page-home"),
  account: el("page-account"),
  lobby: el("page-lobby"),
  game: el("page-game"),
  admin: el("page-admin")
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

const ADMIN_LOGIN_ID = "대관령산양";
const ADMIN_LEGACY_AUTH_KEY = "kkh0412";

function normalizedLoginId(username) {
  return normalizeUsername(username).toLocaleLowerCase();
}

function isOldAdminLoginId(username) {
  return normalizedLoginId(username) === ADMIN_LEGACY_AUTH_KEY;
}

async function usernameToInternalEmail(username) {
  const normalized = normalizedLoginId(username);

  // The admin's original Supabase Auth identity was created from "kkh0412".
  // Keep that Auth identity intact, but expose/login with the new ID.
  const authIdentityKey =
    normalized === ADMIN_LOGIN_ID.toLocaleLowerCase()
      ? ADMIN_LEGACY_AUTH_KEY
      : normalized;

  const hash = await sha256Hex(authIdentityKey);
  return `u_${hash.slice(0, 40)}@playground.example.com`;
}

let authListenerInstalled = false;
let authSubscription = null;

function installAuthListener() {
  if (authListenerInstalled || !db) return;

  authListenerInstalled = true;

  const {
    data: { subscription }
  } = db.auth.onAuthStateChange((event, session) => {
    if (session) {
      state.session = session;
      saveManualSessionBackup(session);
      renderHeader();

      // Do not start another Supabase request directly inside this callback.
      if (
        !state.authBooting &&
        (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        )
      ) {
        window.setTimeout(() => {
          syncAuthUi(event, session).catch(error => {
            console.error("auth state sync failed:", error);
          });
        }, 0);
      }

      return;
    }

    // INITIAL_SESSION with null is not an explicit logout.
    if (event !== "SIGNED_OUT") return;

    state.session = null;
    state.profile = null;
    stopAccountGuard();
    stopAdminAutoRefresh();
    cleanupRoomChannel();
    clearManualSessionBackup();

    renderHeader();
    renderAccount();
    setGlobalChatAvailability();
    setFeedbackAvailability();

    if (
      state.page === "lobby" ||
      state.page === "game" ||
      state.page === "admin"
    ) {
      navigate("account");
    }
  });

  authSubscription = subscription;
}

function savedPage() {
  const page = sessionStorage.getItem(PAGE_STORAGE_KEY);

  return ["home", "account", "lobby", "game", "admin"].includes(page)
    ? page
    : "home";
}

function rememberPage(page) {
  try {
    sessionStorage.setItem(PAGE_STORAGE_KEY, page);
  } catch {}
}

function rememberSpectatorRoom(roomId) {
  try {
    if (roomId) sessionStorage.setItem(SPECTATOR_STORAGE_KEY, roomId);
    else sessionStorage.removeItem(SPECTATOR_STORAGE_KEY);
  } catch {}
}

function savedSpectatorRoom() {
  try {
    return sessionStorage.getItem(SPECTATOR_STORAGE_KEY);
  } catch {
    return null;
  }
}

function currentUserId() {
  return state.session?.user?.id || null;
}

function isLoggedIn() {
  return Boolean(currentUserId());
}

function currentUsername() {
  return state.profile?.username || tr("게스트", "Guest");
}

function isAdmin() {
  return state.profile?.role === "admin";
}

function navigate(page, options = {}) {
  const { remember = true, scroll = true } = options;

  const currentIsYachtArea =
    state.page === "lobby" || state.page === "game";

  const nextIsYachtArea =
    page === "lobby" || page === "game";

  const leavingGame =
    state.page === "game" && page !== "game";

  if (currentIsYachtArea && !nextIsYachtArea) {
    pauseLocalBgm();
  }

  if (leavingGame && state.isSpectator) {
    detachSpectatorForNavigation();
  }

  if ((page === "lobby" || page === "game") && !isLoggedIn()) {
    page = "account";
    showToast(tr("온라인 게임은 로그인 후 이용할 수 있습니다.", "Sign in to use online games."));
  }

  if (page === "admin" && !isAdmin()) {
    showToast(tr("관리자 권한이 필요합니다.", "Administrator permission is required."));
    return;
  }

  state.page = page;

  if (remember) {
    rememberPage(page);
  }

  Object.entries(pages).forEach(([name, node]) => {
    node.classList.toggle("active", name === page);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === page);
  });

  if (page !== "lobby") stopPublicRoomPolling();
  if (page !== "admin") stopAdminAutoRefresh();

  if (page === "home") refreshHome();
  if (page === "account") renderAccount();
  if (page === "lobby") refreshLobby();
  if (page === "admin") startAdminAutoRefresh();
  if (page === "game") {
    if (!state.activeRoom || state.activeRoom.status !== "playing") {
      navigate("lobby");
      return;
    }
    enterGameRoom();
  }

  updatePresence();

  if (scroll) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function renderHeader() {
  el("headerUserText").textContent = currentUsername();
  el("headerAccountBtn").textContent = isLoggedIn() ? tr("프로필", "Profile") : tr("로그인", "Sign in");
  el("adminNavBtn").classList.toggle("hidden", !isAdmin());
}

function setConnectionBadge(ok, text) {
  const badge = el("connectionBadge");
  badge.textContent = text;
  badge.classList.toggle("connection-ok", ok);
  badge.classList.toggle("connection-error", !ok);
}


function stopAccountGuard() {
  if (state.accountGuardPoller) {
    clearInterval(state.accountGuardPoller);
    state.accountGuardPoller = null;
  }
}

async function checkOwnAccountStillExists() {
  if (!isLoggedIn()) return;

  try {
    const {
      data: { user },
      error
    } = await db.auth.getUser();

    if (!error && user) {
      state.accountGuardMisses = 0;
      return;
    }

    // Do not sign out on one transient request/RLS/network failure.
    const status = Number(error?.status || 0);
    const message = String(error?.message || "").toLowerCase();
    const definitelyGone =
      status === 401 ||
      status === 403 ||
      message.includes("user not found") ||
      message.includes("session from session_id claim in jwt does not exist");

    if (!definitelyGone) {
      console.error("account guard transient error:", error);
      return;
    }

    state.accountGuardMisses += 1;

    // Require two consecutive authoritative failures.
    if (state.accountGuardMisses < 2) return;

    stopAccountGuard();
    clearManualSessionBackup();
    showToast(
      tr(
        "계정이 더 이상 존재하지 않아 로그아웃됩니다.",
        "This account no longer exists. Signing out."
      )
    );
    await db.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("account guard:", error);
  }
}

function startAccountGuard() {
  stopAccountGuard();
  state.accountGuardMisses = 0;

  if (!isLoggedIn()) return;

  state.accountGuardPoller = setInterval(
    checkOwnAccountStillExists,
    30000
  );
}



async function syncAuthUi(event, session) {
  // Ignore an obsolete delayed callback.
  if ((state.session?.access_token || null) !== (session?.access_token || null)) {
    return;
  }

  if (!session) {
    state.profile = null;
    stopAccountGuard();

    renderHeader();
    await renderAccount();
    await refreshHome();
    await setupGlobalChat();
    setFeedbackAvailability();
    updatePresence();
    return;
  }

  await loadProfile();

  // The Auth session is valid even if the profile query has a transient error.
  renderHeader();
  await renderAccount();

  startAccountGuard();
  await refreshHome();
  await setupGlobalChat();
  setFeedbackAvailability();

  updatePresence();
}

async function applySignedInSession(session) {
  if (!session) {
    throw new Error(tr("로그인 세션을 만들지 못했습니다.", "Could not create a login session."));
  }

  state.session = session;
  
  // Do not wait for the auth event callback to update the UI.
  await loadProfile();

  renderHeader();
  await renderAccount();

  startAccountGuard();
  await refreshHome();
  await setupGlobalChat();
  updatePresence();

  return state.profile;
}

async function restoreSpectatorRoom(roomId) {
  if (!isLoggedIn() || !roomId) return false;

  try {
    const { data, error } = await db.rpc("spectate_yacht_room", {
      p_room_id: roomId
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.room_id) return false;

    state.isSpectator = true;
    state.activeRoom = {
      id: row.room_id,
      code: row.room_code,
      status: row.room_status,
      maxPlayers: row.max_players,
      hostId: row.host_id,
      name: row.room_name || "Yacht Dice",
      isPublic: true
    };

    rememberSpectatorRoom(row.room_id);
    return true;
  } catch (error) {
    console.error("restore spectator room:", error);
    rememberSpectatorRoom(null);
    return false;
  }
}

async function restoreInitialPage(requestedPage) {
  let page = requestedPage || "home";

  if (!isLoggedIn()) {
    if (page === "lobby" || page === "game" || page === "admin") {
      page = "account";
    }

    navigate(page, { remember: false, scroll: false });
    return;
  }

  if (page === "admin" && !isAdmin()) {
    page = "account";
  }

  if (page === "game") {
    if (state.activeRoom?.status === "playing") {
      navigate("game", { remember: false, scroll: false });
      return;
    }

    const spectatorRoomId = savedSpectatorRoom();

    if (spectatorRoomId) {
      const restored = await restoreSpectatorRoom(spectatorRoomId);

      if (restored) {
        navigate("game", { remember: false, scroll: false });
        return;
      }
    }

    page = "lobby";
  }

  navigate(page, { remember: false, scroll: false });
}

async function init() {
  if (!requireConfigured()) {
    setConnectionBadge(false, "SETUP REQUIRED");
    return;
  }

  const requestedPage = savedPage();

  // Register the auth listener first, then restore deterministically.
  installAuthListener();

  const session = await restoreAuthSession();
  state.session = session;
  state.authBooting = false;

  if (session) {
    await loadProfile();
    startAccountGuard();
  }

  await initPresence();
  renderHeader();
  setConnectionBadge(true, "ONLINE");
  await refreshHome();
  await setupGlobalChat();
  setFeedbackAvailability();

  if (session) {
    await clearStaleSpectatorSession();
    await refreshActiveRoom();
  }

  await restoreInitialPage(requestedPage);
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
      el("yachtPlayerCount").textContent = state.language === "ko" ? `${playing}명 플레이 중` : `${playing} playing`;
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

  const { wins, losses, draws, yacht_rolls = 0, username } = state.profile;
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
  el("statYachts").textContent = yacht_rolls;
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
        <span>${tr("경기 기록을 불러오지 못했습니다.", "Could not load match history.")}</span>
      </div>
    `;

    return;
  }

  if (!history?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>${tr("아직 경기 기록이 없습니다.", "No match history yet.")}</span>
      </div>
    `;

    return;
  }

  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const label =
      item.result === "win"
        ? tr("승", "Win")
        : item.result === "loss"
          ? tr("패", "Loss")
          : tr("무", "Draw");

    const resultClass =
      item.result === "win"
        ? "result-win"
        : item.result === "loss"
          ? "result-loss"
          : "result-draw";

    row.innerHTML = `
      <div>
        <strong>
          ${tr("요트 다이스", "Yacht Dice")} · ${
            state.language === "ko"
              ? `${item.score}점 · ${item.player_count}인 경기`
              : `${item.score} pts · ${item.player_count} players`
          }
        </strong>
        <small>
          ${new Date(item.created_at).toLocaleString(
            state.language === "ko" ? "ko-KR" : "en-US"
          )}
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
    .select("id, username, wins, losses, draws, yacht_rolls, role")
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
      .select("id, username, wins, losses, draws, yacht_rolls, role")
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
    throw new Error(tr("로그인이 필요합니다.", "Sign-in required."));
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
    return "Supabase의 방 생성 함수가 설치되지 않았습니다. supabase_demo_v4.sql을 실행해 주세요.";
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

  if (isOldAdminLoginId(username)) {
    message.textContent = tr("이 아이디는 더 이상 사용할 수 없습니다.", "This ID is no longer available.");
    return;
  }

  if (!validUsername(username)) {
    message.textContent = "아이디는 3–20자의 한글/영문/숫자/_/-만 사용할 수 있습니다.";
    return;
  }

  if (password.length < 8) {
    message.textContent = tr("비밀번호는 8자 이상으로 설정하세요.", "Password must be at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = tr("비밀번호 확인이 일치하지 않습니다.", "Password confirmation does not match.");
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

    if (data.session) {
      await applySignedInSession(data.session);
    }

    showToast(tr("계정이 생성되었습니다.", "Account created."));
    await renderAccount();
    rememberPage("account");
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
  const submitButton = el("loginForm").querySelector('button[type="submit"]');

  message.textContent = "";

  if (isOldAdminLoginId(username)) {
    message.textContent = tr("아이디 또는 비밀번호가 올바르지 않습니다.", "Incorrect ID or password.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = tr("로그인 중...", "Signing in...");

  try {
    const email = await usernameToInternalEmail(username);

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data?.session) {
      throw new Error(
        tr("로그인 세션이 없습니다.", "No login session was returned.")
      );
    }

    saveManualSessionBackup(data.session);

    // Explicitly update Playground state from the session returned by Auth.
    // This avoids depending on onAuthStateChange for the visible login state.
    await applySignedInSession(data.session);

    el("loginForm").reset();

    if (state.profile?.username) {
      showToast(`${state.profile.username}님, 로그인되었습니다.`);
    } else {
      showToast(`${username}님, 로그인되었습니다.`);
    }

    await renderAccount();
    rememberPage(state.page);
  } catch (error) {
    console.error("login failed:", error);

    // If Auth did create a session but profile sync failed, don't lie to the
    // user that the password was wrong. Check current session once.
    const { data: current } = await db.auth.getSession();

    if (current?.session) {
      state.session = current.session;
      saveManualSessionBackup(current.session);
      message.textContent =
        "로그인은 되었지만 프로필을 불러오지 못했습니다. 페이지를 새로고침해 주세요.";
      renderHeader();
    } else {
      message.textContent = tr("아이디 또는 비밀번호가 올바르지 않습니다.", "Incorrect ID or password.");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = tr("로그인", "Sign in");
  }
}

async function logout() {
  stopAccountGuard();

  if (state.isSpectator && state.activeRoom) {
    await leaveSpectatorRoom(state.activeRoom.id, true);
  }

  cleanupGlobalChatChannel();
  cleanupRoomChannel();
  state.activeRoom = null;
  state.roomPlayers = [];
  state.gameState = null;
  state.scores = [];
  state.messages = [];
  state.globalMessages = [];
  state.roomBgm = null;
  state.isSpectator = false;
  rememberSpectatorRoom(null);
  clearManualSessionBackup();
  await db.auth.signOut({ scope: "local" });
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

  if (row?.room_id) {
    state.isSpectator = false;
  }

  state.activeRoom = row?.room_id ? {
    id: row.room_id,
    code: row.room_code,
    status: row.room_status,
    maxPlayers: row.max_players,
    hostId: row.host_id,
    name: row.room_name || "Yacht Dice",
    isPublic: Boolean(row.is_public)
  } : null;

  return state.activeRoom;
}

async function refreshLobby() {
  if (!isLoggedIn()) return;

  await refreshActiveRoom();

  const hasRoom = Boolean(state.activeRoom);
  el("lobbyActions").classList.toggle("hidden", hasRoom);
  el("publicRoomsPanel").classList.toggle("hidden", hasRoom);
  el("activeRoomPanel").classList.toggle("hidden", !hasRoom);

  document.querySelectorAll(".count-btn").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.count) === state.maxPlayers);
  });

  document.querySelectorAll(".visibility-btn").forEach(button => {
    button.classList.toggle(
      "active",
      (button.dataset.public === "true") === state.roomIsPublic
    );
  });

  if (!hasRoom) {
    cleanupRoomChannel();
    await refreshPublicRooms();
    startPublicRoomPolling();
    return;
  }

  stopPublicRoomPolling();
  await subscribeRoom(state.activeRoom.id);

  await Promise.all([
    loadRoomPlayers(),
    loadMessages(),
    loadRoomBgmState(state.activeRoom.id)
  ]);

  renderActiveRoom();
  renderChat();
  syncBgmControls();

  if (state.activeRoom.status === "playing") {
    el("resumeRoomBtn").classList.remove("hidden");
  }
}

async function createRoom() {
  if (state.busy) return;

  if (!isLoggedIn()) {
    navigate("account");
    showToast(tr("로그인 후 방을 만들 수 있습니다.", "Sign in to create a room."));
    return;
  }

  state.busy = true;

  const button = el("createRoomBtn");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = tr("방 만드는 중...", "Creating room...");

  try {
    await ensureProfileReady();

    const roomName = el("roomNameInput").value.trim() || `${currentUsername()}의 방`;

    if (roomName.length > 32) {
      throw new Error("방 이름은 32자 이하로 입력하세요.");
    }

    const { data, error } = await db.rpc("create_yacht_room", {
      p_max_players: state.maxPlayers,
      p_room_name: roomName,
      p_is_public: state.roomIsPublic
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
      hostId: currentUserId(),
      name: roomName,
      isPublic: state.roomIsPublic
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
  const code = el("roomCodeInput").value.trim().toUpperCase();
  const joined = await joinRoomByCode(code);
  if (joined) el("joinRoomForm").reset();
}

async function joinRoomByCode(code) {
  if (state.busy) return false;

  if (!/^[A-F0-9]{6}$/.test(code)) {
    showToast(tr("6자리 방 코드를 입력하세요.", "Enter a 6-character room code."));
    return false;
  }

  state.busy = true;

  try {
    await ensureProfileReady();

    const { error } = await db.rpc("join_yacht_room", {
      p_room_code: code
    });

    if (error) throw error;

    showToast(tr("방에 입장했습니다.", "Joined the room."));
    await refreshLobby();
    return true;
  } catch (error) {
    console.error(error);
    showToast(
      roomErrorMessage(error).replace("방을 만들지", "방에 입장하지")
    );
    return false;
  } finally {
    state.busy = false;
  }
}



async function clearStaleSpectatorSession() {
  if (!isLoggedIn()) return;

  const { error } = await db.rpc("clear_my_yacht_spectators");

  if (error) {
    console.error("clear stale spectator session:", error);
  }
}

async function spectatePublicRoom(roomId) {
  if (!isLoggedIn()) {
    navigate("account");
    showToast(tr("로그인 후 관전할 수 있습니다.", "Sign in to spectate."));
    return;
  }

  if (state.busy) return;

  state.busy = true;

  try {
    const { data, error } = await db.rpc("spectate_yacht_room", {
      p_room_id: roomId
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.room_id) {
      throw new Error("관전할 방 정보를 불러오지 못했습니다.");
    }

    stopPublicRoomPolling();

    state.isSpectator = true;
    state.activeRoom = {
      id: row.room_id,
      code: row.room_code,
      status: row.room_status,
      maxPlayers: row.max_players,
      hostId: row.host_id,
      name: row.room_name || "Yacht Dice",
      isPublic: true
    };

    rememberSpectatorRoom(row.room_id);

    state.roomPlayers = [];
    state.gameState = null;
    state.scores = [];
    state.messages = [];

    navigate("game");
    showToast(`${state.activeRoom.name} 관전을 시작했습니다.`);
  } catch (error) {
    console.error("spectate room:", error);
    showToast(error.message || "방을 관전하지 못했습니다.");
  } finally {
    state.busy = false;
  }
}

async function leaveSpectatorRoom(roomId, silent = false) {
  if (!state.isSpectator) return;

  try {
    if (isLoggedIn() && roomId) {
      const { error } = await db.rpc("leave_yacht_spectator", {
        p_room_id: roomId
      });

      if (error) throw error;
    }
  } catch (error) {
    console.error("leave spectator:", error);

    if (!silent) {
      showToast(tr("관전 종료 처리 중 오류가 발생했습니다.", "An error occurred while leaving spectator mode."));
    }
  } finally {
    cleanupRoomChannel();
    state.isSpectator = false;
    rememberSpectatorRoom(null);
    state.activeRoom = null;
    state.roomPlayers = [];
    state.gameState = null;
    state.scores = [];
    state.messages = [];
    state.roomBgm = null;
    pauseLocalBgm();
    updatePresence();
  }
}

function detachSpectatorForNavigation() {
  if (!state.isSpectator || !state.activeRoom) return;

  const roomId = state.activeRoom.id;

  // Fire the authenticated cleanup request before clearing local state.
  if (isLoggedIn()) {
    db.rpc("leave_yacht_spectator", { p_room_id: roomId })
      .then(({ error }) => {
        if (error) console.error("spectator cleanup:", error);
      });
  }

  cleanupRoomChannel();
  document.body.classList.remove("spectator-mode");
  state.isSpectator = false;
  state.activeRoom = null;
  state.roomPlayers = [];
  state.gameState = null;
  state.scores = [];
  state.messages = [];
  state.roomBgm = null;
  pauseLocalBgm();
}


async function refreshPublicRooms() {
  if (!isLoggedIn() || state.activeRoom) return;

  const { data, error } = await db.rpc("list_public_yacht_rooms");

  if (error) {
    console.error("public rooms:", error);
    el("publicRoomsList").innerHTML =
      `<div class="empty-state"><span>공개방 목록을 불러오지 못했습니다.</span></div>`;
    return;
  }

  state.publicRooms = data || [];
  renderPublicRooms();
}

function renderPublicRooms() {
  const container = el("publicRoomsList");
  container.innerHTML = "";

  if (!state.publicRooms.length) {
    container.innerHTML =
      `<div class="empty-state"><span>현재 입장 가능한 공개방이 없습니다.</span></div>`;
    return;
  }

  state.publicRooms.forEach(room => {
    const card = document.createElement("article");
    card.className = "public-room-row";

    const playing = room.room_status === "playing";
    const full = Number(room.player_count) >= Number(room.max_players);

    card.innerHTML = `
      <div class="public-room-main">
        <div class="public-room-title">
          <strong>${escapeHTML(room.room_name)}</strong>
          <span class="demo-badge">${playing ? tr("진행 중", "PLAYING") : tr("대기 중", "WAITING")}</span>
        </div>
        <small>
          ${tr("방장", "HOST")} ${escapeHTML(room.host_username)}
          · ${tr("방 코드", "Room code")} ${escapeHTML(room.room_code)}
          ${playing ? state.language === "ko" ? `· 관전자 ${Number(room.spectator_count || 0)}명` : `· ${Number(room.spectator_count || 0)} spectators` : ""}
        </small>
      </div>

      <div class="public-room-side">
        <strong>${room.player_count} / ${room.max_players}</strong>

        ${
          playing
            ? `<button
                 class="secondary-btn public-spectate-btn"
                 data-room-id="${escapeHTML(room.room_id)}"
               >${tr("관전", "Spectate")}</button>`
            : `<button
                 class="primary-btn public-join-btn"
                 data-code="${escapeHTML(room.room_code)}"
                 ${full ? "disabled" : ""}
               >${full ? tr("가득 참", "Full") : tr("참여", "Join")}</button>`
        }
      </div>
    `;

    container.appendChild(card);
  });
}

function startPublicRoomPolling() {
  stopPublicRoomPolling();
  state.publicRoomPoller = setInterval(() => {
    if (state.page === "lobby" && !state.activeRoom) refreshPublicRooms();
  }, 5000);
}

function stopPublicRoomPolling() {
  if (state.publicRoomPoller) {
    clearInterval(state.publicRoomPoller);
    state.publicRoomPoller = null;
  }
}

async function loadRoomPlayers() {
  if (!state.activeRoom) return;

  const { data, error } = await db
    .from("room_players")
    .select("seat, user_id, yacht_bonus, yacht_rolls, profiles(username, wins, yacht_rolls)")
    .eq("room_id", state.activeRoom.id)
    .order("seat", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.roomPlayers = (data || []).map(row => ({
    seat: row.seat,
    userId: row.user_id,
    username: row.profiles?.username || "Player",
    wins: Number(row.profiles?.wins || 0),
    yachtRolls: Number(row.profiles?.yacht_rolls || 0),
    gameYachtRolls: Number(row.yacht_rolls || 0),
    yachtBonus: Number(row.yacht_bonus || 0)
  }));
}

function renderActiveRoom() {
  if (!state.activeRoom) return;

  const room = state.activeRoom;
  const isHost = room.hostId === currentUserId();

  el("activeRoomName").textContent = room.name || "Yacht Dice";
  el("roomCodeText").textContent = room.code;
  el("roomStatusBadge").textContent = room.status.toUpperCase();
  el("roomVisibilityText").textContent = room.isPublic ? tr("공개방", "Public room") : tr("비공개방", "Private room");
  el("roomCapacityText").textContent =
    state.language === "ko" ? `${state.roomPlayers.length} / ${room.maxPlayers}명` : `${state.roomPlayers.length} / ${room.maxPlayers}`;

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
    showToast(error.message || tr("게임을 시작하지 못했습니다.", "Could not start the game."));
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
    state.messages = [];
    state.roomBgm = null;
    pauseLocalBgm();
    renderChat();
    showToast(tr("방에서 나왔습니다.", "Left the room."));
    await refreshLobby();
  } catch (error) {
    console.error(error);
    showToast(error.message || tr("방에서 나가지 못했습니다.", "Could not leave the room."));
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
            hostId: payload.new.host_id,
            name: payload.new.name || state.activeRoom?.name || "Yacht Dice",
            isPublic: Boolean(payload.new.is_public)
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
    .select(
      "id, code, name, is_public, status, max_players, host_id, " +
      "bgm_enabled, bgm_track_index, bgm_position_sec, bgm_updated_at"
    )
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
    if (state.page === "game") navigate("lobby");
    else if (state.page === "lobby") refreshLobby();
    return;
  }

  state.activeRoom = {
    id: room.id,
    code: room.code,
    status: room.status,
    maxPlayers: room.max_players,
    hostId: room.host_id,
    name: room.name || "Yacht Dice",
    isPublic: Boolean(room.is_public)
  };

  await applyRoomBgmState(room);

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

  state.lastCelebratedRollId = null;

  await subscribeRoom(state.activeRoom.id);

  await Promise.all([
    loadRoomPlayers(),
    loadGameData(),
    loadMessages(),
    loadRoomBgmState(state.activeRoom.id)
  ]);

  renderGame();
  updatePresence();
}

async function loadGameData() {
  if (!state.activeRoom) return;

  const [stateResult, scoreResult] = await Promise.all([
    db
      .from("game_states")
      .select("room_id, current_seat, dice, held, rolls_left, has_rolled, finished, last_roll_id, last_roll_was_yacht, last_roll_user_id, updated_at")
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

  if (state.lastCelebratedRollId === null) {
    state.lastCelebratedRollId = Number(state.gameState.last_roll_id || 0);
  }

  if (!state.gameState.has_rolled) {
    state.displayDice = null;
  } else if (!state.displayDice && !state.diceAnimating) {
    state.displayDice = [...(state.gameState.dice || [1, 1, 1, 1, 1])];
  }

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
    .forEach(row => {
      map[row.category] = Number(row.score || 0);
    });

  return map;
}

function upperSubtotalFor(userId) {
  const scoreMap = playerScoreMap(userId);

  return UPPER_CATEGORY_KEYS.reduce(
    (sum, key) => sum + Number(scoreMap[key] || 0),
    0
  );
}

function upperBonusFor(userId) {
  return upperSubtotalFor(userId) >= 63 ? 35 : 0;
}

function yachtBonusFor(userId) {
  return Number(
    state.roomPlayers.find(player => player.userId === userId)?.yachtBonus || 0
  );
}

function baseCategoryTotalFor(userId) {
  return state.scores
    .filter(row => row.user_id === userId)
    .reduce((sum, row) => sum + Number(row.score || 0), 0);
}

function totalFor(userId) {
  return (
    baseCategoryTotalFor(userId) +
    upperBonusFor(userId) +
    yachtBonusFor(userId)
  );
}

function renderGame() {
  if (!state.gameState) return;

  el("gameRoomName").textContent = state.activeRoom?.name || "Yacht Dice";
  el("gameRoomCode").textContent = state.activeRoom?.code || "------";

  renderPlayerStrip();

  if (!state.diceAnimating) {
    renderDice();
  }

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
      <span class="player-chip-main">
        <span class="player-chip-name">${escapeHTML(player.username)}</span>
        <small class="player-chip-meta">${
          state.language === "ko"
            ? `승 ${player.wins} · 요트 ${player.yachtRolls}`
            : `Wins ${player.wins} · Yahtzees ${player.yachtRolls}`
        }</small>
      </span>
      <span class="player-chip-score">${state.language === "ko" ? `${totalFor(player.userId)}점` : `${totalFor(player.userId)} pts`}</span>
    `;
    strip.appendChild(chip);
  });
}

const DIE_FACE_TRANSFORMS = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: -90, y: 0, z: 0 },
  3: { x: 0, y: -90, z: 0 },
  4: { x: 0, y: 90, z: 0 },
  5: { x: 90, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 }
};

const DIE_PIP_LAYOUTS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
};

function pipMarkup(value) {
  const active = new Set(DIE_PIP_LAYOUTS[value] || []);
  let html = "";

  for (let position = 1; position <= 9; position += 1) {
    html += `<span class="die-pip ${active.has(position) ? "active" : ""}" data-pip="${position}"></span>`;
  }

  return html;
}

function cubeFaceMarkup() {
  return `
    <span class="dice3d-face dice3d-front" data-face="1">${pipMarkup(1)}</span>
    <span class="dice3d-face dice3d-back" data-face="6">${pipMarkup(6)}</span>
    <span class="dice3d-face dice3d-right" data-face="3">${pipMarkup(3)}</span>
    <span class="dice3d-face dice3d-left" data-face="4">${pipMarkup(4)}</span>
    <span class="dice3d-face dice3d-top" data-face="2">${pipMarkup(2)}</span>
    <span class="dice3d-face dice3d-bottom" data-face="5">${pipMarkup(5)}</span>
  `;
}

function staticDieFaceMarkup(value) {
  return `
    <span class="dice3d-static-face" data-static-value="${value}">
      ${pipMarkup(value)}
    </span>
  `;
}

function faceTransform(value, extraX = 0, extraY = 0, extraZ = 0) {
  const base = DIE_FACE_TRANSFORMS[value] || DIE_FACE_TRANSFORMS[1];

  return [
    `rotateX(${base.x + extraX}deg)`,
    `rotateY(${base.y + extraY}deg)`,
    `rotateZ(${base.z + extraZ}deg)`
  ].join(" ");
}

function effectiveHeldState(baseHeld = null) {
  const held = [
    ...(baseHeld ||
      state.gameState?.held ||
      [false, false, false, false, false])
  ];

  for (let index = 0; index < 5; index += 1) {
    if (Object.prototype.hasOwnProperty.call(state.optimisticHolds, index)) {
      held[index] = Boolean(state.optimisticHolds[index]);
    }
  }

  return held;
}

function updateDieHoldVisual(button, held) {
  if (!button) return;

  button.classList.toggle("held", held);

  const label = button.querySelector(".dice3d-hold-label");
  if (label) label.textContent = held ? tr("고정", "HOLD") : "";
}

function clearOptimisticHolds() {
  state.optimisticHolds = {};
}

function queueHoldServerUpdate(index, desiredHeld, version) {
  holdRequestQueues[index] = holdRequestQueues[index]
    .catch(() => {})
    .then(() =>
      setHoldOptimistically(index, desiredHeld, version)
    );
}

async function setHoldOptimistically(index, desiredHeld, version) {
  try {
    const { error } = await db.rpc("set_yacht_hold", {
      p_room_id: state.activeRoom.id,
      p_die_index: index + 1,
      p_held: desiredHeld
    });

    if (error) throw error;

    // Only the newest click for this die is allowed to clear the local override.
    if (state.holdVersions[index] === version) {
      await loadGameData();
      delete state.optimisticHolds[index];

      if (state.page === "game") {
        renderDice();
        renderScoreTable();
      }
    }
  } catch (error) {
    console.error("hold update:", error);

    if (state.holdVersions[index] === version) {
      delete state.optimisticHolds[index];
      await loadGameData();

      if (state.page === "game") {
        renderDice();
        renderScoreTable();
      }
    }

    showToast(error.message || tr("주사위 고정을 반영하지 못했습니다.", "Could not update the die hold."));
  }
}

function shouldShowWaitingDice() {
  return Boolean(
    state.gameState &&
    !state.gameState.finished &&
    !state.gameState.has_rolled
  );
}

function applySpinVariables(button, index) {
  const duration = 1150 + Math.floor(Math.random() * 480);
  const delay = -Math.floor(Math.random() * duration);
  const x = 720 + Math.floor(Math.random() * 720);
  const y = 720 + Math.floor(Math.random() * 720);
  const z = 360 + Math.floor(Math.random() * 540);

  button.style.setProperty("--dice-spin-duration", `${duration}ms`);
  button.style.setProperty("--dice-spin-delay", `${delay}ms`);
  button.style.setProperty("--dice-spin-x", `${x}deg`);
  button.style.setProperty("--dice-spin-y", `${y}deg`);
  button.style.setProperty("--dice-spin-z", `${z}deg`);
  button.style.setProperty("--dice-bob-delay", `${-index * 61}ms`);
}

function beginPendingRoll(heldBefore) {
  let buttons = [...el("diceArea").querySelectorAll(".dice3d-button")];

  if (buttons.length !== 5) {
    renderDice(
      state.displayDice ||
        state.gameState?.dice ||
        [1, 1, 1, 1, 1],
      heldBefore
    );

    buttons = [...el("diceArea").querySelectorAll(".dice3d-button")];
  }

  buttons.forEach((button, index) => {
    if (heldBefore[index]) {
      button.classList.remove("waiting", "pending", "rolling");
      return;
    }

    applySpinVariables(button, index);
    button.classList.remove("rolling");
    button.classList.add("pending");
  });
}

function freezeSpinningCube(button, fallbackValue) {
  const cube = button.querySelector(".dice3d-cube");
  if (!cube) return null;

  // Capture the exact visual transform BEFORE removing the infinite spin class.
  const computedTransform = getComputedStyle(cube).transform;

  cube.getAnimations().forEach(animation => animation.cancel());
  button.getAnimations().forEach(animation => animation.cancel());

  button.classList.remove("waiting", "pending");
  button.classList.add("rolling");

  cube.style.animation = "none";
  cube.style.transform =
    computedTransform && computedTransform !== "none"
      ? computedTransform
      : faceTransform(fallbackValue);

  return cube.style.transform;
}

function renderDice(diceOverride = null, heldOverride = null) {
  const area = el("diceArea");
  area.innerHTML = "";

  const waiting = !diceOverride && shouldShowWaitingDice();

  const dice =
    diceOverride ||
    (!waiting && state.displayDice) ||
    state.gameState?.dice ||
    [1, 1, 1, 1, 1];

  const held = effectiveHeldState(heldOverride);

  dice.forEach((rawValue, index) => {
    const value = Number(rawValue) || 1;
    const button = document.createElement("button");

    button.type = "button";
    button.className = [
      "dice3d-button",
      held[index] ? "held" : "",
      waiting ? "waiting" : ""
    ].filter(Boolean).join(" ");

    if (waiting && !held[index]) {
      applySpinVariables(button, index);
    }

    button.disabled =
      !isMyTurn() ||
      !state.gameState.has_rolled ||
      state.gameState.finished ||
      state.diceAnimating ||
      state.isSpectator;

    button.setAttribute(
      "aria-label",
      state.language === "ko"
        ? `${index + 1}번째 주사위: ${value}`
        : `Die ${index + 1}: ${value}`
    );
    button.dataset.dieIndex = index;

    button.innerHTML = `
      <span class="dice3d-stage">
        <span class="dice3d-shadow" aria-hidden="true"></span>

        ${staticDieFaceMarkup(value)}

        <span class="dice3d-cube"
              data-index="${index}"
              data-value="${value}"
              style="transform:${faceTransform(value)}"
              aria-hidden="true">
          ${cubeFaceMarkup()}
        </span>
      </span>
      <span class="dice3d-hold-label">${held[index] ? tr("고정", "HOLD") : ""}</span>
    `;

    button.addEventListener("click", () => {
      if (
        !isMyTurn() ||
        state.busy ||
        state.diceAnimating ||
        state.isSpectator ||
        !state.gameState?.has_rolled
      ) {
        return;
      }

      const currentHeld = effectiveHeldState()[index];
      const desiredHeld = !currentHeld;

      state.optimisticHolds[index] = desiredHeld;
      state.holdVersions[index] += 1;

      const version = state.holdVersions[index];
      updateDieHoldVisual(button, desiredHeld);

      queueHoldServerUpdate(index, desiredHeld, version);
    });

    area.appendChild(button);
  });
}

function isYahtzeeDice(dice) {
  return Array.isArray(dice) &&
    dice.length === 5 &&
    dice.every(value => value === dice[0]);
}

function triggerYahtzeeCelebration(playerName = "") {
  const overlay = el("yahtzeeCelebration");
  const confetti = el("yahtzeeConfetti");

  clearTimeout(state.yahtzeeCelebrationTimer);

  el("yahtzeeCelebrationPlayer").textContent =
    state.language === "ko"
      ? (playerName ? `${playerName}님이 요트를 완성했습니다!` : "요트를 완성했습니다!")
      : (playerName ? `${playerName} rolled a Yahtzee!` : "Yahtzee!");

  confetti.innerHTML = "";

  for (let i = 0; i < 56; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    piece.style.setProperty("--rot", `${Math.random() * 900 - 450}deg`);
    piece.style.setProperty("--delay", `${Math.random() * 0.26}s`);
    piece.style.setProperty("--duration", `${0.9 + Math.random() * 0.65}s`);
    confetti.appendChild(piece);
  }

  overlay.classList.remove("hidden");

  state.yahtzeeCelebrationTimer = setTimeout(() => {
    overlay.classList.add("hidden");
    confetti.innerHTML = "";
  }, 1900);
}


function maybeCelebrateServerConfirmedYacht() {
  if (!state.gameState) return;

  const rollId = Number(state.gameState.last_roll_id || 0);

  if (
    !state.gameState.last_roll_was_yacht ||
    rollId <= 0 ||
    rollId <= Number(state.lastCelebratedRollId || 0)
  ) {
    return;
  }

  state.lastCelebratedRollId = rollId;

  const roller = state.roomPlayers.find(
    player => player.userId === state.gameState.last_roll_user_id
  );

  triggerYahtzeeCelebration(
    roller?.username || currentTurnPlayer()?.username || ""
  );
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function animateHeldDie(button, _cube, _value) {
  const pulse = button.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-2px) scale(1.02)" },
      { transform: "translateY(0) scale(1)" }
    ],
    {
      duration: 230,
      easing: "ease-out"
    }
  );

  return pulse.finished.catch(() => {});
}

async function animateDiceRoll(
  targetValues,
  heldBefore = [],
  startValues = null
) {
  const safeTargets =
    Array.isArray(targetValues) && targetValues.length === 5
      ? targetValues.map(value => Number(value) || 1)
      : [1, 1, 1, 1, 1];

  const safeHeld =
    Array.isArray(heldBefore) && heldBefore.length === 5
      ? heldBefore.map(Boolean)
      : [false, false, false, false, false];

  const safeStart =
    Array.isArray(startValues) && startValues.length === 5
      ? startValues.map(value => Number(value) || 1)
      : safeTargets;

  let buttons = [...el("diceArea").querySelectorAll(".dice3d-button")];

  if (buttons.length !== 5) {
    renderDice(safeStart, safeHeld);
    beginPendingRoll(safeHeld);

    await new Promise(resolve =>
      requestAnimationFrame(resolve)
    );

    buttons = [...el("diceArea").querySelectorAll(".dice3d-button")];
  }

  if (buttons.length !== 5) {
    console.error("Dice render failed: expected 5 dice, got", buttons.length);
    state.displayDice = [...safeTargets];
    renderDice(state.displayDice, safeHeld);
    return;
  }

  const animations = buttons.map((button, index) => {
    const cube = button.querySelector(".dice3d-cube");
    const shadow = button.querySelector(".dice3d-shadow");
    const target = safeTargets[index];

    if (!cube) return Promise.resolve();

    if (safeHeld[index]) {
      button.classList.remove("waiting", "pending", "rolling");
      return animateHeldDie(button, cube, target);
    }

    const startTransform =
      freezeSpinningCube(button, safeStart[index]) ||
      faceTransform(safeStart[index]);

    const base = DIE_FACE_TRANSFORMS[target] || DIE_FACE_TRANSFORMS[1];

    const turnsX = 3 + Math.floor(Math.random() * 4);
    const turnsY = 3 + Math.floor(Math.random() * 4);
    const turnsZ = 1 + Math.floor(Math.random() * 3);

    const directionX = Math.random() < 0.5 ? -1 : 1;
    const directionY = Math.random() < 0.5 ? -1 : 1;
    const directionZ = Math.random() < 0.5 ? -1 : 1;

    const spinX = directionX * turnsX * 360;
    const spinY = directionY * turnsY * 360;
    const spinZ = directionZ * turnsZ * 360;

    const sideways = randomBetween(-10, 10);
    const jump = randomBetween(14, 23);
    const duration = 860 + Math.floor(Math.random() * 220);
    const delay = index * 28;

    const cubeAnimation = cube.animate(
      [
        {
          transform: startTransform,
          offset: 0
        },
        {
          transform:
            `rotateX(${spinX * 0.55}deg) ` +
            `rotateY(${spinY * 0.58}deg) ` +
            `rotateZ(${spinZ * 0.48}deg)`,
          offset: 0.5
        },
        {
          transform:
            `rotateX(${base.x + spinX}deg) ` +
            `rotateY(${base.y + spinY}deg) ` +
            `rotateZ(${base.z + spinZ}deg)`,
          offset: 1
        }
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(.18,.72,.22,1)",
        fill: "forwards"
      }
    );

    const buttonAnimation = button.animate(
      [
        { transform: "translate3d(0,0,0)" },
        { transform: `translate3d(${sideways}px, ${-jump}px, 0)` },
        { transform: "translate3d(0,0,0)" }
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(.2,.7,.25,1)"
      }
    );

    const shadowAnimation = shadow
      ? shadow.animate(
          [
            { transform: "translateX(-50%) scale(1)", opacity: .2 },
            { transform: "translateX(-50%) scale(.62)", opacity: .08 },
            { transform: "translateX(-50%) scale(1)", opacity: .2 }
          ],
          {
            duration,
            delay,
            easing: "ease-in-out"
          }
        )
      : null;

    const pending = [
      cubeAnimation.finished.catch(() => {}),
      buttonAnimation.finished.catch(() => {})
    ];

    if (shadowAnimation) {
      pending.push(shadowAnimation.finished.catch(() => {}));
    }

    return Promise.all(pending).then(() => {
      cubeAnimation.cancel();
      buttonAnimation.cancel();
      shadowAnimation?.cancel();

      cube.style.animation = "";
      cube.style.transform = faceTransform(target);
      cube.dataset.value = target;
      button.classList.remove("rolling", "waiting", "pending");
    });
  });

  await Promise.all(animations);

  // The server result becomes the only visible static result.
  state.displayDice = [...safeTargets];

  renderDice(
    state.displayDice,
    state.gameState?.held || safeHeld
  );

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
    return c.length === 2 && c[0] === 2 && c[1] === 3 ? 25 : 0;
  }
  if (category === "smallStraight") {
    return (
      [1,2,3,4].every(v => unique.includes(v)) ||
      [2,3,4,5].every(v => unique.includes(v)) ||
      [3,4,5,6].every(v => unique.includes(v))
    ) ? 30 : 0;
  }
  if (category === "largeStraight") {
    const s = JSON.stringify(unique);
    return s === JSON.stringify([1,2,3,4,5]) ||
           s === JSON.stringify([2,3,4,5,6]) ? 40 : 0;
  }
  if (category === "yacht") return counts.size === 1 ? 50 : 0;
  return 0;
}

function createScoreCategoryRow(player, category, scoreMap, isTurnPlayer) {
  const used = Object.prototype.hasOwnProperty.call(scoreMap, category.key);

  const canChoose =
    isTurnPlayer &&
    player.userId === currentUserId() &&
    !state.isSpectator &&
    state.gameState.has_rolled &&
    !used &&
    !state.gameState.finished &&
    !state.diceAnimating;

  const canPreview =
    isTurnPlayer &&
    state.gameState.has_rolled &&
    !used &&
    !state.gameState.finished;

  const value = used
    ? scoreMap[category.key]
    : canPreview
      ? previewScore(category.key, state.gameState.dice)
      : "—";

  const button = document.createElement("button");
  button.className =
    `score-row ${used ? "used" : ""} ${canChoose ? "selectable" : ""}`;
  button.disabled = !canChoose;
  button.title = categoryRule(category);

  button.innerHTML = `
    <span>
      <span class="score-name">${categoryName(category)}</span>
      <span class="score-rule">${categoryRule(category)}</span>
    </span>
    <span class="score-value ${canChoose ? "score-preview" : ""}">
      ${value}
    </span>
  `;

  if (canChoose) {
    button.addEventListener("click", () => chooseScore(category.key));
  }

  return button;
}

function scoreSummaryRow(label, detail, value, className = "") {
  const row = document.createElement("div");
  row.className = `score-summary-row ${className}`.trim();

  row.innerHTML = `
    <span>
      <strong>${label}</strong>
      ${detail ? `<small>${detail}</small>` : ""}
    </span>
    <strong>${value}</strong>
  `;

  return row;
}

function renderScoreTable() {
  const table = el("scoreTable");
  table.innerHTML = "";

  if (!state.roomPlayers.length || !state.gameState) return;

  state.roomPlayers.forEach(player => {
    const scoreMap = playerScoreMap(player.userId);
    const isTurnPlayer =
      player.seat === state.gameState.current_seat;

    const card = document.createElement("section");
    card.className =
      `player-score-card ${isTurnPlayer ? "active" : ""} ${
        player.userId === currentUserId() ? "mine" : ""
      }`;

    const upperSubtotal = upperSubtotalFor(player.userId);
    const upperBonus = upperBonusFor(player.userId);
    const yachtBonus = yachtBonusFor(player.userId);

    card.innerHTML = `
      <div class="player-score-card-head">
        <div>
          <strong>${escapeHTML(player.username)}</strong>
          <small>
            ${state.language === "ko"
              ? `승 ${player.wins} · 누적 요트 ${player.yachtRolls} · 이번 게임 요트 ${player.gameYachtRolls}`
              : `Wins ${player.wins} · Lifetime Yahtzees ${player.yachtRolls} · This game ${player.gameYachtRolls}`}
          </small>
        </div>
        <strong class="player-score-total">${totalFor(player.userId)}점</strong>
      </div>

      <div class="player-score-sections">
        <section class="player-score-section">
          <div class="score-section-label">
            <span>${tr("상단", "UPPER")}</span>
          </div>
          <div class="player-score-upper"></div>
        </section>

        <section class="player-score-section">
          <div class="score-section-label lower-label">
            <span>${tr("하단", "LOWER")}</span>
          </div>
          <div class="player-score-lower"></div>
        </section>
      </div>
    `;

    const upperContainer = card.querySelector(".player-score-upper");
    const lowerContainer = card.querySelector(".player-score-lower");

    categories
      .filter(category => category.section === "upper")
      .forEach(category => {
        upperContainer.appendChild(
          createScoreCategoryRow(player, category, scoreMap, isTurnPlayer)
        );
      });

    upperContainer.appendChild(
      scoreSummaryRow(
        tr("상단 합계", "Upper subtotal"),
        tr("63점 이상이면 보너스", "Bonus at 63+"),
        `${upperSubtotal} / 63`
      )
    );

    upperContainer.appendChild(
      scoreSummaryRow(
        tr("상단 보너스", "Upper bonus"),
        tr("63점 이상 +35", "63+ gives +35"),
        upperBonus ? "+35" : "0",
        upperBonus ? "bonus-earned" : ""
      )
    );

    categories
      .filter(category => category.section === "lower")
      .forEach(category => {
        lowerContainer.appendChild(
          createScoreCategoryRow(player, category, scoreMap, isTurnPlayer)
        );
      });

    lowerContainer.appendChild(
      scoreSummaryRow(
        tr("추가 요트 보너스", "Additional Yahtzee bonus"),
        tr("추가 요트마다 +100", "+100 for each additional Yahtzee"),
        yachtBonus ? `+${yachtBonus}` : "0",
        yachtBonus ? "bonus-earned" : ""
      )
    );

    table.appendChild(card);
  });
}
function renderGameHud() {
  const player = currentTurnPlayer();
  if (!player) return;

  el("gameModeBadge").classList.toggle("hidden", !state.isSpectator);

  el("gameHelpText").textContent = state.isSpectator
    ? tr(
        "관전 모드입니다. 게임 상태를 실시간으로 볼 수 있고 채팅만 보낼 수 있습니다.",
        "Spectator mode. You can watch the game state in real time and use chat only."
      )
    : tr(
        "자신의 차례에만 주사위를 굴릴 수 있습니다. 주사위를 누르면 고정되며, 점수표의 한 항목을 선택하면 다음 플레이어로 차례가 넘어갑니다.",
        "Roll only on your turn. Click a die to hold it, then choose a score category to pass the turn."
      );

  const used = Object.keys(playerScoreMap(player.userId)).length;

  el("currentPlayerText").textContent = player.username;
  el("roundText").textContent = `${Math.min(used + 1, 12)} / 12`;
  el("rollsText").textContent = state.gameState.rolls_left;
  el("scoreSheetPlayer").textContent = tr("모든 플레이어 점수표", "All player score sheets");

  const me = state.roomPlayers.find(
    roomPlayer => roomPlayer.userId === currentUserId()
  );

  el("totalScore").textContent =
    me ? totalFor(me.userId) : "—";

  const rollBtn = el("rollBtn");
  rollBtn.disabled =
    !isMyTurn() ||
    state.gameState.rolls_left <= 0 ||
    state.gameState.finished ||
    state.diceAnimating;

  rollBtn.textContent = state.gameState.has_rolled ? tr("다시 굴리기", "Roll again") : tr("주사위 굴리기", "Roll dice");

  if (state.gameState.finished) {
    el("statusText").textContent = tr("게임이 종료되었습니다.", "The game has ended.");
  } else if (state.isSpectator) {
    el("statusText").textContent =
      state.language === "ko" ? `${player.username}님의 차례를 관전 중입니다. 게임 조작은 할 수 없습니다.` : `Watching ${player.username}'s turn. Game controls are disabled.`;
  } else if (isMyTurn()) {
    el("statusText").textContent =
      state.gameState.rolls_left > 0
        ? tr("자신의 차례입니다.", "It is your turn.")
        : tr("굴리기를 모두 사용했습니다. 점수 항목을 선택하세요.", "You have used all rolls. Choose a score category.");
  } else {
    el("statusText").textContent = state.language === "ko" ? `${player.username}님의 차례를 기다리는 중입니다.` : `Waiting for ${player.username}'s turn.`;
  }
}

async function rollDice() {
  if (!state.activeRoom || state.busy || !isMyTurn() || state.diceAnimating) return;

  state.busy = true;
  state.diceAnimating = true;

  clearOptimisticHolds();

  const heldBefore = [...(state.gameState.held || [false, false, false, false, false])];
  const diceBefore = [
    ...(state.displayDice || state.gameState.dice || [1, 1, 1, 1, 1])
  ];

  // Immediately hide every rerolled old face and start indefinite 3D spinning.
  // Held dice remain visible and unchanged.
  beginPendingRoll(heldBefore);
  startDiceRollSound();

  el("rollBtn").disabled = true;
  el("statusText").textContent = tr("주사위가 굴러가는 중입니다...", "Rolling dice...");

  try {
    const { data, error } = await db.rpc("roll_yacht_dice_v2", {
      p_room_id: state.activeRoom.id
    });

    if (error) throw error;

    const targetValues = Array.isArray(data?.dice) ? data.dice : null;
    await loadGameData();

    if (data?.is_yahtzee === true) {
      await Promise.all([
        loadRoomPlayers(),
        loadProfile()
      ]);
    }

    await animateDiceRoll(
      targetValues || state.gameState.dice,
      heldBefore,
      diceBefore
    );

    maybeCelebrateServerConfirmedYacht();
  } catch (error) {
    console.error(error);
    stopDiceRollSound();
    state.displayDice = [...diceBefore];
    renderDice(state.displayDice, heldBefore);
    showToast(error.message || tr("주사위를 굴리지 못했습니다.", "Could not roll the dice."));
  } finally {
    stopDiceRollSound();
    state.diceAnimating = false;
    state.busy = false;
    if (state.page === "game") renderGame();
  }
}

async function chooseScore(category) {
  if (!state.activeRoom || state.busy || !isMyTurn() || state.isSpectator) return;

  clearOptimisticHolds();
  state.busy = true;
  try {
    const { error } = await db.rpc("choose_yacht_score", {
      p_room_id: state.activeRoom.id,
      p_category: category
    });

    if (error) throw error;

    await loadGameData();

    if (
      state.page === "game" &&
      state.gameState &&
      !state.gameState.finished
    ) {
      state.displayDice = null;
      renderGame();
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || tr("점수를 확정하지 못했습니다.", "Could not confirm the score."));
  } finally {
    state.busy = false;
  }
}

async function handleGameRefresh() {
  if (!state.activeRoom) return;

  const previous = state.gameState
    ? {
        rolls_left: state.gameState.rolls_left,
        current_seat: state.gameState.current_seat,
        dice: [...(state.gameState.dice || [1, 1, 1, 1, 1])],
        held: [...(state.gameState.held || [false, false, false, false, false])],
        has_rolled: Boolean(state.gameState.has_rolled),
        last_roll_id: Number(state.gameState.last_roll_id || 0)
      }
    : null;

  await loadGameData();

  if (state.page !== "game") return;

  if (state.diceAnimating) {
    renderPlayerStrip();
    renderScoreTable();
    renderGameHud();
    renderChat();
    return;
  }

  if (
    previous &&
    previous.current_seat !== state.gameState.current_seat
  ) {
    clearOptimisticHolds();
    state.displayDice = null;
  }

  const remoteRollDetected =
    previous &&
    !state.diceAnimating &&
    Number(state.gameState.last_roll_id || 0) > previous.last_roll_id;

  if (remoteRollDetected) {
    state.diceAnimating = true;
    renderPlayerStrip();
    renderScoreTable();
    renderGameHud();

    beginPendingRoll(previous.held);
    startDiceRollSound();

    await new Promise(resolve =>
      requestAnimationFrame(resolve)
    );

    await animateDiceRoll(
      state.gameState.dice,
      previous.held,
      previous.dice
    );

    stopDiceRollSound();
    state.diceAnimating = false;
    maybeCelebrateServerConfirmedYacht();
  }

  renderGame();
}




function setFeedbackAvailability() {
  const enabled = isLoggedIn();

  el("feedbackKind").disabled = !enabled;
  el("feedbackBody").disabled = !enabled;
  el("feedbackSubmitBtn").disabled = !enabled;
  el("feedbackLoginHint").classList.toggle("hidden", enabled);

  if (!enabled) {
    el("feedbackBody").placeholder =
      tr("로그인 후 개발자에게 피드백을 보낼 수 있습니다.", "Sign in to send feedback to the developer.");
  } else {
    el("feedbackBody").placeholder =
      tr("개발자에게 전달할 내용을 입력하세요.", "Enter feedback for the developer.");
  }
}

function updateFeedbackCharCount() {
  const length = el("feedbackBody").value.length;
  el("feedbackCharCount").textContent = `${length} / 1000`;
}

async function submitFeedback(event) {
  event.preventDefault();

  if (!isLoggedIn()) {
    navigate("account");
    showToast(tr("로그인 후 피드백을 보낼 수 있습니다.", "Sign in to send feedback."));
    return;
  }

  const kind = el("feedbackKind").value;
  const body = el("feedbackBody").value.trim();
  const button = el("feedbackSubmitBtn");

  if (!body) {
    showToast(tr("피드백 내용을 입력해 주세요.", "Enter a feedback message."));
    return;
  }

  button.disabled = true;
  button.textContent = tr("보내는 중...", "Sending...");

  try {
    const { error } = await db.rpc("submit_feedback", {
      p_kind: kind,
      p_body: body
    });

    if (error) throw error;

    el("feedbackBody").value = "";
    updateFeedbackCharCount();
    showToast(tr("피드백을 개발자에게 보냈습니다.", "Feedback sent to the developer."));
  } catch (error) {
    console.error("submit feedback:", error);
    showToast(error.message || tr("피드백을 보내지 못했습니다.", "Could not send feedback."));
  } finally {
    button.disabled = false;
    button.textContent = tr("피드백 보내기", "Send feedback");
    setFeedbackAvailability();
  }
}

function initGlobalEmojiPicker() {
  const picker = el("globalEmojiPicker");

  picker.innerHTML = CHAT_EMOJIS
    .map(emoji => `<button type="button" class="emoji-option" data-global-emoji="${emoji}">${emoji}</button>`)
    .join("");
}

function setGlobalChatAvailability() {
  const enabled = isLoggedIn();

  el("globalChatInput").disabled = !enabled;
  el("globalChatSendBtn").disabled = !enabled;
  el("globalEmojiToggleBtn").disabled = !enabled;
  el("globalChatLoginHint").classList.toggle("hidden", enabled);

  if (!enabled) {
    el("globalChatInput").placeholder =
      tr("로그인 후 전체 채팅에 참여할 수 있습니다", "Sign in to join the global chat");
  } else {
    el("globalChatInput").placeholder =
      tr("모두에게 메시지를 보내세요", "Send a message to everyone");
  }
}

async function loadGlobalMessages() {
  const { data, error } = await db
    .from("global_messages")
    .select("id, sender_id, sender_name, body, created_at")
    .order("created_at", { ascending: true })
    .limit(120);

  if (error) {
    console.error("global chat load:", error);
    el("globalChatMessages").innerHTML =
      `<div class="chat-empty">${tr("전체 채팅을 불러오지 못했습니다.", "Could not load global chat.")}</div>`;
    return;
  }

  state.globalMessages = data || [];
  renderGlobalChat();
}

function renderGlobalChat() {
  const container = el("globalChatMessages");
  container.innerHTML = "";

  setGlobalChatAvailability();

  if (!state.globalMessages.length) {
    container.innerHTML =
      `<div class="chat-empty">${tr("아직 전체 채팅 메시지가 없습니다.", "No global chat messages yet.")}</div>`;
  } else {
    state.globalMessages.forEach(message => {
      const item = document.createElement("div");
      item.className =
        `global-chat-message ${isEmojiOnlyMessage(message.body) ? "emoji-only" : ""}`;

      item.innerHTML = `
        <div class="global-chat-message-head">
          <strong>${escapeHTML(message.sender_name)}</strong>
          <small>${new Date(message.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit"
          })}</small>
        </div>
        <p>${escapeHTML(message.body)}</p>
      `;

      container.appendChild(item);
    });
  }

  el("globalChatCount").textContent = String(state.globalMessages.length);
  container.scrollTop = container.scrollHeight;
}

function cleanupGlobalChatChannel() {
  if (state.globalChatChannel && db) {
    db.removeChannel(state.globalChatChannel);
  }

  state.globalChatChannel = null;
}

async function setupGlobalChat() {
  cleanupGlobalChatChannel();
  setGlobalChatAvailability();

  await loadGlobalMessages();

  state.globalChatChannel = db
    .channel("playground-global-chat-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "global_messages"
      },
      payload => {
        if (!state.globalMessages.some(message => message.id === payload.new.id)) {
          state.globalMessages.push(payload.new);

          if (state.globalMessages.length > 120) {
            state.globalMessages = state.globalMessages.slice(-120);
          }

          renderGlobalChat();
        }
      }
    )
    .subscribe();
}

async function sendGlobalChat(event) {
  event.preventDefault();

  if (!isLoggedIn()) {
    navigate("account");
    showToast(tr("로그인 후 전체 채팅을 사용할 수 있습니다.", "Sign in to use global chat."));
    return;
  }

  const input = el("globalChatInput");
  const body = input.value.trim();

  if (!body) return;

  input.value = "";

  try {
    const { error } = await db.rpc("send_global_message", {
      p_body: body
    });

    if (error) throw error;
  } catch (error) {
    console.error("global chat send:", error);
    showToast(error.message || tr("전체 채팅 메시지를 보내지 못했습니다.", "Could not send the global chat message."));
  }
}

function toggleGlobalEmojiPicker() {
  if (!isLoggedIn()) return;
  el("globalEmojiPicker").classList.toggle("hidden");
}

function insertGlobalEmoji(emoji) {
  const input = el("globalChatInput");
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  input.value =
    input.value.slice(0, start) +
    emoji +
    input.value.slice(end);

  const cursor = start + emoji.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

async function sendGlobalEmoji(emoji) {
  if (!isLoggedIn()) return;

  try {
    const { error } = await db.rpc("send_global_message", {
      p_body: emoji
    });

    if (error) throw error;
  } catch (error) {
    console.error("global emoji:", error);
    showToast(tr("이모티콘을 보내지 못했습니다.", "Could not send the emoji."));
  }
}

async function sendRoomEmoji(emoji) {
  if (!isLoggedIn() || !state.activeRoom) return;

  try {
    const { error } = await db.rpc("send_room_message", {
      p_room_id: state.activeRoom.id,
      p_body: emoji
    });

    if (error) throw error;
  } catch (error) {
    console.error("room emoji:", error);
    showToast(tr("이모티콘을 보내지 못했습니다.", "Could not send the emoji."));
  }
}


function initEmojiPicker() {
  const picker = el("emojiPicker");
  picker.innerHTML = CHAT_EMOJIS
    .map(emoji => `<button type="button" class="emoji-option" data-emoji="${emoji}">${emoji}</button>`)
    .join("");
}

function toggleEmojiPicker() {
  el("emojiPicker").classList.toggle("hidden");
}

function insertEmoji(emoji) {
  const input = el("chatInput");
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  input.value =
    input.value.slice(0, start) +
    emoji +
    input.value.slice(end);

  const cursor = start + emoji.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

function isEmojiOnlyMessage(text) {
  const compact = String(text || "").replace(/\s/g, "");
  if (!compact) return false;

  try {
    return /^[\p{Extended_Pictographic}\uFE0F\u200D]+$/u.test(compact);
  } catch {
    return false;
  }
}

function selectedBgmTrack() {
  return BGM_TRACKS[state.bgmTrackIndex] || BGM_TRACKS[0];
}

function bgmTrackIndexForTime(currentTime) {
  let index = 0;

  for (let i = 0; i < BGM_TRACKS.length; i += 1) {
    if (currentTime >= BGM_TRACKS[i].start) {
      index = i;
    } else {
      break;
    }
  }

  return index;
}

function allBgmTrackSelects() {
  return [
    el("bgmTrackSelect"),
    el("lobbyBgmTrackSelect")
  ].filter(Boolean);
}


function isRoomBgmSyncLeader() {
  return Boolean(
    state.activeRoom &&
    currentUserId() &&
    state.activeRoom.hostId === currentUserId() &&
    !state.isSpectator
  );
}

function stopRoomBgmSyncTimer() {
  if (state.bgmSyncTimer !== null) {
    clearInterval(state.bgmSyncTimer);
    state.bgmSyncTimer = null;
  }
}

function startRoomBgmSyncTimer() {
  stopRoomBgmSyncTimer();

  if (
    !isRoomBgmSyncLeader() ||
    !state.roomBgm?.enabled
  ) {
    return;
  }

  state.bgmSyncTimer = setInterval(async () => {
    const audio = el("bgmAudio");

    if (
      !audio ||
      audio.paused ||
      !Number.isFinite(audio.currentTime)
    ) {
      return;
    }

    const now = Date.now();

    if (now - state.bgmLastSharedPushAt < 2500) {
      return;
    }

    state.bgmLastSharedPushAt = now;

    try {
      await setRoomBgmState({
        enabled: true,
        trackIndex: bgmTrackIndexForTime(audio.currentTime),
        positionSec: audio.currentTime
      }, {
        applyLocally: false
      });
    } catch (error) {
      console.warn("shared BGM heartbeat:", error);
    }
  }, 3500);
}

function allBgmToggleButtons() {
  return [
    el("bgmToggleBtn"),
    el("lobbyBgmToggleBtn")
  ].filter(Boolean);
}

function syncBgmControls() {
  allBgmTrackSelects().forEach(select => {
    select.value = String(state.bgmTrackIndex);

    // Spectators follow the room music but cannot change it.
    select.disabled =
      Boolean(state.isSpectator) ||
      !Boolean(state.activeRoom);
  });

  allBgmToggleButtons().forEach(button => {
    button.textContent = state.language === "ko"
      ? (state.bgmEnabled ? "♫ 배경음악 켬" : "♫ 배경음악 끔")
      : (state.bgmEnabled ? "♫ BGM ON" : "♫ BGM OFF");

    button.classList.toggle("active", state.bgmEnabled);

    button.disabled =
      Boolean(state.isSpectator) ||
      !Boolean(state.activeRoom);
  });
}

function normalizeRoomBgm(row) {
  if (!row) {
    return {
      enabled: false,
      trackIndex: 0,
      positionSec: 0,
      updatedAt: null
    };
  }

  const rawTrack = Number(row.bgm_track_index ?? 0);

  return {
    enabled: Boolean(row.bgm_enabled),
    trackIndex:
      Number.isInteger(rawTrack) &&
      rawTrack >= 0 &&
      rawTrack < BGM_TRACKS.length
        ? rawTrack
        : 0,
    positionSec: Math.max(
      0,
      Number(row.bgm_position_sec ?? 0) || 0
    ),
    updatedAt:
      row.bgm_updated_at ||
      null
  };
}

function roomBgmExpectedPosition(snapshot, audio) {
  let position = Number(snapshot?.positionSec || 0);

  if (snapshot?.enabled && snapshot.updatedAt) {
    const updatedMs = Date.parse(snapshot.updatedAt);

    if (Number.isFinite(updatedMs)) {
      position += Math.max(
        0,
        (Date.now() - updatedMs) / 1000
      );
    }
  }

  // The combined MP3 loops as one continuous playlist.
  if (
    audio &&
    Number.isFinite(audio.duration) &&
    audio.duration > 0
  ) {
    position =
      ((position % audio.duration) + audio.duration) %
      audio.duration;
  }

  return position;
}

async function loadRoomBgmState(roomId) {
  if (!roomId) return;

  const { data, error } = await db
    .from("rooms")
    .select(
      "id, bgm_enabled, bgm_track_index, " +
      "bgm_position_sec, bgm_updated_at"
    )
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("room BGM state:", error);
    return;
  }

  if (!data) return;

  await applyRoomBgmState(data, {
    forceSeek: true
  });
}

async function setRoomBgmState({
  enabled,
  trackIndex,
  positionSec
}, {
  applyLocally = true
} = {}) {
  if (!state.activeRoom || state.isSpectator) {
    return null;
  }

  const { data, error } = await db.rpc(
    "set_room_bgm_state",
    {
      p_room_id: state.activeRoom.id,
      p_enabled: Boolean(enabled),
      p_track_index: Number(trackIndex),
      p_position_sec: Number(positionSec)
    }
  );

  if (error) throw error;

  if (data && applyLocally) {
    await applyRoomBgmState(
      {
        bgm_enabled: data.enabled,
        bgm_track_index: data.track_index,
        bgm_position_sec: data.position_sec,
        bgm_updated_at: data.updated_at
      },
      { forceSeek: true }
    );
  }

  return data;
}

function audioErrorDescription(mediaError) {
  if (!mediaError) return "unknown media error";

  switch (mediaError.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "loading aborted";
    case MediaError.MEDIA_ERR_NETWORK:
      return "network error";
    case MediaError.MEDIA_ERR_DECODE:
      return "audio decode error";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "audio source not supported or unavailable";
    default:
      return `media error ${mediaError.code}`;
  }
}

function probeAudioSource(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const probe = new Audio();
    let settled = false;

    const cleanup = () => {
      probe.removeEventListener("loadedmetadata", onReady);
      probe.removeEventListener("canplay", onReady);
      probe.removeEventListener("error", onError);
      clearTimeout(timer);
    };

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();

      probe.pause();
      probe.removeAttribute("src");
      probe.load();

      callback(value);
    };

    const onReady = () => {
      finish(resolve, url);
    };

    const onError = () => {
      const reason = audioErrorDescription(probe.error);

      finish(
        reject,
        new Error(`${reason}: ${url}`)
      );
    };

    const timer = setTimeout(() => {
      finish(
        reject,
        new Error(`audio metadata timeout: ${url}`)
      );
    }, timeoutMs);

    probe.preload = "metadata";
    probe.addEventListener(
      "loadedmetadata",
      onReady,
      { once: true }
    );
    probe.addEventListener(
      "canplay",
      onReady,
      { once: true }
    );
    probe.addEventListener(
      "error",
      onError,
      { once: true }
    );

    probe.src = url;
    probe.load();
  });
}

async function resolveBgmSource() {
  if (state.bgmResolvedSrc) {
    return state.bgmResolvedSrc;
  }

  if (state.bgmResolvePromise) {
    return state.bgmResolvePromise;
  }

  state.bgmResolvePromise = (async () => {
    const localUrl =
      new URL(BGM_LOCAL_SRC, document.baseURI).href;

    const candidates = [
      {
        label: "GitHub Pages",
        url: localUrl
      },
      {
        label: "GitHub raw",
        url: BGM_RAW_FALLBACK
      }
    ];

    const failures = [];

    for (const candidate of candidates) {
      try {
        console.info(
          `[BGM] trying ${candidate.label}:`,
          candidate.url
        );

        const resolved =
          await probeAudioSource(candidate.url);

        console.info(
          `[BGM] playable source found via ${candidate.label}:`,
          resolved
        );

        state.bgmResolvedSrc = resolved;
        return resolved;

      } catch (error) {
        failures.push(
          `${candidate.label}: ${error.message}`
        );

        console.warn(
          `[BGM] ${candidate.label} failed:`,
          error
        );
      }
    }

    throw new Error(
      `BGM source failed | ${failures.join(" | ")}`
    );
  })();

  try {
    return await state.bgmResolvePromise;
  } finally {
    state.bgmResolvePromise = null;
  }
}

function stopBgmSegmentMonitor() {
  if (state.bgmSegmentMonitor !== null) {
    cancelAnimationFrame(state.bgmSegmentMonitor);
    state.bgmSegmentMonitor = null;
  }
}

function startBgmSegmentMonitor() {
  stopBgmSegmentMonitor();

  const audio = el("bgmAudio");

  const tick = () => {
    if (
      !state.bgmEnabled ||
      audio.paused ||
      !state.roomBgm?.enabled
    ) {
      state.bgmSegmentMonitor = null;
      return;
    }

    const currentIndex =
      bgmTrackIndexForTime(audio.currentTime);

    if (currentIndex !== state.bgmTrackIndex) {
      state.bgmTrackIndex = currentIndex;

      allBgmTrackSelects().forEach(select => {
        select.value = String(currentIndex);
      });

      localStorage.setItem(
        "playground_bgm_track",
        String(currentIndex)
      );
    }

    // Correct drift between players against the room's server timestamp.
    const now = performance.now();

    if (now - state.bgmLastDriftCheck >= 1200) {
      state.bgmLastDriftCheck = now;

      const expected =
        roomBgmExpectedPosition(
          state.roomBgm,
          audio
        );

      if (
        Number.isFinite(expected) &&
        Math.abs(audio.currentTime - expected) > 0.45
      ) {
        audio.currentTime = expected;
      }
    }

    state.bgmSegmentMonitor =
      requestAnimationFrame(tick);
  };

  state.bgmSegmentMonitor =
    requestAnimationFrame(tick);
}

function populateBgmTrackSelect(select) {
  select.innerHTML = BGM_TRACKS
    .map(
      (track, index) =>
        `<option value="${index}">${escapeHTML(track.title)}</option>`
    )
    .join("");

  select.value = String(state.bgmTrackIndex);
}

function initBgmControls() {
  const savedTrack = Number(
    localStorage.getItem(
      "playground_bgm_track"
    ) || 0
  );

  state.bgmTrackIndex =
    Number.isInteger(savedTrack) &&
    savedTrack >= 0 &&
    savedTrack < BGM_TRACKS.length
      ? savedTrack
      : 0;

  allBgmTrackSelects()
    .forEach(populateBgmTrackSelect);

  const audio = el("bgmAudio");
  audio.removeAttribute("src");
  audio.preload = "metadata";

  audio.addEventListener("ended", async () => {
    // The full playlist loops back to the first song.
    if (!state.roomBgm?.enabled) {
      state.bgmEnabled = false;
      stopBgmSegmentMonitor();
      stopRoomBgmSyncTimer();
      syncBgmControls();
      return;
    }

    audio.currentTime = 0;
    state.bgmTrackIndex = 0;
    state.bgmEnabled = true;
    syncBgmControls();

    if (isRoomBgmSyncLeader()) {
      try {
        await setRoomBgmState({
          enabled: true,
          trackIndex: 0,
          positionSec: 0
        }, { applyLocally: false });
      } catch (error) {
        console.warn("shared BGM playlist loop:", error);
      }
    }

    try {
      await audio.play();
      startBgmSegmentMonitor();
      startRoomBgmSyncTimer();
    } catch (error) {
      console.error("BGM playlist loop:", error);
      state.bgmPlaybackBlocked = true;
    }
  });

  syncBgmControls();
}

function updateBgmButton() {
  syncBgmControls();
}

function waitForAudioMetadata(audio) {
  if (audio.readyState >= 1) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(
        new Error("bgm file unavailable")
      );
    };

    const cleanup = () => {
      audio.removeEventListener(
        "loadedmetadata",
        onLoaded
      );
      audio.removeEventListener(
        "error",
        onError
      );
    };

    audio.addEventListener(
      "loadedmetadata",
      onLoaded,
      { once: true }
    );

    audio.addEventListener(
      "error",
      onError,
      { once: true }
    );

    audio.load();
  });
}

async function ensureBgmAudioSource() {
  const audio = el("bgmAudio");
  const resolved = await resolveBgmSource();

  if (audio.src !== resolved) {
    audio.src = resolved;
    audio.load();
  }

  return audio;
}

async function applyRoomBgmState(
  row,
  { forceSeek = false } = {}
) {
  const snapshot = normalizeRoomBgm(row);
  state.roomBgm = snapshot;

  if (!state.activeRoom) {
    return;
  }

  state.bgmEnabled = snapshot.enabled;

  if (!snapshot.enabled) {
    const audio = el("bgmAudio");

    audio.pause();
    stopBgmSegmentMonitor();

    state.bgmTrackIndex =
      snapshot.trackIndex;

    if (
      audio.readyState >= 1 &&
      Number.isFinite(snapshot.positionSec)
    ) {
      const pausedPosition =
        roomBgmExpectedPosition(
          snapshot,
          audio
        );

      if (Number.isFinite(pausedPosition)) {
        audio.currentTime = pausedPosition;
        state.bgmTrackIndex =
          bgmTrackIndexForTime(pausedPosition);
      }
    }

    state.bgmPlaybackBlocked = false;
    stopRoomBgmSyncTimer();
    syncBgmControls();
    return;
  }

  try {
    const audio =
      await ensureBgmAudioSource();

    await waitForAudioMetadata(audio);

    const expected =
      roomBgmExpectedPosition(
        snapshot,
        audio
      );

    if (
      forceSeek ||
      audio.paused ||
      Math.abs(audio.currentTime - expected) > 0.75
    ) {
      audio.currentTime = expected;
    }

    state.bgmTrackIndex =
      bgmTrackIndexForTime(expected);

    syncBgmControls();

    try {
      await audio.play();
      state.bgmPlaybackBlocked = false;
      startBgmSegmentMonitor();
      startRoomBgmSyncTimer();

    } catch (error) {
      // Browser autoplay policy can block a Realtime-triggered play().
      // The room state still remains ON; the next user click resumes it.
      console.warn(
        "[BGM] browser blocked synchronized autoplay:",
        error
      );

      state.bgmPlaybackBlocked = true;
      stopBgmSegmentMonitor();
      stopRoomBgmSyncTimer();
      syncBgmControls();
    }

  } catch (error) {
    console.error("BGM:", error);

    state.bgmPlaybackBlocked = true;
    stopBgmSegmentMonitor();
    stopRoomBgmSyncTimer();
    syncBgmControls();

    showToast(
      tr(
        "BGM을 열지 못했습니다. 개발자 도구 Console의 [BGM] 로그를 확인하세요.",
        "Could not open the BGM. Check the [BGM] entries in the developer console."
      )
    );
  }
}

function pauseLocalBgm() {
  const audio = el("bgmAudio");

  if (audio) {
    audio.pause();
  }

  stopBgmSegmentMonitor();
  stopRoomBgmSyncTimer();
  state.bgmEnabled = false;
  state.bgmPlaybackBlocked = false;
  syncBgmControls();
}

async function toggleBgm() {
  if (
    !state.activeRoom ||
    state.isSpectator
  ) {
    return;
  }

  const audio = el("bgmAudio");

  try {
    if (state.roomBgm?.enabled) {
      let position =
        state.roomBgm.positionSec;

      if (
        audio &&
        audio.readyState >= 1 &&
        Number.isFinite(audio.currentTime)
      ) {
        position = audio.currentTime;
      }

      await setRoomBgmState({
        enabled: false,
        trackIndex:
          bgmTrackIndexForTime(position),
        positionSec: position
      });

      return;
    }

    const resumePosition =
      Number(
        state.roomBgm?.positionSec ??
        BGM_TRACKS[state.bgmTrackIndex].start
      ) || 0;

    await setRoomBgmState({
      enabled: true,
      trackIndex:
        bgmTrackIndexForTime(resumePosition),
      positionSec: resumePosition
    });

  } catch (error) {
    console.error("toggle shared BGM:", error);

    showToast(
      tr(
        "방의 배경음악 상태를 변경하지 못했습니다.",
        "Could not change the room BGM state."
      )
    );
  }
}

async function changeBgmTrack(event = null) {
  if (
    !state.activeRoom ||
    state.isSpectator
  ) {
    syncBgmControls();
    return;
  }

  const sourceSelect =
    event?.currentTarget ||
    event?.target ||
    el("bgmTrackSelect");

  const index =
    Number(sourceSelect.value);

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= BGM_TRACKS.length
  ) {
    return;
  }

  const position =
    BGM_TRACKS[index].start;

  try {
    // Selecting a track turns the room BGM ON for everyone and
    // jumps every player to the same timestamp.
    await setRoomBgmState({
      enabled: true,
      trackIndex: index,
      positionSec: position
    });

  } catch (error) {
    console.error("change shared BGM track:", error);

    syncBgmControls();

    showToast(
      tr(
        "방의 음악을 변경하지 못했습니다.",
        "Could not change the room music."
      )
    );
  }
}

async function resumeBlockedRoomBgmFromGesture() {
  if (
    !state.bgmPlaybackBlocked ||
    !state.roomBgm?.enabled ||
    !state.activeRoom
  ) {
    return;
  }

  try {
    await applyRoomBgmState(
      {
        bgm_enabled: true,
        bgm_track_index:
          state.roomBgm.trackIndex,
        bgm_position_sec:
          state.roomBgm.positionSec,
        bgm_updated_at:
          state.roomBgm.updatedAt
      },
      { forceSeek: true }
    );
  } catch (error) {
    console.error(
      "resume synchronized BGM:",
      error
    );
  }
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

function renderRoomChatInto(messagesId, countId) {
  const container = el(messagesId);
  const counter = el(countId);

  if (!container || !counter) return;

  container.innerHTML = "";

  if (!state.messages.length) {
    container.innerHTML =
      `<div class="chat-empty">${
        tr("아직 메시지가 없습니다.", "No messages yet.")
      }</div>`;
  } else {
    state.messages.forEach(message => {
      const item = document.createElement("div");

      item.className =
        `chat-message ${
          isEmojiOnlyMessage(message.body)
            ? "emoji-only"
            : ""
        }`;

      item.innerHTML = `
        <strong>${escapeHTML(message.sender_name)}</strong>
        <p>${escapeHTML(message.body)}</p>
      `;

      container.appendChild(item);
    });
  }

  counter.textContent = state.messages.length;
  container.scrollTop = container.scrollHeight;
}

function renderChat() {
  renderRoomChatInto("chatMessages", "chatCount");
  renderRoomChatInto("lobbyChatMessages", "lobbyChatCount");
}
async function sendRoomChatBody(body) {
  if (!state.activeRoom || !body) return;

  const { error } = await db.rpc("send_room_message", {
    p_room_id: state.activeRoom.id,
    p_body: body
  });

  if (error) throw error;
}

async function sendChat(event) {
  event.preventDefault();
  if (!state.activeRoom) return;

  const input = el("chatInput");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";

  try {
    await sendRoomChatBody(body);
  } catch (error) {
    console.error(error);
    showToast(
      error.message ||
      tr("메시지를 보내지 못했습니다.", "Could not send the message.")
    );
  }
}

async function sendLobbyChat(event) {
  event.preventDefault();
  if (!state.activeRoom) return;

  const input = el("lobbyChatInput");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";

  try {
    await sendRoomChatBody(body);
  } catch (error) {
    console.error(error);
    showToast(
      error.message ||
      tr("메시지를 보내지 못했습니다.", "Could not send the message.")
    );
  }
}

function initLobbyEmojiPicker() {
  const picker = el("lobbyEmojiPicker");

  picker.innerHTML = CHAT_EMOJIS
    .map(
      emoji =>
        `<button type="button" class="emoji-option" data-lobby-emoji="${emoji}">${emoji}</button>`
    )
    .join("");
}

function toggleLobbyEmojiPicker() {
  el("lobbyEmojiPicker").classList.toggle("hidden");
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


function stopAdminAutoRefresh() {
  if (state.adminPoller) {
    clearTimeout(state.adminPoller);
    state.adminPoller = null;
  }
}

function startAdminAutoRefresh() {
  stopAdminAutoRefresh();

  const run = async () => {
    if (state.page !== "admin" || !isAdmin()) {
      stopAdminAutoRefresh();
      return;
    }

    await renderAdmin({ quiet: Boolean(state.adminData) });

    if (state.page === "admin") {
      state.adminPoller = setTimeout(run, 1000);
    }
  };

  run();
}

async function renderAdmin({ quiet = false } = {}) {
  if (!isAdmin() || state.adminRefreshInFlight) {
    return;
  }

  state.adminRefreshInFlight = true;

  const summary = el("adminSummary");

  if (!quiet && !state.adminData) {
    summary.innerHTML =
      `<article class="card admin-stat"><span>불러오는 중</span><strong>...</strong></article>`;
  }

  try {
    const { data, error } = await db.rpc("get_admin_dashboard");

    if (error) throw error;

    state.adminData = data || {};

    if (state.page === "admin") {
      renderAdminDashboard();

      const badge = el("refreshAdminBtn");
      const now = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      badge.textContent = state.language === "ko" ? `● 자동 업데이트 ${now}` : `● Auto updated ${now}`;
    }
  } catch (error) {
    console.error("admin dashboard:", error);

    if (!quiet) {
      showToast(tr("관리자 자료를 불러오지 못했습니다.", "Could not load administrator data."));
    }
  } finally {
    state.adminRefreshInFlight = false;
  }
}
function renderAdminDashboard() {
  const data = state.adminData || {};
  const s = data.summary || {};

  const metrics = [
    [tr("전체 계정", "Accounts"), s.total_accounts ?? 0],
    [tr("대기방", "Waiting rooms"), s.waiting_rooms ?? 0],
    [tr("진행 중", "Playing rooms"), s.playing_rooms ?? 0],
    [tr("완료 경기", "Finished games"), s.finished_rooms ?? 0],
    [tr("채팅", "Chat messages"), s.total_messages ?? 0],
    [tr("피드백", "Feedback"), s.total_feedback ?? 0],
    [tr("경기 기록", "Match records"), s.total_matches ?? 0]
  ];

  el("adminSummary").innerHTML = metrics
    .map(([label, value]) => `
      <article class="card admin-stat">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");

  el("adminUsers").innerHTML = adminUsersTable(data.users || []);

  el("adminRooms").innerHTML = adminRoomsTable(data.rooms || []);

  el("adminMatches").innerHTML = adminTable(
    [
      tr("사용자", "User"),
      tr("결과", "Result"),
      tr("점수", "Score"),
      tr("인원", "Players"),
      tr("시간", "Time")
    ],
    (data.matches || []).map(match => [
      match.username,
      match.result,
      match.score,
      match.player_count,
      new Date(match.created_at).toLocaleString("ko-KR")
    ])
  );

  el("adminMessages").innerHTML = adminTable(
    [
      tr("방", "Room"),
      tr("사용자", "User"),
      tr("내용", "Message"),
      tr("시간", "Time")
    ],
    (data.messages || []).map(message => [
      message.room_name,
      message.sender_name,
      message.body,
      new Date(message.created_at).toLocaleString("ko-KR")
    ])
  );

  const feedbackKindLabels = {
    bug: tr("버그", "Bug"),
    feature: tr("기능 제안", "Feature request"),
    ui: tr("화면 / 사용성", "UI / usability"),
    other: tr("기타", "Other")
  };

  el("adminFeedback").innerHTML = adminTable(
    [
      tr("종류", "Type"),
      tr("사용자", "User"),
      tr("내용", "Message"),
      tr("시간", "Time")
    ],
    (data.feedback || []).map(item => [
      feedbackKindLabels[item.kind] || item.kind,
      item.username || tr("삭제된 사용자", "Deleted user"),
      item.body,
      new Date(item.created_at).toLocaleString("ko-KR")
    ])
  );
}


function adminUsersTable(users) {
  if (!users.length) {
    return `<div class="empty-state"><span>${tr("표시할 사용자가 없습니다.", "No users to display.")}</span></div>`;
  }

  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th>${tr("아이디", "ID")}</th>
          <th>${tr("권한", "Role")}</th>
          <th>${tr("승", "Wins")}</th>
          <th>${tr("패", "Losses")}</th>
          <th>${tr("무", "Draws")}</th>
          <th>${tr("요트", "Yahtzees")}</th>
          <th>${tr("관리", "Actions")}</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => {
          const protectedAccount =
            user.role === "admin" ||
            user.id === currentUserId();

          return `
            <tr>
              <td>${escapeHTML(user.username)}</td>
              <td>${escapeHTML(user.role)}</td>
              <td>${escapeHTML(user.wins)}</td>
              <td>${escapeHTML(user.losses)}</td>
              <td>${escapeHTML(user.draws)}</td>
              <td>${escapeHTML(user.yacht_rolls || 0)}</td>
              <td>
                ${
                  protectedAccount
                    ? `<span class="admin-protected-label">${tr("보호 계정", "Protected")}</span>`
                    : `<button
                         type="button"
                         class="admin-action-btn danger"
                         data-admin-delete-user="${escapeHTML(user.id)}"
                         data-username="${escapeHTML(user.username)}"
                       >${tr("계정 삭제", "Delete account")}</button>`
                }
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function adminRoomsTable(rooms) {
  if (!rooms.length) {
    return `<div class="empty-state"><span>${tr("표시할 게임방이 없습니다.", "No rooms to display.")}</span></div>`;
  }

  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th>${tr("방", "Room")}</th>
          <th>${tr("방장", "Host")}</th>
          <th>${tr("공개", "Visibility")}</th>
          <th>${tr("상태", "Status")}</th>
          <th>${tr("인원", "Players")}</th>
          <th>${tr("관리", "Actions")}</th>
        </tr>
      </thead>
      <tbody>
        ${rooms.map(room => `
          <tr>
            <td>${escapeHTML(room.name)}</td>
            <td>${escapeHTML(room.host_username)}</td>
            <td>${room.is_public ? tr("공개", "Public") : tr("비공개", "Private")}</td>
            <td>${escapeHTML(room.status)}</td>
            <td>${escapeHTML(`${room.player_count}/${room.max_players}`)}</td>
            <td>
              ${
                room.status === "playing"
                  ? `<button
                       type="button"
                       class="admin-action-btn danger"
                       data-admin-end-room="${escapeHTML(room.id)}"
                       data-room-name="${escapeHTML(room.name)}"
                     >${tr("게임 종료", "End game")}</button>`
                  : `<span class="admin-protected-label">—</span>`
              }
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function adminForceEndRoom(roomId, roomName) {
  if (!isAdmin()) return;

  const ok = window.confirm(
    state.language === "ko"
      ? `"${roomName}" 게임을 지금 강제로 종료하시겠습니까?\n현재 점수로 승패가 기록됩니다.`
      : `End "${roomName}" now?\nThe current scores will be recorded as the result.`
  );

  if (!ok) return;

  try {
    const { error } = await db.rpc("admin_end_yacht_game", {
      p_room_id: roomId
    });

    if (error) throw error;

    showToast(tr("게임을 종료했습니다.", "Game ended."));
    await renderAdmin();
  } catch (error) {
    console.error("admin force end:", error);
    showToast(error.message || tr("게임을 종료하지 못했습니다.", "Could not end the game."));
  }
}

async function adminDeleteUser(userId, username) {
  if (!isAdmin()) return;

  const ok = window.confirm(
    state.language === "ko"
      ? `${username} 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      : `Delete the account ${username}?\nThis action cannot be undone.`
  );

  if (!ok) return;

  try {
    const { error } = await db.rpc("admin_delete_user", {
      p_user_id: userId
    });

    if (error) throw error;

    showToast(state.language === "ko" ? `${username} 계정을 삭제했습니다.` : `Deleted account ${username}.`);
    await renderAdmin();
  } catch (error) {
    console.error("admin delete user:", error);
    showToast(error.message || tr("계정을 삭제하지 못했습니다.", "Could not delete the account."));
  }
}


function adminTable(headers, rows) {
  if (!rows.length) {
    return `<div class="empty-state"><span>${tr("표시할 자료가 없습니다.", "No data to display.")}</span></div>`;
  }

  return `
    <table class="admin-table">
      <thead>
        <tr>${headers.map(header => `<th>${escapeHTML(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function copyRoomCode() {
  if (!state.activeRoom) return;
  try {
    await navigator.clipboard.writeText(state.activeRoom.code);
    showToast(tr("방 코드를 복사했습니다.", "Room code copied."));
  } catch {
    showToast(state.language === "ko" ? `방 코드: ${state.activeRoom.code}` : `Room code: ${state.activeRoom.code}`);
  }
}

function leaveGameScreen() {
  pauseLocalBgm();
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

document.querySelectorAll(".visibility-btn").forEach(button => {
  button.addEventListener("click", () => {
    state.roomIsPublic = button.dataset.public === "true";
    document.querySelectorAll(".visibility-btn").forEach(btn => {
      btn.classList.toggle(
        "active",
        (btn.dataset.public === "true") === state.roomIsPublic
      );
    });
  });
});

el("publicRoomsList").addEventListener("click", event => {
  const joinButton = event.target.closest(".public-join-btn");

  if (joinButton && !joinButton.disabled) {
    joinRoomByCode(joinButton.dataset.code);
    return;
  }

  const spectateButton = event.target.closest(".public-spectate-btn");

  if (spectateButton && !spectateButton.disabled) {
    spectatePublicRoom(spectateButton.dataset.roomId);
  }
});

el("refreshPublicRoomsBtn").addEventListener("click", refreshPublicRooms);
el("refreshAdminBtn").addEventListener("click", () => {
  renderAdmin({ quiet: true });
});

el("adminUsers").addEventListener("click", event => {
  const button = event.target.closest("[data-admin-delete-user]");
  if (!button) return;

  adminDeleteUser(
    button.dataset.adminDeleteUser,
    button.dataset.username || "사용자"
  );
});

el("adminRooms").addEventListener("click", event => {
  const button = event.target.closest("[data-admin-end-room]");
  if (!button) return;

  adminForceEndRoom(
    button.dataset.adminEndRoom,
    button.dataset.roomName || "게임방"
  );
});

el("createRoomBtn").addEventListener("click", createRoom);
el("joinRoomForm").addEventListener("submit", joinRoom);
el("copyRoomCodeBtn").addEventListener("click", copyRoomCode);
el("startRoomBtn").addEventListener("click", startRoom);
el("resumeRoomBtn").addEventListener("click", () => navigate("game"));
el("leaveRoomBtn").addEventListener("click", leaveWaitingRoom);

el("rollBtn").addEventListener("click", rollDice);

document.addEventListener("pointerdown", event => {
  const control = event.target.closest(
    "button:not(:disabled), .score-row.selectable"
  );

  if (control) {
    playClickSound();
  }

  // If a remote player turned music on but the browser blocked
  // autoplay, the next user gesture resumes at the shared position.
  resumeBlockedRoomBgmFromGesture();
});

el("languageToggleBtn").addEventListener("click", toggleLanguage);

el("feedbackForm").addEventListener("submit", submitFeedback);
el("feedbackBody").addEventListener("input", updateFeedbackCharCount);

el("globalChatForm").addEventListener("submit", sendGlobalChat);
el("globalEmojiToggleBtn").addEventListener("click", toggleGlobalEmojiPicker);
el("globalEmojiPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-global-emoji]");
  if (!button) return;

  // Send immediately. Keep the picker open for rapid repeated emoji.
  sendGlobalEmoji(button.dataset.globalEmoji);
});

el("emojiToggleBtn").addEventListener("click", toggleEmojiPicker);
el("emojiPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-emoji]");
  if (!button) return;

  // Send immediately. Keep the picker open for rapid repeated emoji.
  sendRoomEmoji(button.dataset.emoji);
});

document.addEventListener("click", event => {
  if (
    !event.target.closest("#emojiPicker") &&
    !event.target.closest("#emojiToggleBtn")
  ) {
    el("emojiPicker").classList.add("hidden");
  }

  if (
    !event.target.closest("#globalEmojiPicker") &&
    !event.target.closest("#globalEmojiToggleBtn")
  ) {
    el("globalEmojiPicker").classList.add("hidden");
  }

  if (
    !event.target.closest("#lobbyEmojiPicker") &&
    !event.target.closest("#lobbyEmojiToggleBtn")
  ) {
    el("lobbyEmojiPicker").classList.add("hidden");
  }
});

el("bgmToggleBtn").addEventListener("click", toggleBgm);
el("lobbyBgmToggleBtn").addEventListener("click", toggleBgm);

el("bgmTrackSelect").addEventListener("change", changeBgmTrack);
el("lobbyBgmTrackSelect").addEventListener("change", changeBgmTrack);

el("chatForm").addEventListener("submit", sendChat);
el("lobbyChatForm").addEventListener("submit", sendLobbyChat);

el("lobbyEmojiToggleBtn").addEventListener(
  "click",
  toggleLobbyEmojiPicker
);

el("lobbyEmojiPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-lobby-emoji]");
  if (!button) return;

  sendRoomEmoji(button.dataset.lobbyEmoji);
});
el("leaveGameBtn").addEventListener("click", leaveGameScreen);
el("finishGameBtn").addEventListener("click", leaveGameScreen);

window.addEventListener("beforeunload", () => {
  stopAccountGuard();
  stopPublicRoomPolling();
  stopAdminAutoRefresh();
  cleanupGlobalChatChannel();
  if (state.presenceChannel) state.presenceChannel.untrack();
});

initEmojiPicker();
initLobbyEmojiPicker();
initGlobalEmojiPicker();
initBgmControls();
applyLanguage({ rerender: false });
renderGlobalChat();
updateFeedbackCharCount();
setFeedbackAvailability();
init();
