import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConvAnimationProps {
  inputData: number[][]; // 2D array of pixel values (0-1 or 0-255)
  kernel: number[][];    // 2D array of weights
  bias: number;
  activation?: 'relu' | 'none';
}

export const ConvAnimation: React.FC<ConvAnimationProps> = ({ 
  inputData, 
  kernel, 
  bias,
  activation = 'relu' 
}) => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms per step

  // Dimensions
  const inputH = inputData.length;
  const inputW = inputData[0].length;
  const kernelH = kernel.length;
  const kernelW = kernel[0].length;
  
  // Output dimensions (valid padding)
  const outputH = inputH - kernelH + 1;
  const outputW = inputW - kernelW + 1;
  const totalSteps = outputH * outputW;

  // Current position
  const currentY = Math.floor(step / outputW);
  const currentX = step % outputW;

  // Calculate current result
  const calculateResult = () => {
    let sum = 0;
    const details: { i: number, j: number, val: number, w: number }[] = [];
    
    for (let i = 0; i < kernelH; i++) {
      for (let j = 0; j < kernelW; j++) {
        const val = inputData[currentY + i][currentX + j];
        const w = kernel[i][j];
        sum += val * w;
        details.push({ i, j, val, w });
      }
    }
    sum += bias;
    const preActivation = sum;
    const final = activation === 'relu' ? Math.max(0, sum) : sum;
    
    return { sum, preActivation, final, details };
  };

  const result = calculateResult();

  // Animation Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalSteps, speed]);

  // Helper to get color for value
  const getColor = (val: number, isWeight = false) => {
    // Normalize for display
    // Weights can be negative. Pixels are 0-1 (or 0-255).
    // Let's assume pixels are 0-1.
    if (isWeight) {
        // Weights: Red (negative) to Blue (positive)
        const intensity = Math.min(255, Math.abs(val) * 200); // Scale up for visibility
        return val >= 0 
            ? `rgba(0, 0, 255, ${Math.min(1, Math.abs(val) * 2)})` 
            : `rgba(255, 0, 0, ${Math.min(1, Math.abs(val) * 2)})`;
    } else {
        // Pixels: Grayscale (0=Black, 1=White)
        // But inputData might be 0-255 or 0-1. Let's normalize to 0-255.
        const v = val > 1 ? val : val * 255;
        return `rgb(${v}, ${v}, ${v})`;
    }
  };

  const getTextColor = (val: number, isWeight = false) => {
      if (isWeight) return 'white';
      const v = val > 1 ? val : val * 255;
      return v > 128 ? 'black' : 'white';
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-gray-700">卷积过程演示 (Convolution Process)</h4>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1 rounded text-sm font-bold text-white ${isPlaying ? 'bg-yellow-500' : 'bg-green-500'}`}
            >
                {isPlaying ? '暂停 (Pause)' : '播放 (Play)'}
            </button>
            <button 
                onClick={() => setStep(0)}
                className="px-3 py-1 rounded text-sm bg-gray-500 text-white"
            >
                重置 (Reset)
            </button>
            <select 
                value={speed} 
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="text-sm border rounded px-2"
            >
                <option value={1000}>慢速</option>
                <option value={500}>中速</option>
                <option value={100}>快速</option>
            </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Input Grid */}
        <div className="relative">
            <h5 className="text-center text-sm font-semibold mb-2">输入图像 (Input)</h5>
            <div 
                className="grid gap-px bg-gray-300 border border-gray-400"
                style={{ gridTemplateColumns: `repeat(${inputW}, 24px)` }}
            >
                {inputData.map((row, i) => (
                    row.map((val, j) => {
                        const isInWindow = i >= currentY && i < currentY + kernelH &&
                                         j >= currentX && j < currentX + kernelW;
                        return (
                            <div 
                                key={`${i}-${j}`}
                                className={`w-6 h-6 flex items-center justify-center text-[8px] transition-all duration-200
                                    ${isInWindow ? 'ring-2 ring-blue-500 z-10' : ''}
                                `}
                                style={{ 
                                    backgroundColor: getColor(val),
                                    color: getTextColor(val)
                                }}
                            >
                                {val.toFixed(1)}
                            </div>
                        );
                    })
                ))}
            </div>
            {/* Sliding Window Highlight */}
            <motion.div 
                className="absolute border-2 border-blue-500 pointer-events-none shadow-lg bg-blue-500/10"
                layout
                style={{
                    width: kernelW * 24 + (kernelW - 1) * 1, // width + gaps
                    height: kernelH * 24 + (kernelH - 1) * 1,
                    top: 28 + currentY * 25, // Header offset + row height
                    left: currentX * 25
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        </div>

        {/* Kernel & Math */}
        <div className="flex flex-col items-center justify-center gap-4">
            <div>
                <h5 className="text-center text-sm font-semibold mb-2">卷积核 (Kernel)</h5>
                <div 
                    className="grid gap-px bg-gray-300 border border-gray-400"
                    style={{ gridTemplateColumns: `repeat(${kernelW}, 24px)` }}
                >
                    {kernel.map((row, i) => (
                        row.map((val, j) => (
                            <div 
                                key={`k-${i}-${j}`}
                                className="w-6 h-6 flex items-center justify-center text-[8px] font-bold"
                                style={{ 
                                    backgroundColor: getColor(val, true),
                                    color: getTextColor(val, true)
                                }}
                            >
                                {val.toFixed(1)}
                            </div>
                        ))
                    ))}
                </div>
            </div>

            <div className="text-2xl text-gray-400">×</div>

            <div className="bg-white p-3 rounded shadow-sm border text-xs w-48">
                <div className="font-bold mb-1 border-b pb-1">计算过程 (Calculation)</div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                    {result.details.map((d, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600">
                            <span>像素({d.val.toFixed(1)}) × 权重({d.w.toFixed(1)})</span>
                            <span>= {(d.val * d.w).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t mt-1 pt-1 flex justify-between font-bold">
                    <span>求和 + 偏置({bias.toFixed(2)})</span>
                    <span>= {result.preActivation.toFixed(2)}</span>
                </div>
                <div className="border-t mt-1 pt-1 flex justify-between text-blue-600 font-bold">
                    <span>ReLU(激活)</span>
                    <span>= {result.final.toFixed(2)}</span>
                </div>
            </div>

            <div className="text-2xl text-gray-400">=</div>
        </div>

        {/* Output Grid */}
        <div>
            <h5 className="text-center text-sm font-semibold mb-2">特征图 (Feature Map)</h5>
            <div 
                className="grid gap-px bg-gray-300 border border-gray-400"
                style={{ gridTemplateColumns: `repeat(${outputW}, 24px)` }}
            >
                {Array(outputH).fill(0).map((_, i) => (
                    Array(outputW).fill(0).map((_, j) => {
                        const isCurrent = i === currentY && j === currentX;
                        const isPast = i < currentY || (i === currentY && j < currentX);
                        
                        // We need to calculate the value for this cell if it's past or current
                        // But for performance, we might not want to recalc everything every render.
                        // However, for a small grid, it's fine.
                        let cellVal = 0;
                        if (isPast || isCurrent) {
                            // Calculate value for (i, j)
                            let s = 0;
                            for (let ki = 0; ki < kernelH; ki++) {
                                for (let kj = 0; kj < kernelW; kj++) {
                                    s += inputData[i + ki][j + kj] * kernel[ki][kj];
                                }
                            }
                            s += bias;
                            cellVal = activation === 'relu' ? Math.max(0, s) : s;
                        }

                        return (
                            <div 
                                key={`o-${i}-${j}`}
                                className={`w-6 h-6 flex items-center justify-center text-[8px] transition-all duration-200
                                    ${isCurrent ? 'ring-2 ring-green-500 z-10 scale-110' : ''}
                                    ${!isPast && !isCurrent ? 'opacity-30' : ''}
                                `}
                                style={{ 
                                    backgroundColor: (isPast || isCurrent) ? getColor(cellVal) : 'white',
                                    color: (isPast || isCurrent) ? getTextColor(cellVal) : 'gray'
                                }}
                            >
                                {(isPast || isCurrent) ? cellVal.toFixed(1) : '?'}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
