import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchLiveUsdtBalance, shortenAddress } from '../services/web3Service';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import LogoC from '../LogoC.png';
import {
  Gamepad2,
  Flame,
  Sparkles,
  Rocket,
  Dice5,
  Coins,
  ShieldCheck,
  Trophy,
  Search,
  Play,
  TrendingUp,
  Zap,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Wallet,
  X,
  Radio,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  PlaySquare,
  Info,
  Pause,
  Volume2,
  Maximize2,
  Minimize2,
  Maximize,
  ExternalLink,
  BookOpen,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Shared game catalog (also used by the /play/:gameId page)
export const GAME_CATALOG = [
  {
    id: 'valley-of-terror',
    gzCode: 'B1jZWUoXUIe',
    title: 'Valley of Terror',
    category: 'originals',
    categoryLabel: 'Zombie FPS / Action',
    tag: 'HOT',
    tagColor: '#FF5252',
    maxWin: '5,000x',
    rtp: '98.9%',
    players: '4,620',
    description: 'First-person zombie survival shooter. Eliminate oncoming undead hordes, manage your ammunition, and defend your town bunker!',
    coverUrl: 'https://static.gamezop.com/B1jZWUoXUIe/wall.png',
    logoUrl: 'https://static.gamezop.com/B1jZWUoXUIe/square.png',
    screenshots: [
      { title: 'Zombie Horde Onslaught', url: 'https://static.gamezop.com/B1jZWUoXUIe/game-1.png' },
      { title: 'First-Person Crosshair Aim', url: 'https://static.gamezop.com/B1jZWUoXUIe/game-2.png' },
      { title: 'Bunker Defense Showdown', url: 'https://static.gamezop.com/B1jZWUoXUIe/game-3.png' },
      { title: 'Valley of Terror Artwork', url: 'https://static.gamezop.com/B1jZWUoXUIe/wall.png' },
    ],
    videoDuration: '0:45',
    videoTeaser: 'Zombie Wave Survival & Precision Headshot Streak',
    playableType: 'valleyofterror',
  },
  {
    id: 'fruit-chop',
    gzCode: 'rkWfy2pXq0r',
    title: 'Fruit Chop',
    category: 'originals',
    categoryLabel: 'Arcade Slicer',
    tag: 'POPULAR',
    tagColor: '#00E676',
    maxWin: '1,800x',
    rtp: '99.1%',
    players: '5,290',
    description: 'Slash through airborne watermelons, pineapples, and oranges in record speed. Dodge bombs to chain slicing combos.',
    coverUrl: 'https://static.gamezop.com/rkWfy2pXq0r/wall.png',
    logoUrl: 'https://static.gamezop.com/rkWfy2pXq0r/square.png',
    screenshots: [
      { title: 'Blade Slice Combo', url: 'https://static.gamezop.com/rkWfy2pXq0r/wall.png' },
      { title: 'Juicy Splash Bonus', url: 'https://static.gamezop.com/rkWfy2pXq0r/square.png' },
      { title: 'Frenzy Multiplier Mode', url: 'https://static.gamezop.com/rkWfy2pXq0r/wall.png' },
    ],
    videoDuration: '0:38',
    videoTeaser: 'Fruit Blade Frenzy & 10x Juicy Critical Slice',
    playableType: 'fruitchop',
  },
  {
    id: 'chess-grandmaster',
    gzCode: 'rkAXTzkD5kX',
    title: 'Chess Grandmaster',
    category: 'table',
    categoryLabel: 'Strategy Board',
    tag: 'VIP',
    tagColor: '#00E676',
    maxWin: '250x',
    rtp: '99.6%',
    players: '1,890',
    description: 'Master the 64-square battlefield with grandmaster engine heuristics. Challenge players or top AI bots.',
    coverUrl: 'https://static.gamezop.com/rkAXTzkD5kX/wall.png',
    logoUrl: 'https://static.gamezop.com/rkAXTzkD5kX/square.png',
    screenshots: [
      { title: 'Opening Gambit Setup', url: 'https://static.gamezop.com/rkAXTzkD5kX/wall.png' },
      { title: 'Tactical Checkmate Position', url: 'https://static.gamezop.com/rkAXTzkD5kX/square.png' },
      { title: 'AI Grandmaster Engine', url: 'https://static.gamezop.com/rkAXTzkD5kX/wall.png' },
    ],
    videoDuration: '0:55',
    videoTeaser: 'Queen Sacrifice & Brilliant Checkmate Sequence',
    playableType: 'generic',
  },
  {
    id: 'ludo-with-friends',
    gzCode: 'SkhljT2fdgb',
    title: 'Play With Friends Ludo',
    category: 'table',
    categoryLabel: 'Board / Multiplayer',
    tag: 'MULTIPLAYER',
    tagColor: '#39FF88',
    maxWin: '250x',
    rtp: '99.5%',
    players: '5,120',
    description: 'Classic 4-player board game. Roll the dice, deploy pawns on 6, capture enemy pawns, and race home to claim the pool jackpot.',
    coverUrl: 'https://static.gamezop.com/SkhljT2fdgb/wall.png',
    logoUrl: 'https://static.gamezop.com/SkhljT2fdgb/square.png',
    screenshots: [
      { title: '4-Player Board Layout', url: 'https://static.gamezop.com/SkhljT2fdgb/game-1.png' },
      { title: 'Dice Roll & Token Sprint', url: 'https://static.gamezop.com/SkhljT2fdgb/game-2.png' },
      { title: 'Safe Square Haven Arena', url: 'https://static.gamezop.com/SkhljT2fdgb/game-3.png' },
      { title: 'Victory Podium Win', url: 'https://static.gamezop.com/SkhljT2fdgb/wall.png' },
    ],
    videoDuration: '1:10',
    videoTeaser: 'Live 4-Player Ludo Tournament & Pawn Knockout',
    playableType: 'generic',
  },
  {
    id: 'sudoku-classic',
    gzCode: 'SJgx126Qc0H',
    title: 'Sudoku Classic',
    category: 'originals',
    categoryLabel: 'Brain / Logic',
    tag: 'PROVABLE',
    tagColor: '#00E676',
    maxWin: '350x',
    rtp: '99.0%',
    players: '1,240',
    description: 'Challenge your mental prowess with 9x9 Japanese number puzzles across Easy, Medium, and Expert master tiers.',
    coverUrl: 'https://static.gamezop.com/SJgx126Qc0H/wall.png',
    logoUrl: 'https://static.gamezop.com/SJgx126Qc0H/square.png',
    screenshots: [
      { title: '9x9 Grid Layout', url: 'https://static.gamezop.com/SJgx126Qc0H/wall.png' },
      { title: 'Note-Taking Pencil Mode', url: 'https://static.gamezop.com/SJgx126Qc0H/square.png' },
      { title: 'Zero-Error Master Run', url: 'https://static.gamezop.com/SJgx126Qc0H/wall.png' },
    ],
    videoDuration: '0:50',
    videoTeaser: 'Expert Speed-Solving Strategy & Number Notes',
    playableType: 'generic',
  },
  {
    id: 'assassins-hunt',
    gzCode: '9lpHai56Q',
    title: "Assassin's Hunt",
    category: 'crash',
    categoryLabel: 'Stealth / Action',
    tag: 'HOT',
    tagColor: '#FF5252',
    maxWin: '8,000x',
    rtp: '98.9%',
    players: '3,410',
    description: 'Creep through shadows, evade guards, and strike high-value targets for massive bounty multipliers.',
    coverUrl: 'https://static.gamezop.com/9lpHai56Q/wall.png',
    logoUrl: 'https://static.gamezop.com/9lpHai56Q/square.png',
    screenshots: [
      { title: 'Stealth Shadow Takedown', url: 'https://static.gamezop.com/9lpHai56Q/wall.png' },
      { title: 'Perimeter Laser Evasion', url: 'https://static.gamezop.com/9lpHai56Q/square.png' },
      { title: 'Bounty Extraction Escape', url: 'https://static.gamezop.com/9lpHai56Q/wall.png' },
    ],
    videoDuration: '1:02',
    videoTeaser: 'Stealth Infiltration & High Bounty Clean Extraction',
    playableType: 'crash',
  },
  {
    id: 'snakes-and-ladders',
    gzCode: 'rJWyhp79RS',
    title: 'Snakes & Ladders',
    category: 'table',
    categoryLabel: 'Classic Board',
    tag: 'POPULAR',
    tagColor: '#00E676',
    maxWin: '150x',
    rtp: '99.0%',
    players: '2,750',
    description: 'The traditional race to 100 with smooth climbing ladders and slippery neon serpents. Fun casual multiplayer.',
    coverUrl: 'https://static.gamezop.com/rJWyhp79RS/wall.png',
    logoUrl: 'https://static.gamezop.com/rJWyhp79RS/square.png',
    screenshots: [
      { title: '100-Tile Board Grid', url: 'https://static.gamezop.com/rJWyhp79RS/wall.png' },
      { title: 'Ladder Climb Super Boost', url: 'https://static.gamezop.com/rJWyhp79RS/square.png' },
      { title: 'Tile 100 Finish Line', url: 'https://static.gamezop.com/rJWyhp79RS/wall.png' },
    ],
    videoDuration: '0:34',
    videoTeaser: 'Triple 6 Roll & Epic Ladder Ascent to Victory',
    playableType: 'generic',
  },
  {
    id: 'tic-tac-toe',
    gzCode: 'H1WmafkP9JQ',
    title: 'Tic Tac Toe Master',
    category: 'originals',
    categoryLabel: 'Quick Duel',
    tag: 'INSTANT',
    tagColor: '#39FF88',
    maxWin: '2.0x',
    rtp: '99.5%',
    players: '1,680',
    description: '3x3 neon grid showdown. Play X or O, block opponent angles, and trigger consecutive win streak jackpots.',
    coverUrl: 'https://static.gamezop.com/H1WmafkP9JQ/wall.png',
    logoUrl: 'https://static.gamezop.com/H1WmafkP9JQ/square.png',
    screenshots: [
      { title: '3x3 Neon Grid Arena', url: 'https://static.gamezop.com/H1WmafkP9JQ/wall.png' },
      { title: 'Diagonal Win Combo', url: 'https://static.gamezop.com/H1WmafkP9JQ/square.png' },
      { title: 'Streak Multiplier Bonus', url: 'https://static.gamezop.com/H1WmafkP9JQ/wall.png' },
    ],
    videoDuration: '0:25',
    videoTeaser: 'Unbeatable AI Duel & Fast Win Streak Strategy',
    playableType: 'tictactoe',
  },
].map((game) => {
  const youtubeMap = {
    'valley-of-terror': '1O6QstnCpnc',
    'fruit-chop': 'M8Xog3seOU8',
    'ludo-with-friends': 'Q0F6a3Z9Kxk',
    'ludo-dash': 'Q0F6a3Z9Kxk',
    'chess-grandmaster': 'qM2_96N6c6o',
    'sudoku-classic': 'cZ6YvY-c2wU',
    'assassins-hunt': '1O6QstnCpnc',
    'snakes-and-ladders': '0kF1_PZ-39I',
    'tic-tac-toe': 'HJ8SnM_3Tnp',
  };

  const yId = youtubeMap[game.id] || 'p5-C3LCCkfM';
  const directUrl =
    game.id === 'ludo-with-friends' || game.id === 'ludo-dash'
      ? 'https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/index.html'
      : `https://gamescdn.gamezop.com/_game-files/${game.gzCode}/index.html`;

  return {
    ...game,
    embedUrl: `https://gamescdn.gamezop.com/_game-files/${game.gzCode}/index.html`,
    directUrl,
    youtubeId: yId,
    trailerEmbedUrl: `https://www.youtube.com/embed/${yId}?autoplay=1&mute=0&rel=0`,
    screenshots: [
      { title: `${game.title} - Official In-Game Gameplay Screen 1`, url: `https://static.gamezop.com/${game.gzCode}/game-1.png` },
      { title: `${game.title} - Official In-Game Gameplay Screen 2`, url: `https://static.gamezop.com/${game.gzCode}/game-2.png` },
      { title: `${game.title} - Official In-Game Gameplay Screen 3`, url: `https://static.gamezop.com/${game.gzCode}/game-3.png` },
      { title: `${game.title} - Official HD Wallpaper Artwork`, url: `https://static.gamezop.com/${game.gzCode}/wall.png` },
    ],
  };
});

export const getGameRedirectUrl = (game) => {
  if (!game) return 'https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/index.html';
  if (game.id === 'ludo-with-friends' || game.id === 'ludo-dash') {
    return 'https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/index.html';
  }
  return game.directUrl || game.embedUrl || `https://gamescdn.gamezop.com/_game-files/${game.gzCode}/index.html`;
};

// In-app play page path (your own domain) - keeps your URL in the address
// bar instead of exposing the external Gamezop CDN URL.
export const getGamePlayPath = (game) => `/play/${game?.id || 'ludo-dash'}`;

// Comprehensive Game-Specific Rules, Mechanics, Scoring & Pro Tips Database
const GAME_RULES = {
  'valley-of-terror': {
    genre: 'First-Person Zombie Survival Shooter',
    objective: 'Defend your town bunker against relentless waves of encroaching zombies, timing accurate shots and tactical reloads.',
    controls: 'Left Click or Tap on screen to aim and shoot zombies. Click the Reload button when ammunition runs dry.',
    rules: [
      {
        title: 'Wave-Based Undead Assault',
        desc: 'Zombies advance from the foggy ruins toward your bunker perimeter. Eliminate them before they breach your barricade.',
      },
      {
        title: 'Critical Headshot Accuracy',
        desc: 'Aim directly for the zombies\' heads to score instant one-shot eliminations and build consecutive hit-streak multipliers.',
      },
      {
        title: 'Ammunition & Tactical Reloading',
        desc: 'Your handgun has limited magazine capacity. Monitor your round count and reload during pauses between zombie waves.',
      },
      {
        title: 'Survival Multiplier Escalation',
        desc: 'Surviving consecutive zombie waves without sustaining barrier damage increases your win multiplier up to 5,000x.',
      },
    ],
    scoring: [
      { label: 'Zombie Kill', value: '+150 pts (1.0x)' },
      { label: 'Headshot Critical', value: '+350 pts (2.5x)' },
      { label: 'Wave Clear Bonus', value: '+1,000 pts' },
      { label: 'Perimeter Breach', value: '-1 Life Strike' },
    ],
    proTips: [
      'Prioritize fast-sprinting zombies closest to your bunker before targeting distant slow walkers.',
      'Reload preemptively when you have 1-2 bullets remaining rather than waiting for an empty chamber during a zombie swarm.',
    ],
  },
  'fruit-chop': {
    genre: 'Fast-Paced Fruit Slicer',
    objective: 'Slice airborne fruits in rapid succession to trigger combo blitzes, maintain clean blade streaks, and dodge floating explosive bombs.',
    controls: 'Click & drag or swipe finger across multiple airborne fruits simultaneously to perform combo cuts.',
    rules: [
      {
        title: 'Airborne Blade Slicing',
        desc: 'Watermelons, pineapples, apples, and oranges launch upwards. Slice through them before they drop below the screen.',
      },
      {
        title: 'Multi-Fruit Combo Slices',
        desc: 'Slicing 3 or more fruits in a single unbroken swipe activates Combo Blitz bonuses (+30 to +100 bonus multiplier points).',
      },
      {
        title: 'Avoid Spiked Bombs',
        desc: 'Black spiked bombs launch mixed with fruits. Cutting any bomb causes an immediate explosion and incurs a strike.',
      },
      {
        title: 'Life & Drop Penalties',
        desc: 'Allowing 3 un-sliced fruits to drop past the bottom border ends the round. Reaching 5,000 pts awards an extra life.',
      },
    ],
    scoring: [
      { label: 'Single Fruit Cut', value: '+10 pts' },
      { label: '3-Fruit Combo', value: '+30 pts (+2x)' },
      { label: '5-Fruit Combo Blitz', value: '+100 pts (+5x)' },
      { label: 'Spiked Bomb Strike', value: 'Instant Round Penalty' },
    ],
    proTips: [
      'Wait for fruits to reach the apex (highest point) of their arc where their vertical speed slows to zero before slicing.',
      'Make short, precise diagonal swipes rather than wild sweeping strokes to avoid accidentally clipping bombs.',
    ],
  },
  'ludo-with-friends': {
    genre: 'Classic 4-Player Strategy Board',
    objective: 'Roll the dice, deploy 4 colored tokens from your yard on a 6, navigate the 52-tile circuit, and safely park all tokens into the center home triangle.',
    controls: 'Click the central 3D dice to roll. Click an active highlighted token to advance it along the path.',
    rules: [
      {
        title: 'Deploying Tokens (Roll a 6)',
        desc: 'A dice roll of 6 is mandatory to move a pawn out of your starting yard onto the track. Rolling a 6 also grants a consecutive bonus roll.',
      },
      {
        title: 'Capturing Opponent Pawns',
        desc: 'Landing your pawn on a square occupied by an opponent sends their pawn back to yard base, awarding you a free bonus turn.',
      },
      {
        title: 'Starred Safe Squares',
        desc: 'Squares marked with a Star (and your team entry colored squares) are safe havens where tokens cannot be captured or eliminated.',
      },
      {
        title: 'Winning & Victory Podium',
        desc: 'The player who navigates all 4 pawns into their central triangle first claims 1st place and the full prize pool payout.',
      },
    ],
    scoring: [
      { label: 'Roll a 6', value: 'Deploy Pawn + Extra Roll' },
      { label: 'Opponent Capture', value: 'Send Enemy Home + Bonus Turn' },
      { label: 'Safe Star Haven', value: 'Immune to Attacks' },
      { label: 'Home Triangle (4 Pawns)', value: '1st Place Jackpot Win' },
    ],
    proTips: [
      'Keep 2 or more pawns in play simultaneously. Moving a single pawn leaves you vulnerable to enemy ambushes from behind.',
      'Park your pawns on starred safe tiles whenever an opponent is within 1 to 6 spaces behind you.',
    ],
  },
  'ludo-dash': {
    genre: 'Lightning Fast Arcade Ludo',
    objective: 'Race against the clock in rapid-fire turns! Move pawns immediately without waiting for a 6, accumulate step points, capture rivals for bonus multipliers, and finish with the highest score.',
    controls: 'Click the central dice to roll instantly. Tap any eligible highlighted pawn to sprint forward along the colored track.',
    rules: [
      {
        title: 'Instant Pawn Deployment (No 6 Required)',
        desc: 'All pawns start unlocked and ready to sprint! You do NOT need to wait to roll a 6 to deploy pawns onto the track.',
      },
      {
        title: 'Step-Based Point Accumulation',
        desc: 'Every single square your pawn advances awards +1 point. Moving pawns steadily into home corridors builds massive score multipliers.',
      },
      {
        title: 'High-Impact Pawn Captures',
        desc: 'Landing on an opponent pawn eliminates it back to their yard, deducts points from their total, and awards you a massive +50 capture bonus.',
      },
      {
        title: 'Speed Timer & Blitz Finish',
        desc: 'Matches operate on a fast-paced timer. The player with the highest total score when time expires or who parks all pawns first claims 1st place jackpot!',
      },
    ],
    scoring: [
      { label: 'Step Advanced', value: '+1 Point per tile' },
      { label: 'Pawn Reaches Home', value: '+56 Points Bonus' },
      { label: 'Opponent Captured', value: '+50 Points & Steal' },
      { label: 'Time Expiry Victory', value: 'Highest Score Wins Pot' },
    ],
    proTips: [
      'Advance all 4 pawns together to maximize step points rather than moving just one pawn at a time.',
      'Target opponent pawns that are close to their home corridor to inflict the maximum point loss on them.',
    ],
  },
  'chess-grandmaster': {
    genre: 'Turn-Based Board Strategy',
    objective: 'Outmaneuver the opponent using tactical gambits, positional piece development, and trap the enemy King in an inescapable checkmate.',
    controls: 'Click a chess piece to highlight all legal destination squares, then click a highlighted square to execute the move.',
    rules: [
      {
        title: 'Legal Piece Movement',
        desc: 'Pawns move forward 1 square (2 on initial move), Knights move in an L-shape (2+1), Bishops diagonally, Rooks orthogonally, Queens in all 8 directions, Kings 1 square.',
      },
      {
        title: 'Castling Kingside & Queenside',
        desc: 'Move your King 2 squares toward a Rook to castle, shielding the King and activating the Rook, provided neither piece has moved and no squares in between are attacked.',
      },
      {
        title: 'En Passant & Pawn Promotion',
        desc: 'Pawns reaching the 8th rank immediately promote to Queen, Rook, Bishop, or Knight. En Passant allows capturing enemy pawns that advance two squares past your pawn rank.',
      },
      {
        title: 'Checkmate & Draw Conditions',
        desc: 'Checkmate occurs when the King is in check with no legal move to escape. Stalemate, 50-move rule without captures, or threefold repetition results in a draw.',
      },
    ],
    scoring: [
      { label: 'Pawn Value', value: '1 Point' },
      { label: 'Knight & Bishop', value: '3 Points each' },
      { label: 'Rook Value', value: '5 Points' },
      { label: 'Queen Value', value: '9 Points' },
      { label: 'Checkmate', value: 'Instant Match Victory' },
    ],
    proTips: [
      'Control the 4 central squares (d4, e4, d5, e5) early to restrict enemy piece mobility.',
      'Develop Knights before Bishops, and aim to castle your King within the first 7-10 moves for defensive security.',
    ],
  },
  'sudoku-classic': {
    genre: 'Japanese Logic & Deductive Puzzle',
    objective: 'Fill the entire 9x9 grid with numbers 1 through 9 so that every row, every column, and each of the nine 3x3 subgrids contains all numbers 1-9 with no repeats.',
    controls: 'Click any empty grid cell to select it, then click or press numbers 1-9 on keypad. Toggle Pencil mode for drafting candidate notes.',
    rules: [
      {
        title: 'Row & Column Exclusivity',
        desc: 'Each of the 9 horizontal rows and 9 vertical columns must contain digits 1 through 9 exactly once without any duplication.',
      },
      {
        title: '3x3 Subgrid Region Rule',
        desc: 'Each 3x3 bolded box must also contain the numbers 1 through 9 once. No digit can be repeated inside the same 3x3 box.',
      },
      {
        title: 'Pencil Drafting Notes',
        desc: 'Switch to Pencil mode to mark possible numbers in candidate cells. Placing a confirmed number automatically clears invalid candidate notes.',
      },
      {
        title: 'Error Strikes & Difficulty Tiers',
        desc: 'Entering an incorrect digit counts as a strike. 3 strikes ends the round. Select from Easy, Medium, and Grandmaster tiers.',
      },
    ],
    scoring: [
      { label: 'Correct Cell Placement', value: '+100 pts' },
      { label: 'Row / Column Completed', value: '+500 pts Bonus' },
      { label: '3x3 Box Completed', value: '+750 pts Bonus' },
      { label: 'Zero-Error Clean Run', value: '2.5x Multiplier Score' },
    ],
    proTips: [
      'Cross-hatching: Focus on rows and columns that already have 6-7 numbers filled in to identify the remaining 1-2 missing numbers.',
      'Use pencil notes for cells that have only 2 possible candidates (pairs). This reveals naked pairs that eliminate possibilities elsewhere.',
    ],
  },
  'assassins-hunt': {
    genre: 'Wild West Quick-Draw Action',
    objective: 'Infiltrate outlaw hideouts, eliminate wanted bandits popping out from saloons and rooftops, protect innocent bystanders, and claim high-roller bounties.',
    controls: 'Click or tap on bandit targets to fire your revolver. Tap cylinder or wait for brief lulls to reload ammunition.',
    rules: [
      {
        title: 'Quick-Draw Target Acquisition',
        desc: 'Bandits peer out from saloon doors, balconies, and barrels. Neutralize them before their countdown timer expires and they open fire.',
      },
      {
        title: 'Critical Headshot Multipliers',
        desc: 'Aiming for the head grants a 3x Critical Hit bonus, clearing bandits in 1 shot and boosting your bounty multiplier.',
      },
      {
        title: 'Civilian & Hostage Protection',
        desc: 'Unarmed townspeople and saloon bartenders will occasionally appear. Firing upon a civilian incurs a heavy -500 bounty penalty.',
      },
      {
        title: 'Chamber Ammo Management',
        desc: 'Your revolver holds 6 rounds. Running dry during an outlaw firefight leaves you defenseless—always reload during brief lulls in action.',
      },
    ],
    scoring: [
      { label: 'Bandit Takedown', value: '+150 Bounty' },
      { label: 'Critical Headshot', value: '+500 Bounty (3x)' },
      { label: 'Civilian Hit Penalty', value: '-500 Bounty (-1 Life)' },
      { label: 'Boss Outlaw Defeat', value: '+2,500 Bounty Pool' },
    ],
    proTips: [
      'Reload after taking down 3-4 targets rather than waiting until your chamber is empty.',
      'Identify bandits by their bandanas and raised guns; never shoot immediately without verifying the target is not a civilian.',
    ],
  },
  'snakes-and-ladders': {
    genre: 'Classic Race-to-100 Board Game',
    objective: 'Be the first player to travel from tile 1 to tile 100 on the grid, climbing ladders for massive leaps and avoiding slippery serpents.',
    controls: 'Click the animated dice cup to roll 1-6. Your token automatically glides along the numbered tiles.',
    rules: [
      {
        title: 'Dice Roll & Movement',
        desc: 'Roll a 1 through 6 on your turn. Your token advances that exact number of squares following the zigzag path from 1 up to 100.',
      },
      {
        title: 'Ladder Ascent Boost',
        desc: 'Landing exactly on a square with the base of a ladder automatically propels your token all the way up to the top rung.',
      },
      {
        title: 'Snake Slide Penalty',
        desc: 'Landing on a tile containing a snake head causes your token to slide down the serpentine body to the tip of its tail.',
      },
      {
        title: 'Exact Roll to Win (Tile 100)',
        desc: 'To finish, you must land on tile 100 by exact dice roll. If your roll exceeds the required spaces, your token bounces backwards.',
      },
    ],
    scoring: [
      { label: 'Ladder Climb', value: 'Super Leap Up (+15 to +40 Tiles)' },
      { label: 'Snake Slide', value: 'Slide Down (-10 to -35 Tiles)' },
      { label: 'Roll a 6', value: 'Advance 6 + Bonus Extra Roll' },
      { label: 'Tile 100 Finish', value: 'Winner Takes All Pot' },
    ],
    proTips: [
      'Tile 28 and Tile 71 contain the biggest upward ladders—target rolls that can land on these launchpads.',
      'Beware of tile 98, which houses the giant boa constrictor that slides you back down to tile 28 right before the finish line.',
    ],
  },
  'tic-tac-toe': {
    genre: 'Neon Grid Strategy Duel',
    objective: 'Place 3 of your marks (X or O) in a horizontal, vertical, or diagonal line on the 3x3 grid while blocking your opponent from doing the same.',
    controls: 'Click any empty cell on the 3x3 grid on your turn to place your neon symbol.',
    rules: [
      {
        title: 'Turn-Based Grid Placement',
        desc: 'Players take turns marking empty cells. Player 1 plays green neon "X", Player 2 (or AI bot) plays cyan neon "O".',
      },
      {
        title: 'Winning 3-in-a-Row Line',
        desc: 'The first player to align 3 matching symbols horizontally, vertically, or diagonally wins the round and claims the win multiplier.',
      },
      {
        title: 'Draw / Push Stalemate',
        desc: 'If all 9 cells are filled and neither player has achieved a 3-in-a-row line, the match is declared a Draw (Push) and bets are returned.',
      },
      {
        title: 'Consecutive Streak Multipliers',
        desc: 'Winning multiple consecutive rounds builds up a streak multiplier, multiplying payouts from 2.0x up to 10.0x.',
      },
    ],
    scoring: [
      { label: 'Round Win (3-in-a-Row)', value: '2.0x Payout' },
      { label: '3-Round Win Streak', value: '3.5x Multiplier' },
      { label: '5-Round Win Streak', value: '10.0x Jackpot' },
      { label: 'Tie / Draw', value: 'Push (100% Bet Refunded)' },
    ],
    proTips: [
      'First move advantage: If you go first, claim the center square (tile 5) or one of the 4 corner squares to establish a fork setup.',
      'Create a "Fork": Aim to place two non-adjacent marks so that you threaten two different winning lines simultaneously; opponent can only block one.',
    ],
  },
};

// Simulated Live Feed of Real-time Wins
const INITIAL_LIVE_WINS = [
  { id: 1, user: '0x3a91...8c4', game: 'Aether Crash', amount: '+420.50', mult: '3.42x', time: '1s ago' },
  { id: 2, user: '0x8f14...2e9', game: 'Cyber Mines', amount: '+1,250.00', mult: '12.5x', time: '3s ago' },
  { id: 3, user: '0x12dc...6b7', game: 'Starlight Rush', amount: '+890.00', mult: '45.0x', time: '6s ago' },
  { id: 4, user: '0x7b28...4f1', game: 'Crypto Blackjack', amount: '+300.00', mult: '2.0x', time: '10s ago' },
];

export default function GamesLobby() {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [activeGameModal, setActiveGameModal] = useState(null);
  const [modalTab, setModalTab] = useState('play'); // 'play' | 'video' | 'screenshots' | 'rules'
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(25);
  const [toastMessage, setToastMessage] = useState(null);
  const [liveWins, setLiveWins] = useState(INITIAL_LIVE_WINS);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [showGameAlert, setShowGameAlert] = useState(false);
  const [isForceLandscape, setIsForceLandscape] = useState(false);

  // Show Gamezop notice alert for every game, delayed by 3 seconds
  useEffect(() => {
    setShowGameAlert(false);
    setIsForceLandscape(false);
    if (activeGameModal && modalTab === 'play') {
      const timer = setTimeout(() => setShowGameAlert(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeGameModal, modalTab, iframeKey]);

  // Disable cursor particle trail & listen for ESC key when playing game or in full screen
  useEffect(() => {
    const isPlaying = Boolean(activeGameModal && (modalTab === 'play' || isFullScreen));
    if (isPlaying) {
      document.body.classList.add('in-game-active');
      document.body.setAttribute('data-in-game', 'true');
    } else {
      document.body.classList.remove('in-game-active');
      document.body.removeAttribute('data-in-game');
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('in-game-active');
      document.body.removeAttribute('data-in-game');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeGameModal, modalTab, isFullScreen]);

  // Print in console whatever value the game sends back (postMessage, callbacks, custom events)
  useEffect(() => {
    const handleGameMessage = (event) => {
      if (!event.data) return;
      if (typeof event.data === 'string' && event.data.startsWith('webpack')) return;

      let parsed = event.data;
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data);
        } catch (_) {
          parsed = event.data;
        }
      }

      console.log(
        '%c🎮 [GAME RETURN VALUE]',
        'background: #00E676; color: #000000; font-weight: 900; font-size: 13px; padding: 3px 8px; border-radius: 4px;',
        parsed
      );
      console.log('[Game Details] Origin:', event.origin, '| Raw Data:', event.data);
    };

    const handleCustomEvent = (e) => {
      console.log(
        '%c🎮 [GAME CUSTOM EVENT]',
        'background: #39FF88; color: #000000; font-weight: bold; padding: 2px 6px;',
        e.detail || e
      );
    };

    window.gzpCallback = (val) => {
      console.log('%c🎮 [GZP CALLBACK RETURN VALUE]', 'background: #FFB300; color: #000; font-weight: bold; padding: 2px 6px;', val);
    };
    window.onGameOver = (val) => {
      console.log('%c🎮 [GAME OVER RETURN VALUE]', 'background: #FF5252; color: #fff; font-weight: bold; padding: 2px 6px;', val);
    };
    window.onGameScore = (val) => {
      console.log('%c🎮 [GAME SCORE RETURN VALUE]', 'background: #00E676; color: #000; font-weight: bold; padding: 2px 6px;', val);
    };

    window.addEventListener('message', handleGameMessage);
    window.addEventListener('gameresult', handleCustomEvent);
    window.addEventListener('gameover', handleCustomEvent);
    window.addEventListener('gamescore', handleCustomEvent);

    return () => {
      window.removeEventListener('message', handleGameMessage);
      window.removeEventListener('gameresult', handleCustomEvent);
      window.removeEventListener('gameover', handleCustomEvent);
      window.removeEventListener('gamescore', handleCustomEvent);
    };
  }, []);

  // Live Crash Mini-Game Simulation State
  const [crashState, setCrashState] = useState({
    status: 'idle', // 'idle' | 'running' | 'cashed' | 'crashed'
    multiplier: 1.0,
    betAmount: 10,
    cashedMultiplier: null,
  });

  // Live Mines Mini-Game Simulation State
  const [minesGrid, setMinesGrid] = useState(
    Array(25).fill(null).map((_, i) => ({ id: i, revealed: false, isBomb: [3, 7, 14, 21].includes(i) }))
  );
  const [minesWonAmount, setMinesWonAmount] = useState(0);
  const [minesGameOver, setMinesGameOver] = useState(false);

  // Periodic random live bets in feed
  useEffect(() => {
    const games = ['Aether Crash', 'Cyber Mines', 'Starlight Rush', 'Plinko Galaxy', 'Pixel Dice'];
    const interval = setInterval(() => {
      const randGame = games[Math.floor(Math.random() * games.length)];
      const randAmt = (Math.random() * 250 + 15).toFixed(2);
      const randMult = (Math.random() * 5 + 1.2).toFixed(2);
      const randAddr = `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 5)}`;

      setLiveWins((prev) => [
        {
          id: Date.now(),
          user: randAddr,
          game: randGame,
          amount: `+${randAmt}`,
          mult: `${randMult}x`,
          time: 'Just now',
        },
        ...prev.slice(0, 5),
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let list = GAME_CATALOG.filter((game) => {
      const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'rtp') {
      list.sort((a, b) => parseFloat(b.rtp) - parseFloat(a.rtp));
    } else if (sortBy === 'maxWin') {
      list.sort((a, b) => parseInt(b.maxWin) - parseInt(a.maxWin));
    }

    return list;
  }, [selectedCategory, searchQuery, sortBy]);

  // Tic Tac Toe Mini-Game Simulation State
  const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState('X');
  const [tttWinner, setTttWinner] = useState(null);

  // Open Game Launcher Modal
  const handleLaunchGame = (game, defaultTab = 'play') => {
    setActiveGameModal(game);
    setModalTab(defaultTab);
    setActiveScreenshotIndex(0);
    setIsVideoPlaying(true);
    setVideoProgress(18);
    setIsIframeLoading(true);
    console.log('[GameLaunch] Opening game:', {
      id: game?.id,
      title: game?.title,
      gzCode: game?.gzCode,
      embedUrl: game?.embedUrl,
      playPath: getGamePlayPath(game),
    });
    setIframeKey((prev) => prev + 1);

    // Reset crash game state
    setCrashState({
      status: 'idle',
      multiplier: 1.0,
      betAmount: 10,
      cashedMultiplier: null,
    });
    // Reset mines
    setMinesGrid(
      Array(25)
        .fill(null)
        .map((_, i) => ({
          id: i,
          revealed: false,
          isBomb: Math.random() < 0.2,
        }))
    );
    setMinesWonAmount(0);
    setMinesGameOver(false);

    // Reset TicTacToe
    setTttBoard(Array(9).fill(null));
    setTttTurn('X');
    setTttWinner(null);
  };

  // Check TicTacToe winner
  const checkTttWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every(cell => cell !== null)) return 'Draw';
    return null;
  };

  const handleTttClick = (index) => {
    if (tttBoard[index] || tttWinner) return;
    const newBoard = [...tttBoard];
    newBoard[index] = 'X';

    const winCheck = checkTttWinner(newBoard);
    if (winCheck) {
      setTttBoard(newBoard);
      setTttWinner(winCheck);
      if (winCheck === 'X') {
        setToastMessage({ text: '🎉 You won the Tic Tac Toe match! +20.00 USDT', type: 'success' });
      }
      return;
    }

    // AI Move
    const emptyIndices = newBoard.map((val, idx) => (val === null ? idx : null)).filter(val => val !== null);
    if (emptyIndices.length > 0) {
      const aiChoice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      newBoard[aiChoice] = 'O';
      const aiWinCheck = checkTttWinner(newBoard);
      if (aiWinCheck) {
        setTttWinner(aiWinCheck);
      }
    }

    setTttBoard(newBoard);
  };

  // Mini-Game: Crash Simulation Engine
  const startCrashRound = () => {
    setCrashState({
      status: 'running',
      multiplier: 1.0,
      betAmount: 10,
      cashedMultiplier: null,
    });

    const crashPoint = (1.1 + Math.random() * 4.5).toFixed(2);
    let current = 1.0;

    const timer = setInterval(() => {
      current = +(current + 0.05).toFixed(2);

      setCrashState((prev) => {
        if (prev.status === 'cashed') {
          clearInterval(timer);
          return prev;
        }

        if (current >= crashPoint) {
          clearInterval(timer);
          return { ...prev, status: 'crashed', multiplier: crashPoint };
        }

        return { ...prev, multiplier: current };
      });
    }, 80);
  };

  const handleCashoutCrash = () => {
    if (crashState.status === 'running') {
      const win = (crashState.betAmount * crashState.multiplier).toFixed(2);
      setCrashState((prev) => ({
        ...prev,
        status: 'cashed',
        cashedMultiplier: prev.multiplier,
      }));
      setToastMessage({
        text: `🚀 Cashed out at ${crashState.multiplier}x! Won +${win} USDT`,
        type: 'success',
      });
    }
  };

  // Mini-Game: Mines Click Tile
  const handleMinesTileClick = (index) => {
    if (minesGameOver || minesGrid[index].revealed) return;

    const tile = minesGrid[index];
    const newGrid = [...minesGrid];
    newGrid[index] = { ...tile, revealed: true };
    setMinesGrid(newGrid);

    if (tile.isBomb) {
      setMinesGameOver(true);
      setToastMessage({
        text: '💥 Mine hit! Round ended.',
        type: 'error',
      });
    } else {
      const gemsRevealed = newGrid.filter((t) => t.revealed && !t.isBomb).length;
      const prize = (gemsRevealed * 3.5).toFixed(2);
      setMinesWonAmount(prize);
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#050505' }}>
      {/* Notifications */}
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Top Navbar - hidden while game modal is open */}
      {!activeGameModal && (
        <Navbar onCopyToast={(msg) => setToastMessage({ text: msg, type: 'success' })} />
      )}

      {/* Main Games Lobby Container */}
      <div className="lobby-container">
        {/* HERO BANNER SECTION - Exact Custom Design with Cyber Matrix & 3D Network Graph */}
        <section className="lobby-hero-custom">
          {/* Subtle Grid / Matrix Overlay */}
          <div className="hero-grid-overlay" />
          <div className="hero-ambient-glow" />

          {/* Right Side Rotating LXT 3D Emblem with slow rotation */}
          <div className="hero-rotating-logo-container" aria-label="LXT Rotating Emblem">
            <div className="rotating-logo-glow" />
            <div className="rotating-logo-ring outer-ring" />
            <div className="rotating-logo-ring inner-ring" />
            <div className="rotating-logo-core">
              <div className="rotating-logo-face">
                <img src={LogoC} alt="LXT Token Emblem" className="spinning-lxt-logo" />
                <div className="rotating-brand-text">
                  <span>L</span><span className="highlight-green">XT</span>
                </div>
                <div className="rotating-brand-sub">WEB3 GAMING</div>
              </div>
            </div>
            {/* Orbiting Neon Particle Dots */}
            <div className="orbiting-particle p1" />
            <div className="orbiting-particle p2" />
            <div className="orbiting-particle p3" />
          </div>

          {/* Left Content Area */}
          <div className="hero-custom-content">
            {/* Top Pill with 3D Dice and Joystick */}
            <div className="hero-pill-badge-row">
              <span className="badge-3d-icon" role="img" aria-label="dice">🎲</span>
              <div className="hero-custom-pill">
                <Sparkles size={14} className="hero-pill-sparkle" color="#00E676" />
                <span>OFFICIAL WEB3 CASINO &amp; ARCADE</span>
              </div>
              <span className="badge-3d-icon" role="img" aria-label="joystick">🕹️</span>
            </div>

            {/* Glowing Big Title with Binary Hacker Matrix Background */}
            <div className="hero-title-wrapper">
              <h1 className="hero-custom-title">
                PLAY. WIN. <span className="neon-title-highlight">INSTANT CASHOUT.</span>
              </h1>
              {/* Subtle Binary Code Matrix Backdrop */}
              <div className="hero-binary-matrix" aria-hidden="true">
                <span>01 1 0 0&nbsp;&nbsp;&nbsp;&nbsp;11 0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;10 10&nbsp;&nbsp;&nbsp;1</span>
                <span>0&nbsp;&nbsp;0 1 0&nbsp;&nbsp;&nbsp;1 1 10 &nbsp;0.0&nbsp;&nbsp;&nbsp;&nbsp;1110 0</span>
                <span>1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;1</span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="hero-custom-subtitle">
              Provably fair decentralized gaming powered by smart contracts. Connect, wager USDT, and cash out directly to your EVM wallet.
            </p>

            {/* CTA Action Row: Clean Buttons */}
            <div className="hero-custom-actions">
              <button
                onClick={() => handleLaunchGame(GAME_CATALOG[0], 'play')}
                className="hero-btn-featured"
              >
                <Play size={16} fill="#000000" color="#000000" />
                <span>Play Featured: Aether Crash</span>
              </button>

              {/* Manage Wallet & USDT Button without code text lines */}
              <Link to="/dashboard" className="hero-btn-cyber-bracket">
                <div className="bracket-content">
                  <Wallet size={16} color="#00E676" />
                  <span>Manage Wallet &amp; USDT</span>
                </div>
              </Link>
            </div>

            {/* Bottom 4 Modern Rounded Stat Cards with Green Neon Accents */}
            <div className="hero-stat-cards-row">
              {/* Card 1: Total Payouts */}
              <div className="hero-stat-box">
                <div className="stat-box-value">
                  <span>$3,420,890</span>
                  <span className="stat-plus-green">+</span>
                </div>
                <div className="stat-box-label">TOTAL PAYOUTS</div>
              </div>

              {/* Card 2: Highest RTP with green arrow */}
              <div className="hero-stat-box">
                <div className="stat-box-value">
                  <span>99.2%</span>
                  <span className="stat-trend-arrow">↗</span>
                </div>
                <div className="stat-box-label">HIGHEST RTP</div>
              </div>

              {/* Card 3: Active Players */}
              <div className="hero-stat-box">
                <div className="stat-box-value">
                  <span>12,480+</span>
                </div>
                <div className="stat-box-label">ACTIVE PLAYERS</div>
              </div>

              {/* Card 4: On-Chain Settlement */}
              <div className="hero-stat-box">
                <div className="stat-box-value">Instant</div>
                <div className="stat-box-label">ON-CHAIN SETTLEMENT</div>
              </div>
            </div>
          </div>
        </section>

        {/* RECENT LIVE WINS TICKER */}
        <div className="live-ticker-bar">
          <div className="ticker-label">
            <Radio size={14} color="#00E676" className="pulse-icon" />
            <span>LIVE WINNERS</span>
          </div>
          <div className="ticker-items-scroller">
            {liveWins.map((win) => (
              <div key={win.id} className="ticker-item">
                <span className="ticker-user">{win.user}</span>
                <span className="ticker-game">{win.game}</span>
                <span className="ticker-amount">{win.amount} USDT</span>
                <span className="ticker-mult">({win.mult})</span>
              </div>
            ))}
          </div>
        </div>

        {/* GAMES FILTER & SEARCH BAR */}
        <div className="lobby-controls">
          {/* Category Tabs */}
          <div className="category-tabs">
            {[
              { id: 'all', label: 'All Games', icon: <Gamepad2 size={16} /> },
              { id: 'crash', label: 'Crash', icon: <Rocket size={16} /> },
              { id: 'originals', label: 'Originals', icon: <Flame size={16} /> },
              { id: 'table', label: 'Table & Cards', icon: <Dice5 size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`category-btn ${selectedCategory === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="search-sort-group">
            <div className="search-box">
              <Search size={16} color="#A3A3A3" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="search-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-dropdown"
            >
              <option value="popular">Most Popular</option>
              <option value="rtp">Highest RTP</option>
              <option value="maxWin">Max Multiplier</option>
            </select>
          </div>
        </div>

        {/* ALL GAMES GRID */}
        <section className="games-grid-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {selectedCategory === 'all'
                  ? 'All Available Games'
                  : `${selectedCategory.toUpperCase()} Games`}
              </h2>
              <p className="section-desc">
                Showing {filteredGames.length} provably fair Web3 games ready to play
              </p>
            </div>
            <div className="provably-fair-badge">
              <ShieldCheck size={16} color="#00E676" />
              <span>Provably Fair Hash Verified</span>
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="no-games-found">
              <AlertTriangle size={32} color="#00E676" />
              <h3>No games found</h3>
              <p>Try searching for a different name or switch categories.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="btn-secondary"
                style={{ marginTop: '12px' }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {filteredGames.map((game) => (
                <div key={game.id} className="game-card">
                  {/* Card Art Area with Gamezop Wallpaper & 3D Typography Banner */}
                  <div className="game-card-art">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      className="game-cover-image"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />

                    {/* Top Tag Pill (HOT, POPULAR, MULTIPLAYER, VIP, ACTION, PROVABLE) */}
                    <div className="game-tag-pill">
                      {game.tag}
                    </div>

                    {/* Top Right Rules & Specs Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchGame(game, 'rules');
                      }}
                      className="game-demo-pill"
                      title="View Game Rules & Specs"
                    >
                      <BookOpen size={12} />
                      <span>Rules &amp; Specs</span>
                    </button>

                    {/* Bottom-Left Gamezop Rounded Icon Badge */}
                    <div className="game-logo-avatar-frame">
                      <img
                        src={game.logoUrl}
                        alt={`${game.title} Logo`}
                        className="game-logo-avatar-img"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Card Info Area */}
                  <div className="game-card-body">
                    <div className="game-card-header">
                      <h3 className="game-title">{game.title}</h3>
                      <span className="game-category-badge">{game.categoryLabel}</span>
                    </div>

                    <p className="game-desc">{game.description}</p>

                    {/* Spec Metrics Row (MAX WIN, RTP, ONLINE with user icon) */}
                    <div className="game-specs-panel">
                      <div className="spec-col">
                        <span className="spec-label">MAX WIN</span>
                        <span className="spec-val highlight">{game.maxWin}</span>
                      </div>
                      <div className="spec-col">
                        <span className="spec-label">RTP</span>
                        <span className="spec-val">{game.rtp}</span>
                      </div>
                      <div className="spec-col">
                        <span className="spec-label">ONLINE</span>
                        <span className="spec-val users">
                          <Users size={12} color="#00E676" /> {game.players}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions: Green Play Now + Translucent Rules & Specs */}
                    <div className="game-card-actions">
                      <button
                        onClick={() => handleLaunchGame(game, 'play')}
                        className="card-btn-play"
                      >
                        <Play size={13} fill="#FFFFFF" color="#FFFFFF" />
                        <span>Play Now</span>
                      </button>
                      <button
                        onClick={() => handleLaunchGame(game, 'rules')}
                        className="card-btn-demo"
                      >
                        Rules &amp; Specs
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER GAMING FEATURES BANNER */}
        <section className="gaming-features-grid">
          <div className="feature-box">
            <div className="feature-icon">
              <ShieldCheck size={24} color="#00E676" />
            </div>
            <h4>Cryptographic Fairness</h4>
            <p>Every seed, multiplier, and roll is calculated on-chain with cryptographic SHA-256 proofs.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <Zap size={24} color="#00E676" />
            </div>
            <h4>Instant USDT Cashouts</h4>
            <p>Direct smart contract settlement to your EVM wallet address with zero withdrawal delays.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <Award size={24} color="#00E676" />
            </div>
            <h4>VIP High-Roller Limits</h4>
            <p>Flexible wagering limits from 1 USDT up to 50,000 USDT per round with VIP rake back rewards.</p>
          </div>
        </section>
      </div>

      {/* INTERACTIVE GAME LAUNCH MODAL */}
      {activeGameModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setActiveGameModal(null);
            setIsTheaterMode(false);
          }}
        >
          <div
            className={`game-modal-content demo-modal-dialog ${isTheaterMode ? 'theater' : ''} ${activeGameModal?.id === 'ludo-dash' ? 'ludo-compact' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Full width flex div on mobile & desktop */}
            <div className="modal-header">
              <div className="modal-title-left">
                <img
                  src={activeGameModal.logoUrl}
                  alt={activeGameModal.title}
                  className="modal-game-icon"
                />
                <div className="modal-title-text-group">
                  <h3 className="modal-game-title">
                    {activeGameModal.title}
                  </h3>
                  <span className="modal-meta-tagline">
                    {activeGameModal.categoryLabel} • Gamezop HTML5 Engine
                  </span>
                </div>
              </div>

              <div className="modal-header-actions">
                {/* Mobile-only action buttons (on desktop, these are in the toolbar below) */}
                <button
                  onClick={() => {
                    setIsIframeLoading(true);
                    setIframeKey((prev) => prev + 1);
                  }}
                  className="modal-ctrl-btn restart-btn mobile-only-btn"
                  title="Restart Game"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  onClick={() => setIsForceLandscape((prev) => !prev)}
                  className={`modal-ctrl-btn rotate-orient-btn mobile-only-btn ${isForceLandscape ? 'active' : ''}`}
                  title={isForceLandscape ? 'Normal Portrait Mode' : 'Rotate to Full Landscape Mode'}
                >
                  <RotateCw size={14} style={{ transform: isForceLandscape ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s', color: isForceLandscape ? '#00E676' : 'inherit' }} />
                </button>
                <a
                  href={getGamePlayPath(activeGameModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-ctrl-btn popout-btn mobile-only-btn"
                  title="Open in Dedicated Tab"
                >
                  <ExternalLink size={14} />
                </a>

                {/* Visible on both Desktop and Mobile */}
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="modal-ctrl-btn expand-btn"
                  title="Full Screen in Website"
                >
                  <Maximize size={15} />
                </button>
                <div className="modal-balance-pill">
                  <Wallet size={13} color="#00E676" />
                  <span>{user?.usdtBalance || '0.00'} USDT</span>
                </div>
                <button
                  onClick={() => {
                    setActiveGameModal(null);
                    setIsFullScreen(false);
                  }}
                  className="modal-close-btn"
                  title="Close & Back to Main Page"
                  aria-label="Close Game"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DEMO NAVIGATION TABS (Play Game [LIVE] | Video Trailer | Screenshots | Rules & Specs) */}
            <div className="demo-tabs-nav">
              <button
                onClick={() => setModalTab('play')}
                className={`demo-tab-btn ${modalTab === 'play' ? 'active' : ''}`}
              >
                <PlaySquare size={16} />
                <span>Play Game</span>
                <span className="live-pill-mini">LIVE</span>
              </button>
              <button
                onClick={() => setModalTab('screenshots')}
                className={`demo-tab-btn ${modalTab === 'screenshots' ? 'active' : ''}`}
              >
                <ImageIcon size={16} />
                <span>Screenshots ({activeGameModal.screenshots?.length || 4})</span>
              </button>
              <button
                onClick={() => setModalTab('rules')}
                className={`demo-tab-btn ${modalTab === 'rules' ? 'active' : ''}`}
              >
                <Info size={16} />
                <span>Rules & Specs</span>
              </button>
            </div>

            {/* Modal Body Based on Active Tab */}
            <div className="modal-game-arena">
              {/* TAB 1: EMBEDDED GAMEZOP HTML5 GAME */}
              {modalTab === 'play' && (
                <div className="gz-embed-arena">
                  {/* Top Game Action Bar */}
                  <div className="gz-embed-topbar">
                    <div className="gz-embed-title-left">
                      <span className="gz-live-dot" />
                      <span className="gz-embed-gamename">{activeGameModal.title}</span>
                      <span className="gz-sandbox-badge">HTML5 CDN</span>
                    </div>
                    <div className="gz-embed-actions">
                      <button
                        onClick={() => {
                          setIsIframeLoading(true);
                          setIframeKey((prev) => prev + 1);
                        }}
                        className="gz-action-btn"
                        title="Restart Game"
                      >
                        <RotateCw size={13} />
                        <span>Restart</span>
                      </button>
                      <button
                        onClick={() => setIsFullScreen(true)}
                        className="gz-action-btn fullscreen"
                        title="Expand on Website"
                      >
                        <Maximize size={13} />
                        <span>Expand</span>
                      </button>
                      <a
                        href={getGamePlayPath(activeGameModal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gz-action-btn popout"
                        title="Open in Dedicated Tab"
                      >
                        <ExternalLink size={13} />
                        <span>Popout</span>
                      </a>
                      <div className="modal-balance-pill gz-balance-mobile-inline">
                        <Wallet size={12} color="#00E676" />
                        <span>{user?.usdtBalance || '0.00'} USDT</span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveGameModal(null);
                          setIsFullScreen(false);
                        }}
                        className="gz-action-btn close-btn"
                        title="Close Game & Back to Main Page"
                        aria-label="Back to Main Page"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Game stuck notice - every game, after 3 sec */}
                  {showGameAlert && (
                    <div className="gz-game-alert-banner">
                      <div className="gz-alert-left">
                        <AlertTriangle size={16} color="#FFB300" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>{activeGameModal.title} Notice:</strong> If the game is stuck here, click on Open in New Tab:
                        </span>
                      </div>
                      <a
                        href={getGamePlayPath(activeGameModal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gz-alert-launch-btn"
                        title="Open game in new tab"
                      >
                        <ExternalLink size={13} />
                        <span>Open in New Tab</span>
                      </a>
                    </div>
                  )}

                  {/* Responsive Game Iframe Frame */}
                  <div className={`gz-iframe-frame ${isForceLandscape ? 'is-force-landscape' : ''}`}>
                    {isForceLandscape && (
                      <button
                        onClick={() => setIsForceLandscape(false)}
                        className="gz-rotate-exit-btn"
                        title="Exit Landscape Rotation"
                      >
                        <X size={15} />
                        <span>Exit Rotation</span>
                      </button>
                    )}
                    {isIframeLoading && (
                      <div className="gz-iframe-loader">
                        <div className="gz-spinner" />
                        <h4>Loading {activeGameModal.title}...</h4>
                      </div>
                    )}
                    <iframe
                      key={iframeKey}
                      src={activeGameModal.embedUrl || `https://gamescdn.gamezop.com/_game-files/${activeGameModal.gzCode}/index.html`}
                      title={activeGameModal.title}
                      className="gz-game-iframe"
                      allow="autoplay; fullscreen; screen-wake-lock; orientation-lock; accelerometer; gyroscope; magnetometer;"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-modals allow-orientation-lock"
                      onLoad={() => {
                        setIsIframeLoading(false);
                        console.log('[GameIframe] Modal iframe loaded:', activeGameModal.embedUrl);
                      }}
                    />
                  </div>

                  {/* Bottom Controls & Gameplay Hints */}
                  <div className="gz-embed-footer">
                    <div className="gz-hint">
                      🎮 <strong>Controls:</strong> Mouse click/drag or touch to aim, slice, tap, and play.
                    </div>
                    <div className="gz-specs-summary">
                      <span>RTP: <strong>{activeGameModal.rtp}</strong></span>
                      <span>Max Win: <strong>{activeGameModal.maxWin}</strong></span>
                      <span>Online: <strong>{activeGameModal.players}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SCREENSHOTS GALLERY */}
              {modalTab === 'screenshots' && (
                <div className="demo-screenshots-container">
                  <div className="screenshot-main-viewer">
                    <img
                      src={
                        activeGameModal.screenshots?.[activeScreenshotIndex]?.url ||
                        activeGameModal.coverUrl ||
                        `https://static.gamezop.com/${activeGameModal.gzCode}/wall.png`
                      }
                      alt={activeGameModal.screenshots?.[activeScreenshotIndex]?.title || activeGameModal.title}
                      className="screenshot-main-img"
                      onError={(e) => {
                        e.currentTarget.src = `https://static.gamezop.com/${activeGameModal.gzCode}/wall.png`;
                      }}
                    />

                    {/* Nav Prev / Next buttons */}
                    {activeGameModal.screenshots?.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setActiveScreenshotIndex((prev) =>
                              prev > 0 ? prev - 1 : activeGameModal.screenshots.length - 1
                            )
                          }
                          className="screenshot-nav-btn prev"
                          title="Previous Screenshot"
                          aria-label="Previous Screenshot"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() =>
                            setActiveScreenshotIndex((prev) =>
                              prev < activeGameModal.screenshots.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="screenshot-nav-btn next"
                          title="Next Screenshot"
                          aria-label="Next Screenshot"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}

                    <div className="screenshot-caption-tag">
                      <span style={{ fontWeight: 600 }}>
                        {activeGameModal.screenshots?.[activeScreenshotIndex]?.title || 'Gameplay Showcase'}
                      </span>
                      <span style={{ opacity: 0.6, marginLeft: '8px', fontSize: '0.75rem' }}>
                        ({(activeScreenshotIndex || 0) + 1} of {activeGameModal.screenshots?.length || 1})
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  <div className="screenshots-strip">
                    {activeGameModal.screenshots?.map((shot, idx) => (
                      <div
                        key={idx}
                        className={`screenshot-thumb-item ${activeScreenshotIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveScreenshotIndex(idx)}
                        title={shot.title}
                      >
                        <img
                          src={shot.url}
                          alt={shot.title}
                          className="screenshot-thumb-img"
                          onError={(e) => {
                            e.currentTarget.src = `https://static.gamezop.com/${activeGameModal.gzCode}/square.png`;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: GAME-SPECIFIC RULES & SPECS */}
              {modalTab === 'rules' && (() => {
                const currentRules = GAME_RULES[activeGameModal.id] || {
                  genre: activeGameModal.categoryLabel || 'Arcade Game',
                  objective: activeGameModal.description,
                  controls: 'Mouse click/drag or screen touch to play.',
                  rules: [
                    { title: 'Game Mechanics', desc: activeGameModal.description },
                    { title: 'Multiplier Progression', desc: `Earn up to ${activeGameModal.maxWin} maximum win payout on consecutive streaks.` },
                    { title: 'RTP & Fairness', desc: `Cryptographically verified return-to-player rating of ${activeGameModal.rtp}.` },
                  ],
                  scoring: [
                    { label: 'Base Payout', value: '1.0x - 2.0x' },
                    { label: 'Max Multiplier', value: activeGameModal.maxWin },
                    { label: 'Provable RTP', value: activeGameModal.rtp },
                  ],
                  proTips: [
                    'Focus on steady rhythm and timing to build consecutive multiplier streaks.',
                    'Review the game specs and payout table before placing high roller bets.',
                  ],
                };

                return (
                  <div className="game-rules-container">
                    {/* Hero Objective & Controls Card */}
                    <div className="rules-hero-card">
                      <span className="rules-genre-pill">{currentRules.genre}</span>
                      <h4 style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px 0' }}>
                        {activeGameModal.title} - How to Play & Rules
                      </h4>
                      <p className="rules-objective-text">
                        🎯 <strong>Objective:</strong> {currentRules.objective}
                      </p>
                      <div className="rules-controls-box">
                        <Target size={16} color="#00E676" style={{ flexShrink: 0 }} />
                        <span><strong>Controls:</strong> {currentRules.controls}</span>
                      </div>
                    </div>

                    {/* Step-by-Step Rules Grid */}
                    <div>
                      <h4 className="rules-section-heading">
                        <BookOpen size={18} color="#00E676" />
                        <span>Core Game Mechanics & Rules</span>
                      </h4>
                      <div className="rules-steps-grid">
                        {currentRules.rules.map((r, i) => (
                          <div key={i} className="rule-step-card">
                            <div className="rule-step-num">{i + 1}</div>
                            <div className="rule-step-title">{r.title}</div>
                            <div className="rule-step-desc">{r.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scoring & Multipliers Breakdown */}
                    <div>
                      <h4 className="rules-section-heading">
                        <Coins size={18} color="#00E676" />
                        <span>Scoring & Payout Multipliers</span>
                      </h4>
                      <div className="scoring-grid">
                        {currentRules.scoring.map((s, i) => (
                          <div key={i} className="scoring-item">
                            <span className="scoring-label">{s.label}</span>
                            <span className="scoring-val">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pro Tips Card */}
                    <div className="pro-tips-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00E676', fontWeight: 800, fontSize: '0.92rem' }}>
                        <Lightbulb size={18} />
                        <span>Grandmaster Winning Tips</span>
                      </div>
                      <div className="pro-tips-list">
                        {currentRules.proTips.map((tip, i) => (
                          <div key={i} className="pro-tip-item">
                            <span style={{ color: '#00E676', fontWeight: 800 }}>⚡</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Provable Fairness & Technical Specs */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '10px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ background: '#0D0F0E', border: '1px solid #1F2421', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#A3A3A3', fontSize: '0.72rem' }}>ENGINE CODE</div>
                        <div style={{ color: '#00E676', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
                          {activeGameModal.gzCode}
                        </div>
                      </div>
                      <div style={{ background: '#0D0F0E', border: '1px solid #1F2421', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#A3A3A3', fontSize: '0.72rem' }}>PROVABLE RTP</div>
                        <div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
                          {activeGameModal.rtp}
                        </div>
                      </div>
                      <div style={{ background: '#0D0F0E', border: '1px solid #1F2421', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#A3A3A3', fontSize: '0.72rem' }}>MAX MULTIPLIER</div>
                        <div style={{ color: '#39FF88', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
                          {activeGameModal.maxWin}
                        </div>
                      </div>
                      <div style={{ background: '#0D0F0E', border: '1px solid #1F2421', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#A3A3A3', fontSize: '0.72rem' }}>SEED PROOF</div>
                        <div style={{ color: '#00E676', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> SHA-256 Validated
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* WEBSITE FULL SCREEN GAME OVERLAY */}
      {activeGameModal && isFullScreen && (
        <div className={`website-fullscreen-overlay ${showGameAlert ? 'has-alert' : ''}`}>
          {/* Top Floating Glass HUD Bar */}
          <div className="fullscreen-hud-bar">
            <div className="fullscreen-hud-left">
              <img
                src={activeGameModal.logoUrl}
                alt={activeGameModal.title}
                className="fullscreen-game-icon"
              />
              <div>
                <h3 className="fullscreen-game-title">{activeGameModal.title}</h3>
                <span className="fullscreen-game-meta">
                  <span className="gz-live-dot" /> Full Screen Mode • Gamezop HTML5 CDN
                </span>
              </div>
            </div>

            <div className="fullscreen-hud-right">
              <button
                onClick={() => {
                  setIsIframeLoading(true);
                  setIframeKey((prev) => prev + 1);
                }}
                className="fullscreen-hud-btn"
                title="Restart Game"
              >
                <RotateCw size={14} />
                <span>Restart</span>
              </button>

              <a
                href={getGamePlayPath(activeGameModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="fullscreen-hud-btn highlight-newtab"
                title="Open Game Directly in Dedicated Tab"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>


              {/* Close Button in HUD */}
              <button
                onClick={() => setIsFullScreen(false)}
                className="fullscreen-close-btn"
                title="Close Full Screen (ESC)"
              >
                <X size={18} />
                <span className="btn-label-desktop">Exit Full Screen</span>
              </button>
            </div>
          </div>

          {/* Full Screen stuck notice - every game, after 3 sec */}
          {showGameAlert && (
            <div className="fullscreen-alert-bar">
              <div className="fullscreen-alert-left">
                <AlertTriangle size={16} color="#FFB300" style={{ flexShrink: 0 }} />
                <span>
                  <strong>{activeGameModal.title} Notice:</strong> If the game is stuck here, click on Open in New Tab:
                </span>
              </div>
              <a
                href={getGamePlayPath(activeGameModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="fullscreen-alert-redirect-btn"
                title="Open Game in New Tab"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>
            </div>
          )}

          {/* Full Screen Iframe Wrapper */}
          <div className="fullscreen-iframe-wrapper">
            {isIframeLoading && (
              <div className="gz-iframe-loader fullscreen-loader">
                <div className="gz-spinner" />
                <h4>Loading {activeGameModal.title} in Full Screen...</h4>
                <p>Connecting to Gamezop CDN HTML5 engine</p>
                <a
                  href={getGamePlayPath(activeGameModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gz-loader-newtab-btn"
                >
                  <ExternalLink size={13} />
                  <span>Stuck on Gamezop? Open in New Tab</span>
                </a>
              </div>
            )}
            <iframe
              key={`fs-${iframeKey}`}
              src={activeGameModal.embedUrl || `https://gamescdn.gamezop.com/_game-files/${activeGameModal.gzCode}/index.html`}
              title={`${activeGameModal.title} Full Screen`}
              className="fullscreen-game-iframe"
              allow="autoplay; fullscreen; screen-wake-lock; orientation-lock;"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
              onLoad={() => {
                setIsIframeLoading(false);
                console.log('[GameIframe] Fullscreen iframe loaded:', activeGameModal.embedUrl);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
