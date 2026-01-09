import { Outliner } from "./outliner";

import spritesData from "./sprites.json";

type TextureData = {
        name: string;
        path: string;
        resolution: number;
        outline: boolean;
};

const RESOLUTION = 4;
export class Texture {
        static parser = new DOMParser();
        static serializer = new XMLSerializer();

        public width!: number;
        public height!: number;

        public svg: SVGSVGElement | undefined;
        public image: HTMLImageElement | undefined;
        private outlined: HTMLImageElement | undefined;

        private refreshQueued: boolean;
        private refreshing: boolean;

        constructor(public data: TextureData) {
                this.svg = undefined;
                this.image = undefined;
                this.refreshQueued = false;
                this.refreshing = false;
        }

        async load() {
                const response = await fetch(this.data.path);
                const text = await response.text();
                const parsed = Texture.parser.parseFromString(text, "image/svg+xml");
                if (!(parsed.documentElement instanceof SVGSVGElement)) {
                        throw new Error("Parsed texture is not an SVG");
                }

                this.svg = parsed.documentElement;
                this.width = Number(this.svg.getAttribute("width")!);
                this.height = Number(this.svg.getAttribute("height")!);
                await this.rasterize();
        }

        async rasterize() {
                if (this.svg === undefined) {
                        throw new Error("SVG for texture is not loaded");
                }

                if (this.refreshing) {
                        this.refreshQueued = true;
                        return;
                }

                this.refreshing = true;

                const string = Texture.serializer.serializeToString(this.svg);

                const blob = new Blob([string], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const image = new Image();
                image.width = this.width * RESOLUTION;
                image.height = this.height * RESOLUTION;

                this.image = await new Promise<HTMLImageElement>((resolve, reject) => {
                        image.onload = () => {
                                resolve(image);
                        };

                        image.onerror = error => {
                                reject(error);
                        };

                        image.src = url;
                });

                this.refreshing = false;
                if (this.refreshQueued) {
                        this.refreshQueued = false;
                        await this.rasterize();
                }
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
                const texture = new Texture(spriteData as TextureData);
                await texture.load();

                textures.set(spriteData.path, texture);
        }
}

export function getTexture(identifier: TextureIdentifier) {
        return textures.get(identifier)!;
}