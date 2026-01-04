const Step = Object.freeze({
        GENERAL: "general",
        APPEARANCE: "appearance",
        ACCESSORIES: "accessories",
        ATTACKS: "attacks",
        PERSONALITY: "personality",
        EFFECTS: "effects",
        REVIEW: "review"
});

const stepOrder = [
        Step.GENERAL,
        Step.APPEARANCE,
        Step.ACCESSORIES,
        Step.ATTACKS,
        Step.EFFECTS,
        Step.REVIEW
];

let currentStep = undefined;

function presentStep(step) {
        if (currentStep !== undefined) {
                const icon = document.querySelector(`#${currentStep}-icon`);
                icon.classList.remove("active");
        }

        const icon = document.querySelector(`#${step}-icon`);
        icon.classList.remove("locked");
        icon.classList.add("active");

        moveTrackTo(step, true);
        currentStep = step;
}

function moveTrackTo(step, animate) {
        const scroller = document.querySelector("#scroller");
        const track = document.querySelector("#track");

        const targetIndex = stepOrder.indexOf(step);

        let adjacent = false;
        if (currentStep !== undefined) {
                const currentIndex = stepOrder.indexOf(currentStep);
                adjacent = Math.abs(targetIndex - currentIndex) === 1;
        }

        if (!animate || !adjacent) {
                track.style.transition = "none";
        }

        track.style.transform = `translateX(-${targetIndex * scroller.clientWidth}px)`;

        if (!animate || !adjacent) {
                requestAnimationFrame(() => {
                        track.style.transition = "";
                });
        }
}

window.addEventListener("resize", () => {
        if (currentStep === undefined) {
                return;
        }

        moveTrackTo(currentStep, false);
})

const proceedButtons = document.querySelectorAll(".proceed");
for (const proceedButton of proceedButtons) {
        const content = proceedButton.closest(".step");
        const step = content.id.split("-")[0];

        let nextStep;
        switch (step) {
                case Step.GENERAL:
                        nextStep = Step.APPEARANCE;
                        break;
                case Step.APPEARANCE:
                        nextStep = Step.ACCESSORIES;
                        break;
                case Step.ACCESSORIES:
                        nextStep = Step.ATTACKS;
                        break;
                case Step.ATTACKS:
                        nextStep = Step.EFFECTS;
                        break;
                case Step.EFFECTS:
                        nextStep = Step.REVIEW;
                        break;
                case Step.REVIEW:
                        // Done
                        break;
        }

        proceedButton.addEventListener("click", () => {
                presentStep(nextStep);
        });
}

const stepper = document.querySelector("#stepper");
for (const child of stepper.children) {
        const step = child.id.split("-")[0];
        child.addEventListener("click", () => {
                if (child.classList.contains("locked") || child.classList.contains("active")) {
                        return;
                }

                presentStep(step);
        });
}

export function start() {
        presentStep(Step.GENERAL);
}