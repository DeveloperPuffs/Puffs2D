import { Character, CharacterContext } from "./character";
import { Outliner } from "./outliner";
import { Rectangle2D, Vector2D } from "./math";
import { ColorPickerElement } from "./elements/color_picker";
import { DropdownElement } from "./elements/dropdown";
import { SliderElement } from "./elements/slider";
import { ToggleElement } from "./elements/toggle";

export class Exporter2D implements CharacterContext {
        private renderCanvas: HTMLCanvasElement;
        private renderContext: CanvasRenderingContext2D;

        private exportCanvas: HTMLCanvasElement;
        private exportContext: CanvasRenderingContext2D;

        public outliner: Outliner = new Outliner();
        public cursorPosition: Vector2D = Vector2D.zero();

        private character: Character;

        private link: HTMLAnchorElement;
        private preview: HTMLImageElement;
        private backgroundColorPicker: ColorPickerElement;
        private resolutionDropdown: DropdownElement;
        private paddingSlider: SliderElement;
        private includeNameToggle: ToggleElement;
        private includeHandsToggle: ToggleElement;
        private xFocusPositionSlider: SliderElement;
        private yFocusPositionSlider: SliderElement;
        private fileNameInput: HTMLInputElement;

        private queued: boolean = false;
        private processing: boolean = false;

        constructor() {
                this.renderCanvas = document.createElement("canvas");
                this.renderCanvas.width = 1024;
                this.renderCanvas.height = 1024;

                this.renderContext = this.renderCanvas.getContext("2d", {
                        willReadFrequently: true
                })!;

                this.exportCanvas = document.createElement("canvas");
                this.exportContext = this.exportCanvas.getContext("2d")!;
                this.exportContext.imageSmoothingEnabled = false;
                this.exportContext.imageSmoothingQuality = "low";

                this.character = new Character(this);
                this.character.frozenState = true;
                this.character.flipDeadzone = false;

                this.link = document.createElement("a");
                this.preview = document.querySelector<HTMLImageElement>("#export-preview")!;
                this.backgroundColorPicker = document.querySelector<ColorPickerElement>("#background-color-picker")!;
                this.resolutionDropdown = document.querySelector<DropdownElement>("#resolution-input")!;
                this.paddingSlider = document.querySelector<SliderElement>("#padding-slider")!;
                this.includeNameToggle = document.querySelector<ToggleElement>("#include-name")!;
                this.includeHandsToggle = document.querySelector<ToggleElement>("#include-hands")!;
                this.fileNameInput = document.querySelector<HTMLInputElement>("#file-name-input")!;
                this.xFocusPositionSlider = document.querySelector<SliderElement>("#x-focus-position-slider")!;
                this.yFocusPositionSlider = document.querySelector<SliderElement>("#y-focus-position-slider")!;

                const callback = this.generateImage.bind(this);

                this.backgroundColorPicker.addEventListener("input", callback);
                this.resolutionDropdown.addEventListener("change", callback);
                this.paddingSlider.addEventListener("input", callback);
                this.includeNameToggle.addEventListener("change", callback);
                this.includeHandsToggle.addEventListener("change", callback);
                this.xFocusPositionSlider.addEventListener("input", callback);
                this.yFocusPositionSlider.addEventListener("input", callback);

                document.querySelector<HTMLLIElement>("#export-icon")!.addEventListener("click", callback);
                document.querySelector<HTMLButtonElement>("#download")!.addEventListener("click", () => {
                        this.downloadImage();
                });
        }

        private async generateImage() {
                this.queued = true;
                if (this.processing) {
                        return;
                }

                this.processing = true;
                while (this.queued) {
                        this.queued = false;

                        this.character.includeName = this.includeNameToggle.state;
                        this.character.includeHands = this.includeHandsToggle.state;
                        const x = this.xFocusPositionSlider.value;
                        const y = -this.yFocusPositionSlider.value;
                        this.cursorPosition = new Vector2D(x, y);
                        this.character.update(0);

                        this.renderContext.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

                        this.renderContext.save();
                        this.renderContext.translate(this.renderCanvas.width / 2, this.renderCanvas.height / 2);
                        this.renderContext.scale(2, 2);
                        this.character.render(this.renderContext);
                        this.renderContext.restore();

                        const sizes = this.resolutionDropdown.value
                                .trim()
                                .split("x")
                                .map(size => Number.parseInt(size.trim()));
                        this.exportCanvas.width = sizes[0];
                        this.exportCanvas.height = sizes[1];

                        this.exportContext.clearRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
                        this.exportContext.fillStyle = this.backgroundColorPicker.color;
                        this.exportContext.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);

                        this.createSquareCroppedCanvas();

                        const blob = await new Promise<Blob>((resolve, reject) => {
                                this.exportCanvas.toBlob(blob => {
                                        if (blob === null) {
                                                reject(new Error("Failed to generate blob"));
                                                return;
                                        }

                                        resolve(blob);
                                }, "image/png");
                        });

                        URL.revokeObjectURL(this.preview.src);
                        const url = URL.createObjectURL(blob);
                        this.preview.src = url;

                        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
                }

                this.processing = false;
        }

        private downloadImage() {
                this.link.href = this.preview.src;
                this.link.download = `${this.fileNameInput.value}.png`;
                this.link.click();
        }

        private getBoundingBox() {
                const width = this.renderCanvas.width;
                const height = this.renderCanvas.height;

                const imageData = this.renderContext.getImageData(0, 0, width, height);
                const data = imageData.data;

                let minX = width, minY = height;
                for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                                const idx = (y * width + x) * 4;
                                if (data[idx + 3] > 0) { 
                                        minX = Math.min(minX, x);
                                        minY = Math.min(minY, y);
                                        break;
                                }
                        }
                }

                let maxX = 0, maxY = 0;
                for (let y = height - 1; y >= 0; y--) {
                        for (let x = width - 1; x >= 0; x--) {
                                const idx = (y * width + x) * 4;
                                if (data[idx + 3] > 0) {
                                        maxX = Math.max(maxX, x);
                                        maxY = Math.max(maxY, y);
                                        break;
                                }
                        }
                }

                if (minX > maxX || minY > maxY) {
                        return new Rectangle2D(0, 0, width, height);
                }

                return new Rectangle2D(minX, minY, maxX - minX + 1, maxY - minY + 1);
        }

        private createSquareCroppedCanvas() {
                const bbox = this.getBoundingBox();

                const cropX = Math.max(0, bbox.x);
                const cropY = Math.max(0, bbox.y);
                const cropW = Math.min(this.renderCanvas.width - cropX, bbox.w);
                const cropH = Math.min(this.renderCanvas.height - cropY, bbox.h);

                const squareSize = Math.max(cropW, cropH);

                const padding = this.paddingSlider.value;
                const padPixels = Math.round(squareSize * padding);
                const finalSize = squareSize + padPixels * 2;

                const exportW = this.exportCanvas.width;
                const exportH = this.exportCanvas.height;

                this.exportContext.clearRect(0, 0, exportW, exportH);
                this.exportContext.fillStyle = this.backgroundColorPicker.color;
                this.exportContext.fillRect(0, 0, exportW, exportH);

                const scale = exportW / finalSize;

                const offsetX = (exportW - cropW * scale) / 2;
                const offsetY = (exportH - cropH * scale) / 2;

                this.exportContext.drawImage(
                        this.renderCanvas,
                        cropX, cropY, cropW, cropH,
                        offsetX, offsetY, cropW * scale, cropH * scale
                );
        }

        onVisibilityChange(_callback: (visibility: boolean) => void) {
                return;
        }

        onClick(_callback: () => void) {
                return;
        }

        checkKeys(_keys: string) {
                return false;
        }

        onKeyPress(_keys: string, _callback: (key: string) => void) {
                return;
        }

        onKeyRelease(_keys: string, _callback: (key: string) => void) {
                return;
        }

        snapCamera(_position: Vector2D) {
                return;
        }

        focusCamera(_position: Vector2D) {
                return;
        }

        shakeCamera(_amount: number) {
                return;
        }
}