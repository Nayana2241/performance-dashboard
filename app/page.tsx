"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  id: number;
  time: number;
  value: number;
  category: number;
};

const TOTAL = 10000;
const STORAGE_KEY = "performance-dashboard-data";

function createData(): Point[] {
  const data: Point[] = [];
  const now = Date.now();

  for (let i = 0; i < TOTAL; i++) {
    data.push({
      id: i,
      time: now - (TOTAL - i) * 100,
      value:
        100 +
        Math.sin(i / 80) * 25 +
        Math.sin(i / 15) * 8 +
        Math.random() * 15,
      category: i % 5,
    });
  }

  return data;
}

function aggregateData(
  points: Point[],
  minutes: number
): Point[] {
  if (minutes === 1) return points;

  const bucket = minutes * 60 * 1000;
  const groups = new Map<number, Point[]>();

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const key = Math.floor(point.time / bucket) * bucket;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(point);
  }

  const result: Point[] = [];

  groups.forEach((group, time) => {
    let total = 0;

    for (let i = 0; i < group.length; i++) {
      total += group[i].value;
    }

    result.push({
      id: group[0].id,
      time,
      value: total / group.length,
      category: group[0].category,
    });
  });

  return result;
}

export default function Home() {
  const [data, setData] = useState<Point[]>([]);
  const [range, setRange] = useState(1000);
  const [category, setCategory] = useState("all");
  const [aggregation, setAggregation] = useState(1);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);

  const [tableStart, setTableStart] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);
  const dragStart = useRef(0);
  const initialPan = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData(createData());
      }
    } else {
      const initial = createData();
      setData(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const timer = setInterval(() => {
      setData((old) => {
        const now = Date.now();

        const point: Point = {
          id: now,
          time: now,
          value:
            100 +
            Math.sin(now / 800) * 25 +
            Math.random() * 15,
          category: Math.floor(Math.random() * 5),
        };

        return [...old.slice(-TOTAL + 1), point];
      });
    }, 100);

    return () => clearInterval(timer);
  }, [data.length]);

  useEffect(() => {
    if (data.length > 0) {
      const saveTimer = setTimeout(() => {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data)
        );
      }, 500);

      return () => clearTimeout(saveTimer);
    }
  }, [data]);

  const filtered = useMemo(() => {
    const selected =
      category === "all"
        ? data
        : data.filter(
            (p) => p.category === Number(category)
          );

    return selected.slice(-range);
  }, [data, category, range]);

  const aggregated = useMemo(() => {
    return aggregateData(filtered, aggregation);
  }, [filtered, aggregation]);

  useEffect(() => {
    setPan(0);
    setZoom(1);
  }, [range, category, aggregation]);

  function drawLineChart() {
    const canvas = canvasRef.current;

    if (!canvas || aggregated.length === 0) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const values = aggregated.map((p) => p.value);

    const min = Math.min(...values) - 10;
    const max = Math.max(...values) + 10;

    const visibleCount = Math.max(
      2,
      Math.floor(aggregated.length / zoom)
    );

    const maxStart = Math.max(
      0,
      aggregated.length - visibleCount
    );

    const start = Math.min(
      maxStart,
      Math.max(0, Math.floor(pan))
    );

    const visible = aggregated.slice(
      start,
      start + visibleCount
    );

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;

    ctx.beginPath();

    for (let i = 0; i < visible.length; i++) {
      const point = visible[i];

      const x =
        visible.length === 1
          ? 0
          : (i / (visible.length - 1)) * width;

      const y =
        height -
        ((point.value - min) / (max - min)) *
          (height - 20) -
        10;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    ctx.strokeStyle = "rgba(148,163,184,0.15)";
    ctx.lineWidth = 1;

    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawScatterPlot() {
    const canvas = scatterRef.current;

    if (!canvas || filtered.length === 0) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const values = filtered.map((p) => p.value);

    const min = Math.min(...values) - 5;
    const max = Math.max(...values) + 5;

    ctx.fillStyle = "#38bdf8";

    for (
      let i = 0;
      i < filtered.length;
      i += Math.max(1, Math.floor(filtered.length / 1500))
    ) {
      const point = filtered[i];

      const x =
        (i / Math.max(filtered.length - 1, 1)) *
        width;

      const y =
        height -
        ((point.value - min) / (max - min)) *
          (height - 20) -
        10;

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(148,163,184,0.15)";
    ctx.lineWidth = 1;

    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  useEffect(() => {
    drawLineChart();
  }, [aggregated, zoom, pan]);

  useEffect(() => {
    drawScatterPlot();
  }, [filtered]);

  useEffect(() => {
    function resize() {
      drawLineChart();
      drawScatterPlot();
    }

    window.addEventListener("resize", resize);

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  });

  function handleWheel(
    event: React.WheelEvent<HTMLCanvasElement>
  ) {
    event.preventDefault();

    setZoom((old) => {
      if (event.deltaY < 0) {
        return Math.min(old * 1.2, 10);
      }

      return Math.max(old / 1.2, 1);
    });
  }

  function startPan(
    event: React.MouseEvent<HTMLCanvasElement>
  ) {
    dragging.current = true;
    dragStart.current = event.clientX;
    initialPan.current = pan;
  }

  function movePan(
    event: React.MouseEvent<HTMLCanvasElement>
  ) {
    if (!dragging.current) return;

    const difference =
      dragStart.current - event.clientX;

    const movement = difference / 5;

    setPan(
      Math.max(
        0,
        Math.min(
          Math.max(
            0,
            aggregated.length -
              Math.floor(
                aggregated.length / zoom
              )
          ),
          initialPan.current + movement
        )
      )
    );
  }

  function stopPan() {
    dragging.current = false;
  }

  function resetView() {
    setZoom(1);
    setPan(0);
  }

  function handleTableScroll() {
    const table = tableRef.current;

    if (!table) return;

    const rowHeight = 42;

    const start = Math.floor(
      table.scrollTop / rowHeight
    );

    setTableStart(start);
  }

  const tableData = filtered.slice().reverse();

  const visibleRows = tableData.slice(
    tableStart,
    tableStart + 25
  );

  const average =
    filtered.length > 0
      ? filtered.reduce(
          (sum, p) => sum + p.value,
          0
        ) / filtered.length
      : 0;

  const maximum = Math.max(
    ...filtered.map((p) => p.value),
    0
  );

  const minimum = Math.min(
    ...filtered.map((p) => p.value),
    0
  );

  function resetDatabase() {
    const fresh = createData();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(fresh)
    );

    setData(fresh);
  }

  return (
    <main className="dashboard">

      <header className="header">

        <div>
          <div className="brand">
            <div className="logo">PD</div>
            Performance Analytics
          </div>

          <h1>Real-Time Data Dashboard</h1>

          <p>
            High-performance visualization with
            10,000+ data points
          </p>
        </div>

        <div className="live">
          <span></span>
          LIVE
        </div>

      </header>

      <section className="controls">

        <div className="control-group">
          <label>Time Range</label>

          <select
            value={range}
            onChange={(e) =>
              setRange(Number(e.target.value))
            }
          >
            <option value={100}>100 points</option>
            <option value={500}>500 points</option>
            <option value={1000}>1,000 points</option>
            <option value={5000}>5,000 points</option>
            <option value={10000}>10,000 points</option>
          </select>
        </div>

        <div className="control-group">
          <label>Category</label>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="all">All Categories</option>
            <option value="0">Category 0</option>
            <option value="1">Category 1</option>
            <option value="2">Category 2</option>
            <option value="3">Category 3</option>
            <option value="4">Category 4</option>
          </select>
        </div>

        <div className="control-group">
          <label>Aggregation</label>

          <select
            value={aggregation}
            onChange={(e) =>
              setAggregation(Number(e.target.value))
            }
          >
            <option value={1}>1 Minute</option>
            <option value={5}>5 Minutes</option>
            <option value={60}>1 Hour</option>
          </select>
        </div>

        <button
          className="database-button"
          onClick={resetView}
        >
          Reset Zoom
        </button>

        <button
          className="database-button"
          onClick={resetDatabase}
        >
          Reset Database
        </button>

      </section>

      <section className="stats">

        <div className="card">
          <span>DATA POINTS</span>
          <strong>
            {data.length.toLocaleString()}
          </strong>
          <small>Stored records</small>
        </div>

        <div className="card">
          <span>AVERAGE</span>
          <strong>{average.toFixed(2)}</strong>
          <small>Current value</small>
        </div>

        <div className="card">
          <span>MAXIMUM</span>
          <strong>{maximum.toFixed(2)}</strong>
          <small>Peak value</small>
        </div>

        <div className="card">
          <span>MINIMUM</span>
          <strong>{minimum.toFixed(2)}</strong>
          <small>Lowest value</small>
        </div>

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>
            <h2>Real-Time Line Chart</h2>

            <p>
              Scroll to zoom • Drag to pan
            </p>
          </div>

          <span className="badge">
            Canvas
          </span>

        </div>

        <canvas
          ref={canvasRef}
          className="chart interactive-chart"
          onWheel={handleWheel}
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={stopPan}
          onMouseLeave={stopPan}
        />

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>
            <h2>Scatter Plot</h2>

            <p>
              Value distribution across data points
            </p>
          </div>

          <span className="badge">
            Canvas
          </span>

        </div>

        <canvas
          ref={scatterRef}
          className="chart"
        />

      </section>

      <section className="grid">

        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>Category Distribution</h2>
              <p>Current filtered dataset</p>
            </div>

          </div>

          <div className="bars">

            {[0, 1, 2, 3, 4].map((cat) => {

              const count = filtered.filter(
                (p) => p.category === cat
              ).length;

              const percent = filtered.length
                ? (count / filtered.length) * 100
                : 0;

              return (
                <div
                  className="bar-row"
                  key={cat}
                >
                  <span>
                    Category {cat}
                  </span>

                  <div className="bar-background">
                    <div
                      className="bar"
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>

                  <b>{count}</b>
                </div>
              );
            })}

          </div>

        </div>

        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>Data Heatmap</h2>
              <p>Real-time activity</p>
            </div>

          </div>

          <div className="heatmap">

            {Array.from({ length: 100 }).map(
              (_, i) => {

                const value =
                  filtered[
                    i %
                      Math.max(
                        filtered.length,
                        1
                      )
                  ]?.value || 0;

                const intensity = Math.min(
                  Math.max(value / 150, 0.2),
                  1
                );

                return (
                  <div
                    key={i}
                    className="heat-cell"
                    style={{
                      opacity: intensity,
                    }}
                  />
                );
              }
            )}

          </div>

        </div>

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>
            <h2>Virtualized Data Records</h2>

            <p>
              Only visible rows are rendered
            </p>
          </div>

          <span className="record-count">
            {filtered.length.toLocaleString()} records
          </span>

        </div>

        <div
          ref={tableRef}
          className="virtual-table"
          onScroll={handleTableScroll}
        >

          <div
            style={{
              height: `${tableData.length * 42}px`,
              position: "relative",
            }}
          >

            <table
              className="virtual-table-content"
              style={{
                position: "absolute",
                top: `${tableStart * 42}px`,
                left: 0,
                right: 0,
              }}
            >

              <thead>
                <tr>
                  <th>ID</th>
                  <th>TIME</th>
                  <th>VALUE</th>
                  <th>CATEGORY</th>
                </tr>
              </thead>

              <tbody>

                {visibleRows.map((point) => (
                  <tr key={point.id}>

                    <td>
                      #{String(point.id).slice(-6)}
                    </td>

                    <td>
                      {new Date(
                        point.time
                      ).toLocaleTimeString()}
                    </td>

                    <td>
                      {point.value.toFixed(2)}
                    </td>

                    <td>
                      <span className="category-badge">
                        {point.category}
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </section>

      <footer>

        <span>
          Performance Dashboard
        </span>

        <span>
          Next.js • TypeScript • Canvas •
          Real-Time • Local Storage
        </span>

      </footer>

    </main>
  );
}