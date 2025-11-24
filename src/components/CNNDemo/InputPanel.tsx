import React, { useRef, useState, useEffect } from 'react';

interface InputPanelProps {
  onImageReady: (imageData: ImageData) => void;
  disabled?: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onImageReady, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Initialize canvas with white background
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = 'black'; // MNIST is white on black usually, but let's check. 
      // Actually MNIST is white digits on black background.
      // But typically users draw black on white. We can invert it.
      // Let's stick to Black background, White pen for simplicity with MNIST format.
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    updatePreview();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = (e as React.MouseEvent).nativeEvent.offsetX;
        y = (e as React.MouseEvent).nativeEvent.offsetY;
    }

    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      updatePreview();
    }
  };

  const updatePreview = () => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;

    const ctx = preview.getContext('2d');
    if (!ctx) return;

    // Draw scaled down version
    ctx.drawImage(canvas, 0, 0, 28, 28);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, 28, 28);
    onImageReady(imageData);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw image centered and scaled to fit
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            updatePreview();
        }
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">1. 图片输入 (Input)</h3>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
            <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="border-2 border-gray-300 cursor-crosshair touch-none bg-black"
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            />
            <p className="text-xs text-gray-500 mt-1 text-center">请在此处手写数字 0-9</p>
        </div>

        <div className="flex gap-2 w-full justify-center">
            <button 
                onClick={clearCanvas}
                className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm"
                disabled={disabled}
            >
                清除 (Clear)
            </button>
            <label className="px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors cursor-pointer text-sm">
                上传图片
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={disabled} />
            </label>
        </div>

        <div className="flex items-center gap-4 mt-2 p-3 bg-gray-50 rounded-lg w-full">
            <div className="text-sm text-gray-600">
                <p className="font-semibold">预处理结果</p>
                <p className="text-xs">28x28 像素</p>
            </div>
            <canvas 
                ref={previewRef} 
                width={28} 
                height={28} 
                className="border border-gray-400 w-14 h-14 rendering-pixelated bg-black"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
      </div>
    </div>
  );
};
