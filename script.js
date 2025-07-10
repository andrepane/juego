const boardSize = 5;
const board = document.getElementById('game-board');
const commandList = document.getElementById('command-list');
let commands = [];

let robot = {
  x: 0,
  y: 0,
  dir: 0, // 0=up, 1=right, 2=down, 3=left
};

function createBoard() {
  board.innerHTML = '';
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.x = x;
      cell.dataset.y = y;
      board.appendChild(cell);
    }
  }
  placeRobot();
}

function placeRobot() {
  document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
  const index = robot.y * boardSize + robot.x;
  const cell = board.children[index];
  const rob = document.createElement('div');
  rob.className = 'robot';
  rob.style.transform = `rotate(${robot.dir * 90}deg)`;
  cell.appendChild(rob);
}

function addCommand(cmd) {
  commands.push(cmd);
  renderCommands();
}

function renderCommands() {
  commandList.innerHTML = commands.map(c => c).join(' → ');
}

function runCommands() {
  let i = 0;
  function step() {
    if (i >= commands.length) return;
    const cmd = commands[i];
    if (cmd === 'forward') moveForward();
    else if (cmd === 'turn') robot.dir = (robot.dir + 1) % 4;
    placeRobot();
    i++;
    setTimeout(step, 500);
  }
  step();
}

function moveForward() {
  if (robot.dir === 0 && robot.y > 0) robot.y--;
  else if (robot.dir === 1 && robot.x < boardSize - 1) robot.x++;
  else if (robot.dir === 2 && robot.y < boardSize - 1) robot.y++;
  else if (robot.dir === 3 && robot.x > 0) robot.x--;
}

function resetGame() {
  robot = { x: 0, y: 0, dir: 0 };
  commands = [];
  renderCommands();
  placeRobot();
}

createBoard();
