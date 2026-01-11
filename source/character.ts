import { Texture, getTexture } from "./textures";
import { ColorPickerElement } from "./elements/color_picker";
import { SpriteSelectorElement } from "./elements/sprite_selector";
import { SliderElement } from "./elements/slider";
import { Vector2D } from "./math";
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

type Swing = {
        type: "swing";
        currentSwingAngle: number;
        targetSwingAngle: number;
        swingVelocity: number;
        swingAngleRange: 120;
        swingThreshold: 0.000001;
};

function createSwing(): Swing {
        return {
                type: "swing",
                currentSwingAngle: 0,
                targetSwingAngle: 0,
                swingVelocity: 0,
                swingAngleRange: 120,
                swingThreshold: 0.000001
        }
}

type Jab = {
        type: "jab";
        thrust: number;
        thrusting: boolean;
        progress: number;
        distance: 250;
};

function createJab(): Jab {
        return {
                type: "jab",
                thrust: 0,
                thrusting: false,
                progress: 0,
                distance: 250
        }
}

export class Character extends Entity2D {
        private static WIDTH = 50;
        private static HEIGHT = 50;
        private static LOOK_FACTOR = 2;

        private static IDLE_ARM_ANGLE_RANGE = Math.PI / 20;
        private static RUNNING_ARM_ANGLE_RANGE = Math.PI / 4;

        private state: State = State.IDLE;
        private direction: Direction = Direction.LEFT;
        private speed: number = 3600;

        private eyesScale: number = 1;
        private scale: Vector2D = new Vector2D(1, 1);
        private wobble: Vector2D = new Vector2D(1, 1);

        private outlineColor: string;
        private outlineThickness: number;

        private name: string;

        private body: Texture;
        private eyes: Texture;
        private mouth: Texture;
        private hand: Texture;

        private currentArmAngleRange: number = Character.IDLE_ARM_ANGLE_RANGE;
        private targetArmAngleRange: number = Character.IDLE_ARM_ANGLE_RANGE;
        private leftShoulderOffset: Vector2D = Vector2D.zero();
        private rightShoulderOffset: Vector2D = Vector2D.zero();

        private weapon: Texture;
        private weaponBehavior?: Swing | Jab = undefined;
        private weaponScale: Vector2D = new Vector2D(1, 1);

        private headwear: Texture;
        private headwearScale: Vector2D = new Vector2D(1, 1);

        constructor(private canvas: Canvas2D) {
                super(0, 0, Character.WIDTH, Character.HEIGHT);

                const nameInput = document.querySelector<HTMLInputElement>("#name-input")!;
                nameInput.addEventListener("input", () => {
                        this.name = nameInput.value;
                });

                this.name = nameInput.value;

                this.body = getTexture("body.svg");
                this.eyes = getTexture("eyes.svg");
                this.mouth = getTexture("mouth.svg");
                this.hand = getTexture("hand.svg");

                this.leftShoulderOffset.x = this.body.width / 2.5;
                this.leftShoulderOffset.y = -this.body.height / 5;
                this.rightShoulderOffset.x = -this.body.width / 2.5;
                this.rightShoulderOffset.y = -this.body.height / 5;

                const bodyColorPicker = document.querySelector<ColorPickerElement>("#body-color-picker")!;
                bodyColorPicker.addEventListener("input", () => {
                        const bodyPath = this.body.getSVG()!.querySelector<SVGClipPathElement>("#colorable")!;
                        bodyPath.style.fill = bodyColorPicker.color;
                        this.body.rasterize();

                        const handPath = this.hand.getSVG()!.querySelector<SVGClipPathElement>("#colorable")!;
                        handPath.style.fill = bodyColorPicker.color;
                        this.hand.rasterize();
                });

                const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
                outlineColorPicker.addEventListener("input", () => {
                        this.outlineColor = outlineColorPicker.color;
                });

                const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
                outlineThicknessSlider.addEventListener("input", () => {
                        this.outlineThickness = outlineThicknessSlider.value;
                });

                this.outlineColor = outlineColorPicker.color;
                this.outlineThickness = outlineThicknessSlider.value;

                this.scheduleBlink();

                this.canvas.onClick(() => {
                        switch (this.weaponBehavior?.type) {
                                case "swing": {
                                        const swing = this.weaponBehavior;
                                        if (swing.targetSwingAngle === swing.swingAngleRange) {
                                                swing.targetSwingAngle = 0;
                                        } else if (swing.targetSwingAngle === 0) {
                                                swing.targetSwingAngle = swing.swingAngleRange;
                                        } else {
                                                return;
                                        }

                                        break;
                                }

                                case "jab": {
                                        const jab = this.weaponBehavior;
                                        if (jab.thrusting) {
                                                return;
                                        }

                                        jab.thrusting = true;
                                        break;
                                }

                                default:
                                        return;
                        }

                        this.canvas.camera.shake(10);
                });

                const headwearSelector = document.querySelector<SpriteSelectorElement>("#headwear-selector")!;
                headwearSelector.addEventListener("change", () => {
                        this.headwear = headwearSelector.sprite;
                        this.headwearScale.x += 0.1;
                        this.headwearScale.y += 0.1;
                });

                this.headwear = headwearSelector.sprite;

                const weaponSelector = document.querySelector<SpriteSelectorElement>("#weapon-selector")!;
                weaponSelector.addEventListener("change", () => {
                        this.weapon = weaponSelector.sprite;
                        this.weaponScale.x += 0.1;
                        this.weaponScale.y += 0.1;

                        switch (this.weapon.metadata.behavior) {
                                case "sword":
                                        this.weaponBehavior = createSwing();
                                        break;
                                case "spear":
                                        this.weaponBehavior = createJab();
                                        break;
                                default:
                                        this.weaponBehavior = undefined;
                                        break;
                        }
                });

                this.weapon = weaponSelector.sprite;
                this.weaponBehavior = undefined;
        }

        private scheduleBlink() {
                const delay = 2000 + Math.random() * 3000; 
                setTimeout(() => {
                        this.animateBlink();
                }, delay);
        }

        private animateBlink() {
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
                const w = this.canvas.checkKey("KeyW, ArrowUp");
                const a = this.canvas.checkKey("KeyA, ArrowLeft");
                const s = this.canvas.checkKey("KeyS, ArrowDown");
                const d = this.canvas.checkKey("KeyD, ArrowRight");

                const h = Number(d) - Number(a);
                const v = Number(s) - Number(w);
                const diagonal = h && v ? 1 / Math.sqrt(2) : 1;

                this.acceleration.x = this.speed * h * diagonal;
                this.acceleration.y = this.speed * v * diagonal;
                super.update(deltaTime);

                this.scale.x += (1 - this.scale.x) * 0.1;
                this.scale.y += (1 - this.scale.y) * 0.1;

                this.headwearScale.x += (1 - this.headwearScale.x) * 0.1;
                this.headwearScale.y += (1 - this.headwearScale.y) * 0.1;

                this.weaponScale.x += (1 - this.weaponScale.x) * 0.1;
                this.weaponScale.y += (1 - this.weaponScale.y) * 0.1;

                const currentTime = Date.now();

                this.state = h || v ? State.RUNNING : State.IDLE;

                this.targetArmAngleRange = this.state === State.RUNNING
                        ? Character.RUNNING_ARM_ANGLE_RANGE
                        : Character.IDLE_ARM_ANGLE_RANGE;
                this.currentArmAngleRange += 4 * (this.targetArmAngleRange - this.currentArmAngleRange) * deltaTime;

                this.wobble.x = 1 + Math.cos(currentTime / 200) / 40;
                this.wobble.y = 1 + Math.sin(currentTime / 200) / 40;

                switch (this.weaponBehavior?.type) {
                        case "swing": {
                                const swing = this.weaponBehavior;
                                swing.swingVelocity += (swing.targetSwingAngle - swing.currentSwingAngle) * 0.1;
                                swing.swingVelocity *= 0.65;
                                swing.currentSwingAngle += swing.swingVelocity;
                                if (Math.abs(swing.swingVelocity) < swing.swingThreshold) {
                                        swing.targetSwingAngle = 0;
                                }

                                break;
                        }

                        case "jab": {
                                const jab = this.weaponBehavior;
                                if (jab.thrusting) {
                                        jab.progress += 2.5 * deltaTime;
                                        if (jab.progress >= 1) {
                                                jab.progress = 0;
                                                jab.thrusting = false;
                                        }
                                }

                                const PEAK = 0.2;
                                const animateTip = (t: number) => {
                                        return t < PEAK
                                                ? (t / PEAK) * (t / PEAK)
                                                : 1 - ((t - PEAK) / (1 - PEAK)) ** 2;
                                }

                                jab.thrust = animateTip(jab.progress) * jab.distance;
                                console.log(jab.thrust);

                                break;
                        }
                }

                const deadzone = this.body.width / 20;
                const distance = this.canvas.cursor.x - this.x;
                if (Math.abs(distance) > deadzone) {
                        const direction = distance < 0 ? Direction.LEFT : Direction.RIGHT;
                        if (direction != this.direction) {
                                this.scale.x += 0.05;
                                this.scale.y += 0.05;
                        }

                        this.direction = direction;
                }
        }

        private renderSword(context: CanvasRenderingContext2D, direction: Direction) {
                const swing = this.weaponBehavior as Swing;

                const swingAngle = direction === Direction.LEFT
                        ? swing.currentSwingAngle * Math.PI / 180
                        : -swing.currentSwingAngle * Math.PI / 180;

                const swordWidth = this.weapon.width;
                const swordHeight = this.weapon.height;
                const swordOffsetX = 0;
                const swordOffsetY = -this.weapon.height / 4;

                const cursorAngle = Math.atan2(
                        this.canvas.cursor.y - this.y,
                        this.canvas.cursor.x - this.x
                );

                const armAdvanceAngle = cursorAngle - Math.PI / 2;
                const handShoulderDistance = this.body.height / 2;
                const handOffsetX = Math.cos(armAdvanceAngle) * handShoulderDistance;
                const handOffsetY = Math.sin(armAdvanceAngle) * handShoulderDistance;

                context.save();
                const shoulderOffset = direction === Direction.LEFT
                        ? this.leftShoulderOffset
                        : this.rightShoulderOffset;
                context.translate(shoulderOffset.x, shoulderOffset.y); // Origin is at shoulder

                context.rotate(cursorAngle + swingAngle); // rotate the arm by the swing angle

                context.translate(handOffsetX, handOffsetY);

                context.rotate(swingAngle - Math.PI / 2); // rotate the wrist by the swing angle

                context.scale(this.weaponScale.x, this.weaponScale.y);

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

        private renderSpear(context: CanvasRenderingContext2D, direction: Direction) {
                const jab = this.weaponBehavior as Jab;

                const swordWidth = this.weapon.width;
                const swordHeight = this.weapon.height;
                const swordOffsetX = 0;
                const swordOffsetY = -this.weapon.height / 4;

                const cursorAngle = Math.atan2(
                        this.canvas.cursor.y - this.y,
                        this.canvas.cursor.x - this.x
                );

                const handShoulderDistance = this.body.height / 2 + jab.thrust;
                const handOffsetX = Math.cos(cursorAngle) * handShoulderDistance;
                const handOffsetY = Math.sin(cursorAngle) * handShoulderDistance;

                context.save();
                const shoulderOffset = direction === Direction.LEFT
                        ? this.leftShoulderOffset
                        : this.rightShoulderOffset;
                context.translate(shoulderOffset.x, shoulderOffset.y); // Origin is at shoulder

                context.translate(handOffsetX, handOffsetY);

                context.rotate(cursorAngle + Math.PI / 2);

                context.scale(this.weaponScale.x, this.weaponScale.y);

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

        private renderHand(context: CanvasRenderingContext2D, direction: Direction) {
                if (this.direction !== direction) {
                        switch (this.weapon.metadata.behavior) {
                                case "sword":
                                        this.renderSword(context, direction);
                                        return;
                                case "spear":
                                        this.renderSpear(context, direction);
                                        return;
                        }
                }

                const currentTime = Date.now();
                const armAngle = direction === Direction.LEFT
                                ? this.currentArmAngleRange * Math.sin((currentTime / 200) + Math.PI)
                                : this.currentArmAngleRange * Math.sin((currentTime / 200));

                const handShoulderDistance = this.body.height / 2;
                const freeHandX = handShoulderDistance * Math.cos(armAngle + Math.PI / 2);
                const freeHandY = handShoulderDistance * Math.sin(armAngle + Math.PI / 2);

                context.save();
                const shoulderOffset = direction === Direction.LEFT
                        ? this.leftShoulderOffset
                        : this.rightShoulderOffset;
                context.translate(shoulderOffset.x, shoulderOffset.y); // Origin is at shoulder

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

        private renderShape(context: CanvasRenderingContext2D) {
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

                const lookX = (this.canvas.cursor.x - this.x) / this.w * Character.LOOK_FACTOR;
                const lookY = (this.canvas.cursor.y - this.y) / this.h * Character.LOOK_FACTOR;

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

                if (this.headwear.metadata.type === "headwear") {
                        const transform = this.headwear.metadata.transform;

                        context.save();

                        context.scale(this.direction === Direction.RIGHT ? -1 : 1, 1);
                        context.translate(transform.x, -this.body.height / 2 + transform.y);

                        context.rotate(transform.r);
                        context.scale(transform.w * this.headwearScale.x, transform.h * this.headwearScale.y);

                        context.drawImage(
                                this.headwear.getImage(false),
                                -this.headwear.width / 2,
                                -this.headwear.height / 2,
                                this.headwear.width,
                                this.headwear.height
                        );

                        context.restore();

                }

                if (this.direction === Direction.RIGHT) {
                        this.renderHand(context, Direction.RIGHT);
                } else {
                        this.renderHand(context, Direction.LEFT);
                }
        };

        private renderCharacter(context: CanvasRenderingContext2D) {
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