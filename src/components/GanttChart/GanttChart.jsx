import { useState, useEffect } from "react";
import ProcessSubtitle from "../ProcessSubtitle/ProcessSubtitle";
// Styles
import s from "./GanttChart.module.css";

export default function GanttChart({ schedulerMatrix, schedulerType, delay }) {
  const barHeight = 36;
  const barPadding = 12;
  const labelPadding = 110;

  const colors = {
    default: "#059669",
    overload: "#ef4444",
    deadlineFinished: "#374151",
    waiting: "#cbd5e1",
  };

  const maxTime = schedulerMatrix.reduce(
    (max, process) =>
      Math.max(max, ...process.segments.map((segment) => segment.endTime)),
    0
  );

  const chartHeight = (barHeight + barPadding) * schedulerMatrix.length + 50;
  
  const [chartWidth, setChartWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      const windowElement = document.getElementById("window");
      if (windowElement) {
        setChartWidth(windowElement.clientWidth - labelPadding - 40); 
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [labelPadding]);

  const [currentMaxTime, setCurrentMaxTime] = useState(0);

  useEffect(() => {
    let intervalTime = delay * 1000;
    const interval = setInterval(() => {
      setCurrentMaxTime((prev) => Math.min(prev + 1, maxTime));
      if (currentMaxTime >= maxTime) {
        clearInterval(interval);
      }
    }, intervalTime);
    return () => clearInterval(interval);
  }, [currentMaxTime, maxTime, delay]);

  const getFillColor = (segment) => {
    if (segment.isOverload) return colors.overload;
    if (segment.isDeadlineFinished) return colors.deadlineFinished;
    if (segment.isWaiting) return colors.waiting;
    return colors.default;
  };

  return (
    <>
      <svg
        className={s.ganttChartWrapper}
        width={chartWidth + labelPadding}
        height={chartHeight}
      >
        {schedulerMatrix.map((process, index) => (
          <g key={process.id}>
            {process.segments.map((segment, segmentIndex) => {
              if (segment.startTime > currentMaxTime) return null;
              const safeMaxTime = maxTime === 0 ? 1 : maxTime;
              const barWidth =
                ((Math.min(segment.endTime, currentMaxTime) -
                  segment.startTime) /
                  safeMaxTime) *
                chartWidth;
              const x =
                (segment.startTime / safeMaxTime) * chartWidth + labelPadding;
              const y = index * (barHeight + barPadding);
              return (
                <rect
                  key={segmentIndex}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={getFillColor(segment)}
                  stroke="#ffffff" 
                  strokeWidth="2"
                  rx="6"
                />
              );
            })}
            <text
              className={s.processName}
              x={labelPadding - 20}
              y={index * (barHeight + barPadding) + barHeight / 2}
              textAnchor="end"
            >
              {`Processo ${process.id}`}
            </text>
          </g>
        ))}
        {[...Array(currentMaxTime + 1)].map((_, i) => (
          <g key={i}>
             <line 
                x1={(i / (maxTime || 1)) * chartWidth + labelPadding}
                y1={chartHeight - 25}
                x2={(i / (maxTime || 1)) * chartWidth + labelPadding}
                y2={chartHeight - 20}
                stroke="#e5e7eb"
                strokeWidth="2"
             />
             <text
                className={s.axisLabel}
                x={(i / (maxTime || 1)) * chartWidth + labelPadding}
                y={chartHeight - 5}
                textAnchor="middle"
            >
                {i}
            </text>
          </g>
        ))}
      </svg>
      <ProcessSubtitle colors={colors} schedulerType={schedulerType} />
    </>
  );
}