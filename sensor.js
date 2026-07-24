class Sensor{
    constructor(car){
        this.car = car;
        this.rayCount=9;
        this.rayLength=300;
        this.raySpread=Math.PI * 0.75;
        // 9 rays × 2 channels (distance + object kind) = 18 inputs
        this.inputSize = this.rayCount * 2;

        this.rays=[];
        this.readings=[];
    }
    update(roadBorders, traffic){
      this.#castRays();
      this.readings=[];
      for(let i=0; i <this.rays.length;i++){
          this.readings.push(
              this.getReading(this.rays[i], roadBorders, traffic)
          );

      }
    };
    getReading(ray, roadBorders, traffic){
        let touches=[];
        for(let i =0;i<roadBorders.length;i++){
            // Intersection returns offset = how far along the ray the hit is.
            const touch=getIntersection(ray[0], ray[1], roadBorders[i][0], roadBorders[i][1]);
            if(touch){
                touches.push({...touch, type: 'border'});
            }
        }
        for(let i=0;i<traffic.length;i++){
            for(let j=0; j<traffic[i].polygon.length;j++){
                const trafficTouch = getIntersection(ray[0],ray[1],traffic[i].polygon[j], traffic[i].polygon[(j+1)%traffic[i].polygon.length]);
                if(trafficTouch){
                    touches.push({...trafficTouch, type: 'traffic'});
                }
            }
        }
        // Lane dividers are deliberately not sensed: they are cosmetic stripes,
        // not walls. Detecting them before the fix caused the brain to learn
        // "brake when something is close" and crash into anything, including
        // its own lane stripe.
        if(touches.length===0) return null;
        else{
                const offsets = touches.map(e=>e.offset);
                const minOffset= Math.min(...offsets);
                const hit = touches.find(e => e.offset == minOffset);
                return { x: hit.x, y: hit.y, offset: hit.offset, type: hit.type };
        }
    }
    #castRays(){
        this.rays=[];
        for(let i=0; i<this.rayCount;i++){
            const rayAngle=lerp(
                this.raySpread/2,
                -this.raySpread/2,
                i/(this.rayCount-1)
            )+this.car.angle;
            const start={x:this.car.x, y:this.car.y};
            const end={
                //horizontal compnent formula
                // minus because going up in coordniation is less x value
                x:this.car.x - Math.sin(rayAngle) * this.rayLength,
                y: this.car.y - Math.cos(rayAngle)*this.rayLength

            };
            this.rays.push([start,end]);
        }
    //   console.log(this.rays)
    }
    draw(context) {
        
        for(let i=0;i<this.rayCount;i++){
            let end=this.rays[i][1];
            // if there's a reading for the ray i 

            if(this.readings[i]){
                end = this.readings[i];
            }
            context.beginPath();
            context.lineWidth=2;
            context.strokeStyle="yellow";
            context.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            context.lineTo(end.x, end.y);
            context.stroke();

            context.beginPath();
            context.lineWidth=2;
            context.strokeStyle="black";
            context.moveTo(this.rays[i][1].x, this.rays[i][1].y);
            context.lineTo(end.x, end.y);
            context.stroke();
        }
    };
}