import { Vector2D } from "./math";
import { Canvas2D } from "./canvas";
export class Camera2D extends Vector2D {
        private current: Vector2D = Vector2D.zero();
        private target: Vector2D = Vector2D.zero();

        private drag: Vector2D = new Vector2D(0.1, 0.25);
        private panning: number = 5;
        private speed: number = 2;

        private shakePower: number = 0;
        private shakeDirection: number = 0;
        private shakeThreshold: number = 0.1;
        private shakeDecay: number = 0.2;

        constructor(private canvas: Canvas2D) {
                super(0, 0);
        }

        update(deltaTime: number) {
                if (this.shakePower !== 0) {
                        this.shakeDirection = Math.random() * Math.PI * 2;
                        this.shakePower -= this.shakePower * this.shakeDecay;
                        if (this.shakePower < this.shakeThreshold) {
                                this.shakePower = 0;
                        }
                }

                this.current.x += (this.target.x - this.current.x) * this.speed * deltaTime;
                this.current.y += (this.target.y - this.current.y) * this.speed * deltaTime;

                const panningX = this.panning * this.canvas.cursor.x / (-this.canvas.width / 2);
                const panningY = this.panning * this.canvas.cursor.y / (-this.canvas.height / 2);
                const shakeX = Math.cos(this.shakeDirection) * this.shakePower * this.canvas.width / 1000;
                const shakeY = Math.sin(this.shakeDirection) * this.shakePower * this.canvas.height / 1000;
                this.x = this.current.x + panningX + shakeX;
                this.y = this.current.y + panningY + shakeY;
        }

        shake(power: number) {
                this.shakePower += power;
        }

        snap(x: number, y: number) {
                this.current.x = x;
                this.current.y = y;
                this.target.x = x;
                this.target.y = y;
        }

        focus(x: number, y: number) {
                const distanceX = this.drag.x * this.canvas.width / 2;
                const distanceY = this.drag.y * this.canvas.height / 2;
                this.target.x = Math.min(Math.max(this.target.x, x - distanceX), x + distanceX);
                this.target.y = Math.min(Math.max(this.target.y, y - distanceY), y + distanceY);
        }

        project(target: Vector2D | CanvasRenderingContext2D) {
                if (target instanceof Vector2D) {
                        target.x += this.x - this.canvas.width / 2;
                        target.y += this.y - this.canvas.height / 2;
                }

                if (target instanceof CanvasRenderingContext2D) {
                        target.translate(
                                this.canvas.width / 2 - this.x,
                                this.canvas.height / 2 - this.y
                        );
                }
        }
}