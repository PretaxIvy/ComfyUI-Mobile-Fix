# ComfyUI Mobile Fix

A fork of [ComfyUI-Touch-Gestures](https://github.com/Iemand005/ComfyUI-Touch-Gestures) that focuses on performance and bug fixes for mobile devices.

### Changes
This version modifies the original script to address the following issues:

* **Fixed Input Blocking:** Resolved an issue where the interface would stop responding to mouse clicks after touch interactions.
* **Performance:** Implemented `requestAnimationFrame` to decouple touch events from canvas rendering. This resolves FPS drops during zoom/pan on higher refresh rate screens (120Hz+).
* **Native Behavior:** Added CSS `touch-action` properties to properly prevent the browser from zooming the entire page while interacting with the node graph.

### Installation

**Method 1: Git Clone**
1. Open a terminal in your `ComfyUI/custom_nodes/` folder.
2. Run:
   ```bash
   git clone [https://github.com/PretaxIvy/ComfyUI-Mobile-Fix](https://github.com/PretaxIvy/ComfyUI-Mobile-Fix)
