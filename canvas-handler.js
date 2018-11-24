const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const adjustCanvasSize = function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
}

let rendererState, animationFrame;

const render = timestamp => {
    rendererState(
        context,
        canvas.width,
        canvas.height,
        timestamp
    );
    animationFrame = window.requestAnimationFrame(render);
};

const stopRenderer = function() {
    if(!rendererState) {
        console.warn("Warning: The renderer is already stopped and cannot be stopped further.");
        return;
    }
    window.cancelAnimationFrame(animationFrame);
    rendererState = null;
    console.log("Renderer stopped");
}

const startRenderer = function() {
    if(!rendererState) {
        console.error("Error: Missing renderer state; the renderer cannot start.");
        return;
    }
    animationFrame = window.requestAnimationFrame(render);
    console.log("Renderer started");
}

window.addEventListener("resize",adjustCanvasSize);

adjustCanvasSize();
