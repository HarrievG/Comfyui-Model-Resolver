/**
 * ComfyUI Model Linker Extension - Frontend
 *
 * Provides a menu button and dialog interface for relinking missing models in workflows.
 */

import { app } from "../../../scripts/app.js";
import { ModelLinker } from "./linker/model_linker.js";
import { registerGlobalHelpers } from "./linker/globals.js";

registerGlobalHelpers();

const modelLinker = new ModelLinker();

app.registerExtension({
    name: "Model Linker",
    setup: modelLinker.setup
});
