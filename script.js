const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelDisplay = document.getElementById("level-display");
const storySubtext = document.getElementById("story-subtext");
const controllerStatus = document.getElementById("controller-status");
const cutsceneOverlay = document.getElementById("cutscene-overlay");

// Core System State Management Variables
let currentLevel = 1;
const maxLevels = 50;
let gameState = "PLAYING"; // Alternative states: "CUTSCENE", "END_SCREEN"
let keys = {};
let xButtonPressed = false;

// Entities & Map Arrays
let platforms = [];
let hazards = []; // Spike hazards
let enemies = [];
let particles = [];

// Player Physics Configuration
const player = {
    x: 50,
    y: 400,
    width: 20,
    height: 28,
    vx: 0,
    vy: 0,
    speed: 5,
    gravity: 0.55,
    jumpStrength: -12.5,
    isGrounded: false,
    color: "#00ffff",
    isAttacking: false,
    attackTimer: 0,
    facing: "right" // Used to direct slash box range bounds
};

// Portal Destination Gate Object
const portal = { x: 750, y: 400, width: 25, height: 45 };

// Sad Story Script Text Prompts per progression milestone
const storyTimelineTexts = {
    1: "I have to hurry... they said the departure gate is at the highest terrace.",
    5: "The shadows are lengthening. My legs feel like lead, but stopping isn't an option.",
    15: "I can hear distant engines warming up. Please... wait for me. Just hold on.",
    30: "Everything hurts. The mistakes of my past feel like heavy iron chains dragging me back.",
    45: "I can see the final summit platform ahead. I'm almost there. I will make it. I have to..."
};

// Procedural Generation Algorithm for levels 1-49
function loadLevel(levelNum) {
    platforms = [];
    hazards = [];
    enemies = [];
    particles = [];
    
    // Reset player position safely back to starting ground zone
    player.x = 40;
    player.y = 350;
    player.vx = 0;
    player.vy = 0;

    // Direct Level Progression Text Updates
    levelDisplay.textContent = `FLOOR: ${levelNum} / 50`;
    if (storyTimelineTexts[levelNum]) {
        storySubtext.textContent = `"${storyTimelineTexts[levelNum]}"`;
    }

    // --- SCENARIO A: LOAD FINAL DRAMATIC ENDING ROAD ---
    if (levelNum === maxLevels) {
        storySubtext.textContent = `"The summit. I see the edge... but why is it so quiet?"`;
        // Level 50 is a simple path ending in a sheer drop cliff layout
        platforms.push({ x: 0, y: 450, width: 550, height: 50, color: "#161622" }); // Long road ending at x=550
        portal.x = -999; // Remove the victory portal entirely
        return;
    }

    // --- SCENARIO B: PROCEDURAL BUILD MODES (LEVELS 1-49) ---
    // Always build baseline standard start floor
    platforms.push({ x: 0, y: 460, width: 120, height: 40, color: "#1a1a26" });
    
    let currentX = 100;
    let currentY = 430;
    
    // Generate step paths moving horizontally across screen coordinates
    while (currentX < 680) {
        let platWidth = Math.max(80, 160 - (levelNum * 1.5)); // Platforms shrink as level scales up
        let gap = Math.min(130, 75 + (levelNum * 1.2));       // Gaps widen out wider
        let yChange = (Math.random() - 0.5) * 110;
        
        currentY = Math.max(180, Math.min(430, currentY + yChange));
        currentX += gap;

        platforms.push({
            x: currentX,
            y: currentY,
            width: platWidth,
            height: 15,
            color: "#222233"
        });

        // Add danger spikes onto middle platform surfaces based on current floor difficulty
        if (levelNum > 3 && Math.random() < 0.35) {
            hazards.push({
                x: currentX + (platWidth / 2) - 10,
                y: currentY - 10,
                width: 20,
                height: 10
            });
        }

        // Spawn dynamic walking patrol guard enemies
        if (levelNum > 1 && Math.random() < 0.45) {
            enemies.push({
                x: currentX + 5,
                y: currentY - 20,
                width: 16,
                height: 20,
                vx: (Math.random() > 0.5 ? 1 : -1) * (1 + (levelNum * 0.05)),
                leftBound: currentX,
                rightBound: currentX + platWidth - 16
            });
        }
        
        currentX += platWidth;
    }

    // Build final exit ledge anchor
    platforms.push({ x: 700, y: 440, width: 100, height: 60, color: "#1a1a26" });
    portal.x = 740;
    portal.y = 395;
}

// Global Hardware input event listeners (Keyboard)
window.addEventListener("keydown", (e) => keys[e.code] = true);
window.addEventListener("keyup", (e) => keys[e.code] = false);

// Process Controller Hardware Mappings
function processInputs() {
    if (gameState !== "PLAYING") return; // Absolute cutoff rule during cutscenes

    // Reset default running momentum vectors
    player.vx = 0;

    const gamepads = navigator.getGamepads();
    let padConnected = false;

    if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        padConnected = true;

        controllerStatus.textContent = "🎮 Xbox Controller: Ready";
        controllerStatus.style.color = "#00ffcc";

        // Left Analog Stick Processing Axis 0
        if (gp.axes[0] < -0.25) {
            player.vx = -player.speed;
            player.facing = "left";
        } else if (gp.axes[0] > 0.25) {
            player.vx = player.speed;
            player.facing = "right";
        }

        // Alternative D-Pad Inputs Checking Buttons 14/15
        if (gp.buttons[14].pressed) { player.vx = -player.speed; player.facing = "left"; }
        if (gp.buttons[15].pressed) { player.vx = player.speed; player.facing = "right"; }

        // Button A Action (Index 0) -> Perform Jump Mechanics
        if (gp.buttons[0].pressed && player.isGrounded) {
            player.vy = player.jumpStrength;
            player.isGrounded = false;
        }

        // Button X Action (Index 2) -> Trigger Attack Slash Box Burst
        if (gp.buttons[2].pressed) {
            if (!xButtonPressed && !player.isAttacking) {
                player.isAttacking = true;
                player.attackTimer = 8; // Animation frames durability counter
                xButtonPressed = true;
            }
        } else {
            xButtonPressed = false; // Reset toggle check tracking
        }
    }

    if (!padConnected) {
        controllerStatus.textContent = "🎮 Xbox Controller: Disconnected";
        controllerStatus.style.color = "#666677";
    }

    // Fallback Keyboard Inputs Layer Processing
    if (keys["ArrowLeft"] || keys["KeyA"]) { player.vx = -player.speed; player.facing = "left"; }
    if (keys["ArrowRight"] || keys["KeyD"]) { player.vx = player.speed; player.facing = "right"; }
    
    if ((keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) && player.isGrounded) {
        player.vy = player.jumpStrength;
        player.isGrounded = false;
    }

    if (keys["KeyF"] && !player.isAttacking) {
        player.isAttacking = true;
        player.attackTimer = 8;
    }
}

// Main Core Platformer Physics Loop Calculation Frame Step
function updatePhysics() {
    if (gameState === "PLAYING") {
        player.vy += player.gravity;
        player.x += player.vx;
        player.y += player.vy;

        // Keep player wrapped within basic viewport boundaries
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

        // Map Fall out pits boundary condition checks
        if (player.y > canvas.height) {
            loadLevel(currentLevel); // Reset current level state
            return;
        }

        player.isGrounded = false;

        // Perform Solid platforms physical intersection calculations
        platforms.forEach(plat => {
            if (
                player.x < plat.x + plat.width &&
                player.x + player.width > plat.x &&
                player.y < plat.y + plat.height &&
                player.y + player.height > plat.y
            ) {
                if (player.vy > 0 && (player.y + player.height - player.vy) <= plat.y) {
                    player.y = plat.y - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                }
            }
        });

        // Spike Hazard instant-kill checks
        hazards.forEach(spike => {
            if (
                player.x < spike.x + spike.width &&
                player.x + player.width > spike.x &&
                player.y < spike.y + spike.height &&
                player.y + player.height > spike.y
            ) {
                loadLevel(currentLevel); // Reset
            }
        });

        // Combat Mechanics & Attack hitbox calculations
        if (player.isAttacking) {
            player.attackTimer--;
            
            // Project the dangerous attack slash box forward based on player orientation direction
            let slashX = player.facing === "right" ? player.x + player.width : player.x - 25;
            let slashY = player.y - 2;
            let slashW = 25;
            let slashH = player.height + 4;

            // Check if attack hitbox cuts down active enemies list elements
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (slashX < e.x + e.width && slashX + slashW > e.x && slashY < e.y + e.height && slashY + slashH > e.y) {
                    // Create explosion particles upon enemy destruction
                    for (let p=0; p<8; p++) {
                        particles.push({
                            x: e.x + 8, y: e.y + 10,
                            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                            life: 15, color: "#ff3366"
                        });
                    }
                    enemies.splice(i, 1); // Delete Enemy from game list array instance
                }
            }

            if (player.attackTimer <= 0) player.isAttacking = false;
        }

        // Process Enemy AI patrols and damage touch sequences
        enemies.forEach(e => {
            e.x += e.vx;
            if (e.x <= e.leftBound || e.x >= e.rightBound) {
                e.vx *= -1; // Reverse course execution vectors
            }

            // Player touches enemy without attacking -> instant respawn reset
            if (
                player.x < e.x + e.width &&
                player.x + player.width > e.x &&
                player.y < e.y + e.height &&
                player.y + player.height > e.y
            ) {
                loadLevel(currentLevel);
            }
        });

        // Check level completion portal gates intersection metrics
        if (
            currentLevel < maxLevels &&
            player.x < portal.x + portal.width &&
            player.x + player.width > portal.x &&
            player.y < portal.y + portal.height &&
            player.y + player.height > portal.y
        ) {
            currentLevel++;
            loadLevel(currentLevel);
        }

        // --- ENGINE CUTSCENE INITIALIZATION TRIGGER (LEVEL 50) ---
        // Once the player approaches the edge of the final cliff at x=530
        if (currentLevel === maxLevels && player.x >= 520) {
            gameState = "CUTSCENE";
            cutsceneFrameCount = 0;
        }
    } else if (gameState === "CUTSCENE") {
        runCinematicScript();
    }
}

// Update particle animation tracking lists
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

let cutsceneFrameCount = 0;
// Structured frame timer controlling the scripted terminal failure sequence
function runCinematicScript() {
    cutsceneFrameCount++;

    // Phase 1: Force character to walk right up to the literal edge of the drop off cliff line
    if (player.x < 545) {
        player.x += 0.8;
    } 
    // Phase 2: Player freezes at the edge. Trigger slow dramatic screen blackout text display layers
    else if (cutsceneFrameCount > 60 && cutsceneFrameCount < 240) {
        cutsceneOverlay.classList.add("active");
        cutsceneOverlay.innerHTML = `
            <p style="color: #ffffff; margin-bottom: 15px;">You reached the destination terrace...</p>
            <p style="font-size: 1.1rem; color: #777788;">But the horizon is dark. The escape craft departed 10 minutes ago.</p>
        `;
    } 
    // Phase 3: Character loses hope, steps off the edge, falling straight down into the infinite abyss pit
    else if (cutsceneFrameCount >= 240 && cutsceneFrameCount < 380) {
        cutsceneOverlay.innerHTML = `
            <p style="color: #ff3366;">You were too late.</p>
            <p style="font-size: 1.1rem; color: #777788; margin-top: 10px;">The targets were missed. Everything you fought for is lost.</p>
        `;
        player.x += 0.3; // Walk into air space
        player.vy += 0.25; // Apply accelerating gravity fall rate simulation curves
        player.y += player.vy;
    } 
    // Phase 4: Text Final Epilogue Screen Layout Lock down
    else if (cutsceneFrameCount >= 380) {
        gameState = "END_SCREEN";
        cutsceneOverlay.innerHTML = `
            <h1 style="font-size: 2.5rem; color: #ff3366; margin-bottom: 20px;">FAILURE ACHIEVED</h1>
            <p style="font-size: 1.2rem; color: #bbbbcc; max-width: 600px;">
                The journey meant nothing without the time to save it. You spent your last energy scaling walls that now look out onto an empty world.
            </p>
            <p style="font-size: 0.9rem; color: #444455; margin-top: 40px;">Refresh the browser window tab to restart the cycle.</p>
        `;
    }
}

// Graphic Paint Rendering System Functions
function drawGameScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw solid environment blocks
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeStyle = "#2e2e42";
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    });

    // 2. Draw Crimson Spike Hazards
    ctx.fillStyle = "#ff3355";
    hazards.forEach(s => {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.height);
        ctx.lineTo(s.x + (s.width / 2), s.y);
        ctx.lineTo(s.x + s.width, s.y + s.height);
        ctx.fill();
        ctx.closePath();
    });

    // 3. Draw Wandering Patrol Enemies
    ctx.fillStyle = "#ffaa00";
    enemies.forEach(e => {
        ctx.fillRect(e.x, e.y, e.width, e.height);
    });

    // 4. Draw combat particles bursts
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });

    // 5. Draw Target Goal Level Exit Portals
    if (currentLevel < maxLevels) {
        ctx.fillStyle = "rgba(0, 255, 255, 0.15)";
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.fillRect(portal.x, portal.y, portal.width, portal.height);
        ctx.strokeRect(portal.x, portal.y, portal.width, portal.height);
    }

    // 6. Draw Player Node Entity Box
    if (gameState !== "END_SCREEN") {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Render flashing sword attack swipe radius bounds visuals frame blocks
        if (player.isAttacking) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            let sx = player.facing === "right" ? player.x + player.width : player.x - 25;
            ctx.fillRect(sx, player.y - 2, 25, player.height + 4);
        }
    }
}

// Master Loop Framework Synchronization Orchestrator
function mainGameCycle() {
    processInputs();
    updatePhysics();
    updateParticles();
    drawGameScene();
    requestAnimationFrame(mainGameCycle);
}

// Bootstrap Initialization Trigger Commands
loadLevel(currentLevel);
mainGameCycle();
