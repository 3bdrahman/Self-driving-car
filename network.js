/**
 * Binary Step Neuroevolution Network
 * Provides clean 0/1 discrete outputs for forward, left, right, and backwards control.
 */

class NeuralNetwork {
    constructor(neuronCounts) {
        this.levels = [];
        for (let i = 0; i < neuronCounts.length - 1; i++) {
            this.levels.push(new Level(neuronCounts[i], neuronCounts[i + 1]));
        }
    }

    static feedForward(givenInputs, network) {
        let outputs = Level.feedForward(givenInputs, network.levels[0]);
        for (let i = 1; i < network.levels.length; i++) {
            outputs = Level.feedForward(outputs, network.levels[i]);
        }
        return outputs;
    }

    static mutate(network, amount = 1) {
        network.levels.forEach(level => {
            for (let i = 0; i < level.biases.length; i++) {
                level.biases[i] = lerp(
                    level.biases[i],
                    Math.random() * 2 - 1,
                    amount
                );
            }
            for (let i = 0; i < level.weights.length; i++) {
                for (let j = 0; j < level.weights[i].length; j++) {
                    level.weights[i][j] = lerp(
                        level.weights[i][j],
                        Math.random() * 2 - 1,
                        amount
                    );
                }
            }
        });
    }

    static clone(network) {
        if (!network || !network.levels) return null;
        const counts = [network.levels[0].inputs.length];
        for (let i = 0; i < network.levels.length; i++) {
            counts.push(network.levels[i].outputs.length);
        }
        const cloned = new NeuralNetwork(counts);
        for (let l = 0; l < network.levels.length; l++) {
            const src = network.levels[l];
            const dst = cloned.levels[l];
            for (let i = 0; i < src.biases.length; i++) {
                dst.biases[i] = src.biases[i];
            }
            for (let i = 0; i < src.weights.length; i++) {
                for (let j = 0; j < src.weights[i].length; j++) {
                    dst.weights[i][j] = src.weights[i][j];
                }
            }
        }
        return cloned;
    }

    static serialize(network) {
        return JSON.stringify({
            version: 2,
            timestamp: Date.now(),
            levels: network.levels.map(l => ({
                inputCount: l.inputs.length,
                outputCount: l.outputs.length,
                biases: [...l.biases],
                weights: l.weights.map(row => [...row])
            }))
        });
    }

    static deserialize(jsonString) {
        try {
            const data = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
            if (!data || !data.levels || !Array.isArray(data.levels)) return null;

            const counts = [data.levels[0].inputCount || data.levels[0].inputs?.length];
            for (let i = 0; i < data.levels.length; i++) {
                counts.push(data.levels[i].outputCount || data.levels[i].outputs?.length);
            }
            const net = new NeuralNetwork(counts);
            for (let l = 0; l < data.levels.length; l++) {
                const src = data.levels[l];
                const dst = net.levels[l];
                if (src.biases) dst.biases = [...src.biases];
                if (src.weights) dst.weights = src.weights.map(r => [...r]);
            }
            return net;
        } catch (err) {
            console.error("Failed to deserialize neural network:", err);
            return null;
        }
    }
}

class Level {
    constructor(inputCount, outputCount) {
        this.inputs = new Array(inputCount);
        this.outputs = new Array(outputCount);
        this.biases = new Array(outputCount);
        this.weights = [];

        for (let i = 0; i < inputCount; i++) {
            this.weights[i] = new Array(outputCount);
        }

        Level.randomize(this);
    }

    static randomize(level) {
        for (let i = 0; i < level.inputs.length; i++) {
            for (let j = 0; j < level.outputs.length; j++) {
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }
        for (let i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random() * 2 - 1;
        }
    }

    static feedForward(givenInputs, level) {
        for (let i = 0; i < level.inputs.length; i++) {
            level.inputs[i] = givenInputs[i];
        }

        for (let i = 0; i < level.outputs.length; i++) {
            let sum = 0;
            for (let j = 0; j < level.inputs.length; j++) {
                sum += level.inputs[j] * level.weights[j][i];
            }

            if (sum > level.biases[i]) {
                level.outputs[i] = 1;
            } else {
                level.outputs[i] = 0;
            }
        }

        return level.outputs;
    }
}