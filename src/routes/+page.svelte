<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import scrollama from 'scrollama';

  let container;
  let scroller;
  let step;
  let graphic;
  
  const data = [
    { year: 2010, value: 10 },
    { year: 2011, value: 20 },
    { year: 2012, value: 15 },
    { year: 2013, value: 25 },
    { year: 2014, value: 22 },
    { year: 2015, value: 30 },
  ];

  onMount(() => {
    // Initialize scrollama
    scroller = scrollama();
    
    // Setup the scroller
    scroller
      .setup({
        step: '.step',
        offset: 0.5,
        debug: false
      })
      .onStepEnter(handleStepEnter)
      .onStepExit(handleStepExit);

    // Setup initial visualization
    const svg = d3.select('#viz')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 600 400');

    // Handle resize
    window.addEventListener('resize', scroller.resize);

    return () => {
      scroller.destroy();
      window.removeEventListener('resize', scroller.resize);
    };
  });

  function handleStepEnter({ index }) {
    const svg = d3.select('#viz svg');
    svg.selectAll('*').remove();

    switch(index) {
      case 0:
        createBarChart(svg);
        break;
      case 1:
        createLineChart(svg);
        break;
      case 2:
        createCirclePack(svg);
        break;
    }
  }

  function handleStepExit({ index }) {
    // Optional: Handle exit animations
  }

  function createBarChart(svg) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .range([height, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    x.domain(data.map(d => d.year));
    y.domain([0, d3.max(data, d => d.value)]);

    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value))
      .attr('fill', '#69b3a2');
  }

  function createLineChart(svg) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height, 0]);

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value));

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#69b3a2')
      .attr('stroke-width', 2)
      .attr('d', line);
  }

  function createCirclePack(svg) {
    const diameter = Math.min(600, 400);
    const g = svg.append('g')
      .attr('transform', `translate(${600/2},${400/2})`);

    const pack = d3.pack()
      .size([diameter - 4, diameter - 4]);

    const root = d3.hierarchy({children: data})
      .sum(d => d.value);

    const nodes = pack(root).descendants();

    g.selectAll('circle')
      .data(nodes.slice(1))
      .enter().append('circle')
      .attr('r', d => d.r)
      .attr('cx', d => d.x - diameter/2)
      .attr('cy', d => d.y - diameter/2)
      .attr('fill', '#69b3a2')
      .attr('opacity', 0.7);
  }
</script>

<div class="container" bind:this={container}>
  <div class="graphic" bind:this={graphic}>
    <div id="viz"></div>
  </div>
  
  <div class="scroller" bind:this={step}>
    <div class="step" data-step="1">
      <h2>Bar Chart</h2>
      <p>This is a simple bar chart showing yearly data. As we can see, the trend is generally increasing over time.</p>
    </div>
    
    <div class="step" data-step="2">
      <h2>Line Chart</h2>
      <p>The same data represented as a line chart helps us better visualize the continuous nature of the trend.</p>
    </div>
    
    <div class="step" data-step="3">
      <h2>Circle Pack</h2>
      <p>Finally, we can represent the data as circles, where the size corresponds to the value.</p>
    </div>
  </div>
</div>

<style>
  .container {
    position: relative;
    padding: 1rem;
  }

  .graphic {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
  }

  #viz {
    width: 100%;
    max-width: 600px;
    height: 400px;
  }

  .scroller {
    position: relative;
    padding: 0 1rem;
  }

  .step {
    margin: 0 auto 80vh auto;
    padding: 1rem;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    max-width: 600px;
  }

  h2 {
    margin-top: 0;
  }
</style> 