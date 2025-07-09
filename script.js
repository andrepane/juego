const boardSize = 8;
const board = document.getElementById('board');

const gameState = {
  player: { x: 1, y: 1, hp: 10 },
  enemy: { x: 6, y: 6, hp: 10 },
  selected: false,
  currentTurn: 'player'
};

function renderBoard() {
  board.innerHTML = '';
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.x = x;
      cell.dataset.y = y;

      if (x === gameState.player.x && y === gameState.player.y) {
        cell.classList.add('player');
        cell.textContent = 'P';
      } else if (x === gameState.enemy.x && y === gameState.enemy.y) {
        cell.classList.add('enemy');
        cell.textContent = 'E';
      }

      cell.addEventListener('click', () => handleCellClick(x, y));
      board.appendChild(cell);
    }
  }
}

function handleCellClick(x, y) {
  if (gameState.currentTurn !== 'player') return;
  const dx = Math.abs(gameState.player.x - x);
  const dy = Math.abs(gameState.player.y - y);
  if ((dx + dy) <= 2 && !(x === gameState.enemy.x && y === gameState.enemy.y)) {
    gameState.player.x = x;
    gameState.player.y = y;
    gameState.currentTurn = 'enemy';
    renderBoard();
    setTimeout(enemyTurn, 500);
  }
}

function enemyTurn() {
  const { player, enemy } = gameState;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  if (Math.abs(dx) + Math.abs(dy) === 1) {
    player.hp -= 2;
    alert('¡El enemigo atacó! HP jugador: ' + player.hp);
  } else {
    if (Math.abs(dx) > Math.abs(dy)) {
      enemy.x += Math.sign(dx);
    } else {
      enemy.y += Math.sign(dy);
    }
  }
  gameState.currentTurn = 'player';
  renderBoard();
}

renderBoard();
