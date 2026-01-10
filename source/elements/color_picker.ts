import { LabeledElement } from "./labeled";
import { SliderElement } from "./slider";

export type Hex = string;

type ColorComponent<Type> = {
        key: keyof Type;
        label: string;
        minimum: number;
        maximum: number;
        step: number;
};

type ColorModel<Type> = {
        format: string;
        components: readonly ColorComponent<Type>[];
        fromHex(hex: Hex): Type | undefined;
        toHex(color: Type): Hex;
};

type RGB = {
        r: number;
        g: number;
        b: number;
};

type RGBA = {
        r: number;
        g: number;
        b: number;
        a: number;
};

function hex2RGBA(hex: Hex) {
        hex = hex.replace("#", "").trim();

        if (hex.length !== 3 && hex.length !== 4 && hex.length !== 6 && hex.length !== 8) {
                return undefined;
        }

        if (hex.length === 3 || hex.length === 4) {
                hex = hex.split("").map(character => character + character).join("");
        }

        return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255
        };
}

function RGBorRGBA2Hex(values: number[]) {
        return "#" + values.map(value => {
                value = Math.min(Math.max(Math.round(value), 0), 255);
                return value.toString(16).padStart(2, "0");
        }).join("");
}

const RGB_MODEL: ColorModel<RGB> = {
        format: "rgb",
        components: [
                { key: "r", label: "Red  ", minimum: 0, maximum: 255, step: 1 },
                { key: "g", label: "Green", minimum: 0, maximum: 255, step: 1 },
                { key: "b", label: "Blue ", minimum: 0, maximum: 255, step: 1 },
        ],
        fromHex(hex: Hex) {
                const rgba = hex2RGBA(hex)!;
                return { r: rgba.r, g: rgba.g, b: rgba.b }
        },
        toHex(color: RGB) {
                return RGBorRGBA2Hex([color.r, color.g, color.b]);
        }
};

const RGBA_MODEL: ColorModel<RGBA> = {
        format: "rgba",
        components: [
                { key: "r", label: "Red  ", minimum: 0, maximum: 255, step: 1 },
                { key: "g", label: "Green", minimum: 0, maximum: 255, step: 1 },
                { key: "b", label: "Blue ", minimum: 0, maximum: 255, step: 1 },
                { key: "a", label: "Alpha", minimum: 0, maximum: 255, step: 1 }
        ],
        fromHex(hex: Hex) {
                return hex2RGBA(hex);
        },
        toHex(color: RGBA) {
                return RGBorRGBA2Hex([color.r, color.g, color.b, color.a]);
        }
};

export class ColorPickerElement extends HTMLElement {
        static define() {
                customElements.define("color-picker-element", ColorPickerElement);
        }

        private presets!: HTMLDivElement;
        private sliders!: HTMLDivElement;

        private _color: Hex;
        private model?: ColorModel<any>;
        private controls: Map<keyof any, SliderElement>;

        constructor() {
                super();

                this._color = "#000000FF";
                this.controls = new Map();
        }

        get color() {
                return this._color;
        }

        set color(color: Hex) {
                if (color === this.color) {
                        return;
                }

                this._color = color;

                const format = this.getAttribute("format");
                let model: ColorModel<any> | undefined;
                switch (format) {
                        case "rgb": model = RGB_MODEL; break;
                        case "rgba": model = RGBA_MODEL; break;
                }

                if (model) {
                        const state = model.fromHex(color)!;
                        for (const [key, slider] of this.controls.entries()) {
                                slider.value = state[key];
                        }
                }

                if (this.isConnected) {
                        this.dispatchEvent(new Event("input", { bubbles: true }));
                }
        }

        connectedCallback() {
                const presets = this.textContent
                        .trim()
                        .split(",")
                        .map(preset => preset.trim())
                        .filter(preset => preset.length > 0);


                const template = document.querySelector<HTMLTemplateElement>("#color-picker-template")!;
                this.replaceChildren(template.content.cloneNode(true));

                this.presets = this.querySelector<HTMLDivElement>(".presets")!;
                this.sliders = this.querySelector<HTMLDivElement>(".sliders")!;

                this.color = this.getAttribute("color") ?? this.color;

                for (const preset of presets) {
                        const button = document.createElement("button");
                        button.style.backgroundColor = preset;
                        button.addEventListener("click", () => {
                                this.color = preset;
                        });

                        this.presets.appendChild(button);
                }

                const format = this.getAttribute("format");
                switch (format) {
                        case "rgb":
                                this.model = RGB_MODEL;
                                break;
                        case "rgba":
                                this.model = RGBA_MODEL;
                                break;
                }

                if (this.model !== undefined) {
                        let state = this.model.fromHex(this.color)!;

                        this.controls.clear();

                        for (const component of this.model.components) {
                                const labeled = document.createElement("labeled-element") as LabeledElement;
                                labeled.setAttribute("label", component.label);
                                labeled.toggleAttribute("inline-label", true);
                                labeled.setAttribute("margin", "least");

                                const slider = document.createElement("slider-element") as SliderElement;
                                slider.setAttribute("minimum", component.minimum.toString()); 
                                slider.setAttribute("maximum", component.maximum.toString()); 
                                slider.setAttribute("step", component.step.toString()); 
                                labeled.appendChild(slider);

                                this.sliders.appendChild(labeled);

                                slider.addEventListener("input", () => {
                                        state[component.key] = slider.value;
                                        this.color = this.model!.toHex(state);
                                });

                                this.controls.set(component.key, slider); 
                                slider.value = state[component.key];
                        }
                }
        }
}