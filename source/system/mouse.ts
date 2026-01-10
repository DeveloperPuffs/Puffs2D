import { Vector2D } from "./../math";

export class Mouse extends Vector2D {
        private position: Vector2D = Vector2D.zero();
        private clickCallbacks: (() => void)[] = [];

        constructor(validateEvent: (event: MouseEvent) => boolean) {
                super(0, 0);

                window.addEventListener("click", event => {
                        if (!validateEvent(event)) {
                                return;
                        }

                        for (const clickCallback of this.clickCallbacks) {
                                clickCallback();
                        }
                });

                window.addEventListener("mousemove", event => {
                        this.position.x = event.clientX;
                        this.position.y = event.clientY;
                });
        }

        onClick(callback: () => void) {
                this.clickCallbacks.push(callback);
        }

        mapPosition(positionMapper: (position: Vector2D) => void) {
                const position = this.position.copy();
                positionMapper(position);

                this.x = position.x;
                this.y = position.y;
        }
}