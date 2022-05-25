# Self-driving-car
Personal project: self-driving 2-d car with a neural network visualizer.

## Base model: 
implementing the car, controls, road, sensor and the canvas.

![](ezgif.com-gif-maker.gif)

## 1st milestone : collision detection
- use segment intersection to detect the road borders and other objects
- detect collision against the car's geometric segments and other objects 
- create dummy cars to represent random traffic 

![](1.00.gif)

## 2nd milestone: build neural network 
- build neural network class that consists of different feed-forward levels
- use the class and bind the sensors readings as inputs to the first level of the network
- add "autopilot" control type to the controls class.
- the network starts by giving random weights and biases, and consequently make random moves that cause the car to crash.
- this problem can be fixed with parallelization ie having many instances of the car and a lot of scenarios. 

![](2.00.gif)

### Next step: build Neural Network Visualizer
- create a new canvas to demenstrate how the network functions
- build visualizer class that draws a given network on specified canvas
- It has 2 main functions : 1 drawLevel : draws specified level of the network: inputs , outputs, weights, biases.
                            2 drawNetwork: uses drawLevel iteratively to draw the whole network.
