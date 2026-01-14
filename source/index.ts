import "@fontsource/monaspace-neon";
import "@fontsource/monaspace-argon";
import "@fontsource/monaspace-radon";

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

import { loadTextures } from "./textures";

await loadTextures();

import { LabeledElement } from "./elements/labeled";
import { ToggleElement } from "./elements/toggle";
import { SliderElement } from "./elements/slider";
import { DropdownElement } from "./elements/dropdown";
import { ColorPickerElement } from "./elements/color_picker";
import { SpriteSelectorElement } from "./elements/sprite_selector";
import { Canvas2D } from "./canvas";

LabeledElement.define();
ToggleElement.define();
SliderElement.define();
DropdownElement.define();
ColorPickerElement.define();
SpriteSelectorElement.define();

import { Exporter2D } from "./exporter";

if (import.meta.env.DEV) {
        // Disable right clicking to open the context menu only in the build
        window.addEventListener("contextmenu", event => {
                event.preventDefault();
        });
}

import { setupRandomizer } from "./randomizer.js";
setupRandomizer();

const canvas = new Canvas2D();
canvas.startRunning();

const exporter = new Exporter2D();

enum Step {
        WELCOME = "welcome",
        GENERAL = "general",
        APPEARANCE = "appearance",
        ACCESSORIES = "accessories",
        WEAPONS = "weapons",
        MISCELLANEOUS = "miscellaneous",
        EXPORT = "export"
}

const stepOrder = Object.freeze([
        Step.WELCOME,
        Step.GENERAL,
        Step.APPEARANCE,
        Step.ACCESSORIES,
        Step.WEAPONS,
        Step.MISCELLANEOUS,
        Step.EXPORT
] as const);

const nextSteps = Object.freeze({
        [Step.WELCOME]: Step.GENERAL,
        [Step.GENERAL]: Step.APPEARANCE,
        [Step.APPEARANCE]: Step.ACCESSORIES,
        [Step.ACCESSORIES]: Step.WEAPONS,
        [Step.WEAPONS]: Step.MISCELLANEOUS,
        [Step.MISCELLANEOUS]: Step.EXPORT,
        [Step.EXPORT]: undefined
} as const);

let currentStep: Step | undefined = undefined;

function presentStep(step: Step) {
        if (currentStep !== undefined) {
                const icon = document.querySelector<HTMLLIElement>(`#${currentStep}-icon`)!;
                icon.classList.remove("active");
        }

        const icon = document.querySelector<HTMLLIElement>(`#${step}-icon`)!;
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
        const nextStep = nextSteps[content.id.split("-")[0] as Step];
        if (nextStep === undefined) {
                return;
        }

        proceedButton.addEventListener("click", () => {
                // Trigger a click to the corresponding icon so that I can listen for
                // clicks on the icon elements to detect when a step is being shown.
                document.querySelector<HTMLLIElement>(`#${nextStep}-icon`)!.click();
        });
});

document.querySelectorAll<HTMLLIElement>("#stepper > .icon").forEach(child => {
        child.addEventListener("click", () => {
                if (child.classList.contains("active")) {
                        return;
                }

                presentStep(child.id.split("-")[0] as Step);
        });
});

presentStep(Step.WELCOME);