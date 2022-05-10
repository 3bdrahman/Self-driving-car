class Controls{
    constructor(){
        this.forward=false;
        this.left=false;
        this.right=false;
        this.backwards=false;
        this.addKeyboardListeners();
    }
    addKeyboardListeners(){
        document.onkeydown=(event)=>{
            switch(event.key){
                case "ArrowLeft":
                    this.left=true;
                    break;
            
                case "ArrowRight":
                    this.right=true;
                    break;
                
                case "ArrowUp":
                    this.forward=true;
                    break;
                
                case "ArrowDown":
                    this.backwards=true;
                    break;
            }
            console.table(this);
        }

        document.onkeyup=(event)=>{
            switch(event.key){
                case "ArrowLeft":
                    this.left=false;
                    break;
            
                case "ArrowRight":
                    this.right=false;
                    break;
                
                case "ArrowUp":
                    this.forward=false;
                    break;
                
                case "ArrowDown":
                    this.backwards=false;
                    break;
            }
            console.table(this)
        }
    }
}