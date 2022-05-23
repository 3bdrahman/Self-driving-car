const canvas = document.getElementById("canvas");

canvas.width=300;

const context = canvas.getContext("2d");
const road = new Road(canvas.width/2,canvas.width* 0.9);
const car = new Car(road.getLaneCenter(1),100,30,50,"control");
const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50, "dummy",3)
];


animate();

function animate(){
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    car.update(road.borders,traffic);
    canvas.height=window.innerHeight;
    //add effect of camera following the car as if the road is moving not the car
    context.save();
    context.translate(0,-car.y+canvas.height*0.7);

    road.draw(context);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(context,"blue");
    }
    car.draw(context, "purple");

    context.restore();
    requestAnimationFrame(animate);
}