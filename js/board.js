import { PIECES, CONNECTIONS, opposite } from './utils.js';

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
    const pieces = [1, 2, 3, 4, 5, 6];
    while (true) {
        const prefilled = [];
        const used = new Set(['0,0', '5,5']);
        let obstacles = 0;
        const obstacleCount = Math.min(4 + levelIndex, 20);
        while (obstacles < obstacleCount) {
            const r = Math.floor(Math.random() * 6);
            const c = Math.floor(Math.random() * 6);
            const key = `${r},${c}`;
            if (used.has(key)) continue;
            used.add(key);
            prefilled.push({ row: r, col: c, piece: 7, locked: true });
            obstacles++;
        }
        const lockedPieces = Math.min(2 + Math.floor(levelIndex / 2), 10);
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
        const level = { start, end, prefilled };
        if (hasSolution(level)) {
            return level;
        }
    }
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

function move(pos, dir) {
    const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
    return { row: pos.row + delta[0], col: pos.col + delta[1] };
}

function inBounds(row, col) {
    return row >= 0 && row < 6 && col >= 0 && col < 6;
}

function hasSolution(level) {
    const blocked = new Set();
    const locked = new Map();
    for (const item of level.prefilled) {
        const key = `${item.row},${item.col}`;
        if (item.piece === 7) {
            blocked.add(key);
        }
        if (item.locked) {
            locked.set(key, item.piece);
        }
    }
    const queue = [];
    const visited = new Set();
    queue.push({ row: level.start.row, col: level.start.col, dir: level.start.dir });
    while (queue.length) {
        const { row, col, dir } = queue.shift();
        const next = move({ row, col }, dir);
        if (!inBounds(next.row, next.col)) continue;
        const key = `${next.row},${next.col}`;
        if (blocked.has(key)) continue;
        const visitKey = `${key}|${dir}`;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        if (next.row === level.end.row && next.col === level.end.col) {
            return true;
        }
        const lockedPiece = locked.get(key);
        if (lockedPiece) {
            const connectors = CONNECTIONS[PIECES[lockedPiece]];
            if (!connectors || !connectors.includes(opposite(dir))) continue;
            const out = connectors[0] === opposite(dir) ? connectors[1] : connectors[0];
            queue.push({ row: next.row, col: next.col, dir: out });
        } else {
            const need = opposite(dir);
            for (let p = 1; p <= 6; p++) {
                const con = CONNECTIONS[PIECES[p]];
                if (con.includes(need)) {
                    const out = con[0] === need ? con[1] : con[0];
                    queue.push({ row: next.row, col: next.col, dir: out });
                }
            }
        }
    }
    return false;
}
