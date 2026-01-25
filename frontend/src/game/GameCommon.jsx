import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BalloonSpawner } from "../BalloonSpawner";

export default function GameCommon({ sessionId, level, onGameEnd, showNumbers = false, gameMode = "color", onBlocksReady }) {
	const gameRef = useRef(null);
	const gameInstanceRef = useRef(null);
	const distributionRef = useRef(null);
	const gameModeRef = useRef(gameMode);

	useEffect(() => {
		gameModeRef.current = gameMode;
	}, [gameMode]);

	// Callback für Spielende, wird von Phaser aufgerufen
	const handleGameEnd = (payload) => {
		if (onGameEnd) {
			onGameEnd(payload);
		}
	};

	useEffect(() => {
		const WIDTH = 800;
		const HEIGHT = 600;

		async function ensureDistribution() {
			if (!sessionId) return;
			try {
				const res = await fetch(`http://localhost:3000/get-distribution/${sessionId}?source=generated`);
				const js = await res.json();
				if (js && js.distribution && js.distribution.samples) {
					distributionRef.current = js.distribution.samples;
					console.log('[GameCommon] fetched distribution length:', distributionRef.current.length);
				}
			} catch (e) {
				console.warn('Failed to fetch generated distribution', e);
			}
		}

		class MainScene extends Phaser.Scene {
			constructor() {
				super({ key: "MainScene" });
			this.timer = 20; // Sekunden (angepasst)
				this.distribution = null;
				this.blockValues = [];
				this.balloonSpawner = null;
				this.blockIndexMap = new Map();
				this.gameMode = null;
			}
			preload() {
				// Bevorzugt ein JPG-Hintergrundbild laden; WebP als Fallback
				this.load.image('forestBgJpg', '/leiterspiel/minispiel/forest-bg.jpg');
				this.load.image('forestBgWebp', '/leiterspiel/minispiel/DüstererWald.jpg.webp');
			}
			create() {
				// Hintergrund: JPG bevorzugt, sonst WebP; wenn beides fehlt, dunkler Fallback
				let bg = null;
				if (this.textures && this.textures.exists('forestBgJpg')) {
					bg = this.add.image(WIDTH / 2, HEIGHT / 2, 'forestBgJpg');
				} else if (this.textures && this.textures.exists('forestBgWebp')) {
					bg = this.add.image(WIDTH / 2, HEIGHT / 2, 'forestBgWebp');
				}
				if (bg) {
					bg.setDisplaySize(WIDTH, HEIGHT);
					bg.setDepth(-1);
					// leichte Abdunklung für konsistenten dunklen Look
					bg.setTint(0x0b2e1b);
				} else {
					const base = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0a0f14, 1);
					base.setDepth(-1);
				}

				// Waldtextur: Bäume über den ganzen Bildschirm in drei Tiefenebenen
				const trees = this.add.graphics();
				trees.setDepth(-0.5);
				// Ferne Ebene (oben bis Mitte) – kleiner, transparenter
				for (let yBase = 140; yBase <= HEIGHT - 220; yBase += 60) {
					for (let i = 0; i < 10; i++) {
						const x = 40 + i * ((WIDTH - 80) / 9) + Phaser.Math.Between(-14, 14);
						const h = Phaser.Math.Between(22, 34);
						const w = Math.max(14, Math.floor(h * 0.58));
						const trunkW = Math.max(3, Math.floor(w * 0.16));
						const trunkH = Math.max(6, Math.floor(h * 0.30));
						const y = yBase + Phaser.Math.Between(-6, 6);
						trees.fillStyle(0x1c3a25, 0.40);
						trees.fillTriangle(x, y - h, x - w / 2, y - trunkH, x + w / 2, y - trunkH);
						trees.fillStyle(0x4a3a2a, 0.55);
						trees.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
					}
				}
				// Mittlere Ebene (Mitte)
				for (let yBase = HEIGHT - 260; yBase <= HEIGHT - 140; yBase += 50) {
					for (let i = 0; i < 11; i++) {
						const x = 40 + i * ((WIDTH - 80) / 10) + Phaser.Math.Between(-12, 12);
						const h = Phaser.Math.Between(26, 40);
						const w = Math.max(16, Math.floor(h * 0.6));
						const trunkW = Math.max(3, Math.floor(w * 0.18));
						const trunkH = Math.max(6, Math.floor(h * 0.32));
						const y = yBase + Phaser.Math.Between(-6, 6);
						trees.fillStyle(0x224c30, 0.68);
						trees.fillTriangle(x, y - h, x - w / 2, y - trunkH, x + w / 2, y - trunkH);
						trees.fillStyle(0x5a4635, 0.78);
						trees.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
					}
				}
				// Nahe Ebene (unten) – größer, sichtbarer
				for (let yBase = HEIGHT - 120; yBase <= HEIGHT - 80; yBase += 40) {
					for (let i = 0; i < 12; i++) {
						const x = 40 + i * ((WIDTH - 80) / 11) + Phaser.Math.Between(-10, 10);
						const h = Phaser.Math.Between(32, 52);
						const w = Math.max(18, Math.floor(h * 0.62));
						const trunkW = Math.max(4, Math.floor(w * 0.20));
						const trunkH = Math.max(8, Math.floor(h * 0.34));
						const y = yBase + Phaser.Math.Between(-6, 6);
						trees.fillStyle(0x255636, 0.78);
						trees.fillTriangle(x, y - h, x - w / 2, y - trunkH, x + w / 2, y - trunkH);
						trees.fillStyle(0x6a513d, 0.85);
						trees.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
					}
				}
				
				// Sehr dunkles Overlay, damit Bälle/Objekte klar sichtbar bleiben
				const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.82);
				overlay.setDepth(0);

				// Rahmen entfernt: Der grüne Rand wird als CSS-Border am Container gesetzt
				
				this.gameMode = gameModeRef.current;
				this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
				this.paddle = this.add.rectangle(WIDTH / 2, HEIGHT - 40, 120, 16, 0xFF0000);
				this.physics.add.existing(this.paddle, false);
				this.paddle.body.setImmovable(true);
				this.paddle.body.setCollideWorldBounds(true);
				this.ball = this.add.circle(WIDTH / 2, HEIGHT - 80, 8, 0xFF0000);
				this.physics.add.existing(this.ball);
				this.ball.body.setBounce(1.05, 1.05);
				this.ball.body.setCollideWorldBounds(false);
				this.ball.body.setVelocity(300, -500);
				const wallGroup = this.physics.add.staticGroup();
				const topWall = this.add.rectangle(WIDTH / 2, -10, WIDTH + 20, 20);
				this.physics.add.existing(topWall, true);
				wallGroup.add(topWall);
				const leftWall = this.add.rectangle(-10, HEIGHT / 2, 20, HEIGHT + 20);
				this.physics.add.existing(leftWall, true);
				wallGroup.add(leftWall);
				const rightWall = this.add.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT + 20);
				this.physics.add.existing(rightWall, true);
				wallGroup.add(rightWall);
				this.physics.add.collider(this.ball, wallGroup);
				const bottomWall = this.add.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH + 20, 20);
				this.physics.add.existing(bottomWall, true);
				const bottomGroup = this.physics.add.staticGroup();
				bottomGroup.add(bottomWall);
				// Wände unsichtbar halten (nur Physik, keine optische Neon-Kante)
				topWall.visible = false;
				leftWall.visible = false;
				rightWall.visible = false;
				bottomWall.visible = false;
				this.blocksGroup = this.physics.add.staticGroup();
				this.physics.add.collider(this.ball, this.paddle, this.handlePaddleBounce, null, this);
				this.distribution = distributionRef.current || [];
				console.log('[GameCommon] scene create, gameMode=', this.gameMode, 'distribution length=', this.distribution.length);
				this.balloonSpawner = new BalloonSpawner(this.distribution);
				this.createBlocks();
				this.balloonsList = [];
				this.balloonsGroup = this.physics.add.group();
				this.physics.add.collider(this.balloonsGroup, bottomGroup, (balloon, bottom) => {
					try {
							const base = Phaser.Math.Between(360, 480);
							const mod = Math.round((balloon.__value !== undefined ? (100 - balloon.__value) : 50) * 0.35);
							balloon.body.setVelocityY(-Math.max(300, base - mod));
							balloon.body.setVelocityX(Phaser.Math.Between(-80, 80));
							balloon.body.setBounce(0.94);
					} catch (e) {}
				});
				this.physics.add.collider(this.balloonsGroup, wallGroup);
				this.physics.add.collider(this.ball, this.blocksGroup, this.handleBlockCollision, null, this);
				this.timerText = this.add.text(10, 10, `Zeit: ${this.timer}`, { 
					font: "bold 20px Arial", 
					fill: "#ffffff",
					stroke: "#000000",
					strokeThickness: 3
				}).setDepth(10);
				this.timeEvent = this.time.addEvent({ delay: 1000, callback: this.onTick, callbackScope: this, loop: true });
				this.ended = false;
				this.input.on('pointermove', pointer => {
					this.paddle.x = Phaser.Math.Clamp(pointer.x, 60, WIDTH - 60);
					this.paddle.body.x = this.paddle.x - this.paddle.width/2;
				});
				this.cursors = this.input.keyboard.createCursorKeys();
			}
			update() {
				if (this.ended) return;
				if (this.cursors.left.isDown) {
					this.paddle.x -= 6;
					this.paddle.body.x = this.paddle.x - this.paddle.width/2;
				} else if (this.cursors.right.isDown) {
					this.paddle.x += 6;
					this.paddle.body.x = this.paddle.x - this.paddle.width/2;
				}
				if (this.ball.y > this.scale.height - 20 && !this.ball.__resetting) {
					this.ball.__resetting = true;
					this.time.delayedCall(1000, () => {
						if (!this.ended) {
							this.ball.x = this.paddle.x;
							this.ball.y = this.paddle.y - 30;
							this.ball.body.setVelocity(0, -500);
							this.ball.__resetting = false;
						}
					});
				}
				if (this.balloonsList && this.balloonsList.length) {
					for (let b of this.balloonsList) {
						if (!b || !b.body) continue;
						if (b.__label) {
							b.__label.x = b.x - 10;
							b.__label.y = b.y - 8;
						}
					}
				}
			}
			handlePaddleBounce(ball, paddle) {
				const diff = ball.x - paddle.x;
				ball.body.setVelocityX(8 * diff);
			}
			handleBlockCollision(ball, block) {
				const blockIndex = this.blockIndexMap.get(block) || 0;
				const spawnX = block.x;
				const spawnY = block.y;
				block.destroy();
				const balloonValue = this.balloonSpawner.getBalloonsForBlock(blockIndex);
				this.spawnBalloon(spawnX, spawnY, balloonValue);
			}
			createBlocks() {
				const n = this.distribution.length;
				if (n === 0) return;
				// Möglichst quadratische Anordnung
				const cols = Math.ceil(Math.sqrt(n));
				const rows = Math.ceil(n / cols);
				const blockW = Math.floor((800 - 2 * 80 - (cols - 1) * 6) / cols);
				const blockH = Math.floor((180 - 2 * 20 - (rows - 1) * 6) / rows);
				const startX = 80 + blockW / 2;
				const startY = 40 + blockH / 2;
				this.blocks = [];
				let sampleIndex = 0;
				for (let r = 0; r < rows; r++) {
					for (let c = 0; c < cols; c++) {
						if (sampleIndex >= n) break;
						const x = startX + c * (blockW + 6);
						const y = startY + r * (blockH + 6);
						const color = 0x888888;
						const rect = this.add.rectangle(x, y, blockW, blockH, color).setOrigin(0.5, 0.5);
						this.physics.add.existing(rect, true);
						this.blocksGroup.add(rect);
						const value = this.distribution[sampleIndex];
						rect.__balloonValue = value;
						this.blocks.push(rect);
						this.blockIndexMap.set(rect, sampleIndex);
						sampleIndex++;
					}
				}
				if (this.balloonSpawner && typeof this.balloonSpawner.prepare === 'function') {
					this.balloonSpawner.prepare(n);
				}
				if (onBlocksReady) {
					onBlocksReady(this.blocks);
				}
			}
			spawnBalloon(x, y, value) {
				let colorHex, displayValue;
				if (this.gameMode === "number") {
					colorHex = 0xFFD700;
					displayValue = Math.round(value);
				} else {
					const shade = 255 - Math.round((value / 100) * 255);
					colorHex = (shade << 16) | (shade << 8) | shade;
					displayValue = Math.round(value);
				}
			const radius = 16;
				const balloon = this.add.ellipse(x, y, radius * 2, radius * 2, colorHex).setStrokeStyle(2, 0x222222);
				this.physics.add.existing(balloon);
				balloon.body.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-220, -120));
				balloon.body.setBounce(0.92);
				balloon.body.setCollideWorldBounds(true);
				balloon.__value = value;
				if (this.gameMode === "number" || showNumbers) {
				const lbl = this.add.text(x - 10, y - 8, String(displayValue), { font: this.gameMode === "number" ? '18px Arial bold' : '16px Arial bold', fill: '#000' }).setDepth(9);
					balloon.__label = lbl;
				}
				this.balloonsGroup.add(balloon);
				this.balloonsList.push(balloon);
				const MAX_BALLOONS = this.distribution.length > 0 ? this.distribution.length : 50;
				while (this.balloonsList.length > MAX_BALLOONS) {
					const old = this.balloonsList.shift();
					try { if (old.__label) old.__label.destroy(); } catch (e) {}
					try { old.destroy(); } catch (e) {}
				}
			}
			onTick() {
				this.timer -= 1;
				this.timerText.setText(`Time: ${this.timer}`);
				if (this.timer <= 0 && !this.ended) {
					this.endGame();
				}
			}
			endGame() {
				this.ended = true;
				this.physics.pause();
				this.timeEvent.remove(false);
				distributionRef.current = this.distribution;
				handleGameEnd({ distribution: this.distribution });
			}
		}

		(async () => {
			await ensureDistribution();
			const config = {
				type: Phaser.AUTO,
				width: WIDTH,
				height: HEIGHT,
				parent: gameRef.current,
				backgroundColor: '#0a0f14',
				physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
				scene: [MainScene],
			};
			if (gameInstanceRef.current) {
				try { gameInstanceRef.current.destroy(true); } catch (e) {}
			}
			const game = new Phaser.Game(config);
			gameInstanceRef.current = game;
		})();
		return () => {
			try { gameInstanceRef.current?.destroy(true); } catch (e) {}
			gameInstanceRef.current = null;
		};
	}, [sessionId, level, onGameEnd, showNumbers, gameMode]);

	return (
		<div ref={gameRef} className="mx-auto" style={{ width: 800, height: 600, border: '12px solid #0b2e1b', boxSizing: 'content-box' }} />
	);
}
