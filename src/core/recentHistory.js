export function createRecentHistory(limit = 8) {
  const queue = [];
  const lookup = new Set();

  function add(id) {
    if (!id) {
      return;
    }

    if (lookup.has(id)) {
      const index = queue.indexOf(id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }

    queue.push(id);
    lookup.add(id);

    if (queue.length > limit) {
      const removed = queue.shift();
      lookup.delete(removed);
    }
  }

  return {
    add,
    has: (id) => lookup.has(id),
    clear: () => {
      queue.length = 0;
      lookup.clear();
    },
    snapshot: () => [...queue]
  };
}
