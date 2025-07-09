export default class Renderer {
  constructor(boardEl, logEl) {
    this.boardEl = boardEl;
    this.logEl = logEl;
    this.cells = [];
    this.size = 0;
  }

  init(size) {
    this.size = size;
    this.boardEl.innerHTML = '';
    this.boardEl.style.setProperty('--size', size);
    this.cells = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.x = x;
        cell.dataset.y = y;
        this.cells.push(cell);
        this.boardEl.appendChild(cell);
      }
    }
  }

  getCell(x, y) {
    return this.cells[y * this.size + x];
  }

  createUnit(type, label) {
    const el = document.createElement('div');
    el.classList.add('unit', type);
      el.innerHTML = "<div class="label">" + label + "</div><div class="hp-bar"><div class="fill"></div></div>";
    this.boardEl.appendChild(el);
    return el;
  }

  positionUnit(el, unit) {
    el.style.setProperty('--x', unit.x);
    el.style.setProperty('--y', unit.y);
  }

  updateHp(el, unit) {
    el.querySelector('.fill').style.width = `${(unit.hp / unit.maxHp) * 100}%`;
  }

  renderUnits(state) {
    if (!this.playerEl) this.playerEl = this.createUnit('player', 'P');
    if (!this.enemyEl) this.enemyEl = this.createUnit('enemy', 'E');
    this.positionUnit(this.playerEl, state.player);
    this.positionUnit(this.enemyEl, state.enemy);
    this.updateHp(this.playerEl, state.player);
    this.updateHp(this.enemyEl, state.enemy);
  }

  clearHighlights() {
    this.cells.forEach(c => c.classList.remove('highlight-move', 'highlight-attack'));
  }

  highlightMoves(cells) {
    cells.forEach(([x, y]) => this.getCell(x, y).classList.add('highlight-move'));
  }

  highlightAttack(cell) {
    if (cell) this.getCell(cell[0], cell[1]).classList.add('highlight-attack');
  }

  log(message) {
    const p = document.createElement('div');
    p.textContent = message;
    this.logEl.appendChild(p);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
}
