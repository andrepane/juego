const levels = [
  {
    id: 1,
    size: 5,
    robot: { x: 0, y: 0, dir: 1 },
    stars: [ { x: 2, y: 1 }, { x: 4, y: 2 } ],
    obstacles: [ { x: 1, y: 2 } ],
    goal: { x: 4, y: 4 },
    maxCommands: 10,
    allowedCommands: [ 'forward', 'turn', 'wait', 'jump' ],
    description: 'Recoge todas las estrellas y llega a la meta.'
  }
];
