import { Camera2D } from "./camera";
import { Character } from "./character";
import { Background } from "./background";
import { Outliner } from "./outliner";

export class Canvas2D {
        private element: HTMLCanvasElement;
        public context: CanvasRenderingContext2D;

        public camera: Camera2D;
        public background: Background;
        public outliner: Outliner;
        public player: Character;

        private currentTime: number;

        constructor() {
                this.element = document.querySelector<HTMLCanvasElement>("#canvas");
                this.context = this.element.getContext("2d");

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
        }

        async load() {
                await this.player.load();

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