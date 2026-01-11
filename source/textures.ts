import { Outliner } from "./outliner";
import { SliderElement } from "./elements/slider";
import { ColorPickerElement } from "./elements/color_picker";

import spritesData from "./sprites.json";

export type Transform = {
        x: number;
        y: number;
        w: number;
        h: number;
        r: number;
};

export const DEFAULT_TRANSFORM: Transform = {
        x: 0, y: 0, w: 1, h: 1, r: 0
};

export type Metadata = {
        type: "none" | "upload" | "headwear" | "weapon";
        name: string;
        outline: boolean;
        transform: Transform;
        behavior?: string;
};

export class Texture {
        private static RESOLUTION = 4;
        private static parser = new DOMParser();
        private static serializer = new XMLSerializer();

        public width!: number;
        public height!: number;

        private loaded: boolean = false;
        private source!: "svg" | "bitmap";

        private svgElement!: SVGSVGElement;
        private rasterizedImage!: HTMLImageElement;
        private outlinedImage?: HTMLImageElement;
        private outliner?: Outliner;

        private rasterQueued: boolean = false;
        private rasterizing: boolean = false;

        private outlineQueued: boolean = false;
        private outlining: boolean = false;

        constructor(public metadata: Metadata) {
                if (this.metadata.outline) {
                        this.outliner = new Outliner();

                        const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
                        outlineColorPicker.addEventListener("input", () => {
                                this.outline();
                        });

                        const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
                        outlineThicknessSlider.addEventListener("input", () => {
                                this.outline();
                        });
                }
        }

        getSVG() {
                if (!this.loaded || this.source === "bitmap") {
                        return undefined;
                }

                return this.svgElement;
        }

        getImage(outlined: boolean) {
                return outlined && this.metadata.outline ? this.outlinedImage! : this.rasterizedImage;
        }

        loadSVG(text: string) {
                this.source = "svg";

                const parsed = Texture.parser.parseFromString(text, "image/svg+xml");
                if (!(parsed.documentElement instanceof SVGSVGElement)) {
                        throw new Error("Parsed texture is not an SVG");
                }

                this.svgElement = parsed.documentElement;
                this.width = Number(this.svgElement.getAttribute("width")!);
                this.height = Number(this.svgElement.getAttribute("height")!);

                this.rasterizedImage = new Image();
                this.rasterizedImage.width = this.width * Texture.RESOLUTION;
                this.rasterizedImage.height = this.height * Texture.RESOLUTION;

                if (this.metadata.outline) {
                        this.outlinedImage = new Image();
                        this.outlinedImage.width = this.width * Texture.RESOLUTION;
                        this.outlinedImage.height = this.height * Texture.RESOLUTION;
                }

                this.loaded = true;
                this.rasterize();
        }

        async loadBitmap(blob: Blob) {
                this.source = "bitmap";

                const url = URL.createObjectURL(blob);
                const image = new Image();

                await new Promise((resolve, reject) => {
                        image.onload = resolve;
                        image.onerror = reject;
                        image.src = url;
                });

                this.width = image.naturalWidth;
                this.height = image.naturalHeight;
                this.rasterizedImage = image;
                URL.revokeObjectURL(url);

                if (this.metadata.outline) {
                        this.outlinedImage = new Image();
                        this.outlinedImage.width = this.width;
                        this.outlinedImage.height = this.height;
                }

                this.loaded = true;
                this.outline();
        }

        async rasterize() {
                if (!this.loaded || this.source === "bitmap") {
                        return;
                }

                this.rasterQueued = true;
                if (this.rasterizing) {
                        return;
                }

                this.rasterizing = true;

                while (this.rasterQueued) {
                        this.rasterQueued = false;

                        const string = Texture.serializer.serializeToString(this.svgElement);
                        const blob = new Blob([string], { type: "image/svg+xml;charset=utf-8" });
                        const url = URL.createObjectURL(blob);

                        const image = new Image();
                        image.width = this.width * Texture.RESOLUTION;
                        image.height = this.height * Texture.RESOLUTION;

                        await new Promise((resolve, reject) => {
                                image.onload = resolve;
                                image.onerror = reject;
                                image.src = url;
                        });

                        this.rasterizedImage.src = image.src;
                        URL.revokeObjectURL(url);

                        if (this.outline) {
                                this.outline();
                        }
                }

                this.rasterizing = false;
        }

        private async outline() {
                if (!this.loaded) {
                        return;
                }

                if (!this.metadata.outline) {
                        return;
                }

                this.outlineQueued = true;
                if (this.outlining) {
                        return;
                }

                this.outlining = true;

                while (this.outlineQueued) {
                        this.outlineQueued = false;

                        const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
                        const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
                        const outlined = this.outliner!.process(
                                this.width,
                                this.height,
                                outlineColorPicker.color,
                                outlineThicknessSlider.value,
                                (context: CanvasRenderingContext2D) => {
                                        // Add padding so that the outline dosen't clip outside of the image
                                        const width = this.width * 0.75;
                                        const height = this.height * 0.75;
                                        context.drawImage(this.rasterizedImage, -width / 2, -height / 2, width, height);
                                }
                        );

                        const url = outlined.toDataURL("image/png");

                        const image = new Image();
                        image.width = this.width * Texture.RESOLUTION;
                        image.height = this.height * Texture.RESOLUTION;

                        await new Promise((resolve, reject) => {
                                image.onload = resolve;
                                image.onerror = reject;
                                image.src = url;
                        });

                        this.outlinedImage!.src = image.src;
                        URL.revokeObjectURL(url);
                }

                this.outlining = false;
        }
}

const textures: Map<string, Texture> = new Map();

export async function loadTextures() {
        textures.clear();

        for (const spriteData of spritesData) {
                const metadata: Metadata = {
                        name: spriteData.name,
                        type: spriteData.type as Metadata["type"],
                        behavior: spriteData.behavior,
                        outline: spriteData.outline,
                        transform: {
                                ...DEFAULT_TRANSFORM,
                                ...spriteData.transform
                        }
                };

                const texture = new Texture(metadata);
                textures.set(spriteData.path, texture);

                const response = await fetch(spriteData.path);
                const text = await response.text();
                texture.loadSVG(text);
        }
}

export function getTexture(path: string) {
        return textures.get(path)!;
}