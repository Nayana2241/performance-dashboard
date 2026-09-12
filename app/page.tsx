"use client";

import { useEffect, useRef, useState } from "react";

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

export default function Home() {
  const [data, setData] = useState<Point[]>([]);
  const [range, setRange] = useState(1000);
  const [category, setCategory] = useState("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData(createData());
      }
    } else {
      const initialData = createData();
      setData(initialData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const timer = setInterval(() => {
      setData((old) => {
        const now = Date.now();

        const newPoint: Point = {
          id: now,
          time: now,
          value:
            100 +
            Math.sin(now / 800) * 25 +
            Math.random() * 15,
          category: Math.floor(Math.random() * 5),
        };

        return [...old.slice(-TOTAL + 1), newPoint];
      });
    }, 100);

    return () => clearInterval(timer);
  }, [data.length]);

  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const filtered =
    category === "all"
      ? data.slice(-range)
      : data
          .filter((p) => p.category === Number(category))
          .slice(-range);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || filtered.length === 0) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const values = filtered.map((p) => p.value);
    const min = Math.min(...values) - 10;
    const max = Math.max(...values) + 10;

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;

    ctx.beginPath();

    filtered.forEach((point, i) => {
      const x =
        filtered.length === 1
          ? 0
          : (i / (filtered.length - 1)) * width;

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
    });

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
  }, [filtered]);

  const average =
    filtered.length > 0
      ? filtered.reduce(
          (sum, point) => sum + point.value,
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
    const freshData = createData();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(freshData)
    );

    setData(freshData);
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
            <h2>Real-Time Performance</h2>
            <p>Updates every 100ms</p>
          </div>

          <span className="badge">Canvas</span>
        </div>

        <canvas
          ref={canvasRef}
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
                  <span>Category {cat}</span>

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
                    i % Math.max(filtered.length, 1)
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
            <h2>Data Records</h2>
            <p>Latest records from local database</p>
          </div>

          <span className="record-count">
            {filtered.length.toLocaleString()} records
          </span>
        </div>

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>ID</th>
                <th>TIME</th>
                <th>VALUE</th>
                <th>CATEGORY</th>
              </tr>
            </thead>

            <tbody>

              {filtered
                .slice(-20)
                .reverse()
                .map((point) => (
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

      </section>

      <footer>
        <span>Performance Dashboard</span>

        <span>
          Next.js • TypeScript • Canvas • Local Storage
        </span>
      </footer>

    </main>
  );
}