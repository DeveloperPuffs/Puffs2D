import { Camera2D } from "./camera";
import { Character } from "./character";
import { Background } from "./background";
import { Outliner } from "./outliner";
import { Vector2D } from "./math";

export class Canvas2D {
        private element: HTMLCanvasElement;
        public context: CanvasRenderingContext2D;

        public mouse: Vector2D;
        public cursor: Vector2D;
        public camera: Camera2D;
        public background: Background;
        public outliner: Outliner;
        public player: Character;

        private currentTime: number;

        constructor() {
                this.element = document.querySelector<HTMLCanvasElement>("#canvas")!;
                this.context = this.element.getContext("2d")!;

                const resizeObserver = new ResizeObserver(entries => {
                        for (const entry of entries) {
                                if (entry.target !== this.element) {
                                        continue;
                                }

                                const devicePixelRatio = window.devicePixelRatio || 1;
                                this.element.width = this.element.clientWidth * devicePixelRatio;
                                this.element.height = this.element.clientHeight * devicePixelRatio;
                                this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
                        }
                });

                resizeObserver.observe(this.element);

                this.camera = new Camera2D(this);
                this.background = new Background(this);
                this.outliner = new Outliner();
                this.player = new Character(this);

                this.currentTime = 0;

                this.mouse = Vector2D.zero();
                this.cursor = Vector2D.zero();
                window.addEventListener("mousemove", event => {
                        this.mouse.x = event.clientX;
                        this.mouse.y = event.clientY;
                });
        }

        startRunning() {
                const animationFrame = (timestamp: number) => {
                        this.animate(timestamp);
                        window.requestAnimationFrame(animationFrame);
                }

                window.requestAnimationFrame(animationFrame);
        }

        get bounds() {
                return this.element.getBoundingClientRect();
        }

        get width() {
                return this.element.clientWidth;
        }

        get height() {
                return this.element.clientHeight;
        }

        private transformPosition(matrix: DOMMatrix, position: Vector2D) {
                return new Vector2D(
                        matrix.a * position.x + matrix.c * position.y + matrix.e,
                        matrix.b * position.x + matrix.d * position.y + matrix.f
                );
        }

        getCanvasPosition(position: Vector2D) {
                const matrix = this.context.getTransform();
                return this.transformPosition(matrix, position);
        }

        getWorldPosition(position: Vector2D) {
                const matrix = this.context.getTransform().inverse();
                return this.transformPosition(matrix, position);
        }

        animate(timestamp: number) {
                const deltaTime = (timestamp - this.currentTime) / 1000;
                this.currentTime = timestamp;

                this.camera.update(deltaTime);
                this.player.update(deltaTime);

                this.camera.focus(this.player.x, this.player.y);

                this.context.clearRect(0, 0, this.width, this.height);
                this.context.fillStyle = "rgba(0, 0, 0, 0.25)";
                this.context.fillRect(0, 0, this.width, this.height);

                this.context.save();
                this.camera.project();

                const bounds = this.element.getBoundingClientRect();
                const scaleX = this.element.width / bounds.width;
                const scaleY = this.element.height / bounds.height;
                const canvasMouse = new Vector2D(
                        (this.mouse.x - bounds.left) * scaleX,
                        (this.mouse.y - bounds.top) * scaleY
                );

                const matrix = this.context.getTransform().inverse();
                this.cursor = this.transformPosition(matrix, canvasMouse);

                this.background.render();
                this.player.render();

                this.context.restore();

                const vignette = this.context.createRadialGradient(
                        this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.2,
                        this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.6
                );

                vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
                vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");

                this.context.fillStyle = vignette;
                this.context.fillRect(0, 0, this.width, this.height);
        }
}