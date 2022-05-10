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
        this.controls=new Controls();
    }
    update(){

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
    }
    draw(context){
        context.save()
        context.translate(this.x, this.y);
        context.rotate(-this.angle);
        context.beginPath();
        context.rect(
            -this.width/2,
            -this.height/2,
            this.width,
            this.height
        );
        context.fill();
        context.restore();
    }
}