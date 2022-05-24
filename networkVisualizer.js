class NetworkVisualizer{
    static drawNetwork(context,network){
        const margin=40;
        const left=margin;
        const top=margin;
        const width=context.canvas.width-margin*2;
        const height=context.canvas.height-margin*2;
        NetworkVisualizer.drawLevel(context,network.levels[0],
            left,top,width,height);

        
    }
    static drawLevel(context,level,left,top,width,height){
        const right = left+width;
        const bottom=top+height;
        const radius= 20;
        const {inputs,outputs,weights,biases}=level
        for(let i=0;i<inputs.length;i++){
            for(let j=0;j<outputs.length;j++){
                context.beginPath();
                context.moveTo(NetworkVisualizer.getNodeX(inputs,i,left,right),bottom);
                context.lineTo(NetworkVisualizer.getNodeX(outputs,j,left,right),top);
                context.lineWidth=2;
                const val = weights[i][j];
                context.strokeStyle=getRGB(val);
                context.stroke();
            }
        }
        for(let i=0;i<inputs.length;i++){
            const x=NetworkVisualizer.getNodeX(inputs,i,left,right);
               
            context.beginPath();
            context.arc(x,bottom,radius,0,Math.PI*2);
            context.fillStyle=getRGB(inputs[i]);
            context.fill();

           

        }
        for(let i=0;i<level.outputs.length;i++){
            const x=NetworkVisualizer.getNodeX(outputs,i,left,right);
            
            context.beginPath();
            context.arc(x,top,radius*.85,0,Math.PI*2);
            context.fillStyle=getRGB(outputs[i]);
            context.fill();
            context.beginPath();
            context.lineWidth=2;
            context.arc(x,top,radius,0,Math.PI*2);
            context.strokeStyle=getRGB(biases[i]);
            context.setLineDash([3,3]);
            context.stroke();
            context.setLineDash([]);
        }
   
    }
    static getNodeX(nodes,index,left,right){
        return lerp(left,right,nodes.length==1?0.5:index/(nodes.length-1));
    }
}