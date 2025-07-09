import Renderer from './renderer.js';
import Game from './engine.js';

const board = document.getElementById('board');
const logEl = document.getElementById('log');
const defendBtn = document.getElementById('defendBtn');

const renderer = new Renderer(board, logEl);
const game = new Game(renderer);

board.addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  game.handleCellClick(x, y);
});

defendBtn.addEventListener('click', () => {
  game.defend();
});
