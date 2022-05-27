const carCanvas = document.getElementById("carCanvas");

carCanvas.width = 300;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 400;
const carContext = carCanvas.getContext("2d");
const networkContext = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
const num = 0;
const cars = generateDuplicates(num)
const traffic = [
    new Car(road.getLaneCenter(1), -100, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -300, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -300, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -500, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -500, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -750, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -800, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -900, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -800, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1000, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -1200, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1100, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1160, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1300, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -1350, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1400, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1500, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1600, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1650, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -1700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1700, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -1800, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1850, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -1900, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -1900, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(0), -1900, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(1), -2100, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -2150, 30, 50, "dummy", 2, getRandomColor()),
    new Car(road.getLaneCenter(2), -2200, 30, 50, "dummy", 2, getRandomColor()),
];
let optimalCar = cars[0];
if (localStorage.getItem("bestAutopilot")) {
    for (let i = 0; i < cars.length; i++) {
        cars[i].autoPilot = JSON.parse(localStorage.getItem("bestAutopilot"));
        if (i != 0) {
            NeuralNetwork.mutate(cars[i].autoPilot, 0.3);
        }
    }

}

animate();
function generateDuplicates(num) {
    const cars = [];
    for (let i = 0; i <= num; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "autopilot"));

    }
    return cars;
}
//saving the neural network of the most optimal car
function save() {
    localStorage.setItem("bestAutopilot",
        JSON.stringify(optimalCar.autoPilot));
}
function destroy() {
    localStorage.removeItem("bestAutopilot");
}

function animate(time) {
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);
    }
    //the optimal car is the car that has least y value ==> goes up most
    optimalCar = cars.find(
        c => c.y == Math.min(
            ...cars.map(c => c.y)
        )
    );
    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;
    //add effect of camera following the car as if the road is moving not the car
    carContext.save();
    carContext.translate(0, -optimalCar.y + carCanvas.height * 0.7);
    road.draw(carContext);
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carContext, "blue");
    }
    carContext.globalAlpha = 0.2;
    for (let i = 0; i < cars.length; i++) {
        cars[i].draw(carContext, "purple");
    }
    carContext.globalAlpha = 1;
    optimalCar.draw(carContext, "purple", true);




    carContext.restore();
    networkContext.lineDashOffset = -time / 50;
    NetworkVisualizer.drawNetwork(networkContext, optimalCar.autoPilot);

    requestAnimationFrame(animate);
}