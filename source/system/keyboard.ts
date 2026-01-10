export class Keyboard {
        private keys: Set<string> = new Set();
        private keyPressCallbacks: Map<string, ((key: string) => void)[]> = new Map();
        private keyReleaseCallbacks: Map<string, ((key: string) => void)[]> = new Map();

        constructor(validateEvent: (event: KeyboardEvent) => boolean) {
                window.addEventListener("keydown", event => {
                        if (event.repeat) {
                                return;
                        }

                        if (!validateEvent(event)) {
                                return;
                        }

                        this.keys.add(event.code);

                        const callbacks = this.keyPressCallbacks.get(event.code);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(event.code));
                        }
                });

                window.addEventListener("keyup", event => {
                        if (!this.keys.has(event.code)) {
                                return;
                        }

                        this.keys.delete(event.code);

                        const callbacks = this.keyReleaseCallbacks.get(event.code);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(event.code));
                        }
                });

                window.addEventListener("blur", this.clearKeys);
                document.addEventListener("visibilitychange", () => {
                        if (document.visibilityState === "hidden") {
                                this.clearKeys();
                        }
                });
        }

        private clearKeys = () => {
                for (const key of this.keys) {
                        const callbacks = this.keyReleaseCallbacks.get(key);
                        if (callbacks !== undefined) {
                                callbacks.forEach(callback => callback(key));
                        }
                }

                this.keys.clear();
        }

        checkKey(keys: string): boolean {
                return this.parseKeys(keys).some(key => this.keys.has(key));
        }

        onKeyPress(keys: string, callback: (key: string) => void) {
                this.parseKeys(keys).forEach(key => {
                        const callbacks = this.keyPressCallbacks.get(key);
                        if (callbacks === undefined) {
                                this.keyPressCallbacks.set(key, [callback]);
                                return;
                        }

                        callbacks.push(callback);
                });
        }

        onKeyRelease(keys: string, callback: (key: string) => void) {
                this.parseKeys(keys).forEach(key => {
                        const callbacks = this.keyReleaseCallbacks.get(key);
                        if (callbacks === undefined) {
                                this.keyReleaseCallbacks.set(key, [callback]);
                                return;
                        }

                        callbacks.push(callback);
                });
        }

        private parseKeys(keys: string) {
                return keys
                        .trim()
                        .split(",")
                        .map(key => key.trim())
                        .filter(key => key.length !== 0);
        }
}