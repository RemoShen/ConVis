import { createMainScene } from "./MainScene.js";
import { createInsetScene } from "./InsetScene.js";

window.addEventListener("DOMContentLoaded", () => {
  createMainScene(); // 主要看 MainScene.js
  createInsetScene();
});
