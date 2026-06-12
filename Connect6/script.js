const BOARD_SIZE = 19;
const WIN_LENGTH = 6;
const CELL_SIZE = 720 / BOARD_SIZE;
const STONE_RADIUS = CELL_SIZE * 0.4;

let board = [];
let currentPlayer = 'black';
let moveCount = 0;
let stonesInCurrentTurn = 0;
let gameOver = false;
let moveHistory = [];
let difficulty = 'medium';
let isAIThinking = false;
let blackStones = 0;
let whiteStones = 0;

const canvas = document.getElementById('connect6Canvas');
const ctx = canvas.getContext('2d');

function initBoard() {
    board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = null;
        }
    }
    drawBoard();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#8b6946';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        const pos = CELL_SIZE / 2 + i * CELL_SIZE;
        
        ctx.beginPath();
        ctx.moveTo(pos, CELL_SIZE / 2);
        ctx.lineTo(pos, canvas.height - CELL_SIZE / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2, pos);
        ctx.lineTo(canvas.width - CELL_SIZE / 2, pos);
        ctx.stroke();
    }
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j]) {
                drawStone(i, j, board[i][j]);
            }
        }
    }
    
    if (moveHistory.length > 0) {
        const lastMove = moveHistory[moveHistory.length - 1];
        drawLastMoveMarker(lastMove.row, lastMove.col);
    }
}

function drawStone(row, col, player) {
    const x = CELL_SIZE / 2 + col * CELL_SIZE;
    const y = CELL_SIZE / 2 + row * CELL_SIZE;
    
    ctx.beginPath();
    ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(
        x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, 0,
        x, y, STONE_RADIUS
    );
    
    if (player === 'black') {
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ddd');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    if (player === 'white') {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawLastMoveMarker(row, col) {
    const x = CELL_SIZE / 2 + col * CELL_SIZE;
    const y = CELL_SIZE / 2 + row * CELL_SIZE;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f39c12';
    ctx.fill();
}

function getBoardPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    return { row, col };
}

function handleCanvasClick(event) {
    if (gameOver || isAIThinking) return;
    
    const { row, col } = getBoardPosition(event);
    
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (board[row][col]) return;
    
    const maxStonesPerTurn = moveCount === 0 ? 1 : 2;
    if (stonesInCurrentTurn >= maxStonesPerTurn) return;
    
    placeStone(row, col);
    stonesInCurrentTurn++;
    
    if (checkWin(row, col)) {
        gameOver = true;
        showWinner(currentPlayer);
        return;
    }
    
    if (stonesInCurrentTurn >= maxStonesPerTurn) {
        endTurn();
    } else {
        updateStatus();
    }
    
    drawBoard();
}

function placeStone(row, col) {
    board[row][col] = currentPlayer;
    moveHistory.push({ row, col, player: currentPlayer });
    
    if (currentPlayer === 'black') {
        blackStones++;
    } else {
        whiteStones++;
    }
    
    updateCounts();
}

function endTurn() {
    moveCount++;
    stonesInCurrentTurn = 0;
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    updateStatus();
    
    if (currentPlayer === 'white' && !gameOver) {
        setTimeout(() => makeAIMove(), 500);
    }
}

function makeAIMove() {
    isAIThinking = true;
    updateStatus();
    
    const maxStones = moveCount === 0 ? 1 : 2;
    
    for (let i = 0; i < maxStones; i++) {
        const move = getAIMove();
        if (move) {
            placeStone(move.row, move.col);
            stonesInCurrentTurn++;
            
            if (checkWin(move.row, move.col)) {
                gameOver = true;
                showWinner('white');
                isAIThinking = false;
                drawBoard();
                return;
            }
        }
    }
    
    isAIThinking = false;
    endTurn();
    drawBoard();
}

function getAIMove() {
    const emptyCells = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (!board[i][j]) {
                emptyCells.push({ row: i, col: j });
            }
        }
    }
    
    if (emptyCells.length === 0) return null;
    
    if (difficulty === 'easy') {
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    const scoredMoves = emptyCells.map(cell => ({
        ...cell,
        score: evaluatePosition(cell.row, cell.col)
    }));
    
    scoredMoves.sort((a, b) => b.score - a.score);
    
    if (difficulty === 'medium') {
        const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
        return topMoves[Math.floor(Math.random() * topMoves.length)];
    }
    
    return scoredMoves[0];
}

function evaluatePosition(row, col) {
    let score = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dx, dy] of directions) {
        score += evaluateDirection(row, col, dx, dy, 'white');
        score += evaluateDirection(row, col, dx, dy, 'black') * 0.9;
    }
    
    const center = Math.floor(BOARD_SIZE / 2);
    const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
    score += (BOARD_SIZE - distFromCenter) * 0.5;
    
    return score;
}

function evaluateDirection(row, col, dx, dy, player) {
    let count = 1;
    let openEnds = 0;
    
    for (let i = 1; i < WIN_LENGTH; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            if (board[newRow][newCol] === player) {
                count++;
            } else if (board[newRow][newCol] === null) {
                openEnds++;
                break;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    for (let i = 1; i < WIN_LENGTH; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            if (board[newRow][newCol] === player) {
                count++;
            } else if (board[newRow][newCol] === null) {
                openEnds++;
                break;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    if (count >= WIN_LENGTH) return 10000;
    if (count === WIN_LENGTH - 1 && openEnds === 2) return 5000;
    if (count === WIN_LENGTH - 1 && openEnds === 1) return 1000;
    if (count === WIN_LENGTH - 2 && openEnds === 2) return 500;
    if (count === WIN_LENGTH - 2 && openEnds === 1) return 100;
    if (count === WIN_LENGTH - 3 && openEnds === 2) return 50;
    
    return count * 10 + openEnds * 5;
}

function updateStatus() {
    const tipText = document.getElementById('tipText');
    const moveIndicator = document.getElementById('moveIndicator');
    
    if (isAIThinking) {
        tipText.textContent = '🤖 AI is thinking...';
        moveIndicator.textContent = 'AI is calculating best moves';
    } else {
        tipText.textContent = currentPlayer === 'black' ? '⚫ Your turn (Black)' : '⚪ AI turn (White)';
        
        const maxStones = moveCount === 0 ? 1 : 2;
        const remaining = maxStones - stonesInCurrentTurn;
        
        if (moveCount === 0 && stonesInCurrentTurn === 0) {
            moveIndicator.textContent = 'First move: Place 1 stone';
        } else {
            moveIndicator.textContent = `Place ${remaining} more stone${remaining > 1 ? 's' : ''}`;
        }
    }
}

function updateCounts() {
    document.getElementById('blackCount').textContent = blackStones;
    document.getElementById('whiteCount').textContent = whiteStones;
}

function checkWin(row, col) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    const player = board[row][col];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        
        for (let i = 1; i < WIN_LENGTH; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (newRow >= 0 && newRow < BOARD_SIZE &&
                newCol >= 0 && newCol < BOARD_SIZE &&
                board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        for (let i = 1; i < WIN_LENGTH; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (newRow >= 0 && newRow < BOARD_SIZE &&
                newCol >= 0 && newCol < BOARD_SIZE &&
                board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        if (count >= WIN_LENGTH) return true;
    }
    
    return false;
}

function showWinner(player) {
    const modal = document.getElementById('winnerModal');
    const text = document.getElementById('winnerText');
    
    text.textContent = player === 'black' ? '🎉 You Win!' : '🤖 AI Wins!';
    modal.style.display = 'flex';
}

function undoMove() {
    if (moveHistory.length === 0 || gameOver || isAIThinking) return;
    
    const maxStones = moveCount === 0 ? 1 : 2;
    const toUndo = Math.min(stonesInCurrentTurn || maxStones, moveHistory.length);
    
    for (let i = 0; i < toUndo; i++) {
        const move = moveHistory.pop();
        board[move.row][move.col] = null;
        
        if (move.player === 'black') {
            blackStones--;
        } else {
            whiteStones--;
        }
    }
    
    if (stonesInCurrentTurn === 0 && moveCount > 0) {
        moveCount--;
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    }
    stonesInCurrentTurn = 0;
    
    updateStatus();
    updateCounts();
    drawBoard();
}

function resetGame() {
    document.getElementById('winnerModal').style.display = 'none';
    currentPlayer = 'black';
    moveCount = 0;
    stonesInCurrentTurn = 0;
    gameOver = false;
    moveHistory = [];
    isAIThinking = false;
    blackStones = 0;
    whiteStones = 0;
    initBoard();
    updateStatus();
    updateCounts();
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.diff === level) {
            btn.classList.add('active');
        }
    });
}

function initFaq() {
    document.querySelectorAll('.faq-item').forEach(item => {
        let q = item.querySelector('.faq-question'), a = item.querySelector('.faq-answer'), icon = q.querySelector('.icon');
        q.addEventListener('click', () => {
            let open = a.classList.contains('show');
            document.querySelectorAll('.faq-answer').forEach(ans => {
                if (ans !== a && ans.classList.contains('show')) {
                    ans.classList.remove('show');
                    ans.parentElement.querySelector('.faq-question .icon').textContent = '▼';
                }
            });
            if (!open) { a.classList.add('show'); icon.textContent = '▲'; }
            else { a.classList.remove('show'); icon.textContent = '▼'; }
        });
    });
}

canvas.addEventListener('click', handleCanvasClick);

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
});

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('undoBtn').addEventListener('click', undoMove);

initBoard();
updateStatus();
initFaq();
