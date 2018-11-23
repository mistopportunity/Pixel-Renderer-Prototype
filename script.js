const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const adjustCanvasSize = function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
}

let rendererState, animationFrame, pointerDown;

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

adjustCanvasSize();

const minZoom = 30;

const maxZoom = 400;

const grid = new centroidGrid(2000,2000,canvas.width>=canvas.height);

let lastDrawPosition = null;


//http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#JavaScript
function bline(dx,dy,x0, y0, x1, y1) {
 
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1; 
    var err = (dx>dy ? dx : -dy)/2;
   
    while (true) {
      grid.set(x0,y0,1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = err;
      if (e2 > -dx) { err -= dy; x0 += sx; }
      if (e2 < dy) { err += dx; y0 += sy; }
    }
  }


const gridTapped = (x,y) => {

    //const newValue = grid.get(x,y) === 1 ? null : 1;

    if(lastDrawPosition != null && pointerDown) {
        const xDistance = Math.abs(x - lastDrawPosition.x);
        const yDistance = Math.abs(y - lastDrawPosition.y);
        if(xDistance + yDistance > 1) {
            if(xDistance > 0 && yDistance < 1) {//just x
                if(x < lastDrawPosition.x) {
                    for(let i = x+1;i<lastDrawPosition.x;i++) {
                        grid.set(i,y,1);
                    }
                } else {
                    for(let i = lastDrawPosition.x-1;i<x;i++) {
                        grid.set(i,y,1);
                    }
                }
            } else if(yDistance > 0 && xDistance < 1) {//just y
                if(y < lastDrawPosition.y) {
                    for(let i = y+1;i<lastDrawPosition.y;i++) {
                        grid.set(x,i,1);
                    }
                } else {
                    for(let i = lastDrawPosition.y-1;i<y;i++) {
                        grid.set(x,i,1);
                    }
                }
            } else {

                bline(xDistance,yDistance,x,y,lastDrawPosition.x,lastDrawPosition.y);

            }//adding an else here allows for.... scary math
        }
    }

    grid.set(x,y,1);

    lastDrawPosition = {
        x: x,
        y: y
    }

    console.log(`Grid tapped at ${x},${y}`);
}

canvas.addEventListener("pointerdown",event => {
    grid.pointerPositionX = event.clientX;
    grid.pointerPositionY = event.clientY;
    pointerDown = true;
});

canvas.addEventListener("pointermove",event => {
    if(pointerDown) {
        grid.pointerPositionX = event.clientX;
        grid.pointerPositionY = event.clientY;       
    }
});

canvas.addEventListener("pointerup",event => {
    grid.pointerPositionX = -1;
    pointerDown = false;
    lastDrawPosition = null;
});

canvas.addEventListener("wheel",event => {
    grid.camera.z -= (event.deltaY / 10) * (grid.camera.z / 50);
    if(grid.camera.z < minZoom) {
        grid.camera.z = minZoom;
    } else if(grid.camera.z > maxZoom) {
        grid.camera.z = maxZoom;
    }
});

const keyPool = {};
const gradualCameraShiftAmount = 0.2;
const frameThreshold = 10;

window.addEventListener("keydown",event => {
    const key = event.key.toLowerCase();
    if(!keyPool[key]) {
        keyPool[key] = {
            frames: 0
        };
    }
});
window.addEventListener("keyup",event => {
    const key = event.key.toLowerCase();
    if(keyPool[key]) {

        if(keyPool[key].frames < frameThreshold) {
            switch(key) {
                case "w":
                    grid.camera.y = Math.ceil(grid.camera.y - 1);
                    break;
                case "s":
                    grid.camera.y = Math.floor(grid.camera.y + 1);
                    break;
                case "a":
                    grid.camera.x = Math.ceil(grid.camera.x - 1);
                    break;
                case "d":
                    grid.camera.x = Math.floor(grid.camera.x + 1);
                    break;
            }
        }

        delete keyPool[key];
    }

    if(keyPool["ctrl"]) {
        delete keyPool["ctrl"];
    }
    if(keyPool["alt"]) {
        delete keyPool["alt"];
    }
    if(keyPool["shift"]) {
        delete keyPool["shift"];
    }
});

grid.camera.x = Math.floor(grid.width / 2) + 1;
grid.camera.y = Math.floor(grid.height / 2) + 1;
grid.camera.z = 45;


window.addEventListener("resize",() => {
    adjustCanvasSize();
    grid.refold(canvas.width,canvas.height);
});

rendererState = (context,width,height,timestamp) => {
    grid.render(context,width,height,timestamp);
    if(pointerDown) {
        const register = grid.pointerRegister;
        if(register !== null) {
            gridTapped(register.x,register.y);
        }
    }
    for(let key in keyPool) {
        keyPool[key].frames++;
        switch(key) {
            case "w":
                grid.camera.y -= gradualCameraShiftAmount / (grid.camera.z / 50);
                break;
            case "s":
                grid.camera.y += gradualCameraShiftAmount / (grid.camera.z / 50);
                break;
            case "a":
                grid.camera.x -= gradualCameraShiftAmount / (grid.camera.z / 50);
                break;
            case "d":
                grid.camera.x += gradualCameraShiftAmount / (grid.camera.z / 50);
                break;
            default:
                break;
        }
    }
}

startRenderer();
