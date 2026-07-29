/**
 * Neural Network Visualizer
 * Renders multi-level neural network graphs with input nodes, weight connections,
 * biases, outputs, and direction labels.
 */

class NetworkVisualizer {
    static drawNetwork(context, network) {
        if (!network || !network.levels) return;

        const margin = 35;
        const left = margin;
        const top = margin;
        const width = context.canvas.width - margin * 2;
        const height = context.canvas.height - margin * 2;

        context.save();
        context.setLineDash([7, 3]);

        const levelHeight = height / network.levels.length;
        for (let i = network.levels.length - 1; i >= 0; i--) {
            const levelTop = top + lerp(
                height - levelHeight,
                0,
                network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1)
            );
            NetworkVisualizer.drawLevel(
                context,
                network.levels[i],
                left,
                levelTop,
                width,
                levelHeight,
                i === network.levels.length - 1 ? ['▲', '◄', '►', '▼'] : []
            );
        }

        context.restore();
    }

    static drawLevel(context, level, left, top, width, height, labels) {
        const right = left + width;
        const bottom = top + height;
        const radius = 18;
        const { inputs, outputs, weights, biases } = level;

        context.save();

        // 1. Synaptic Weight Lines
        for (let i = 0; i < inputs.length; i++) {
            for (let j = 0; j < outputs.length; j++) {
                context.beginPath();
                context.moveTo(
                    NetworkVisualizer.getNodeX(inputs.length, i, left, right),
                    bottom
                );
                context.lineTo(
                    NetworkVisualizer.getNodeX(outputs.length, j, left, right),
                    top
                );
                context.lineWidth = 2;
                context.strokeStyle = getRGB(weights[i][j]);
                context.stroke();
            }
        }

        // 2. Input Neurons (Bottom Row)
        for (let i = 0; i < inputs.length; i++) {
            const x = NetworkVisualizer.getNodeX(inputs.length, i, left, right);
            context.beginPath();
            context.arc(x, bottom, radius, 0, Math.PI * 2);
            context.fillStyle = "black";
            context.fill();
            context.beginPath();
            context.arc(x, bottom, radius * 0.6, 0, Math.PI * 2);
            context.fillStyle = getRGB(inputs[i]);
            context.fill();
        }

        // 3. Output Neurons (Top Row)
        for (let i = 0; i < outputs.length; i++) {
            const x = NetworkVisualizer.getNodeX(outputs.length, i, left, right);

            context.beginPath();
            context.arc(x, top, radius * 0.85, 0, Math.PI * 2);
            context.fillStyle = getRGB(outputs[i]);
            context.fill();

            context.beginPath();
            context.lineWidth = 2;
            context.arc(x, top, radius, 0, Math.PI * 2);
            context.strokeStyle = getRGB(biases[i]);
            context.setLineDash([3, 3]);
            context.stroke();

            if (labels[i]) {
                context.beginPath();
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillStyle = "black";
                context.strokeStyle = "white";
                context.font = "bold " + (radius * 1.2) + "px sans-serif";
                context.fillText(labels[i], x, top);
                context.lineWidth = 0.5;
                context.strokeText(labels[i], x, top);
            }
        }

        context.restore();
    }

    static getNodeX(count, index, left, right) {
        return lerp(left, right, count === 1 ? 0.5 : index / (count - 1));
    }
}