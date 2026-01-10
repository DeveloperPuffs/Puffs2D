import { Vector2D, Rectangle2D } from "./math";

export class Entity2D extends Rectangle2D {
        public velocity: Vector2D = Vector2D.zero();
        public acceleration: Vector2D = Vector2D.zero();
        public friction: number = 10;

        constructor(public x: number, public y: number, public w: number, public h: number) {
                super(x, y, w, h);
        }

        update(deltaTime: number) {
                this.velocity.x += this.acceleration.x * deltaTime;
                this.velocity.y += this.acceleration.y * deltaTime;
                this.velocity.x -= this.velocity.x * this.friction * deltaTime;
                this.velocity.y -= this.velocity.y * this.friction * deltaTime;
                this.x += this.velocity.x * deltaTime;
                this.y += this.velocity.y * deltaTime;
        }
}