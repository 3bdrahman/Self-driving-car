/**
 * Vehicle Control Handler
 * Keyboard listeners (Arrow keys & WASD) + AI Autopilot integration.
 */

class Controls {
    constructor(type) {
        this.forward = false;
        this.left = false;
        this.right = false;
        this.backwards = false;

        switch (type) {
            case "control":
                this.addKeyboardListeners();
                break;
            case "dummy":
                this.forward = true;
                break;
        }
    }

    addKeyboardListeners() {
        document.addEventListener("keydown", (event) => {
            switch (event.key) {
                case "ArrowLeft":
                case "a":
                case "A":
                    this.left = true;
                    break;

                case "ArrowRight":
                case "d":
                case "D":
                    this.right = true;
                    break;

                case "ArrowUp":
                case "w":
                case "W":
                    this.forward = true;
                    break;

                case "ArrowDown":
                case "s":
                case "S":
                    this.backwards = true;
                    break;
            }
        });

        document.addEventListener("keyup", (event) => {
            switch (event.key) {
                case "ArrowLeft":
                case "a":
                case "A":
                    this.left = false;
                    break;

                case "ArrowRight":
                case "d":
                case "D":
                    this.right = false;
                    break;

                case "ArrowUp":
                case "w":
                case "W":
                    this.forward = false;
                    break;

                case "ArrowDown":
                case "s":
                case "S":
                    this.backwards = false;
                    break;
            }
        });
    }
}