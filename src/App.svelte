<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import scrollama from 'scrollama';
  import { feature } from 'topojson-client';
  import { toCircle, interpolate } from 'flubber';
  import { interpolatePath } from 'd3-interpolate-path';

  import Toolbox from './components/Toolbox.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import Welcome from './components/Welcome.svelte';

  let container;
  let scroller;
  let step;
  let graphic;
  let layoutMode = $state('overlay');
  let showWelcome = $state(true);
  let currentViz = $state(null);
  let transitioning = $state(false);
  let resizeObserver;
  let mapData = $state({
    nuts0: null,
    nuts2: null
  });
  let currentLevel = $state('nuts2');
  let mapTooltip = $state(null);
  let radarMode = $state('radar');
  let tweenCircleMode = $state(false);
  let originalPaths = $state(new Map());
  let scatterMode = $state(false);
  let previousStep = $state(0);
  
  const data = [
    { year: 2010, value: 10 },
    { year: 2011, value: 20 },
    { year: 2012, value: 15 },
    { year: 2013, value: 25 },
    { year: 2014, value: 22 },
    { year: 2015, value: 30 },
  ];

  const scatterData = [
    { x: 10, y: 8, label: 'Point A' },
    { x: 15, y: 12, label: 'Point B' },
    { x: 20, y: 15, label: 'Point C' },
    { x: 25, y: 18, label: 'Point D' },
    { x: 30, y: 25, label: 'Point E' },
    { x: 35, y: 22, label: 'Point F' },
    { x: 40, y: 28, label: 'Point G' }
  ];

  // Add debounce function
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  onMount(() => {
    // First load the map data
    loadMapData().then(() => {
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

      // Setup initial visualization area
      const svg = d3.select('#viz')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 600 400');

      // Create a single ResizeObserver instance
      resizeObserver = new ResizeObserver(debounce(() => {
        if (!document.body.classList.contains('layout-transitioning')) {
          scroller.resize();
        }
      }, 250));

      // Observe the container
      resizeObserver.observe(container);
    });

    // Return cleanup function
    return () => {
      if (scroller) scroller.destroy();
      if (resizeObserver) resizeObserver.disconnect();
    };
  });

  async function loadMapData() {
    const [nuts0Data, nuts2Data] = await Promise.all([
      d3.json('/data/nuts0_gdppps17_topo.json'),
      d3.json('/data/nuts2_gdppps17_topo.json')
    ]);

    // Filter function to remove French Guyana
    const filterFrenchGuyana = (features) => {
      return features.map(f => {
        if (f.properties.NUTS_ID?.startsWith('FR')) {
          const filtered = { ...f };
          if (filtered.geometry.type === 'MultiPolygon') {
            filtered.geometry = {
              ...filtered.geometry,
              coordinates: filtered.geometry.coordinates.filter(poly => {
                const [lon, lat] = poly[0][0];
                return !(lon < -45 && lat < 10);
              })
            };
          }
          return filtered;
        }
        return f;
      });
    };

    mapData = {
      nuts0: {
        features: filterFrenchGuyana(feature(nuts0Data, nuts0Data.objects.foo).features),
        data: nuts0Data
      },
      nuts2: {
        features: filterFrenchGuyana(feature(nuts2Data, nuts2Data.objects.foo).features),
        data: nuts2Data
      }
    };
  }

  async function transitionToViz(newViz, svg) {
    if (currentViz === newViz && newViz !== 'map' && newViz !== 'radar') return;
    
    transitioning = true;
    
    // Fade out current visualization
    const currentGroup = svg.select('g');
    if (!currentGroup.empty()) {
        await currentGroup
            .transition()
            .duration(500)
            .style('opacity', 0)
            .end();
        
        currentGroup.remove();
    }
    
    // Create new visualization
    switch(newViz) {
        case 'radar':
            createRadarChart(svg);
            break;
        case 'map':
            if (mapData) createMap(svg);
            break;
        case 'bar':
            createBarChart(svg);
            break;
        case 'line':
            createLineChart(svg);
            break;
        case 'circle':
            createCirclePack(svg);
            break;
        case 'scatter':
            createScatterPlot(svg);
            break;
        case 'tween':
            if (mapData) createTweenMap(svg);
            break;
    }
    
    // Fade in new visualization
    svg.select('g')
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);
    
    currentViz = newViz;
    transitioning = false;
  }

  function handleStepEnter({ index, direction }) {
    const svg = d3.select('#viz svg');
    
    showWelcome = index === 0;
    
    // Always reset visualization states when changing steps
    tweenCircleMode = false;
    scatterMode = false;

    switch(index) {
      case 1:
        transitionToViz('bar', svg);
        break;
      case 2:
        transitionToViz('line', svg);
        break;
      case 3:
        transitionToViz('circle', svg);
        break;
      case 4:
        handleRadarModeChange('radar');
        transitionToViz('radar', svg);
        break;
      case 5:
        handleRadarModeChange('flower');
        transitionToViz('radar', svg);
        break;
      case 6:
        // Start with country view
        handleMapLevelChange('nuts0');
        transitionToViz('map', svg);  
        break;
      case 7:
        // New step for region toggle demo
        handleMapLevelChange('nuts2');
        transitionToViz('map', svg);  
        break;
      case 8:
        transitionToViz('scatter', svg);
        break;
      case 9:
        transitionToViz('tween', svg);
        if (direction === 'down') {
          // transitionToViz('tween', svg);
        } else {
          handleCircleModeChange(false);
        }
        break;
      case 10:    
        transitionToViz('tween', svg);
        if (direction === 'down') {
          handleCircleModeChange(true);
        } else {
          // handleScatterModeChange(false);
        }
        break;
      case 11:
        transitionToViz('tween', svg);
        if (direction === 'down') {
          console.log(tweenCircleMode);
          handleScatterModeChange(true);
        } else {
        }
        break;
      case 0:
      default:
        if (currentViz) {
          svg.select('g')
            .transition()
            .duration(500)
            .style('opacity', 0)
            .remove();
          currentViz = null;
        }
        break;
    }
    
    previousStep = index;
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
      .style('opacity', 0)  // Start with opacity 0
      .attr('transform', `translate(${margin.left},${margin.top})`);

    x.domain(data.map(d => d.year));
    y.domain([0, d3.max(data, d => d.value)]);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .call(d3.axisLeft(y));

    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value))
      .attr('fill', '#69b3a2')
      .transition()
      .duration(1000)
      .attr('height', d => height - y(d.value));
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

    const g = svg.append('g')
      .style('opacity', 0)  // Start with opacity 0
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    g.append('g')
      .call(d3.axisLeft(y));

    // Add line
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value));

    const path = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#69b3a2')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Animate line drawing
    const length = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', length + ' ' + length)
      .attr('stroke-dashoffset', length)
      .transition()
      .duration(2000)
      .attr('stroke-dashoffset', 0);
  }

  function createCirclePack(svg) {
    const diameter = Math.min(600, 400);
    const g = svg.append('g')
      .style('opacity', 0)  // Start with opacity 0
      .attr('transform', `translate(${600/2},${400/2})`);

    const pack = d3.pack()
      .size([diameter - 4, diameter - 4]);

    const root = d3.hierarchy({children: data})
      .sum(d => d.value);

    const nodes = pack(root).descendants();

    g.selectAll('circle')
      .data(nodes.slice(1))
      .enter().append('circle')
      .attr('r', 0)
      .attr('cx', d => d.x - diameter/2)
      .attr('cy', d => d.y - diameter/2)
      .attr('fill', '#69b3a2')
      .attr('opacity', 0.7)
      .transition()
      .duration(1000)
      .attr('r', d => d.r);
  }

  function createMap(svg, level = currentLevel, colorScheme = d3.interpolateYlOrRd) {
    const width = 600;
    const height = 400;
    const features = mapData[level].features;

    const g = svg.append('g')
      .style('opacity', 0);

    // Setup projection with custom center and scale for Europe
    const projection = d3.geoMercator()
        .center([10, 55])
        .scale(height * 0.9)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create color scale with the provided color scheme
    const colorScale = d3.scaleSequential(colorScheme)
      .domain([0, d3.max(features, d => d.properties.gdppps17)]);

    // Draw map
    g.selectAll('path')
      .data(features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => colorScale(d.properties.gdppps17))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        mapTooltip = {
          x: event.pageX,
          y: event.pageY,
          content: `
            <strong>${d.properties.NUTS_NAME}</strong><br/>
            GDP PPS: ${d.properties.gdppps17}
          `
        };
      })
      .on('mouseout', () => {
        mapTooltip = null;
      });

    return g;
  }

  function createRadarChart(svg) {
    const width = 600;
    const height = 400;
    const margin = 60;
    const radius = Math.min(width, height) / 2 - margin;

    // Clear previous chart
    svg.selectAll('*').remove();

    const g = svg.append('g')
        .style('opacity', 0)
        .attr('transform', `translate(${width/2},${height/2})`);

    // Calculate metrics from the time series data
    function calculateMetrics(data) {
      // Calculate growth rate
      const growth = data.reduce((acc, curr, i, arr) => {
        if (i === 0) return acc;
        return acc + ((curr.value - arr[i-1].value) / arr[i-1].value);
      }, 0) / (data.length - 1);

      // Calculate volatility (standard deviation of changes)
      const changes = data.slice(1).map((d, i) => 
        (d.value - data[i].value) / data[i].value
      );
      const volatility = Math.sqrt(
        changes.reduce((acc, curr) => acc + Math.pow(curr - growth, 2), 0) / 
          (changes.length - 1)
      );

      // Calculate trend (linear regression slope)
      const xMean = data.reduce((acc, d, i) => acc + i, 0) / data.length;
      const yMean = data.reduce((acc, d) => acc + d.value, 0) / data.length;
      const slope = data.reduce((acc, d, i) => 
        acc + (i - xMean) * (d.value - yMean), 0
      ) / data.reduce((acc, d, i) => acc + Math.pow(i - xMean, 2), 0);

      return {
        "Growth Rate": normalizeValue(growth, -0.5, 0.5),
        "Volatility": normalizeValue(volatility, 0, 0.5),
        "Trend Strength": normalizeValue(slope, -0.5, 0.5),
        "Average Value": normalizeValue(yMean, d3.min(data, d => d.value), d3.max(data, d => d.value)),
        "Range": normalizeValue(
          d3.max(data, d => d.value) - d3.min(data, d => d.value),
          0,
          d3.max(data, d => d.value)
        )
      };
    }

    function normalizeValue(value, min, max) {
      return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    // Get metrics from data
    const metricsData = calculateMetrics(data);
    const metrics = Object.keys(metricsData);
    const processedData = metrics.map(metric => ({
        metric,
        value: metricsData[metric]
    }));

    // Create angle scale based on number of metrics
    const angleScale = d => {
        const idx = metrics.indexOf(d);
        return (idx / metrics.length) * 2 * Math.PI;
    };

    // Scale for radius
    const radiusScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, radius]);

    // Create line generator based on mode
    const lineGenerator = radarMode === 'radar' 
        ? d3.lineRadial()
            .angle(d => angleScale(d.metric))
            .radius(d => radiusScale(d.value))
            .curve(d3.curveLinearClosed)
        : d => {
            // Flower petal mode: create curved paths for each petal
            const paths = [];
            processedData.forEach((datum, i) => {
                const angle = angleScale(datum.metric);
                const nextAngle = angleScale(processedData[(i + 1) % processedData.length].metric);
                const r = radiusScale(datum.value);
                
                // Control points for bezier curve
                const cp1x = r * 1.3 * Math.cos(angle - Math.PI/2);
                const cp1y = r * 1.3 * Math.sin(angle - Math.PI/2);
                const cp2x = r * 0.5 * Math.cos((angle + nextAngle)/2 - Math.PI/2);
                const cp2y = r * 0.5 * Math.sin((angle + nextAngle)/2 - Math.PI/2);
                
                paths.push(`
                    M 0 0
                    L ${r * Math.cos(angle - Math.PI/2)} ${r * Math.sin(angle - Math.PI/2)}
                    C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, 0 0
                    Z
                `);
            });
            return paths.join(' ');
        };

    // Add background circles (only in radar mode)
    if (radarMode === 'radar') {
        const circles = [0.2, 0.4, 0.6, 0.8, 1];
        circles.forEach(value => {
            g.append('circle')
                .attr('r', radiusScale(value))
                .attr('fill', 'none')
                .attr('stroke', '#ddd')
                .attr('stroke-dasharray', '4,4');

            // Add value labels
            g.append('text')
                .attr('y', -radiusScale(value))
                .attr('dy', '0.3em')
                .attr('fill', '#666')
                .attr('font-size', '10px')
                .text(d3.format('.0%')(value));
        });
    }

    // Add axes
    metrics.forEach(metric => {
        const angle = angleScale(metric);
        
        // Add axis line (only in radar mode)
        if (radarMode === 'radar') {
            g.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', radius * Math.cos(angle - Math.PI/2))
                .attr('y2', radius * Math.sin(angle - Math.PI/2))
                .attr('stroke', '#ddd')
                .attr('stroke-width', 1);
        }

        // Add label
        const labelRadius = radius + 25;
        const x = labelRadius * Math.cos(angle - Math.PI/2);
        const y = labelRadius * Math.sin(angle - Math.PI/2);
        
        g.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', x > 0 ? 'start' : x < 0 ? 'end' : 'middle')
            .attr('dominant-baseline', y > 0 ? 'hanging' : y < 0 ? 'baseline' : 'middle')
            .attr('fill', '#666')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(metric);
    });

    // Add visualization shape
    if (radarMode === 'radar') {
        // Radar mode: single connected path
        g.append('path')
            .datum(processedData)
            .attr('d', lineGenerator)
            .attr('fill', '#69b3a2')
            .attr('fill-opacity', 0.3)
            .attr('stroke', '#69b3a2')
            .attr('stroke-width', 2);
    } else {
        // Flower mode: separate petals for each metric
        processedData.forEach((datum, i) => {
            const angle = angleScale(datum.metric);
            const r = radiusScale(datum.value);
            
            // Fixed aspect ratio: height = 3 * width
            const petalHeight = r;
            const petalWidth = petalHeight / 1.5;  // Changed from 5 to 3 for 3:1 ratio
            
            // Calculate angles for the petal width
            const leftAngle = angle - Math.atan2(petalWidth, r);
            const rightAngle = angle + Math.atan2(petalWidth, r);
            
            // Control points for a more rounded shape
            // First control points (near center)
            const cp1x = r * 0.4 * Math.cos(leftAngle - Math.PI/2);
            const cp1y = r * 0.4 * Math.sin(leftAngle - Math.PI/2);
            
            // Second control points (near tip)
            const cp2x = r * 1 * Math.cos(angle - Math.PI/2);
            const cp2y = r * 1 * Math.sin(angle - Math.PI/2);
            
            // Third control points (near center, other side)
            const cp3x = r * 0.4 * Math.cos(rightAngle - Math.PI/2);
            const cp3y = r * 0.4 * Math.sin(rightAngle - Math.PI/2);
            
            // Create individual petal using cubic Bezier curves for both sides
            g.append('path')
                .attr('d', `
                    M 0 0
                    C ${cp1x} ${cp1y}, 
                      ${cp2x} ${cp2y}, 
                      ${r * Math.cos(angle - Math.PI/2)} ${r * Math.sin(angle - Math.PI/2)}
                    C ${cp2x} ${cp2y},
                      ${cp3x} ${cp3y},
                      0 0
                    Z
                `)
                .attr('fill', '#69b3a2')
                .attr('fill-opacity', 0.3)
                .attr('stroke', '#69b3a2')
                .attr('stroke-width', 2);
        });
    }

    // Add points with tooltips (only in radar mode)
    if (radarMode === 'radar') {
        g.selectAll('.point')
            .data(processedData)
            .enter()
            .append('circle')
            .attr('cx', d => radiusScale(d.value) * Math.cos(angleScale(d.metric) - Math.PI/2))
            .attr('cy', d => radiusScale(d.value) * Math.sin(angleScale(d.metric) - Math.PI/2))
            .attr('r', 5)
            .attr('fill', '#69b3a2')
            .on('mouseover', (event, d) => {
                mapTooltip = {
                    x: event.pageX,
                    y: event.pageY,
                    content: `
                        <strong>${d.metric}</strong><br/>
                        Value: ${d3.format('.1%')(d.value)}
                    `
                };
            })
            .on('mouseout', () => {
                mapTooltip = null;
            });
    }

    // Add transition
    g.style('opacity', 1);

    return g;
  }

  function createScatterPlot(svg) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .style('opacity', 0)
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.x)])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.y)])
      .range([height, 0]);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .call(d3.axisLeft(y));

    // Add dots
    g.selectAll('.dot')
      .data(scatterData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', 0)  // Start with radius 0 for animation
      .attr('fill', '#69b3a2')
      .on('mouseover', (event, d) => {
        mapTooltip = {
          x: event.pageX,
          y: event.pageY,
          content: `
            <strong>${d.label}</strong><br/>
            X: ${d.x}<br/>
            Y: ${d.y}
          `
        };
      })
      .on('mouseout', () => {
        mapTooltip = null;
      })
      .transition()
      .duration(1000)
      .attr('r', 6);

    // Get country names and values
    const countryData = new Map();
    scatterData.forEach(d => {
      const countryId = d.label.slice(0, 2);
      const countryName = mapData.nuts0.features.find(f => 
        f.properties.NUTS_ID === countryId)?.properties.NUTS_NAME;
      if (countryName) {
        countryData.set(d.label, countryName);
      }
    });

    // Create Y scale with country names
    const yScale = d3.scalePoint()
      .domain([...new Set(countryData.values())].sort())  // Unique sorted country names
      .range([0, height])
      .padding(0.5);

    // Add Y axis with country names
    g.append('g')
      .attr('class', 'axis y-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height/2)
      .attr('y', -40)
      .style('text-anchor', 'middle')
      .text('Country');

    return g;
  }

  function createTweenMap(svg) {
    const g = createMap(svg, currentLevel, d3.interpolateViridis);
    
    // Store original paths
    originalPaths = new Map();
    g.selectAll('path').each(function(d) {
      const pathData = d3.select(this).attr('d');
      if (pathData) {
        originalPaths.set(d.properties.NUTS_ID, pathData);
      }
    });

    return g;
  }

  function handleMapLevelChange(newLevel) {
    if (currentLevel === newLevel) return;
    
    currentLevel = newLevel;
    
    // Reset both circle and scatter modes when changing levels
    tweenCircleMode = false;
    scatterMode = false;
    
    // Update toggle buttons
    const buttons = document.querySelectorAll('[data-circle-mode], [data-scatter-mode]');
    buttons.forEach(button => {
      if (button.hasAttribute('data-circle-mode')) {
        button.setAttribute('data-circle-mode', 'false');
      }
      if (button.hasAttribute('data-scatter-mode')) {
        button.setAttribute('data-scatter-mode', 'false');
      }
    });
    
    // Update visualization
    if (currentViz === 'map' || currentViz === 'tween') {
      const svg = d3.select('#viz svg');
      svg.selectAll('*').remove();
      createMap(svg, currentLevel, currentViz === 'tween' ? d3.interpolateViridis : d3.interpolateYlOrRd)
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);
    }
  }

  async function handleRadarModeChange(newMode) {
    radarMode = newMode;
    if (currentViz === 'radar') {
        const svg = d3.select('#viz svg');
        // Force a complete redraw by clearing and recreating
        svg.selectAll('*').remove();
        await transitionToViz('radar', svg);
    }
  }

  function handleLayoutChange(newLayout) {
    // Disconnect observer during transition
    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    // Add transitioning class
    document.body.classList.add('layout-transitioning');
    
    // Update layout
    layoutMode = newLayout;
    
    // Remove transitioning class and reconnect observer after transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('layout-transitioning');
        if (resizeObserver) {
          resizeObserver.observe(container);
        }
        scroller.resize();
      });
    });
  }

  function handleCircleModeChange(enabled) {
    // Remove this as we want to handle scatter->map transition directly
    // if (!enabled && scatterMode) {
    //   handleScatterModeChange(false);
    // }
    
    tweenCircleMode = enabled;
    
    // Update all circle mode toggle buttons
    const buttons = document.querySelectorAll('[data-circle-mode]');
    buttons.forEach(button => {
      button.setAttribute('data-circle-mode', enabled);
    });

    if (currentViz === 'tween') {
      const svg = d3.select('#viz svg');
      const paths = svg.selectAll('path');
      
      // Get SVG dimensions and setup projection
      const width = 600;
      const height = 400;
      const projection = d3.geoMercator()
        .center([10, 55])
        .scale(height * 0.9)
        .translate([width / 2, height / 2]);
      
      if (enabled) {
        // Store original paths before transforming
        paths.each(function(d) {
          const path = d3.select(this);
          originalPaths.set(d.properties.NUTS_ID, path.attr('d'));
        });
        
        // Transform to circles
        paths.each(function(d) {
          try {
            const path = d3.select(this);
            const centroid = d3.geoPath().projection(projection).centroid(d);
            
            // Skip regions that are outside our projection view
            if (isNaN(centroid[0]) || isNaN(centroid[1]) || 
                centroid[0] < 0 || centroid[0] > width || 
                centroid[1] < 0 || centroid[1] > height) {
              // console.warn('Skipping out-of-bounds region:', d.properties.NUTS_NAME);
              return;
            }
            
            const bounds = path.node().getBBox();
            const area = bounds.width * bounds.height;
            
            let radius;
            if (d.properties.NUTS_ID?.startsWith('FR')) {
              radius = Math.min(Math.sqrt(area) / 6, Math.min(width, height) / 12);
            } else {
              radius = Math.min(Math.sqrt(area) / 4, Math.min(width, height) / 12);
            }
            
            // Ensure minimum radius
            radius = Math.max(radius, 2);
            
            const pathData = path.attr('d');
            if (!pathData || pathData.trim() === '') {
              console.warn('Invalid path data for:', d.properties.NUTS_NAME);
              return;
            }
            
            const interpolator = toCircle(pathData, centroid[0], centroid[1], radius);
            
            path.transition()
              .duration(750)
              .attrTween('d', () => interpolator);
          } catch (error) {
            console.warn('Error transforming region to circle:', d.properties.NUTS_NAME, error);
          }
        });
      } else {
        // Transform back to original shapes
        paths.each(function(d) {
          try {
            const path = d3.select(this);
            
            // Add null check for d
            if (!d) {
              console.warn('Skipping element with missing data');
              return;
            }

            const originalPath = originalPaths.get(d.properties.NUTS_ID);
            if (!originalPath) return;
            
            // If in scatter mode, use current scatter point as starting position
            if (scatterMode) {
              // Get current position and size from the scatter point
              const bbox = path.node().getBBox();
              const currentX = bbox.x + bbox.width/2;
              const currentY = bbox.y + bbox.height/2;
              const currentRadius = bbox.width/2;
              
              // Create starting circle path at scatter point position
              const startCircle = `M ${currentX},${currentY} m -${currentRadius},0 a ${currentRadius},${currentRadius} 0 1,0 ${currentRadius*2},0 a ${currentRadius},${currentRadius} 0 1,0 -${currentRadius*2},0`;
              
              // Set current path to the circle at scatter position
              path.attr('d', startCircle);
            }
            
            // Use flubber to interpolate from current state to original map shape
            const interpolator = interpolate(path.attr('d'), originalPath, {
              maxSegmentLength: 2,
              string: true
            });
            
            path.transition()
              .duration(750)
              .attrTween('d', () => interpolator);
          } catch (error) {
            console.warn('Error transforming back:', d?.properties?.NUTS_NAME || 'Unknown region', error);
            // If error, force redraw
            const svg = d3.select('#viz svg');
            svg.selectAll('*').remove();
            createTweenMap(svg);
          }
        });

        // Remove scatter axes after the transition
        if (scatterMode) {
          svg.selectAll('.axis')
            .transition()
            .duration(750)
            .style('opacity', 0)
            .remove();
          
          // Update scatter mode state and buttons after transition
          setTimeout(() => {
            scatterMode = false;
            document.querySelectorAll('[data-scatter-mode]').forEach(button => {
              button.setAttribute('data-scatter-mode', 'false');
            });
          }, 750);
        }
      }
    }
  }

  function handleScatterModeChange(enabled) {
    
    scatterMode = enabled;
    
    if (currentViz === 'tween' && tweenCircleMode) {
      const svg = d3.select('#viz svg');
      const paths = svg.selectAll('path');
      
      // Define width and height
      const width = 600;
      const height = 400;
      
      // Setup projection (needed for both enabling and disabling scatter mode)
      const projection = d3.geoMercator()
        .center([10, 55])
        .scale(height * 0.9)
        .translate([width / 2, height / 2]);
      
      if (enabled) {
        // Transform circles to scatter plot
        const padding = 60;
        
        // Clear existing axes
        svg.selectAll('.axis').remove();
        
        // Create random x values for now
        const xValues = new Map();
        
        // Get country codes (ISO2)
        const countryData = new Map();
        paths.each(function(d) {
          const countryId = d.properties.NUTS_ID.slice(0, 2);  // This is already the ISO2 code
          if (countryId) {
            xValues.set(d.properties.NUTS_ID, Math.random());
            countryData.set(d.properties.NUTS_ID, countryId);
          }
        });
        
        // Create scales
        const xScale = d3.scaleLinear()
          .domain([0, 1])
          .range([padding, width - padding]);
        
        const yScale = d3.scalePoint()
          .domain([...new Set(countryData.values())].sort())  // Unique sorted ISO2 codes
          .range([padding, height - padding])
          .padding(0.5);
        
        // Add X axis
        svg.append('g')
          .attr('class', 'axis x-axis')
          .attr('transform', `translate(0,${height - padding/2})`)
          .call(d3.axisBottom(xScale))
          .append('text')
          .attr('class', 'axis-label')
          .attr('x', width/2)
          .attr('y', 40)
          .style('text-anchor', 'middle')
          .text('Random Value');
        
        // Add Y axis
        svg.append('g')
          .attr('class', 'axis y-axis')
          .attr('transform', `translate(${padding/2},0)`)
          .call(d3.axisLeft(yScale))
          .append('text')
          .attr('class', 'axis-label')
          .attr('transform', 'rotate(-90)')
          .attr('x', -height/2)
          .attr('y', -40)
          .style('text-anchor', 'middle')
          .text('Country Code');
        
        // Store original circle positions and sizes
        paths.each(function(d) {
          const path = d3.select(this);
          const bbox = path.node().getBBox();
          d.originalCircle = {
            x: bbox.x + bbox.width/2,
            y: bbox.y + bbox.height/2,
            radius: bbox.width/2
          };
        });
        
        // Transform to scatter plot positions
        paths.each(function(d) {
          const path = d3.select(this);
          const countryName = countryData.get(d.properties.NUTS_ID);
          if (!countryName) return;
          
          const targetX = xScale(xValues.get(d.properties.NUTS_ID));
          const targetY = yScale(countryName);
          const finalRadius = 5; // Final size for scatter plot points
          
          // Get current circle position and size
          const bbox = path.node().getBBox();
          const startX = bbox.x + bbox.width/2;
          const startY = bbox.y + bbox.height/2;
          const startRadius = bbox.width/2;
          
          // Create start circle with current size
          const startCircle = `M ${startX},${startY} m -${startRadius},0 a ${startRadius},${startRadius} 0 1,0 ${startRadius*2},0 a ${startRadius},${startRadius} 0 1,0 -${startRadius*2},0`;
          
          // Create end circle (final position and size)
          const endCircle = `M ${targetX},${targetY} m -${finalRadius},0 a ${finalRadius},${finalRadius} 0 1,0 ${finalRadius*2},0 a ${finalRadius},${finalRadius} 0 1,0 -${finalRadius*2},0`;
          
          // First set the path to the current position and size
          path.attr('d', startCircle);
          
          // Single transition that moves and resizes simultaneously
          path.transition()
            .duration(750)
            .attrTween('d', () => d3.interpolate(startCircle, endCircle));
        });
      } else {
        // Remove axes
        svg.selectAll('.axis').remove();
        
        // Transform back to original circle positions
        paths.each(function(d) {
          try {
            const path = d3.select(this);
            // Skip if we don't have original circle data
            if (!d || !d.originalCircle) {
              path.style('display', 'none');
              return;
            }

            // Check if region should be visible
            const centroid = d3.geoPath().projection(projection).centroid(d);
            
            // Skip regions that are outside our projection view
            if (isNaN(centroid[0]) || isNaN(centroid[1]) || 
                centroid[0] < 0 || centroid[0] > width || 
                centroid[1] < 0 || centroid[1] > height) {
              // Hide the path
              path.style('display', 'none');
              return;
            }
            
            const circle = `M ${d.originalCircle.x},${d.originalCircle.y} m -${d.originalCircle.radius},0 a ${d.originalCircle.radius},${d.originalCircle.radius} 0 1,0 ${d.originalCircle.radius*2},0 a ${d.originalCircle.radius},${d.originalCircle.radius} 0 1,0 -${d.originalCircle.radius*2},0`;
            
            // Show the path and animate
            path.style('display', null)
              .transition()
              .duration(750)
              .attrTween('d', () => d3.interpolate(path.attr('d'), circle));
          } catch (error) {
            // Use optional chaining to prevent null reference error
            console.warn('Error transforming region back to circle:', d?.properties?.NUTS_NAME || 'Unknown region', error);
          }
        });
      }
    }
  }
</script>

<main class={layoutMode}>
  <Toolbox
    {layoutMode}
    {currentViz}
    {currentLevel}
    {radarMode}
    {tweenCircleMode}
    {scatterMode}
    onLayoutChange={handleLayoutChange}
    onMapLevelChange={handleMapLevelChange}
    onRadarModeChange={handleRadarModeChange}
    onCircleModeChange={handleCircleModeChange}
    onScatterModeChange={handleScatterModeChange}
  />

  <div class="container" bind:this={container}>
    <div class="graphic" bind:this={graphic}>
      <div id="viz" class:transitioning>
        <Welcome show={showWelcome} />
      </div>
    </div>
    
    <div class="scroller" bind:this={step}>
      <div class="spacer"></div>
      <div class="step" data-step="0">
        <h2>Welcome</h2>
        <p>In this interactive journey, we'll explore different ways to visualize the same dataset. Each visualization offers a unique perspective on our data.</p>
        <p>Let's start by looking at a simple bar chart...</p>
      </div>
      
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
      
      <div class="step" data-step="4">
        <h2>Radar Chart</h2>
        <p>This radar chart shows multiple dimensions of our data analysis, including value, growth, volatility, trend, and seasonality patterns.</p>
      </div>
      
      <div class="step" data-step="5">
        <h2>Radar & Flower Modes</h2>
        <p>The radar visualization can be toggled between two modes: a traditional radar chart and a flower-like visualization. Try using the toggle in the toolbox to switch between them!</p>
        <p>The flower mode emphasizes individual metrics with petal-like shapes, while the radar mode helps compare relationships between different metrics.</p>
      </div>
      
      <div class="step" data-step="6">
        <h2>European GDP</h2>
        <p>This map shows GDP PPS (Purchasing Power Standard) across European countries. The map starts with a country-level view for a broad overview of economic distribution.</p>
      </div>
      
      <div class="step" data-step="7">
        <h2>Regional Details</h2>
        <p>Using the regions toggle in the toolbox, you can switch to a more detailed view showing GDP at the regional level (NUTS2). This reveals economic variations within countries that might be hidden in the country-level view.</p>
        <p>Try toggling between country and regional views to explore different levels of detail!</p>
      </div>
      
      <div class="step" data-step="8">
        <h2>Scatter Plot</h2>
        <p>Here's a scatter plot showing the relationship between two variables in our dataset. Each point represents a different observation, and hovering over them reveals more details.</p>
      </div>
      
      <div class="step" data-step="9">
        <h2>Tween Map</h2>
        <p>This is another choropleth map visualization that shows the same GDP data but with a different color scheme. Like the previous map, you can switch between country and regional views to explore different levels of detail.</p>
      </div>
      
      <div class="step" data-step="10">
        <h2>Circle Transformation</h2>
        <p>Using the circle toggle, we can transform each region into a circle while maintaining its relative position. The size of each circle corresponds to the region's area.</p>
        <p>This transformation helps to standardize the visual representation of regions that might have very different shapes and sizes in the original map.</p>
      </div>
      
      <div class="step" data-step="11">
        <h2>Scatter View</h2>
        <p>Finally, with the scatter toggle, we can reorganize these circles into a scatter plot arrangement. This view helps visualize relationships between different metrics across regions.</p>
        <p>The vertical position represents the country, while the horizontal position shows a randomly distributed value (which could be replaced with any other metric of interest).</p>
      </div>
    </div>
  </div>

  <Tooltip tooltip={mapTooltip} />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    width: 100%;
    min-height: 100vh;
  }

  .container {
    position: relative;
    padding: 1rem;
    transition: grid-template-columns 0.2s ease-out;
    min-height: 100vh;
    will-change: transform;
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
    z-index: 1;
    transition: transform 0.2s ease-out, top 0.2s ease-out;
  }

  #viz {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: 400px;
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }

  #viz.transitioning {
    pointer-events: none;
  }

  .scroller {
    position: relative;
    padding: 0 1rem;
    z-index: 2;
    display: flex;
    flex-direction: column;
    transition: padding-top 0.2s ease-out;
  }

  .spacer {
    height: 100vh;
  }

  .step {
    margin: 0 0 100vh 0;
    padding: 2rem;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #eee;
    border-radius: 8px;
    max-width: 600px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin-top: 0;
    color: #2c3e50;
  }

  p {
    line-height: 1.6;
    color: #34495e;
  }

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

  .viz-control {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    color: #666;
  }

  .layout-toggle {
    display: flex;
    gap: 0.5rem;
  }

  /* Update the layout styles */
  .side-by-side .container {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
    padding: 1rem;
    max-width: 1400px;
    margin: 0 auto;
    align-items: start;
    transition: grid-template-columns 0.2s ease-out;
  }

  .side-by-side .graphic {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);
    height: 100vh;
    max-height: 800px;
    width: 100%;
  }

  .side-by-side .scroller {
    padding-top: 100vh;
    width: 100%;
  }

  .overlay .container {
    display: block;
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

    .side-by-side .container {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .side-by-side .graphic {
      position: relative;
      transform: none;
      height: 50vh;
      max-height: 400px;
      transition: height 0.2s ease-out, transform 0.2s ease-out;
    }

    .side-by-side .scroller {
      padding-top: 2rem;
    }
  }

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

  /* Prevent transitions during layout change */
  :global(body.layout-transitioning) * {
    transition: none !important;
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
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

  :global([data-level="nuts2"]) .toggle-switch,
  :global([data-mode="true"]) .toggle-switch {
    background: #2c3e50;
  }

  :global([data-level="nuts2"]) .toggle-slider,
  :global([data-mode="true"]) .toggle-slider {
    transform: translateX(16px);
  }

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

  :global(.axis-label) {
    fill: #2c3e50;
    font-size: 12px;
    font-weight: bold;
  }

  :global(.axis path),
  :global(.axis line) {
    stroke: #ccc;
  }

  :global(.axis text) {
    fill: #666;
    font-size: 10px;
  }
</style> 