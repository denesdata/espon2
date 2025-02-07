<script>
  export let tooltip;
</script>

{#if tooltip}
  <div 
    class="tooltip"
    style="left: {tooltip.x + 10}px; top: {tooltip.y - 10}px;"
  >
    {@html tooltip.content}
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    pointer-events: none;
    background: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1002;
  }
</style> 