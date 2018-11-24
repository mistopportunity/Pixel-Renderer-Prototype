const minZoom = 30;
const maxZoom = 400;
const grid = new centroidGrid(2000,2000,canvas.width>=canvas.height);

let lastDrawPosition = null;
let mouseDown = false;

function bline(dx,dy,x0, y0, x1, y1) {
    //http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#JavaScript
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

    if(lastDrawPosition != null && mouseDown) {
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
            }
        }
    }

    grid.set(x,y,1);

    lastDrawPosition = {
        x: x,
        y: y
    };
}

canvas.addEventListener("mousedown",event => {
    grid.hitDetectionX = event.clientX;
    grid.hitDetectionY = event.clientY;
    mouseDown = true;
});

canvas.addEventListener("mousemove",event => {
    if(mouseDown) {
        grid.hitDetectionX = event.clientX;
        grid.hitDetectionY = event.clientY;
    }
});

const endMouseDetection = function() {
    grid.hitDetectionX = -1;
    mouseDown = false;
    lastDrawPosition = null;
}

canvas.addEventListener("mouseout",endMouseDetection);
canvas.addEventListener("mouseup",endMouseDetection);

canvas.addEventListener("wheel",event => {
    grid.camera.z -= (event.deltaY / 10) * (grid.camera.z / inverseZoomFactor);
    if(grid.camera.z < minZoom) {
        grid.camera.z = minZoom;
    } else if(grid.camera.z > maxZoom) {
        grid.camera.z = maxZoom;
    }
});

const keyPool = {};
const gradualCameraShiftAmount = 0.2;

const maxGamepadCameraShift = 0.32;
const gamepadDeadzone = 0.2;

const deadzoneNormalizer = 1 / (1 - gamepadDeadzone);
const inverseZoomFactor = 50;

window.addEventListener("keydown",event => {
    const key = event.key.toLowerCase();
    if(!keyPool[key]) {
        keyPool[key] = {
            frames: 0
        };
    }
});

const snapUp = function() {
    grid.camera.y = Math.ceil(grid.camera.y - 1);
}
const snapDown = function() {
    grid.camera.y = Math.floor(grid.camera.y + 1);
}
const snapRight = function() {
    grid.camera.x = Math.floor(grid.camera.x + 1);
}
const snapLeft = function() {
    grid.camera.x = Math.ceil(grid.camera.x - 1);
}
const snapHorizontal = function() {
    grid.camera.x = Math.ceil(grid.camera.x);
}
const snapVertical = function() {
    grid.camera.y = Math.ceil(grid.camera.y);
}

window.addEventListener("keyup",event => {

    delete keyPool[event.key.toLowerCase()];

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

function applyDeadZone(value) {
    if(value < 0) {
        value = value + gamepadDeadzone;
        if(value > 0) {
            value = 0;
        } else {
            value *= deadzoneNormalizer;
        }
    } else {
        value = value - gamepadDeadzone;
        if(value < 0) {
            value = 0;
        } else {
            value *= deadzoneNormalizer;
        }
    }
    return value;
}

const buttonStates = {
    up: false,
    down: false,
    left: false,
    right: false,
}

rendererState = (context,width,height,timestamp) => {
    grid.render(context,width,height,timestamp);

    if(activeGamepadIndex !== null && hasFocus) {
        const gamepad = navigator.getGamepads()[activeGamepadIndex];

        const upPressed = gamepad.buttons[12].pressed;
        const downPressed = gamepad.buttons[13].pressed;
        const leftPressed = gamepad.buttons[14].pressed;
        const rightPressed = gamepad.buttons[15].pressed;

        const leftTrigger = gamepad.buttons[7];

        if(leftTrigger.pressed) {
            grid.set(Math.round(grid.camera.x-1),Math.round(grid.camera.y-1),1);
        }

        if(upPressed) {
            if(!buttonStates.up) {
                snapUp();
                snapHorizontal();
                buttonStates.up = true;
            }
        } else {
            buttonStates.up = false;
        }

        if(downPressed) {
            if(!buttonStates.down) {
                snapDown();
                snapHorizontal();
                buttonStates.down = true;
            }
        } else {
            buttonStates.down = false;
        }

        if(leftPressed) {
            if(!buttonStates.left) {
                snapLeft();
                snapVertical();
                buttonStates.left = true;
            }
        } else {
            buttonStates.left = false;
        }

        if(rightPressed) {
            if(!buttonStates.right) {
                snapRight();
                snapVertical();
                buttonStates.right = true;
            }
        } else {
            buttonStates.right = false;
        }

        let leftXAxis = applyDeadZone(gamepad.axes[0]);
        let leftYAxis = applyDeadZone(gamepad.axes[1]);
        //let rightXAxis = applyDeadZone(gamepad.axes[2]);
        let rightYAxis = applyDeadZone(-gamepad.axes[3]);

        let moved = false;


        if(leftXAxis !== 0) {
            grid.camera.x += (leftXAxis * maxGamepadCameraShift) / (grid.camera.z / inverseZoomFactor);
        }

        if(leftYAxis !== 0) {
            grid.camera.y += (leftYAxis * maxGamepadCameraShift) / (grid.camera.z / inverseZoomFactor);
        }


        grid.camera.z += (rightYAxis * 2) * (grid.camera.z / inverseZoomFactor);

        if(grid.camera.z < minZoom) {
            grid.camera.z = minZoom;
        } else if(grid.camera.z > maxZoom) {
            grid.camera.z = maxZoom;
        }

        context.font = "30px Arial";
        context.fillText("lx " + leftXAxis,15,40);
        context.fillText("ly " + leftYAxis,15,80);
        //context.fillText(rightXAxis,15,120);
        context.fillText(leftTrigger.pressed,15,120);
    }

    if(mouseDown) {
        const register = grid.hitDetectionRegister;
        if(register !== null) {
            gridTapped(register.x,register.y);
        }
    }
    for(let key in keyPool) {
        keyPool[key].frames++;
        switch(key) {
            case "w":
                grid.camera.y -= gradualCameraShiftAmount / (grid.camera.z / inverseZoomFactor);
                break;
            case "s":
                grid.camera.y += gradualCameraShiftAmount / (grid.camera.z / inverseZoomFactor);
                break;
            case "a":
                grid.camera.x -= gradualCameraShiftAmount / (grid.camera.z / inverseZoomFactor);
                break;
            case "d":
                grid.camera.x += gradualCameraShiftAmount / (grid.camera.z / inverseZoomFactor);
                break;
        }
    }
}

const gamepads = {};
let activeGamepadIndex = null;

window.addEventListener("gamepadconnected", function(e) {
    if(Object.keys(gamepads).length < 1) {
        activeGamepadIndex = e.gamepad.index;
    }
    gamepads[e.gamepad.index] = e.gamepad;
    console.log(
        "Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index,
        e.gamepad.id,
        e.gamepad.buttons.length,
        e.gamepad.axes.length
    );

});

let hasFocus = document.hasFocus();
window.addEventListener("blur",()=>hasFocus=false);
window.addEventListener("focus",()=>hasFocus=true);

window.addEventListener("gamepaddisconnected", function(e) {
    const gamepadKeys = Object.keys(gamepads);

    if(activeGamepad.id === e.gamepad.id) {
        if(gamepadKeys.length <= 1) {
            activeGamepadIndex = null;
        } else {
            activeGamepadIndex = gamepads[gamepadKeys[0]].id;
        }
    }

    delete gamepads[e.gamepad.index];
    console.log(
        "Gamepad disconnected from index %d: %s",
        e.gamepad.index,
        e.gamepad.id
    );
});

window.addEventListener("resize",() => {
    grid.refold(canvas.width,canvas.height);
});

startRenderer();
