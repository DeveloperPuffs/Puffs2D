import { DEFAULT_TRANSFORM, getTexture, Metadata, Texture } from "../textures";
import tippy from "tippy.js";
import Konva from "konva";

export class SpriteSelectorElement extends HTMLElement {
        static define() {
                customElements.define("sprite-selector-element", SpriteSelectorElement);
        }

        private upload!: HTMLImageElement;
        private grid!: HTMLDivElement;
        private editor!: HTMLDivElement;
        private uploader: HTMLInputElement;
        private _sprite!: Texture;

        private referenceWidth!: number;
        private referenceHeight!: number;
        private scale!: number;

        private stage!: Konva.Stage;
        private layer!: Konva.Layer;
        private editorGroup!: Konva.Group;
        private templateImage!: Konva.Image;
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
                this.editor = this.querySelector<HTMLDivElement>(".sprite-editor")!;

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
                                window.alert("The image file is invalid. Please make sure you upload a valid \".png\"");
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

                        this.selectTexture(texture);
                });

                const reference = getTexture("body.svg");
                this.referenceWidth = reference.width;
                this.referenceHeight = reference.height;
                this.scale = 0.25 * Math.min(
                        this.editor.clientWidth / this.referenceWidth,
                        this.editor.clientHeight / this.referenceHeight
                );

                this.initializeEditor();
        }

        private initializeEditor() {
                this.stage = new Konva.Stage({
                        container: this.editor,
                        width: this.editor.clientWidth,
                        height: this.editor.clientHeight
                });

                this.layer = new Konva.Layer();
                this.stage.add(this.layer);

                this.editorGroup = new Konva.Group({
                        x: this.stage.width() / 2,
                        y: this.stage.height() / 2,
                        scaleX: this.scale,
                        scaleY: this.scale
                });

                this.layer.add(this.editorGroup);

                const templateImage = new Image();
                templateImage.src = "templatepuffs.png";

                this.templateImage = new Konva.Image({
                        image: templateImage,
                        x: -this.referenceWidth / 2,
                        y: -this.referenceHeight / 2,
                        width: this.referenceWidth,
                        height: this.referenceHeight,
                        listening: false
                });

                this.editorGroup.add(this.templateImage);

                const anchor = new Konva.Group({
                        x: 0,
                        y: -this.referenceHeight / 2
                });

                this.editorGroup.add(anchor);

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
                                if (entry.target !== this.editor) {
                                        continue;
                                }

                                this.stage.width(this.editor.clientWidth);
                                this.stage.height(this.editor.clientHeight);
                        }
                });

                resizeObserver.observe(this.editor);

                this.spriteImage.visible(false);
                this.transformer.visible(false);
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