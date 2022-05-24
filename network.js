class NeuralNetwork{
    constructor(neuronNum){
        this.levels=[];
        for(let i=0;i<neuronNum.length-1;i++){
            this.levels.push(new Level(neuronNum[i],neuronNum[i+1]));
        }
    }
    static feedForward(inputsGiven,network){
        let outputs=Level.feedForward(inputsGiven,network.levels[0]);
        for(let i=1; i<network.levels.length;i++){
            outputs=Level.feedForward(outputs,network.levels[i]); 
        }
        return outputs
    }
}

class Level{
    constructor(inputNum, outputNum){
        this.inputs=new Array(inputNum);
        this.outputs= new Array(outputNum);
        this.biases=new Array(outputNum);
        this.weights=[];
        for(let i=0; i<inputNum;i++){
            this.weights[i]=new Array(outputNum);
        }
        Level.randomize(this);
    }
    static randomize(level){
        for(let i=0; i<level.inputs.length; i++){
            for(let j=0; j<level.outputs.length;j++){
                level.weights[i][j]=Math.random()*2-1;

            }
        }
        for(let i=0; i<level.biases.length; i++){
          
                level.biases[i]=Math.random()*2-1;
                
            
        }
    }
    static feedForward(inputsGiven,level){
        for(let i=0;i<level.inputs.length;i++){
            level.inputs[i]=inputsGiven[i];
        }
        for(let i=0;i<level.outputs.length;i++){
            let sum=0;
            for(let j=0; j<level.inputs.length;j++){
                sum += level.inputs[j]*level.weights[j][i];
            }
            if(sum > level.biases[i]){
                level.outputs[i]=1;
            }else{
                level.outputs[i]=0;
            }
        }
        return level.outputs;
    }
}