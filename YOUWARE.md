# YOUWARE.md

# AI+芯片课程：CNN 可视化教学网页

这是一个基于 React + TensorFlow.js 的教育类网页应用，旨在向中学生展示卷积神经网络（CNN）的工作原理。

## 项目概述

- **核心功能**：手写数字识别、CNN 结构可视化、实时训练演示、**动态卷积过程演示**。
- **技术栈**：
  - **前端框架**：React 18 + TypeScript + Vite
  - **AI 引擎**：TensorFlow.js (在浏览器端运行模型)
  - **图表库**：Chart.js + react-chartjs-2
  - **动画库**：Framer Motion (用于卷积动画)
  - **样式**：Tailwind CSS

## 关键组件架构

### 1. 数据层 (`src/utils/`)
- `mnist-data.ts`: 负责从 Google Storage 加载 MNIST 数据集（Sprite 图片 + 标签二进制文件），并提供 `nextTrainBatch` 和 `nextTestBatch` 方法。
- `cnn-model.ts`: 定义 CNN 模型结构，封装 `trainModel`（训练循环）和 `predict`（预测与特征提取）逻辑。
  - **新增功能**：`preprocessImage` 自动将用户手写图片进行居中和缩放，以匹配 MNIST 数据集格式，显著提高识别准确率。
  - **参数调整**：默认训练集大小增加至 2000 张，以提高模型泛化能力。

### 2. 视图层 (`src/components/CNNDemo/`)
- `index.tsx`: 主控制器。管理模型状态、训练日志、当前图片、预测结果。
  - **新增功能**：支持“继续训练”模式，允许用户在现有模型基础上追加训练 Epoch。
  - **新增功能**：支持“重置模型”，方便重新开始演示。
- `InputPanel.tsx`: 提供 Canvas 画板，支持鼠标/触摸绘制，并实时输出 28x28 的 `ImageData`。
- `StructurePanel.tsx`: 展示 CNN 层级结构。点击层级可查看说明及该层的 Feature Map 可视化。集成 `ConvAnimation` 组件。
- `TrainingPanel.tsx`: 使用 Chart.js 绘制 Loss/Accuracy 实时曲线，展示预测概率分布。支持“开始/继续/重置”三种状态切换。
- `ConvAnimation.tsx`: 展示卷积核在输入图像上滑动的动态过程，包含详细的加权求和计算步骤。

## 开发与运行

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 教学使用指南

1. **演示准备**：
   - 确保网络通畅（首次加载 MNIST 数据需要下载约 10MB 数据）。
   - 提前打开网页，等待 "Loading MNIST" 结束。

2. **课堂流程**：
   - **引入**：让学生在左侧画板写一个数字，点击“识别”。此时模型未训练，结果是随机的（借此引入“训练”的概念）。
   - **讲解结构**：点击中间的“卷积层”、“池化层”，结合右侧说明解释 AI 是如何提取特征的。
   - **动态演示**：点击“卷积层”，在下方可以看到卷积核滑动的动画。点击“播放”按钮，观察计算过程。
   - **开始训练**：点击“开始训练”，观察 Loss 下降和 Accuracy 上升。解释这是 AI 在“刷题”和“对答案”。
   - **验证**：训练完成后，再次识别刚才的数字，展示 AI 变聪明了。
   - **提高准确率**：如果识别不准，可以点击“继续训练”让 AI 多学几遍，或者提醒学生将数字写大、写在中间（系统会自动居中优化，但原始输入质量仍有影响）。
   - **探究**：让学生画一些奇怪的图形或写得很潦草，看看 AI 会识别成什么，讨论 AI 的局限性。

## 扩展作业建议

- **修改网络结构**：在 `src/utils/cnn-model.ts` 中增加或减少卷积层，观察训练速度和准确率的变化。
- **调整超参数**：修改 `BATCH_SIZE` 或 `epochs`，观察对收敛速度的影响。
