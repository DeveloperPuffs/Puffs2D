import { Camera } from "./camera.js";
import { Character } from "./character.js";

function drawBackground(canvas, context, cameraX, cameraY) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const alpha1 = "0.07";
        const alpha2 = "0.02";
        const gridSize = 25;

        context.save();
        context.rotate((-5 * Math.PI) / 180);
        context.lineWidth = 2;

        const diagonal = Math.sqrt(width * width + height * height);
        const left = cameraX - diagonal / 2;
        const right = cameraX + diagonal / 2;
        const top = cameraY - diagonal / 2;
        const bottom = cameraY + diagonal / 2;

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

export async function setup() {
        const canvas = document.querySelector("#canvas");
        const context = canvas.getContext("2d");

        const canvasResizeListeners = [];
        Object.defineProperty(canvas, "onResize", {
                writable: false,
                enumerable: true,
                configurable: false,
                value: (listener, trigger) => {
                        canvasResizeListeners.push(listener);
                        if (trigger) {
                                listener(canvas.clientWidth, canvas.clientHeight);
                        }
                }
        });

        const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                        if (entry.target !== canvas) {
                                continue;
                        }

                        for (const canvasResizeListener of canvasResizeListeners) {
                                canvasResizeListener(canvas.clientWidth, canvas.clientHeight);
                        }
                }
        });

        resizeObserver.observe(canvas);

        canvas.onResize((width, height) => {
                const devicePixelRatio = window.devicePixelRatio || 1;
                canvas.width = width * devicePixelRatio;
                canvas.height = height * devicePixelRatio;
                context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        });

        const camera = new Camera(canvas, context);

        const player = new Character(canvas, context);
        await player.load();

        let currentTime = 0;
        function animationFrame(timestamp) {
                let deltaTime = (timestamp - currentTime) / 1000;
                currentTime = timestamp;

                if (Number.isNaN(deltaTime) || !Number.isFinite(deltaTime)) {
                        deltaTime = 0;
                }

                camera.update(deltaTime);
                player.update(deltaTime);

                camera.focus(player.x, player.y);

                const width = canvas.clientWidth;
                const height = canvas.clientHeight;

                context.clearRect(0, 0, width, height);
                context.fillStyle = "rgba(0, 0, 0, 0.2)";
                context.fillRect(0, 0, width, height);

                context.save();
                camera.project();

                drawBackground(canvas, context, camera.positionX, camera.positionY);
                player.render(timestamp);

                context.restore();

                const vignette = context.createRadialGradient(
                        width / 2, height / 2, Math.min(width, height) * 0.2,
                        width / 2, height / 2, Math.max(width, height) * 0.6
                );

                vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
                vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");

                context.fillStyle = vignette;
                context.fillRect(0, 0, width, height);

                window.requestAnimationFrame(animationFrame);
        }

        window.requestAnimationFrame(animationFrame);
}