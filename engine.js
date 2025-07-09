export default class Game {
  constructor(renderer) {
    this.renderer = renderer;
    this.size = 8;
    this.state = {
      player: { x: 1, y: 1, hp: 10, maxHp: 10, defending: false },
      enemy: { x: 6, y: 6, hp: 10, maxHp: 10, defending: false },
      turn: 'player',
      phase: 'playing'
    };
    this.renderer.init(this.size);
    this.renderer.renderUnits(this.state);
    this.renderer.log('Turno del jugador');
    this.showAvailable();
  }

  handleCellClick(x, y) {
    if (this.state.phase !== 'playing' || this.state.turn !== 'player') return;
    const { player, enemy } = this.state;
    const dist = Math.abs(player.x - x) + Math.abs(player.y - y);
    if (x === enemy.x && y === enemy.y && dist === 1) {
      this.attack(player, enemy);
      if (!this.checkOutcome()) this.endPlayerTurn();
    } else if (dist <= 2 && !(x === enemy.x && y === enemy.y)) {
      this.moveUnit(player, x, y);
      this.endPlayerTurn();
    }
  }

  moveUnit(unit, x, y) {
    unit.x = x;
    unit.y = y;
    this.renderer.renderUnits(this.state);
  }

  defend() {
    if (this.state.phase !== 'playing' || this.state.turn !== 'player') return;
    this.state.player.defending = true;
    this.renderer.renderUnits(this.state);
    this.renderer.log('Jugador se defiende');
    this.endPlayerTurn();
  }

  attack(attacker, defender) {
    const damage = defender.defending ? 1 : 2;
    defender.defending = false;
    defender.hp -= damage;
    if (defender.hp < 0) defender.hp = 0;
    this.renderer.renderUnits(this.state);
    this.renderer.log(`${attacker === this.state.player ? 'Jugador' : 'Enemigo'} atacó`);
  }

  endPlayerTurn() {
    this.state.turn = 'enemy';
    this.renderer.clearHighlights();
    setTimeout(() => this.enemyTurn(), 300);
  }

  enemyTurn() {
    const { player, enemy } = this.state;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 1) {
      this.attack(enemy, player);
    } else if (enemy.hp <= 4 && Math.random() < 0.5) {
      enemy.defending = true;
      this.renderer.renderUnits(this.state);
      this.renderer.log('Enemigo se defiende');
    } else {
      if (Math.abs(dx) > Math.abs(dy)) enemy.x += Math.sign(dx);
      else enemy.y += Math.sign(dy);
      this.renderer.renderUnits(this.state);
    }
    player.defending = false;
    if (!this.checkOutcome()) {
      this.state.turn = 'player';
      this.renderer.log('Turno del jugador');
      this.showAvailable();
    }
  }

  showAvailable() {
    const { player, enemy } = this.state;
    const moves = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const dist = Math.abs(player.x - x) + Math.abs(player.y - y);
        if (dist <= 2 && !(x === enemy.x && y === enemy.y)) moves.push([x, y]);
      }
    }
    this.renderer.clearHighlights();
    this.renderer.highlightMoves(moves);
    if (Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y) === 1) {
      this.renderer.highlightAttack([enemy.x, enemy.y]);
    }
  }

  checkOutcome() {
    if (this.state.enemy.hp <= 0) {
      this.state.phase = 'victory';
      this.renderer.log('¡Victoria!');
      return true;
    }
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.renderer.log('Derrota...');
      return true;
    }
    return false;
  }
}
