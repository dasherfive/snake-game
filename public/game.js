document.addEventListener('DOMContentLoaded', () => {
    // Game Configuration
    const GRID_SIZE = 20;
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 400;
    const COLS = CANVAS_WIDTH / GRID_SIZE;
    const ROWS = CANVAS_HEIGHT / GRID_SIZE;

    // DOM Elements
    const screens = {
        menu: document.getElementById('menu-screen'),
        level: document.getElementById('level-screen'),
        game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'),
        leaderboard: document.getElementById('leaderboard-screen')
    };

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('current-score');
    const levelDisplay = document.getElementById('current-level');
    const finalScoreDisplay = document.getElementById('final-score');
    const playerNameInput = document.getElementById('player-name');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    const muteBtn = document.getElementById('btn-mute');

    // Audio Engine using Web Audio API
    const SoundEngine = {
        ctx: null,
        isMuted: false,
        bgmNode: null,
        bgmGain: null,
        init() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        },
        play(type) {
            if (!this.ctx) this.init();
            if (this.isMuted) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;

            switch (type) {
                case 'eat':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
                    gain.gain.setValueAtTime(0.02, now);
                    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'bonus':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                    gain.gain.setValueAtTime(0.03, now);
                    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'levelup':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
                    gain.gain.setValueAtTime(0.03, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                    break;
                case 'die':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                    gain.gain.setValueAtTime(0.03, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'click':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(400, now);
                    gain.gain.setValueAtTime(0.01, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;
                case 'start':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
                    gain.gain.setValueAtTime(0.02, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
            }
        },
        startBGM() {
            if (!this.ctx) this.init();
            if (this.bgmNode) return;
            
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime); // Much louder BGM base
            this.bgmGain.connect(this.ctx.destination);

            const notes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4

            const playNextNote = () => {
                if (this.isMuted || !this.ctx) {
                    setTimeout(playNextNote, 1000);
                    return;
                }
                
                if (this.ctx.state === 'suspended') this.ctx.resume();

                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], this.ctx.currentTime);
                
                g.gain.setValueAtTime(0, this.ctx.currentTime);
                g.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.5); // Louder notes
                g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.5);
                
                osc.connect(g);
                g.connect(this.bgmGain);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 3);
                
                setTimeout(playNextNote, 2000);
            };
            
            playNextNote();
            this.bgmNode = true;
        },
        toggleMute() {
            this.isMuted = !this.isMuted;
            if (this.bgmGain) {
                this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : 0.2, this.ctx.currentTime);
            }
            return this.isMuted;
        }
    };

    // Initialize sound on first user interaction
    const initAudioOnFirstClick = () => {
        SoundEngine.init();
        SoundEngine.startBGM();
        document.removeEventListener('click', initAudioOnFirstClick);
        document.removeEventListener('keydown', initAudioOnFirstClick);
    };

    document.addEventListener('click', initAudioOnFirstClick);
    document.addEventListener('keydown', initAudioOnFirstClick);

    // Game State
    let gameState = {
        snake: [],
        direction: { x: 0, y: 0 },
        food: { x: 0, y: 0 },
        bonusFood: null,
        bonusTimeout: null,
        obstacles: [],
        score: 0,
        level: 1,
        speed: 100,
        isRunning: false,
        gameLoopId: null
    };
    
    let inputQueue = [];

    // Level Settings
    const levels = {
        1: { speed: 220, obstacleCount: 0, nextLevelScore: 150 },
        2: { speed: 170, obstacleCount: 5, nextLevelScore: 400 },
        3: { speed: 120, obstacleCount: 12, nextLevelScore: Infinity }
    };

    // Navigation Functions
    function showScreen(screenName) {
        Object.values(screens).forEach(s => {
            s.classList.add('hidden');
            s.style.zIndex = -1;
        });
        screens[screenName].classList.remove('hidden');
        screens[screenName].style.zIndex = 10;
        
        // Special case for game over overlay
        if (screenName === 'gameOver') {
            screens.game.classList.remove('hidden'); // Keep game visible behind
            screens.game.style.zIndex = 1;
            screens.gameOver.style.zIndex = 20;
        }
    }

    // Event Listeners
    muteBtn.addEventListener('click', () => {
        const isMuted = SoundEngine.toggleMute();
        muteBtn.textContent = isMuted ? '❌' : '🔊';
        SoundEngine.play('click');
    });

    document.querySelectorAll('.btn, .level-btn').forEach(btn => {
        btn.addEventListener('click', () => SoundEngine.play('click'));
    });

    document.getElementById('btn-start').addEventListener('click', () => showScreen('level'));
    document.getElementById('btn-leaderboard').addEventListener('click', () => {
        fetchLeaderboard();
        showScreen('leaderboard');
    });
    
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = parseInt(btn.dataset.level);
            startGame(level);
        });
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-back-menu-lb').addEventListener('click', () => showScreen('menu'));
    
    document.getElementById('btn-submit-score').addEventListener('click', submitScore);
    document.getElementById('btn-restart').addEventListener('click', () => {
        showScreen('game'); // Hide game over overlay
        startGame(gameState.level);
    });
    document.getElementById('btn-menu-from-gameover').addEventListener('click', () => showScreen('menu'));

    // Input Handling
    document.addEventListener('keydown', handleInput);

    function handleInput(e) {
        if (!gameState.isRunning) return;

        const key = e.key;
        // Determine the reference direction: last queued input or current direction
        const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : gameState.direction;
        
        const goingUp = lastDir.y === -1;
        const goingDown = lastDir.y === 1;
        const goingLeft = lastDir.x === -1;
        const goingRight = lastDir.x === 1;

        let newDir = null;

        if ((key === 'ArrowUp' || key === 'w') && !goingDown) {
            newDir = { x: 0, y: -1 };
        } else if ((key === 'ArrowDown' || key === 's') && !goingUp) {
            newDir = { x: 0, y: 1 };
        } else if ((key === 'ArrowLeft' || key === 'a') && !goingRight) {
            newDir = { x: -1, y: 0 };
        } else if ((key === 'ArrowRight' || key === 'd') && !goingLeft) {
            newDir = { x: 1, y: 0 };
        }

        if (newDir) {
            // Limit queue size to prevent input lag build-up
            if (inputQueue.length < 2) {
                inputQueue.push(newDir);
            }
        }
    }

    // Game Logic
    function startGame(level) {
        gameState.level = level;
        gameState.speed = levels[level].speed;
        gameState.score = 0;
        gameState.direction = { x: 1, y: 0 }; // Start moving right
        inputQueue = []; // Clear input queue
        
        gameState.snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        gameState.isRunning = true;
        
        scoreDisplay.textContent = gameState.score;
        levelDisplay.textContent = gameState.level;

        generateObstacles(levels[level].obstacleCount);
        spawnFood();
        gameState.bonusFood = null;
        if (gameState.bonusTimeout) clearTimeout(gameState.bonusTimeout);
        scheduleBonusFood();

        SoundEngine.play('start');
        showScreen('game');
        
        if (gameState.gameLoopId) clearTimeout(gameState.gameLoopId);
        gameLoop();
    }

    function gameLoop() {
        if (!gameState.isRunning) return;

        gameState.gameLoopId = setTimeout(() => {
            if (gameState.isRunning) {
                update();
                draw();
                gameLoop();
            }
        }, gameState.speed);
    }

    function update() {
        // Process Input
        if (inputQueue.length > 0) {
            gameState.direction = inputQueue.shift();
        }

        // Calculate new head position
        const head = { x: gameState.snake[0].x + gameState.direction.x, y: gameState.snake[0].y + gameState.direction.y };
        const eating = (head.x === gameState.food.x && head.y === gameState.food.y);
        let eatingBonus = false;

        if (gameState.bonusFood && head.x === gameState.bonusFood.x && head.y === gameState.bonusFood.y) {
            eatingBonus = true;
        }

        // Check Wall Collisions
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            gameOver();
            return;
        }

        // Check Obstacle Collisions
        for (let obs of gameState.obstacles) {
            if (head.x === obs.x && head.y === obs.y) {
                gameOver();
                return;
            }
        }

        // Check Self Collision
        // If not eating, we can move into the space currently occupied by the tail (because it will move)
        for (let i = 0; i < gameState.snake.length; i++) {
            if (!eating && !eatingBonus && i === gameState.snake.length - 1) continue; // Ignore tail if not eating
            if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
                gameOver();
                return;
            }
        }

        gameState.snake.unshift(head); // Add new head

        if (eating) {
            gameState.score += 10;
            scoreDisplay.textContent = gameState.score;
            spawnFood();
            SoundEngine.play('eat');
            checkLevelUp();
            // Don't pop tail, so snake grows
        } else if (eatingBonus) {
            gameState.score += 50;
            scoreDisplay.textContent = gameState.score;
            gameState.bonusFood = null;
            if (gameState.bonusTimeout) clearTimeout(gameState.bonusTimeout);
            SoundEngine.play('bonus');
            checkLevelUp();
            scheduleBonusFood();
            // Bonus food also makes snake grow
        } else {
            gameState.snake.pop(); // Remove tail
        }
    }

    function checkLevelUp() {
        if (gameState.level >= 3) return; // Max level reached

        const nextThreshold = levels[gameState.level].nextLevelScore;
        if (gameState.score >= nextThreshold) {
            gameState.level++;
            gameState.speed = levels[gameState.level].speed;
            levelDisplay.textContent = gameState.level;
            
            // Generate obstacles for new level but keep snake safe
            generateObstacles(levels[gameState.level].obstacleCount);
            
            SoundEngine.play('levelup');
            
            // Brief pause or visual indicator could be added here
        }
    }

    function scheduleBonusFood() {
        // Randomly schedule bonus food appearance (e.g., every 5-15 seconds)
        const delay = Math.random() * 10000 + 5000;
        gameState.bonusTimeout = setTimeout(() => {
            if (!gameState.isRunning) return;
            spawnBonusFood();
        }, delay);
    }

    function spawnBonusFood() {
        if (!gameState.isRunning) return;
        
        let food;
        let attempts = 0;
        do {
            food = {
                x: Math.floor(Math.random() * COLS),
                y: Math.floor(Math.random() * ROWS)
            };
            attempts++;
        } while (isOccupied(food) && attempts < 100);
        
        if (attempts < 100) {
            gameState.bonusFood = food;
            // Bonus food disappears after 5 seconds
            gameState.bonusTimeout = setTimeout(() => {
                if (!gameState.isRunning) return;
                gameState.bonusFood = null;
                scheduleBonusFood(); // Schedule next one
            }, 5000);
        } else {
            scheduleBonusFood(); // Try again later if no space
        }
    }

    function generateObstacles(count) {
        gameState.obstacles = [];
        for (let i = 0; i < count; i++) {
            let obstacle;
            let attempts = 0;
            do {
                obstacle = {
                    x: Math.floor(Math.random() * COLS),
                    y: Math.floor(Math.random() * ROWS)
                };
                attempts++;
            } while (isOccupied(obstacle) && attempts < 100);
            
            if (attempts < 100) {
                gameState.obstacles.push(obstacle);
            }
        }
    }

    function spawnFood() {
        let food;
        let attempts = 0;
        do {
            food = {
                x: Math.floor(Math.random() * COLS),
                y: Math.floor(Math.random() * ROWS)
            };
            attempts++;
        } while (isOccupied(food) && attempts < 100);
        gameState.food = food;
    }

    function isOccupied(pos) {
        // Check snake
        for (let segment of gameState.snake) {
            if (pos.x === segment.x && pos.y === segment.y) return true;
        }
        // Check obstacles
        for (let obs of gameState.obstacles) {
            if (pos.x === obs.x && pos.y === obs.y) return true;
        }
        // Check existing food
        if (gameState.food && pos.x === gameState.food.x && pos.y === gameState.food.y) return true;
        
        // Dynamic safe zone: ensure objects don't spawn too close to the snake's head
        const head = gameState.snake[0];
        if (head) {
            const dist = Math.abs(pos.x - head.x) + Math.abs(pos.y - head.y);
            if (dist <= 3) return true;
        }

        return false;
    }

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#34495e'; // Background matching container
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Obstacles
        ctx.fillStyle = '#95a5a6';
        gameState.obstacles.forEach(obs => {
            ctx.fillRect(obs.x * GRID_SIZE, obs.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
        });

        // Draw Food
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        const foodX = gameState.food.x * GRID_SIZE + GRID_SIZE / 2;
        const foodY = gameState.food.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.arc(foodX, foodY, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bonus Food
        if (gameState.bonusFood) {
            ctx.fillStyle = '#f1c40f'; // Gold color
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f39c12';
            ctx.beginPath();
            const bonusX = gameState.bonusFood.x * GRID_SIZE + GRID_SIZE / 2;
            const bonusY = gameState.bonusFood.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.arc(bonusX, bonusY, GRID_SIZE / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow
        }

        // Draw Snake
        gameState.snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60'; // Head is lighter
            ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
        });
    }

    function gameOver() {
        gameState.isRunning = false;
        if (gameState.gameLoopId) clearTimeout(gameState.gameLoopId);
        if (gameState.bonusTimeout) clearTimeout(gameState.bonusTimeout);
        SoundEngine.play('die');
        finalScoreDisplay.textContent = gameState.score;
        showScreen('gameOver');
    }

    // API Functions
    async function fetchLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            renderLeaderboard(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            leaderboardTableBody.innerHTML = '<tr><td colspan="4">無法載入排行榜</td></tr>';
        }
    }

    function renderLeaderboard(data) {
        leaderboardTableBody.innerHTML = '';
        if (data.length === 0) {
            leaderboardTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">暫無資料</td></tr>';
            return;
        }
        data.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(entry.name)}</td>
                <td>${entry.score}</td>
                <td>${escapeHtml(String(entry.level))}</td>
            `;
            leaderboardTableBody.appendChild(row);
        });
    }

    async function submitScore() {
        const name = playerNameInput.value.trim();
        if (!name) {
            alert('請輸入名字');
            return;
        }

        const scoreData = {
            name: name,
            score: gameState.score,
            level: gameState.level
        };

        try {
            const response = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scoreData)
            });

            if (response.ok) {
                playerNameInput.value = ''; // Clear input
                await fetchLeaderboard(); // Wait for fetch
                showScreen('leaderboard');
            } else {
                alert('提交失敗，請稍後再試');
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            alert('提交失敗');
        }
    }

    function escapeHtml(text) {
        if (text === undefined || text === null) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});