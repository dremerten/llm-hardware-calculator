import { useState, type CSSProperties } from 'react';
import './App.css';
import { MemoryMode, ModelQuantization, KvCacheQuantization } from './types';
import {
  calculateHardwareRecommendation,
  calculateOnDiskSize,
} from './calculations';
import { Tooltip } from './components/Tooltip';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  // -----------------------------------
  // 1. STATE
  // -----------------------------------

  // Model config
  const PARAM_MIN = 1;
  const PARAM_MAX = 500;
  const PARAM_STOPS = [1, 6, 12, 32, 128, 500];
  const PARAM_POSITIONS = [0, 30, 52, 70, 85, 100];
  const PARAM_LABELS = ['<1B', '6B', '12B', '32B', '128B', '<500B'];
  const [params, setParams] = useState<number>(1); // Billions of parameters
  const [modelQuant, setModelQuant] = useState<ModelQuantization>('Q4');

  // KV Cache
  const [useKvCache, setUseKvCache] = useState<boolean>(false); // Changed from true to false
  const [kvCacheQuant, setKvCacheQuant] = useState<KvCacheQuantization>('Q4'); // Changed from 'F16' to 'Q4'

  // Inference mode
  const [inferenceMode, setInferenceMode] = useState<'incremental' | 'bulk'>(
    'incremental'
  );

  // Misc
  const [contextLength, setContextLength] = useState<number>(4096);
  const [memoryMode, setMemoryMode] = useState<MemoryMode>('DISCRETE_GPU');
  const [systemMemory, setSystemMemory] = useState<number>(128); // in GB
  const [gpuVram, setGpuVram] = useState<number>(24); // in GB, default 24GB

  // -----------------------------------
  // 2. HELPER FUNCTIONS
  // -----------------------------------

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const newValue = Number(event.target.value);
    if (!isNaN(newValue)) {
      setter(newValue);
    }
  };

  // -----------------------------------
  // 3. CALCULATE & RENDER
  // -----------------------------------
  const recommendation = calculateHardwareRecommendation(
    params,
    modelQuant,
    contextLength,
    useKvCache,
    kvCacheQuant,
    memoryMode,
    systemMemory,
    gpuVram,
    inferenceMode
  );

  const onDiskSize = calculateOnDiskSize(params, modelQuant);
  const gpuCountText =
    memoryMode === 'DISCRETE_GPU'
      ? recommendation.gpusRequired > 1
        ? `${recommendation.gpusRequired}`
        : recommendation.gpusRequired === 1
          ? '1 (Fits on a single GPU)'
          : 'Exceeds 8 GPUs'
      : 'Not required';

  const getClosestIndex = (value: number, list: number[]) =>
    list.reduce((closestIdx, currentValue, idx) => {
      const currentDiff = Math.abs(currentValue - value);
      const closestDiff = Math.abs(list[closestIdx] - value);
      return currentDiff < closestDiff ? idx : closestIdx;
    }, 0);

  const closestStopIndex = getClosestIndex(params, PARAM_STOPS);
  const sliderPosition = PARAM_POSITIONS[closestStopIndex];
  const sliderStyle = { '--value': `${sliderPosition}%` } as CSSProperties;

  return (
    <div className="App">
      <header className="app-header">
        <div className="title-block">
          <span className="app-pill">LLM Hardware</span>
          <h1>Hardware Calculator</h1>
          <p className="intro-text">
            Pick a model size, tensor type, and context. Set your system.
            Results update instantly.
          </p>
        </div>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="layout">
        {/* Left Panel: Inputs */}
        <div className="input-panel panel">
          <h2 className="section-title">Model Size</h2>

          <label className="label-range">
            <span className="label-text">
              Number of Parameters (Billions)
              <Tooltip text="Set the model size in billions of parameters.">
                i
              </Tooltip>
            </span>
          </label>
          <div className="slider-block">
            <div className="slider-input-row">
              <input
                className="text-input-group"
                type="number"
                min={PARAM_MIN}
                max={PARAM_MAX}
                value={params}
                onChange={(e) => handleInputChange(e, setParams)}
              />
              <span className="value-pill">{params}B</span>
            </div>
            <input
              className="single-range"
              type="range"
              min={0}
              max={100}
              step={1}
              value={sliderPosition}
              style={sliderStyle}
              onChange={(e) => {
                const nextPosition = Number(e.target.value);
                const closestIndex = getClosestIndex(
                  nextPosition,
                  PARAM_POSITIONS
                );
                setParams(PARAM_STOPS[closestIndex]);
              }}
            />
            <div className="slider-ticks">
              {PARAM_LABELS.map((label, idx) => (
                <span
                  key={label}
                  style={{ left: `${PARAM_POSITIONS[idx]}%` }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <label className="label-range">
            <span className="label-text">
              Model Quantization / Tensor Type
              <Tooltip text="Weight format that trades quality for size and speed.">
                i
              </Tooltip>
            </span>
            <select
              value={modelQuant}
              onChange={(e) =>
                setModelQuant(e.target.value as ModelQuantization)
              }
            >
              <option value="F32">F32</option>
              <option value="F16">F16</option>
              <option value="BF16">BF16</option>
              <option value="FP8">FP8</option>
              <option value="INT8">INT8</option>
              <option value="INT4">INT4</option>
              <option value="NF4">NF4</option>
              <option value="Q8">Q8</option>
              <option value="Q6">Q6</option>
              <option value="Q5">Q5</option>
              <option value="Q4">Q4</option>
              <option value="Q3">Q3</option>
              <option value="Q2">Q2</option>
              <option value="GPTQ">GPTQ</option>
              <option value="AWQ">AWQ</option>
            </select>
          </label>


          <label className="label-range">
            <span className="label-text">
              Context Length (Tokens)
              <Tooltip text="Maximum tokens (including prompt and history) available at once. Larger context = more memory usage.">
                i
              </Tooltip>
            </span>
            <input
              className="text-input-group"
              type="number"
              min={128}
              max={32768}
              step={128}
              value={contextLength}
              onChange={(e) => handleInputChange(e, setContextLength)}
            />
          </label>
          <div className="slider-input-group">
            <input
              type="range"
              min={128}
              max={32768}
              step={128}
              value={contextLength}
              onChange={(e) => setContextLength(Number(e.target.value))}
            />
          </div>

          {/* Inference Mode */}
          <label className="label-range">
            <span className="label-text">
              Inference Mode
              <Tooltip text="'Incremental' is streaming token-by-token generation, 'Bulk' processes the entire context in one pass.">
                i
              </Tooltip>
            </span>
            <select
              value={inferenceMode}
              onChange={(e) =>
                setInferenceMode(e.target.value as 'incremental' | 'bulk')
              }
            >
              <option value="incremental">Incremental (streaming)</option>
              <option value="bulk">Bulk (all at once)</option>
            </select>
          </label>

          {/* KV Cache Toggle */}
          <div className="checkbox-row">
            <input
              type="checkbox"
              checked={useKvCache}
              onChange={() => setUseKvCache(!useKvCache)}
              id="kvCache"
            />
            <label htmlFor="kvCache">
              Enable KV Cache
              <Tooltip text="Reuses key/value attention states to accelerate decoding, at the cost of additional VRAM.">
                i
              </Tooltip>
            </label>
          </div>

          {/* 
             (Animated) KV Cache Quant Section:
             We'll wrap it in a div that transitions "max-height"
             so the UI doesn't jump abruptly.
          */}
          <div className={`kvCacheAnimate ${useKvCache ? 'open' : 'closed'}`}>
            <label className="label-range">
              <span className="label-text">
                KV Cache Quantization
                <Tooltip text="Data format for KV cache memory usage. Lower precision reduces memory but may affect performance/quality.">
                  i
                </Tooltip>
              </span>
              <select
                value={kvCacheQuant}
                onChange={(e) =>
                  setKvCacheQuant(e.target.value as KvCacheQuantization)
                }
              >
                <option value="F32">F32</option>
                <option value="F16">F16</option>
                <option value="Q8">Q8</option>
                <option value="Q5">Q5</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <h2 className="section-title">System Configuration</h2>

          <label className="label-range">
            <span className="label-text">System Type</span>
            <select
              value={memoryMode}
              onChange={(e) => setMemoryMode(e.target.value as MemoryMode)}
            >
              <option value="DISCRETE_GPU">Discrete GPU</option>
              <option value="UNIFIED_MEMORY">
                Unified memory (ex: Apple silicon, AMD Ryzen™ Al Max+ 395)
              </option>
            </select>
          </label>

          {memoryMode === 'DISCRETE_GPU' && (
            <>
              <label className="label-range">
                <span className="label-text">GPU VRAM (GB)</span>
                <select
                  value={gpuVram}
                  onChange={(e) => setGpuVram(Number(e.target.value))}
                >
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={20}>20</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                  <option value={40}>40</option>
                  <option value={48}>48</option>
                  <option value={80}>80</option>
                </select>
              </label>
            </>
          )}

          <label className="label-range">
            <span className="label-text">System Memory (GB)</span>
            <input
              className="text-input-group"
              type="number"
              min={8}
              max={512}
              step={8}
              value={systemMemory}
              onChange={(e) => handleInputChange(e, setSystemMemory)}
            />
          </label>
          <div className="slider-input-group">
            <input
              type="range"
              min={8}
              max={512}
              step={8}
              value={systemMemory}
              onChange={(e) => setSystemMemory(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="right-column">
          <div className="results-panel panel panel-warm">
            <div className="panel-header">
              <h2 className="section-title">Hardware Requirements</h2>
              <span className="panel-caption">Single-user inference</span>
            </div>

            <div className="result-grid">
              <div className="result-card primary">
                <span className="result-label">VRAM Needed</span>
                <span className="result-value">
                  {recommendation.vramNeeded} GB
                </span>
              </div>
              <div className="result-card">
                <span className="result-label">On-Disk Size</span>
                <span className="result-value">{onDiskSize.toFixed(2)} GB</span>
              </div>
            </div>

            <div className="result-list">
              <div className="result-row">
                <span className="result-row-label">GPU Config</span>
                <span className="result-row-value">
                  {recommendation.gpuType}
                </span>
              </div>
              <div className="result-row">
                <span className="result-row-label">GPUs Required</span>
                <span className="result-row-value">{gpuCountText}</span>
              </div>

              {memoryMode === 'DISCRETE_GPU' && (
                <div className="result-row">
                  <span className="result-row-label">System RAM</span>
                  <span className="result-row-value">
                    {recommendation.systemRamNeeded.toFixed(1)} GB
                  </span>
                </div>
              )}
            </div>

            {memoryMode === 'UNIFIED_MEMORY' && recommendation.fitsUnified && (
              <div className="status-pill success">
                Fits in unified memory
              </div>
            )}
            {memoryMode === 'UNIFIED_MEMORY' && !recommendation.fitsUnified && (
              <div className="status-pill warning">
                Exceeds unified memory. Increase system RAM or reduce model
                size.
              </div>
            )}
          </div>

          <div className="help-panel panel">
            <div className="panel-header">
              <h2 className="section-title">Help</h2>
              <span className="panel-caption">Tensor types</span>
            </div>
            <p className="help-text">
              Choose a tensor type that balances quality and size for your
              hardware.
            </p>
            <div className="glossary">
              <div className="glossary-title">Tensor Type Glossary</div>
              <ul className="glossary-list">
                <li>
                  <strong>F32</strong> — Full precision. Best quality, largest
                  size.
                </li>
                <li>
                  <strong>F16</strong> — Half precision. Common, smaller than
                  F32.
                </li>
                <li>
                  <strong>BF16</strong> — F16-sized with a wider exponent.
                </li>
                <li>
                  <strong>FP8</strong> — 8-bit float. Very small, quality
                  varies.
                </li>
                <li>
                  <strong>INT8</strong> — 8-bit integer quantization. Smaller,
                  some loss.
                </li>
                <li>
                  <strong>INT4</strong> — 4-bit integer. Very small, more loss.
                </li>
                <li>
                  <strong>NF4</strong> — 4-bit with better distribution for
                  LLMs.
                </li>
                <li>
                  <strong>Q8/Q6/Q5/Q4/Q3/Q2</strong> — 8–2 bit quantization.
                  Lower bits = smaller, more loss.
                </li>
                <li>
                  <strong>GPTQ</strong> — 4-bit GPU-friendly quantization.
                </li>
                <li>
                  <strong>AWQ</strong> — 4-bit optimized to preserve accuracy.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
