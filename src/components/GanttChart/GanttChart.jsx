import { useState, useEffect, useRef } from "react";
import ProcessSubtitle from "../ProcessSubtitle/ProcessSubtitle";
// Styles
import s from "./GanttChart.module.css";

export default function GanttChart({ schedulerMatrix, schedulerType, delay }) {
  const containerRef = useRef(null); // Referência para pegar a largura real
  const barHeight = 36;
  const barPadding = 12;
  const labelPadding = 110;

  const colors = {
    default: "#059669",
    overload: "#ef4444",
    deadlineFinished: "#374151",
    waiting: "#cbd5e1",
  };

  // 1. CORREÇÃO DE ORDEM: Ordenar os processos pelo ID (Crescente)
  // Fazemos uma cópia para não mutar o original
  const sortedMatrix = [...schedulerMatrix].sort((a, b) => {
    // Garante que estamos comparando números (ex: "1" vira 1)
    // Se seus IDs forem compostos (ex: "1-0"), pegamos a primeira parte
    const idA = parseInt(a.id.toString().split('-')[0]);
    const idB = parseInt(b.id.toString().split('-')[0]);
    return idA - idB;
  });

  const maxTime = sortedMatrix.reduce(
    (max, process) =>
      Math.max(max, ...process.segments.map((segment) => segment.endTime)),
    0
  );

  const chartHeight = (barHeight + barPadding) * sortedMatrix.length + 50;
  const [chartWidth, setChartWidth] = useState(0);

  // 2. CORREÇÃO DE LARGURA: Usar o tamanho do container pai
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Pega a largura total da div pai e subtrai o padding da label
        setChartWidth(containerRef.current.offsetWidth - labelPadding - 40);
      }
    };

    // Atualiza agora e adiciona listener para resize da janela
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [labelPadding]);

  // Animação do tempo
  const [currentMaxTime, setCurrentMaxTime] = useState(0);

  useEffect(() => {
    let intervalTime = delay * 1000;
    // Se o delay for muito pequeno, acelera a animação visualmente
    if (intervalTime < 100) intervalTime = 100;

    const interval = setInterval(() => {
      setCurrentMaxTime((prev) => Math.min(prev + 1, maxTime));
      if (currentMaxTime >= maxTime) {
        clearInterval(interval);
      }
    }, intervalTime);
    return () => clearInterval(interval);
  }, [currentMaxTime, maxTime, delay]);

  // Resetar animação se a matriz mudar
  useEffect(() => {
    setCurrentMaxTime(0);
  }, [schedulerMatrix]);

  const getFillColor = (segment) => {
    if (segment.isOverload) return colors.overload;
    if (segment.isDeadlineFinished) return colors.deadlineFinished;
    if (segment.isWaiting) return colors.waiting;
    return colors.default;
  };

  return (
    // Adicionamos a ref aqui para medir este container
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg
        className={s.ganttChartWrapper}
        width="100%" // Garante que o SVG ocupe tudo
        height={chartHeight}
        // ViewBox permite que o SVG escale corretamente independente do zoom
        viewBox={`0 0 ${chartWidth + labelPadding} ${chartHeight}`}
      >
        {/* Usamos sortedMatrix aqui ao invés de schedulerMatrix */}
        {sortedMatrix.map((process, index) => (
          <g key={process.id}>
            {/* Background da linha (opcional, ajuda na leitura) */}
            <rect
                x={0}
                y={index * (barHeight + barPadding)}
                width="100%"
                height={barHeight}
                fill="#f8fafc"
                opacity="0.5"
            />

            {process.segments.map((segment, segmentIndex) => {
              // Lógica de animação
              if (segment.startTime > currentMaxTime) return null;

              const safeMaxTime = maxTime === 0 ? 1 : maxTime;

              // Calcula largura atual baseada na animação
              const visibleEndTime = Math.min(segment.endTime, currentMaxTime);

              const barWidth =
                ((visibleEndTime - segment.startTime) / safeMaxTime) * chartWidth;

              const x =
                (segment.startTime / safeMaxTime) * chartWidth + labelPadding;

              const y = index * (barHeight + barPadding);

              // Evita renderizar barras com largura negativa ou zero
              if (barWidth <= 0) return null;

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
                  rx="4"
                />
              );
            })}

            <text
              className={s.processName}
              x={labelPadding - 20}
              y={index * (barHeight + barPadding) + barHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {`Processo ${process.id}`}
            </text>
          </g>
        ))}

        {/* Eixo X (Tempo) */}
        {[...Array(maxTime + 1)].map((_, i) => (
          <g key={i}>
            <line
              x1={(i / (maxTime || 1)) * chartWidth + labelPadding}
              y1={0}
              x2={(i / (maxTime || 1)) * chartWidth + labelPadding}
              y2={chartHeight - 20}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4"
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
    </div>
  );
}
