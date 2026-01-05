export type RenderingCallback = (context: CanvasRenderingContext2D) => void;

const THICKNESS_PRECISION = 0.1;
function generateOffsets(lineWidth: number): Array<[number, number]> {
        const offsets: Array<[number, number]> = [];
        const radius = lineWidth;

        const circumference = 2 * Math.PI * radius;
        const stepCount = Math.max(8, Math.ceil(circumference * THICKNESS_PRECISION));

        for (let index = 0; index < stepCount; ++index) {
                const angle = (index * 2 * Math.PI) / stepCount;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                offsets.push([x, y]);
        }

        return offsets;
}

export class Outliner {
        private canvas: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;

        constructor() {
                this.canvas = document.createElement("canvas");
                this.canvas.width = 1000;
                this.canvas.height = 1000;

                this.context = this.canvas.getContext("2d");
        }

        process(width: number, height: number, color: string, thickness: number, callback: RenderingCallback) {
                this.canvas.width = width;
                this.canvas.height = height;

                this.context.setTransform(1, 0, 0, 1, 0, 0);
                this.context.clearRect(0, 0, width, height);

                this.context.save();
                this.context.translate(width / 2, height / 2);
                callback(this.context);
                this.context.restore();

                if (thickness < THICKNESS_PRECISION) {
                        return this.canvas;
                }

                this.context.save();
                this.context.globalCompositeOperation = "destination-over";

                const offsets = generateOffsets(thickness);
                for (const offset of offsets) {
                        this.context.drawImage(this.canvas, offset[0], offset[1]);
                }

                this.context.globalCompositeOperation = "source-in";
                this.context.fillStyle = color;
                this.context.fillRect(0, 0, width, height);
                this.context.restore();

                this.context.save();
                this.context.translate(width / 2, height / 2);
                callback(this.context);
                this.context.restore();

                return this.canvas;
        }
}