const minZoom = 30;
const maxZoom = 400;
const grid = new centroidGrid(100,100,canvas.width>=canvas.height);

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
        grid.set(x0,y0,colorIndex);
        if (x0 === x1 && y0 === y1) break;
        var e2 = err;
        if (e2 > -dx) { err -= dy; x0 += sx; }
        if (e2 < dy) { err += dx; y0 += sy; }
    }
}


const gridTapped = (x,y) => {

    //const newValue = grid.get(x,y) === 1 ? null : 1;

    if(lastDrawPosition != null && mouseDown) {

        let xDistance = Math.abs(x - lastDrawPosition.x);
        let yDistance = Math.abs(y - lastDrawPosition.y);

        if(xDistance + yDistance > 1) {
            if(xDistance > 0 && yDistance < 1) {//just x
                if(x < lastDrawPosition.x) {
                    for(let i = x+1;i<lastDrawPosition.x;i++) {
                        grid.set(i,y,colorIndex);
                    }
                } else {
                    for(let i = lastDrawPosition.x-1;i<x;i++) {
                        grid.set(i,y,colorIndex);
                    }
                }
            } else if(yDistance > 0 && xDistance < 1) {//just y
                if(y < lastDrawPosition.y) {
                    for(let i = y+1;i<lastDrawPosition.y;i++) {
                        if(i < grid.height && i > -1) {
                            grid.set(x,i,colorIndex);
                        }
                    }
                } else {
                    for(let i = lastDrawPosition.y-1;i<y;i++) {
                        if(i < grid.height && i > -1) {
                            grid.set(x,i,colorIndex);
                        }
                    }
                }
            } else {
                bline(xDistance,yDistance,x,y,lastDrawPosition.x,lastDrawPosition.y);
            }
        }
    }

    grid.set(x,y,colorIndex);

    lastDrawPosition = {
        x: x,
        y: y
    };
}

canvas.addEventListener("mousedown",event => {
    console.log("mouse down");
    if(!capturingTouch && event.button === 0 && !mouseDown) {
        grid.hitDetectionX = event.clientX;
        grid.hitDetectionY = event.clientY;
        mouseDown = true;
    }
    event.preventDefault(); //This line is fucking magic okay.
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
    if(mouseDown) {
        console.log("mouse out");
        endMouseDetection();
    }
});
canvas.addEventListener("mouseup",event => {
    if(mouseDown && event.button === 0) {
        console.log("mouse up");
        endMouseDetection();
    }
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
                    grid.set(register.x,register.y,colorIndex);
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
    validateYPos();
}
const snapDown = function() {
    grid.camera.y = Math.floor(grid.camera.y + 1);
    validateYPos();
}
const snapRight = function() {
    grid.camera.x = Math.floor(grid.camera.x + 1);
    validateXPos();
}
const snapLeft = function() {
    grid.camera.x = Math.ceil(grid.camera.x - 1);
    validateXPos();
}
const snapHorizontal = function() {
    grid.camera.x = Math.ceil(grid.camera.x);
    validateXPos();
}
const snapVertical = function() {
    grid.camera.y = Math.ceil(grid.camera.y);
    validateYPos();
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

const buttonStates = {}

const processButton = (name,action,button) => {
    if(button.pressed) {
        if(!buttonStates[name]) {
            action();
            buttonStates[name] = true;
        }
    } else {
        buttonStates[name] = false;
    }
};

rendererState = (context,width,height,timestamp) => {
    grid.render(context,width,height,timestamp);

    if(activeGamepadIndex !== null && hasFocus) {
        const gamepad = navigator.getGamepads()[activeGamepadIndex];

        if(gamepad !== null && gamepad.connected) {

            const rightTrigger = gamepad.buttons[7];
            if(rightTrigger.pressed || gamepad.buttons[0].pressed) {
                let xWithMask = Math.round(grid.camera.x-1);
                let yWithMask = Math.round(grid.camera.y-1);
                if(xWithMask < 0) {
                    xWithMask += grid.width;
                } else {
                    xWithMask = xWithMask % grid.width;//this can't happen?
                }
                if(yWithMask < 0) {
                    yWithMask += grid.height;
                } else {
                    yWithMask = yWithMask % grid.height;
                }
                grid.set(xWithMask,yWithMask,colorIndex);
            }

            processButton("up",()=>{
                snapUp();
                snapHorizontal();
            },gamepad.buttons[12]);

            processButton("down",()=>{
                snapDown();
                snapHorizontal();
            },gamepad.buttons[13]);
    
            processButton("left",()=>{
                snapLeft();
                snapVertical();
            },gamepad.buttons[14]);
    
            processButton("right",()=>{
                snapRight();
                snapVertical();
            },gamepad.buttons[15]);

            processButton("leftBumper",()=>{
                palleteShift(-1);
            },gamepad.buttons[4]);

            processButton("rightBumper",()=>{
                palleteShift(1);
            },gamepad.buttons[5]);

    
            let leftXAxis = applyDeadZone(gamepad.axes[0]);
            let leftYAxis = applyDeadZone(gamepad.axes[1]);
            //let rightXAxis = applyDeadZone(gamepad.axes[2]);
            let rightYAxis = applyDeadZone(-gamepad.axes[3]);
    
            const scale = Math.floor(grid.camera.z);
    
            if(leftXAxis !== 0) {
                grid.camera.x += (leftXAxis * maxGamepadCameraShift) / (scale / inverseZoomFactor);
                validateXPos();
            }
    
            if(leftYAxis !== 0) {
                grid.camera.y += (leftYAxis * maxGamepadCameraShift) / (scale / inverseZoomFactor);
                validateYPos();
            }
    
            grid.camera.z += (rightYAxis * 2) * (grid.camera.z / inverseZoomFactor);
    
            validateZoomChange();
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
        validateXPos();
        validateYPos();
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
                validateYPos();
                break;
            case "s":
                grid.camera.y += gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                validateYPos();
                break;
            case "a":
                grid.camera.x -= gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                validateXPos();
                break;
            case "d":
                grid.camera.x += gradualCameraShiftAmount / (Math.floor(grid.camera.z) / inverseZoomFactor);
                validateXPos();
                break;
        }
    }
    grid.camera.z = Number(zoomInput.value);

    //console.log(`X: ${grid.camera.x}, Y: ${grid.camera.y}`);
    if(mouseDown) {
        console.log(`last draw X: ${lastDrawPosition.x}, Y: ${lastDrawPosition.y}`);
        console.log(`X: ${grid.hitDetectionRegister.x}, Y: ${grid.hitDetectionRegister.y}`);
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

let colorIndex = 0;
const colorSet = [
    "Red","Maroon","Yellow",
    "Olive","Lime","Green",
    "Aqua","Teal","Blue",
    "Navy","Fuchsia","Purple",
    "White","Darkgray","Black"
];

grid.colorForValue = value => {
    if(value === undefined) {
        return "Black";
    }
    return colorSet[value];
}

const pallete = document.getElementById("pallete");

const palleteShift = delta => {
    colorIndex += delta;
    if(colorIndex > colorSet.length-1) {
        colorIndex = 0;
    } else if(colorIndex < 0) {
        colorIndex = colorSet.length - 1;
    }

    const left = pallete.children[0];
    const center = pallete.children[1];
    const right = pallete.children[2];

    let leftIndex = colorIndex - 1;
    if(leftIndex < 0) {
        leftIndex = colorSet.length-1;
    }

    let rightIndex = colorIndex + 1;
    if(rightIndex > colorSet.length-1) {
        rightIndex = 0;
    }

    left.style.backgroundColor = colorSet[leftIndex];
    center.style.backgroundColor = colorSet[colorIndex];
    right.style.backgroundColor = colorSet[rightIndex];

    let centralColor = colorSet[colorIndex];

    if(centralColor === "Black") {
        pallete.style.outlineColor = "White";
        pallete.style.backgroundColor = "White";
    } else {
        pallete.style.outlineColor = centralColor;
        pallete.style.backgroundColor = "Black";
    }

};

let hasFocus = document.hasFocus();
window.addEventListener("blur",()=>hasFocus=false);
window.addEventListener("focus",()=>hasFocus=true);

window.addEventListener("resize",() => {
    grid.refold(canvas.width,canvas.height);
});



const validateXPos = () => {
    if(grid.camera.x < 0) {
        grid.camera.x += grid.width;
    } else {
        grid.camera.x = grid.camera.x % grid.width;
    }
}
const validateYPos = () => {
    if(grid.camera.y < 0) {
        grid.camera.y += grid.height;
    } else {
        grid.camera.y = grid.camera.y % grid.height;
    }
}

grid.camera.x = Math.floor(grid.width / 2);
grid.camera.y = Math.floor(grid.height / 2);
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

grid.set(0,0,colorSet.indexOf("White"));

validateZoomChange();
validateXPos();
validateYPos();

palleteShift(0);

startRenderer();
