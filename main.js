const carCanvas = document.getElementById("carCanvas");

carCanvas.width=300;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width=400;
const carContext = carCanvas.getContext("2d");
const networkContext = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width/2,carCanvas.width* 0.9);
const car = new Car(road.getLaneCenter(1),100,30,50,"autopilot");
const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50, "dummy",3)
];


animate();

function animate(time){
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    car.update(road.borders,traffic);
    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;
    //add effect of camera following the car as if the road is moving not the car
    carContext.save();
    carContext.translate(0,-car.y+carCanvas.height*0.7);

    road.draw(carContext);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carContext,"blue");
    }
    car.draw(carContext, "purple");

    carContext.restore();
    networkContext.lineDashOffset=-time/50;
    NetworkVisualizer.drawNetwork(networkContext,car.autoPilot);
    
    requestAnimationFrame(animate);
}