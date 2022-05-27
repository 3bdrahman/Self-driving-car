class Car{
    constructor(x,y,width,height,controlType,maxSpeed=4, color="blue"){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.speed=0;
        this.acceleration=0.2;
        this.maxSpeed=maxSpeed;
        this.angle=0;
        this.friction=0.05;

        this.useAutoPilot = controlType=="autopilot";
        if(controlType != "dummy"){
            this.sensor=new Sensor(this);
            this.autoPilot=new NeuralNetwork(
                [this.sensor.rayCount,6,4]
            );
        }
        
        this.controls=new Controls(controlType);
        this.hit=false;
        this.img=new Image()
        this.img.src="car.png";
        this.mask=document.createElement("canvas");
        this.mask.width=width;
        this.mask.height=height;
        const maskContext=this.mask.getContext("2d");
        this.img.onload=()=>{
            maskContext.fillStyle=color,
            maskContext.rect(0,0,this.width,this.height);
            maskContext.fill();
            maskContext.globalCompositeOperation="destination-atop";
            maskContext.drawImage(this.img,0,0,this.width,this.height)
        }
    }
    update(roadBorders,traffic){
        // console.log(this.angle);
        //if the car is hit stop ie render useless
        if(!this.hit){

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
        this.hit=this.isHit(roadBorders, traffic);
        }
        if(this.sensor){
            this.sensor.update(roadBorders, traffic);
            const offsets=this.sensor.readings.map(
                s=>s==null?0:1-s.offset
            );
             const outputs=NeuralNetwork.feedForward(offsets,this.autoPilot);
            //  console.log(outputs);
             if(this.useAutoPilot){
                 this.controls.forward=outputs[0];
                 this.controls.left=outputs[1];
                 this.controls.right=outputs[2];
                 this.controls.backwards=outputs[3];
                 
             }
        }
        
    }
    isHit(roadBorders, traffic){
        for(let i=0; i<roadBorders.length;i++){
            if(plygonIntersects(this.polygon,roadBorders[i])){
                return true;
            }
        }
        for(let i=0; i<traffic.length;i++){
            if(plygonIntersects(this.polygon,traffic[i].polygon)){
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
    draw(context, color,hasSensors=false){
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
        // if(this.hit){
        //     context.fillStyle="red"
        // }else{
        //     context.fillStyle=color
        // }
        // // Now we can actually draw the polygon points 

        // context.beginPath();
        // context.moveTo(this.polygon[0].x,this.polygon[0].y);
        
        // for(let i=1;i<this.polygon.length;i++){
        //     context.lineTo(this.polygon[i].x,this.polygon[i].y);
        // }
        // context.fill();
        // add image of the car instead
        context.save();
        context.translate(this.x,this.y);
        context.rotate(-this.angle);
        if(!this.hit){
            context.drawImage(this.mask,
                -this.width/2,
                -this.height/2,
                this.width,
                this.height);
                context.globalCompositeOperation="multiply";
        }
        
            context.drawImage(this.img,
                -this.width/2,
                -this.height/2,
                this.width,
                this.height);
            context.restore();
        if(this.sensor&&hasSensors){
            this.sensor.draw(context);
        }
        
    }
}