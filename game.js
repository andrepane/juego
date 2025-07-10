// Juego de robot basico con niveles
const board = document.getElementById('game-board');
const commandList = document.getElementById('command-list');
const levelInfo = document.getElementById('level-info');

let currentLevel = 0;
let level = levels[currentLevel];
let robot = JSON.parse(JSON.stringify(level.robot));
let commands = [];
let collectedStars = [];

function createBoard() {
  board.style.setProperty('--size', level.size);
  board.innerHTML = '';
  for (let y = 0; y < level.size; y++) {
    for (let x = 0; x < level.size; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.x = x;
      cell.dataset.y = y;
      board.appendChild(cell);
    }
  }
  renderBoard();
  placeRobot();
  levelInfo.textContent = `Nivel ${level.id}: ${level.description}`;
}

function resetGame() {
  robot = JSON.parse(JSON.stringify(level.robot));
  commands = [];
  collectedStars = [];
  renderCommands();
  renderBoard();
  placeRobot();
}

function renderBoard() {
  document.querySelectorAll('.cell').forEach(c => {
    c.classList.remove('star', 'obstacle', 'goal');
    c.innerHTML = '';
  });

  level.stars.forEach(({x, y}) => {
    if (!collectedStars.some(s => s.x === x && s.y === y)) {
      cellAt(x, y).classList.add('star');
    }
  });
  level.obstacles.forEach(({x, y}) => cellAt(x, y).classList.add('obstacle'));
  const g = level.goal;
  cellAt(g.x, g.y).classList.add('goal');
}

function cellAt(x, y) {
  return board.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
}

function placeRobot() {
  // remove old robot
  document.querySelectorAll('.robot').forEach(r => r.remove());
  const cell = cellAt(robot.x, robot.y);
  if (!cell) return;
  const rob = document.createElement('div');
  rob.className = 'robot';
  rob.style.transform = `rotate(${robot.dir * 90}deg)`;
  cell.appendChild(rob);
}

function addCommand(cmd) {
  if (commands.length >= level.maxCommands) return;
  commands.push(cmd);
  renderCommands();
}

function renderCommands() {
  commandList.textContent = commands.join(' \u2192 '); // arrow symbol
}

async function runCommands() {
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd === 'forward') moveForward(1);
    else if (cmd === 'turn') robot.dir = (robot.dir + 1) % 4;
    else if (cmd === 'wait') {
      // nothing
    } else if (cmd === 'jump') {
      moveForward(2);
    }
    placeRobot();
    if (checkFail()) return;
    checkStar();
    if (checkGoal()) return;
    await delay(500);
  }
}

function moveForward(steps) {
  for (let i = 0; i < steps; i++) {
    const nx = robot.x + [0, 1, 0, -1][robot.dir];
    const ny = robot.y + [-1, 0, 1, 0][robot.dir];
    if (nx < 0 || ny < 0 || nx >= level.size || ny >= level.size) {
      robot.x = nx; // move for fail detection
      robot.y = ny;
      break;
    }
    if (level.obstacles.some(o => o.x === nx && o.y === ny)) break;
    robot.x = nx;
    robot.y = ny;
  }
}

function checkFail() {
  if (robot.x < 0 || robot.y < 0 || robot.x >= level.size || robot.y >= level.size) {
    alert('¡Te saliste del tablero!');
    resetGame();
    return true;
  }
  if (level.obstacles.some(o => o.x === robot.x && o.y === robot.y)) {
    alert('¡Chocaste con un obstáculo!');
    resetGame();
    return true;
  }
  return false;
}

function checkStar() {
  level.stars.forEach(({x, y}) => {
    if (robot.x === x && robot.y === y && !collectedStars.some(s => s.x === x && s.y === y)) {
      collectedStars.push({x, y});
      renderBoard();
    }
  });
}

function checkGoal() {
  const g = level.goal;
  if (robot.x === g.x && robot.y === g.y && collectedStars.length === level.stars.length) {
    alert('¡Nivel completado!');
    return true;
  }
  return false;
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Inicialización
createBoard();
