export class ToggleElement extends HTMLElement {
        static define() {
                customElements.define("toggle-element", ToggleElement);
        }

        private button!: HTMLButtonElement;
        private _state: boolean = false;

        get state() {
                return this.state;
        }

        set state(state: boolean) {
                if (state === this._state) {
                        return;
                }

                this._state = state;

                this.button.setAttribute("aria-checked", String(this._state));
                this.dispatchEvent(new Event("change"));
        }

        connectedCallback() {
                const template = document.querySelector<HTMLTemplateElement>("#toggle-template")!;
                this.replaceChildren(template.content.cloneNode(true));

                this.button = this.querySelector<HTMLButtonElement>("button")!;

                this.button.addEventListener("click", () => {
                        const checked = this.button.getAttribute("aria-checked");
                        this.state = checked === "true" ? false : true;
                });

                const state = this.getAttribute("state")
                this._state = typeof state === "string" && state === "true";
                this.button.setAttribute("aria-checked", String(this._state));

                this.button.id = this.getAttribute("input-id") ?? "";
        }
}