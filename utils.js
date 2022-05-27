function lerp(A,B,t){
    return A+(B-A)*t;
}

function getIntersection(A,B,C,D){ 

    const tTop=(D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x);

    const uTop=(C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y);

    const bottom=(D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y);

    

    if(bottom!=0){

        const t=tTop/bottom;

        const u=uTop/bottom;

        if(t>=0 && t<=1 && u>=0 && u<=1){

            return {

                x:lerp(A.x,B.x,t),

                y:lerp(A.y,B.y,t),

                offset:t

            }

        }

    }



    return null;

}

function plygonIntersects(polygon, borders){
    for(let i=0;i<polygon.length;i++){
        for(let j=0; j<borders.length;j++){
            const atouch=getIntersection(
                polygon[i],
                polygon[(i+1)%polygon.length],
                borders[j],
                borders[(j+1)%borders.length]
            );
            if(atouch) {
                return true
            }
        }
    }
    return false;
}
function getRGB(val){
    const alpha = Math.abs(val);
    const Red =val <0?0 :255;
    const Green = Red;
    const Blue = val >0?0:255;
    return"rgba(" + Red + ","+Green+","+Blue+","+alpha+")";
}

function getRandomColor(){
    const val = 290+Math.random()*260;
    return "hsl(" + val+", 100%, 60%";
}