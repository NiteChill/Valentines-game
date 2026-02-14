const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 450,
	pixelArt: true,
	roundPixels: false,
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	physics: {
		default: 'arcade',
		arcade: {
			fps: 60,
			gravity: { y: 1000 },
			debug: false,
		},
	},
	fps: {
		target: 60,
		forceSetTimeOut: true,
	},
	audio: {
		noAudio: true,
	},
	scene: {
		preload: preload,
		create: create,
		update: update,
	},
};

const game = new Phaser.Game(config);

const WORLD_WIDTH = 8000;

// --- VARIABLES ---
let player, playerReflection, playerReflectionBlur;
let cursors, platforms, ground;

// State Tracking
let isTransitioning = false;
let lastDirection = 'right';
let frameCounter = 0;

// Particles
let heartEmitterBig,
	heartEmitterSmall,
	heartEmitterBigRef,
	heartEmitterSmallRef;
let heartEmitterExtra, heartEmitterExtraRef;
let fireflyEmitter, fireflyGlowEmitter;
let dropEmitter, dropEmitterRef;
let drinkEmitTimer = 0;
let rainEmitter, rainSplashEmitter;

// Game State
let isGameFinished = false;
let endingText;
let redOverlay;
let heartFloodEmitter;

// Story Variables
let storyText;
let storyEvents = [];
let currentStoryIndex = 0;

function preload() {
	// Load your specific 48x48 spritesheet
	this.load.spritesheet('cat', 'assets/cat.png', {
		frameWidth: 48,
		frameHeight: 48,
	});
	this.load.spritesheet('alexane', 'assets/alexane.png', {
		frameWidth: 48,
		frameHeight: 48,
	});
	this.load.spritesheet('grass', 'assets/grass.png', {
		frameWidth: 16,
		frameHeight: 16,
	});
	this.load.spritesheet('flowers', 'assets/flowers.png', {
		frameWidth: 16,
		frameHeight: 16,
	});
	// Load light pole image
	this.load.image('light-pole', 'assets/light-pole.png');
	this.load.image('moon', 'assets/moon.png');
}

function create() {
	// 1. SET THE MOOD
	this.cameras.main.setBackgroundColor('#1a1a2e');

	// --- 0. DEFINE ANIMATIONS ---
	// IDLE
	this.anims.create({
		key: 'idle_right',
		frames: this.anims.generateFrameNumbers('cat', { start: 0, end: 7 }),
		frameRate: 8,
		repeat: -1,
	});
	this.anims.create({
		key: 'idle_left',
		frames: this.anims.generateFrameNumbers('cat', { start: 8, end: 15 }),
		frameRate: 8,
		repeat: -1,
	});

	// ALEXANE
	this.anims.create({
		key: 'alexane_idle',
		frames: this.anims.generateFrameNumbers('alexane', { start: 0, end: 7 }),
		frameRate: 6,
		repeat: -1,
	});
	this.anims.create({
		key: 'alexane_scratch',
		frames: this.anims.generateFrameNumbers('alexane', { start: 8, end: 19 }),
		frameRate: 10,
		repeat: 0,
	});

	// RUN
	this.anims.create({
		key: 'run_right',
		frames: this.anims.generateFrameNumbers('cat', { start: 16, end: 19 }),
		frameRate: 10,
		repeat: -1,
	});
	this.anims.create({
		key: 'run_left',
		frames: this.anims.generateFrameNumbers('cat', { start: 20, end: 23 }),
		frameRate: 10,
		repeat: -1,
	});

	// DRINK
	this.anims.create({
		key: 'drink_right',
		frames: this.anims.generateFrameNumbers('cat', { start: 40, end: 42 }),
		frameRate: 12,
		repeat: -1,
	});
	this.anims.create({
		key: 'drink_left',
		frames: this.anims.generateFrameNumbers('cat', { start: 46, end: 48 }),
		frameRate: 12,
		repeat: -1,
	});

	// 2. GENERATE ASSETS
	let graphics = this.make.graphics({ x: 0, y: 0, add: false });

	// Ground Texture
	const groundCanvas = this.textures.createCanvas('ground', 32, 32);
	const gCtx = groundCanvas.getContext();

	gCtx.fillStyle = '#111111';
	gCtx.fillRect(0, 0, 32, 32);

	// Add noise
	for (let i = 0; i < 32; i++) {
		for (let j = 0; j < 32; j++) {
			if (Math.random() < 0.5) {
				const noiseVal = Math.floor(Math.random() * 8) - 4;
				const alpha = 0.05 + Math.random() * 0.1;
				gCtx.fillStyle =
					noiseVal > 0
						? `rgba(255, 255, 255, ${alpha})`
						: `rgba(0, 0, 0, ${alpha})`;
				gCtx.fillRect(i, j, 1, 1);
			}
		}
	}
	groundCanvas.refresh();

	// Particle Textures
	graphics.clear();
	graphics.fillStyle(0xff69b4, 1); // Pink Heart
	graphics.fillCircle(5, 6, 4);
	graphics.fillCircle(11, 6, 4);
	graphics.beginPath();
	graphics.moveTo(8, 14);
	graphics.lineTo(2, 8);
	graphics.lineTo(14, 8);
	graphics.closePath();
	graphics.fillPath();
	graphics.generateTexture('heart', 16, 16);

	// Concrete Texture
	const concreteCanvas = this.textures.createCanvas('concrete', 512, 64);
	const concreteCtx = concreteCanvas.getContext();
	concreteCtx.fillStyle = '#111111';
	concreteCtx.fillRect(0, 0, 512, 64);
	concreteCanvas.refresh();

	// Drop
	graphics.clear();
	graphics.fillStyle(0x66ccff, 1);
	graphics.fillCircle(2, 2, 2);
	graphics.generateTexture('drop', 6, 6);

	// Firefly
	graphics.clear();
	graphics.fillStyle(0xffffcc, 1);
	graphics.fillCircle(2, 2, 2);
	graphics.generateTexture('firefly', 4, 4);

	// Rain
	graphics.clear();
	graphics.fillStyle(0x88ccff, 0.5);
	graphics.fillRect(0, 0, 1, 8);
	graphics.generateTexture('rain', 1, 8);

	// Ripple
	graphics.clear();
	graphics.lineStyle(1.5, 0xaaccff, 0.8);
	graphics.strokeCircle(6, 6, 6);
	graphics.generateTexture('ripple', 12, 12);

	// Bubble
	graphics.clear();
	graphics.fillStyle(0xaaccff, 0.8);
	graphics.fillCircle(2, 2, 2);
	graphics.generateTexture('bubble', 4, 4);

	// Rock Texture (Procedural)
	for (let i = 0; i < 3; i++) {
		graphics.clear();
		graphics.fillStyle(0x555555, 1);
		const w = Phaser.Math.Between(8, 16);
		const h = Phaser.Math.Between(6, 12);
		graphics.beginPath();
		graphics.moveTo(0, h);
		graphics.lineTo(w / 4, h / 3);
		graphics.lineTo(w / 2, 0);
		graphics.lineTo(w * 0.75, h / 4);
		graphics.lineTo(w, h);
		graphics.closePath();
		graphics.fillPath();
		graphics.fillStyle(0x777777, 1);
		graphics.beginPath();
		graphics.moveTo(0, h);
		graphics.lineTo(w / 4, h / 3);
		graphics.lineTo(w / 2, h);
		graphics.closePath();
		graphics.fillPath();
		graphics.fillStyle(0x222222, 0.5);
		graphics.fillEllipse(w / 2, h - 1, w * 0.8, 3);
		graphics.generateTexture('rock_' + i, w, h);
	}

	// Dither Gradient
	const ditherW = 400;
	const ditherH = 120;
	const ditherCanvas = this.textures.createCanvas(
		'dither_gradient',
		ditherW,
		ditherH,
	);
	const ctx = ditherCanvas.getContext();

	// Light Cone
	const coneH = 85;
	const coneW = 75;
	const coneCanvas = this.textures.createCanvas('light_cone', coneW, coneH);
	const cCtx = coneCanvas.getContext();
	const grad = cCtx.createLinearGradient(0, 0, 0, coneH);
	grad.addColorStop(0, 'rgba(255, 220, 100, 0)');
	grad.addColorStop(0.2, 'rgba(255, 220, 100, 0.4)');
	grad.addColorStop(1, 'rgba(255, 220, 100, 0)');
	cCtx.fillStyle = grad;
	cCtx.beginPath();
	cCtx.moveTo(coneW / 2, 0);
	cCtx.lineTo(0, coneH);
	cCtx.lineTo(coneW, coneH);
	cCtx.closePath();
	cCtx.fill();
	coneCanvas.refresh();

	// Dither Fill
	ctx.fillStyle = 'hsla(240, 28%, 13%, 1.00)';
	for (let y = 0; y < ditherH; y++) {
		const progress = y / ditherH;
		const prob = 1 - Math.pow(progress, 1.5);
		for (let x = 0; x < ditherW; x++) {
			if (Math.random() < prob) ctx.fillRect(x, y, 1, 1);
		}
	}
	ditherCanvas.refresh();

	// Moon Glow
	const gSize = 86;
	const glowCanvas = this.textures.createCanvas('moon_glow', gSize, gSize);
	const glowCtx = glowCanvas.getContext();
	for (let y = 0; y < gSize; y++) {
		for (let x = 0; x < gSize; x++) {
			const dx = x - gSize / 2;
			const dy = y - gSize / 2;
			const dist = Math.sqrt(dx * dx + dy * dy);
			let glowAlpha = 0;
			if (dist >= 17) {
				if (dist < 20) glowAlpha = 0.15;
				else if (dist < 24) glowAlpha = 0.1;
				else if (dist < 29) glowAlpha = 0.05;
				else if (dist < 35) glowAlpha = 0.02;
				else if (dist < 42) glowAlpha = 0.01;
			}
			if (glowAlpha > 0) {
				glowCtx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
				glowCtx.fillRect(x, y, 1, 1);
			}
		}
	}
	glowCanvas.refresh();

	// Cat Aura
	const auraSize = 144;
	const auraCanvas = this.textures.createCanvas('cat_aura', auraSize, auraSize);
	const auraCtx = auraCanvas.getContext();
	const auraGrad = auraCtx.createRadialGradient(
		auraSize / 2,
		auraSize / 2,
		0,
		auraSize / 2,
		auraSize / 2,
		auraSize / 2,
	);
	auraGrad.addColorStop(0, 'rgba(255, 220, 230, 0.6)');
	auraGrad.addColorStop(0.4, 'rgba(255, 105, 180, 0.25)');
	auraGrad.addColorStop(1, 'rgba(255, 100, 150, 0)');
	auraCtx.fillStyle = auraGrad;
	auraCtx.fillRect(0, 0, auraSize, auraSize);
	auraCanvas.refresh();

	// Background Moon Sprite (Two Layers)

	// 1. Glow Layer (Behind)
	const moonGlow = this.add.image(600, 100, 'moon_glow');
	moonGlow.setScale(2.4);
	moonGlow.setScrollFactor(0.13);
	moonGlow.setDepth(-2.1); // Slightly behind moon (-2)

	// 2. Moon Body (Image)
	const moon = this.add.image(600, 100, 'moon');
	moon.setScale(2.4);
	moon.setScrollFactor(0.13);
	moon.setDepth(-2);

	// 3. BUILD LEVEL
	this.physics.world.setBounds(0, 0, WORLD_WIDTH, 450);
	this.cameras.main.setBounds(0, 0, WORLD_WIDTH, 450);

	platforms = this.physics.add.staticGroup();
	ground = platforms
		.create(WORLD_WIDTH / 2, 430, 'ground')
		.setScale(WORLD_WIDTH / 32, 2)
		.refreshBody();
	ground.setVisible(false);

	const groundVisual = this.add.tileSprite(
		WORLD_WIDTH / 2,
		430,
		WORLD_WIDTH,
		64,
		'concrete',
	);
	groundVisual.setScrollFactor(1);
	groundVisual.setDepth(0.4);

	// 3b. CRACKS
	const crackGraphics = this.add.graphics();
	const groundTopForCracks = ground.y - ground.displayHeight / 2;
	const clearZoneStart = WORLD_WIDTH - 2400;

	for (let cx = 0; cx < clearZoneStart; cx += Phaser.Math.Between(40, 160)) {
		if (Math.random() < 0.6) {
			const crackSize = Math.random() < 0.6 ? 'small' : 'large';
			generateCrack(crackGraphics, cx, groundTopForCracks, crackSize);
		}
	}
	crackGraphics.setDepth(0.5);

	// 3c. GREEN GRASS FLOOR OVERLAY
	const grassFloorX = WORLD_WIDTH - 1200;
	{
		const transitionCanvas = this.textures.createCanvas(
			'grass_transition',
			2400,
			32,
		);
		const ctx = transitionCanvas.getContext();

		// Soil base
		ctx.fillStyle = 'hsla(120, 29%, 40%, 1.00)';
		ctx.fillRect(0, 0, 2400, 32);

		// Grass blades
		for (let x = 0; x < 2400; x++) {
			const noise =
				Math.sin(x * 0.02) * 2 +
				Math.sin(x * 0.08) * 1.5 +
				Math.sin(x * 0.2) * 0.5;
			const bladeH = Math.floor(Math.max(3, 7 + noise));

			ctx.fillStyle = 'hsla(120, 27%, 48%, 1.00)';
			ctx.fillRect(x, 0, 1, bladeH);
			ctx.fillStyle = 'hsla(120, 27%, 50%, 1.00)';
			ctx.fillRect(x, 0, 1, 1);

			if (Math.random() < 0.15) {
				const soilY = Math.floor(12 + Math.random() * 20);
				ctx.fillStyle = 'hsla(120, 28%, 44%, 1.00)';
				ctx.fillRect(x, soilY, 1, 1);
			}
		}

		// Organic Moss Mask
		const imgData = ctx.getImageData(0, 0, 2400, 32);
		const data = imgData.data;

		for (let x = 0; x < 2400; x += 2) {
			for (let y = 0; y < 32; y += 2) {
				let alpha = 1;
				if (x < 250) {
					let progress = x / 250;
					const n1 = Math.sin(x * 0.01 + Math.cos(y * 0.05) * 2.0);
					const n2 = Math.cos(x * 0.03 - y * 0.1);
					const noise = (n1 + n2 + 2) / 4;
					const edgeNoise = (Math.random() - 0.5) * 0.05;
					if (progress < noise + edgeNoise) alpha = 0;
				}
				for (let dx = 0; dx < 2; dx++) {
					for (let dy = 0; dy < 2; dy++) {
						const px = x + dx;
						const py = y + dy;
						if (px < 2400 && py < 32) {
							const i = (py * 2400 + px) * 4;
							data[i + 3] = alpha * 255;
						}
					}
				}
			}
		}
		ctx.putImageData(imgData, 0, 0);
		transitionCanvas.refresh();
	}

	const exactGroundTop = 430 - 32;
	this.grassFloorOnly = this.add.sprite(
		grassFloorX,
		exactGroundTop,
		'grass_transition',
	);
	this.grassFloorOnly.setOrigin(0.5, 0);
	this.grassFloorOnly.setScale(1, 2);
	this.grassFloorOnly.setDepth(0.6);
	this.grassFloorOnly.alpha = 1;
	this.grassFloorSprite = null;

	// 4. CREATE PLAYER
	const groundTop = ground.y - ground.displayHeight / 2;
	const playerHeight = 48;
	const spawnY = groundTop - playerHeight / 2;
	player = this.physics.add.sprite(100, spawnY, 'cat', 0);
	player.setBounce(0.1);
	player.setCollideWorldBounds(true);

	// Camera Target
	this.cinematicProgress = 0;
	this.cameraTarget = this.add
		.image(player.x, player.y, 'cat')
		.setVisible(false);
	this.cameras.main.startFollow(this.cameraTarget, true, 0.1, 0.1);
	this.cameras.main.setLerp(0.1, 0.1);
	this.cameras.main.setRoundPixels(true);

	// Procedural Flowers
	player.setScale(1, 1);
	const flowersGroup = this.add.group();
	const flowerY = groundTop - 8;
	const minFlowerSpacing = 30;
	const reflectionFlowerY = 2 * groundTop - flowerY;

	let worldX = 0;
	while (worldX < WORLD_WIDTH) {
		const isClearZone = worldX > WORLD_WIDTH - 2400;
		const spacingMultiplier = isClearZone ? 0.08 : 1;
		const spacing =
			minFlowerSpacing * Phaser.Math.FloatBetween(1, 12) * spacingMultiplier;
		const seed = Math.abs(Math.floor(worldX * 73) % 400);
		let textureKey = 'grass';
		let frameIndex = seed;

		if (isClearZone) {
			textureKey = 'flowers';
			frameIndex = Math.abs(Math.floor(worldX * 37)) % 100;
		} else {
			frameIndex = seed % 400;
		}

		const flower = this.add.sprite(worldX, flowerY, textureKey, frameIndex);
		flower.setScale(1, 1);
		flower.setDepth(1);
		flowersGroup.add(flower);

		if (!isClearZone) {
			const flowerRef = this.add.sprite(
				worldX,
				reflectionFlowerY + 2,
				textureKey,
				frameIndex,
			);
			flowerRef.setScale(1, 1.2);
			flowerRef.flipY = true;
			flowerRef.setTint(0xb0bcc0);
			flowerRef.alpha = 0.2;
			flowerRef.setDepth(0);
			flowersGroup.add(flowerRef);
		}
		worldX += spacing;
	}

	// Background Grass
	const bgGrassGroup = this.add.group();
	let bgGrassX = 0;
	while (bgGrassX < WORLD_WIDTH - 2400) {
		const spacing = 30 * Phaser.Math.FloatBetween(1, 6);
		const seed = Math.abs(Math.floor(bgGrassX * 45) % 400);

		const bgGrass = this.add.sprite(bgGrassX, groundTop + 5, 'grass', seed);
		bgGrass.setOrigin(0.5, 1.4);
		bgGrass.setScale(0.85);
		bgGrass.setTint(0x000000);
		bgGrass.setAlpha(1);
		bgGrass.setScrollFactor(0.95, 1);
		bgGrass.setDepth(-0.1);

		bgGrassGroup.add(bgGrass);
		bgGrassX += spacing;
	}

	// Rocks
	const rocksGroup = this.add.group();
	let rockX = 20;
	const rockYbase = groundTop;
	const rockRefYbase = 2 * groundTop - rockYbase;

	while (rockX < WORLD_WIDTH) {
		const isClearZone = rockX > WORLD_WIDTH - 2400;
		const spacingData = isClearZone ? 50 : 150;
		const spacing = spacingData * Phaser.Math.FloatBetween(0.8, 2.5);
		const spawnChance = isClearZone ? 0.9 : 0.6;

		if (Math.random() < spawnChance) {
			const numRocks = Phaser.Math.Between(1, 4);
			let clusterX = rockX;

			for (let n = 0; n < numRocks; n++) {
				const offsetX = Phaser.Math.Between(-15, 15);
				const rockType = Phaser.Math.Between(0, 2);
				const scaleX = Phaser.Math.FloatBetween(0.8, 1.2);
				const scaleY = Phaser.Math.FloatBetween(0.8, 1.2);

				const rX = clusterX + offsetX;
				const rY = rockYbase;

				const rock = this.add.sprite(rX, rY, 'rock_' + rockType);
				rock.setOrigin(0.5, 1);
				rock.setScale(scaleX, scaleY);
				rock.setDepth(1);
				rocksGroup.add(rock);

				if (!isClearZone) {
					const rockRef = this.add.sprite(rX, rockRefYbase, 'rock_' + rockType);
					rockRef.setOrigin(0.5, 0);
					rockRef.setScale(scaleX, scaleY);
					rockRef.flipY = true;
					rockRef.setTint(0x7f8f99);
					rockRef.alpha = 0.3;
					rockRef.setDepth(0);
					rocksGroup.add(rockRef);
				}

				if (Math.random() < 0.7) {
					const grassFrame = Phaser.Math.Between(0, 399);
					const grassOffsetX = offsetX + Phaser.Math.Between(-10, 10);

					const tinyGrass = this.add.sprite(
						clusterX + grassOffsetX,
						rockYbase,
						'grass',
						grassFrame,
					);
					tinyGrass.setOrigin(0.5, 1);
					tinyGrass.setScale(0.6);
					tinyGrass.setDepth(1.1);
					rocksGroup.add(tinyGrass);

					if (!isClearZone) {
						const tinyGrassRef = this.add.sprite(
							clusterX + grassOffsetX,
							rockRefYbase,
							'grass',
							grassFrame,
						);
						tinyGrassRef.setOrigin(0.5, 0);
						tinyGrassRef.setScale(0.6);
						tinyGrassRef.flipY = true;
						tinyGrassRef.setTint(0xb0bcc0);
						tinyGrassRef.alpha = 0.2;
						tinyGrassRef.setDepth(0);
						rocksGroup.add(tinyGrassRef);
					}
				}
			}
		}
		rockX += spacing;
	}
	player.body.setSize(24, 20);
	player.body.setOffset(12, 14);

	// Background Rocks
	const bgRocksGroup = this.add.group();
	let bgRockX = 20;
	while (bgRockX < WORLD_WIDTH - 2400) {
		const spacing = 150 * Phaser.Math.FloatBetween(0.8, 2.5);

		if (Math.random() < 0.6) {
			const numRocks = Phaser.Math.Between(1, 3);
			let clusterX = bgRockX;

			for (let n = 0; n < numRocks; n++) {
				const offsetX = Phaser.Math.Between(-15, 15);
				const rockType = Phaser.Math.Between(0, 2);
				const scaleX = Phaser.Math.FloatBetween(0.7, 1.0);
				const scaleY = Phaser.Math.FloatBetween(0.7, 1.0);

				const rX = clusterX + offsetX;
				const bgRock = this.add.sprite(rX, groundTop + 5, 'rock_' + rockType);

				bgRock.setOrigin(0.5, 1.2);
				bgRock.setScale(scaleX, scaleY);
				bgRock.setTint(0x000000);
				bgRock.setAlpha(1);
				bgRock.setDepth(-0.1);
				bgRock.setScrollFactor(0.92, 1);

				bgRocksGroup.add(bgRock);
			}
		}
		bgRockX += spacing;
	}

	// Procedural Light Poles
	const polesGroup = this.add.group();
	const poleY = groundTop;
	const poleRefY = 2 * groundTop - poleY;

	let poleX = Phaser.Math.Between(100, 900);
	while (poleX < WORLD_WIDTH - 2400) {
		const isLit = Math.random() < 0.7;
		const pole = this.add.sprite(poleX, poleY, 'light-pole');
		pole.setOrigin(0.5, 1);
		pole.setScale(1.5);
		pole.setDepth(0.9);

		if (!isLit) pole.setTint(0x666677);
		polesGroup.add(pole);

		const poleHeight = pole.displayHeight;
		const bulbY = poleY - poleHeight + 10;

		if (isLit) {
			const cone = this.add.image(poleX + 16, bulbY, 'light_cone');
			cone.setOrigin(0.61, 0);
			cone.setDepth(3);
			cone.setBlendMode('ADD');
			cone.setAlpha(0.6);
		}

		const isClearZone = poleX > WORLD_WIDTH - 2400;
		if (!isClearZone) {
			const poleRef = this.add.sprite(poleX, poleRefY, 'light-pole');
			poleRef.setOrigin(0.5, 0);
			poleRef.setScale(1.5, 1.5);
			poleRef.flipY = true;
			poleRef.setDepth(0);

			if (isLit) {
				poleRef.setTint(0x7f8f99);
				poleRef.alpha = 0.25;
			} else {
				poleRef.setTint(0x444455);
				poleRef.alpha = 0.15;
			}
			polesGroup.add(poleRef);

			if (isLit) {
				const coneRef = this.add.image(
					poleX + 16,
					2 * groundTop - bulbY,
					'light_cone',
				);
				coneRef.setOrigin(0.61, 1);
				coneRef.setDepth(0);
				coneRef.flipY = true;
				coneRef.setAlpha(0.03);
				coneRef.setBlendMode('ADD');
			}
		}

		if (Math.random() < 0.4) {
			poleX += Phaser.Math.Between(400, 800);
		} else {
			poleX += Phaser.Math.Between(1000, 2400);
		}
	}

	// Ending: Alexane
	const otherCatX = WORLD_WIDTH - 200;

	// Aura
	const aura = this.add.image(otherCatX, 398 + 14 - 24, 'cat_aura');
	aura.setOrigin(0.5, 0.5);
	aura.setDepth(1.5);
	aura.setBlendMode('ADD');
	aura.setAlpha(0.6);

	this.tweens.add({
		targets: aura,
		scale: { from: 1.0, to: 1.3 },
		alpha: { from: 0.5, to: 0.8 },
		duration: 1500,
		yoyo: true,
		repeat: -1,
		ease: 'Sine.easeInOut',
	});

	// Presence Particles
	const presenceEmitter = this.add.particles(
		otherCatX,
		398 + 14 - 10,
		'firefly',
		{
			speed: { min: 4, max: 12 },
			angle: { min: 0, max: 360 },
			scale: { start: 0.5, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: 2500,
			frequency: 150,
			quantity: 1,
			gravityY: -8,
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 30),
				type: 'random',
				quantity: 1,
			},
			tint: [0xffcccc, 0xffffff, 0xff99aa],
			blendMode: 'ADD',
		},
	);
	presenceEmitter.setDepth(1.6);

	this.otherCat = this.physics.add.sprite(otherCatX, 398 + 14, 'alexane', 0);
	this.otherCat.setOrigin(0.5, 1);
	this.otherCat.setDepth(2);
	this.otherCat.flipX = true;
	this.otherCat.body.setAllowGravity(false);
	this.otherCat.body.setImmovable(true);

	this.otherCat.play('alexane_idle');

	this.time.addEvent({
		delay: 4000,
		loop: true,
		callback: () => {
			if (Math.random() < 0.4) {
				this.otherCat.play('alexane_scratch');
				this.otherCat.chain('alexane_idle');
			}
		},
	});

	// Player Reflection
	playerReflectionBlur = this.add.sprite(100, 300, 'cat', 0);
	playerReflectionBlur.alpha = 0.06;
	playerReflectionBlur.flipY = true;
	playerReflectionBlur.setTint(0x6f7f88);
	playerReflectionBlur.setScale(1, 1);

	playerReflection = this.add.sprite(100, 300, 'cat', 0);
	playerReflection.alpha = 0.2;
	playerReflection.flipY = true;
	playerReflection.setTint(0x92a0b0);
	playerReflection.setScale(1, 1);

	playerReflectionBlur.setDepth(0);
	playerReflection.setDepth(1);
	player.setDepth(2);

	// Collisions & Input
	this.physics.add.collider(player, platforms);
	cursors = this.input.keyboard.createCursorKeys();

	// 9. PARTICLE SYSTEMS (Vibes)
	// Firefly core: deep, small, darker
	// Firefly Particles
	fireflyEmitter = this.add.particles(0, 0, 'firefly', {
		speed: 20,
		lifespan: 1800,
		alpha: [0, 0.7, 0],
		scale: { start: 0.6, end: 0.05 },
		tint: 0xffdd88,
		blendMode: 'ADD',
		frequency: 30,
		gravityY: -20,
	});

	fireflyGlowEmitter = this.add.particles(0, 0, 'firefly', {
		speed: 20,
		lifespan: 1800,
		alpha: [0, 0.5, 0],
		scale: { start: 1.7, end: 0.2 },
		tint: 0xffdd88,
		blendMode: 'ADD',
		frequency: 30,
		gravityY: -20,
	});

	fireflyEmitter.addEmitZone({
		type: 'random',
		source: new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH - 2400, 450),
	});
	fireflyGlowEmitter.addEmitZone({
		type: 'random',
		source: new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH - 2400, 450),
	});

	// Ambient Hearts
	const ambientHeartEmitter = this.add.particles(0, 0, 'heart', {
		speed: 20,
		lifespan: 3000,
		alpha: { start: 0.8, end: 0 },
		scale: { start: 0.6, end: 0.2 },
		frequency: 60,
		gravityY: -20,
	});
	ambientHeartEmitter.addEmitZone({
		type: 'random',
		source: new Phaser.Geom.Rectangle(WORLD_WIDTH - 2400, 0, 2400, 450),
	});

	// Love Emitter
	this.loveEmitter = this.add.particles(0, 0, 'heart', {
		speed: { min: 60, max: 120 },
		angle: { min: 210, max: 330 },
		scale: { start: 0.5, end: 0 },
		lifespan: 1000,
		frequency: -1,
		gravityY: -100,
		tint: [0xff0000, 0xff4444, 0x990000, 0xff0044, 0xcc0000],
	});
	this.loveEmitter.setDepth(3);

	// Jump Hearts
	heartEmitterBig = this.add.particles(0, 0, 'heart', {
		speed: { min: 28, max: 48 },
		angle: { min: 250, max: 290 },
		scale: { start: 0.7, end: 0.35 },
		alpha: { start: 0.85, end: 0.06 },
		lifespan: 900,
		frequency: -1,
	});

	heartEmitterSmall = this.add.particles(0, 0, 'heart', {
		speed: { min: 16, max: 34 },
		angle: { min: 245, max: 295 },
		scale: { start: 0.5, end: 0.18 },
		lifespan: 850,
		frequency: -1,
		alpha: { start: 0.95, end: 0 },
	});

	// Drop Emitters
	dropEmitter = this.add.particles(0, 0, 'drop', {
		speed: { min: 12, max: 28 },
		angle: { min: 250, max: 290 },
		scale: { start: 0.6, end: 0.2 },
		lifespan: 500,
		frequency: -1,
		alpha: { start: 0.9, end: 0 },
	});

	dropEmitterRef = this.add.particles(0, 0, 'drop', {
		speed: { min: 8, max: 20 },
		angle: { min: 70, max: 110 },
		scale: { start: 0.6, end: 0.2 },
		lifespan: 500,
		frequency: -1,
		alpha: { start: 0.45, end: 0 },
	});

	// Reflection Emitters
	heartEmitterBigRef = this.add.particles(0, 0, 'heart', {
		speed: { min: 10, max: 26 },
		angle: { min: 70, max: 110 },
		scale: { start: 0.65, end: 0.35 },
		lifespan: 900,
		frequency: -1,
		tint: [0xbfa6b0, 0x7f8f99],
		alpha: { start: 0.25, end: 0 },
	});

	heartEmitterSmallRef = this.add.particles(0, 0, 'heart', {
		speed: { min: 10, max: 22 },
		angle: { min: 70, max: 110 },
		scale: { start: 0.5, end: 0.18 },
		lifespan: 800,
		frequency: -1,
		tint: [0xbfa6b0, 0x7f8f99],
		alpha: { start: 0.45, end: 0 },
	});

	// Extra Heart
	heartEmitterExtra = this.add.particles(0, 0, 'heart', {
		speed: { min: 22, max: 44 },
		angle: { min: 240, max: 300 },
		scale: { start: 0.36, end: 0.12 },
		lifespan: 700,
		frequency: -1,
		alpha: { start: 0.9, end: 0 },
	});

	heartEmitterExtraRef = this.add.particles(0, 0, 'heart', {
		speed: { min: 10, max: 26 },
		angle: { min: 70, max: 110 },
		scale: { start: 0.36, end: 0.12 },
		lifespan: 700,
		frequency: -1,
		tint: [0xc6a8b4, 0x8a9aa6],
		alpha: { start: 0.35, end: 0 },
	});

	// Rain
	rainSplashEmitter = this.add.particles(0, 0, 'ripple', {
		scale: { start: 0, end: 1.0 },
		alpha: { start: 0.7, end: 0 },
		lifespan: 600,
		frequency: -1,
		blendMode: 'ADD',
		scaleY: 0.4,
	});
	rainSplashEmitter.setDepth(2);

	let rainBubbleEmitter = this.add.particles(0, 0, 'bubble', {
		speed: { min: 30, max: 60 },
		angle: { min: 240, max: 300 },
		scale: { start: 0.8, end: 0 },
		alpha: { start: 1, end: 0 },
		lifespan: 400,
		gravityY: 200,
		frequency: -1,
	});
	rainBubbleEmitter.setDepth(2);
	this.rainBubbleEmitter = rainBubbleEmitter;

	rainEmitter = this.add.particles(0, 0, 'rain', {
		x: { min: 0, max: WORLD_WIDTH },
		y: -20,
		lifespan: 1500,
		speedY: { min: 600, max: 800 },
		speedX: { min: -10, max: 10 },
		scale: { start: 1, end: 1 },
		quantity: 1,
		frequency: 34,
		alpha: { start: 0.4, end: 0.1 },
		blendMode: 'ADD',
	});
	rainEmitter.setDepth(5);

	// Dither Overlay
	const ditherOverlay = this.add.tileSprite(
		400,
		0,
		400,
		120,
		'dither_gradient',
	);
	ditherOverlay.setOrigin(0.5, 0);
	ditherOverlay.setScale(2, 2);
	ditherOverlay.setScrollFactor(0);
	ditherOverlay.setDepth(-3);
	ditherOverlay.setAlpha(0.6);

	this.ditherOverlay = ditherOverlay;

	// Ending Setup
	// Red Overlay
	redOverlay = this.add.rectangle(0, 0, 800, 450, 0x880000);
	redOverlay.setOrigin(0, 0);
	redOverlay.setScrollFactor(0);
	redOverlay.setDepth(100);
	redOverlay.setAlpha(0);

	// Heart Flood
	heartFloodEmitter = this.add.particles(0, 0, 'heart', {
		speed: { min: 100, max: 300 },
		scale: { start: 0.5, end: 2.0 },
		alpha: { start: 1, end: 0 },
		lifespan: 4000,
		blendMode: 'ADD',
		quantity: 2,
		frequency: -1,
		emitZone: {
			source: new Phaser.Geom.Rectangle(0, 0, 800, 450),
			type: 'random',
			quantity: 50,
		},
	});
	heartFloodEmitter.setDepth(101);
	heartFloodEmitter.setScrollFactor(0);

	// Ending Text
	const screenCenterX = this.cameras.main.width / 2;
	const screenCenterY = this.cameras.main.height / 2;

	endingText = this.add.text(screenCenterX, screenCenterY, '', {
		fontFamily: '"Press Start 2P", "Courier New", monospace',
		fontSize: '16px',
		color: '#ffffff',
		align: 'center',
		stroke: '#ff69b4',
		strokeThickness: 4,
		shadow: { blur: 0, color: '#ff1493', fill: true },
		padding: { x: 20, y: 20 },
	});
	endingText.setOrigin(0.5);
	endingText.setScrollFactor(0);
	endingText.setLineSpacing(20);
	endingText.setDepth(102);

	this.physics.add.overlap(player, this.otherCat, handleEnding, null, this);

	// Story Text
	storyText = this.add.text(screenCenterX, screenCenterY * 2 - 30, '', {
		fontFamily: '"VT323", monospace',
		fontSize: '16px',
		color: '#9e9e9eff',
		align: 'center',
		stroke: '#000000',
		strokeThickness: 3,
		shadow: { blur: 0, color: '#000000', fill: true },
		padding: { x: 10, y: 10 },
	});
	storyText.setOrigin(0.5);
	storyText.setScrollFactor(0);
	storyText.setDepth(150);
	storyText.setAlpha(0);

	// Story Events
	storyEvents = [
		{ x: 100, text: 'The wind bites...', triggered: false },
		{
			x: 800,
			text: 'Another lonely night walking these cracks.',
			triggered: false,
		},
		{
			x: 1600,
			text: 'I wonder if anyone is looking at the same moon?',
			triggered: false,
		},
		{ x: 2400, text: "It's so dark out here.", triggered: false },
		{ x: 3200, text: 'Just keep moving...', triggered: false },
		{ x: 4200, text: "Maybe there's something ahead?", triggered: false },
		{ x: 5700, text: 'Wait... the air feels different.', triggered: false },
		{ x: 6200, text: "It's so beautiful here...", triggered: false },
		{ x: 6800, text: 'I can feel a warming presence <3', triggered: false },
		{ x: 7500, text: 'My heart is beating faster!', triggered: false },
	];
}

function update() {
	// Reflection
	const groundTop = ground.y - ground.displayHeight / 2;

	// Dither Parallax
	this.ditherOverlay.tilePositionX = this.cameras.main.scrollX * 0.2;

	// Background Color
	const colorTransitionStart = WORLD_WIDTH - 2400;
	const transitionEnd = WORLD_WIDTH - 200;

	if (player.x > colorTransitionStart) {
		const progress = Phaser.Math.Clamp(
			(player.x - colorTransitionStart) /
				(transitionEnd - colorTransitionStart),
			0,
			1,
		);
		const skyProgress = Phaser.Math.Clamp(progress * 4, 0, 1);

		const r = Phaser.Math.Linear(26, 135, skyProgress);
		const g = Phaser.Math.Linear(26, 206, skyProgress);
		const b = Phaser.Math.Linear(46, 235, skyProgress);

		const color = Phaser.Display.Color.GetColor(r, g, b);
		this.cameras.main.setBackgroundColor(color);

		if (this.ditherOverlay) {
			const ditherAlpha = Phaser.Math.Clamp(1 - progress * 20, 0, 1);
			this.ditherOverlay.alpha = 0.6 * ditherAlpha;
		}

		if (progress > 0.1) {
			rainEmitter.frequency = -1;
		} else {
			rainEmitter.frequency = 34;
		}
	} else {
		this.cameras.main.setBackgroundColor('#1a1a2e');
		if (this.ditherOverlay) this.ditherOverlay.alpha = 0.6;
		rainEmitter.frequency = 34;
	}

	rainEmitter.forEachAlive((particle) => {
		if (particle.x > colorTransitionStart) {
			particle.life = 0;
			return;
		}

		if (particle.y >= groundTop && particle.y < groundTop + 15) {
			if (Math.random() < 0.35) {
				this.rainBubbleEmitter.emitParticleAt(particle.x, groundTop);
				particle.life = 0;
				return;
			}
		}

		if (particle.y > groundTop + 15) {
			if (Math.random() < 0.18) {
				rainSplashEmitter.emitParticleAt(particle.x, particle.y);
				particle.life = 0;
			}
		}

		if (particle.y > 600) {
			particle.life = 0;
		}
	}, this);

	// Reflection Logic
	const reflectionY = 2 * groundTop - player.y + 2;
	playerReflection.x = player.x;
	playerReflection.y = reflectionY;
	playerReflection.setFrame(player.frame.name);

	playerReflectionBlur.x = player.x;
	playerReflectionBlur.y = reflectionY;
	playerReflectionBlur.setFrame(player.frame.name);

	const distance = Math.max(0, reflectionY - groundTop);
	const transitionStart = WORLD_WIDTH - 2400;
	let reflectionAlphaMult = 1;

	if (player.x > transitionStart) {
		reflectionAlphaMult = 0;
	}

	const maxDist = 220;
	const t = Phaser.Math.Clamp(distance / maxDist, 0, 1);
	const eased = Phaser.Math.Easing.Quadratic.Out(t);

	const sharpAlpha = Phaser.Math.Linear(0.35, 0.06, eased);
	playerReflection.alpha = sharpAlpha * reflectionAlphaMult;
	playerReflectionBlur.alpha = 0.06 * reflectionAlphaMult;

	const blurAlpha = Phaser.Math.Linear(0.02, 0.28, eased);
	let blurScale = Phaser.Math.Linear(1.0, 1.6, eased);
	blurScale = Phaser.Math.Clamp(blurScale, 0.9, 1.6);
	playerReflectionBlur.alpha = blurAlpha * reflectionAlphaMult;
	playerReflectionBlur.setScale(blurScale);

	let verticalStretch = Phaser.Math.Linear(1.0, 1.06, eased);
	verticalStretch = Phaser.Math.Clamp(verticalStretch, 0.98, 1.08);
	playerReflection.setScale(1, verticalStretch);

	// Camera Zoom
	const zoomTriggerX = WORLD_WIDTH - 550;
	if (typeof this.isZoomed === 'undefined') this.isZoomed = false;

	if (player.x > zoomTriggerX && !this.isZoomed) {
		this.isZoomed = true;
		this.tweens.killTweensOf(this);
		this.tweens.add({
			targets: this,
			cinematicProgress: 1,
			duration: 2000,
			ease: 'Sine.easeInOut',
		});
	} else if (player.x < zoomTriggerX && this.isZoomed) {
		this.isZoomed = false;
		this.tweens.killTweensOf(this);
		this.tweens.add({
			targets: this,
			cinematicProgress: 0,
			duration: 2000,
			ease: 'Sine.easeInOut',
		});
	}

	if (this.cameraTarget && this.otherCat) {
		const t = this.cinematicProgress;
		const targetX = Phaser.Math.Linear(player.x, this.otherCat.x, t);
		const targetY = Phaser.Math.Linear(player.y, this.otherCat.y, t);
		this.cameraTarget.setPosition(targetX, targetY);

		const targetZoom = Phaser.Math.Linear(1.0, 1.7, t);
		this.cameras.main.setZoom(targetZoom);
	}

	const currentZoom = this.cameras.main.zoom;
	const screenH = this.cameras.main.height;
	const centerY = screenH / 2;
	const targetBottomDist = 30;
	const visualTargetY = screenH - targetBottomDist;
	storyText.y = centerY + (visualTargetY - centerY) / currentZoom;
	storyText.setScale(1 / currentZoom);

	if (isTransitioning) return;

	// Movement & Physics
	let isInAir = !player.body.touching.down;

	if (cursors.down.isDown && !isInAir) {
		player.setVelocityX(0);
		player.anims.play('drink_' + lastDirection, true);

		drinkEmitTimer++;
		if (drinkEmitTimer >= 8) {
			const dx = lastDirection === 'right' ? 13 : -13;
			const dy = 8.5;
			dropEmitter.emitParticleAt(player.x + dx, player.y + dy);
			dropEmitterRef.emitParticleAt(player.x + dx, reflectionY - dy);
			drinkEmitTimer = 0;
		}
		return;
	}

	if (cursors.left.isDown) {
		player.setVelocityX(-200);
		lastDirection = 'left';
		if (!isInAir) player.anims.play('run_left', true);
	} else if (cursors.right.isDown) {
		player.setVelocityX(200);
		lastDirection = 'right';
		if (!isInAir) player.anims.play('run_right', true);
	} else {
		player.setVelocityX(0);
		if (!isInAir) player.anims.play('idle_' + lastDirection, true);
	}

	// Jump Animation
	if (isInAir) {
		frameCounter++;
		const isRight = lastDirection === 'right';
		const baseFrame = isRight ? 24 : 32;
		let frameToShow;

		if (player.body.velocity.y < -100) {
			frameToShow = baseFrame;
		} else if (player.body.velocity.y >= -100 && player.body.velocity.y <= 50) {
			frameToShow = baseFrame + 3;
		} else {
			const descendingFrame = Math.floor((frameCounter / 6) % 4);
			frameToShow = baseFrame + 4 + descendingFrame;
		}
		player.setFrame(frameToShow);
	} else {
		frameCounter = 0;
	}

	if (cursors.up.isDown && !isInAir) {
		player.setVelocityY(-400);
		heartEmitterBig.emitParticleAt(player.x, player.y);
		heartEmitterSmall.emitParticleAt(player.x + 6, player.y - 4);

		if (player.x <= WORLD_WIDTH - 2400) {
			heartEmitterBigRef.emitParticleAt(player.x, reflectionY);
			heartEmitterSmallRef.emitParticleAt(player.x + 6, reflectionY - 4);
		}

		if (Phaser.Math.FloatBetween(0, 1) < 0.25) {
			heartEmitterExtra.emitParticleAt(player.x - 6, player.y - 6);
			if (player.x <= WORLD_WIDTH - 2400) {
				heartEmitterExtraRef.emitParticleAt(player.x - 6, reflectionY - 6);
			}
		}
	}

	// Love Particles
	if (this.otherCat && this.loveEmitter) {
		const dist = Phaser.Math.Distance.Between(
			player.x,
			player.y,
			this.otherCat.x,
			this.otherCat.y,
		);
		if (dist < 300) {
			const approachFactor = 1 - dist / 300;
			const chance = 0.05 + approachFactor * 0.45;

			if (Math.random() < chance) {
				const xOffset = lastDirection === 'right' ? 12 : -12;
				const randomX = Phaser.Math.Between(-8, 8);
				const randomY = Phaser.Math.Between(-8, 8);
				this.loveEmitter.emitParticleAt(
					player.x + xOffset + randomX,
					player.y - 16 + randomY,
				);
			}
		}
	}

	// Story Events
	storyEvents.forEach((event) => {
		if (!event.triggered && player.x > event.x) {
			event.triggered = true;
			triggerStory(this, event.text);
		}
	});
}

// --- HELPER FUNCTIONS ---

function generateCrack(graphics, startX, startY, size = 'large') {
	let minD = 3,
		maxD = 6;
	if (size === 'small') {
		minD = 1;
		maxD = 3;
	}
	const maxDepth = Phaser.Math.Between(minD, maxD);
	const startVal = Phaser.Math.Between(0, 0x08);
	const endVal = 0x0e;
	const baseAlpha = Phaser.Math.FloatBetween(0.2, 0.45);

	const drawBranch = (x, y, angle, depth) => {
		if (depth > maxDepth) return;

		const t = depth / maxDepth;
		const val = Math.round(startVal + (endVal - startVal) * t);
		const color = Phaser.Display.Color.GetColor(val, val, val);
		const alpha = baseAlpha * (1 - t * 0.5);

		const lineWidth = size === 'small' ? 1 : 1.5;
		graphics.lineStyle(lineWidth, color, alpha);

		const lenMin = size === 'small' ? 5 : 10;
		const lenMax = size === 'small' ? 12 : 25;
		const length = Phaser.Math.Between(lenMin, lenMax);
		const endX = x + Math.cos(angle) * length;
		const endY = y + Math.sin(angle) * length;

		graphics.beginPath();
		graphics.moveTo(x, y);
		graphics.lineTo(endX, endY);
		graphics.strokePath();

		if (endY > startY + 50) return;

		if (depth < maxDepth - 1 && Math.random() < 0.4) {
			const offset1 = Phaser.Math.FloatBetween(0.2, 0.6);
			const offset2 = Phaser.Math.FloatBetween(0.2, 0.6);
			drawBranch(endX, endY, angle + offset1, depth + 1);
			drawBranch(endX, endY, angle - offset2, depth + 1);
		} else {
			const wobble = Phaser.Math.FloatBetween(-0.25, 0.25);
			drawBranch(endX, endY, angle + wobble, depth + 1);
		}
	};

	const startAngle = Math.PI / 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
	drawBranch(startX, startY, startAngle, 0);
}

function handleEnding(player, otherCat) {
	if (isGameFinished) return;
	isGameFinished = true;

	// 1. Stop Player
	player.setVelocity(0, 0);
	player.anims.play('idle_right', true);
	isTransitioning = true;

	this.tweens.killTweensOf(this);
	this.cinematicProgress = 1;

	// 2. Heart Flood
	heartFloodEmitter.frequency = 50;

	this.tweens.add({
		targets: heartFloodEmitter,
		frequency: 10,
		duration: 4000,
		ease: 'Sine.easeIn',
	});

	// Fade to Red
	this.tweens.add({
		targets: redOverlay,
		alpha: 1,
		duration: 6000,
		ease: 'Power2',
	});

	// 3. Typewriter
	const message = "I Love You Alexane,\nGood Valentine's day <3";
	let charIndex = 0;

	this.time.delayedCall(4500, () => {
		this.time.addEvent({
			delay: 96,
			repeat: message.length - 1,
			callback: () => {
				endingText.text += message[charIndex];
				charIndex++;
			},
		});
	});
}

function triggerStory(scene, text) {
	scene.tweens.killTweensOf(storyText);
	storyText.setText('');
	storyText.setAlpha(1);

	let i = 0;
	scene.time.addEvent({
		delay: 50,
		repeat: text.length - 1,
		callback: () => {
			storyText.text += text[i];
			i++;
			if (i === text.length) {
				scene.tweens.add({
					targets: storyText,
					alpha: 0,
					delay: 3000,
					duration: 1000,
					ease: 'Power2',
				});
			}
		},
	});
}
