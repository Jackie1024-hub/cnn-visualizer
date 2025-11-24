import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TrainingPanelProps {
  isTraining: boolean;
  logs: { epoch: number; loss: number; acc: number }[];
  onStartTraining: () => void;
  onReset: () => void;
  onPredict: () => void;
  prediction: { label: number; probabilities: number[] } | null;
  trainingProgress: number; // 0-100
}

export const TrainingPanel: React.FC<TrainingPanelProps> = ({
  isTraining,
  logs,
  onStartTraining,
  onReset,
  onPredict,
  prediction,
  trainingProgress
}) => {
  const chartData = {
    labels: logs.map((_, i) => `E${i + 1}`),
    datasets: [
      {
        label: 'Loss (损失)',
        data: logs.map(l => l.loss),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Accuracy (准确率)',
        data: logs.map(l => l.acc),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Loss' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 1,
        title: { display: true, text: 'Accuracy' }
      },
    },
    animation: {
        duration: 0 // Disable animation for real-time updates
    }
  };

  const hasTrained = logs.length > 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col h-full">
      <h3 className="text-lg font-bold mb-4 text-gray-800">3. 训练与预测 (Training & Predict)</h3>

      {/* Training Controls */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
            <button
            onClick={onStartTraining}
            disabled={isTraining}
            className={`
                flex-1 px-4 py-2 rounded-lg font-bold text-white transition-all
                ${isTraining 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl'}
            `}
            >
            {isTraining 
                ? '训练中... (Training)' 
                : hasTrained 
                    ? '继续训练 (Train More)' 
                    : '开始训练 (Start Training)'}
            </button>
            
            {hasTrained && (
                <button
                    onClick={onReset}
                    disabled={isTraining}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-bold"
                >
                    重置 (Reset)
                </button>
            )}
        </div>
        
        {isTraining && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${trainingProgress}%` }}
                ></div>
                <p className="text-xs text-center mt-1 text-gray-600">正在学习数据特征...</p>
            </div>
        )}

        <div className="h-48 w-full border border-gray-100 rounded p-2">
            <Line options={options} data={chartData} />
        </div>
      </div>

      <hr className="border-gray-200 my-4" />

      {/* Prediction Controls */}
      <div className="flex-1 flex flex-col">
        <button
          onClick={onPredict}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md mb-4"
        >
          识别图片内容 (Predict)
        </button>

        {prediction ? (
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex-1 overflow-y-auto">
            <div className="text-center mb-4">
                <span className="text-gray-600 text-sm">我认为这是：</span>
                <div className="text-5xl font-bold text-indigo-600 mt-1">{prediction.label}</div>
            </div>
            
            <div className="space-y-2">
                {prediction.probabilities.map((prob, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-4 font-bold text-gray-500">{idx}</span>
                        <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${prob * 100}%` }}
                            ></div>
                        </div>
                        <span className="w-10 text-right text-gray-600">{(prob * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
          </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
                请先训练模型，然后点击识别
            </div>
        )}
      </div>
    </div>
  );
};
