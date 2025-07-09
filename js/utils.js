export const PIECES = ['', '─', '│', '┐', '└', '┘', '┌', '❌'];

export const CONNECTIONS = {
    '─': ['left', 'right'],
    '│': ['up', 'down'],
    '┐': ['left', 'down'],
    '└': ['up', 'right'],
    '┘': ['up', 'left'],
    '┌': ['right', 'down'],
};

export function opposite(dir) {
    return { left: 'right', right: 'left', up: 'down', down: 'up' }[dir];
}
