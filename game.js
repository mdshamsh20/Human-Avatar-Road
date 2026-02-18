class Game {
    constructor() {
        console.log("Game Constructor called");
        this.container = document.getElementById('game-container');
        if (!this.container) console.error("Game container not found!");

        this.scoreElement = document.getElementById('score');
        this.finalScoreElement = document.getElementById('final-score');

        this.state = 'START'; // START, PLAYING, GAMEOVER
        this.score = 0;
        this.speed = 0.5;
        this.baseSpeed = 0.5;
        this.nextMilestone = 60; // Milestone for speed increase
        this.highScore = localStorage.getItem('quantum_highscore') || 0;
        const highScoreEl = document.getElementById('high-score');
        if (highScoreEl) highScoreEl.innerText = Math.floor(this.highScore);
        this.nextMilestone = 60; // Milestone for speed increase
        this.highScore = localStorage.getItem('quantum_highscore') || 0;
        document.getElementById('high-score').innerText = Math.floor(this.highScore);

        try {
            console.log("Initializing World...");
            this.world = new World(this.container);
            console.log("Initializing Input...");
            this.input = new InputController();
            console.log("Initializing Player...");
            this.player = new Player(this.world.scene);

            this.setupUI();
            this.animate = this.animate.bind(this);

            // Start the loop
            requestAnimationFrame(this.animate);
            console.log("Game loop started");
        } catch (error) {
            console.error("Error in Game constructor:", error);
            alert("Game Error: " + error.message);
        }
    }

    setupUI() {
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            console.log("Start button found, attaching listener");
            startBtn.addEventListener('click', () => {
                console.log("Start button clicked");
                document.getElementById('loading-msg').classList.remove('hidden');
                this.input.init().then(() => {
                    console.log("Input initialized, starting countdown");
                    document.getElementById('start-screen').classList.add('hidden');
                    this.startCountdown();
                }).catch(err => {
                    console.error("Input init failed:", err);
                    alert("Camera Init Failed: " + err);
                });
            });
        } else {
            console.error("Start button not found!");
        }

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    startCountdown() {
        const countEl = document.getElementById('countdown');
        if (!countEl) {
            this.startGame();
            return;
        }

        countEl.classList.remove('hidden');
        let count = 3;
        countEl.innerText = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countEl.innerText = count;
            } else if (count === 0) {
                countEl.innerText = "GO!";
            } else {
                clearInterval(interval);
                countEl.classList.add('hidden');
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.state = 'PLAYING';
        this.score = 0;
        this.speed = this.baseSpeed;
        this.nextMilestone = 60;
    }

    resetGame() {
        this.player.reset();
        this.world.reset();
        this.startGame();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.finalScoreElement.innerText = Math.floor(this.score);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('quantum_highscore', this.highScore);
            document.getElementById('high-score').innerText = Math.floor(this.highScore);
        }

        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(this.animate);

        const delta = 0.016; // Approx 60fps

        if (this.state === 'PLAYING') {
            // Update Inputs
            const input = this.input.getMovement();

            // Update Player
            this.player.update(delta, input);

            // Update World (Scroll grid, move obstacles)
            this.world.update(delta, this.speed);

            // Check Collisions
            if (this.world.checkCollisions(this.player.mesh)) {
                this.gameOver();
            }

            // Update Score
            this.score += this.speed * delta * 10;
            this.scoreElement.innerText = Math.floor(this.score);

            // Check Progression (Every 60m)
            if (this.score >= this.nextMilestone) {
                this.speed += 0.15; // Speed boost
                this.nextMilestone += 60; // Next goal

                // Visual feedback
                const msg = document.getElementById('loading-msg');
                msg.innerText = "SPEED UP! 🔥";
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 2000);
            }
        }

        this.world.render();
    }
}

class World {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, 6);
        this.camera.lookAt(0, 0, -5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xff00ff, 0.8);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);

        // Floor Grid - REMOVED per user request
        // this.gridHelper = new THREE.GridHelper(100, 100, 0x00ffff, 0x220022);
        // this.scene.add(this.gridHelper);

        // "Lava" / Void plane below
        // "Lava" / Void plane below - Expanded
        const planeGeo = new THREE.PlaneGeometry(500, 500);
        const planeMat = new THREE.MeshBasicMaterial({ color: 0xcc3300 }); // Brighter lava base
        this.lava = new THREE.Mesh(planeGeo, planeMat);
        this.lava.rotation.x = -Math.PI / 2;
        this.lava.position.y = -3;
        this.scene.add(this.lava);

        // Add side banks to ensure lava is visible around road
        const bankGeo = new THREE.PlaneGeometry(50, 500);
        const bankMat = new THREE.MeshBasicMaterial({ color: 0xaa1100 });

        const leftBank = new THREE.Mesh(bankGeo, bankMat);
        leftBank.rotation.x = -Math.PI / 2;
        leftBank.position.set(-30, -1, 0);
        this.scene.add(leftBank);

        const rightBank = new THREE.Mesh(bankGeo, bankMat);
        rightBank.rotation.x = -Math.PI / 2;
        rightBank.position.set(30, -1, 0);
        this.scene.add(rightBank);

        // Road
        // Road
        const roadGeo = new THREE.BoxGeometry(6, 1, 200);
        const roadTexture = this.createRoadTexture();
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(1, 10); // Repeat vertically (less repeats = bigger stones)
        roadTexture.anisotropy = 16; // Sharper texture at angles

        const roadMat = new THREE.MeshStandardMaterial({
            map: roadTexture,
            color: 0xaaaaaa,
            roughness: 1,
            metalness: 0
        });
        this.road = new THREE.Mesh(roadGeo, roadMat);
        this.road.position.set(0, -0.5, 0); // Top surface at y=0
        this.scene.add(this.road);

        // Obstacles
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnFactor = 1.0; // Starting difficulty (lower is harder)


        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createRoadTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        // Background (Mortar)
        context.fillStyle = '#3a3a3a';
        context.fillRect(0, 0, size, size);

        // Stones
        const rows = 8;
        const cols = 4;
        const stoneWidth = size / cols;
        const stoneHeight = size / rows;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                // Randomize variation
                const x = j * stoneWidth;
                const y = i * stoneHeight;
                const w = stoneWidth * 0.9;
                const h = stoneHeight * 0.9;

                // Offset every other row
                const offset = (i % 2 === 0) ? 0 : stoneWidth / 2;

                // Color variation
                const shade = 100 + Math.random() * 50;
                context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;

                // Draw rounded rect (stone)
                this.roundRect(context, x + offset + (stoneWidth - w) / 2, y + (stoneHeight - h) / 2, w, h, 10);
                context.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    reset() {
        // Clear obstacles
        this.obstacles.forEach(obs => this.scene.remove(obs));
        this.obstacles = [];
        this.spawnTimer = 0;
    }

    update(delta, speed) {
        // Scroll effect: Move items towards camera (z increases)
        const moveSpeed = speed * 10;

        // Animate Road Texture to show speed
        if (this.road.material.map) {
            // Reversed direction: Add to offset to move texture "down/towards camera"
            this.road.material.map.offset.y = (this.road.material.map.offset.y + moveSpeed * delta * 0.05) % 1;
        }

        // Move Grid locally to fake infinite scroll - REMOVED
        // this.gridHelper.position.z = (this.gridHelper.position.z + moveSpeed * delta) % 1;

        // Spawn Obstacles - Dynamic
        this.spawnTimer += delta;

        // As speed increases, we spawn faster naturally (constant / speed).
        // We also lower the constant (spawnFactor) to make it even DENSEr.
        if (this.spawnTimer > this.spawnFactor / speed) {
            this.spawnObstacle();
            this.spawnTimer = 0;
        }

        // Move & Remove Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.position.z += moveSpeed * delta;

            // Animate Fire (Pulse/Flicker)
            const scale = 1 + Math.sin(Date.now() * 0.01 + obs.id) * 0.1;
            obs.scale.set(scale, scale, scale);
            // Flicker light if it exists (child index varies, assuming last child is light)
            const light = obs.children.find(c => c.isPointLight);
            if (light) {
                light.intensity = 1 + Math.random() * 0.5;
            }

            if (obs.position.z > 10) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // Update Particles
        this.updateParticles(delta, speed);
    }

    createParticles() {
        const particleCount = 400; // More particles
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100; // x spread
            positions[i * 3 + 1] = (Math.random() * 20) - 5; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.2 }); // Orange/Gold
        this.particles = new THREE.Points(geom, mat);
        this.scene.add(this.particles);
    }

    updateParticles(delta, speed) {
        if (!this.particles) {
            this.createParticles();
            return;
        }

        const positions = this.particles.geometry.attributes.position.array;
        // Rising speed
        const riseSpeed = 5;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += riseSpeed * delta; // Move UP (y)

            // Reset if too high
            if (positions[i + 1] > 20) {
                positions[i + 1] = -5;
                positions[i] = (Math.random() - 0.5) * 80;
                positions[i + 2] = (Math.random() - 0.5) * 100; // Reseed Z
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    spawnObstacle() {
        const group = new THREE.Group();

        // Fire Cluster Material
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            roughness: 0
        });

        // Add 3-5 random spikes
        const count = 3 + Math.floor(Math.random() * 3);
        const geo = new THREE.ConeGeometry(0.5, 1.5, 3); // Spiky tetrahedron

        for (let i = 0; i < count; i++) {
            const spike = new THREE.Mesh(geo, mat);
            // Random rotation
            spike.rotation.x = (Math.random() - 0.5) * 1;
            spike.rotation.z = (Math.random() - 0.5) * 1;
            // Random small offset
            spike.position.x = (Math.random() - 0.5) * 0.5;
            spike.position.z = (Math.random() - 0.5) * 0.5;
            group.add(spike);
        }

        // Add a light to it
        const light = new THREE.PointLight(0xffaa00, 1, 5);
        light.position.y = 0.5;
        group.add(light);

        // Random lanes: -2, 0, 2
        const lanes = [-2, 0, 2];
        group.position.x = lanes[Math.floor(Math.random() * lanes.length)];
        group.position.y = 0.5; // On grid
        group.position.z = -50; // Start far away

        this.scene.add(group);
        this.obstacles.push(group);
    }

    checkCollisions(playerMesh) {
        const playerBox = new THREE.Box3().setFromObject(playerMesh);
        // Shrink player box slightly for fairer hitboxes
        playerBox.expandByScalar(-0.1);

        for (const obs of this.obstacles) {
            const obsBox = new THREE.Box3().setFromObject(obs);
            obsBox.expandByScalar(-0.05);
            if (playerBox.intersectsBox(obsBox)) {
                return true;
            }
        }
        return false;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

class Player {
    constructor(scene) {
        this.scene = scene;

        // Create Humanoid Group
        this.mesh = new THREE.Group();

        const skinColor = 0xffccaa;
        const shirtColor = 0xff0000;
        const pantsColor = 0x0000ff;

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        this.mesh.add(head);

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.05;
        this.mesh.add(torso);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const armMat = new THREE.MeshStandardMaterial({ color: shirtColor });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.35, 1.05, 0);
        this.mesh.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.35, 1.05, 0);
        this.mesh.add(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const legMat = new THREE.MeshStandardMaterial({ color: pantsColor });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.15, 0.35, 0);
        this.mesh.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.15, 0.35, 0);
        this.mesh.add(rightLeg);

        this.mesh.position.y = 0; // Group origin is on ground
        this.scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.isJumping = false;
        this.gravity = -25;
    }

    reset() {
        this.mesh.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.isJumping = false;
    }

    update(delta, input) {
        // Horizontal Movement (Lerp for smoothness)
        // input.x is -1 (left) to 1 (right)
        const targetX = input.x * 2.5; // Reduced range slightly to stay on grid 
        this.mesh.position.x += (targetX - this.mesh.position.x) * 5 * delta;

        // Jump
        if (input.jump && !this.isJumping) {
            this.velocity.y = 8;
            this.isJumping = true;
        }

        // Physics
        this.velocity.y += this.gravity * delta;
        this.mesh.position.y += this.velocity.y * delta;

        // Ground Collision
        if (this.mesh.position.y < 0.5) {
            this.mesh.position.y = 0.5;
            this.velocity.y = 0;
            this.isJumping = false;
        }
    }
}

class InputController {
    constructor() {
        this.video = document.getElementById('video');
        this.poseNet = null;
        this.poses = [];
        this.isReady = false;

        // Calibration
        this.neutralX = 0;
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then((stream) => {
                        this.video.srcObject = stream;
                        this.video.play();

                        // Initialize PoseNet
                        this.poseNet = ml5.poseNet(this.video, () => {
                            console.log('PoseNet Ready');
                            this.isReady = true;
                            resolve();
                        });

                        this.poseNet.on('pose', (results) => {
                            this.poses = results;
                        });
                    })
                    .catch((err) => {
                        console.error(err);
                        alert("Camera access denied or error. Please check permissions.");
                        reject(err);
                    });
            } else {
                alert("Browser does not support getUserMedia");
                reject("No Media Support");
            }
        });
    }

    getMovement() {
        // Default: Center, No Jump
        let movement = { x: 0, jump: false };

        if (!this.isReady || this.poses.length === 0) return movement;

        const pose = this.poses[0].pose;
        const nose = pose.nose;

        // Normalize X: Video is 640px wide. 

        const centerX = 320;
        const deadZone = 40; // Reduced deadzone for responsiveness

        // Invert Logic: 
        // Nose < 320 (Left on screen aka Real Right) -> Move RIGHT (1)
        // Nose > 320 (Right on screen aka Real Left) -> Move LEFT (-1)

        if (nose.x < centerX - deadZone) {
            movement.x = 1; // Move Right (was Left)
        } else if (nose.x > centerX + deadZone) {
            movement.x = -1; // Move Left (was Right)
        }

        // Jump Detection
        // Top of screen is y=0.
        // Jump threshold
        if (nose.y < 220) { // High up in frame
            movement.jump = true;
        }


        return movement;
    }
}

// Initialize Game
// Initialize Game
window.addEventListener('load', () => {
    console.log("Window loaded");

    // Check Dependencies
    if (typeof THREE === 'undefined') {
        console.error("THREE.js is not loaded!");
        alert("Error: THREE.js library not loaded. Check internet connection.");
        return;
    }
    if (typeof ml5 === 'undefined') {
        console.error("ml5.js is not loaded!");
        alert("Error: ml5.js library not loaded. Check internet connection.");
        return;
    }

    // Init
    try {
        window.game = new Game();
        console.log("Game initialized successfully");
    } catch (e) {
        console.error("Failed to initialize game:", e);
    }
});

