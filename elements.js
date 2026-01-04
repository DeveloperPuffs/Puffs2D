export function setupDropdowns() {
        const dropdowns = document.querySelectorAll(".dropdown");
        for (const dropdown of dropdowns) {
                const input = dropdown.querySelector("input");
                const select = dropdown.querySelector("button");
                const list = dropdown.querySelector("ul");

                select.addEventListener("click", () => {
                        list.style.display = list.style.display === "block" ? "none" : "block";
                });

                const options = list.querySelectorAll("li");
                for (const option of options) {
                        option.addEventListener("click", () => {
                                select.textContent = option.textContent;
                                input.value = option.dataset.value;
                                list.style.display = "none";
                        });
                }

                document.addEventListener("click", event => {
                        if (!dropdown.contains(event.target)) {
                                list.style.display = "none";
                        }
                });
        }
}

const colorPickerPropertyConfiguration = Object.freeze({
        writable: false,
        enumerable: true,
        configurable: false
});

function hex2RGBA(hex) {
        if (typeof hex !== "string") {
                return null;
        }

        hex = hex.replace("#", "")
        hex = hex.trim();

        if (hex.length !== 3 && hex.length !== 4 && hex.length !== 6 && hex.length !== 8) {
                return null;
        }

        if (hex.length === 3 || hex.length === 4) {
                hex = hex.split("");
                hex = hex.map(character => character + character);
                hex = hex.join("");
        }

        return {
                red: parseInt(hex.slice(0, 2), 16),
                green: parseInt(hex.slice(2, 4), 16),
                blue: parseInt(hex.slice(4, 6), 16),
                alpha: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255
        };
}

function RGBA2Hex(red, green, blue, alpha) {
        function hex(value) {
                value = Math.min(Math.max(Math.round(value), 0), 255);
                value = value.toString(16);
                value = value.padStart(2, "0");
                return value;
        }

        return "#" + hex(red) + hex(green) + hex(blue) + hex(alpha);
}

export function setupColorPickers() {
        const colorPickers = document.querySelectorAll(".color-picker");

        for (const colorPicker of colorPickers) {
                let color = colorPicker.dataset.color;

                Object.defineProperty(colorPicker, "getColor", {
                        ...colorPickerPropertyConfiguration,
                        value: () => {
                                return color;
                        }
                });

                const colorChangeListeners = [];
                Object.defineProperty(colorPicker, "onColorChange", {
                        ...colorPickerPropertyConfiguration,
                        value: (listener, trigger) => {
                                colorChangeListeners.push(listener);
                                if (trigger) {
                                        listener(color);
                                }
                        }
                });

                const components = colorPicker.querySelector(".components");
                const red = Object.freeze({
                        slider: components.children[1],
                        value: components.children[2]
                });

                const green = Object.freeze({
                        slider: components.children[4],
                        value: components.children[5]
                });

                const blue = Object.freeze({
                        slider: components.children[7],
                        value: components.children[8]
                });

                const alpha = Object.freeze({
                        slider: components.children[10],
                        value: components.children[11]
                });

                for (const { slider, value } of [red, green, blue, alpha]) {
                        slider.min = "0";
                        slider.max = "255";
                        slider.addEventListener("input", () => {
                                value.textContent = slider.value;
                                const hex = RGBA2Hex(
                                        red.slider.value,
                                        green.slider.value,
                                        blue.slider.value,
                                        alpha.slider.value
                                );

                                color = hex;
                                for (const colorChangeListener of colorChangeListeners) {
                                        colorChangeListener(color);
                                }
                        });
                }

                // TODO: Animate the sliders?
                function updateSliders() {
                        const rgba = hex2RGBA(color);
                        red.slider.value = rgba.red;
                        red.value.textContent = rgba.red;
                        green.slider.value = rgba.green;
                        green.value.textContent = rgba.green;
                        blue.slider.value = rgba.blue;
                        blue.value.textContent = rgba.blue;
                        alpha.slider.value = rgba.alpha;
                        alpha.value.textContent = rgba.alpha;
                }

                const presetColors = colorPicker.querySelectorAll(".presets > button");
                for (const presetColor of presetColors) {
                        presetColor.addEventListener("click", () => {
                                color = presetColor.style.getPropertyValue("--color");
                                updateSliders();

                                for (const colorChangeListener of colorChangeListeners) {
                                        colorChangeListener(color);
                                }
                        });
                }

                updateSliders();
        }
}