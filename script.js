// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // ---------- Configuration ----------
    const BOARD_SIZE = 15;
    let board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    let currentTurn = 'player';   // 'player' or 'ai'
    let gameActive = true;
    let winner = null;
    let currentDifficulty = 'medium';
    let history = [];
    let playerScore = 0, aiScore = 0;

    // DOM elements
    const canvas = document.getElementById('gomokuCanvas');
    const ctx = canvas.getContext('2d');
    const tipTextSpan = document.getElementById('tipText');
    const resetBtn = document.getElementById('resetBtn');
    const undoBtn = document.getElementById('undoBtn');
    const resetScoreBtn = document.getElementById('resetScoreBtn');
    const playerScoreSpan = document.getElementById('playerScore');
    const aiScoreSpan = document.getElementById('aiScore');
    
    // Geometry parameters (no coordinate axes, keep margin for board drawing)
    let cellSize = canvas.width / (BOARD_SIZE + 1);
    let margin = cellSize;
    
    // AI control flags
    let aiThinking = false;
    let pendingAITimer = null;

    function updateScoreUI() { playerScoreSpan.textContent = playerScore; aiScoreSpan.textContent = aiScore; }
    function resetScores() { playerScore = 0; aiScore = 0; updateScoreUI(); }

    // Redraw board + all stones (no coordinate numbers)
    function drawBoardAndPieces() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e1c78c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#5a3e28';
        ctx.lineWidth = 1.5;
        // Draw grid lines
        for (let i = 0; i < BOARD_SIZE; i++) {
            const startX = margin;
            const startY = margin + i * cellSize;
            const endX = canvas.width - margin;
            const endY = margin + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, startY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(margin + i * cellSize, margin);
            ctx.lineTo(margin + i * cellSize, canvas.height - margin);
            ctx.stroke();
        }
        
        // Star points (center and corners)
        const starPositions = [[3,3], [11,3], [3,11], [11,11], [7,7]];
        for (let [x, y] of starPositions) {
            ctx.fillStyle = '#c49a6c';
            ctx.beginPath();
            ctx.arc(margin + x * cellSize, margin + y * cellSize, cellSize * 0.1, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Draw stones
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const val = board[y][x];
                if (val === null) continue;
                const cx = margin + x * cellSize;
                const cy = margin + y * cellSize;
                const radius = cellSize * 0.4;
                const grad = ctx.createRadialGradient(cx-3, cy-3, radius*0.2, cx, cy, radius);
                if (val === 'player') {
                    grad.addColorStop(0, '#2b2b28');
                    grad.addColorStop(1, '#121212');
                    ctx.fillStyle = grad;
                } else {
                    grad.addColorStop(0, '#fefef7');
                    grad.addColorStop(1, '#e9e2cf');
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#bcac86';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    
    // Initialize geometry
    function initGeometry() {
        cellSize = canvas.width / (BOARD_SIZE + 1);
        margin = cellSize;
    }
    
    // Click handler (core coordinate conversion)
    function handleCanvasClick(e) {
        if (!gameActive || currentTurn !== 'player') return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let mouseX = (e.clientX - rect.left) * scaleX;
        let mouseY = (e.clientY - rect.top) * scaleY;
        
        let minDist = cellSize * 0.4;
        let targetX = -1, targetY = -1;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                const cx = margin + i * cellSize;
                const cy = margin + j * cellSize;
                const dx = mouseX - cx;
                const dy = mouseY - cy;
                const dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    minDist = dist;
                    targetX = i;
                    targetY = j;
                }
            }
        }
        if (targetX !== -1 && targetY !== -1 && board[targetY][targetX] === null) {
            playerMove(targetX, targetY);
        }
    }
    
    function redrawGame() {
        drawBoardAndPieces();
    }
    
    // Sound effect
    let audioCtx = null;
    function playStoneSound() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.frequency.value = 920; gain.gain.value = 0.18;
            osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch(e) {}
    }
    document.body.addEventListener('click', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });
    
    // ---------- Scoring and win/loss logic (enhanced) ----------
    const PATTERNS = { FIVE: 1e7, LIVE_FOUR: 5e5, SLEEP_FOUR: 5e4, LIVE_THREE: 8000, SLEEP_THREE: 900, LIVE_TWO: 200, SLEEP_TWO: 40 };
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    
    function getDirScore(x, y, dx, dy, col) {
        let cnt = 1, openRight = false, openLeft = false;
        for (let s = 1; s <= 5; s++) {
            let nx = x + dx * s, ny = y + dy * s;
            if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
            if (board[ny][nx] === col) cnt++;
            else { if (board[ny][nx] === null) openRight = (s === 1 || (s > 1 && board[ny-dy][nx-dx] === col)); break; }
        }
        for (let s = 1; s <= 5; s++) {
            let nx = x - dx * s, ny = y - dy * s;
            if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
            if (board[ny][nx] === col) cnt++;
            else { if (board[ny][nx] === null) openLeft = (s === 1 || (s > 1 && board[ny+dy][nx+dx] === col)); break; }
        }
        let open = openLeft || openRight;
        if (cnt >= 5) return PATTERNS.FIVE;
        if (cnt === 4) return open ? PATTERNS.LIVE_FOUR : PATTERNS.SLEEP_FOUR;
        if (cnt === 3) return open ? PATTERNS.LIVE_THREE : PATTERNS.SLEEP_THREE;
        if (cnt === 2) return open ? PATTERNS.LIVE_TWO : PATTERNS.SLEEP_TWO;
        return 0;
    }
    
    function evalPositionScore(x, y, col) {
        board[y][x] = col;
        let total = 0;
        for (let [dx, dy] of dirs) total += getDirScore(x, y, dx, dy, col);
        board[y][x] = null;
        return total;
    }
    
    function evalFullBoard(col) {
        let total = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] === col) {
                    for (let [dx, dy] of dirs) total += getDirScore(j, i, dx, dy, col);
                }
            }
        }
        return total;
    }
    
    function checkWin(x, y, pl) {
        if (board[y][x] !== pl) return false;
        for (let [dx, dy] of dirs) {
            let cnt = 1;
            for (let s = 1; s <= 5; s++) {
                let nx = x + dx * s, ny = y + dy * s;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === pl) cnt++;
                else break;
            }
            for (let s = 1; s <= 5; s++) {
                let nx = x - dx * s, ny = y - dy * s;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === pl) cnt++;
                else break;
            }
            if (cnt >= 5) return true;
        }
        return false;
    }
    
    function isDraw() {
        for (let i = 0; i < BOARD_SIZE; i++) 
            for (let j = 0; j < BOARD_SIZE; j++) 
                if (board[i][j] === null) return false;
        return true;
    }
    
    function updateStatus() {
        if (!gameActive) {
            if (winner === 'player') tipTextSpan.innerText = '?? You win! Great match ??';
            else if (winner === 'ai') tipTextSpan.innerText = '?? AI wins ¡ª try again ??';
            else if (winner === 'draw') tipTextSpan.innerText = '?? Draw! Well played ??';
            else tipTextSpan.innerText = currentTurn === 'player' ? '? Your turn' : '? AI thinking';
            return;
        }
        tipTextSpan.innerText = currentTurn === 'player' ? '? Your turn (Black)' : '? AI is thinking ...';
    }
    
    function endGame(type, winSide = null) {
        if (!gameActive) return;
        gameActive = false;
        if (type === 'win') {
            winner = winSide;
            if (winner === 'player') { playerScore++; }
            else if (winner === 'ai') { aiScore++; }
            updateScoreUI();
        } else if (type === 'draw') {
            winner = 'draw';
        }
        updateStatus();
        let msg = '';
        if (winner === 'player') msg = '?? Congratulations! You won! ??\nClick OK to start a new game.';
        else if (winner === 'ai') msg = '?? AI wins this round. Better luck next time!\nClick OK to play again.';
        else if (winner === 'draw') msg = '?? It\'s a draw! Well played!\nClick OK to start a fresh game.';
        if (msg) { alert(msg); resetGame(); }
    }
    
    function applyMove(x, y, pl, record = true) {
        if (!gameActive || board[y][x] !== null) return false;
        board[y][x] = pl;
        playStoneSound();
        if (record) history.push({ x, y, player: pl });
        redrawGame();
        
        if (checkWin(x, y, pl)) { endGame('win', pl); return true; }
        if (isDraw()) { endGame('draw'); return true; }
        currentTurn = (currentTurn === 'player') ? 'ai' : 'player';
        updateStatus();
        return true;
    }
    
    // AI move functions (using original intelligent scoring, difficulty aware)
    function getBasicMovesList() {
        let moves = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] === null) {
                    let offense = evalPositionScore(j, i, 'ai');
                    let defense = evalPositionScore(j, i, 'player');
                    moves.push({ x: j, y: i, score: offense + defense * 0.85 });
                }
            }
        }
        moves.sort((a,b) => b.score - a.score);
        return moves;
    }
    
    function getHardAIMove() {
        let moves = getBasicMovesList();
        if (moves.length === 0) return null;
        let candidates = moves.slice(0, 15);
        let bestMove = null;
        let bestValue = -Infinity;
        for (let mv of candidates) {
            board[mv.y][mv.x] = 'ai';
            let aiBoardScore = evalFullBoard('ai');
            let opponentBest = 0;
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    if (board[i][j] === null) {
                        let threat = evalPositionScore(j, i, 'player');
                        if (threat > opponentBest) opponentBest = threat;
                    }
                }
            }
            board[mv.y][mv.x] = null;
            let value = aiBoardScore - (opponentBest * 1.3);
            if (value > bestValue) {
                bestValue = value;
                bestMove = mv;
            }
        }
        return bestMove ? { x: bestMove.x, y: bestMove.y } : (moves[0] || null);
    }
    
    function getMediumMove(moves) {
        if (moves.length > 1 && Math.random() < 0.12) return moves[1];
        return moves[0];
    }
    
    function getEasyMove(moves) {
        let limit = Math.min(8, moves.length);
        if (limit === 0) return null;
        return moves[Math.floor(Math.random() * limit)];
    }
    
    function getBestMoveByDifficulty() {
        let moves = getBasicMovesList();
        if (!moves.length) return null;
        if (currentDifficulty === 'easy') return getEasyMove(moves);
        if (currentDifficulty === 'medium') return getMediumMove(moves);
        return getHardAIMove();
    }
    
    function cancelPendingAI() {
        if (pendingAITimer) {
            clearTimeout(pendingAITimer);
            pendingAITimer = null;
        }
        aiThinking = false;
    }
    
    async function aiMove() {
        if (!gameActive || currentTurn !== 'ai') return;
        if (aiThinking) return;
        aiThinking = true;
        let delayMs = 80;
        if (currentDifficulty === 'easy') delayMs = 80;
        else if (currentDifficulty === 'medium') delayMs = 180;
        else delayMs = 380;
        await new Promise(resolve => {
            pendingAITimer = setTimeout(resolve, delayMs);
        });
        pendingAITimer = null;
        if (!gameActive || currentTurn !== 'ai') { aiThinking = false; return; }
        let best = getBestMoveByDifficulty();
        if (best) {
            applyMove(best.x, best.y, 'ai', true);
            if (gameActive && currentTurn === 'ai') {
                aiThinking = false;
                aiMove();
                return;
            }
        } else if (isDraw()) {
            endGame('draw');
        }
        aiThinking = false;
        updateStatus();
    }
    
    function playerMove(x, y) {
        if (!gameActive || currentTurn !== 'player' || board[y][x] !== null) return false;
        cancelPendingAI();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        let res = applyMove(x, y, 'player', true);
        if (res && gameActive && currentTurn === 'ai') {
            setTimeout(() => aiMove(), 20);
        }
        updateStatus();
        return res;
    }
    
    function undoLatest() {
        cancelPendingAI();
        if (!gameActive && winner !== null) {
            if (history.length > 0) { gameActive = true; winner = null; }
            else return;
        }
        if (history.length === 0) return;
        let last = history.pop();
        board[last.y][last.x] = null;
        redrawGame();
        currentTurn = last.player;
        if (!gameActive) { gameActive = true; winner = null; }
        updateStatus();
        if (gameActive && currentTurn === 'ai') {
            setTimeout(() => aiMove(), 50);
        }
    }
    
    function resetGame() {
        cancelPendingAI();
        board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
        history = [];
        gameActive = true;
        winner = null;
        currentTurn = 'player';
        redrawGame();
        updateStatus();
        if (pendingAITimer) clearTimeout(pendingAITimer);
        aiThinking = false;
    }
    
    function setDifficulty(lev) {
        currentDifficulty = lev;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            if (btn.dataset.diff === lev) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        resetGame();
    }
    
    function initFaq() {
        document.querySelectorAll('.faq-item').forEach(item => {
            let q = item.querySelector('.faq-question'), a = item.querySelector('.faq-answer'), icon = q.querySelector('.icon');
            q.addEventListener('click', () => {
                let open = a.classList.contains('show');
                document.querySelectorAll('.faq-answer').forEach(ans => {
                    if (ans !== a && ans.classList.contains('show')) {
                        ans.classList.remove('show');
                        ans.parentElement.querySelector('.faq-question .icon').textContent = '¨‹';
                    }
                });
                if (!open) { a.classList.add('show'); icon.textContent = '¡ø'; }
                else { a.classList.remove('show'); icon.textContent = '¨‹'; }
            });
        });
    }
    
    function initLanguageSwitcher() {
        const langSelect = document.getElementById('langSelect');
        if (!langSelect) return;
        langSelect.addEventListener('change', function() {
            const selectedLang = this.value;
            let targetUrl = 'https://playgomokugame.com/';
            if (selectedLang === 'en') targetUrl = 'https://playgomokugame.com/';
            else if (selectedLang === 'es') targetUrl = 'https://playgomokugame.com/es/';
            else if (selectedLang === 'fr') targetUrl = 'https://playgomokugame.com/fr/';
            else if (selectedLang === 'de') targetUrl = 'https://playgomokugame.com/de/';
            else if (selectedLang === 'ja') targetUrl = 'https://playgomokugame.com/ja/';
            else if (selectedLang === 'pt') targetUrl = 'https://playgomokugame.com/pt/';
			else if (selectedLang === 'th') targetUrl = 'https://playgomokugame.com/th/';
			else if (selectedLang === 'it') targetUrl = 'https://playgomokugame.com/it/';
			else if (selectedLang === 'hi') targetUrl = 'https://playgomokugame.com/hi/';
			else if (selectedLang === 'ko') targetUrl = 'https://playgomokugame.com/ko/';
            window.location.href = targetUrl;
        });
    }
    
    function init() {
        initGeometry();
        resetGame();
        updateScoreUI();
        canvas.addEventListener('click', handleCanvasClick);
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => setDifficulty(e.currentTarget.dataset.diff));
        });
        resetBtn.onclick = () => resetGame();
        undoBtn.onclick = () => undoLatest();
        resetScoreBtn.onclick = () => resetScores();
        setDifficulty(currentDifficulty);
        initFaq();
        initLanguageSwitcher();
    }
    
    init();
});