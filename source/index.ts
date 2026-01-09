import "@fontsource/monaspace-neon";
import "@fontsource/monaspace-argon";
import "@fontsource/monaspace-radon";
import "./index.css";

import Starfield from "./vendor/starfield.js/starfield.js";

Starfield.setup({
        auto: false,
        starColor: "rgb(255, 255, 255)",
        canvasColor: "rgb(20, 10, 30)",
        hueJitter: 0,
        trailLength: 0.75,
        baseSpeed: 2.5,
        maxAcceleration: 5,
        accelerationRate: 0.05,
        decelerationRate: 0.05,
        minSpawnRadius: 100,
        maxSpawnRadius: 500
});

import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/dist/svg-arrow.css";
import "tippy.js/animations/scale.css";

tippy("[data-tippy-content]", {
        animation: "scale",
        onShow(instance) {
                if (instance.reference.classList.contains("locked")) {
                        return false;
                }
        }
});

import { SliderElement } from "./elements/slider";
import { DropdownElement } from "./elements/dropdown";
import { ColorPickerElement } from "./elements/color_picker";
import { Canvas2D } from "./canvas";

SliderElement.define();
DropdownElement.define();
ColorPickerElement.define();

import { loadTextures } from "./textures";

await loadTextures();

// window.addEventListener("contextmenu", event => {
//         event.preventDefault();
// });

const canvas = new Canvas2D();
canvas.startRunning();

enum Step {
        GENERAL = "general",
        APPEARANCE = "appearance",
        ACCESSORIES = "accessories",
        WEAPONS = "weapons",
        EFFECTS = "effects",
        REVIEW = "review"
}

const stepOrder = Object.freeze([
        Step.GENERAL,
        Step.APPEARANCE,
        Step.ACCESSORIES,
        Step.WEAPONS,
        Step.EFFECTS,
        Step.REVIEW
] as const);

let currentStep: Step | undefined = undefined;

function presentStep(step: Step) {
        if (currentStep !== undefined) {
                const icon = document.querySelector<HTMLLIElement>(`#${currentStep}-icon`)!;
                icon.classList.remove("active");
        }

        const icon = document.querySelector<HTMLLIElement>(`#${step}-icon`)!;
        icon.classList.remove("locked");
        icon.classList.add("active");

        moveTrackTo(step, true);
        currentStep = step;
}

function moveTrackTo(step: Step, animate: boolean) {
        const scroller = document.querySelector<HTMLDivElement>("#scroller")!;
        const track = document.querySelector<HTMLDivElement>("#track")!;

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

document.querySelectorAll<HTMLButtonElement>("button.proceed").forEach(proceedButton => {
        const content = proceedButton.closest<HTMLDivElement>(".step")!;
        const step = content.id.split("-")[0];

        let nextStep: Step;
        switch (step) {
                case Step.GENERAL:
                        nextStep = Step.APPEARANCE;
                        break;
                case Step.APPEARANCE:
                        nextStep = Step.ACCESSORIES;
                        break;
                case Step.ACCESSORIES:
                        nextStep = Step.WEAPONS;
                        break;
                case Step.WEAPONS:
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
});

document.querySelector<HTMLOListElement>("#stepper")!.childNodes.forEach(child => {
        if (!(child instanceof HTMLLIElement)) {
                return;
        }

        const step = child.id.split("-")[0] as Step;
        child.addEventListener("click", () => {
                if (child.classList.contains("locked") || child.classList.contains("active")) {
                        return;
                }

                presentStep(step);
        });
});

presentStep(Step.GENERAL);