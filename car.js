class Car{
    constructor(x,y,width,height){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.speed=0;
        this.acceleration=0.2;
        this.maxSpeed=4;
        this.angle=0;
        this.friction=0.05;
        this.sensor=new Sensor(this);
        this.controls=new Controls();
        this.hit=false;
    }
    update(roadBorders){
        console.log(this.angle);
        // car Physics
        // negative speed just denotes moving backwards
        if(this.controls.forward){
            //speed will increase by the acceleration
            this.speed+=this.acceleration;
        }
        if(this.controls.backwards){
            //speed will decrease by the acceleration
            this.speed-=this.acceleration;
        }
        if(this.speed!=0){
            //if we going forward the angle* 1 is the same
            // if we are going in reverse then we need to do angle * -1
            const flip=this.speed>0?1:-1;
            if(this.controls.right){
                // think of it as a unit circle that's rotated 90 deg 
                //decrease angle
                this.angle-=0.03*flip;
            }
            if(this.controls.left){
                // increase the angle
                this.angle+=0.03*flip;
            }
        }
        
        if(this.speed > this.maxSpeed){
            this.speed=this.maxSpeed;
        }
        if(this.speed <-this.maxSpeed/2){
            this.speed=-this.maxSpeed/2;
        }
        if(this.speed >0){
            this.speed-=this.friction;
        }if(this.speed <0){
            this.speed += this.friction;
        }
        if(Math.abs(this.speed) < this.friction){
            this.speed=0;
        }
        this.x-=Math.sin(this.angle)*this.speed;
        
        this.y-=Math.cos(this.angle)*this.speed;
        this.polygon=this.createPolygon();
        this.hit=this.isHit(roadBorders);
        this.sensor.update(roadBorders);
    }
    isHit(roadBorders){
        for(let i=0; i<roadBorders.length;i++){
            if(plygonIntersects(this.polygon,roadBorders[i])){
                return true;
            }
        }
        return false;
    }
    // finding the edge points of the car
    createPolygon(){
        const points=[];
        const rad = Math.hypot(this.width,this.height)/2;
        const theta= Math.atan2(this.width,this.height);
        points.push({
            // top-right point
            x: this.x-Math.sin(this.angle-theta)*rad,
            y: this.y-Math.cos(this.angle-theta)*rad,
        });
        points.push({
            
            x: this.x-Math.sin(this.angle+theta)*rad,
            y: this.y-Math.cos(this.angle+theta)*rad,
        });
        points.push({
            
            x: this.x-Math.sin(Math.PI+this.angle-theta)*rad,
            y: this.y-Math.cos(Math.PI+this.angle-theta)*rad,
        });
        points.push({
            
            x: this.x-Math.sin(Math.PI+this.angle+theta)*rad,
            y: this.y-Math.cos(Math.PI+this.angle+theta)*rad,
        });

        return points;
    }
    draw(context){
        // context.save()
        // context.translate(this.x, this.y);
        // context.rotate(-this.angle);
        // context.beginPath();
        // context.rect(
        //     -this.width/2,
        //     -this.height/2,
        //     this.width,
        //     this.height
        // );
        
        // context.fill();
        // context.restore();
        //if the car is hit it will be red in color
        if(this.hit){
            context.fillStyle="red"
        }else{
            context.fillStyle="black"
        }
        // Now we can actually draw the polygon points 

        context.beginPath();
        context.moveTo(this.polygon[0].x,this.polygon[0].y);
        
        for(let i=1;i<this.polygon.length;i++){
            context.lineTo(this.polygon[i].x,this.polygon[i].y);
        }
        context.fill();
        
        this.sensor.draw(context);
        
    }
}