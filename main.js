const canvas = document.getElementById("canvas");

canvas.width=300;

const context = canvas.getContext("2d");
const road = new Road(canvas.width/2,canvas.width* 0.9);
const car = new Car(road.getLaneCenter(1),100,30,50);


animate();

function animate(){
    car.update();
    canvas.height=window.innerHeight;
    //add effect of camera following the car as if the road is moving not the car
    context.save();
    context.translate(0,-car.y+canvas.height*0.7);

    road.draw(context);
    car.draw(context);

    context.restore();
    requestAnimationFrame(animate);
}