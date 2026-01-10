import { Camera2D } from "./camera";
import { Character } from "./character";
import { Background } from "./background";
import { Outliner } from "./outliner";
import { Vector2D } from "./math";

const MAXIMUM_DELTA_TIME = 0.05;

export class Canvas2D {
        private element: HTMLCanvasElement;
        private context: CanvasRenderingContext2D;

        private clickCallbacks: (() => void)[] = [];
        private mouse: Vector2D = Vector2D.zero();
        public cursor: Vector2D = Vector2D.zero();

        private keys: Set<string> = new Set();
        private keyPressCallbacks: Map<string, ((key: string) => void)[]> = new Map();
        private keyReleaseCallbacks: Map<string, ((key: string) => void)[]> = new Map();

        public camera: Camera2D;
        public background: Background;
        public outliner: Outliner;
        public player: Character;

        private currentTime: number = 0;

        constructor() {
                this.element = document.querySelector<HTMLCanvasElement>("#canvas")!;
                this.context = this.element.getContext("2d")!;

                window.addEventListener("click", event => {
                        if (!(event.target instanceof Node)) {
                                return;
                        }

                        if (!this.element.contains(event.target)) {
                                return;
                        }

                        for (const clickCallback of this.clickCallbacks) {
                                clickCallback();
                        }
                });

                window.addEventListener("mousemove", event => {
                        this.mouse.x = event.clientX;
                        this.mouse.y = event.clientY;
                });

                window.addEventListener("keydown", event => {
                        if (event.repeat) {
                                return;
                        }

                        const element = document.activeElement;
                        if (element instanceof HTMLElement) {
                                if (element.tagName === "INPUT" && (element as HTMLInputElement).type === "text") {
                                        return;
                                }

                                if (element.tagName === "TEXTAREA") {
                                        return;
                                }

                                if (element.isContentEditable) {
                                        return;
                                }
                        }

                        this.keys.add(event.code);

                        const callbacks = this.keyPressCallbacks.get(event.code);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(event.code));
                        }
                });

                window.addEventListener("keyup", event => {
                        if (!this.keys.has(event.code)) {
                                return;
                        }

                        this.keys.delete(event.code);

                        const callbacks = this.keyReleaseCallbacks.get(event.code);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(event.code));
                        }
                });

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

                window.addEventListener("blur", this.clearKeys);
                document.addEventListener("visibilitychange", () => {
                        if (document.visibilityState === "visible") {
                                this.camera.snap(this.player.x, this.player.y);
                        }

                        if (document.visibilityState === "hidden") {
                                this.clearKeys();
                        }
                });
        }

        onClick(callback: () => void) {
                this.clickCallbacks.push(callback);
        }

        private clearKeys = () => {
                for (const key of this.keys) {
                        const callbacks = this.keyReleaseCallbacks.get(key);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(key));
                        }
                }

                this.keys.clear();
        }

        checkKey(keys: string): boolean {
                return this.parseKeys(keys).some(key => this.keys.has(key));
        }

        onKeyPress(keys: string, callback: (key: string) => void) {
                this.parseKeys(keys).forEach(key => {
                        const callbacks = this.keyPressCallbacks.get(key);
                        if (callbacks === undefined) {
                                this.keyPressCallbacks.set(key, [callback]);
                                return;
                        }

                        callbacks.push(callback);
                });
        }

        onKeyRelease(keys: string, callback: (key: string) => void) {
                this.parseKeys(keys).forEach(key => {
                        const callbacks = this.keyReleaseCallbacks.get(key);
                        if (callbacks === undefined) {
                                this.keyReleaseCallbacks.set(key, [callback]);
                                return;
                        }

                        callbacks.push(callback);
                });
        }

        private parseKeys(keys: string) {
                return keys
                        .trim()
                        .split(",")
                        .map(key => key.trim())
                        .filter(key => key.length !== 0);
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
                const deltaTime = Math.min((timestamp - this.currentTime) / 1000, MAXIMUM_DELTA_TIME);
                this.currentTime = timestamp;

                this.camera.update(deltaTime);
                this.player.update(deltaTime);

                this.camera.focus(this.player.x, this.player.y);

                this.context.clearRect(0, 0, this.width, this.height);
                this.context.fillStyle = "rgba(0, 0, 0, 0.25)";
                this.context.fillRect(0, 0, this.width, this.height);

                this.context.save();
                this.camera.project(this.context);

                const mouse = this.mouse.copy();
                const matrix = this.context.getTransform().inverse();
                const bounds = this.element.getBoundingClientRect();
                const scaleX = this.element.width / bounds.width;
                const scaleY = this.element.height / bounds.height;
                const canvasPosition = new Vector2D(
                        (mouse.x - bounds.left) * scaleX,
                        (mouse.y - bounds.top) * scaleY
                );

                const worldPosition = this.transformPosition(matrix, canvasPosition);
                this.cursor.x = worldPosition.x;
                this.cursor.y = worldPosition.y;

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