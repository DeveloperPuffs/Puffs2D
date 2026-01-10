import { Camera2D } from "./camera";
import { Character } from "./character";
import { Background } from "./background";
import { Outliner } from "./outliner";
import { Vector2D } from "./math";
import { Mouse } from "./system/mouse";
import { Keyboard } from "./system/keyboard";

export class Canvas2D {
        private element: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;

        public mouse: Mouse;
        public keyboard: Keyboard;
        public camera: Camera2D;
        public background: Background;
        public outliner: Outliner;
        public player: Character;

        private currentTime: number = 0;

        constructor() {
                this.element = document.querySelector<HTMLCanvasElement>("#canvas")!;
                this.context = this.element.getContext("2d")!;

                this.mouse = new Mouse(this.validateClick);
                this.keyboard = new Keyboard(this.validateKeyPress);

                this.camera = new Camera2D(this);
                this.background = new Background(this);
                this.outliner = new Outliner();
                this.player = new Character(this);

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
        }

        private validateClick = (event: MouseEvent) => {
                if (!(event.target instanceof Node)) {
                        return false;
                }

                if (!this.element.contains(event.target)) {
                        return false;
                }

                return true;
        }

        private validateKeyPress = (_: KeyboardEvent) => {
                const element = document.activeElement;
                if (element instanceof HTMLElement) {
                        if (element.tagName === "INPUT" && (element as HTMLInputElement).type === "text") {
                                return false;
                        }

                        if (element.tagName === "TEXTAREA") {
                                return false;
                        }

                        if (element.isContentEditable) {
                                return false;
                        }
                }

                return true;
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
                this.camera.project(this.context);

                const matrix = this.context.getTransform().inverse();
                this.mouse.mapPosition((position: Vector2D) => {
                const bounds = this.element.getBoundingClientRect();
                        const scaleX = this.element.width / bounds.width;
                        const scaleY = this.element.height / bounds.height;
                        const canvasPosition = new Vector2D(
                                (position.x - bounds.left) * scaleX,
                                (position.y - bounds.top) * scaleY
                        );

                        const worldPosition = this.transformPosition(matrix, canvasPosition);
                        position.x = worldPosition.x;
                        position.y = worldPosition.y;
                });

                this.background.render(this.context);
                this.player.render(this.context);

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