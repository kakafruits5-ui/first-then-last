const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const controllerStatus = document.getElementById("controller-status");

const playerSprite = document.getElementById("player-sprite");

// --- SPRITE SHEET CONFIGURATION ---
const spriteConfig = {
    spriteWidth: 16,  
    spriteHeight: 16, 
    idleSideRow: 1,   // Row 2: Idle side
    runSideRow: 4,    // Row 5: Run side
    frameX: 0,
    maxFrames: 3,     
    gameFrame: 0,
    staggerFrames: 8  
};

let keys = {};

const player = {
    x: 50,
    y: 300,
    width: 36,  // Scaled up cleanly for visibility
    height: 36,
    vx: 0,
    vy: 0,
    speed: 4.5,
    gravity: 0.55,
    jumpStrength: -10.5,
    isGrounded: false,
    jumpCount: 0,     // Tracks double jumps
    maxJumps: 2,
    facing: "right",
    state: "idle"
};

let platforms = [];
let trees = [];

function generateEnvironment() {
    platforms = [];
    trees = [];

    // Background trees
    for (let i = 0; i < 15; i++) {
        trees.push({
            x: Math.random() * canvas.width,
            y: 450,
            height: 100 + Math.random() * 150,
            width: 30 + Math.random() * 40,
            color: `rgba(20, ${50 + Math.random() * 30}, 40, 0.7)`
        });
    }

    // Ground and platforms
    platforms.push({ x: 0, y: 450, width: canvas.width, height: 50 });
    platforms.push({ x: 200, y: 350, width: 120, height: 20 });
    platforms.push({ x: 400, y: 250, width: 120, height: 20 });
    platforms.push({ x: 600, y: 150, width: 120, height: 20 });
}

window.addEventListener("keydown", (e) => keys[e.code] = true);
window.addEventListener("keyup", (e) => keys[e.code] = false);

function processInputs() {
    player.vx = 0;
    let jumpPressed = false;

    const gamepads = navigator.getGamepads();
    if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        controllerStatus.textContent = "🎮 Controller: Connected";
        controllerStatus.style.color = "#44ff88";

        if (gp.axes[0] < -0.25 || gp.buttons[14]?.pressed) { player.vx = -player.speed; }
        if (gp.axes[0] > 0.25 || gp.buttons[15]?.pressed) { player.vx = player.speed; }
        if (gp.buttons[0]?.pressed && !player.jumpKeyPressed) { 
            jumpPressed = true; 
            player.jumpKeyPressed = true;
        }
        if (!gp.buttons[0]?.pressed) { player.jumpKeyPressed = false; }
    } else {
        controllerStatus.textContent = "🎮 Controller: Disconnected (Use A/D & Space)";
        controllerStatus.style.color = "#779988";
    }

    if (keys["ArrowLeft"] || keys["KeyA"]) { player.vx = -player.speed; }
    if (keys["ArrowRight"] || keys["KeyD"]) { player.vx = player.speed; }
    
    // Key press handler with debounce to prevent holding jump for infinite flight
    let currentJumpKey = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];
    if (currentJumpKey && !player.jumpKeyPressed) {
        jumpPressed = true;
        player.jumpKeyPressed = true;
    }
    if (!currentJumpKey) {
        player.jumpKeyPressed = false;
    }

    // --- DOUBLE JUMP LOGIC ---
    if (jumpPressed) {
        if (player.isGrounded) {
            player.vy = player.jumpStrength;
            player.isGrounded = false;
            player.jumpCount = 1;
        } else if (player.jumpCount < player.maxJumps) {
            player.vy = player.jumpStrength * 0.95; // Second mid-air boost
            player.jumpCount = 2;
        }
    }

    // Animation state update
    if (player.vx > 0) {
        player.facing = "right";
        player.state = "run";
    } else if (player.vx < 0) {
        player.facing = "left";
        player.state = "run";
    } else {
        player.state = "idle";
    }
}

function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function updatePhysics() {
    // X Axis Movement & Collision
    player.x += player.vx;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    for (let plat of platforms) {
        if (isColliding(player, plat)) {
            if (player.vx > 0) player.x = plat.x - player.width;
            if (player.vx < 0) player.x = plat.x + plat.width;
            player.vx = 0;
        }
    }

    // Y Axis Movement & Collision
    player.vy += player.gravity;
    player.y += player.vy;
    player.isGrounded = false;

    if (player.y > canvas.height) {
        player.x = 50;
        player.y = 300;
        player.vy = 0;
        player.jumpCount = 0;
    }

    for (let plat of platforms) {
        if (isColliding(player, plat)) {
            if (player.vy > 0) {
                player.y = plat.y - player.height;
                player.isGrounded = true;
                player.jumpCount = 0; // Reset double jump on landing
            } else if (player.vy < 0) {
                player.y = plat.y + plat.height;
            }
            player.vy = 0;
        }
    }
}

function updateAnimation() {
    spriteConfig.maxFrames = player.state === "run" ? 4 : 3;

    if (spriteConfig.gameFrame % spriteConfig.staggerFrames === 0) {
        if (spriteConfig.frameX < spriteConfig.maxFrames - 1) {
            spriteConfig.frameX++;
        } else {
            spriteConfig.frameX = 0;
        }
    }
    spriteConfig.gameFrame++;
}

function drawGameScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Trees
    trees.forEach(tree => {
        ctx.fillStyle = tree.color;
        ctx.beginPath();
        ctx.moveTo(tree.x, tree.y);
        ctx.lineTo(tree.x + (tree.width / 2), tree.y - tree.height);
        ctx.lineTo(tree.x + tree.width, tree.y);
        ctx.fill();
        ctx.closePath();
    });

    // 2. Draw Platforms
    platforms.forEach(plat => {
        ctx.fillStyle = "#334c40";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#44ff88"; 
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });

    // 3. Draw Animated Player (Transparent White Background Fix via 'multiply')
    let currentRow = player.state === "run" ? spriteConfig.runSideRow : spriteConfig.idleSideRow;

    if (playerSprite.complete && playerSprite.naturalWidth !== 0) {
        ctx.save();
        let destX = player.x;
        let destY = player.y;

        if (player.facing === "left") {
            ctx.scale(-1, 1);
            destX = -player.x - player.width;
        }

        // 'multiply' blend mode forces the solid white background of the sprite sheet to become invisible
        ctx.globalCompositeOperation = 'multiply';

        ctx.drawImage(
            playerSprite, 
            spriteConfig.frameX * spriteConfig.spriteWidth, 
            currentRow * spriteConfig.spriteHeight, 
            spriteConfig.spriteWidth, 
            spriteConfig.spriteHeight, 
            destX, 
            destY, 
            player.width, 
            player.height
        );
        ctx.restore();
    } else {
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function mainGameCycle() {
    processInputs();
    updatePhysics();
    updateAnimation();
    drawGameScene();
    requestAnimationFrame(mainGameCycle);
}

window.onload = function() {
    generateEnvironment();
    mainGameCycle();
};
