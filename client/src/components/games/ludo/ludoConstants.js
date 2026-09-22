/**
 * Ludo Game Constants & Board Geometry
 * Classic board layout matching reference image:
 *   Yellow = top-left (Computer 3) | Blue = top-right (Computer 4)
 *   Green  = bottom-left (Computer 2) | Red = bottom-right (You)
 * 15x15 grid, positions as {r, c} rows/cols 0-14.
 */

// Turn rotation: You (red) -> Computer 2 (green) -> Computer 3 (yellow) -> Computer 4 (blue)
export const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
export const FOUR_PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
export const TWO_PLAYER_COLORS = ['red', 'yellow'];

export const COLOR_HEX = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
};

// Classic saturated board colors
export const BOARD_COLORS = {
  red: '#E53935',
  blue: '#2196F3',
  green: '#4CAF50',
  yellow: '#FFEB3B',
};

export const HOME_GOALS = {
  red: 73,
  green: 79,
  yellow: 85,
  blue: 91,
};

export const START_SQUARES = {
  red: 67,
  green: 28,
  yellow: 41,
  blue: 54,
};

/**
 * Main track 16-67 (52 cells, clockwise starting at Red start)
 * plus home corridors 68-91.
 * Each entry maps to { r, c } on the 15x15 grid.
 */
export const GRID_MAP = {
  16: { r: 8, c: 12 },
  17: { r: 8, c: 11 },
  18: { r: 8, c: 10 },
  19: { r: 8, c: 9 },
  20: { r: 9, c: 8 },
  21: { r: 10, c: 8 },
  22: { r: 11, c: 8 },
  23: { r: 12, c: 8 },
  24: { r: 13, c: 8 },
  25: { r: 14, c: 8 },
  26: { r: 14, c: 7 },
  27: { r: 14, c: 6 },
  28: { r: 13, c: 6 },
  29: { r: 12, c: 6 },
  30: { r: 11, c: 6 },
  31: { r: 10, c: 6 },
  32: { r: 9, c: 6 },
  33: { r: 8, c: 5 },
  34: { r: 8, c: 4 },
  35: { r: 8, c: 3 },
  36: { r: 8, c: 2 },
  37: { r: 8, c: 1 },
  38: { r: 8, c: 0 },
  39: { r: 7, c: 0 },
  40: { r: 6, c: 0 },
  41: { r: 6, c: 1 },
  42: { r: 6, c: 2 },
  43: { r: 6, c: 3 },
  44: { r: 6, c: 4 },
  45: { r: 6, c: 5 },
  46: { r: 5, c: 6 },
  47: { r: 4, c: 6 },
  48: { r: 3, c: 6 },
  49: { r: 2, c: 6 },
  50: { r: 1, c: 6 },
  51: { r: 0, c: 6 },
  52: { r: 0, c: 7 },
  53: { r: 0, c: 8 },
  54: { r: 1, c: 8 },
  55: { r: 2, c: 8 },
  56: { r: 3, c: 8 },
  57: { r: 4, c: 8 },
  58: { r: 5, c: 8 },
  59: { r: 6, c: 9 },
  60: { r: 6, c: 10 },
  61: { r: 6, c: 11 },
  62: { r: 6, c: 12 },
  63: { r: 6, c: 13 },
  64: { r: 6, c: 14 },
  65: { r: 7, c: 14 },
  66: { r: 8, c: 14 },
  67: { r: 8, c: 13 },
  // Red home (right arm)
  68: { r: 7, c: 13 },
  69: { r: 7, c: 12 },
  70: { r: 7, c: 11 },
  71: { r: 7, c: 10 },
  72: { r: 7, c: 9 },
  73: { r: 7, c: 7 },
  // Green home (bottom arm)
  74: { r: 13, c: 7 },
  75: { r: 12, c: 7 },
  76: { r: 11, c: 7 },
  77: { r: 10, c: 7 },
  78: { r: 9, c: 7 },
  79: { r: 8, c: 7 },
  // Yellow home (left arm)
  80: { r: 7, c: 1 },
  81: { r: 7, c: 2 },
  82: { r: 7, c: 3 },
  83: { r: 7, c: 4 },
  84: { r: 7, c: 5 },
  85: { r: 7, c: 6 },
  // Blue home (top arm)
  86: { r: 1, c: 7 },
  87: { r: 2, c: 7 },
  88: { r: 3, c: 7 },
  89: { r: 4, c: 7 },
  90: { r: 5, c: 7 },
  91: { r: 6, c: 7 },
};

// Reverse lookup: "r,c" -> logical position (first match)
export const CELL_TO_POS = {};
Object.entries(GRID_MAP).forEach(([pos, cell]) => {
  const key = `${cell.r},${cell.c}`;
  if (CELL_TO_POS[key] === undefined) CELL_TO_POS[key] = Number(pos);
});

// Only the colored squares carry stars: 4 starts (safe) + home-arm stars.
// Plain white track cells have no stars and are not safe.
export const SAFE_SQUARES = [67, 28, 41, 54];



// Direction arrows sit ON the turn cells from which pawns divert into
// their home stretch (one per colour, like the image)
export const ARROW_CELLS = {
  '7,0': '→', // white cell before yellow home row
  '7,14': '←', // white cell before red home row
  '0,7': '↓', // white cell before blue home column
  '14,7': '↑', // white cell before green home column
};

// Which color owns each home-corridor cell (for painting the arms)
export function homeColorForPos(pos) {
  if (pos >= 68 && pos <= 73) return 'red';
  if (pos >= 74 && pos <= 79) return 'green';
  if (pos >= 80 && pos <= 85) return 'yellow';
  if (pos >= 86 && pos <= 91) return 'blue';
  return null;
}

// Start cell -> owner color (for painting start squares)
export function startColorForPos(pos) {
  if (pos === 67) return 'red';
  if (pos === 28) return 'green';
  if (pos === 41) return 'yellow';
  if (pos === 54) return 'blue';
  return null;
}

// Legacy pixel map kept for compatibility (no longer used for rendering)
export const BOARD_COORDINATES = [];

/**
 * Initializes default pawns for 2 or 4 players
 */
export function createInitialPawns(playerCount = 4) {
  const activeColors = playerCount === 2 ? TWO_PLAYER_COLORS : FOUR_PLAYER_COLORS;
  const pawns = [];
  for (let i = 0; i < 16; i++) {
    let color;
    if (i < 4) color = 'red';
    else if (i < 8) color = 'blue';
    else if (i < 12) color = 'green';
    else color = 'yellow';

    // In 2-player mode, green and blue are not used
    const isActive = activeColors.includes(color);

    pawns.push({
      id: `pawn_${i}`,
      pawnIndex: i,
      basePos: i,
      position: i,
      color,
      isHome: false,
      isActive,
    });
  }
  return pawns;
}

/**
 * Determine if a pawn can make a legal move given the rolled dice number
 */
export function canPawnMove(pawn, rolledNumber) {
  if (!rolledNumber) return false;

  // If in base, strictly needs a 6 to release
  if (pawn.position === pawn.basePos) {
    return rolledNumber === 6;
  }

  const nextPos = getPositionAfterMove(pawn, rolledNumber);
  return nextPos !== pawn.position;
}

/**
 * Calculate the resulting position after a move.
 * Track is circular 16-67 (52 cells); each color starts at its own
 * start square and, after the lap, diverts into its home
 * corridor FROM the arrow-marked cell just before its start.
 */
const LOOP_HEAD = 16;
const LOOP_LEN = 52; // 16..67 (ring size, used for wrap-around math)

// Steps spent on the main track before turning home.
// The turn happens from the arrow cell (offset 50 from own start),
// so the pawn visits offsets 0..50 on the track, then home cells +0..+5.
const TRACK_LAP = 51;

const HOME_ENTRY = {
  red: 68,
  green: 74,
  yellow: 80,
  blue: 86,
};

export function getPositionAfterMove(pawn, rolledNumber) {
  const { position, color, basePos } = pawn;

  // Release from base (strictly requires a 6)
  if (position === basePos) {
    return rolledNumber === 6 ? START_SQUARES[color] : position;
  }

  const homeStart = HOME_ENTRY[color];
  const homeGoal = HOME_GOALS[color];

  // Already inside own home corridor
  if (position >= homeStart && position <= homeGoal) {
    return position + rolledNumber <= homeGoal ? position + rolledNumber : position;
  }

  const start = START_SQUARES[color];
  // Offset of current cell measured forward from own start (start -> 0)
  const off = (((position - start) % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  const newOff = off + rolledNumber;

  if (newOff <= TRACK_LAP - 1) {
    // Still on the main track
    return (((start - LOOP_HEAD + newOff) % LOOP_LEN) + LOOP_LEN) % LOOP_LEN + LOOP_HEAD;
  }

  // Completed the lap -> turn into home corridor from the arrow cell
  const homeTarget = homeStart + (newOff - TRACK_LAP);
  return homeTarget <= homeGoal ? homeTarget : position;
}
