const carCanvas = document.getElementById("carCanvas");

carCanvas.width=300;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width=400;
const carContext = carCanvas.getContext("2d");
const networkContext = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width/2,carCanvas.width* 0.9);
const num=100;
const cars = generateDuplicates(num)
const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50, "dummy",3)
];
let optimalCar = cars[0];
if(localStorage.getItem("bestAutopilot")){
    optimalCar.autoPilot=JSON.parse(localStorage.getItem("bestAutopilot"));
}

animate();
function generateDuplicates(num){
    const cars=[];
    for(let i=0;i<=num;i++){
        cars.push(new Car(road.getLaneCenter(1), 100,30,50,"autopilot"));
    }
    return cars;
}
//saving the neural network of the most optimal car
function save(){
    localStorage.setItem("bestAutopilot",
    JSON.stringify(optimalCar.autoPilot));
}
function destroy(){
    localStorage.removeItem("bestAutopilot");
}

function animate(time){
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0; i< cars.length;i++){
        cars[i].update(road.borders,traffic);
    }
    //the optimal car is the car that has least y value ==> goes up most
    optimalCar=cars.find(
        c=>c.y==Math.min(
            ...cars.map(c=>c.y)
        )
    );
    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;
    //add effect of camera following the car as if the road is moving not the car
    carContext.save();
    carContext.translate(0,-optimalCar.y+carCanvas.height*0.7);
    road.draw(carContext);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carContext,"blue");
    }
    carContext.globalAlpha=0.2;
    for(let i=0; i <cars.length;i++){
        cars[i].draw(carContext, "purple");
    }
    carContext.globalAlpha=1;
    optimalCar.draw(carContext, "purple", true);
    
   
    

    carContext.restore();
    networkContext.lineDashOffset=-time/50;
    NetworkVisualizer.drawNetwork(networkContext,optimalCar.autoPilot);
    
    requestAnimationFrame(animate);
}