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

function centroidGrid(width,height,isLandscape) {
    this.width = width;
    this.height = height;

    this.isLandscape = isLandscape; //Used for the potential bouncing around of window sizing and single trigger watching
    this.renderingInLandscape = isLandscape; //The actual value to be used by matrices and the renderer

    this.dataAccessorMatrix = (x,y) => {
        return this.renderingInLandscape ? [y,x] : [x,y];
    };

    this.data = (matrix => {
        return createGrid(matrix[0],matrix[1]);
    })(this.dataAccessorMatrix(width,height));

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
        return this.data[matrix[0],matrix[1]];
    };

    this.set = (x,y,value) => {
        const matrix = this.dataAccessorMatrix(x,y);
        return this.data[matrix[0],matrix[1]] = value;
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

        xOffset = xOffset - x - 0.5;
        yOffset = yOffset - y - 0.5;

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
        const startRow = dataStartY - 1;
        const startColumn = dataStartX - 1;

        if(horizontalPixels % 2 !== 0) {
            centerXOffset += scale / 2;
        }
        if(verticalPixels % 2 !== 0) {
            centerYOffset += scale / 2;
        }

        
        let verticalScaleAdjust = 0;
        let horizontalScaleAdjust = 0;

        const dataBinderX = dataStartX + xOffset;
        const dataBinderY = dataStartY + yOffset;

        let scaledDataBinder = dataBinderX * scale;

        if(Math.floor(scaledDataBinder) - scaledDataBinder !== 0) {
            horizontalScaleAdjust++;
        }

        scaledDataBinder = dataBinderY * scale;

        if(Math.floor(scaledDataBinder) - scaledDataBinder !== 0) {
            verticalScaleAdjust++;
        }       

        const innerDrawLogic = function(rowIndex,columnIndex,value) {

            if(columnIndex === 0 && rowIndex === 0) {
                context.fillStyle = "Yellow";
            } else {
                context.fillStyle = "Red";
            }

            
            let posX = (columnIndex - dataStartX + xOffset) * scale;
            let posY = (rowIndex - dataStartY + yOffset) * scale;

            posX += centerXOffset;
            posY += centerYOffset;

            context.fillRect(
                posX,
                posY,
                scale + horizontalScaleAdjust,
                scale + verticalScaleAdjust
            );
        }

        if(this.renderingInLandscape) {
            //get rows by Y, then use columns by X
            const verticalUpperbound = this.data.length;
            for(let rowIndex = startRow;rowIndex < endRow;rowIndex++) {
                if(rowIndex > -1 && rowIndex < verticalUpperbound) {
                    const row = this.data[rowIndex];
                    const horizontalUpperbound = row.length;
                    for(let columnIndex = startColumn;columnIndex < endColumn;columnIndex++) { 
                        if(columnIndex > - 1 && columnIndex < horizontalUpperbound) {
                            const value = row[columnIndex];
                            innerDrawLogic(rowIndex,columnIndex,value);

                        }

                    }
                }
            }




        } else {
            //get columns by X, then use rows by Y
            const horizontalUpperbound = this.data.length;
            for(let columnIndex = startColumn;columnIndex < endColumn;columnIndex++) {
                if(columnIndex > -1 && columnIndex < horizontalUpperbound) {
                    const column = this.data[columnIndex];
                    const verticalUpperbound = column.length;
                    for(let rowIndex = startRow;rowIndex < endRow;rowIndex++) {
                        if(rowIndex > -1 && rowIndex < verticalUpperbound) {
                            const value = column[rowIndex];
                            innerDrawLogic(rowIndex,columnIndex,value);

                        }
                    }
                }
            }
        }


        context.fillStyle = "Black";
        context.fillRect(width/2-scale/4,height/2-scale/4,scale/2,scale/2);

    };
    
    console.log(`Data starting in ${isLandscape ? "landscape" : "portrait"} mode`);
}
