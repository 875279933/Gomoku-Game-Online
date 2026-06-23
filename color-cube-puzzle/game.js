(function () {
  'use strict';

  var COLORS = ['red', 'blue', 'green', 'yellow'];
  var LETTERS = { red: 'R', blue: 'B', green: 'G', yellow: 'Y' };
  // par = minimum possible moves; laneCap forces colour spread;
  // locks = cubes gated behind key cubes of the same colour (each lock needs 2 keys);
  // bombs = timed cubes that detonate if not cleared in time.
  // Every level is provably winnable:
  //   - locked colours get at least 3 cubes (1 lock + 2 keys)
  //   - unlocked colours get at least 1 cube
  //   - per-colour count stays within laneCap so every cube fits.
  var LEVELS = [
    { cubes: 4,  palette: 2, laneCap: 3, locks: 0, bombs: 0, par: 4,  fuse: 0 },
    { cubes: 6,  palette: 2, laneCap: 3, locks: 0, bombs: 0, par: 6,  fuse: 0 },
    { cubes: 8,  palette: 3, laneCap: 3, locks: 1, bombs: 0, par: 8,  fuse: 0 },
    { cubes: 9,  palette: 3, laneCap: 3, locks: 2, bombs: 0, par: 9,  fuse: 0 },
    { cubes: 9,  palette: 4, laneCap: 3, locks: 2, bombs: 1, par: 9,  fuse: 7 },
    { cubes: 9,  palette: 3, laneCap: 3, locks: 3, bombs: 1, par: 9,  fuse: 7 },
    { cubes: 12, palette: 4, laneCap: 3, locks: 3, bombs: 2, par: 12, fuse: 8 },
    { cubes: 12, palette: 4, laneCap: 3, locks: 4, bombs: 2, par: 12, fuse: 8 }
  ];
  var TOTAL = LEVELS.length;

  var level = 0;
  var moves = 0;
  var bestMoves = [];
  var selected = null;
  var locked = false;
  var board = [];
  var lanes = { red: 0, blue: 0, green: 0, yellow: 0 };
  var laneCap = 3;
  var fuse = 0;
  var gameOver = false;
  var pendingTimeout = null;

  function $(id) { return document.getElementById(id); }

  var $board, $conveyors, $level, $total, $moves, $par, $win, $reset, $next, $prompt, $fuse, $fuseBox;

  function bind() {
    $board     = $('board');
    $conveyors = $('conveyors');
    $level     = $('level');
    $total     = $('total');
    $moves     = $('moves');
    $par       = $('par');
    $win       = $('win');
    $reset     = $('reset');
    $next      = $('next');
    $prompt    = $('prompt');
    $fuse      = $('fuse');
    $fuseBox   = $('fuse-box');
    if (!$board || !$conveyors) {
      console.error('Color Cube Puzzle: required DOM not found');
      return false;
    }
    $total.textContent = TOTAL;
    loadBest();

    $board.addEventListener('click', onBoardClick);
    $conveyors.addEventListener('click', onConveyorsClick);

    $reset.addEventListener('click', function () { buildLevel(); });
    $next.addEventListener('click', function () {
      if (board.length !== 0) return;
      level = (level + 1) % TOTAL;
      buildLevel();
    });
    return true;
  }

  function loadBest() {
    try {
      var raw = localStorage.getItem('ccp_best');
      bestMoves = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(bestMoves)) bestMoves = [];
    } catch (e) { bestMoves = []; }
  }
  function saveBest() {
    try { localStorage.setItem('ccp_best', JSON.stringify(bestMoves)); } catch (e) {}
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pickLockColors(palette, count) {
    var available = palette.slice();
    var out = [];
    for (var i = 0; i < count && available.length > 0; i++) {
      var idx = Math.floor(Math.random() * available.length);
      out.push(available[idx]);
      available.splice(idx, 1);
    }
    return out;
  }

  function buildLevel() {
    if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
    var cfg = LEVELS[level];
    var palette = COLORS.slice(0, cfg.palette);
    laneCap = cfg.laneCap;
    var par = cfg.par;
    fuse = cfg.fuse || 0;

    // Pre-allocate a per-colour count with safety minimums so every lock has
    // two keys to crack: locked colours get 3 cubes (1 lock + 2 keys),
    // unlocked colours get 1. Remaining cubes are spread to fill the board
    // without pushing any colour past laneCap.
    var lockColors = pickLockColors(palette, cfg.locks);
    var lockedSet = {};
    for (var lci = 0; lci < lockColors.length; lci++) lockedSet[lockColors[lci]] = true;

    var counts = [];
    for (var k = 0; k < cfg.palette; k++) counts.push(0);
    for (var ci = 0; ci < cfg.palette; ci++) {
      counts[ci] = lockedSet[palette[ci]] ? 3 : 1;
    }
    var minTotal = 0;
    for (var mt = 0; mt < cfg.palette; mt++) minTotal += counts[mt];
    var remaining = cfg.cubes - minTotal;
    if (remaining < 0) remaining = 0;

    var order = [];
    for (var oi = 0; oi < cfg.palette; oi++) order.push(oi);
    order = shuffle(order);
    var safety = 0;
    while (remaining > 0 && safety < 1000) {
      var ci2 = order[safety % cfg.palette];
      if (counts[ci2] < cfg.laneCap) { counts[ci2]++; remaining--; }
      safety++;
    }

    // Build cells using the pre-allocated counts.
    var cells = [];
    for (var cbi = 0; cbi < cfg.palette; cbi++) {
      for (var cbj = 0; cbj < counts[cbi]; cbj++) {
        cells.push({ id: cells.length, color: palette[cbi] });
      }
    }

    // Mark locks: ONE cube per locked colour, the rest are keys.
    for (var li = 0; li < lockColors.length; li++) {
      var lColor = lockColors[li];
      var pool = [];
      for (var pi = 0; pi < cells.length; pi++) {
        if (cells[pi].color === lColor && !cells[pi].lockKey) pool.push(cells[pi]);
      }
      if (pool.length > 0) {
        var pickIdx = Math.floor(Math.random() * pool.length);
        pool[pickIdx].lockKey = { color: lColor, need: 2, sent: 0 };
      }
    }

    // Stamp bombs onto random cubes (locked cubes can also be bombs, two challenges at once).
    var bombCount = cfg.bombs || 0;
    if (bombCount > 0) {
      var pool2 = cells.slice();
      for (var bi = 0; bi < bombCount && pool2.length > 0; bi++) {
        var bidx = Math.floor(Math.random() * pool2.length);
        pool2[bidx].bomb = true;
        pool2.splice(bidx, 1);
      }
    }

    board = shuffle(cells);
    lanes = { red: 0, blue: 0, green: 0, yellow: 0 };
    moves = 0;
    selected = null;
    locked = false;
    gameOver = false;
    $win.classList.remove('show', 'boom', 'win');
    setPrompt('Step 1 · Tap a cube to start', false);
    updateHud(par);
    render();
  }

  function setPrompt(text, dim) {
    $prompt.textContent = text;
    if (dim) $prompt.classList.add('dim');
    else $prompt.classList.remove('dim');
  }

  function updateHud(par) {
    $level.textContent = level + 1;
    $moves.textContent = moves;
    if (par !== undefined && $par) $par.textContent = par;
    if ($fuseBox) {
      if (fuse > 0) {
        $fuseBox.style.display = '';
        $fuse.textContent = fuse;
        $fuseBox.classList.toggle('low', fuse <= 3);
        $fuseBox.classList.toggle('crit', fuse <= 1);
      } else {
        $fuseBox.style.display = 'none';
      }
    }
  }

  function lockProgress(cell) {
    if (!cell.lockKey) return null;
    return { need: cell.lockKey.need, sent: cell.lockKey.sent };
  }

  function isUnlocked(cell) {
    if (!cell.lockKey) return true;
    return cell.lockKey.sent >= cell.lockKey.need;
  }

  function render() {
    $board.innerHTML = '';
    for (var i = 0; i < board.length; i++) {
      var c = board[i];
      if (!c) continue;
      var cell = document.createElement('div');
      var unlocked = isUnlocked(c);
      var classes = 'cell';
      if (selected === c.id) classes += ' selected';
      if (!unlocked) classes += ' locked-cube';
      if (c.bomb) classes += ' bomb';
      cell.className = classes;
      cell.setAttribute('data-id', String(c.id));
      cell.setAttribute('data-color', c.color);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      var prog = lockProgress(c);
      var ariaExtra = '';
      if (prog) ariaExtra = ', lock ' + (prog.need - prog.sent) + ' more ' + c.color;
      if (c.bomb) ariaExtra += ', bomb — clear before fuse runs out';
      cell.setAttribute('aria-label', c.color + ' cube, send to ' + c.color + ' lane' + ariaExtra);
      var lockHtml = '';
      if (prog) {
        var remaining = prog.need - prog.sent;
        var pct = Math.min(100, prog.sent / prog.need * 100);
        lockHtml = '<div class="lock-overlay">' +
          '<div class="lock-icon" aria-hidden="true">&#128274;</div>' +
          '<div class="lock-progress"><span style="width:' + pct + '%"></span></div>' +
          '<div class="lock-count">x' + remaining + '</div>' +
        '</div>';
      }
      var bombHtml = '';
      if (c.bomb) {
        bombHtml = '<div class="bomb-overlay" aria-hidden="true">' +
          '<div class="bomb-ico">&#128163;</div>' +
        '</div>';
      }
      cell.innerHTML = '<div class="cube ' + c.color + '" data-letter="' + LETTERS[c.color] + '"></div>' + bombHtml + lockHtml;
      $board.appendChild(cell);
    }

    $conveyors.innerHTML = '';
    var selCube = null;
    if (selected !== null) {
      for (var s = 0; s < board.length; s++) {
        if (board[s] && board[s].id === selected) { selCube = board[s]; break; }
      }
    }
    for (var j = 0; j < COLORS.length; j++) {
      var color = COLORS[j];
      var lane = document.createElement('div');
      var full = lanes[color] >= laneCap;
      var isLocked = selCube === null || selCube.color !== color || !isUnlocked(selCube) || full;
      lane.className = 'lane ' + color + (isLocked ? ' locked' : '') + (full ? ' full' : '');
      lane.setAttribute('data-color', color);
      lane.setAttribute('role', 'button');
      lane.setAttribute('tabindex', '0');
      var fullTxt = full ? ', full' : '';
      lane.setAttribute('aria-label', color + ' lane, ' + lanes[color] + ' of ' + laneCap + fullTxt);
      var cap = laneCap;
      var segs = '';
      for (var s2 = 0; s2 < cap; s2++) {
        segs += '<span class="cap-seg' + (s2 < lanes[color] ? ' on' : '') + '"></span>';
      }
      lane.innerHTML = '<div class="lane-dot"></div><div class="lane-name">' + color + '</div>' +
        '<div class="cap">' + segs + '</div>' +
        '<div class="lane-fill"><span style="width:' + Math.min(100, lanes[color] / cap * 100) + '%"></span></div>';
      $conveyors.appendChild(lane);
    }
  }

  function onBoardClick(e) {
    if (locked) return;
    var cell = e.target.closest && e.target.closest('.cell');
    if (!cell || !$board.contains(cell)) return;
    var id = parseInt(cell.getAttribute('data-id'), 10);
    if (isNaN(id)) return;
    var cube = findCube(id);
    if (!cube) return;
    if (!isUnlocked(cube)) {
      var p = lockProgress(cube);
      setPrompt('Locked · Send x' + (p.need - p.sent) + ' more ' + cube.color + ' cubes to unlock', true);
      flashCell(cell, 'wrong');
      return;
    }
    selected = id;
    setPrompt('Step 2 · Tap the ' + cube.color + ' lane', false);
    render();
  }

  function onConveyorsClick(e) {
    if (locked) return;
    var lane = e.target.closest && e.target.closest('.lane');
    if (!lane || !$conveyors.contains(lane)) return;
    if (lane.classList.contains('locked')) return;
    var color = lane.getAttribute('data-color');
    sendTo(color);
  }

  function findCube(id) {
    for (var i = 0; i < board.length; i++) {
      if (board[i] && board[i].id === id) return board[i];
    }
    return null;
  }
  function findCell(id) {
    return $board.querySelector('.cell[data-id="' + id + '"]');
  }
  function flashCell(cell, cls) {
    if (!cell) return;
    cell.classList.add(cls);
    setTimeout(function () { cell.classList.remove(cls); }, 360);
  }

  function sendTo(color) {
    if (selected === null || locked || gameOver) return;
    var cube = findCube(selected);
    if (!cube) { selected = null; render(); return; }
    if (!isUnlocked(cube)) {
      selected = null;
      setPrompt('That cube is locked. Try another.', true);
      render();
      return;
    }
    if (lanes[color] >= laneCap) {
      var fcell = findCell(cube.id);
      flashCell(fcell, 'wrong');
      setPrompt('That lane is full. Try another.', true);
      return;
    }
    moves++;
    var par = LEVELS[level].par;
    updateHud(par);

    if (cube.color === color) {
      locked = true;
      var cell = findCell(cube.id);
      if (cell) cell.classList.add('gone');
      var flashLane = $conveyors.querySelector('.lane.' + color);
      if (flashLane) flashLane.classList.add('flash');

      pendingTimeout = setTimeout(function () {
        pendingTimeout = null;
        board = board.filter(function (c) { return c.id !== selected; });
        lanes[color]++;

        // Every locked cube of the cleared colour receives one key.
        var sameColor = color;
        for (var k = 0; k < board.length; k++) {
          var sk = board[k];
          if (sk && sk.lockKey && sk.color === sameColor && sk.lockKey.sent < sk.lockKey.need) {
            sk.lockKey.sent++;
          }
        }

        selected = null;
        locked = false;
        if (board.length === 0) {
          var stars = computeStars(moves, par);
          var prev = bestMoves[level];
          if (prev === undefined || moves < prev) {
            bestMoves[level] = moves;
            saveBest();
          }
          var starIcons = ['', '&#9733;', '&#9733;&#9733;', '&#9733;&#9733;&#9733;'][stars];
          $win.innerHTML = '<div class="stars">' + starIcons + '</div>' +
            '<div class="win-text">Level ' + (level + 1) + ' cleared · ' + moves + ' moves (par ' + par + ')</div>';
          $win.classList.add('show', 'win');
          $win.classList.remove('boom');
          setPrompt('Tap Next Level to continue', true);
        } else {
          setPrompt('Step 1 · Tap a cube', false);
        }
        updateHud(par);
        render();
      }, 280);
    } else {
      // Wrong lane: tick the bomb fuse. A wrong move costs time.
      if (fuse > 0) {
        fuse--;
        updateHud(par);
        if (fuse <= 0) { triggerGameOver(); return; }
      }
      var wcell = findCell(cube.id);
      flashCell(wcell, 'wrong');
      selected = null;
      setPrompt('Wrong color. Pick a matching lane.', true);
      render();
    }
  }

  function triggerGameOver() {
    gameOver = true;
    locked = true;
    selected = null;
    var boardCells = $board.querySelectorAll('.cell');
    for (var i = 0; i < boardCells.length; i++) boardCells[i].classList.add('wrong');
    $win.innerHTML =
      '<div class="boom-title">BOOM!</div>' +
      '<div class="boom-sub">A bomb ran out of fuse. Hit Reset Level to try again.</div>';
    $win.classList.add('show', 'boom');
    $win.classList.remove('win');
    setPrompt('Game over · tap Reset Level', true);
    updateHud(LEVELS[level].par);
  }

  function computeStars(m, par) {
    if (m <= par) return 3;
    if (m <= par + 2) return 2;
    return 1;
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (bind()) buildLevel();
  });
})();
