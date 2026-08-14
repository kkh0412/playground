const categories = [
  { key: "ones", name: "Aces", rule: "1의 합", score: dice => sumOfFace(dice, 1) },
  { key: "twos", name: "Deuces", rule: "2의 합", score: dice => sumOfFace(dice, 2) },
  { key: "threes", name: "Threes", rule: "3의 합", score: dice => sumOfFace(dice, 3) },
  { key: "fours", name: "Fours", rule: "4의 합", score: dice => sumOfFace(dice, 4) },
  { key: "fives", name: "Fives", rule: "5의 합", score: dice => sumOfFace(dice, 5) },
  { key: "sixes", name: "Sixes", rule: "6의 합", score: dice => sumOfFace(dice, 6) },
  { key: "choice", name: "Choice", rule: "모든 주사위의 합", score: dice => sum(dice) },
  { key: "fourKind", name: "Four of a Kind", rule: "같은 숫자 4개 이상이면 전체 합", score: scoreFourKind },
  { key: "fullHouse", name: "Full House", rule: "2개 + 3개 조합이면 전체 합", score: scoreFullHouse },
  { key: "smallStraight", name: "Small Straight", rule: "연속된 4개 숫자 → 15점", score: scoreSmallStraight },
  { key: "largeStraight", name: "Large Straight", rule: "연속된 5개 숫자 → 30점", score: scoreLargeStraight },
  { key: "yacht", name: "Yacht", rule: "5개 모두 같으면 50점", score: scoreYacht }
];

let dice = [1, 1, 1, 1, 1];
let held = [false, false, false, false, false];
let rollsLeft = 3;
let hasRolled = false;
let scores = {};

const diceArea = document.getElementById("diceArea");
const rollBtn = document.getElementById("rollBtn");
const scoreTable = document.getElementById("scoreTable");
const rollsText = document.getElementById("rollsText");
const roundText = document.getElementById("roundText");
const totalScore = document.getElementById("totalScore");
const statusText = document.getElementById("statusText");
const newGameBtn = document.getElementById("newGameBtn");
const gameOverModal = document.getElementById("gameOverModal");
const finalScore = document.getElementById("finalScore");
const playAgainBtn = document.getElementById("playAgainBtn");

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function sumOfFace(values, face) {
  return values.filter(v => v === face).length * face;
}

function counts(values) {
  const result = {};
  for (const value of values) {
    result[value] = (result[value] || 0) + 1;
  }
  return Object.values(result);
}

function scoreFourKind(values) {
  return counts(values).some(count => count >= 4) ? sum(values) : 0;
}

function scoreFullHouse(values) {
  const c = counts(values).sort((a, b) => a - b);
  return c.length === 2 && c[0] === 2 && c[1] === 3 ? sum(values) : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function scoreSmallStraight(values) {
  const u = uniqueSorted(values);
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];

  const found = patterns.some(pattern =>
    pattern.every(value => u.includes(value))
  );

  return found ? 15 : 0;
}

function scoreLargeStraight(values) {
  const u = uniqueSorted(values);
  const a = JSON.stringify([1, 2, 3, 4, 5]);
  const b = JSON.stringify([2, 3, 4, 5, 6]);
  const current = JSON.stringify(u);

  return current === a || current === b ? 30 : 0;
}

function scoreYacht(values) {
  return new Set(values).size === 1 ? 50 : 0;
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function renderDice() {
  diceArea.innerHTML = "";

  dice.forEach((value, index) => {
    const button = document.createElement("button");
    button.className = `die ${held[index] ? "held" : ""}`;
    button.textContent = value;
    button.disabled = !hasRolled;
    button.setAttribute("aria-label", `${index + 1}번째 주사위: ${value}`);

    button.addEventListener("click", () => {
      if (!hasRolled) return;
      held[index] = !held[index];
      renderDice();
    });

    diceArea.appendChild(button);
  });
}

function renderScoreTable() {
  scoreTable.innerHTML = "";

  for (const category of categories) {
    const used = Object.prototype.hasOwnProperty.call(scores, category.key);
    const preview = hasRolled ? category.score(dice) : null;

    const button = document.createElement("button");
    button.className = `score-row ${used ? "used" : ""}`;
    button.disabled = used || !hasRolled;

    const left = document.createElement("span");
    left.innerHTML = `
      <span class="score-name">${category.name}</span>
      <span class="score-rule">${category.rule}</span>
    `;

    const right = document.createElement("span");
    right.className = `score-value ${!used && hasRolled ? "score-preview" : ""}`;
    right.textContent = used ? scores[category.key] : (hasRolled ? preview : "—");

    button.append(left, right);

    if (!used) {
      button.addEventListener("click", () => chooseScore(category));
    }

    scoreTable.appendChild(button);
  }
}

function updateHud() {
  const usedCount = Object.keys(scores).length;
  const currentRound = Math.min(usedCount + 1, categories.length);

  rollsText.textContent = rollsLeft;
  roundText.textContent = `${currentRound} / ${categories.length}`;
  totalScore.textContent = sum(Object.values(scores));

  rollBtn.disabled = rollsLeft === 0;
  rollBtn.textContent = hasRolled ? "다시 굴리기" : "주사위 굴리기";
}

function rollDice() {
  if (rollsLeft <= 0) return;

  for (let i = 0; i < dice.length; i++) {
    if (!held[i]) {
      dice[i] = randomDie();
    }
  }

  hasRolled = true;
  rollsLeft -= 1;

  if (rollsLeft > 0) {
    statusText.textContent = "고정할 주사위를 선택하거나 점수 항목을 결정하세요.";
  } else {
    statusText.textContent = "굴리기를 모두 사용했습니다. 점수 항목을 하나 선택하세요.";
  }

  renderAll();
}

function chooseScore(category) {
  if (!hasRolled || Object.prototype.hasOwnProperty.call(scores, category.key)) {
    return;
  }

  scores[category.key] = category.score(dice);

  if (Object.keys(scores).length === categories.length) {
    renderAll();
    endGame();
    return;
  }

  startNextRound();
}

function startNextRound() {
  dice = [1, 1, 1, 1, 1];
  held = [false, false, false, false, false];
  rollsLeft = 3;
  hasRolled = false;
  statusText.textContent = "다음 라운드입니다. 주사위를 굴리세요.";
  renderAll();
}

function startNewGame() {
  dice = [1, 1, 1, 1, 1];
  held = [false, false, false, false, false];
  rollsLeft = 3;
  hasRolled = false;
  scores = {};
  gameOverModal.classList.add("hidden");
  statusText.textContent = "첫 번째 굴리기를 시작하세요.";
  renderAll();
}

function endGame() {
  const total = sum(Object.values(scores));
  finalScore.textContent = total;
  gameOverModal.classList.remove("hidden");
}

function renderAll() {
  renderDice();
  renderScoreTable();
  updateHud();
}

rollBtn.addEventListener("click", rollDice);
newGameBtn.addEventListener("click", startNewGame);
playAgainBtn.addEventListener("click", startNewGame);

renderAll();
