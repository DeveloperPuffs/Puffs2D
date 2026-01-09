import { Outliner } from "./outliner";
import { SliderElement } from "./elements/slider";
import { ColorPickerElement } from "./elements/color_picker";

import spritesData from "./sprites.json";
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
                this.rasterize();

                if (this.hasOutline) {
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

                        this.rasterizedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                                image.onload = () => {
                                        URL.revokeObjectURL(url);
                                        resolve(image);
                                };

                                image.onerror = reject;
                                image.src = url;
                        });

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
                                this.rasterizedImage.width,
                                this.rasterizedImage.height,
                                outlineColorPicker.color,
                                outlineThicknessSlider.value,
                                (context: CanvasRenderingContext2D) => {
                                        context.drawImage(this.rasterizedImage, 0, 0);
                                }
                        );

                        const url = outlined.toDataURL("image/png");

                        const image = new Image();
                        image.width = this.width * Texture.RESOLUTION;
                        image.height = this.height * Texture.RESOLUTION;

                        this.outlinedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                                image.onload = () => {
                                        URL.revokeObjectURL(url);
                                        resolve(image);
                                };

                                image.onerror = reject;
                                image.src = url;
                        });
                }

                this.outlining = false;
        }
}

export enum TextureIdentifier {
        BODY = "body.svg",
        HAND = "hand.svg",

        EYES = "eyes.svg",

        MOUTH = "mouth.svg",

        SWORD = "sword.svg",

        PROPELLER_HAT = "propeller_hat.svg"
}

const textures: Map<string, Texture> = new Map();

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
        }
}

export function getTexture(identifier: TextureIdentifier) {
        return textures.get(identifier)!;
}