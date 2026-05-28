const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 30;

const SHAPES = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: '#00f5ff'
    },
    O: {
        shape: [[1, 1], [1, 1]],
        color: '#ffeb3b'
    },
    T: {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#9c27b0'
    },
    S: {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: '#4caf50'
    },
    Z: {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: '#f44336'
    },
    J: {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: '#2196f3'
    },
    L: {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: '#ff9800'
    }
};

const SHAPE_NAMES = Object.keys(SHAPES);

class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.audio = document.getElementById('bgMusic');
        this.isMusicPlaying = false;
        this.isMuted = false;
        this.audio.volume = 0.5;
        
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameState = 'idle';
        this.animationFrameId = null;
        this.lastDropTime = 0;
        this.lastFrameTime = 0;
        
        this.init();
        this.bindEvents();
    }
    
    init() {
        this.board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.gameState = 'idle';
        this.updateUI();
        this.drawBoard();
        this.drawNextPiece(null);
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('musicBtn').addEventListener('click', () => this.toggleMusic());
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));
    }
    
    setVolume(value) {
        const volume = value / 100;
        this.audio.volume = volume;
        document.getElementById('volumeValue').textContent = value + '%';
        
        const volumeLabel = document.querySelector('.volume-label');
        if (volume === 0) {
            volumeLabel.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeLabel.textContent = '🔉';
        } else {
            volumeLabel.textContent = '🔊';
        }
        
        if (volume > 0 && this.audio.muted) {
            this.audio.muted = false;
            this.updateMuteButton();
        }
    }
    
    toggleMusic() {
        if (this.isMusicPlaying) {
            this.audio.pause();
            document.getElementById('musicBtn').textContent = '🎵 播放音乐';
            document.getElementById('musicBtn').style.background = 'linear-gradient(135deg, #9c27b0, #673ab7)';
        } else {
            this.audio.play().catch(err => {
                console.log('音乐播放失败:', err);
            });
            document.getElementById('musicBtn').textContent = '⏸ 暂停音乐';
            document.getElementById('musicBtn').style.background = 'linear-gradient(135deg, #673ab7, #9c27b0)';
        }
        this.isMusicPlaying = !this.isMusicPlaying;
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;
        this.updateMuteButton();
    }
    
    updateMuteButton() {
        if (this.isMuted) {
            document.getElementById('muteBtn').textContent = '🔇 已静音';
            document.getElementById('muteBtn').style.background = 'linear-gradient(135deg, #666, #444)';
        } else {
            document.getElementById('muteBtn').textContent = '🔊 音量';
            document.getElementById('muteBtn').style.background = 'linear-gradient(135deg, #00bcd4, #0097a7)';
        }
    }
    
    start() {
        if (this.gameState === 'idle' || this.gameState === 'gameover') {
            this.init();
            this.gameState = 'playing';
            this.currentPiece = this.createPiece();
            this.nextPiece = this.createPiece();
            this.lastDropTime = performance.now();
            this.lastFrameTime = performance.now();
            this.gameLoop();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.lastDropTime = performance.now();
            this.lastFrameTime = performance.now();
            this.gameLoop();
        }
    }
    
    gameLoop = () => {
        if (this.gameState !== 'playing') return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        if (now - this.lastDropTime >= this.dropInterval) {
            this.drop();
            this.lastDropTime = now;
        }
        
        this.draw();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
    }
    
    reset() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.init();
    }
    
    restart() {
        document.getElementById('gameOver').classList.remove('show');
        this.start();
    }
    
    createPiece() {
        const name = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
        const shapeData = SHAPES[name];
        return {
            name,
            shape: shapeData.shape.map(row => [...row]),
            color: shapeData.color,
            x: Math.floor((BOARD_WIDTH - shapeData.shape[0].length) / 2),
            y: 0
        };
    }
    
    drop() {
        if (this.canMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
        } else {
            this.lockPiece();
            this.clearLines();
            this.spawnPiece();
        }
    }
    
    hardDrop() {
        while (this.canMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            this.score += 2;
        }
        this.lockPiece();
        this.clearLines();
        this.spawnPiece();
        this.updateUI();
    }
    
    moveLeft() {
        if (this.canMove(this.currentPiece, -1, 0)) {
            this.currentPiece.x--;
        }
    }
    
    moveRight() {
        if (this.canMove(this.currentPiece, 1, 0)) {
            this.currentPiece.x++;
        }
    }
    
    rotate() {
        const rotated = this.rotatePiece(this.currentPiece);
        if (this.canMove(rotated, 0, 0)) {
            this.currentPiece.shape = rotated.shape;
        } else {
            if (this.canMove(rotated, -1, 0)) {
                rotated.x--;
                this.currentPiece = rotated;
            } else if (this.canMove(rotated, 1, 0)) {
                rotated.x++;
                this.currentPiece = rotated;
            } else if (this.canMove(rotated, 0, -1)) {
                rotated.y--;
                this.currentPiece = rotated;
            }
        }
    }
    
    rotatePiece(piece) {
        const rows = piece.shape.length;
        const cols = piece.shape[0].length;
        const rotated = [];
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = rows - 1; j >= 0; j--) {
                rotated[i][rows - 1 - j] = piece.shape[j][i];
            }
        }
        return {
            ...piece,
            shape: rotated
        };
    }
    
    canMove(piece, dx, dy) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + dx;
                    const newY = piece.y + y + dy;
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return false;
                    }
                    if (newY >= 0 && this.board[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    lockPiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
    }
    
    clearLines() {
        let clearedLines = 0;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== null)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(BOARD_WIDTH).fill(null));
                clearedLines++;
                y++;
            }
        }
        
        if (clearedLines > 0) {
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[clearedLines] * this.level;
            this.lines += clearedLines;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateUI();
        }
    }
    
    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createPiece();
        this.drawNextPiece(this.nextPiece);
        
        if (!this.canMove(this.currentPiece, 0, 0)) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameState = 'gameover';
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.add('show');
    }
    
    handleKeyDown(e) {
        if (this.gameState !== 'playing') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.moveLeft();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveRight();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.drop();
                this.score += 1;
                this.updateUI();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotate();
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                this.pause();
                break;
        }
    }
    
    draw() {
        this.drawBoard();
        this.drawPiece();
    }
    
    drawBoard() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawCell(x, y, this.board[y][x]);
                }
            }
        }
        
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * CELL_SIZE);
            this.ctx.lineTo(BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
            this.ctx.stroke();
        }
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * CELL_SIZE, 0);
            this.ctx.lineTo(x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawPiece() {
        const piece = this.currentPiece;
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = piece.x + x;
                    const boardY = piece.y + y;
                    if (boardY >= 0) {
                        this.drawCell(boardX, boardY, piece.color);
                    }
                }
            }
        }
    }
    
    drawCell(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 6, CELL_SIZE - 6);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x * CELL_SIZE + CELL_SIZE - 4, y * CELL_SIZE + CELL_SIZE - 4, 2, 2);
    }
    
    drawNextPiece(piece) {
        this.nextCtx.fillStyle = '#0a0a0a';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!piece) return;
        
        const offsetX = (this.nextCanvas.width - piece.shape[0].length * CELL_SIZE) / 2;
        const offsetY = (this.nextCanvas.height - piece.shape.length * CELL_SIZE) / 2;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.nextCtx.fillStyle = piece.color;
                    this.nextCtx.fillRect(
                        offsetX + x * CELL_SIZE + 1,
                        offsetY + y * CELL_SIZE + 1,
                        CELL_SIZE - 2,
                        CELL_SIZE - 2
                    );
                    
                    this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.nextCtx.fillRect(
                        offsetX + x * CELL_SIZE + 2,
                        offsetY + y * CELL_SIZE + 2,
                        CELL_SIZE - 6,
                        CELL_SIZE - 6
                    );
                }
            }
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
});