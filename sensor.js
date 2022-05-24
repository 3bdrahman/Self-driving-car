class Sensor{
    constructor(car){
        this.car = car;
        this.rayCount=5;
        // range of sensor rays
        this.rayLength=200;
        //angle that spread the rays
        this.raySpread=Math.PI/2;

        this.rays=[];
        this.readings=[];
    }
    update(roadBorders,traffic){
      this.#castRays();
      this.readings=[];
      for(let i=0; i <this.rays.length;i++){
          this.readings.push(
              this.getReading(this.rays[i],roadBorders, traffic)
          );

      }
    };
    getReading(ray,roadBorders,traffic){
        let touches=[];
        for(let i =0;i<roadBorders.length;i++){
            // this intersection methon also return the offset ( how far the rouch is from
            //the ray origin which is also the center of the car) 
            const touch=getIntersection(ray[0],ray[1], roadBorders[i][0],roadBorders[i][1]);
            if(touch){
                touches.push(touch);
            }
        }
        for(let i=0;i<traffic.length;i++){
            for(let j=0; j<traffic[i].polygon.length;j++){
                const trafficTouch = getIntersection(ray[0],ray[1],traffic[i].polygon[j], traffic[i].polygon[(j+1)%traffic[i].polygon.length]);
                if(trafficTouch){
                    touches.push(trafficTouch);
                }
            }
            
            
        }
        if(touches.length===0) return null;
        else{
                const offsets = touches.map(e=>e.offset);
                // if the ray touches more than one object we need to find the minimum which 
                // is also the closest object 
                // ... is spreading the array into values
                const minOffset= Math.min(...offsets);
                return touches.find(e => e.offset == minOffset);
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