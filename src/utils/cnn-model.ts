import * as tf from '@tensorflow/tfjs';
import { MnistData } from './mnist-data';

export const IMAGE_WIDTH = 28;
export const IMAGE_HEIGHT = 28;
export const IMAGE_CHANNELS = 1;

export function createModel() {
  const model = tf.sequential();

  // Layer 1: Conv2D
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS],
    kernelSize: 5,
    filters: 8,
    strides: 1,
    activation: 'relu',
    kernelInitializer: 'varianceScaling',
    name: 'conv1'
  }));

  // Layer 2: MaxPooling
  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2],
    strides: [2, 2],
    name: 'pool1'
  }));

  // Layer 3: Conv2D (Optional, but good for better results, keeping it simple as requested)
  model.add(tf.layers.conv2d({
    kernelSize: 5,
    filters: 16,
    strides: 1,
    activation: 'relu',
    kernelInitializer: 'varianceScaling',
    name: 'conv2'
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2],
    strides: [2, 2],
    name: 'pool2'
  }));

  // Layer 4: Flatten
  model.add(tf.layers.flatten({name: 'flatten'}));

  // Layer 5: Dense
  model.add(tf.layers.dense({
    units: 10,
    kernelInitializer: 'varianceScaling',
    activation: 'softmax',
    name: 'output'
  }));

  const optimizer = tf.train.adam();
  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

export async function trainModel(
  model: tf.LayersModel, 
  data: MnistData, 
  onEpochEnd: (epoch: number, logs: tf.Logs) => void,
  onBatchEnd?: (batch: number, logs: tf.Logs) => void
) {
  const BATCH_SIZE = 64; 
  const TRAIN_DATA_SIZE = 2000; // Increased from 500 for better accuracy
  const TEST_DATA_SIZE = 200;

  const [trainXs, trainYs] = tf.tidy(() => {
    const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
    return [
      d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]),
      d.labels
    ];
  });

  const [testXs, testYs] = tf.tidy(() => {
    const d = data.nextTestBatch(TEST_DATA_SIZE);
    return [
      d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]),
      d.labels
    ];
  });

  return model.fit(trainXs, trainYs, {
    batchSize: BATCH_SIZE,
    validationData: [testXs, testYs],
    epochs: 5, // Keep it short for demo
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (onEpochEnd && logs) onEpochEnd(epoch, logs);
      },
      onBatchEnd: async (batch, logs) => {
        if (onBatchEnd && logs) onBatchEnd(batch, logs);
        await tf.nextFrame(); // Prevent UI blocking
      }
    }
  });
}

export async function predict(model: tf.LayersModel, imageData: ImageData) {
  return tf.tidy(() => {
    // Convert ImageData to Tensor
    let tensor = tf.browser.fromPixels(imageData, 1); // 1 channel (grayscale)
    
    // Resize to 28x28 if needed (though input should already be 28x28)
    if (tensor.shape[0] !== 28 || tensor.shape[1] !== 28) {
        tensor = tf.image.resizeBilinear(tensor, [28, 28]);
    }

    // Normalize: 0-255 -> 0-1
    const floatTensor = tensor.toFloat().div(tf.scalar(255));

    // Reshape to [1, 28, 28, 1]
    const input = floatTensor.expandDims(0);

    const prediction = model.predict(input) as tf.Tensor;
    return prediction.dataSync();
  });
}

export function getActivation(model: tf.LayersModel, layerName: string, imageData: ImageData) {
    return tf.tidy(() => {
        const layer = model.getLayer(layerName);
        const tempModel = tf.model({inputs: model.inputs, outputs: layer.output as tf.SymbolicTensor});
        
        let tensor = tf.browser.fromPixels(imageData, 1);
        if (tensor.shape[0] !== 28 || tensor.shape[1] !== 28) {
            tensor = tf.image.resizeBilinear(tensor, [28, 28]);
        }
        const floatTensor = tensor.toFloat().div(tf.scalar(255)).expandDims(0);
        
        const activation = tempModel.predict(floatTensor) as tf.Tensor;
        return activation; // Returns tensor of shape [1, h, w, filters]
    });
}

export function getConv1Weights(model: tf.LayersModel) {
    const layer = model.getLayer('conv1');
    const weights = layer.getWeights();
    if (!weights || weights.length < 2) return null;
    
    const kernelTensor = weights[0]; // [5, 5, 1, 8]
    const biasTensor = weights[1];   // [8]
    
    const kernelData = kernelTensor.dataSync();
    const biasData = biasTensor.dataSync();
    
    // Extract first filter (index 0)
    const kernel: number[][] = [];
    for (let i = 0; i < 5; i++) {
        const row: number[] = [];
        for (let j = 0; j < 5; j++) {
            const idx = (i * 5 + j) * 8;
            row.push(kernelData[idx]);
        }
        kernel.push(row);
    }
    
    return {
        kernel,
        bias: biasData[0]
    };
}

export function imageDataToGrid(imageData: ImageData, size = 10): number[][] {
    // Crop center 'size x size'
    const { width, height, data } = imageData;
    const startX = Math.floor((width - size) / 2);
    const startY = Math.floor((height - size) / 2);
    
    const grid: number[][] = [];
    
    for (let i = 0; i < size; i++) {
        const row: number[] = [];
        for (let j = 0; j < size; j++) {
            const x = startX + j;
            const y = startY + i;
            const idx = (y * width + x) * 4;
            // Use Red channel, normalize to 0-1
            row.push(data[idx] / 255);
        }
        grid.push(row);
    }
    
    return grid;
}

// Helper to center the digit in the image (like MNIST)
export function preprocessImage(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    
    // 1. Find bounding box
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasPixels = false;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Check alpha or color (assuming white on black or black on white)
            // Input is usually white drawing on black bg
            if (data[idx] > 50) { // Threshold
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                hasPixels = true;
            }
        }
    }
    
    if (!hasPixels) return imageData; // Return original if empty
    
    // 2. Extract content
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    
    // 3. Scale to fit in 20x20 box (preserving aspect ratio)
    const scale = Math.min(20 / contentWidth, 20 / contentHeight);
    const scaledWidth = Math.floor(contentWidth * scale);
    const scaledHeight = Math.floor(contentHeight * scale);
    
    // 4. Create new centered image
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageData;
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 28, 28);
    
    // Draw the cropped content scaled
    // We need a temp canvas for the crop
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return imageData;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw scaled and centered
    const dx = Math.floor((28 - scaledWidth) / 2);
    const dy = Math.floor((28 - scaledHeight) / 2);
    
    ctx.drawImage(
        tempCanvas, 
        minX, minY, contentWidth, contentHeight, 
        dx, dy, scaledWidth, scaledHeight
    );
    
    return ctx.getImageData(0, 0, 28, 28);
}
