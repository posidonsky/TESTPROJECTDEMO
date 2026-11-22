// Items, crafting recipes and shop stock for IRONWOOD PENITENTIARY.

export const ITEMS = {
  sheet: {
    name: 'Bed Sheet', desc: 'Coarse linen lifted from your bunk. Two make a rope.',
    value: 15, tags: ['contraband']
  },
  spoon: {
    name: 'Spoon', desc: 'A trusty canteen spoon. Digs slowly, but quietly.',
    value: 10, tool: 'dig', power: 1, tags: ['contraband']
  },
  shovel: {
    name: 'Makeshift Shovel', desc: 'Spoon lashed to scrap metal. Digs three times faster.',
    value: 45, tool: 'dig', power: 3, tags: ['contraband']
  },
  metal: {
    name: 'Scrap Metal', desc: 'A jagged offcut from the workshop. Useful for crafting.',
    value: 28, tags: ['contraband']
  },
  tape: {
    name: 'Duct Tape', desc: 'Fixes everything. Also a crafting material.',
    value: 22, tags: []
  },
  comb: {
    name: 'Comb', desc: 'Plastic comb. The teeth make a passable lockpick blank.',
    value: 6, tags: []
  },
  crowbar: {
    name: 'Crowbar', desc: 'Heavy steel bar. Pries vent covers off the walls.',
    value: 120, tool: 'pry', tags: ['contraband']
  },
  cutters: {
    name: 'Bolt Cutters', desc: 'Bites through chain-link fence. Slow and loud.',
    value: 90, tool: 'cut', tags: ['contraband']
  },
  rope: {
    name: 'Rope', desc: 'Sheets braided tight. Needed to climb down from the roof.',
    value: 30, tool: 'climb', tags: ['contraband']
  },
  lockpick: {
    name: 'Lockpick', desc: 'Bent comb tooth. Opens cheap locks quietly.',
    value: 35, tool: 'pick', tags: ['contraband']
  },
  snack: {
    name: 'Energy Bar', desc: 'Tastes like cardboard. Restores energy.',
    value: 14, use: { energy: 22 }, tags: []
  }
};

// Two-item combinations, order does not matter.
export const RECIPES = [
  { out: 'rope',    in: ['sheet', 'sheet'], label: 'Twist sheets into rope' },
  { out: 'shovel',  in: ['spoon', 'metal'], label: 'Lash spoon to scrap metal' },
  { out: 'cutters', in: ['metal', 'tape'], label: 'Tape a cutter head' },
  { out: 'lockpick',in: ['comb', 'metal'],  label: 'File a comb into a pick' }
];

export const SHOP_STOCK = [
  { id: 'sheet',  price: 15 },
  { id: 'spoon',  price: 12 },
  { id: 'metal',  price: 28 },
  { id: 'tape',   price: 22 },
  { id: 'comb',   price: 6 },
  { id: 'snack',  price: 14 },
  { id: 'crowbar',price: 120 }
];

export function itemName(id) {
  return ITEMS[id] ? ITEMS[id].name : id;
}

export function isContraband(id) {
  return !!ITEMS[id] && ITEMS[id].tags && ITEMS[id].tags.includes('contraband');
}

export function findRecipe(a, b) {
  return RECIPES.find(r => {
    const [x, y] = r.in;
    return (x === a && y === b) || (x === b && y === a);
  }) || null;
}
