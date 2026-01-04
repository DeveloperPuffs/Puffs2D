const svgParser = new DOMParser();

async function loadSVG(url) {
        const response = await fetch(url);
        const text = await response.text();
        return svgParser.parseFromString(text, "image/svg+xml");
}

async function convertSVG(svg) {
        const serializer = new XMLSerializer();
        const string = serializer.serializeToString(svg);

        const blob = new Blob([string], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const image = new Image();

        return new Promise((resolve, reject) => {
                image.onload = () => {
                        resolve(image);
                };

                image.onerror = error => {
                        reject(image);
                };

                image.src = url;
        });
}

export class Character {
        constructor(canvas, context) {
                this.canvas = canvas;
                this.context = context;

                this.x = 0;
                this.y = 0;
                this.width = 50;
                this.height = 50;
                this.direction = true; // Left: false, Right: True

                this.velocityX = 0;
                this.velocityY = 0;
                this.friction = 0.25;
                this.speed = 100;

                this.sightX = 0;
                this.sightY = 0;

                window.addEventListener("mousemove", event => {
                        const rectangle = this.canvas.getBoundingClientRect();
                        this.sightX = event.clientX - rectangle.left;
                        this.sightY = event.clientY - rectangle.top;
                });

                this.queuedBodyColor = null;
                this.bodyColorLoading = false;

                this.keys = {};

                window.addEventListener("keydown", event => {
                        const element = document.activeElement;
                        if (element.tagName === "INPUT" && element.type === "text") {
                                return;
                        }

                        if (element.tagName === "TEXTAREA") {
                                return;
                        }
                        
                        if (element.isContentEditable) {
                                return;
                        }

                        this.keys[event.code] = true;
                });

                window.addEventListener("keyup", event => {
                        this.keys[event.code] = false;
                });

                this.name = "";
                const nameInput = document.querySelector("#name-input");
                nameInput.addEventListener("input", () => {
                        this.name = nameInput.value;
                });
        }

        async load() {
                this.bodySVG = await loadSVG("body.svg");
                this.eyesSVG = await loadSVG("eyes.svg");
                this.mouthSVG = await loadSVG("mouth.svg");
                this.handSVG = await loadSVG("hand.svg");

                this.bodyImage = await convertSVG(this.bodySVG);
                this.eyesImage = await convertSVG(this.eyesSVG);
                this.mouthImage = await convertSVG(this.mouthSVG);
                this.handImage = await convertSVG(this.handSVG);

                const colorPicker = document.querySelector("#body-color");
                colorPicker.onColorChange(color => {
                        const path = this.bodySVG.querySelector("#body");
                        path.style.fill = color;

                        if (this.bodyColorLoading) {
                                this.queuedBodyColor = color;
                        } else {
                                this.refreshBodyImage(color);
                        }
                });

                // TODO: Make eyes blink at an inverval
                // TODO: Options to toggle blinking, control blink interval, speed?
        }

        update(deltaTime) {
                if (typeof deltaTime !== "number" || Number.isNaN(deltaTime)) {
                        deltaTime = 0;
                }

                const up = this.keys["ArrowUp"] || this.keys["KeyW"];
                const down = this.keys["ArrowDown"] || this.keys["KeyS"];
                const left = this.keys["ArrowLeft"] || this.keys["KeyA"];
                const right = this.keys["ArrowRight"] || this.keys["KeyD"];

                const horizontal = Number(!!right) - Number(!!left);
                const vertical = Number(!!down) - Number(!!up);
                const diagonal = horizontal && vertical ? 1 / Math.sqrt(2) : 1;

                if (horizontal === 1 || horizontal === -1) {
                        this.direction = horizontal === 1;
                }

                this.velocityX += this.width * this.speed * horizontal * diagonal * deltaTime;
                this.velocityY += this.height * this.speed * vertical * diagonal * deltaTime;
                this.velocityX -= this.width * this.velocityX * this.friction * deltaTime;
                this.velocityY -= this.height * this.velocityY * this.friction * deltaTime;
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
        }

        renderLeftHand(width, height, currentTime) {
                const handWidth = width / 3;
                const handHeight = height / 3;

                const shoulderOffsetX = -width * 0.6;
                const shoulderOffsetY = height * -0.3;

                const running = Math.abs(this.velocityX) + Math.abs(this.velocityY) > 2;

                const handShoulderDistance = width / 3;
                const armAngleRange = running ? Math.PI / 3 : Math.PI / 30;
                const armAngle = Math.sin(currentTime / 200) * armAngleRange;

                this.context.save();
                this.context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                this.context.drawImage(
                        this.handImage,
                        handShoulderDistance * Math.cos(armAngle + Math.PI / 2),
                        handShoulderDistance * Math.sin(armAngle + Math.PI / 2),
                        handWidth,
                        handHeight
                );

                this.context.restore();
        }

        renderRightHand(width, height, currentTime) {
                const handWidth = width / 3;
                const handHeight = height / 3;

                const shoulderOffsetX = width * 0.2;
                const shoulderOffsetY = height * -0.3;

                const running = Math.abs(this.velocityX) + Math.abs(this.velocityY) > 2;

                const handShoulderDistance = width / 3;
                const armAngleRange = running ? Math.PI / 3 : Math.PI / 30;
                const armAngle = Math.sin((currentTime / 200) + Math.PI) * armAngleRange;

                this.context.save();
                this.context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                this.context.drawImage(
                        this.handImage,
                        handShoulderDistance * Math.cos(armAngle + Math.PI / 2),
                        handShoulderDistance * Math.sin(armAngle + Math.PI / 2),
                        handWidth,
                        handHeight
                );

                this.context.restore();
        }

        render(currentTime) {
                const scaleX = 1 + Math.cos(currentTime / 200) / 40;
                const scaleY = 1 + Math.sin(currentTime / 200) / 40;

                const width = this.width * scaleX;
                const height = this.height * scaleY;

                this.context.save();

                this.context.translate(this.x, this.y);

                this.context.save();
                this.context.fillStyle = "black";
                this.context.globalAlpha = 0.5;
                this.context.filter = "blur(8px)";

                this.context.beginPath();
                this.context.ellipse(0, height / 2, width / 1.5, height / 6, 0, 0, Math.PI * 2);
                this.context.fill();
                this.context.restore();

                if (this.direction) {
                        this.renderRightHand(width, height, currentTime);
                } else {
                        this.renderLeftHand(width, height, currentTime);
                }

                this.context.drawImage(
                        this.bodyImage,
                        -width / 2,
                        -height / 2,
                        width,
                        height
                );

                const lookX = (this.sightX - this.canvas.clientWidth / 2) * this.width / 7500;
                const lookY = (this.sightY - this.canvas.clientHeight / 2) * this.height / 7500;

                this.context.drawImage(
                        this.eyesImage,
                        -width / 2 + lookX + (this.direction ? width / 16 : -width / 16),
                        -height / 2 + lookY,
                        width,
                        height
                );

                this.context.drawImage(
                        this.mouthImage,
                        -width / 2 + (this.direction ? width / 16 : -width / 16),
                        -height / 2,
                        width,
                        height
                );

                if (this.direction) {
                        this.renderLeftHand(width, height, currentTime);
                } else {
                        this.renderRightHand(width, height, currentTime);
                }

                if (this.name !== "") {
                        let label = this.name;
                        if (label.length > 20) {
                                label = label.substring(0, 19);
                                label += "…";
                        }

                        this.context.font = "14px \"Monaspace Radon\", monospace";

                        const metrics = this.context.measureText(label);

                        this.context.lineWidth = 2;
                        this.context.strokeStyle = "black";
                        this.context.strokeText(label, metrics.width / -2, -height / 2);

                        this.context.fillStyle = "white";
                        this.context.fillText(label, metrics.width / -2, -height / 2);
                }

                this.context.restore();
        }

        async refreshBodyImage(color) {
                this.bodyColorLoading = true;
                this.bodyImage = await convertSVG(this.bodySVG);
                this.bodyColorLoading = false;

                if (this.queuedBodyColor !== null && this.queuedBodyColor !== color) {
                        const color = this.queuedBodyColor;
                        this.queuedBodyColor = null;
                        this.refreshBodyImage(color);
                }
        }
}