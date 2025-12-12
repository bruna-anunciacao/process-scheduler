import { useEffect, useState } from "react";
import s from "./RateMonotonic.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function RateMonotonic({ processes, setReset, delay }) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);
  const [utilization, setUtilization] = useState(0);
  const [schedulabilityMsg, setSchedulabilityMsg] = useState("");

  const gcd = (a, b) => (!b ? a : gcd(b, a % b));
  const lcm = (a, b) => (a * b) / gcd(a, b);

  const startRM = () => {
    if (processes.length === 0) return;

    setReset(false);
    setStartScheduler(true);

    let tasks = processes.map((p) => ({
      id: p.id,
      C: Number(p.time),
      T: Number(p.period || p.time * 2),
      D: Number(p.deadline || p.period),
      priority: 0,
      color: p.color,
    }));

    tasks.sort((a, b) => a.T - b.T);
    
    tasks = tasks.map((t, index) => ({ ...t, priority: index }));

    const U = tasks.reduce((acc, t) => acc + t.C / t.T, 0);
    setUtilization(U.toFixed(3));

    const n = tasks.length;
    const bound = n * (Math.pow(2, 1 / n) - 1);
    
    let msg = "";
    if (U <= bound) {
      msg = "Escalonável (Teste LL Aprovado)";
    } else if (U <= 1.0) {
      msg = "Inconclusivo (Necessário RTA), mas CPU suficiente.";
    } else {
      msg = "NÃO Escalonável (Sobrecarga > 100%)";
    }
    setSchedulabilityMsg(msg);

    const hyperperiod = tasks.reduce((acc, t) => lcm(acc, t.T), 1);
    const simulationLimit = Math.min(hyperperiod, 100);

    let currentTime = 0;
    let readyQueue = [];
    let timeline = new Map(); 
    
    tasks.forEach(t => timeline.set(t.id, { ...t, segments: [] }));

    let jobCounter = 0;
    let totalTurnaround = 0;
    let finishedJobs = 0;

    while (currentTime < simulationLimit) {
      tasks.forEach((task) => {
        if (currentTime % task.T === 0) {
          readyQueue.push({
            uniqueId: jobCounter++,
            taskId: task.id,
            remainingTime: task.C,
            absoluteDeadline: currentTime + task.D,
            releaseTime: currentTime,
            priority: task.priority,
            started: false
          });
        }
      });

      readyQueue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.releaseTime - b.releaseTime;
      });

      const activeJob = readyQueue[0];

      if (activeJob) {
        const startTime = currentTime;
        
        activeJob.remainingTime -= 1;
        currentTime += 1;
        
        const endTime = currentTime;
        const isDeadlineMiss = endTime > activeJob.absoluteDeadline;

        const taskData = timeline.get(activeJob.taskId);
        
        const lastSegment = taskData.segments[taskData.segments.length - 1];
        if (
            lastSegment && 
            lastSegment.endTime === startTime && 
            !lastSegment.isWaiting &&
            lastSegment.isDeadlineFinished === isDeadlineMiss
        ) {
            lastSegment.endTime = endTime;
        } else {
            taskData.segments.push({
                startTime,
                endTime,
                isOverload: false,
                isDeadlineFinished: isDeadlineMiss,
                isWaiting: false
            });
        }

        if (activeJob.remainingTime <= 0) {
          readyQueue.shift();
          
          totalTurnaround += (endTime - activeJob.releaseTime);
          finishedJobs++;
        }
      } else {
        currentTime += 1;
      }
    }

    setTurnAroundTime(finishedJobs > 0 ? (totalTurnaround / finishedJobs).toFixed(2) : 0);
    setSchedulerMatrix(Array.from(timeline.values()));
  };

  const resetLocal = () => {
    setStartScheduler(false);
    setSchedulerMatrix([]);
    setReset(true);
  };

  return (
    <div className={s.edfWrapper}>
      <div className={s.btnWrapper}>
        <button
          onClick={startRM}
          className={`${s.baseBtn} ${startScheduler ? s.disabledBtn : s.startBtn}`}
          disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        <button onClick={resetLocal} className={`${s.baseBtn} ${s.resetBtn}`}>
          Resetar
        </button>
      </div>

      {startScheduler && (
        <div>
          <div className={s.statsContainer}>
            <div className={s.turnaroundBadge}>
              <span>Utilização (U):</span>
              <span 
                className={s.turnaroundValue}
                style={{ color: parseFloat(utilization) > 1 ? '#ef4444' : '#059669' }}
              >
                {utilization}
              </span>
            </div>
            
            <div className={s.turnaroundBadge} style={{gridColumn: 'span 2'}}>
               <span style={{fontSize: '0.8rem'}}>{schedulabilityMsg}</span>
            </div>

            <div className={s.turnaroundBadge}>
              <span>TurnAround:</span>
              <span className={s.turnaroundValue}>{turnAroundTime}ms</span>
            </div>
          </div>
          
          <GanttChart 
            schedulerMatrix={schedulerMatrix} 
            schedulerType="RM"
            delay={delay} 
          />
        </div>
      )}
    </div>
  );
}