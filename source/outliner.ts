export type RenderingCallback = (context: CanvasRenderingContext2D) => void;

export class Outliner {
        private canvas: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;

        constructor() {
                this.canvas = document.createElement("canvas");
                this.canvas.width = 1000;
                this.canvas.height = 1000;

                this.context = this.canvas.getContext("2d");
        }

        process(width: number, height: number, callback: RenderingCallback) {
                this.canvas.width = width;
                this.canvas.height = height;

                this.context.setTransform(1, 0, 0, 1, 0, 0);
                this.context.clearRect(0, 0, width, height);

                this.context.save();
                this.context.translate(width / 2, height / 2);
                callback(this.context);
                this.context.restore();

                this.context.save();
                this.context.globalCompositeOperation = "destination-over";

                // TODO: Custom line thickness?
                const offsets = [
                        [-1, 0], [1, 0], [0, -1], [0, 1],
                        [-1, -1], [-1, 1], [1, -1], [1, 1]
                ];

                for (const offset of offsets) {
                        this.context.drawImage(this.canvas, offset[0], offset[1]);
                }

                this.context.globalCompositeOperation = "source-in";
                this.context.fillStyle = "white";
                this.context.fillRect(0, 0, width, height);
                this.context.restore();

                this.context.save();
                this.context.translate(width / 2, height / 2);
                callback(this.context);
                this.context.restore();

                return this.canvas;
        }
}