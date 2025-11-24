import React from 'react';
import { ConvAnimation } from './ConvAnimation';

interface LayerInfo {
  name: string;
  type: string;
  desc: string;
  details: string;
}

const LAYERS: LayerInfo[] = [
  { 
    name: 'Input', 
    type: 'Input Layer', 
    desc: '输入层', 
    details: '接收 28x28 的像素图像。每个像素点代表颜色的深浅（0-255）。' 
  },
  { 
    name: 'conv1', 
    type: 'Conv2D', 
    desc: '卷积层', 
    details: '使用 8 个 5x5 的小窗口（滤波器）扫描图片，提取边缘、线条等特征。就像用不同的滤镜看图片。' 
  },
  { 
    name: 'relu1', 
    type: 'ReLU', 
    desc: '激活层', 
    details: '过滤掉负值，保留正值。就像神经元被激活一样，只有足够强的信号才能通过。' 
  },
  { 
    name: 'pool1', 
    type: 'MaxPooling', 
    desc: '池化层', 
    details: '将图片缩小一半（2x2 -> 1x1），保留最明显的特征，减少计算量。' 
  },
  { 
    name: 'flatten', 
    type: 'Flatten', 
    desc: '扁平化', 
    details: '将二维的图像矩阵“拉直”成一维的长向量，以便连接到全连接层。' 
  },
  { 
    name: 'output', 
    type: 'Dense', 
    desc: '全连接层', 
    details: '综合所有特征，计算出属于 0-9 每个数字的“得分”。' 
  },
];

interface StructurePanelProps {
  activeLayer: string | null;
  onLayerClick: (layerName: string) => void;
  featureMaps?: { [key: string]: string[] }; // Base64 images of feature maps
  conv1Weights?: { kernel: number[][], bias: number } | null;
  inputGrid?: number[][] | null;
}

export const StructurePanel: React.FC<StructurePanelProps> = ({ 
  activeLayer, 
  onLayerClick, 
  featureMaps,
  conv1Weights,
  inputGrid
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col h-full">
      <h3 className="text-lg font-bold mb-4 text-gray-800">2. CNN 结构 (Structure)</h3>
      
      <div className="flex flex-1 gap-4">
        {/* Diagram Column */}
        <div className="flex flex-col items-center gap-2 w-1/3 overflow-y-auto py-2">
          {LAYERS.map((layer, index) => (
            <React.Fragment key={layer.name}>
              <div 
                onClick={() => onLayerClick(layer.name)}
                className={`
                  w-full p-3 rounded-lg border-2 cursor-pointer transition-all text-center relative
                  ${activeLayer === layer.name 
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-105' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                `}
              >
                <div className="font-bold text-gray-700 text-sm">{layer.type}</div>
                <div className="text-xs text-gray-500">{layer.desc}</div>
              </div>
              {index < LAYERS.length - 1 && (
                <div className="h-4 w-0.5 bg-gray-300"></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Details Column */}
        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-y-auto">
          {activeLayer ? (
            <div>
              {LAYERS.filter(l => l.name === activeLayer).map(layer => (
                <div key={layer.name}>
                  <h4 className="font-bold text-blue-600 text-lg mb-2">{layer.type} - {layer.desc}</h4>
                  <p className="text-gray-700 mb-4 leading-relaxed">{layer.details}</p>
                  
                  {/* Convolution Animation */}
                  {layer.name === 'conv1' && conv1Weights && inputGrid && (
                    <div className="mb-6">
                        <ConvAnimation 
                            inputData={inputGrid}
                            kernel={conv1Weights.kernel}
                            bias={conv1Weights.bias}
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            * 演示使用图像中心 10x10 区域和第1个卷积核
                        </p>
                    </div>
                  )}

                  {featureMaps && featureMaps[activeLayer] && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-sm text-gray-600 mb-2">特征图可视化 (Feature Maps):</h5>
                      <div className="grid grid-cols-4 gap-2">
                        {featureMaps[activeLayer].map((src, idx) => (
                          <img 
                            key={idx} 
                            src={src} 
                            alt={`Feature map ${idx}`} 
                            className="w-full aspect-square object-contain bg-black border border-gray-300 rendering-pixelated"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * 这些是该层“看到”的图像特征
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-center">
              <p>点击左侧层级<br/>查看详细说明和可视化</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
