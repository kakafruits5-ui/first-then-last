const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const controllerStatus = document.getElementById("controller-status");

// Load the separate left and right animation sheets
const walkLeftImg = new Image();
walkLeftImg.src = "walkleft-removebg-preview.png";

const walkRightImg = new Image();
walkRightImg.src = "walkright-removebg-preview.png";

const animConfig = {
    totalFrames: 3, 
    frameX: 0,
    gameFrame: 0,
    staggerFrames: 8 
};

let keys = {};

const player = {
    x: 50,
    y: 300,
    width: 32,  
    height: 44, 
    vx: 0,
    vy: 0,
    speed: 4.5,
    gravity: 0.55,
    jumpStrength: -10,
    isGrounded: false,
    jumpCount: 0,     // Tracks number of button presses for jumping
    maxJumps: 2,      // Double jump enabled
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
    let controllerJump = false;
    if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        controllerStatus.textContent = "🎮 Controller: Connected";
        controllerStatus.style.color = "#44ff88";

        if (gp.axes[0] < -0.25 || gp.buttons[14]?.pressed) { player.vx = -player.speed; }
        if (gp.axes[0] > 0.25 || gp.buttons[15]?.pressed) { player.vx = player.speed; }
        if (gp.buttons[0]?.pressed) { controllerJump = true; } // Button 'A' on controller
    } else {
        controllerStatus.textContent = "🎮 Controller: Disconnected (Use A/D & Space)";
        controllerStatus.style.color = "#779988";
    }

    if (keys["ArrowLeft"] || keys["KeyA"]) { player.vx = -player.speed; }
    if (keys["ArrowRight"] || keys["KeyD"]) { player.vx = player.speed; }
    
    let keyboardJump = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];
    let rawJumpPressed = keyboardJump || controllerJump;

    // Edge detection so holding the button doesn't trigger continuous flight
    if (rawJumpPressed && !player.jumpKeyPressed) {
        jumpPressed = true;
        player.jumpKeyPressed = true;
    }
    if (!rawJumpPressed) {
        player.jumpKeyPressed = false;
    }

    // --- DOUBLE JUMP LOGIC (Press 2 times total) ---
    if (jumpPressed) {
        if (player.isGrounded) {
            player.vy = player.jumpStrength;
            player.isGrounded = false;
            player.jumpCount = 1; // First press (Ground jump)
        } else if (player.jumpCount < player.maxJumps) {
            player.vy = player.jumpStrength * 0.95; // Second press (Mid-air double jump)
            player.jumpCount = 2; // Reached max allowed jumps
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
                player.y = plat.y - plat.height;
                player.isGrounded = true;
                player.jumpCount = 0; // Reset jumps on landing
            } else if (player.vy < 0) {
                player.y = plat.y + plat.height;
            }
            player.vy = 0;
        }
    }
}

function updateAnimation() {
    if (player.state === "run") {
        if (animConfig.gameFrame % animConfig.staggerFrames === 0) {
            animConfig.frameX = (animConfig.frameX + 1) % animConfig.totalFrames;
        }
        animConfig.gameFrame++;
    } else {
        animConfig.frameX = 0; 
    }
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

    // 3. Draw Character with 'multiply' blend mode to remove white background boxes
    const activeImg = player.facing === "left" ? walkLeftImg : walkRightImg;

    if (activeImg.complete && activeImg.naturalWidth !== 0) {
        const sourceWidth = activeImg.naturalWidth / animConfig.totalFrames;
        const sourceHeight = activeImg.naturalHeight;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';

        ctx.drawImage(
            activeImg, 
            animConfig.frameX * sourceWidth, 
            0, 
            sourceWidth, 
            sourceHeight, 
            player.x, 
            player.y, 
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
