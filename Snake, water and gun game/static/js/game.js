// Audio Synthesizer Engine using Web Audio API
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle(state) {
        this.enabled = state;
        if (this.enabled) {
            this.init();
        }
    }

    playTone(freq, duration, type = 'sine', gainStart = 0.1, ramp = true) {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gainNode.gain.setValueAtTime(gainStart, this.ctx.currentTime);
            if (ramp) {
                gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            } else {
                gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime + duration);
            }
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio synthesis failed', e);
        }
    }

    playHover() {
        this.playTone(600, 0.05, 'sine', 0.03);
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
            
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {
            console.warn(e);
        }
    }

    playCollide() {
        // Futuristic mechanical crash sound
        this.playTone(180, 0.15, 'triangle', 0.15);
        this.playTone(90, 0.25, 'sawtooth', 0.1);
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            // Arpeggio C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                osc.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.4);
            });
        } catch (e) {
            console.warn(e);
        }
    }

    playLose() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc.type = 'sawtooth';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.5);
            
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            
            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {
            console.warn(e);
        }
    }

    playTie() {
        if (!this.enabled) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            // Double neutral tone
            this.playTone(330, 0.1, 'sine', 0.1);
            setTimeout(() => {
                this.playTone(330, 0.15, 'sine', 0.1);
            }, 120);
        } catch (e) {
            console.warn(e);
        }
    }
}

import { initThreeJS, transitionToArena, transitionToHome } from './three-scene.js';

// Game Controller Engine
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Three.js scene
    initThreeJS('scene-canvas');
    // Sound object initialization
    const synth = new AudioSynth();
    let isMuted = false;

    // Custom SVGs definitions to render inside battle cards
    const SVGs = {
        snake: `
            <svg class="weapon-icon snake-icon" viewBox="0 0 100 100">
                <!-- Snake Body -->
                <path d="M25,80 C35,85 55,85 65,80 C75,75 80,65 75,55 C70,45 50,50 45,35 C40,20 60,10 70,20 C75,25 78,35 75,40" fill="none" stroke="url(#snakeGrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-green)"/>
                <!-- Cobra Hood -->
                <path d="M35,28 C30,15 45,8 55,8 C65,8 80,15 75,28 C72,33 65,35 55,35 C45,35 38,33 35,28 Z" fill="url(#snakeGrad)" />
                <!-- Snake Head -->
                <path d="M48,12 C48,12 55,6 62,12 C65,15 62,22 55,22 C48,22 45,15 48,12 Z" fill="#22c55e" />
                <!-- Snake Eyes -->
                <circle cx="51" cy="14" r="1.5" fill="#ef4444" />
                <circle cx="59" cy="14" r="1.5" fill="#ef4444" />
                <!-- Fangs -->
                <path d="M52,19 L50,23 M58,19 L60,23" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />
                <!-- Tongue -->
                <path d="M55,22 L55,27 L53,30 M55,27 L57,30" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span class="card-name" style="color: var(--neon-snake)">SNAKE</span>
        `,
        water: `
            <svg class="weapon-icon water-icon" viewBox="0 0 100 100">
                <!-- Swirling Wave Base -->
                <path d="M20,68 C25,50 35,45 50,45 C65,45 80,50 80,68 C80,82 65,85 50,85 C35,85 20,82 20,68 Z" fill="url(#waterGrad)" opacity="0.8" />
                <!-- Splash Crests (Crown) -->
                <path d="M24,60 Q15,42 22,40 Q28,38 32,50 Q36,25 45,28 Q52,30 48,45 Q62,15 70,22 Q75,28 65,52 Q82,40 85,50 Q87,58 76,64" fill="none" stroke="url(#waterGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-blue)" />
                <!-- Dynamic floating water droplets -->
                <circle cx="20" cy="30" r="3" fill="#bae6fd" filter="url(#glow-blue)" />
                <circle cx="48" cy="18" r="2.5" fill="#e0f2fe" filter="url(#glow-blue)" />
                <circle cx="78" cy="24" r="3.5" fill="#bae6fd" filter="url(#glow-blue)" />
                <circle cx="88" cy="42" r="2" fill="#bae6fd" filter="url(#glow-blue)" />
                <circle cx="12" cy="52" r="2.5" fill="#e0f2fe" filter="url(#glow-blue)" />
                <!-- Glare Highlights -->
                <path d="M35,68 Q50,78 65,68" fill="none" stroke="#bae6fd" stroke-width="2" stroke-linecap="round" opacity="0.6" />
            </svg>
            <span class="card-name" style="color: var(--neon-water)">WATER</span>
        `,
        gun: `
            <svg class="weapon-icon gun-icon" viewBox="0 0 100 100">
                <!-- Gun Main Body -->
                <path d="M20,60 L20,38 L75,38 L78,44 L78,54 L75,60 Z" fill="url(#gunGrad)" stroke="#fda4af" stroke-width="1.5" />
                <!-- Gun Barrel -->
                <rect x="75" y="44" width="12" height="6" rx="1.5" fill="#1e293b" stroke="#fb7185" stroke-width="1" />
                <!-- Neon Plasma Core / Rail -->
                <line x1="28" y1="47" x2="68" y2="47" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" filter="url(#glow-red)" />
                <!-- cooling vents -->
                <line x1="35" y1="42" x2="35" y2="54" stroke="#4c0519" stroke-width="1.5" />
                <line x1="43" y1="42" x2="43" y2="54" stroke="#4c0519" stroke-width="1.5" />
                <line x1="51" y1="42" x2="51" y2="54" stroke="#4c0519" stroke-width="1.5" />
                <line x1="59" y1="42" x2="59" y2="54" stroke="#4c0519" stroke-width="1.5" />
                <!-- Handle/Grip -->
                <path d="M25,60 L38,82 L50,82 L38,60 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5" />
                <!-- Trigger Guard and Trigger -->
                <path d="M42,60 C42,68 34,68 34,60" fill="none" stroke="#fda4af" stroke-width="1.5" />
                <path d="M38,60 L36,65" stroke="#ef4444" stroke-width="2" />
                <!-- Laser Sight Indicator -->
                <circle cx="70" cy="52" r="1.5" fill="#f43f5e" filter="url(#glow-red)" />
            </svg>
            <span class="card-name" style="color: var(--neon-gun)">GUN</span>
        `
    };

    // DOM Elements References
    const landingScreen = document.getElementById('landing-screen');
    const gameContainer = document.getElementById('game-container');
    const enterArenaBtn = document.getElementById('enter-arena-btn');

    const levelsView = document.getElementById('levels-view');
    const levelsGrid = document.getElementById('levels-grid');
    const backToLevelsBtn = document.getElementById('back-to-levels-btn');

    const choiceView = document.getElementById('choice-view');
    const battleView = document.getElementById('battle-view');
    const playerBattleCard = document.getElementById('player-battle-card');
    const computerBattleCard = document.getElementById('computer-battle-card');
    const resultBanner = document.getElementById('result-banner');
    const resultText = document.getElementById('result-text');
    const playAgainBtn = document.getElementById('play-again-btn');
    const resetBtn = document.getElementById('reset-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const rulesToggleBtn = document.getElementById('rules-toggle-btn');
    const rulesModal = document.getElementById('rules-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const historyList = document.getElementById('history-list');
    const levelPill = document.getElementById('level-pill');
    const roundPill = document.getElementById('round-pill');
    const levelMessage = document.getElementById('level-message');
    const statusPill = document.getElementById('status-pill');
    const progressBar = document.getElementById('level-progress-bar');
    
    const playerScoreVal = document.getElementById('player-score');
    const tieScoreVal = document.getElementById('tie-score');
    const computerScoreVal = document.getElementById('computer-score');
    
    const choiceCards = document.querySelectorAll('.choice-card');



    // Add hover audio trigger to all interactive cards/buttons
    const hoverElements = [...choiceCards, playAgainBtn, resetBtn, soundToggleBtn, rulesToggleBtn, closeModalBtn, enterArenaBtn, backToLevelsBtn];
    hoverElements.forEach(elem => {
        if (elem) {
            elem.addEventListener('mouseenter', () => synth.playHover());
        }
    });

    function updateLevelInterface(data) {
        if (!data) return;
        const levelNumber = data.level || 1;
        const roundNumber = data.round_number || 0;
        const roundLimit = data.round_limit || 5;
        if (levelPill) levelPill.innerText = `LEVEL ${levelNumber} / 20`;
        if (roundPill) roundPill.innerText = `ROUND ${roundNumber} / 5`;
        if (levelMessage) levelMessage.innerText = data.message || 'Choose your weapon and start the best-of-5 showdown.';
        if (statusPill) {
            const statusMap = {
                cleared: 'LEVEL CLEARED',
                failed: 'RETRY LEVEL',
                locked: 'LEVEL LOCKED',
                playing: 'ACTIVE MATCH'
            };
            statusPill.innerText = statusMap[data.level_status] || 'READY';
        }
        if (progressBar) {
            const percent = Math.round((roundNumber / roundLimit) * 100);
            progressBar.style.width = `${percent}%`;
        }
    }

    // Landing Screen Events
    if (enterArenaBtn) {
        enterArenaBtn.addEventListener('click', () => {
            synth.playWin(); // Play a nice start sound
            
            // Transition Three.js camera
            transitionToArena();

            // UI fades
            landingScreen.classList.remove('active-screen');
            landingScreen.classList.add('hidden-screen');
            
            setTimeout(() => {
                gameContainer.classList.remove('hidden-screen');
                gameContainer.classList.add('active-screen');
            }, 300); // Wait for transition
        });
    }

    async function syncGameState() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) return;
            const data = await response.json();

            if (data.score) {
                playerScoreVal.innerText = data.score.win;
                tieScoreVal.innerText = data.score.tie;
                computerScoreVal.innerText = data.score.lose;
            }

            updateMatchLogUI(data.history);
            updateLevelInterface({
                level: data.level,
                round_number: data.round_number || 0,
                round_limit: data.round_limit || 5,
                level_status: data.level_status || 'playing',
                message: data.message || 'Choose your weapon and start the best-of-5 showdown.'
            });

            // Dynamically render levels grid on statistics sync
            renderLevelsMap(data.level, data.unlocked_level);
        } catch (e) {
            console.warn('Game state sync skipped:', e);
        }
    }

    // Handle Choice Selection Click
    choiceCards.forEach(card => {
        card.addEventListener('click', () => {
            const playerChoice = card.getAttribute('data-choice');
            triggerGameRound(playerChoice);
        });
    });

    // Game loop orchestrator
    async function triggerGameRound(playerChoice) {
        synth.playClick();
        
        // 1. Disable grid interactions
        choiceCards.forEach(c => c.style.pointerEvents = 'none');

        // 2. Hide choices layout, reveal battle showdown layout
        choiceView.classList.remove('active-view');
        choiceView.classList.add('inactive-view');
        battleView.classList.remove('inactive-view');
        battleView.classList.add('active-view');

        // Reset battle state visually (placeholder question marks)
        playerBattleCard.innerHTML = `<div class="card-glow"></div><div class="card-inner"><span class="card-symbol">?</span></div>`;
        computerBattleCard.innerHTML = `<div class="card-glow"></div><div class="card-inner"><span class="card-symbol">?</span></div>`;
        playerBattleCard.className = 'battle-card placeholder';
        computerBattleCard.className = 'battle-card placeholder';
        resultBanner.className = 'result-banner';
        resultText.innerText = 'FIGHT!';
        playAgainBtn.style.display = 'none';

        try {
            // 3. Post game request to Flask API
            const response = await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice: playerChoice })
            });

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            
            // 4. Run synchronized animations
            executeBattleAnimations(playerChoice, data.computer_choice, data.result, data.score, data.history, data.level_status, data.message);
            updateLevelInterface(data);
            
        } catch (error) {
            console.error('Error during game play:', error);
            // Fallback UI reset
            alert('Something went wrong! Returning to select screen.');
            resetToChoiceSelection();
        }
    }

    // Animation sequences
    function executeBattleAnimations(playerChoice, computerChoice, result, scores, history, levelStatus = 'playing', message = '') {
        
        // Timeline:
        // T+0ms: Player choice card flies in from left.
        setTimeout(() => {
            playerBattleCard.className = `battle-card player-slide-in ${playerChoice}-theme`;
            playerBattleCard.innerHTML = `<div class="card-glow"></div><div class="card-inner">${SVGs[playerChoice]}</div>`;
            synth.playHover();
        }, 300);

        // T+600ms: Computer choice card flies in from right.
        setTimeout(() => {
            computerBattleCard.className = `battle-card computer-slide-in ${computerChoice}-theme`;
            computerBattleCard.innerHTML = `<div class="card-glow"></div><div class="card-inner">${SVGs[computerChoice]}</div>`;
            synth.playHover();
        }, 900);

        // T+1000ms: Trigger character visual battle animations
        setTimeout(() => {
            triggerBattleEffects(playerChoice, computerChoice, result);
        }, 1000);

        // T+1500ms: Collision animation of cards + impact audio.
        setTimeout(() => {
            playerBattleCard.classList.remove('player-slide-in');
            computerBattleCard.classList.remove('computer-slide-in');
            
            playerBattleCard.classList.add('collide-left');
            computerBattleCard.classList.add('collide-right');
            
            synth.playCollide();
        }, 1500);

        // T+1900ms: Show result banner, update score, trigger result audio.
        setTimeout(() => {
            // Apply banner styles
            if (levelStatus === 'cleared') {
                resultBanner.className = 'result-banner show result-win';
                resultText.innerText = 'CONGRATULATIONS! YOU WON THIS LEVEL';
                synth.playWin();
                animateScoreBump('player');
                playAgainBtn.innerHTML = '<span>NEXT LEVEL</span><div class="btn-glow"></div>';
            } else if (levelStatus === 'failed') {
                resultBanner.className = 'result-banner show result-lose';
                resultText.innerText = 'BAD LUCK! TRY THIS LEVEL AGAIN';
                synth.playLose();
                animateScoreBump('computer');
                playAgainBtn.innerHTML = '<span>RETRY LEVEL</span><div class="btn-glow"></div>';
            } else {
                resultBanner.className = `result-banner show result-${result}`;
                if (result === 'win') {
                    resultText.innerText = 'YOU WIN!';
                    synth.playWin();
                    animateScoreBump('player');
                } else if (result === 'lose') {
                    resultText.innerText = 'YOU LOSE!';
                    synth.playLose();
                    animateScoreBump('computer');
                } else {
                    resultText.innerText = "IT'S A TIE!";
                    synth.playTie();
                    animateScoreBump('tie');
                }
                playAgainBtn.innerHTML = '<span>PLAY AGAIN</span><div class="btn-glow"></div>';
            }

            // Update scores
            playerScoreVal.innerText = scores.win;
            tieScoreVal.innerText = scores.tie;
            computerScoreVal.innerText = scores.lose;

            // Render Match Logs
            updateMatchLogUI(history);

            // Show "Play Again" button
            playAgainBtn.style.display = 'block';
            playAgainBtn.focus();
        }, 1900);
    }

    // Animate Score Bump
    function animateScoreBump(side) {
        const parentCard = document.querySelector(`.${side}-score-card`);
        if (parentCard) {
            parentCard.classList.add('score-bump');
            setTimeout(() => {
                parentCard.classList.remove('score-bump');
            }, 500);
        }
    }

    // Update match history logs UI
    function updateMatchLogUI(history) {
        if (!history || history.length === 0) {
            historyList.innerHTML = `<li class="empty-history">No rounds played yet. Make a move!</li>`;
            return;
        }

        historyList.innerHTML = '';
        history.forEach(round => {
            const li = document.createElement('li');
            
            // Format choices names capitalization
            const pChoice = round.player.charAt(0).toUpperCase() + round.player.slice(1);
            const cChoice = round.computer.charAt(0).toUpperCase() + round.computer.slice(1);
            
            // Create result badge text and styles
            let badgeText = 'Tie';
            let badgeClass = 'badge-tie';
            if (round.result === 'win') {
                badgeText = 'Win';
                badgeClass = 'badge-win';
            } else if (round.result === 'lose') {
                badgeText = 'Lose';
                badgeClass = 'badge-lose';
            }

            li.innerHTML = `
                <div>
                    <span class="history-round">Round ${round.round}</span>
                    <span class="history-choices">${pChoice} vs ${cChoice}</span>
                </div>
                <span class="badge ${badgeClass}">${badgeText}</span>
            `;
            historyList.appendChild(li);
        });
    }

    // Helpers to create Battle Effect elements HTML
    function createSnakeHTML(side) {
        return `
            <div class="animated-snake ${side}-side">
                <div class="snake-body-container">
                    <div class="snake-segment head">
                        <div class="snake-eye left"></div>
                        <div class="snake-eye right"></div>
                        <div class="snake-tongue"></div>
                    </div>
                    <div class="snake-segment"></div>
                    <div class="snake-segment"></div>
                    <div class="snake-segment"></div>
                    <div class="snake-segment"></div>
                    <div class="snake-segment"></div>
                </div>
            </div>
        `;
    }

    function createGunHTML(side) {
        return `
            <div class="animated-gun ${side}-side">
                <div class="gun-model">
                    <div class="gun-barrel-extension"></div>
                    <div class="gun-grip"></div>
                    <div class="gun-trigger-guard"></div>
                    <div class="gun-muzzle-flash"></div>
                </div>
                <div class="fire-projectiles-container"></div>
            </div>
        `;
    }

    function createWaterHTML(side) {
        return `
            <div class="animated-water ${side}-side">
                <div class="water-orb">
                    <div class="water-ring r1"></div>
                    <div class="water-ring r2"></div>
                    <div class="water-ring r3"></div>
                </div>
                <div class="water-splash-container"></div>
            </div>
        `;
    }

    // Spawn visual effect elements inside the overlay and play timing animations
    function triggerBattleEffects(player, computer, result) {
        const overlay = document.getElementById('battle-effects-overlay');
        if (!overlay) return;
        overlay.innerHTML = '';

        // 1. Spawn player visual
        let playerHTML = '';
        if (player === 'snake') playerHTML = createSnakeHTML('player');
        else if (player === 'gun') playerHTML = createGunHTML('player');
        else if (player === 'water') playerHTML = createWaterHTML('player');

        // 2. Spawn computer visual
        let computerHTML = '';
        if (computer === 'snake') computerHTML = createSnakeHTML('computer');
        else if (computer === 'gun') computerHTML = createGunHTML('computer');
        else if (computer === 'water') computerHTML = createWaterHTML('computer');

        overlay.innerHTML = playerHTML + computerHTML;

        // Get DOM references of spawned elements
        const playerEl = overlay.querySelector('.player-side');
        const computerEl = overlay.querySelector('.computer-side');

        // Helper: spawn fireballs flying from gun
        function shootFireballs(gunEl, side) {
            const flash = gunEl.querySelector('.gun-muzzle-flash');
            const projContainer = gunEl.querySelector('.fire-projectiles-container');
            if (!flash || !projContainer) return;

            gunEl.classList.add('gun-recoil');
            flash.classList.add('shoot');

            const targetX = side === 'player' ? 240 : -240;
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const fb = document.createElement('div');
                    fb.className = 'fire-projectile';
                    fb.style.setProperty('--tx', `${targetX}px`);
                    fb.style.setProperty('--ty', `${(Math.random() - 0.5) * 45}px`);
                    fb.style.top = '10px';
                    fb.style.left = side === 'player' ? '70px' : '-10px';
                    projContainer.appendChild(fb);
                    setTimeout(() => fb.remove(), 450);
                }, i * 100);
            }
        }

        // Helper: spawn water splash
        function splashWater(waterEl, side) {
            const splashContainer = waterEl.querySelector('.water-splash-container');
            if (!splashContainer) return;

            const targetXDir = side === 'player' ? 1 : -1;
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    const drop = document.createElement('div');
                    drop.className = 'water-splash-drop';
                    const dx = targetXDir * (120 + Math.random() * 120);
                    const dy = (Math.random() - 0.5) * 70;
                    const sz = 0.5 + Math.random() * 0.7;
                    const rt = Math.random() * 360;

                    drop.style.setProperty('--dx', `${dx}px`);
                    drop.style.setProperty('--dy', `${dy}px`);
                    drop.style.setProperty('--sz', sz);
                    drop.style.setProperty('--rt', `${rt}deg`);

                    drop.style.left = '35px';
                    drop.style.top = '35px';

                    const sizeVal = 6 + Math.random() * 10;
                    drop.style.width = `${sizeVal}px`;
                    drop.style.height = `${sizeVal * 1.3}px`;

                    splashContainer.appendChild(drop);
                    setTimeout(() => drop.remove(), 550);
                }, i * 20);
            }
        }

        // Helper: short circuit sparks
        function triggerGunSparks(gunEl) {
            const gunModel = gunEl.querySelector('.gun-model');
            if (!gunModel) return;
            for (let i = 0; i < 12; i++) {
                setTimeout(() => {
                    const spark = document.createElement('div');
                    spark.className = 'gun-spark';
                    const dx = (Math.random() - 0.5) * 50;
                    const dy = (Math.random() - 0.5) * 50;
                    spark.style.setProperty('--dx', `${dx}px`);
                    spark.style.setProperty('--dy', `${dy}px`);
                    spark.style.left = '30px';
                    spark.style.top = '15px';
                    gunModel.appendChild(spark);
                    setTimeout(() => spark.remove(), 400);
                }, i * 35);
            }
        }

        // Coordinate battle animation events
        setTimeout(() => {
            if (player === 'snake' && playerEl) {
                playerEl.classList.add('snake-attack');
            } else if (player === 'gun' && playerEl) {
                shootFireballs(playerEl, 'player');
            } else if (player === 'water' && playerEl) {
                splashWater(playerEl, 'player');
            }

            if (computer === 'snake' && computerEl) {
                computerEl.classList.add('snake-attack');
            } else if (computer === 'gun' && computerEl) {
                shootFireballs(computerEl, 'computer');
            } else if (computer === 'water' && computerEl) {
                splashWater(computerEl, 'computer');
            }
        }, 200);

        // Perform impact damage response
        setTimeout(() => {
            if (result === 'win') {
                if (playerEl) playerEl.classList.add('success-glow');
                if (computerEl) {
                    computerEl.classList.add('hit-shake');
                    if (computer === 'snake') {
                        setTimeout(() => computerEl.classList.add('dissolve'), 200);
                    } else if (computer === 'gun') {
                        setTimeout(() => {
                            computerEl.classList.add('rusted-gun');
                            triggerGunSparks(computerEl);
                        }, 100);
                    } else if (computer === 'water') {
                        const rings = computerEl.querySelectorAll('.water-ring');
                        rings.forEach(r => {
                            r.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                            r.style.transform = 'scale(0)';
                            r.style.opacity = '0';
                        });
                    }
                }
            } else if (result === 'lose') {
                if (computerEl) computerEl.classList.add('success-glow');
                if (playerEl) {
                    playerEl.classList.add('hit-shake');
                    if (player === 'snake') {
                        setTimeout(() => playerEl.classList.add('dissolve'), 200);
                    } else if (player === 'gun') {
                        setTimeout(() => {
                            playerEl.classList.add('rusted-gun');
                            triggerGunSparks(playerEl);
                        }, 100);
                    } else if (player === 'water') {
                        const rings = playerEl.querySelectorAll('.water-ring');
                        rings.forEach(r => {
                            r.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                            r.style.transform = 'scale(0)';
                            r.style.opacity = '0';
                        });
                    }
                }
            } else {
                if (playerEl) playerEl.classList.add('hit-shake');
                if (computerEl) computerEl.classList.add('hit-shake');
            }
        }, 550);
    }



    // Render Levels Grid Map
    function renderLevelsMap(currentLevel, unlockedLevel) {
        if (!levelsGrid) return;
        levelsGrid.innerHTML = '';

        for (let i = 1; i <= 20; i++) {
            const levelNode = document.createElement('div');
            
            // Determine status and classes
            let statusText = 'Locked';
            let statusClass = 'locked';
            
            if (i === currentLevel) {
                statusClass = 'current';
                statusText = 'Active';
            } else if (i < unlockedLevel) {
                statusClass = 'cleared';
                statusText = 'Cleared ✓';
            } else if (i === unlockedLevel) {
                statusClass = 'unlocked';
                statusText = 'Unlocked';
            }

            levelNode.className = `level-node ${statusClass}`;
            
            levelNode.innerHTML = `
                <span class="level-node-num">${i}</span>
                <span class="level-node-status">${statusText}</span>
            `;

            // If unlocked/cleared/current, make it clickable
            if (statusClass !== 'locked') {
                levelNode.addEventListener('click', async () => {
                    synth.playClick();
                    try {
                        const response = await fetch('/api/select-level', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ level: i })
                        });

                        if (!response.ok) throw new Error('API select level failed');
                        const data = await response.json();
                        
                        // Sync state with selected level data
                        await syncGameState();
                        
                        // Switch views to play choice view
                        levelsView.classList.remove('active-view');
                        levelsView.classList.add('inactive-view');
                        choiceView.classList.remove('inactive-view');
                        choiceView.classList.add('active-view');
                    } catch (err) {
                        console.error('Error selecting level:', err);
                        alert('Could not enter the level. Please try again.');
                    }
                });
                
                // Add hover audio trigger
                levelNode.addEventListener('mouseenter', () => synth.playHover());
            } else {
                levelNode.innerHTML = `
                    <span class="level-node-num">🔒</span>
                    <span class="level-node-status">${statusText}</span>
                `;
            }

            levelsGrid.appendChild(levelNode);
        }
    }

    // Reset back to choice select screen
    function resetToChoiceSelection() {
        battleView.classList.remove('active-view');
        battleView.classList.add('inactive-view');
        choiceView.classList.remove('inactive-view');
        choiceView.classList.add('active-view');
        // Re-enable grid interactions
        choiceCards.forEach(c => c.style.pointerEvents = 'auto');
        
        // Remove collision classes
        playerBattleCard.classList.remove('collide-left');
        computerBattleCard.classList.remove('collide-right');

        // Clear active battle visual effects
        const effectsOverlay = document.getElementById('battle-effects-overlay');
        if (effectsOverlay) effectsOverlay.innerHTML = '';
    }

    // Play Again event
    playAgainBtn.addEventListener('click', () => {
        synth.playClick();
        resetToChoiceSelection();
    });

    // Back to levels event
    if (backToLevelsBtn) {
        backToLevelsBtn.addEventListener('click', () => {
            synth.playClick();
            choiceView.classList.remove('active-view');
            choiceView.classList.add('inactive-view');
            levelsView.classList.remove('inactive-view');
            levelsView.classList.add('active-view');
            syncGameState();
        });
    }

    // Reset Scores & Server state event
    resetBtn.addEventListener('click', async () => {
        synth.playClick();
        if (confirm('Are you sure you want to reset all scoreboard stats and logs?')) {
            try {
                const response = await fetch('/api/reset', { method: 'POST' });
                if (!response.ok) throw new Error('API Reset request failed');
                const data = await response.json();

                playerScoreVal.innerText = data.score.win;
                tieScoreVal.innerText = data.score.tie;
                computerScoreVal.innerText = data.score.lose;
                updateLevelInterface(data);
                
                updateMatchLogUI(data.history);
                synth.playWin();
            } catch (error) {
                console.error(error);
                alert('Failed to reset score server side.');
            }
        }
    });

    // Sound toggle event
    soundToggleBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        synth.toggle(!isMuted);
        
        if (isMuted) {
            soundToggleBtn.querySelector('span').innerText = 'SOUND: OFF';
            document.getElementById('sound-waves').style.opacity = '0.2';
        } else {
            soundToggleBtn.querySelector('span').innerText = 'SOUND: ON';
            document.getElementById('sound-waves').style.opacity = '1';
            synth.playClick();
        }
    });

    // Rules Modal events
    rulesToggleBtn.addEventListener('click', () => {
        synth.playClick();
        rulesModal.classList.add('open');
    });

    closeModalBtn.addEventListener('click', () => {
        synth.playClick();
        rulesModal.classList.remove('open');
    });

    // Close modal if clicked outside content
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) {
            synth.playClick();
            rulesModal.classList.remove('open');
        }
    });

    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && rulesModal.classList.contains('open')) {
            synth.playClick();
            rulesModal.classList.remove('open');
        }
    });

    syncGameState();
});
