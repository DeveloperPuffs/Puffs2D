import { Canvas2D } from "./canvas";

export class Background {
        constructor(private canvas: Canvas2D) {
        }

        render(context: CanvasRenderingContext2D) {
                const alpha1 = "0.07";
                const alpha2 = "0.02";
                const gridSize = 25;

                context.save();
                context.translate(this.canvas.camera.x, this.canvas.camera.y);
                context.rotate(-(5 * Math.PI) / 180);
                context.translate(-this.canvas.camera.x, -this.canvas.camera.y);
                context.lineWidth = 2;

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
                        context.strokeStyle = (startIndexX++) % 5 === 0
                                ? `rgba(255,255,255,${alpha1})`
                                : `rgba(255,255,255,${alpha2})`;
                        context.beginPath();
                        context.moveTo(x, top);
                        context.lineTo(x, bottom);
                        context.stroke();
                }

                let startIndexY = Math.floor(startY / gridSize);
                for (let y = startY; y <= bottom; y += gridSize) {
                        context.strokeStyle = (startIndexY++) % 5 === 0
                                ? `rgba(255,255,255,${alpha1})`
                                : `rgba(255,255,255,${alpha2})`;
                        context.beginPath();
                        context.moveTo(left, y);
                        context.lineTo(right, y);
                        context.stroke();
                }

                context.restore();
        }
}