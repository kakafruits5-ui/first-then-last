const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const controllerStatus = document.getElementById("controller-status");

// Grab the sprite sheet from the HTML
const playerSprite = document.getElementById("player-sprite");

// --- SPRITE CONFIGURATION ---
// You may need to tweak spriteWidth and spriteHeight depending on the exact pixel size of your downloaded image.
const spriteConfig = {
    spriteWidth: 32,  // Estimated width of one character frame
    spriteHeight: 32, // Estimated height of one character frame
    idleSideRow: 1,   // Row 2 in image (0-indexed = 1)
    runSideRow: 4,    // Row 5 in image (0-indexed = 4)
    frameX: 0,
    maxFrames: 3,     // How many frames in the current animation
    gameFrame: 0,
    staggerFrames: 10 // Higher number = slower animation
};

let keys = {};

const player = {
    x: 50,
    y: 300,
    width: 32,
    height: 32,
    vx: 0,
    vy: 0,
    speed: 4.5,
    gravity: 0.6,
    jumpStrength: -11,
    isGrounded: false,
    facing: "right",
    state: "idle" // 'idle' or 'run'
};

// Procedural environment arrays
let platforms = [];
let trees = [];

function generateEnvironment() {
    platforms = [];
    trees = [];

    // Generate random background trees
    for (let i = 0; i < 15; i++) {
        trees.push({
            x: Math.random() * canvas.width,
            y: 450,
            height: 100 + Math.random() * 150,
            width: 30 + Math.random() * 40,
            color: `rgba(20, ${50 + Math.random() * 30}, 40, 0.7)` // Dark green variations
        });
    }

    // Build solid ground
    platforms.push({ x: 0, y: 450, width: canvas.width, height: 50 });
    
    // Build some jumpable platforms
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
        controllerStatus.textContent = "🎮 Controller: Ready";
        controllerStatus.style.color = "#44ff88";

        if (gp.axes[0] < -0.25 || gp.buttons[14]?.pressed) { player.vx = -player.speed; }
        if (gp.axes[0] > 0.25 || gp.buttons[15]?.pressed) { player.vx = player.speed; }
        if (gp.buttons[0]?.pressed) { jumpPressed = true; }
    } else {
        controllerStatus.textContent = "🎮 Controller: Disconnected";
        controllerStatus.style.color = "#779988";
    }

    if (keys["ArrowLeft"] || keys["KeyA"]) { player.vx = -player.speed; }
    if (keys["ArrowRight"] || keys["KeyD"]) { player.vx = player.speed; }
    if (keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) { jumpPressed = true; }

    // Execute Jump
    if (jumpPressed && player.isGrounded) {
        player.vy = player.jumpStrength;
        player.isGrounded = false;
    }

    // Update sprite state and facing direction based on velocity
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

// Helper function to check AABB overlapping boxes
function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function updatePhysics() {
    // 1. Update X Position
    player.x += player.vx;
    
    // Check screen boundaries (X)
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Check X Axis Solid Collisions
    for (let plat of platforms) {
        if (isColliding(player, plat)) {
            // Push out based on direction of travel
            if (player.vx > 0) player.x = plat.x - player.width;
            if (player.vx < 0) player.x = plat.x + plat.width;
            player.vx = 0;
        }
    }

    // 2. Update Y Position
    player.vy += player.gravity;
    player.y += player.vy;
    player.isGrounded = false;

    // Check screen boundaries (Y) fall death
    if (player.y > canvas.height) {
        player.x = 50;
        player.y = 300;
        player.vy = 0;
    }

    // Check Y Axis Solid Collisions
    for (let plat of platforms) {
        if (isColliding(player, plat)) {
            if (player.vy > 0) { // Landing on top
                player.y = plat.y - player.height;
                player.isGrounded = true;
            } else if (player.vy < 0) { // Hitting head on bottom
                player.y = plat.y + plat.height;
            }
            player.vy = 0;
        }
    }
}

function updateAnimation() {
    // Set parameters based on state
    let currentRow = player.state === "run" ? spriteConfig.runSideRow : spriteConfig.idleSideRow;
    
    // The image has 3 frames for idle, 4 frames for run
    spriteConfig.maxFrames = player.state === "run" ? 4 : 3;

    // Cycle frames based on stagger timer
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

    // 1. Draw Background Trees
    trees.forEach(tree => {
        ctx.fillStyle = tree.color;
        // Simple triangular tree drawing
        ctx.beginPath();
        ctx.moveTo(tree.x, tree.y);
        ctx.lineTo(tree.x + (tree.width / 2), tree.y - tree.height);
        ctx.lineTo(tree.x + tree.width, tree.y);
        ctx.fill();
        ctx.closePath();
    });

    // 2. Draw Solid Platforms
    platforms.forEach(plat => {
        ctx.fillStyle = "#334c40"; // Mossy stone texture color
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        
        // Grass top edge
        ctx.fillStyle = "#44ff88"; 
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });

    // 3. Draw Animated Player
    let currentRow = player.state === "run" ? spriteConfig.runSideRow : spriteConfig.idleSideRow;
    
    ctx.save(); // Save canvas state before flipping
    
    let destX = player.x;
    let destY = player.y;

    // If facing left, flip the canvas horizontally 
    if (player.facing === "left") {
        ctx.scale(-1, 1);
        destX = -player.x - player.width; // Offset the math for the flipped canvas
    }

    // Draw the specific sliced frame from the image
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
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

    ctx.restore(); // Restore canvas back to normal orientation
}

function mainGameCycle() {
    processInputs();
    updatePhysics();
    updateAnimation();
    drawGameScene();
    requestAnimationFrame(mainGameCycle);
}

// Initialize and start
generateEnvironment();
mainGameCycle();
