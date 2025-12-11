import { app } from "../../scripts/app.js";

app.registerExtension({

name: 'Comfy.SimpleTouchSupportFox.Optimized',

setup() {

    const canvasEl = app.canvasEl;
    
    // @ts-ignore
    canvasEl.style.touchAction = "none";
    // @ts-ignore
    canvasEl.style.userSelect = "none";
    // @ts-ignore
    canvasEl.style.webkitUserSelect = "none";

    let isProcessingTouch = false;
    let rafId = null;
    
    let currentTouches = null;
    
    let touchStartScale = 1;
    let touchStartDist = 0;
    let touchStartCenter = { x: 0, y: 0 };

    function getDist(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    function getCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    function updateCanvas() {
        if (!currentTouches || currentTouches.length !== 2) {
            rafId = null;
            return;
        }

        const currentDist = getDist(currentTouches);
        const currentCenter = getCenter(currentTouches);

        const zoomFactor = currentDist / touchStartDist;
        let newScale = touchStartScale * zoomFactor;

        newScale = Math.max(app.canvas.ds.min_scale || 0.1, Math.min(newScale, app.canvas.ds.max_scale || 10));

        const oldScale = app.canvas.ds.scale;
        app.canvas.ds.scale = newScale;

        const dx = (currentCenter.x - touchStartCenter.x);
        const dy = (currentCenter.y - touchStartCenter.y);

        app.canvas.ds.offset[0] += (currentCenter.x / oldScale) - (currentCenter.x / newScale) + (dx / newScale);
        app.canvas.ds.offset[1] += (currentCenter.y / oldScale) - (currentCenter.y / newScale) + (dy / newScale);

        touchStartDist = currentDist;
        touchStartScale = newScale;
        touchStartCenter = currentCenter;

        app.canvas.setDirty(true, true);
        
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
    target.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    try {
        const comfyMenu = document.querySelector(".comfy-menu");
        const dragHandle = document.querySelector(".drag-handle");
        
        if (comfyMenu && dragHandle) {
            comfyMenu.style.touchAction = "none"; 
            
            let isDraggingMenu = false;
            let menuRafId = null;
            let lastTouchX = 0;
            let lastTouchY = 0;
            
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
