import { Texture, getTexture } from "./textures";
import { ColorPickerElement } from "./elements/color_picker";
import { SliderElement } from "./elements/slider";
import { Vector2D } from "./math";
import { Entity2D } from "./physics";
import { Canvas2D } from "./canvas";
import { SpriteSelectorElement } from "./elements/sprite_selector";

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
        private static LOOK_FACTOR = 2;

        private state: State;
        private direction: Direction;
        private speed: number;

        private eyesScale: number;
        private scale: Vector2D;
        private wobble: Vector2D;

        private outlineColor: string;
        private outlineThickness: number;

        private name: string;

        private body: Texture;
        private eyes: Texture;
        private mouth: Texture;
        private hand: Texture;

        private weapon!: Texture;
        private weaponScale: Vector2D = new Vector2D(1, 1);
        private currentSwingAngle: number = 0;
        private targetSwingAngle: number = 0;
        private swingVelocity: number = 0;

        private hat!: Texture;
        private hatScale: Vector2D = new Vector2D(1, 1);

        constructor(private canvas: Canvas2D) {
                super(0, 0, Character.WIDTH, Character.HEIGHT);
                this.speed = 3600;

                this.state = State.IDLE;
                this.direction = Direction.LEFT;

                this.name = "";
                const nameInput = document.querySelector<HTMLInputElement>("#name-input")!;
                nameInput.addEventListener("input", () => {
                        this.name = nameInput.value;
                });

                this.body = getTexture("body.svg");
                this.eyes = getTexture("eyes.svg");
                this.mouth = getTexture("mouth.svg");
                this.hand = getTexture("hand.svg");

                const bodyColorPicker = document.querySelector<ColorPickerElement>("#body-color-picker")!;
                bodyColorPicker.addEventListener("input", () => {
                        const bodyPath = this.body.getSVG().querySelector<SVGClipPathElement>("#colorable")!;
                        bodyPath.style.fill = bodyColorPicker.color;
                        this.body.rasterize();

                        const handPath = this.hand.getSVG().querySelector<SVGClipPathElement>("#colorable")!;
                        handPath.style.fill = bodyColorPicker.color;
                        this.hand.rasterize();
                });

                const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
                outlineColorPicker.addEventListener("input", () => {
                        this.outlineColor = outlineColorPicker.color;
                });

                this.outlineColor = "#FFFFFF";

                const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
                this.outlineThickness = outlineThicknessSlider.value;
                outlineThicknessSlider.addEventListener("input", () => {
                        this.outlineThickness = outlineThicknessSlider.value;
                });

                this.eyesScale = 1;
                this.scheduleBlink();

                this.canvas.mouse.onClick(() => {
                        if (this.targetSwingAngle === 120) {
                                this.targetSwingAngle = 0;
                        } else {
                                this.targetSwingAngle = 120;
                        }

                        this.canvas.camera.shake(5);
                });

                this.scale = new Vector2D(1, 1);
                this.wobble = new Vector2D(1, 1);

                this.initializeHatSwitching();
                this.initializeWeaponSwitching();
        }

        initializeHatSwitching() {
                const hatSelector = document.querySelector<SpriteSelectorElement>("#hat-selector")!;
                hatSelector.addEventListener("change", () => {
                        this.hat = hatSelector.sprite;
                        this.hatScale.x += 0.1;
                        this.hatScale.y += 0.1;
                });

                this.hat = hatSelector.sprite;
        }

        initializeWeaponSwitching() {
                const weaponSelector = document.querySelector<SpriteSelectorElement>("#weapon-selector")!;
                weaponSelector.addEventListener("change", () => {
                        this.weapon = weaponSelector.sprite;
                        this.weaponScale.x += 0.1;
                        this.weaponScale.y += 0.1;
                });

                this.weapon = weaponSelector.sprite;
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
                                : (elapsed * 2 - duration) / duration;

                        requestAnimationFrame(blinkFrame);
                };

                window.requestAnimationFrame(blinkFrame);
        }

        update(deltaTime: number) {
                const w = this.canvas.keyboard.checkKey("KeyW, ArrowUp");
                const a = this.canvas.keyboard.checkKey("KeyA, ArrowLeft");
                const s = this.canvas.keyboard.checkKey("KeyS, ArrowDown");
                const d = this.canvas.keyboard.checkKey("KeyD, ArrowRight");

                const h = Number(d) - Number(a);
                const v = Number(s) - Number(w);
                const diagonal = h && v ? 1 / Math.sqrt(2) : 1;

                this.acceleration.x = this.speed * h * diagonal;
                this.acceleration.y = this.speed * v * diagonal;
                super.update(deltaTime);

                this.scale.x += (1 - this.scale.x) * 0.1;
                this.scale.y += (1 - this.scale.y) * 0.1;

                this.hatScale.x += (1 - this.hatScale.x) * 0.1;
                this.hatScale.y += (1 - this.hatScale.y) * 0.1;

                this.weaponScale.x += (1 - this.weaponScale.x) * 0.1;
                this.weaponScale.y += (1 - this.weaponScale.y) * 0.1;

                const currentTime = Date.now();

                this.state = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) > 2 ?
                        State.RUNNING : State.IDLE;

                this.wobble.x = 1 + Math.cos(currentTime / 200) / 40;
                this.wobble.y = 1 + Math.sin(currentTime / 200) / 40;

                this.swingVelocity += (this.targetSwingAngle - this.currentSwingAngle) * 0.1;
                this.swingVelocity *= 0.65;
                this.currentSwingAngle += this.swingVelocity;
                if (Math.abs(this.swingVelocity) < 0.000001) {
                        this.targetSwingAngle = 0;
                }

                const deadzone = this.body.width / 8;
                const distance = this.canvas.mouse.x - this.x;
                if (Math.abs(distance) > deadzone) {
                        const direction = distance < 0 ? Direction.LEFT : Direction.RIGHT;
                        if (direction != this.direction) {
                                this.scale.x += 0.05;
                                this.scale.y += 0.05;
                        }

                        this.direction = direction;
                }
        }

        renderSword(context: CanvasRenderingContext2D, direction: Direction) {
                const shoulderOffsetX = this.body.height / 2.5 * (direction === Direction.LEFT ? 1 : -1);
                const shoulderOffsetY = -this.body.height / 5;
                const handShoulderDistance = this.body.height / 2;

                const swingAngle = direction === Direction.LEFT
                        ? this.currentSwingAngle * Math.PI / 180
                        : -this.currentSwingAngle * Math.PI / 180;

                const swordWidth = this.weapon.width;
                const swordHeight = this.weapon.height;
                const swordOffsetX = 0;
                const swordOffsetY = -this.weapon.height / 4;

                const cursorAngle = Math.atan2(
                        this.canvas.mouse.y - this.y,
                        this.canvas.mouse.x - this.x
                );

                const leftArmAdvanceAngle = cursorAngle - Math.PI / 2;
                const handOffsetX = Math.cos(leftArmAdvanceAngle) * handShoulderDistance;
                const handOffsetY = Math.sin(leftArmAdvanceAngle) * handShoulderDistance;

                context.save();
                context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                context.rotate(cursorAngle + swingAngle); // rotate the arm by the swing angle

                context.translate(handOffsetX, handOffsetY);

                context.rotate(swingAngle - Math.PI / 2); // rotate the wrist by the swing angle

                context.scale(
                        this.weaponScale.x,
                        this.weaponScale.y
                );

                context.drawImage(
                        this.weapon.getImage(false),
                        -swordWidth / 2 + swordOffsetX,
                        -swordHeight / 2 + swordOffsetY,
                        swordWidth,
                        swordHeight
                );

                context.scale(this.wobble.x, this.wobble.y);

                context.drawImage(
                        this.hand.getImage(false),
                        -this.hand.width / 2,
                        -this.hand.height / 2,
                        this.hand.width,
                        this.hand.height
                );

                context.restore();
        }

        renderSpear(context: CanvasRenderingContext2D, direction: Direction) {
                const shoulderOffsetX = this.body.height / 2.5 * (direction === Direction.LEFT ? 1 : -1);
                const shoulderOffsetY = -this.body.height / 5;
                const handShoulderDistance = this.body.height / 2;

                const swordWidth = this.weapon.width;
                const swordHeight = this.weapon.height;
                const swordOffsetX = 0;
                const swordOffsetY = -this.weapon.height / 4;

                const cursorAngle = Math.atan2(
                        this.canvas.mouse.y - this.y,
                        this.canvas.mouse.x - this.x
                );

                const leftArmAdvanceAngle = cursorAngle - Math.PI / 2;
                const handOffsetX = Math.cos(leftArmAdvanceAngle) * handShoulderDistance;
                const handOffsetY = Math.sin(leftArmAdvanceAngle) * handShoulderDistance;

                context.save();
                context.translate(shoulderOffsetX, shoulderOffsetY); // Origin is at shoulder

                context.rotate(cursorAngle + Math.PI / 2);

                context.translate(handOffsetX, handOffsetY);

                context.scale(
                        this.weaponScale.x,
                        this.weaponScale.y
                );

                context.drawImage(
                        this.weapon.getImage(false),
                        -swordWidth / 2 + swordOffsetX,
                        -swordHeight / 2 + swordOffsetY,
                        swordWidth,
                        swordHeight
                );

                context.scale(this.wobble.x, this.wobble.y);

                context.drawImage(
                        this.hand.getImage(false),
                        -this.hand.width / 2,
                        -this.hand.height / 2,
                        this.hand.width,
                        this.hand.height
                );

                context.restore();
        }

        renderHand(context: CanvasRenderingContext2D, direction: Direction) {
                const shoulderOffsetX = this.body.height / 2.5 * (direction === Direction.LEFT ? 1 : -1);
                const shoulderOffsetY = -this.body.height / 5;
                const handShoulderDistance = this.body.height / 2;

                if (this.direction !== direction && this.weapon !== undefined) {
                        const metadata = this.weapon.getMetadata();
                        switch (metadata.behavior) {
                                case "sword":
                                        this.renderSword(context, direction);
                                        return;
                                case "spear":
                                        this.renderSpear(context, direction);
                                        return;
                        }
                }

                const currentTime = Date.now();
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
                        this.hand.getImage(false),
                        -this.hand.width / 2,
                        -this.hand.height / 2,
                        this.hand.width,
                        this.hand.height
                );

                context.restore();
        }

        renderShape(context: CanvasRenderingContext2D) {
                if (this.direction === Direction.RIGHT) {
                        this.renderHand(context, Direction.LEFT);
                } else {
                        this.renderHand(context, Direction.RIGHT);
                }

                context.save();
                context.scale(this.wobble.x, this.wobble.y);

                context.drawImage(
                        this.body.getImage(false),
                        -this.body.width / 2,
                        -this.body.height / 2,
                        this.body.width,
                        this.body.height
                );

                const lookX = (this.canvas.mouse.x - this.x) / this.w * Character.LOOK_FACTOR;
                const lookY = (this.canvas.mouse.y - this.y) / this.h * Character.LOOK_FACTOR;

                context.drawImage(
                        this.eyes.getImage(false),
                        -this.eyes.width / 2 + lookX,
                        -this.eyes.height * this.eyesScale / 2 + lookY - this.body.height / 4,
                        this.eyes.width,
                        this.eyes.height * this.eyesScale
                );

                context.drawImage(
                        this.mouth.getImage(false),
                        -this.mouth.width / 2 + lookX,
                        -this.mouth.height / 2 + lookY + this.body.width / 3,
                        this.mouth.width,
                        this.mouth.height
                );

                context.restore();

                const hatMetadata = this.hat.getMetadata();
                if (hatMetadata.type !== "none") {
                        context.save();
                        context.scale(
                                this.hatScale.x * (this.direction === Direction.RIGHT ? -1 : 1),
                                this.hatScale.y
                        );

                        context.drawImage(
                                this.hat.getImage(false),
                                -this.hat.width / 2 + hatMetadata.offset!.x,
                                -this.hat.height / 2 - this.body.height / 2 + hatMetadata.offset!.y,
                                this.hat.width,
                                this.hat.height
                        );
                        context.restore();
                }

                if (this.direction === Direction.RIGHT) {
                        this.renderHand(context, Direction.RIGHT);
                } else {
                        this.renderHand(context, Direction.LEFT);
                }
        };

        renderCharacter(context: CanvasRenderingContext2D) {
                context.save();
                context.scale(this.scale.x, this.scale.y);

                context.save();
                context.fillStyle = "black";
                context.filter = "blur(10px)";
                context.beginPath();
                context.ellipse(
                        0, this.h / 2,
                        this.w / 1.5, this.h / 6,
                        0, 0, Math.PI * 2
                );

                context.fill();
                context.restore();

                // I need to make the image big enough to contain the whole character sprite
                const BUFFER_WIDTH = this.body.width * 5;
                const BUFFER_HEIGHT = this.body.height * 5;

                const outlined = this.canvas.outliner.process(
                        BUFFER_WIDTH,
                        BUFFER_HEIGHT,
                        this.outlineColor,
                        this.outlineThickness,
                        this.renderShape.bind(this)
                );

                context.drawImage(outlined, -BUFFER_WIDTH / 2, -BUFFER_HEIGHT / 2);
                context.restore();
        }

        render(context: CanvasRenderingContext2D) {
                context.save();

                context.translate(this.x, this.y);

                const logicalScaleX = this.w / this.body.width;
                const logicalScaleY = this.h / this.body.height;
                context.scale(logicalScaleX, logicalScaleY);

                this.renderCharacter(context);

                if (this.name !== "") {
                        context.font = `${this.w}px \"Monaspace Radon\", monospace`;

                        const label = this.name.length <= 20 ? this.name : this.name.substring(0, 19) + "…";
                        const metrics = context.measureText(label);

                        context.lineWidth = this.w / 2;
                        context.strokeStyle = "black";
                        context.strokeText(label, metrics.width / -2, -this.body.height / 2);

                        context.fillStyle = "white";
                        context.fillText(label, metrics.width / -2, -this.body.height / 2);
                }

                context.restore();
        }
}