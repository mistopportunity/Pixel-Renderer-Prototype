const minZoom = 30;
const maxZoom = 400;
const grid = new centroidGrid(2000,2000,canvas.width>=canvas.height);

let lastDrawPosition = null;
let mouseDown = false;

const gradualCameraShiftAmount = 0.22;
const maxGamepadCameraShift = 0.32;
const gamepadDeadzone = 0.2;
const deadzoneNormalizer = 1 / (1 - gamepadDeadzone);
const touchDeadZone = 4;

const inverseZoomFactor = 50;

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
    console.log("mouse down");
    if(!capturingTouch) {
        grid.hitDetectionX = event.clientX;
        grid.hitDetectionY = event.clientY;
        mouseDown = true;
    }
});

canvas.addEventListener("mousemove",event => {
    console.log("mouse move");
    if(!capturingTouch && mouseDown) {
        grid.hitDetectionX = event.clientX;
        grid.hitDetectionY = event.clientY;
    }
});

const endMouseDetection = function() {
    mouseDown = false;
    if(!capturingTouch) {
        grid.hitDetectionX = -1;
        lastDrawPosition = null;
    }
}
canvas.addEventListener("mouseout",event => {
    console.log("mouse out");
    endMouseDetection();
});
canvas.addEventListener("mouseup",event => {
    console.log("mouse up");
    endMouseDetection();
});

canvas.addEventListener("wheel",event => {
    grid.camera.z -= (event.deltaY / 10) * (grid.camera.z / inverseZoomFactor);
    validateZoomChange();
});

const keyPool = {};
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

let capturingTouch = false;
let zoomTouch = null;

let touchMoved = null;
let cameraStart = null;

canvas.addEventListener("touchstart",event => {
    if(!capturingTouch && !mouseDown) {
        capturingTouch = true;

        console.log("Single touch started");

        const touch = event.touches[0];
    
        grid.hitDetectionX = touch.clientX;
        grid.hitDetectionY = touch.clientY;

        cameraStart = {
            x: grid.camera.x,
            y: grid.camera.y
        };
    }
    event.preventDefault();
});
canvas.addEventListener("touchmove",event => {
    if(capturingTouch) {
       //console.log("captured touch move");
        if(zoomTouch === null || event.touches.length < 2) {

            if(event.touches.length > 1) {

               
                
                console.log("Multiple touch advance");

                const touch1 = event.touches[0];
                const touch2 = event.touches[1];

                const xDifference = Math.abs(touch1.clientX - touch2.clientX);
                const yDifference = Math.abs(touch1.clientY - touch2.clientY);


                zoomTouch = {
                    cameraZStart: grid.camera.z,
                    startDistance: xDifference + yDifference,

                    x1: touch1.clientX,
                    y1: touch1.clientY,
                    x2: touch2.clientX,
                    y2: touch2.clientY,
                }
            } else {



                const touch = event.touches[0];
                if(touchMoved !== null) {
                    touchMoved.x = touch.clientX;
                    touchMoved.y = touch.clientY;
                } else {
                    const xDifference = Math.abs(grid.hitDetectionX - touch.clientX);
                    const yDifference = Math.abs(grid.hitDetectionY - touch.clientY);
                    if(xDifference + yDifference >= touchDeadZone) {
                        touchMoved = {
                            x: touch.clientX,
                            y: touch.clientY
                        }            
                    }
                }
            }
        } else {
            
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            zoomTouch.x1 = touch1.clientX;
            zoomTouch.y1 = touch1.clientY;

            zoomTouch.x2 = touch2.clientX;
            zoomTouch.y2 = touch2.clientY;

            //console.log(zoomTouch);
        }

    }
    event.preventDefault();
});

const endTouch = function() {
    console.log("Touch nuke event");
    capturingTouch = false;
    touchMoved = null;
    grid.hitDetectionX = -1;
    cameraStart = null;
    zoomTouch = null;
}

canvas.addEventListener("touchcancel",function(event) {
    //console.log("touch cancel");
    endTouch();
    event.preventDefault();
});
canvas.addEventListener("touchend",function(event) {
    //console.log("touch end");
    if(capturingTouch) {

        console.log("Zoom mode: " + (zoomTouch !== null));
        console.log("t moved: " + (touchMoved !== null));
        if(zoomTouch === null) {
            if(!touchMoved) {
                const register = grid.hitDetectionRegister;
                if(register) {
                    grid.set(register.x,register.y,1);
                }
            }
            endTouch();
        } else {
            zoomTouch = null;
            console.log("Zoom touch deadvanced through touch end deduction");
            const touch = event.touches[0];
    
            grid.hitDetectionX = touch.clientX;
            grid.hitDetectionY = touch.clientY;
            cameraStart = {
                x: grid.camera.x,
                y: grid.camera.y
            };

            touchMoved = {
                x: touch.clientX,
                y: touch.clientY
            } 
        }

    }
    event.preventDefault();
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

        if(gamepad !== null && gamepad.connected) {
            const upPressed = gamepad.buttons[12].pressed;
            const downPressed = gamepad.buttons[13].pressed;
            const leftPressed = gamepad.buttons[14].pressed;
            const rightPressed = gamepad.buttons[15].pressed;
    
            const leftTrigger = gamepad.buttons[7];
    
            if(leftTrigger.pressed || gamepad.buttons[0].pressed) {
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
    
            const scale = Math.floor(grid.camera.z);
    
            if(leftXAxis !== 0) {
                grid.camera.x += (leftXAxis * maxGamepadCameraShift) / (scale / inverseZoomFactor);
            }
    
            if(leftYAxis !== 0) {
                grid.camera.y += (leftYAxis * maxGamepadCameraShift) / (scale / inverseZoomFactor);
            }
    
            grid.camera.z += (rightYAxis * 2) * (grid.camera.z / inverseZoomFactor);
    
            validateZoomChange();

            context.font = "30px Arial";
            context.fillText("lx " + leftXAxis,15,40);
            context.fillText("ly " + leftYAxis,15,80);
            //context.fillText(rightXAxis,15,120);
            context.fillText(leftTrigger.pressed,15,120);
        }
    }

    if(zoomTouch !== null) {
        const xDifference = Math.abs(zoomTouch.x1 - zoomTouch.x2);
        const yDifference = Math.abs(zoomTouch.y1 - zoomTouch.y2);

        const delta = (xDifference + yDifference) - zoomTouch.startDistance;
        grid.camera.z = zoomTouch.cameraZStart + (delta / 2);
        
        validateZoomChange();
        //todo
    } else if(touchMoved !== null) {
        const scale = Math.floor(grid.camera.z);
        const xDifference = (grid.hitDetectionX - touchMoved.x) / scale;
        const yDifference = (grid.hitDetectionY - touchMoved.y) / scale;
        grid.camera.x = cameraStart.x + xDifference;
        grid.camera.y = cameraStart.y + yDifference;
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
                grid.camera.y -= gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                break;
            case "s":
                grid.camera.y += gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                break;
            case "a":
                grid.camera.x -= gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                break;
            case "d":
                grid.camera.x += gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                break;
        }
    }
    grid.camera.z = Number(zoomInput.value);
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

window.addEventListener("gamepaddisconnected", function(e) {
    const gamepadKeys = Object.keys(gamepads);

    if(activeGamepadIndex === e.gamepad.id) {
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


let hasFocus = document.hasFocus();
window.addEventListener("blur",()=>hasFocus=false);
window.addEventListener("focus",()=>hasFocus=true);

window.addEventListener("resize",() => {
    grid.refold(canvas.width,canvas.height);
});

grid.camera.x = Math.floor(grid.width / 2) + 1;
grid.camera.y = Math.floor(grid.height / 2) + 1;
grid.camera.z = canvas.width / 50;

const zoomInput = document.getElementById("zoomInput");
zoomInput.min = minZoom;
zoomInput.max = maxZoom;
zoomInput.disabled = true;

const validateZoomChange = function() {
    if(grid.camera.z > maxZoom) {
        grid.camera.z = maxZoom;
    }
    if(grid.camera.z < minZoom) {
        grid.camera.z = minZoom;
    }
    zoomInput.value = grid.camera.z;
}

validateZoomChange();

startRenderer();
