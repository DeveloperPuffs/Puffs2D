export class SliderElement extends HTMLElement {
        static define() {
                customElements.define("slider-element", SliderElement);
        }

        private label!: HTMLLabelElement;
        private track!: HTMLDivElement;
        private thumb!: HTMLDivElement;
        private mark!: HTMLSpanElement;

        private _value = 0;
        private minimum = 0;
        private maximum = 100;
        private step = 1;

        constructor() {
                super();

                const template = document.querySelector<HTMLTemplateElement>("#slider-template")!;
                this.append(template.content.cloneNode(true));
        }

        connectedCallback() {
                this.label = this.querySelector<HTMLLabelElement>("label")!;
                this.track = this.querySelector<HTMLDivElement>(".track")!;
                this.thumb = this.querySelector<HTMLDivElement>(".thumb")!;
                this.mark = this.querySelector<HTMLSpanElement>("span")!;
                this.track.addEventListener("pointerdown", this.handleClick);
                this.attributeChangedCallback();
        }

        attributeChangedCallback() {
                this.minimum = Number(this.getAttribute("minimum") ?? "0");
                this.maximum = Number(this.getAttribute("maximum") ?? "100");
                this.value = Number(this.getAttribute("value") ?? this.minimum);
                this.step = Number(this.getAttribute("step") ?? "1");
                this.refresh();
        }

        get value() {
                return this._value;
        }

        set value(value: number) {
                const clamped = Math.min(this.maximum, Math.max(this.minimum, value));
                if (clamped === this._value) {
                        return;
                }

                this._value = clamped;
                this.setAttribute("value", String(clamped));
                this.refresh();

                this.dispatchEvent(new Event("input", { bubbles: true }));
        }

        private refresh() {
                this.label.textContent = this.getAttribute("label") ?? "";

                const interpolation = (this._value - this.minimum) / (this.maximum - this.minimum);
                this.thumb.style.left = `${interpolation * 100}%`;

                const decimals = this.step <= 0 ? 0 : Math.max(0, -Math.floor(Math.log10(this.step)));
                this.mark.textContent = this._value.toFixed(decimals);
        }

        private handleClick = (event: PointerEvent) => {
                this.track.setPointerCapture(event.pointerId);
                this.updateHandle(event);

                const moveHandler = (event: PointerEvent) => {
                        this.updateHandle(event);
                };

                const releaseHandler = () => {
                        window.removeEventListener("pointermove", moveHandler);
                        window.removeEventListener("pointerup", releaseHandler);
                };

                window.addEventListener("pointermove", moveHandler);
                window.addEventListener("pointerup", releaseHandler);
                this.dispatchEvent(new Event("change"));
        };

        private updateHandle(event: PointerEvent) {
                const trackRectangle = this.track.getBoundingClientRect();
                const interpolation = (event.clientX - trackRectangle.left) / trackRectangle.width;
                this.value = this.minimum + interpolation * (this.maximum - this.minimum);
        }
}