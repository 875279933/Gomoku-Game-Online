(function(){
    const canvas = document.getElementById('pongHauKiCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('status');

    const points = [
        { x: 100, y: 100 },
        { x: 450, y: 100 },
        { x: 100, y: 400 },
        { x: 450, y: 400 },
        { x: 275, y: 250 }
    ];

    const link = [
        [2, 4],
        [3, 4],
        [0, 3, 4],
        [1, 2, 4],
        [0, 1, 2, 3]
    ];

    let board = [1, 1, 0, 0, -1];
    let currentPlayer = 0;
    let gameOver = false;
    let aiThinking = false;

    let draggingIndex = -1;
    let dragCanvasX = 0, dragCanvasY = 0;
    let selectedIndex = -1;

    function checkCanMove(player) {
        for (let i = 0; i < 5; i++) {
            if (board[i] !== player) continue;
            for (let nxt of link[i]) {
                if (board[nxt] === -1) return true;
            }
        }
        return false;
    }

    function endGame(winner) {
        if (gameOver) return;
        gameOver = true;
        if (winner === 0) {
            statusDiv.innerText = "🎉 Victory! You trapped the AI! Great move!";
        } else {
            statusDiv.innerText = "😟 No moves left · AI wins";
        }
        drawBoard();
        setTimeout(() => {
            if (gameOver) restartGame();
        }, 2000);
    }

    function applyMove(from, to) {
        board[to] = board[from];
        board[from] = -1;
    }

    function playerMove(from, to) {
        if (gameOver || currentPlayer !== 0 || aiThinking) return false;
        if (!link[from].includes(to) || board[to] !== -1) return false;

        applyMove(from, to);
        drawBoard();

        currentPlayer = 1;
        if (!checkCanMove(1)) {
            endGame(0);
            return true;
        }

        statusDiv.innerText = "⚫ AI (Black) thinking ...";
        drawBoard();
        setTimeout(() => aiTurn(), 260);
        return true;
    }

    function aiTurn() {
        if (gameOver || currentPlayer !== 1 || aiThinking) return;
        aiThinking = true;

        let moves = [];
        for (let i = 0; i < 5; i++) {
            if (board[i] !== 1) continue;
            for (let to of link[i]) {
                if (board[to] === -1) moves.push({ from: i, to });
            }
        }

        if (moves.length > 0) {
            const r = Math.floor(Math.random() * moves.length);
            const { from, to } = moves[r];
            applyMove(from, to);
        }

        currentPlayer = 0;
        aiThinking = false;

        if (!checkCanMove(0)) {
            endGame(1);
        } else {
            statusDiv.innerText = "⚪ Your turn · White to move (Click/Drag)";
        }
        drawBoard();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#c7bc9e";
        ctx.beginPath();
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[2].x, points[2].y);
        ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.moveTo(points[3].x, points[3].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.stroke();

        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, 7, 0, Math.PI*2);
            ctx.fillStyle = "#ffffffcc";
            ctx.fill();
            ctx.strokeStyle = "#e1d3bd";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        for (let i = 0; i < 5; i++) {
            if (board[i] === -1 && i !== draggingIndex) continue;
            let x = points[i].x;
            let y = points[i].y;
            if (i === draggingIndex) {
                x = dragCanvasX;
                y = dragCanvasY;
            }

            const grad = ctx.createRadialGradient(x-12, y-12, 4, x-6, y-6, 34);
            if (board[i] === 0) {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.7, '#ececec');
                grad.addColorStop(1, '#d2d6db');
            } else {
                grad.addColorStop(0, '#5f6c7b');
                grad.addColorStop(0.6, '#2f3b44');
                grad.addColorStop(1, '#181f26');
            }
            ctx.beginPath();
            ctx.arc(x, y, 33, 0, Math.PI*2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = "#b7aa8a";
            ctx.lineWidth = 1.6;
            ctx.stroke();

            if (selectedIndex === i && draggingIndex === -1 && !gameOver && currentPlayer === 0) {
                ctx.beginPath();
                ctx.arc(x, y, 42, 0, Math.PI*2);
                ctx.strokeStyle = "#e86f4f";
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        }

        if (gameOver) {
            ctx.fillStyle = "rgba(245, 245, 240, 0.65)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "500 20px 'Inter'";
            ctx.fillStyle = "#2b3b42";
            ctx.fillText("🏁", canvas.width/2 - 20, canvas.height/2);
        }
        ctx.restore();
    }

    function getNearestPoint(mx, my) {
        let bestIdx = -1, bestDist = 42;
        for (let i = 0; i < points.length; i++) {
            const dx = mx - points[i].x;
            const dy = my - points[i].y;
            const dist = Math.hypot(dx, dy);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    function onMouseDown(e) {
        if (gameOver || currentPlayer !== 0 || aiThinking) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        let mx = (e.clientX - rect.left) * sx;
        let my = (e.clientY - rect.top) * sy;
        const idx = getNearestPoint(mx, my);
        if (idx !== -1 && board[idx] === 0) {
            draggingIndex = idx;
            selectedIndex = -1;
            dragCanvasX = points[idx].x;
            dragCanvasY = points[idx].y;
            drawBoard();
            e.preventDefault();
        }
    }

    function onMouseMove(e) {
        if (draggingIndex === -1) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        dragCanvasX = (e.clientX - rect.left) * sx;
        dragCanvasY = (e.clientY - rect.top) * sy;
        drawBoard();
    }

    function onMouseUp(e) {
        if (draggingIndex !== -1) {
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width / rect.width;
            const sy = canvas.height / rect.height;
            let endX = (e.clientX - rect.left) * sx;
            let endY = (e.clientY - rect.top) * sy;
            const target = getNearestPoint(endX, endY);
            let success = false;
            if (target !== -1 && link[draggingIndex].includes(target) && board[target] === -1) {
                success = playerMove(draggingIndex, target);
            }
            draggingIndex = -1;
            drawBoard();
            if (!success && currentPlayer === 0 && !gameOver) {
                statusDiv.innerText = "⛔ Move only along lines to empty points, try again";
                setTimeout(() => {
                    if (!gameOver && currentPlayer === 0) statusDiv.innerText = "⚪ Your turn · White to move (Click/Drag)";
                }, 850);
            }
            return;
        }

        if (!gameOver && currentPlayer === 0 && !aiThinking) {
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width / rect.width;
            const sy = canvas.height / rect.height;
            let mx = (e.clientX - rect.left) * sx;
            let my = (e.clientY - rect.top) * sy;
            const clickPoint = getNearestPoint(mx, my);
            if (clickPoint === -1) return;

            if (selectedIndex === -1) {
                if (board[clickPoint] === 0) selectedIndex = clickPoint;
                drawBoard();
            } else {
                if (link[selectedIndex].includes(clickPoint) && board[clickPoint] === -1) {
                    playerMove(selectedIndex, clickPoint);
                    selectedIndex = -1;
                } else if (board[clickPoint] === 0) {
                    selectedIndex = clickPoint;
                    drawBoard();
                } else {
                    selectedIndex = -1;
                    drawBoard();
                    statusDiv.innerText = "❌ Invalid move - must move along lines to empty point";
                    setTimeout(() => {
                        if (!gameOver && currentPlayer === 0) statusDiv.innerText = "⚪ Your turn · White to move";
                    }, 700);
                }
            }
        }
    }

    function restartGame() {
        board = [1, 1, 0, 0, -1];
        currentPlayer = 0;
        gameOver = false;
        aiThinking = false;
        draggingIndex = -1;
        selectedIndex = -1;
        statusDiv.innerText = "⚪ White (You) First - Click or Drag to Move";
        drawBoard();
    }

    function bindEvents() {
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        });
        window.addEventListener('touchmove', (e) => {
            if (draggingIndex !== -1) {
                e.preventDefault();
                const touch = e.touches[0];
                onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
            }
        });
        window.addEventListener('touchend', (e) => {
            if (draggingIndex !== -1) {
                e.preventDefault();
                onMouseUp(e);
            } else {
                const touch = e.changedTouches[0];
                if (touch) onMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
            }
        });
        document.getElementById('restartBtn').addEventListener('click', () => restartGame());
    }

    bindEvents();
    restartGame();

    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const answer = q.nextElementSibling;
            const icon = q.querySelector('.icon');
            answer.classList.toggle('show');
            icon.style.transform = answer.classList.contains('show') ? 'rotate(180deg)' : '';
        });
    });

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
})();
