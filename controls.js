class Controls{
    constructor(type){
        this.forward=false;
        this.left=false;
        this.right=false;
        this.backwards=false;
        switch(type){
            case "control":
                this.addKeyboardListeners();
                break;
            case "dummy":
                this.forward=true;
                break;
        }

    }
    // addEventListener (not document.onkeydown) so multiple keyboard-driven
    // cars can coexist: each Controls instance gets its own callback bound
    // to itself instead of clobbering the previous one.
    addKeyboardListeners(){
        document.addEventListener("keydown", (event)=>{
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
        });

        document.addEventListener("keyup", (event)=>{
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
        });
    }
}