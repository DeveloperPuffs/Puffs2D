export class SliderElement extends HTMLElement {
        static define() {
                customElements.define("slider-element", SliderElement);
        }

        private track!: HTMLDivElement;
        private thumb!: HTMLDivElement;
        private mark!: HTMLSpanElement;

        private _value: number;
        private minimum: number;
        private maximum: number;
        private step: number;

        constructor() {
                super();

                this._value = 0;
                this.minimum = 0;
                this.maximum = 1;
                this.step = 1;
        }

        connectedCallback() {
                const template = document.querySelector<HTMLTemplateElement>("#slider-template")!;
                this.replaceChildren(template.content.cloneNode(true));

                this.track = this.querySelector<HTMLDivElement>(".track")!;
                this.thumb = this.querySelector<HTMLDivElement>(".thumb")!;
                this.mark = this.querySelector<HTMLSpanElement>("span")!;

                this.track.addEventListener("pointerdown", event => {
                        this.classList.add("dragging");

                        this.track.setPointerCapture(event.pointerId);
                        this.updateHandle(event);

                        const moveHandler = (event: PointerEvent) => {
                                this.updateHandle(event);
                        };

                        const releaseHandler = () => {
                                window.removeEventListener("pointermove", moveHandler);
                                window.removeEventListener("pointerup", releaseHandler);
                                this.classList.remove("dragging");

                                this.dispatchEvent(new Event("change"));
                        };

                        window.addEventListener("pointermove", moveHandler);
                        window.addEventListener("pointerup", releaseHandler);
                });

                this._value = Number(this.getAttribute("value") ?? this._value);
                this.minimum = Number(this.getAttribute("minimum") ?? this.minimum);
                this.maximum = Number(this.getAttribute("maximum") ?? this.maximum);
                this.step = Number(this.getAttribute("step") ?? this.step);

                this.refresh();
        }

        attributeChangedCallback(name: string, oldValue: string, newValue: string) {
                if (oldValue === newValue) {
                        return;
                }

                switch (name) {
                        case "minimum":
                                this.minimum = Number(newValue);
                                break;
                        case "value":
                                this.updateValue(Number(newValue), false);
                                break;
                        case "step":
                                this.step = Number(newValue);
                                break;
                        default:
                                return;
                }

                if (!this.isConnected) {
                        return;
                }

                this.refresh();
        }

        get value() {
                return this._value;
        }

        set value(value: number) {
                this.updateValue(value, true);
        }

        private snapValue(value: number) {
                const steps = Math.round((value - this.minimum) / this.step);
                const snapped = this.minimum + steps * this.step;

                const decimals = this.countDecimals();
                return Number(snapped.toFixed(decimals));
        }

        private updateValue(value: number, setAttribute: boolean) {
                const snapped = this.snapValue(value);
                const clamped = Math.min(this.maximum, Math.max(this.minimum, snapped));
                if (clamped === this._value) {
                        return;
                }

                this._value = clamped;

                if (setAttribute) {
                        this.setAttribute("value", clamped.toString());
                }

                if (this.isConnected) {
                        this.refresh();
                        this.dispatchEvent(new Event("input", { bubbles: true }));
                }
        }

        private countDecimals() {
                const text = this.step.toString();

                if (text.includes("e-")) {
                        return Number(text.split("e-")[1]);
                }

                const dot = text.indexOf(".");
                return dot === -1 ? 0 : text.length - dot - 1;
        }

        private formatValue(value: number) {
                const decimals = this.countDecimals();

                const absolute = Math.max(Math.abs(this.minimum), Math.abs(this.maximum));
                const integerDigits = Math.max(1, Math.floor(Math.log10(absolute)) + 1);

                const fixed = Math.abs(value).toFixed(decimals);
                const [integerPart, decimalPart] = fixed.split(".");

                const paddedInteger = integerPart.padStart(integerDigits, " ");

                return decimals > 0
                        ? `${value < 0 ? "-" : ""}${paddedInteger}.${decimalPart}`
                        : `${value < 0 ? "-" : ""}${paddedInteger}`;
        }

        private refresh() {
                const interpolation = (this._value - this.minimum) / (this.maximum - this.minimum);
                this.thumb.style.left = `${interpolation * 100}%`;
                this.mark.textContent = this.formatValue(this._value);
        }

        private updateHandle(event: PointerEvent) {
                const trackRectangle = this.track.getBoundingClientRect();
                const interpolation = (event.clientX - trackRectangle.left) / trackRectangle.width;
                this.value = this.minimum + interpolation * (this.maximum - this.minimum);
        }
}