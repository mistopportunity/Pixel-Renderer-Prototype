function createGrid(dimension1,dimension2) {

    const dimension1Array = new Array(
        dimension1
    );
    for(let i = 0;i < dimension1Array.length;i++) {
        dimension1Array[i] = new Array(
            dimension2
        );
    }
    return dimension1Array;   
}

function centroidGrid(width,height,isLandscape,data) {
    this.width = width;
    this.height = height;

    this.isLandscape = isLandscape; //Used for the potential bouncing around of window sizing and single trigger watching
    this.renderingInLandscape = isLandscape; //The actual value to be used by matrices and the renderer

    this.dataAccessorMatrix = (x,y) => {
        return this.renderingInLandscape ? [y,x] : [x,y];
    };

    if(!data) {
        this.data = (matrix => {
            return createGrid(matrix[0],matrix[1]);
        })(this.dataAccessorMatrix(width,height));
    } else {
        this.data = data;
    }

    this.refoldTimeout;
    this.refoldDelay = 300;

    this.forceLandscape = () => {

        const newGrid = createGrid(this.width,this.height);

        for(let x = 0;x<this.width;x++) {
            for(let y = 0;y<this.height;y++) {
                newGrid[x][y] = this.data[y][x];
            }
        }

        this.renderingInLandscape = true;
        this.data = newGrid;


        console.log("Refolded data into landscape mode");
    };
    this.forcePortrait = () => {

        const newGrid = createGrid(this.height,this.width);

        for(let x = 0;x<this.width;x++) {
            for(let y = 0;y<this.height;y++) {
                newGrid[y][x] = this.data[x][y];
            }
        }

        this.renderingInLandscape = false;
        this.data = newGrid;


        console.log("Refolded data into portrait mode");
    };

    //Call refold with a window resizing method. This method does not resize the canvas.
    this.refold = (width,height) => {
        const greaterWidth = width >= height;

        if(greaterWidth && !this.isLandscape) {
            clearTimeout(this.refoldTimeout);
            this.refoldTimeout = setTimeout(
                this.forceLandscape,
                this.refoldDelay
            );
        }

        if(!greaterWidth && this.isLandscape) {
            clearTimeout(this.refoldTimeout);
            this.refoldTimeout = setTimeout(
                this.forcePortrait,
                this.refoldDelay
            );
        }


        this.isLandscape = greaterWidth;
    }

    //Only use these gets and sets outside of this context. There are far to slow. Their intent is data manipulation.
    this.get = (x,y) => {
        const matrix = this.dataAccessorMatrix(x,y);
        return this.data[matrix[0]][matrix[1]];
    };

    this.set = (x,y,value) => {
        const matrix = this.dataAccessorMatrix(x,y);
        this.data[matrix[0]][matrix[1]] = value;
    }

    this.camera = new camera3d(
        width / 2, //X: set to horizontal center
        height / 2, //Y: set to vertical center
        1 //Z: set to scale of 1:1 pixel ratio
    );

    this.render = (context,width,height) => {

        context.clearRect(0,0,width,height);

        //use camera.x, camera.y, camera.z, data, and renderingInLandscape

        //Instead of double lookups with JavaScript's 2d arrays,
        //we can use renderingInLandscape to know the orientation -
        //and therefore as well that our data accesses' polarities - should shift

        let scale = Math.floor(this.camera.z);
        
        let xOffset = this.camera.x;
        let yOffset = this.camera.y;

        const x = Math.floor(xOffset);
        const y = Math.floor(yOffset);


        xOffset = (1-(xOffset - x)) - 0.5;
        yOffset = (1-(yOffset - y)) - 0.5;

        let horizontalPixels = Math.floor(width / scale);
        let verticalPixels = Math.floor(height / scale);


        let centerXOffset = Math.floor((width - (scale * horizontalPixels)) / 2);
        let centerYOffset = Math.floor((height - (scale * verticalPixels)) / 2);



        const halfWidth = Math.floor(horizontalPixels / 2);
        const dataStartX = x - halfWidth;
        const dataEndX = x + halfWidth;


        const halfHeight = Math.floor(verticalPixels / 2);
        const dataStartY = y - halfHeight;
        const dataEndY = y + halfHeight;

        const endRow = dataEndY + 2;
        const endColumn = dataEndX + 2;
        const startRow = dataStartY - 2;
        const startColumn = dataStartX - 2;

        if(horizontalPixels % 2 !== 0) {
            centerXOffset += scale / 2;
        }
        if(verticalPixels % 2 !== 0) {
            centerYOffset += scale / 2;
        }

        
        let verticalScale = scale;
        let horizontalScale = scale;

        let scaledDataBinder = dataStartX + xOffset;
        if(Math.floor(scaledDataBinder) - scaledDataBinder !== 0) {
            verticalScale++;
            horizontalScale++;
        } else {
            scaledDataBinder = dataStartY + yOffset;
            if(Math.floor(scaledDataBinder) - scaledDataBinder !== 0) {
                verticalScale++;
                horizontalScale++;
            }
        }


        const hitDetectionX = this.hitDetectionX;
        const hitDetectionY = this.hitDetectionY;
        let hitDetectionRegister = (hitDetectionX < 0 || hitDetectionY < 0 || hitDetectionX > width || hitDetectionY > height) ? null : -1

        const innerDrawLogic = function(rowIndex,columnIndex,color,rowValue,columnValue) {

            context.fillStyle = color;

            const posX = ((columnIndex - dataStartX + xOffset) * scale) + centerXOffset;
            const posY = ((rowIndex - dataStartY + yOffset) * scale) + centerYOffset;

            if(hitDetectionRegister === -1) {
                const meetsX = hitDetectionX >= posX && hitDetectionX <= posX + horizontalScale;
                if(meetsX) {
                const meetsY = hitDetectionY >= posY && hitDetectionY <= posY + verticalScale;
                if(meetsY) {
                    hitDetectionRegister = {
                        x: columnValue,
                        y: rowValue,
                        //subX: (hitDetectionX - posX) / horizontalScale,
                       // subY: (hitDetectionY - posY) / verticalScale
                    }
                }}
            }

            context.fillRect(
                posX,
                posY,
                horizontalScale,
                verticalScale
            );
        }

        if(this.renderingInLandscape) {
            //get rows by Y, then use columns by X
            const verticalUpperbound = this.data.length;
            for(let rowIndex = startRow;rowIndex < endRow;rowIndex++) {

                let row;
                let rowValue = rowIndex;
                if(rowIndex < 0) {

                    rowValue = verticalUpperbound + rowIndex;

                } else if(rowIndex > verticalUpperbound - 1) {

                    rowValue = rowIndex - verticalUpperbound;
                }

                row = this.data[rowValue];

                const horizontalUpperbound = row.length;
                for(let columnIndex = startColumn;columnIndex < endColumn;columnIndex++) {

                    let columnValue = columnIndex;
                    if(columnIndex < 0) {
                        columnValue = horizontalUpperbound + columnIndex;
                    } else if(columnIndex > horizontalUpperbound - 1) {
                        columnValue = columnIndex - horizontalUpperbound;
                    }

                    const color = this.colorForValue(row[columnValue]);
                    innerDrawLogic(rowIndex,columnIndex,color,rowValue,columnValue);

                }

            }




        } else {
            //get columns by X, then use rows by Y
            const horizontalUpperbound = this.data.length;
            for(let columnIndex = startColumn;columnIndex < endColumn;columnIndex++) {

                let column;
                let columnValue = columnIndex;
                if(columnIndex < 0) {

                    columnValue = horizontalUpperbound + columnIndex;

                } else if(columnIndex > horizontalUpperbound - 1) {

                    columnValue = columnIndex - horizontalUpperbound;

                }
                column = this.data[columnValue];

                const verticalUpperbound = column.length;
                for(let rowIndex = startRow;rowIndex < endRow;rowIndex++) {

                    let rowValue = rowIndex;
                    if(rowIndex < 0) {
                        rowValue = verticalUpperbound + rowIndex;
                    } else if(rowIndex > verticalUpperbound - 1) {
                        rowValue = rowIndex - verticalUpperbound;
                    }

                    const color = this.colorForValue(column[rowValue]);
                    innerDrawLogic(rowIndex,columnIndex,color,rowValue,columnValue);

                }

            }
        }

        context.globalCompositeOperation = "difference";
        context.fillStyle = "white";
        context.fillRect(width/2-scale/4,height/2-scale/4,scale/2,scale/2);

        context.globalCompositeOperation = "source-over";

        this.hitDetectionRegister = hitDetectionRegister === -1 ? null : hitDetectionRegister;

    };


    this.colorForValue = value => {
        if(!value) {
            return "black";
        } else {
            return "darkgray";
        }
    };

    this.hitDetectionX = -1;
    this.hitDetectionY = -1;

    this.hitDetectionRegister = null;

    
    console.log(`Data starting in ${isLandscape ? "landscape" : "portrait"} mode`);
}
