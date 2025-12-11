import { app } from "../../scripts/app.js";

app.registerExtension({
    name: 'Comfy.SimpleTouchSupportFox.Optimized',
    setup() {
        const canvasEl = app.canvasEl;
        
        // CSS optimizations
        // @ts-ignore
        canvasEl.style.touchAction = "none";
        // @ts-ignore
        canvasEl.style.userSelect = "none";
        // @ts-ignore
        canvasEl.style.webkitUserSelect = "none";

        // State tracking
        let isProcessingTouch = false;
        let rafId = null; // ID for the animation frame
        
        // We store the "latest" event data here
        let currentTouches = null;
        
        // Zoom/Pan State
        let touchStartScale = 1;
        let touchStartDist = 0;
        let touchStartCenter = { x: 0, y: 0 };

        // Helper: Calculate distance between two fingers
        function getDist(touches) {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
        }

        // Helper: Calculate center point between two fingers
        function getCenter(touches) {
            return {
                x: (touches[0].clientX + touches[1].clientX) / 2,
                y: (touches[0].clientY + touches[1].clientY) / 2
            };
        }

        // The Heavy Lifter: This only runs once per screen frame (60fps/120fps)
        function updateCanvas() {
            if (!currentTouches || currentTouches.length !== 2) {
                rafId = null;
                return;
            }

            const currentDist = getDist(currentTouches);
            const currentCenter = getCenter(currentTouches);

            // 1. Calculate new scale
            const zoomFactor = currentDist / touchStartDist;
            let newScale = touchStartScale * zoomFactor;

            // Clamp scale (LiteGraph limits)
            newScale = Math.max(app.canvas.ds.min_scale || 0.1, Math.min(newScale, app.canvas.ds.max_scale || 10));

            // 2. Apply Scale
            const oldScale = app.canvas.ds.scale;
            app.canvas.ds.scale = newScale;

            // 3. Pan Correction (Zoom toward center point)
            const dx = (currentCenter.x - touchStartCenter.x);
            const dy = (currentCenter.y - touchStartCenter.y);
            
            app.canvas.ds.offset[0] += (currentCenter.x / oldScale) - (currentCenter.x / newScale) + (dx / newScale);
            app.canvas.ds.offset[1] += (currentCenter.y / oldScale) - (currentCenter.y / newScale) + (dy / newScale);

            // Update baseline for next frame
            touchStartDist = currentDist;
            touchStartScale = newScale;
            touchStartCenter = currentCenter;

            app.canvas.setDirty(true, true);
            
            // Allow next frame to trigger
            rafId = null;
        }

        function handleTouchStart(e) {
            if (e.touches.length === 2) {
                isProcessingTouch = true;
                touchStartDist = getDist(e.touches);
                touchStartScale = app.canvas.ds.scale;
                touchStartCenter = getCenter(e.touches);
                if (e.cancelable) e.preventDefault();
            }
        }

        function handleTouchMove(e) {
            if (!isProcessingTouch) return;

            if (e.touches.length === 2) {
                if (e.cancelable) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                // Instead of doing math NOW, we just save the data
                // and ask the browser to run the math "soon"
                currentTouches = e.touches;

                if (!rafId) {
                    rafId = requestAnimationFrame(updateCanvas);
                }
            }
        }

        function handleTouchEnd(e) {
            if (e.touches.length < 2) {
                isProcessingTouch = false;
                currentTouches = null;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            }
        }

        const target = canvasEl;
        target.addEventListener('touchstart', handleTouchStart, { passive: false });
        target.addEventListener('touchmove', handleTouchMove, { passive: false });
        target.addEventListener('touchend', handleTouchEnd, { passive: false });
        target.addEventListener('touchcancel', handleTouchEnd, { passive: false }); // Unified cleanup

        // --- Legacy Menu Dragging (Also Optimized) ---
        try {
            /** @type {HTMLElement | null} */
            const comfyMenu = document.querySelector(".comfy-menu");
            /** @type {HTMLElement | null} */
            const dragHandle = document.querySelector(".drag-handle");
            
            if (comfyMenu && dragHandle) {
                comfyMenu.style.touchAction = "none"; 
                
                let isDraggingMenu = false;
                let menuRafId = null;
                let lastTouchX = 0;
                let lastTouchY = 0;
                
                // Track where the menu WAS
                let currentMenuX = 0; 
                let currentMenuY = 0;

                dragHandle.addEventListener('touchstart', (e) => {
                    if(e.touches.length === 1) {
                        isDraggingMenu = true;
                        lastTouchX = e.touches[0].clientX;
                        lastTouchY = e.touches[0].clientY;
                        
                        const rect = comfyMenu.getBoundingClientRect();
                        currentMenuX = rect.left;
                        currentMenuY = rect.top;
                    }
                }, { passive: true });

                function updateMenu() {
                    if (!isDraggingMenu) {
                        menuRafId = null;
                        return;
                    }
                    comfyMenu.style.left = currentMenuX + "px";
                    comfyMenu.style.top = currentMenuY + "px";
                    menuRafId = null;
                }

                window.addEventListener('touchmove', (e) => {
                    if (isDraggingMenu && e.touches.length === 1) {
                        const dx = e.touches[0].clientX - lastTouchX;
                        const dy = e.touches[0].clientY - lastTouchY;
                        
                        currentMenuX += dx;
                        currentMenuY += dy;
                        
                        lastTouchX = e.touches[0].clientX;
                        lastTouchY = e.touches[0].clientY;

                        if (!menuRafId) {
                            menuRafId = requestAnimationFrame(updateMenu);
                        }
                    }
                }, { passive: true });

                window.addEventListener('touchend', () => { 
                    isDraggingMenu = false; 
                    if(menuRafId) cancelAnimationFrame(menuRafId);
                });
            }
        } catch (err) {
            console.log("Touch Extension: Legacy menu not found (harmless)");
        }
    }
});
