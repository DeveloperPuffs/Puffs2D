export class DropdownElement extends HTMLElement {
        static define() {
                customElements.define("dropdown-element", DropdownElement);
        }

        private label!: HTMLLabelElement;
        private button!: HTMLButtonElement;
        private list!: HTMLUListElement;
        private options: string[] = [];
        private _value: string = "";

        get value() {
                return this._value;
        }

        set value(value: string) {
                if (value === this.value) {
                        return;
                }

                if (!this.options.includes(value)) {
                        return;
                }

                this._value = value;
                this.button.textContent = value;
                this.dispatchEvent(new Event("change"));
        }

        constructor() {
                super();
        }

        connectedCallback() {
                this.options = (this.textContent ?? "")
                        .split(",")
                        .map(option => option.trim())
                        .filter(option => option.length > 0);
                this.textContent = "";

                const template = document.querySelector<HTMLTemplateElement>("#dropdown-template")!;
                this.append(template.content.cloneNode(true));

                this.label = this.querySelector<HTMLLabelElement>("label")!;
                this.button = this.querySelector<HTMLButtonElement>("button")!;
                this.list = this.querySelector<HTMLUListElement>("ul")!;

                this.label.textContent = this.getAttribute("label") ?? "";

                for (const option of this.options) {
                        const item = document.createElement("li");
                        item.textContent = option;

                        item.addEventListener("click", () => {
                                this.value = option;
                                this.list.style.display = "none";
                        });

                        this.list.appendChild(item);
                }

                this.button.addEventListener("click", event => {
                        event.stopPropagation();
                        this.list.style.display = this.list.style.display === "block" ? "none" : "block";
                });

                document.addEventListener("click", () => {
                        this.list.style.display = "none";
                });

                this.value = this.getAttribute("value")!;

                const identifier = this.id || crypto.randomUUID();
                this.id = "";

                this.button.id = `${identifier}-button`;
                this.label.htmlFor = this.button.id;
        }
}