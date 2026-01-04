// TODO: Shake should be relative to screenn size?
export class Camera {
        constructor(canvas, context) {
                this.canvas = canvas;
                this.context = context;

                this.positionX = 0;
                this.positionY = 0;

                this.currentX = 0;
                this.currentY = 0;
                this.targetX = 0;
                this.targetY = 0;
                this.distanceX = 0.25;
                this.distanceY = 0.25;

                this.speed = 5;
                this.panning = 2;

                this.shakePower = 0;
                this.shakeDirection = 0;
                this.shakeThreshold = 0.1;
                this.shakeDecay = 0.2;

                this.mouseX = 0;
                this.mouseY = 0;

                window.addEventListener("mousemove", event => {
                        const rectangle = this.canvas.getBoundingClientRect();
                        this.mouseX = event.clientX - rectangle.left;
                        this.mouseY = event.clientY - rectangle.top;
                });
        }

        update(deltaTime) {
                if (this.shakePower !== 0) {
                        this.shakeDirection = Math.random() * Math.PI * 2;
                        this.shakePower -= this.shakePower * this.shakeDecay;
                        if (this.shakePower < this.shakeThreshold) {
                                this.shakePower = 0;
                        }
                }

                this.currentX += (this.targetX - this.currentX) * this.speed * deltaTime;
                this.currentY += (this.targetY - this.currentY) * this.speed * deltaTime;

                const panningX = this.panning * this.mouseX / (-this.canvas.clientWidth / 2);
                const panningY = this.panning * this.mouseY / (-this.canvas.clientHeight / 2);
                const shakeX = Math.cos(this.shakeDirection) * this.shakePower;
                const shakeY = Math.sin(this.shakeDirection) * this.shakePower;
                this.positionX = this.currentX + panningX + shakeX;
                this.positionY = this.currentY + panningY + shakeY;
        }

        shake(power) {
                this.shakePower += power;
        }

        snap(x, y) {
                this.currentY = x;
                this.currentY = y;
                this.targetX = x;
                this.targetY = y;
        }

        focus(x, y) {
                const distanceX = this.distanceX * this.canvas.clientWidth / 2;
                const distanceY = this.distanceY * this.canvas.clientHeight / 2;
                this.targetX = Math.min(Math.max(this.targetX, x - distanceX), x + distanceX);
                this.targetY = Math.min(Math.max(this.targetY, y - distanceY), y + distanceY);
        }

        project() {
                this.context.translate(
                        this.canvas.clientWidth / 2 - this.positionX,
                        this.canvas.clientHeight / 2 - this.positionY
                );
        }
}