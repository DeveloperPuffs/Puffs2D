import { Canvas2D } from "./canvas";

export class Background {
        constructor(private canvas: Canvas2D) {
        }

        render() {
                const alpha1 = "0.07";
                const alpha2 = "0.02";
                const gridSize = 25;

                this.canvas.context.save();
                this.canvas.context.translate(this.canvas.camera.x, this.canvas.camera.y);
                this.canvas.context.rotate(-(5 * Math.PI) / 180);
                this.canvas.context.translate(-this.canvas.camera.x, -this.canvas.camera.y);
                this.canvas.context.lineWidth = 2;

                const diagonal = Math.sqrt(
                        this.canvas.width * this.canvas.width +
                        this.canvas.height * this.canvas.height
                );

                const left = this.canvas.camera.x - diagonal / 2;
                const right = this.canvas.camera.x + diagonal / 2;
                const top = this.canvas.camera.y - diagonal / 2;
                const bottom = this.canvas.camera.y + diagonal / 2;

                const startX = Math.floor(left / gridSize) * gridSize;
                const startY = Math.floor(top / gridSize) * gridSize;

                let startIndexX = Math.floor(startX / gridSize);
                for (let x = startX; x <= right; x += gridSize) {
                        this.canvas.context.strokeStyle = (startIndexX++) % 5 === 0
                                ? `rgba(255,255,255,${alpha1})`
                                : `rgba(255,255,255,${alpha2})`;
                        this.canvas.context.beginPath();
                        this.canvas.context.moveTo(x, top);
                        this.canvas.context.lineTo(x, bottom);
                        this.canvas.context.stroke();
                }

                let startIndexY = Math.floor(startY / gridSize);
                for (let y = startY; y <= bottom; y += gridSize) {
                        this.canvas.context.strokeStyle = (startIndexY++) % 5 === 0
                                ? `rgba(255,255,255,${alpha1})`
                                : `rgba(255,255,255,${alpha2})`;
                        this.canvas.context.beginPath();
                        this.canvas.context.moveTo(left, y);
                        this.canvas.context.lineTo(right, y);
                        this.canvas.context.stroke();
                }

                this.canvas.context.restore();
        }
}