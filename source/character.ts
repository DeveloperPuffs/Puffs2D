import { Texture, TextureIdentifier, getTexture } from "./textures";
import { ColorPickerElement } from "./elements/color_picker";
import { SliderElement } from "./elements/slider";
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
        private scale: Vector2D;
        private wobble: Vector2D;

        private outlineColor: string;
        private outlineThickness: number;

        private keys: Record<string, boolean>;
        private name: string;

        private body: Texture;
        private eyes: Texture;
        private mouth: Texture;
        private hand: Texture;

        private sword: Texture | undefined = undefined;
        private currentSwingAngle: number = 0;
        private targetSwingAngle: number = 0;
        private swingVelocity: number = 0;

        private hat: Texture | undefined = undefined;

        constructor(private canvas: Canvas2D) {
                super(0, 0, Character.WIDTH, Character.HEIGHT);
                this.speed = 3600;

                this.state = State.IDLE;
                this.direction = Direction.LEFT;

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

                this.body = getTexture(TextureIdentifier.BODY);
                this.eyes = getTexture(TextureIdentifier.EYES);
                this.mouth = getTexture(TextureIdentifier.MOUTH);
                this.hand = getTexture(TextureIdentifier.HAND);

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

                window.addEventListener("click", () => {
                        if (this.targetSwingAngle === 120) {
                                this.targetSwingAngle = 0;
                        } else {
                                this.targetSwingAngle = 120;
                        }

                        this.canvas.camera.shake(5);
                });

                this.scale = new Vector2D(1, 1);
                this.wobble = new Vector2D(1, 1);

                this.sword = getTexture(TextureIdentifier.SWORD);
                this.hat = getTexture(TextureIdentifier.PROPELLER_HAT);
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

                this.scale.x += (1 - this.scale.x) * 0.1;
                this.scale.y += (1 - this.scale.y) * 0.1;

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

        renderHand(context: CanvasRenderingContext2D, direction: Direction) {
                const shoulderOffsetX = this.body.height / 2.5 * (direction === Direction.LEFT ? 1 : -1);
                const shoulderOffsetY = -this.body.height / 5;
                const handShoulderDistance = this.body.height / 2;

                if (this.direction !== direction) {
                        const swingAngle = direction === Direction.LEFT
                                ? this.currentSwingAngle * Math.PI / 180
                                : -this.currentSwingAngle * Math.PI / 180;

                        const swordWidth = this.sword!.width;
                        const swordHeight = this.sword!.height;
                        const swordOffsetX = 0;
                        const swordOffsetY = -this.sword!.height / 4;

                        const cursorAngle = Math.atan2(
                                this.canvas.cursor.y - this.y,
                                this.canvas.cursor.x - this.x
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
                                this.sword!.getImage(false),
                                -swordWidth / 2 + swordOffsetX,
                                -swordHeight / 2 + swordOffsetY,
                                swordWidth,
                                swordHeight
                        );

                        context.save();
                        context.scale(this.wobble.x, this.wobble.y);

                        context.drawImage(
                                this.hand.getImage(false),
                                -this.hand.width / 2,
                                -this.hand.height / 2,
                                this.hand.width,
                                this.hand.height
                        );

                        context.restore();
                        context.restore();
                        return;
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

                const lookX = (this.canvas.cursor.x - this.x) / this.w;
                const lookY = (this.canvas.cursor.y - this.y) / this.h;

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

                context.save();
                context.scale(this.direction === Direction.RIGHT ? -1 : 1, 1);
                context.drawImage(
                        this.hat!.getImage(false),
                        -this.hat!.width / 2 - this.hand.width / 4,
                        -this.hat!.height / 2 - this.body.height / 2,
                        this.hat!.width,
                        this.hat!.height
                );
                context.restore();

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

        render() {
                this.canvas.context.save();

                this.canvas.context.translate(this.x, this.y);

                const logicalScaleX = this.w / this.body.width;
                const logicalScaleY = this.h / this.body.height;
                this.canvas.context.scale(logicalScaleX, logicalScaleY);

                this.renderCharacter(this.canvas.context);

                if (this.name !== "") {
                        this.canvas.context.font = "14px \"Monaspace Radon\", monospace";

                        const label = this.name.length <= 20 ? this.name : this.name.substring(0, 19) + "…";
                        const metrics = this.canvas.context.measureText(label);

                        this.canvas.context.lineWidth = 2;
                        this.canvas.context.strokeStyle = "black";
                        this.canvas.context.strokeText(label, metrics.width / -2, -this.body.height / 2);

                        this.canvas.context.fillStyle = "white";
                        this.canvas.context.fillText(label, metrics.width / -2, -this.body.height / 2);
                }

                this.canvas.context.restore();
        }
}