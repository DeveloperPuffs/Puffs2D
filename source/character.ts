import { TextureSVG } from "./textures";
import { ColorPickerElement } from "./elements";
import { Vector2D, Rectangle2D } from "./math";
import { Entity2D } from "./physics";
import { Canvas2D } from "./canvas";

enum Direction {
        LEFT,
        RIGHT
}

enum State {
        IDLE,
        RUNNING
}

export class Character extends Entity2D {
        private static WIDTH = 50;
        private static HEIGHT = 50;

        private state: State;
        private direction: Direction;
        private speed: number;

        private eyesScale: number;
        private naturalScale: Vector2D;

        private sprite: Rectangle2D;
        private outlineColor: string;
        private outlineThickness: number;

        private keys: Record<string, boolean>;
        private name: string;

        private body: TextureSVG;
        private eyes: TextureSVG;
        private mouth: TextureSVG;
        private hand: TextureSVG;

        private sword: HTMLImageElement | undefined;
        private currentSwingAngle: number = 0;
        private targetSwingAngle: number = 0;
        private swingVelocity: number = 0;

        constructor(private canvas: Canvas2D) {
                super(0, 0, Character.WIDTH, Character.HEIGHT);
                this.speed = 3600;

                this.state = State.IDLE;
                this.direction = Direction.LEFT;
                this.sprite = Rectangle2D.at(this, 50, 50);

                this.keys = {};
                window.addEventListener("keydown", event => {
                        const element = document.activeElement;
                        if (element instanceof HTMLElement) {
                                if (element.tagName === "INPUT" && (element as HTMLInputElement).type === "text") {
                                        return;
                                }

                                if (element.tagName === "TEXTAREA") {
                                        return;
                                }

                                if (element.isContentEditable) {
                                        return;
                                }
                        }

                        this.keys[event.code] = true;
                });

                window.addEventListener("keyup", event => {
                        this.keys[event.code] = false;
                });

                this.name = "";
                const nameInput = document.querySelector<HTMLInputElement>("#name-input")!;
                nameInput.addEventListener("input", () => {
                        this.name = nameInput.value;
                });

                this.body = new TextureSVG("body.svg");
                this.eyes = new TextureSVG("eyes.svg");
                this.mouth = new TextureSVG("mouth.svg");
                this.hand = new TextureSVG("hand.svg");

                this.outlineColor = "#FFFFFF";

                const outlineThicknessSlider = document.querySelector<HTMLInputElement>("#outline-thickness")!;
                this.outlineThickness = Number.parseFloat(outlineThicknessSlider.value);
                outlineThicknessSlider.addEventListener("input", () => {
                        this.outlineThickness = Number.parseFloat(outlineThicknessSlider.value);
                });

                this.eyesScale = 1;
                this.scheduleBlink();

                window.addEventListener("click", () => {
                        if (this.targetSwingAngle === 180) {
                                this.targetSwingAngle = 0;
                        } else {
                                this.targetSwingAngle = 180;
                        }

                        this.canvas.camera.shake(2.5);
                });

                this.naturalScale = new Vector2D(1, 1);
        }

        scheduleBlink() {
                const delay = 2000 + Math.random() * 3000; 
                setTimeout(() => {
                        this.animateBlink();
                }, delay);
        }

        animateBlink() {
                const duration = 100 + Math.random() * 200;
                const startTime = performance.now();

                const blinkFrame = (timestamp: number) => {
                        const elapsed = timestamp - startTime;
                        if (elapsed > duration) {
                                this.eyesScale = 1;
                                this.scheduleBlink();
                                return;
                        }

                        this.eyesScale = elapsed < duration / 2
                                ? 1 - (elapsed * 2 / duration)
                                : (elapsed * 2 - duration) / duration

                        requestAnimationFrame(blinkFrame);
                };

                window.requestAnimationFrame(blinkFrame);
        }

        async load() {
                this.sword = await new Promise((resolve, reject) => {
                        const image = new Image();
                        image.onload = () => {
                                resolve(image);
                        };

                        image.onerror = error => {
                                reject(error);
                        }

                        image.src = "placeholder.png";
                });

                await Promise.all([
                        this.body.load(),
                        this.eyes.load(),
                        this.mouth.load(),
                        this.hand.load()
                ]);

                document.querySelector<ColorPickerElement>("#body-color")!.onColorChange(color => {
                        const bodyPath = this.body.svg!.querySelector<SVGClipPathElement>("#body")!;
                        bodyPath.style.fill = color;
                        this.body.rasterize();

                        const handPath = this.hand.svg!.querySelector<SVGClipPathElement>("#hand")!;
                        handPath.style.fill = color;
                        this.hand.rasterize();
                });

                document.querySelector<ColorPickerElement>("#outline-color")!.onColorChange(color => {
                        this.outlineColor = color;
                });
        }

        update(deltaTime: number) {
                const up = this.keys["ArrowUp"] || this.keys["KeyW"];
                const down = this.keys["ArrowDown"] || this.keys["KeyS"];
                const left = this.keys["ArrowLeft"] || this.keys["KeyA"];
                const right = this.keys["ArrowRight"] || this.keys["KeyD"];

                const horizontal = Number(!!right) - Number(!!left);
                const vertical = Number(!!down) - Number(!!up);
                const diagonal = horizontal && vertical ? 1 / Math.sqrt(2) : 1;

                this.acceleration.x = this.speed * horizontal * diagonal;
                this.acceleration.y = this.speed * vertical * diagonal;
                super.update(deltaTime);

                this.naturalScale.x += (1 - this.naturalScale.x) * 0.1;
                this.naturalScale.y += (1 - this.naturalScale.y) * 0.1;

                const currentTime = Date.now();

                this.state = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) > 2 ?
                        State.RUNNING : State.IDLE;

                this.sprite.x = this.x;
                this.sprite.y = this.y;
                this.sprite.w = this.w * (1 + Math.cos(currentTime / 200) / 40) * this.naturalScale.x;
                this.sprite.h = this.h * (1 + Math.sin(currentTime / 200) / 40) * this.naturalScale.y;

                this.swingVelocity += (this.targetSwingAngle - this.currentSwingAngle) * 0.1;
                this.swingVelocity *= 0.65;
                this.currentSwingAngle += this.swingVelocity;
                if (Math.abs(this.swingVelocity) < 0.000001) {
                        this.targetSwingAngle = 0;
                }
        }

        render() {
                this.canvas.context.save();

                this.canvas.context.translate(this.sprite.x, this.sprite.y);

                this.canvas.context.save();
                this.canvas.context.fillStyle = "black";
                this.canvas.context.filter = "blur(10px)";

                this.canvas.context.beginPath();
                this.canvas.context.ellipse(0, this.sprite.h / 2, this.sprite.w / 1.5, this.sprite.h / 6, 0, 0, Math.PI * 2);
                this.canvas.context.fill();
                this.canvas.context.restore();

                const currentTime = Date.now();

                // I need to make the image big enough to contain the whole character sprite
                const BUFFER_WIDTH = 200;
                const BUFFER_HEIGHT = 200;

                const deadzone = this.sprite.w / 2;
                const distance = this.canvas.cursor.x - this.sprite.x;
                if (Math.abs(distance) > deadzone) {
                        const direction = distance < 0 ? Direction.LEFT : Direction.RIGHT;
                        if (direction != this.direction) {
                                this.naturalScale.x += 0.05;
                                this.naturalScale.y += 0.05;
                        }

                        this.direction = direction;
                }

                // TODO: Add effects to the sword swing

                const outlined = this.canvas.outliner.process(BUFFER_WIDTH, BUFFER_HEIGHT, this.outlineColor, this.outlineThickness, context => {
                        const renderHand = (direction: Direction) => {
                                const handWidth = this.sprite.w / 3;
                                const handHeight = this.sprite.h / 3;

                                const shoulderOffsetX = direction === Direction.LEFT
                                        ? this.sprite.w / 2.5
                                        : -this.sprite.w / 2.5;
                                const shoulderOffsetY = this.sprite.h / -4;
                                const handShoulderDistance = this.sprite.w / 2;

                                if (this.direction !== direction) {
                                        const swingAngle = direction === Direction.LEFT
                                                ? this.currentSwingAngle * Math.PI / 180
                                                : -this.currentSwingAngle * Math.PI / 180;

                                        const swordWidth = this.sprite.w / 2;
                                        const swordHeight = this.sprite.h;
                                        const swordOffsetX = 0;
                                        const swordOffsetY = -15;

                                        const cursorAngle = Math.atan2(
                                                this.canvas.cursor.y - this.sprite.y,
                                                this.canvas.cursor.x - this.sprite.x
                                        );

                                        const leftArmAdvanceAngle = cursorAngle - Math.PI / 2;
                                        const handOffsetX = Math.cos(leftArmAdvanceAngle) * handShoulderDistance;
                                        const handOffsetY = Math.sin(leftArmAdvanceAngle) * handShoulderDistance;

                                        context.save();
                                        context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                                        context.rotate(cursorAngle + swingAngle); // rotate the arm by the swing angle

                                        context.translate(handOffsetX, handOffsetY);

                                        context.rotate(swingAngle - Math.PI / 2); // rotate the wrist by the swing angle

                                        context.drawImage(
                                                this.sword!,
                                                -swordWidth / 2 + swordOffsetX,
                                                -swordHeight / 2 + swordOffsetY,
                                                swordWidth,
                                                swordHeight
                                        );

                                        context.drawImage(
                                                this.hand.image!,
                                                -handWidth / 2,
                                                -handHeight / 2,
                                                handWidth,
                                                handHeight
                                        );

                                        context.restore();
                                        return;
                                }

                                const armAngleRange = this.state === State.RUNNING ? Math.PI / 3 : Math.PI / 30;
                                const armAngle = direction === Direction.LEFT
                                                ? Math.sin((currentTime / 200) + Math.PI) * armAngleRange
                                                : Math.sin((currentTime / 200)) * armAngleRange;

                                const freeHandX = handShoulderDistance * Math.cos(armAngle + Math.PI / 2);
                                const freeHandY = handShoulderDistance * Math.sin(armAngle + Math.PI / 2);

                                context.save();
                                context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                                context.translate(freeHandX, freeHandY);

                                context.drawImage(
                                        this.hand.image!,
                                        -handWidth / 2,
                                        -handHeight / 2,
                                        handWidth,
                                        handHeight
                                );

                                context.restore();
                        };

                        if (this.direction === Direction.RIGHT) {
                                renderHand(Direction.LEFT);
                        } else {
                                renderHand(Direction.RIGHT);
                        }

                        context.drawImage(
                                this.body.image!,
                                -this.sprite.w / 2,
                                -this.sprite.h / 2,
                                this.sprite.w,
                                this.sprite.h
                        );

                        const lookX = (this.canvas.cursor.x - this.sprite.x) / 100;
                        const lookY = (this.canvas.cursor.y - this.sprite.y) / 100;

                        const eyesWidth = this.sprite.w / 1.6;
                        const eyesHeight = this.eyesScale * this.sprite.h / 2;

                        context.drawImage(
                                this.eyes.image!,
                                -eyesWidth / 2 + lookX,
                                -eyesHeight / 2 + lookY - this.sprite.h / 4,
                                eyesWidth,
                                eyesHeight
                        );

                        context.drawImage(
                                this.mouth.image!,
                                -this.sprite.w / 2 + lookX,
                                -this.sprite.h / 2 + lookY,
                                this.sprite.w,
                                this.sprite.h
                        );

                        if (this.direction === Direction.RIGHT) {
                                renderHand(Direction.RIGHT);
                        } else {
                                renderHand(Direction.LEFT);
                        }
                });

                this.canvas.context.drawImage(outlined, -BUFFER_WIDTH / 2, -BUFFER_HEIGHT / 2);

                if (this.name !== "") {
                        let label = this.name;
                        if (label.length > 20) {
                                label = label.substring(0, 19);
                                label += "…";
                        }

                        this.canvas.context.font = "14px \"Monaspace Radon\", monospace";

                        const metrics = this.canvas.context.measureText(label);

                        this.canvas.context.lineWidth = 2;
                        this.canvas.context.strokeStyle = "black";
                        this.canvas.context.strokeText(label, metrics.width / -2, -this.sprite.h / 2);

                        this.canvas.context.fillStyle = "white";
                        this.canvas.context.fillText(label, metrics.width / -2, -this.sprite.h / 2);
                }

                this.canvas.context.restore();
        }
}