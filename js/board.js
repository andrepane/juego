import { PIECES } from './utils.js';

export const levels = [
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
        cells[idx].textContent = PIECES[item.piece];
        state.grid[item.row][item.col] = item.piece;
    }
}
