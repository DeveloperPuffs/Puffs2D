import { Outliner } from "./outliner";
import { SliderElement } from "./elements/slider";
import { ColorPickerElement } from "./elements/color_picker";

import spritesData from "./sprites.json";

export type Metadata = {
        type: "none" | "hat" | "weapon";
        behavior?: string;
        offset?: {
                x: number;
                y: number
        };
};

const textures: Map<string, Texture> = new Map();
const metadata: Map<string, Metadata> = new Map();
export class Texture {
        private static RESOLUTION = 4;
        private static parser = new DOMParser();
        private static serializer = new XMLSerializer();

        public width!: number;
        public height!: number;

        private svgElement!: SVGSVGElement;
        private rasterizedImage!: HTMLImageElement;
        private outlinedImage?: HTMLImageElement;
        private outliner?: Outliner;

        private rasterQueued: boolean = false;
        private rasterizing: boolean = false;

        private outlineQueued: boolean = false;
        private outlining: boolean = false;

        constructor(public name: string, private path: string, private hasOutline: boolean) {
                if (this.hasOutline) {
                        this.outliner = new Outliner();
                }
        }

        getSVG() {
                return this.svgElement;
        }

        getImage(outlined: boolean) {
                return outlined && this.hasOutline ? this.outlinedImage! : this.rasterizedImage;
        }

        getMetadata() {
                return metadata.get(this.path)!;
        }

        async load() {
                const response = await fetch(this.path);
                const text = await response.text();
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

                if (this.hasOutline) {
                        this.outlinedImage = new Image();
                        this.outlinedImage.width = this.width * Texture.RESOLUTION;
                        this.outlinedImage.height = this.height * Texture.RESOLUTION;

                        const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
                        outlineColorPicker.addEventListener("input", () => {
                                this.outline();
                        });

                        const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
                        outlineThicknessSlider.addEventListener("input", () => {
                                this.outline();
                        });
                }

                this.rasterize();
        }

        async rasterize() {
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

                        if (this.hasOutline) {
                                this.outline();
                        }
                }

                this.rasterizing = false;
        }

        private async outline() {
                if (!this.hasOutline) {
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

export async function loadTextures() {
        textures.clear();

        for (const spriteData of spritesData) {
                const texture = new Texture(
                        spriteData.name,
                        spriteData.path,
                        spriteData.outline
                );

                await texture.load();

                textures.set(spriteData.path, texture);

                if (spriteData.metadata !== undefined) {
                        const type = spriteData.metadata.type as Metadata["type"];
                        const behavior = spriteData.metadata.behavior;
                        const offset = spriteData.metadata.offset;
                        metadata.set(spriteData.path, { type, behavior, offset });
                }
        }
}

export function getTexture(path: string) {
        return textures.get(path)!;
}