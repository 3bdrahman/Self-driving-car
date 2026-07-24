class Road{
	constructor(x,width,numLanes=3){
		this.x=x;
		this.width=width;
		this.numLanes = numLanes;
		this.left = x-width/2;
		this.right=x+width/2;
		const inf = 1000000;
		this.top=-inf;
		// Finite horizon so the demo has a visible end rather than marching
		// forever into the void. Generations long enough to reach this
		// ceiling can still be measured against it — the elite is whichever
		// car reaches (or beats) this distance, not a numerical infinity.
		this.bottom = -12000;
		const topLeft={x:this.left, y:this.top};
		const topRight={x:this.right, y:this.top};
		const bottomLeft={x:this.left, y:this.bottom};
		const bottomRight={x:this.right, y:this.bottom};
		this.borders=[
			[topLeft,bottomLeft],
			[topRight,bottomRight]
		];

		this.laneDividers = [];
		for (let i = 1; i <= this.numLanes - 1; i++) {
			const x = lerp(this.left, this.right, i / this.numLanes);
			this.laneDividers.push([{x, y: this.top}, {x, y: this.bottom}]);
		}

		this.laneWidth = this.width / this.numLanes;
	}
    getLaneCenter(LaneIndex){
        const laneWidth=this.width/this.numLanes;
        return this.left + laneWidth/2 + Math.min(LaneIndex, this.numLanes-1)  * laneWidth;
    }
    draw(context){
        context.lineWidth=5;
        context.strokeStyle="white";
        //drawing traffic lanes
        for(let i=1; i<=this.numLanes-1;i++){
            const x=lerp(
                this.left,
                this.right,
                i/this.numLanes
            );
                //if it's mid lanes make it dashed 
       
            context.setLineDash([20,20]);
        
        // drawing the lines
        context.beginPath();
        context.moveTo(x, this.top);
        context.lineTo(x, this.bottom);
        context.stroke()
    }
    context.setLineDash([]);
    this.borders.forEach(border =>{
        context.beginPath();
        context.moveTo(border[0].x, border[0].y);
        context.lineTo(border[1].x, border[1].y)
        context.stroke();
    });
      
    }
}
