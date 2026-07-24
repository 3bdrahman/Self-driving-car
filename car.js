// Module-level image, imagePromise and tinted-mask cache.
//
// We were previously building a maskCanvas per Car (300 cars = 300 canvases
// in the DOM) and registering img.onload per Car (300 stale callbacks for
// the same image). Now: one image load, one canvas per unique (color, w, h).
const CAR_IMG_SRC = "car.png";
const carImage = new Image();
carImage.src = CAR_IMG_SRC;
const carImageReady = new Promise((resolve, reject) => {
    carImage.onload = () => resolve(carImage);
    carImage.onerror = (err) => reject(err);
});
const carMaskCache = new Map();

function buildCarMask(color, width, height) {
    const key = `${color}|${width}x${height}`;
    const cached = carMaskCache.get(key);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.rect(0, 0, width, height);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-atop";
    ctx.drawImage(carImage, 0, 0, width, height);
    carMaskCache.set(key, canvas);
    return canvas;
}

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
            // 9 rays * 2 (distance + type) = 18 inputs
            this.autoPilot=new NeuralNetwork(
                [this.sensor.inputSize,6,4]
            );
        }

        this.controls=new Controls(controlType);
        this.hit=false;
        // If the image is already loaded, build the mask synchronously; if
        // not, queue an async build and fall back to the raw image until
        // it's done. Either way, the vehicle renders from frame 1.
        if (carImage.complete && carImage.naturalWidth > 0) {
            this.mask = buildCarMask(color, width, height);
        } else {
            this.mask = null;
            carImageReady.then(() => { this.mask = buildCarMask(color, width, height); });
        }
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
        if(!this.hit && this.mask){
            // Tinted mask: solid color rectangle with alpha = car.png silhouette.
            context.drawImage(this.mask,
                -this.width/2,
                -this.height/2,
                this.width,
                this.height);
            context.globalCompositeOperation="multiply";
        }

        // Base car image (untinted). Drawn even when this.mask is null (car
        // collides with another before mask finishes caching) so the demo
        // never renders an invisible car.
        if (carImage.complete && carImage.naturalWidth > 0) {
            context.drawImage(carImage,
                -this.width/2,
                -this.height/2,
                this.width,
                this.height);
        }
        context.restore();
        if(this.sensor&&hasSensors){
            this.sensor.draw(context);
        }

    }
}