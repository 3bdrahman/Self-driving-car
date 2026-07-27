const CAR_IMG_SRC = "car.png";
const carImage = new Image();
carImage.src = CAR_IMG_SRC;

class Car{
    constructor(x,y,width,height,controlType,maxSpeed=0, color="blue"){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.speed=0;
        this.acceleration=0.2;
        this.maxSpeed=maxSpeed;
        this.angle=0;
        this.friction=0.05;
        this.color = color;

        this.useAutoPilot = controlType=="autopilot";
        if(controlType != "dummy"){
            this.sensor=new Sensor(this);
            this.autoPilot=new NeuralNetwork(
                [this.sensor.inputSize,6,4]
            );
        }

        this.controls=new Controls(controlType);
        this.hit=false;
    }
    update(roadBorders, traffic){
        if(!this.hit){
        if(this.controls.forward){
            this.speed+=this.acceleration;
        }
        if(this.controls.backwards){
            this.speed-=this.acceleration;
        }
        if(this.speed!=0){
            const flip=this.speed>0?1:-1;
            if(this.controls.left && this.controls.right){
            } else if(this.controls.right){
                this.angle-=0.15*flip;
            } else if(this.controls.left){
                this.angle+=0.15*flip;
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

        if(this.speed != 0 && !this.controls.left && !this.controls.right){
            if(this.angle > 0){
                this.angle = Math.max(0, this.angle - 0.02);
            } else if(this.angle < 0){
                this.angle = Math.min(0, this.angle + 0.02);
            }
        }

        this.x-=Math.sin(this.angle)*this.speed;
        this.y-=Math.cos(this.angle)*this.speed;
        this.polygon=this.createPolygon();
        this.hit=this.isHit(roadBorders, traffic);
        }
        if(this.sensor){
            this.sensor.update(roadBorders, traffic);
            const inputs = this.encodeSensorInputs(this.sensor.readings);
            const outputs=NeuralNetwork.feedForward(inputs,this.autoPilot);
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
    // 9 rays × 2 channels.
    //   channel 1 (distance): 1.0 when a ray hits something at the front of the
    //                          sensor (r.offset == 0), 0 when the ray runs the
    //                          full length without hitting anything (r == null).
    //                          Distance falls off linearly as the hit retreats.
    //   channel 2 (object kind): 1.0 = border, 0.5 = traffic, 0 = clear.
    //                            Border vs traffic matters to the brain only at
    //                            long ranges — we keep it discriminable.
    encodeSensorInputs(readings){
        const inputs = [];
        const kindMap = { border: 1.0, traffic: 0.5 };
        for(const r of readings){
            if(r === null){
                inputs.push(0, 0);
            } else {
                inputs.push(1 - r.offset, kindMap[r.type] ?? 0);
            }
        }
        return inputs;
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
    draw(context, tintColor, hasSensors = false) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(-this.angle);

        const imgReady = carImage.complete && carImage.naturalWidth > 0;
        const fillColor = this.hit ? "red" : (tintColor || this.color || "blue");

        if (imgReady) {
            context.fillStyle = fillColor;
            context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            context.save();
            context.globalCompositeOperation = "destination-atop";
            context.drawImage(carImage, -this.width / 2, -this.height / 2, this.width, this.height);
            context.restore();
        }

        context.restore();

        if (this.sensor && hasSensors) {
            this.sensor.draw(context);
        }
    }
}