import { PIECES } from './utils.js';

export const baseLevels = [
    {
        start: { row: 0, col: 0, dir: 'right' },
        end: { row: 0, col: 5 },
        prefilled: []
    },
    {
        start: { row: 5, col: 0, dir: 'up' },
        end: { row: 0, col: 5 },
        prefilled: [
            { row: 4, col: 0, piece: 2 }, // vertical
            { row: 3, col: 0, piece: 2 },
            { row: 2, col: 0, piece: 4 }, // curve left-up
        ]
    }
];

export function getLevel(index) {
    if (index < baseLevels.length) {
        return baseLevels[index];
    }
    return generateLevel(index);
}

function generateLevel(levelIndex) {
    const start = { row: 0, col: 0, dir: 'right' };
    const end = { row: 5, col: 5 };
    const prefilled = [];
    const used = new Set(['0,0', '5,5']);
    const obstacleCount = Math.min(4 + levelIndex, 20);
    while (prefilled.length < obstacleCount) {
        const r = Math.floor(Math.random() * 6);
        const c = Math.floor(Math.random() * 6);
        const key = `${r},${c}`;
        if (used.has(key)) continue;
        used.add(key);
        prefilled.push({ row: r, col: c, piece: 7, locked: true });
    }
    const lockedPieces = Math.min(2 + Math.floor(levelIndex / 2), 10);
    const pieces = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < lockedPieces; i++) {
        let r, c, key;
        do {
            r = Math.floor(Math.random() * 6);
            c = Math.floor(Math.random() * 6);
            key = `${r},${c}`;
        } while (used.has(key));
        used.add(key);
        const p = pieces[Math.floor(Math.random() * pieces.length)];
        prefilled.push({ row: r, col: c, piece: p, locked: true });
    }
    return { start, end, prefilled };
}

export function createBoard(container, state, level) {
    container.innerHTML = '';
    state.grid = [];
    for (let r = 0; r < 6; r++) {
        const row = [];
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = '';
            container.appendChild(cell);
            row.push(0);
        }
        state.grid.push(row);
    }

    const startIndex = level.start.row * 6 + level.start.col;
    const endIndex = level.end.row * 6 + level.end.col;
    const cells = container.querySelectorAll('.cell');
    cells[startIndex].classList.add('start');
    cells[startIndex].textContent = '🔵';
    cells[endIndex].classList.add('end');
    cells[endIndex].textContent = '🔴';

    for (const item of level.prefilled) {
        const idx = item.row * 6 + item.col;
        const cell = cells[idx];
        cell.textContent = PIECES[item.piece];
        state.grid[item.row][item.col] = item.piece;
        if (item.locked) {
            cell.classList.add('locked');
            cell.dataset.locked = 'true';
        }
        if (item.piece === 7) {
            cell.classList.add('blocked');
        }
    }
}
