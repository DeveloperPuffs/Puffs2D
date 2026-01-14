import { ColorPickerElement } from "./elements/color_picker";
import { ToggleElement } from "./elements/toggle";
import { SliderElement } from "./elements/slider";
import { SpriteSelectorElement } from "./elements/sprite_selector";
import { getTexture } from "./textures";

export function setupRandomizer() {
        document.querySelector<HTMLButtonElement>("#randomize")!.addEventListener("click", randomize);
}

function parseList(list: string) {
        return list
                .trim()
                .split(",")
                .map(skinColor => skinColor.trim())
                .filter(skinColor => skinColor.length !== 0);
}

const headwears = parseList(`
        headwear/no_headwear.svg,
        headwear/top_hat.svg,
        headwear/baseball_cap.svg,
        headwear/propeller_hat.svg,
        headwear/christmas_hat.svg,
        headwear/wizard_hat.svg,
        headwear/plant_hat.svg,
        headwear/birthday_hat.svg
`);

const weapons = parseList(`
        weapons/no_weapon.svg,
        weapons/sword.svg,
        weapons/spear.svg,
        weapons/staff.svg,
        weapons/baseball_bat.svg,
        weapons/trident.svg,
`);

function randomArrayItem<Type>(array: Type[]): Type {
        return array[Math.floor(Math.random() * array.length)];

}

function randomColor() {
        const h = Math.random() * 360;
        const s = (40 + Math.random() * 60) / 100;
        const l = (60 + Math.random() * 40) / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (h < 60)       { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }

        return `#${[r, g, b, 1 / 255].map(component => {
                return Math.round((component + m) * 255)
                        .toString(16)
                        .padStart(2, "0");
        }).join("")}`
}

function randomize() {
        const bodyColorPicker = document.querySelector<ColorPickerElement>("#body-color-picker")!;
        bodyColorPicker.color = randomColor();

        const handsSizeSlider = document.querySelector<SliderElement>("#hands-size")!;
        handsSizeSlider.value = 40 + Math.random() * 40;

        const headwearSelector = document.querySelector<SpriteSelectorElement>("#headwear-selector")!;
        headwearSelector.sprite = getTexture(randomArrayItem(headwears));

        const weaponSelector = document.querySelector<SpriteSelectorElement>("#weapon-selector")!;
        weaponSelector.sprite = getTexture(randomArrayItem(weapons));

        const outlineToggle = document.querySelector<ToggleElement>("#enable-outline")!;
        outlineToggle.state = Math.random() > 0.75;

        const outlineThicknessSlider = document.querySelector<SliderElement>("#outline-thickness")!;
        outlineThicknessSlider.value = 2 + Math.round(Math.random() * 8) * 0.5; // 2 to 6, step 0.5

        const outlineColorPicker = document.querySelector<ColorPickerElement>("#outline-color-picker")!;
        outlineColorPicker.color = randomColor();
}