<script>
  export let show = false;
</script>

{#if show}
  <div class="welcome-overlay">
    <h1>Data Visualization Journey</h1>
    <p>Scroll down to explore different ways to visualize data</p>
    <div class="scroll-indicator">↓</div>
  </div>
{/if}

<style>
  .welcome-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: opacity 0.3s ease;
  }
  
  .welcome-overlay p {
    font-size: 1.2rem;
    color: #34495e;
    max-width: 600px;
    margin-bottom: 2rem;
  }

  .scroll-indicator {
    font-size: 2rem;
    color: #2c3e50;
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-20px);
    }
    60% {
      transform: translateY(-10px);
    }
  }
</style> 