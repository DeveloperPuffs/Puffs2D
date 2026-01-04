import * as Elements from "./elements.js";
import * as Tippy from "./tippy.js";
import * as Starfield from "./starfield.js";
import * as Canvas from "./canvas.js";
import * as Flow from "./flow.js";

Elements.setupDropdowns();
Elements.setupColorPickers();
Tippy.setup();

Starfield.setup();
Canvas.setup();

Flow.start();