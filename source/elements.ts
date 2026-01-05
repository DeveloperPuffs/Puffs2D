export function setupDropdowns() {
        document.querySelectorAll<HTMLDivElement>(".dropdown").forEach(dropdown => {
                const input = dropdown.querySelector<HTMLInputElement>("input");
                const select = dropdown.querySelector<HTMLButtonElement>("button");
                const list = dropdown.querySelector<HTMLUListElement>("ul");

                select.addEventListener("click", () => {
                        list.style.display = list.style.display === "block" ? "none" : "block";
                });

                list.querySelectorAll<HTMLLIElement>("li").forEach(option => {
                        option.addEventListener("click", () => {
                                select.textContent = option.textContent;
                                input.value = option.dataset.value;
                                list.style.display = "none";
                        });
                });

                document.addEventListener("click", event => {
                        if (!(event.target instanceof Node)) {
                                return;
                        }

                        if (!dropdown.contains(event.target)) {
                                list.style.display = "none";
                        }
                });
        });
}

export type Hex = string;

type ColorComponent<Type> = {
        key: keyof Type;
        label: string;
        minimum: number;
        maximum: number;
};

type ColorModel<Type> = {
        format: string;
        components: readonly ColorComponent<Type>[];
        fromHex(hex: Hex): Type | undefined;
        toHex(color: Type): Hex;
};

type RGBA = {
        r: number;
        g: number;
        b: number;
        a: number;
};

const RGBA_MODEL: ColorModel<RGBA> = {
        format: "rgba",

        components: [
                { key: "r", label: "Red",   minimum: 0, maximum: 255 },
                { key: "g", label: "Green", minimum: 0, maximum: 255 },
                { key: "b", label: "Blue",  minimum: 0, maximum: 255 },
                { key: "a", label: "Alpha", minimum: 0, maximum: 255 }
        ],

        fromHex(hex: Hex) {
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
        },

        toHex(color: RGBA) {
                return "#" + [color.r, color.g, color.b, color.a].map(value => {
                        value = Math.min(Math.max(Math.round(value), 0), 255);
                        return value.toString(16).padStart(2, "0");
                }).join("");
        }
};

const COLOR_MODELS = {
        rgba: RGBA_MODEL
        // Now, I can support more models like HSLA
} as const;

type ColorFormat = keyof typeof COLOR_MODELS;

type Slider<Type> = {
        component: ColorComponent<Type>;
        input: HTMLInputElement;
        output: HTMLSpanElement;
};

function buildSliders<Type>(container: Element, model: ColorModel<Type>, changed: (key: keyof Type, value: number) => void): Slider<Type>[] {
        container.replaceChildren();

        const sliders: Slider<Type>[] = [];

        for (const component of model.components) {
                const digits = component.maximum.toString().length;

                const label = document.createElement("label");
                label.textContent = component.label;

                const input = document.createElement("input");
                input.type = "range";
                input.min = String(component.minimum);
                input.max = String(component.maximum);

                const span = document.createElement("span");

                input.addEventListener("input", () => {
                        const value = Number(input.value);
                        span.textContent = input.value.padStart(digits, " ");
                        changed(component.key, value);
                });

                container.append(label, input, span);
                sliders.push({ component, input, output: span });
        }

        return sliders;
}

export interface ColorPickerElement extends HTMLDivElement {
        getColor(): Hex;
        onColorChange(listener: (color: Hex) => void): void;
}

export function setupColorPickers() {
        document.querySelectorAll<HTMLDivElement>(".color-picker").forEach(element => {
                const colorPicker = element as ColorPickerElement;
                let color: Hex = colorPicker.dataset.color ?? "#000000FF";

                const colorChangeListeners: ((color: Hex) => void)[] = [];
                function triggerColorPickerChangeListeners() {
                        for (const colorChangeListener of colorChangeListeners) {
                                colorChangeListener(color);
                        }
                }

                Object.defineProperty(colorPicker, "getColor", {
                        writable: false,
                        enumerable: true,
                        configurable: false,
                        value: () => {
                                return color;
                        }
                });

                Object.defineProperty(colorPicker, "onColorChange", {
                        writable: false,
                        enumerable: true,
                        configurable: false,
                        value: (listener: (color: Hex) => void) => {
                                colorChangeListeners.push(listener);
                        }
                });

                const presets = colorPicker.querySelector<HTMLDivElement>(".presets");
                if (presets !== null) {
                        const presetColors = presets.textContent?.split(",") ?? [];
                        presets.replaceChildren();

                        for (const presetColor of presetColors) {
                                const button = document.createElement("button");
                                button.style.backgroundColor = presetColor;
                                button.addEventListener("click", () => {
                                        color = presetColor;
                                        triggerColorPickerChangeListeners();
                                });

                                presets.appendChild(button);
                        }
                }

                const slidersContainer = colorPicker.querySelector<HTMLDivElement>(".sliders");
                if (slidersContainer !== null) {
                        let format = slidersContainer.dataset.format as ColorFormat;
                        let model = COLOR_MODELS[format];

                        let state = model.fromHex(color) ?? model.fromHex("#000000ff")!;
                        let sliders = buildSliders(slidersContainer, model, (key, value) => {
                                state[key] = value;
                                color = model.toHex(state);
                                triggerColorPickerChangeListeners();
                        });

                        const colorChanged = (color: Hex) => {
                                state = model.fromHex(color) ?? state;

                                for (const slider of sliders) {
                                        const value = state[slider.component.key] as number;
                                        slider.input.value = String(value);

                                        const digits = slider.component.maximum.toString().length;
                                        slider.output.textContent = String(value).padStart(digits, " ");
                                }
                        }

                        colorPicker.onColorChange(colorChanged);
                        colorChanged(color);
                }
        });
}