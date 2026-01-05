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
        private state: State;
        private direction: Direction;
        private speed: number;

        private sight: Vector2D;
        private sprite: Rectangle2D;

        private keys: Object;
        private name: string;

        private body: TextureSVG;
        private eyes: TextureSVG;
        private mouth: TextureSVG;
        private hand: TextureSVG;

        constructor(private canvas: Canvas2D) {
                super(0, 0, 50, 50);
                this.speed = 3600;

                this.state = State.IDLE;
                this.direction = Direction.LEFT;
                this.sprite = Rectangle2D.at(this, 50, 50);

                this.sight = Vector2D.zero();
                window.addEventListener("mousemove", event => {
                        this.sight.x = event.clientX - this.canvas.bounds.left;
                        this.sight.y = event.clientY - this.canvas.bounds.top;
                });

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
                const nameInput = document.querySelector<HTMLInputElement>("#name-input");
                nameInput.addEventListener("input", () => {
                        this.name = nameInput.value;
                });

                this.body = new TextureSVG("body.svg");
                this.eyes = new TextureSVG("eyes.svg");
                this.mouth = new TextureSVG("mouth.svg");
                this.hand = new TextureSVG("hand.svg");
        }

        async load() {
                await Promise.all([
                        this.body.load(),
                        this.eyes.load(),
                        this.mouth.load(),
                        this.hand.load()
                ]);

                const colorPicker = document.querySelector<ColorPickerElement>("#body-color");
                colorPicker.onColorChange(color => {
                        const bodyPath = this.body.svg.querySelector<SVGClipPathElement>("#body");
                        bodyPath.style.fill = color;
                        this.body.rasterize();

                        const handPath = this.hand.svg.querySelector<SVGClipPathElement>("#hand");
                        handPath.style.fill = color;
                        this.hand.rasterize();
                });

                // TODO: Make eyes blink at an inverval
                // TODO: Options to toggle blinking, control blink interval, speed?
        }

        update(deltaTime: number) {
                const up = this.keys["ArrowUp"] || this.keys["KeyW"];
                const down = this.keys["ArrowDown"] || this.keys["KeyS"];
                const left = this.keys["ArrowLeft"] || this.keys["KeyA"];
                const right = this.keys["ArrowRight"] || this.keys["KeyD"];

                const horizontal = Number(!!right) - Number(!!left);
                const vertical = Number(!!down) - Number(!!up);
                const diagonal = horizontal && vertical ? 1 / Math.sqrt(2) : 1;

                if (horizontal !== 0) {
                        this.direction = horizontal === 1
                                ? Direction.RIGHT
                                : Direction.LEFT;
                }

                this.acceleration.x = this.speed * horizontal * diagonal;
                this.acceleration.y = this.speed * vertical * diagonal;
                super.update(deltaTime);

                const currentTime = Date.now();

                this.state = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) > 2 ?
                        State.RUNNING : State.IDLE;

                this.sprite.x = this.x;
                this.sprite.y = this.y;
                this.sprite.w = this.w * (1 + Math.cos(currentTime / 200) / 40);
                this.sprite.h = this.h * (1 + Math.sin(currentTime / 200) / 40)
        }

        renderRightHand() {

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

                const handWidth = this.sprite.w / 3;
                const handHeight = this.sprite.h / 3;

                const shoulderOffsetX_left = -this.sprite.w * 0.6;
                const shoulderOffsetX_right = this.sprite.w * 0.2;
                const shoulderOffsetY = this.sprite.h * -0.3;

                const handShoulderDistance = this.sprite.w / 3;
                const armAngleRange = this.state === State.RUNNING ? Math.PI / 3 : Math.PI / 30;
                const armAngle_left = Math.sin((currentTime / 200)) * armAngleRange;
                const armAngle_right = Math.sin((currentTime / 200) + Math.PI) * armAngleRange;

                // I need to make it bigger to make sure that the entire character sprite fits
                const BUFFER_WIDTH = 100;
                const BUFFER_HEIGHT = 100;

                const outlined = this.canvas.outliner.process(BUFFER_WIDTH, BUFFER_HEIGHT, context => {
                        const renderLeftHand = () => {
                                context.save();
                                context.translate(shoulderOffsetX_left, shoulderOffsetY); // Origin is at shoulder

                                context.drawImage(
                                        this.hand.image,
                                        handShoulderDistance * Math.cos(armAngle_left + Math.PI / 2),
                                        handShoulderDistance * Math.sin(armAngle_left + Math.PI / 2),
                                        handWidth,
                                        handHeight
                                );

                                context.restore();
                        };

                        const renderRightHand = () => {
                                context.save();
                                context.translate(shoulderOffsetX_right, shoulderOffsetY); // Origin is at shoulder

                                context.drawImage(
                                        this.hand.image,
                                        handShoulderDistance * Math.cos(armAngle_right + Math.PI / 2),
                                        handShoulderDistance * Math.sin(armAngle_right + Math.PI / 2),
                                        handWidth,
                                        handHeight
                                );

                                context.restore();
                        };

                        if (this.direction === Direction.RIGHT) {
                                renderRightHand();
                        } else {
                                renderLeftHand();
                        }

                        context.drawImage(
                                this.body.image,
                                -this.sprite.w / 2,
                                -this.sprite.h / 2,
                                this.sprite.w,
                                this.sprite.h
                        );

                        const lookX = (this.sight.x - this.canvas.width / 2) / 200;
                        const lookY = (this.sight.y - this.canvas.height / 2) / 200;

                        context.drawImage(
                                this.eyes.image,
                                -this.sprite.w / 2 + lookX + (this.direction ? this.sprite.w / 16 : -this.sprite.w / 16),
                                -this.sprite.h / 2 + lookY,
                                this.sprite.w,
                                this.sprite.h
                        );

                        context.drawImage(
                                this.mouth.image,
                                -this.sprite.w / 2 + (this.direction ? this.sprite.w / 16 : -this.sprite.w / 16),
                                -this.sprite.h / 2,
                                this.sprite.w,
                                this.sprite.h
                        );

                        if (this.direction === Direction.RIGHT) {
                                renderLeftHand();
                        } else {
                                renderRightHand();
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