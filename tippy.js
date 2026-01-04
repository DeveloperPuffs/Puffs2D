export function setup() {
        tippy("[data-tippy-content]", {
                animation: "scale",
                onShow(instance) {
                        if (instance.reference.classList.contains("locked")) {
                                return false;
                        }
                }
        });
}