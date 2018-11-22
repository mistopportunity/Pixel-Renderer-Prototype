function camera2d(x,y) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.reset = (x,y,z) => {
        this.x = x || this.startX;
        this.y = y || this.startY;
    }
}
function camera3d(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.startX = x;
    this.startY = y;
    this.startZ = z;
    this.reset = (x,y,z) => {
        this.x = x || this.startX;
        this.y = y || this.startY;
        this.z = z || this.startZ;
    }
}
