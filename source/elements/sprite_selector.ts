import { DEFAULT_TRANSFORM, getTexture, Metadata, Texture } from "../textures";
import tippy from "tippy.js";
import Konva from "konva";
import { Vector2D } from "../math";

type Metrics = {
        reference: Texture;
        referenceInFront: boolean;
        referenceOffset: Vector2D;
        offsetFromReference: Vector2D;
        targetWidth: number;
        targetHeight: number;
        scale: number;
};
export class SpriteSelectorElement extends HTMLElement {
        static define() {
                customElements.define("sprite-selector-element", SpriteSelectorElement);
        }

        private upload!: HTMLImageElement;
        private grid!: HTMLDivElement;
        private uploader: HTMLInputElement;
        private _sprite!: Texture;

        private metrics!: Metrics;

        private stage!: Konva.Stage;
        private layer!: Konva.Layer;
        private editorGroup!: Konva.Group;
        private referenceImage!: Konva.Image;
        private spriteImage!: Konva.Image;
        private transformer!: Konva.Transformer;

        constructor() {
                super();

                this.uploader = document.createElement("input");
                this.uploader.type = "file";
        }

        get sprite() {
                return this._sprite;
        }

        set sprite(sprite: Texture) {
                if (sprite === this._sprite) {
                        return;
                }

                this._sprite = sprite;
                this.dispatchEvent(new Event("change"));
        }

        connectedCallback() {
                const paths = this.textContent
                        .trim()
                        .split(",")
                        .map(path => path.trim())
                        .filter(path => path.length > 0);

                const template = document.querySelector<HTMLTemplateElement>("#sprite-selector-template")!;
                this.replaceChildren(template.content.cloneNode(true));

                this.grid = this.querySelector<HTMLDivElement>(".sprite-grid")!;

                for (const path of paths) {
                        const texture = getTexture(path);
                        const image = texture.getImage(true);
                        this.grid.appendChild(image);

                        image.addEventListener("click", () => {
                                this.selectTexture(texture);
                        });

                        if (texture.metadata.type === "upload") {
                                this.upload = image;
                        }

                        image.setAttribute("data-tippy-content", texture.metadata.name);
                }

                tippy("[data-tippy-content]", {
                        animation: "scale"
                });

                this.sprite = getTexture(this.getAttribute("value")!);
                const image = this.sprite.getImage(true);
                image.classList.add("selected");

                this.uploader.addEventListener("change", async () => {
                        const file = this.uploader.files?.[0];
                        if (file === undefined) {
                                return;
                        }

                        const metadata: Metadata = {
                                type: this.getAttribute("type") as Metadata["type"],
                                name: file.name,
                                outline: true,
                                behavior: "sword",
                                transform: {
                                        ...DEFAULT_TRANSFORM
                                }
                        };

                        const texture = new Texture(metadata);
                        if (file.type === "image/svg+xml") {
                                texture.loadSVG(await file.text());
                        } else if (file.type.startsWith("image/")) {
                                await texture.loadBitmap(file);
                        } else {
                                window.alert("Invalid image file.");
                                return;
                        }

                        const image = texture.getImage(true);
                        image.addEventListener("click", () => {
                                this.selectTexture(texture);
                        });

                        this.upload.parentNode!.insertBefore(image, this.upload);

                        image.setAttribute("data-tippy-content", file.name);

                        tippy("[data-tippy-content]", {
                                animation: "scale"
                        });

                        const scaleX = this.metrics.targetWidth / texture.width;
                        const scaleY = this.metrics.targetHeight / texture.height;
                        const scale = Math.max(scaleX, scaleY);

                        texture.metadata.transform.w = scale;
                        texture.metadata.transform.h = scale;

                        this.selectTexture(texture);
                });

                this.initializeEditor();
        }

        private initializeEditor() {
                this.querySelector<HTMLLIElement>(".horizontal-flip")!.addEventListener("click", () => {
                        this.sprite.metadata.transform.w *= -1;
                        this.sprite.metadata.transform.x *= -1;
                        this.placeTexture();
                });

                this.querySelector<HTMLLIElement>(".vertical-flip")!.addEventListener("click", () => {
                        this.sprite.metadata.transform.h *= -1;
                        this.sprite.metadata.transform.y *= -1;
                        this.placeTexture();
                });

                this.querySelector<HTMLLIElement>(".rotate-left")!.addEventListener("click", () => {
                        this.sprite.metadata.transform.r -= Math.PI / 2;
                        this.placeTexture();
                });

                this.querySelector<HTMLLIElement>(".rotate-right")!.addEventListener("click", () => {
                        this.sprite.metadata.transform.r += Math.PI / 2;
                        this.placeTexture();
                });

                const canvasWrapper = this.querySelector<HTMLDivElement>(".sprite-editor > .canvas-wrapper")!;

                const type = this.getAttribute("type");
                switch (type) {
                        case "headwear": {
                                const reference = getTexture("reference.svg");
                                const scale = 0.4 * Math.min(
                                        canvasWrapper.clientWidth / reference.width,
                                        canvasWrapper.clientHeight / reference.height
                                );

                                this.metrics = {
                                        reference,
                                        scale,
                                        referenceInFront: false,
                                        referenceOffset: new Vector2D(0, reference.height / 2 * scale),
                                        offsetFromReference: new Vector2D(0, -reference.width / 2),
                                        targetWidth: reference.height * 1.5,
                                        targetHeight: reference.height / 1.5
                                }

                                break;
                        }

                        case "weapon": {
                                const reference = getTexture("reference_hand.svg");
                                const scale = 0.15 * Math.min(
                                        canvasWrapper.clientWidth / reference.width,
                                        canvasWrapper.clientHeight / reference.height
                                );

                                this.metrics = {
                                        reference,
                                        scale,
                                        referenceInFront: true,
                                        referenceOffset: new Vector2D(0, reference.height * 1.5 * scale),
                                        offsetFromReference: Vector2D.zero(),
                                        targetWidth: reference.width * 2,
                                        targetHeight: reference.height * 5
                                }

                                break;
                        }

                        default:
                                throw new Error(`Invalid sprite selector type: ${type}`);
                }

                this.stage = new Konva.Stage({
                        container: canvasWrapper,
                        width: canvasWrapper.clientWidth,
                        height: canvasWrapper.clientHeight
                });

                this.layer = new Konva.Layer();
                this.stage.add(this.layer);

                this.editorGroup = new Konva.Group({
                        x: this.stage.width() / 2 + this.metrics.referenceOffset.x,
                        y: this.stage.height() / 2 + this.metrics.referenceOffset.y,
                        scaleX: this.metrics.scale,
                        scaleY: this.metrics.scale
                });

                this.layer.add(this.editorGroup);

                this.referenceImage = new Konva.Image({
                        image: this.metrics.reference.getImage(false),
                        x: -this.metrics.reference.width / 2,
                        y: -this.metrics.reference.height / 2,
                        width: this.metrics.reference.width,
                        height: this.metrics.reference.height,
                        listening: false
                });

                const anchor = new Konva.Group(this.metrics.offsetFromReference);

                this.spriteImage = new Konva.Image();
                this.spriteImage.draggable(true);

                this.transformer = new Konva.Transformer({
                        rotateAnchorOffset: 25,
                        rotateEnabled: true,
                        resizeEnabled: true,
                        keepRatio: false,
                        borderStroke: "rgba(255, 255, 255, 0.5)",
                        borderStrokeWidth: 1.5,
                        anchorFill: "rgba(255, 255, 255, 0.5)",
                        anchorStrokeWidth: 0,
                        anchorSize: 10,
                        anchorCornerRadius: 5
                });

                this.transformer.nodes([this.spriteImage]);
                this.layer.add(this.transformer);

                this.spriteImage.on("dragmove", this.synchronizeTransform);
                this.spriteImage.on("transform", this.synchronizeTransform);

                this.spriteImage.on("mouseenter", () => {
                        this.stage.container().style.cursor = "move";
                });

                this.spriteImage.on("mouseleave", () => {
                        this.stage.container().style.cursor = "default";
                });

                anchor.add(this.spriteImage);

                const resizeObserver = new ResizeObserver(entries => {
                        for (const entry of entries) {
                                if (entry.target !== canvasWrapper) {
                                        continue;
                                }

                                this.stage.width(canvasWrapper.clientWidth);
                                this.stage.height(canvasWrapper.clientHeight);
                        }
                });

                resizeObserver.observe(canvasWrapper);

                this.spriteImage.visible(false);
                this.transformer.visible(false);

                if (this.metrics.referenceInFront) {
                        this.editorGroup.add(anchor);
                        this.editorGroup.add(this.referenceImage);
                } else {
                        this.editorGroup.add(this.referenceImage);
                        this.editorGroup.add(anchor);
                }
        }

        private synchronizeTransform = () => {
                this.sprite.metadata.transform.x = this.spriteImage.x();
                this.sprite.metadata.transform.y = this.spriteImage.y();
                this.sprite.metadata.transform.w = this.spriteImage.scaleX();
                this.sprite.metadata.transform.h = this.spriteImage.scaleY();
                this.sprite.metadata.transform.r = this.spriteImage.rotation() * Math.PI / 180;
        };

        private selectTexture(texture: Texture) {
                if (texture.metadata.type === "upload") {
                        this.uploader.click();
                        return;
                }

                if (this.sprite === texture) {
                        return;
                }

                const oldImage = this.sprite.getImage(true);
                oldImage.classList.remove("selected");

                this.sprite = texture;
                const newImage = this.sprite.getImage(true);
                newImage.classList.add("selected");

                this.placeTexture();
        }

        private placeTexture() {
                const metadata = this.sprite.metadata;
                if (metadata.type === "none" || metadata.type === "upload") {
                        this.spriteImage.visible(false);
                        this.transformer.visible(false);
                        return;
                }

                this.spriteImage.visible(true);
                this.transformer.visible(true);

                const transform = metadata.transform;
                this.spriteImage.setAttrs({
                        image: this.sprite.getImage(false),
                        x: transform.x,
                        y: transform.y,

                        width: this.sprite.width,
                        height: this.sprite.height,

                        offsetX: this.sprite.width / 2,
                        offsetY: this.sprite.height / 2,

                        scaleX: transform.w,
                        scaleY: transform.h,

                        rotation: transform.r * 180 / Math.PI
                });
        }
}