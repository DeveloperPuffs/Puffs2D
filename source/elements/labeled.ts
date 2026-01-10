export class LabeledElement extends HTMLElement {
        static define() {
                customElements.define("labeled-element", LabeledElement);
        }

        private label!: HTMLLabelElement;

        connectedCallback() {
                const children = Array.from(this.childNodes);

                const template = document.querySelector<HTMLTemplateElement>("#labeled-template")!;
                this.replaceChildren(template.content.cloneNode(true));

                this.label = this.querySelector<HTMLLabelElement>("label")!;
                this.label.textContent = this.getAttribute("label") ?? "";

                const forValue = this.getAttribute("for");
                if (forValue !== null) {
                        this.label.setAttribute("for", forValue);
                }

                const labeled = this.querySelector<HTMLDivElement>(".labeled")!;
                labeled.append(...children);
        }

        attributeChangedCallback(name: string, oldValue: string, newValue: string) {
                if (oldValue === newValue) {
                        return;
                }

                switch (name) {
                        case "label":
                                this.label.textContent = newValue;
                                break;
                        case "for":
                                this.label.setAttribute("for", newValue);
                                break;
                        default:
                                return;
                }
        }
}