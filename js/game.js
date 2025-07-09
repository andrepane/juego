import { PIECES, CONNECTIONS, opposite } from './utils.js';
import { getLevel, createBoard } from './board.js';

const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const checkBtn = document.getElementById('checkBtn');

const state = {
    grid: [],
    levelIndex: 0
};

function init() {
    loadLevel(state.levelIndex);
    boardEl.addEventListener('click', handleCellClick);
    checkBtn.addEventListener('click', verify);
}

function loadLevel(index) {
    const level = getLevel(index);
    boardEl.classList.remove('success', 'fail');
    messageEl.textContent = '';
    createBoard(boardEl, state, level);
}

function handleCellClick(e) {
    const cell = e.target.closest('.cell');
    if (
        !cell ||
        cell.classList.contains('start') ||
        cell.classList.contains('end') ||
        cell.classList.contains('locked') ||
        cell.classList.contains('blocked')
    ) {
        return;
    }
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    state.grid[r][c] = (state.grid[r][c] + 1) % PIECES.length;
    cell.textContent = PIECES[state.grid[r][c]];
}

function move(pos, dir) {
    const delta = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] }[dir];
    return { row: pos.row + delta[0], col: pos.col + delta[1] };
}

function inBounds(row, col) {
    return row >= 0 && row < 6 && col >= 0 && col < 6;
}

function verify() {
    const level = getLevel(state.levelIndex);
    const visited = new Set();
    let pos = { row: level.start.row, col: level.start.col };
    let dir = level.start.dir;
    while (true) {
        const next = move(pos, dir);
        if (!inBounds(next.row, next.col)) {
            return fail();
        }
        const key = `${next.row},${next.col}`;
        if (visited.has(key)) return fail();
        visited.add(key);
        if (next.row === level.end.row && next.col === level.end.col) {
            return success();
        }
        const pieceIdx = state.grid[next.row][next.col];
        const piece = PIECES[pieceIdx];
        if (!piece) return fail();
        const connectors = CONNECTIONS[piece];
        const needed = opposite(dir);
        if (!connectors || !connectors.includes(needed)) return fail();
        dir = connectors[0] === needed ? connectors[1] : connectors[0];
        pos = next;
    }
}

function success() {
    boardEl.classList.remove('fail');
    boardEl.classList.add('success');
    messageEl.textContent = '¡Conexión correcta!';
    state.levelIndex++;
    setTimeout(() => loadLevel(state.levelIndex), 1000);
    return true;
}

function fail() {
    boardEl.classList.remove('success');
    boardEl.classList.add('fail');
    messageEl.textContent = 'Conexión incorrecta';
    return false;
}

document.addEventListener('DOMContentLoaded', init);
