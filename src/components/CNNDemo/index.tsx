import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { InputPanel } from './InputPanel';
import { StructurePanel } from './StructurePanel';
import { TrainingPanel } from './TrainingPanel';
import { createModel, trainModel, predict, getActivation, getConv1Weights, imageDataToGrid, preprocessImage } from '../../utils/cnn-model';
import { MnistData } from '../../utils/mnist-data';

export const CNNDemo: React.FC = () => {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [data, setData] = useState<MnistData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<{ epoch: number; loss: number; acc: number }[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [prediction, setPrediction] = useState<{ label: number; probabilities: number[] } | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [featureMaps, setFeatureMaps] = useState<{ [key: string]: string[] }>({});
  const [trainingProgress, setTrainingProgress] = useState(0);
  
  // Animation Data
  const [conv1Weights, setConv1Weights] = useState<{ kernel: number[][], bias: number } | null>(null);
  const [inputGrid, setInputGrid] = useState<number[][] | null>(null);

  // Initialize Model and Data
  useEffect(() => {
    const init = async () => {
      // Create Model
      const newModel = createModel();
      setModel(newModel);
      
      // Initial weights
      const weights = getConv1Weights(newModel);
      setConv1Weights(weights);

      // Load Data
      try {
        const mnistData = new MnistData();
        await mnistData.load();
        setData(mnistData);
      } catch (err) {
        console.error("Failed to load MNIST data", err);
        alert("MNIST 数据加载失败，请检查网络连接。");
      } finally {
        setIsDataLoading(false);
      }
    };
    init();
  }, []);

  const handleStartTraining = async () => {
    if (!model || !data) return;
    setIsTraining(true);
    setTrainingProgress(0);
    
    // If starting fresh, clear logs. If continuing, keep them.
    // Actually, we always append to logs in the UI, but we need to know the epoch offset.
    const initialEpoch = logs.length;

    try {
      await trainModel(
        model,
        data,
        (epoch, log) => {
          setLogs(prev => [...prev, { 
            epoch: initialEpoch + epoch, 
            loss: log.loss, 
            acc: log.acc 
          }]);
          setTrainingProgress(((epoch + 1) / 5) * 100); // Assuming 5 epochs per run
          
          // Update weights visualization after each epoch
          const weights = getConv1Weights(model);
          setConv1Weights(weights);
        },
        (batch, log) => {
            // Optional: Update batch progress if needed
        }
      );
    } catch (err) {
      console.error("Training failed", err);
      alert("训练过程中出错");
    } finally {
      setIsTraining(false);
      setTrainingProgress(100);
      // Final weights update
      const weights = getConv1Weights(model);
      setConv1Weights(weights);
    }
  };

  const handleReset = () => {
      if (isTraining) return;
      if (confirm("确定要重置模型吗？所有训练进度将丢失。")) {
          const newModel = createModel();
          setModel(newModel);
          setLogs([]);
          setPrediction(null);
          setFeatureMaps({});
          const weights = getConv1Weights(newModel);
          setConv1Weights(weights);
      }
  };

  const handleImageReady = (imageData: ImageData) => {
    setCurrentImage(imageData);
    setPrediction(null); // Reset prediction when image changes
    setFeatureMaps({});
    
    // Update input grid for animation (Center 10x10)
    const grid = imageDataToGrid(imageData, 10);
    setInputGrid(grid);
  };

  const handlePredict = async () => {
    if (!model || !currentImage) {
        alert("请先绘制或上传图片！");
        return;
    }
    
    if (logs.length === 0) {
        alert("模型尚未训练，预测结果可能不准确（随机猜测）。建议先点击“开始训练”。");
    }

    // 0. Preprocess (Center the digit)
    const processedImage = preprocessImage(currentImage);

    // 1. Predict
    const probs = await predict(model, processedImage) as Float32Array;
    const probabilities = Array.from(probs);
    const label = probabilities.indexOf(Math.max(...probabilities));
    setPrediction({ label, probabilities });

    // 2. Generate Feature Maps for visualization
    await generateFeatureMaps(model, processedImage);
  };

  const generateFeatureMaps = async (model: tf.LayersModel, imageData: ImageData) => {
    const layersToVisualize = ['conv1', 'pool1', 'conv2', 'pool2'];
    const newFeatureMaps: { [key: string]: string[] } = {};

    for (const layerName of layersToVisualize) {
        try {
            const activation = getActivation(model, layerName, imageData);
            // activation shape: [1, h, w, filters]
            const [b, h, w, filters] = activation.shape;
            
            const layerMaps: string[] = [];
            // Extract first 8 filters max
            const numFiltersToShow = Math.min(filters, 8);
            
            const activationData = activation.dataSync();
            
            for (let f = 0; f < numFiltersToShow; f++) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const imgData = ctx.createImageData(w, h);
                    // Find min/max for normalization
                    let min = Infinity, max = -Infinity;
                    for (let i = 0; i < h * w; i++) {
                        const val = activationData[i * filters + f];
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                    const range = max - min + 0.00001;

                    for (let i = 0; i < h * w; i++) {
                        const val = activationData[i * filters + f];
                        const normVal = Math.floor(((val - min) / range) * 255);
                        imgData.data[i * 4 + 0] = normVal; // R
                        imgData.data[i * 4 + 1] = normVal; // G
                        imgData.data[i * 4 + 2] = normVal; // B
                        imgData.data[i * 4 + 3] = 255;     // Alpha
                    }
                    ctx.putImageData(imgData, 0, 0);
                    layerMaps.push(canvas.toDataURL());
                }
            }
            newFeatureMaps[layerName] = layerMaps;
            activation.dispose();
        } catch (e) {
            console.log(`Layer ${layerName} not found or error`, e);
        }
    }
    setFeatureMaps(newFeatureMaps);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-indigo-700">AI 芯片课程：卷积神经网络 (CNN) 可视化</h1>
        <p className="text-gray-600 mt-2">像科学家一样观察 AI 是如何“看”懂图片的</p>
      </header>

      {isDataLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 animate-pulse">正在加载 AI 引擎和数据... (Loading MNIST)</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px]">
          {/* Left: Input (3 cols) */}
          <div className="lg:col-span-3 h-full">
            <InputPanel onImageReady={handleImageReady} disabled={isTraining} />
            
            <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                <strong>💡 提高准确率小贴士：</strong>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>尽量将数字写在<b>正中间</b></li>
                    <li>字迹要<b>粗一点</b>、大一点</li>
                    <li>如果识别不准，可以点击<b>“继续训练”</b>让 AI 多学几遍</li>
                </ul>
            </div>
          </div>

          {/* Middle: Structure (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <StructurePanel 
                activeLayer={activeLayer} 
                onLayerClick={setActiveLayer} 
                featureMaps={featureMaps}
                conv1Weights={conv1Weights}
                inputGrid={inputGrid}
            />
          </div>

          {/* Right: Training & Result (4 cols) */}
          <div className="lg:col-span-4 h-full">
            <TrainingPanel 
                isTraining={isTraining}
                logs={logs}
                onStartTraining={handleStartTraining}
                onReset={handleReset}
                onPredict={handlePredict}
                prediction={prediction}
                trainingProgress={trainingProgress}
            />
          </div>
        </div>
      )}
    </div>
  );
};
