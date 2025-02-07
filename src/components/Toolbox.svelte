<script>
  export let layoutMode;
  export let currentViz;
  export let currentLevel;
  export let radarMode;
  export let tweenCircleMode;
  export let scatterMode;
  export let onLayoutChange;
  export let onMapLevelChange;
  export let onRadarModeChange;
  export let onCircleModeChange;
  export let onScatterModeChange;

  function handleShowCountriesChange() {
    if (tweenCircleMode) {
      onCircleModeChange(false);
    }
    if (scatterMode) {
      onScatterModeChange(false);
    }
    onMapLevelChange(currentLevel === 'nuts0' ? 'nuts2' : 'nuts0');
  }

  function handleShowCirclesChange() {
    if (tweenCircleMode && scatterMode) {
      onScatterModeChange(false);
    }
    onCircleModeChange(!tweenCircleMode);
  }
</script>

<div class="toolbox">
  <div class="tool-section">
    <div class="layout-toggle">
      <button 
        class:active={layoutMode === 'overlay'} 
        on:click={() => onLayoutChange('overlay')}
      >
        Overlay
      </button>
      <button 
        class:active={layoutMode === 'side-by-side'} 
        on:click={() => onLayoutChange('side-by-side')}
      >
        Side by Side
      </button>
    </div>
  </div>

  <div class="tool-section">
    {#if currentViz === 'map'}
      <button 
        class="toggle-button"
        data-level={currentLevel}
        on:click={handleShowCountriesChange}
      >
        {currentLevel === 'nuts0' ? 'Show Regions' : 'Show Countries'}
        <div class="toggle-switch">
          <div class="toggle-slider"></div>
        </div>
      </button>
    {:else if currentViz === 'tween'}
      <div class="toggle-group">
        <button 
          class="toggle-button"
          data-level={currentLevel}
          on:click={handleShowCountriesChange}
        >
          {currentLevel === 'nuts0' ? 'Show Regions' : 'Show Countries'}
          <div class="toggle-switch">
            <div class="toggle-slider"></div>
          </div>
        </button>
        <button 
          class="toggle-button" 
          data-circle-mode={tweenCircleMode} 
          on:click={handleShowCirclesChange}
        >
          <span>Show Circles</span>
          <div class="toggle-switch">
            <div class="toggle-slider"></div>
          </div>
        </button>

        <button 
          class="toggle-button" 
          class:disabled={!tweenCircleMode}
          data-scatter-mode={scatterMode} 
          on:click={() => tweenCircleMode && onScatterModeChange(!scatterMode)}
        >
          <span>Scatter View</span>
          <div class="toggle-switch">
            <div class="toggle-slider"></div>
          </div>
        </button>
      </div>
    {:else if currentViz === 'radar'}
      <button 
        class="toggle-button"
        data-mode={radarMode}
        on:click={() => onRadarModeChange(radarMode === 'radar' ? 'flower' : 'radar')}
      >
        {radarMode === 'radar' ? 'Show Flower' : 'Show Radar'}
        <div class="toggle-switch">
          <div class="toggle-slider"></div>
        </div>
      </button>
    {:else if currentViz}
      <select class="viz-control" disabled>
        <option>Visualization Options</option>
      </select>
    {/if}
  </div>
</div>

<style>
  .toolbox {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    background: white;
    padding: 0.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .tool-section {
    display: flex;
    align-items: center;
  }

  .tool-section:not(:last-child) {
    padding-right: 1rem;
    border-right: 1px solid #eee;
  }

  .layout-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .layout-toggle button {
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .layout-toggle button:hover {
    background: #e0e0e0;
  }

  .layout-toggle button.active {
    background: #69b3a2;
    color: white;
    border-color: #69b3a2;
  }

  .toggle-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    background: #f8f9fa;
  }

  .toggle-switch {
    width: 36px;
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    position: relative;
    transition: background 0.2s ease;
  }

  .toggle-slider {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* Add these styles for both radar mode and map/tween level toggles */
  [data-mode="flower"] .toggle-switch,
  [data-level="nuts2"] .toggle-switch {
    background: #69b3a2;
  }

  [data-mode="flower"] .toggle-slider,
  [data-level="nuts2"] .toggle-slider {
    transform: translateX(16px);
  }

  .viz-control {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    color: #666;
  }

  @media (max-width: 768px) {
    .toolbox {
      bottom: 1rem;
      top: auto;
      right: 50%;
      transform: translateX(50%);
      flex-direction: column;
      gap: 0.5rem;
    }

    .tool-section:not(:last-child) {
      padding-right: 0;
      padding-bottom: 0.5rem;
      border-right: none;
      border-bottom: 1px solid #eee;
    }
  }

  .toggle-group {
    display: flex;
    gap: 1rem;
  }

  /* Update the toggle styles to use data-circle-mode */
  [data-circle-mode="true"] .toggle-switch {
    background: #2c3e50;
  }

  [data-circle-mode="true"] .toggle-slider {
    transform: translateX(16px);
  }

  /* Add these styles */
  [data-scatter-mode="true"] .toggle-switch {
    background: #2c3e50;
  }

  [data-scatter-mode="true"] .toggle-slider {
    transform: translateX(16px);
  }

  .toggle-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-button.disabled .toggle-switch {
    background: #ccc;
  }
</style> 