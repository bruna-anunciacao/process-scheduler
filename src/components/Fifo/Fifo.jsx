// Imports
import { useEffect, useState } from "react";
// Styles
import s from "./Fifo.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function Fifo({
  processes,
  setReset,
  delay
}) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [fifoProcesses, setFifoProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);

  useEffect(() => {
    if (processes.length > 0) {
      callProcesses();
    }
  }, [processes]);

  function callProcesses() {
    if (processes.length > 0) {
      const sortedProcesses = processes
        .filter((process) => process.status === "Waiting")
        .sort((a, b) => a.arrival - b.arrival)
        .map((process, index) => ({
          ...process,
          arrivalTime: index,
        }));

      setFifoProcesses(sortedProcesses);
    }
  }

  const startFIFO = () => {
    if (fifoProcesses.length > 0) {
      setReset(false);
      setStartScheduler(true);
      const processesCopy = JSON.parse(JSON.stringify(fifoProcesses));

      let currentTime = 0;
      const processMap = new Map();

      processesCopy.forEach(p => {
          processMap.set(p.id, { ...p, segments: [], completionTime: 0 });
      });

      processesCopy.sort((a, b) => a.arrival - b.arrival);

      for (let process of processesCopy) {
        if (currentTime < process.arrival) {
             currentTime = process.arrival;
        }

        const startTime = currentTime;
        
        if (process.arrival < startTime) {
             processMap.get(process.id).segments.push({
                startTime: process.arrival,
                endTime: startTime,
                isOverload: false,
                isDeadlineFinished: false,
                isWaiting: true
             });
        }

        const endTime = startTime + process.time;
        currentTime = endTime;

        processMap.get(process.id).segments.push({
          startTime,
          endTime,
          isOverload: false,
          isDeadlineFinished: false,
          isWaiting: false,
        });

        processMap.get(process.id).completionTime = endTime;
        process.time = 0;
      }

      const totalTurnaround = Array.from(processMap.values()).reduce(
        (acc, process) => acc + (process.completionTime - process.arrival),
        0
      );

      setTurnAroundTime((totalTurnaround / processMap.size).toFixed(2));
      setSchedulerMatrix(Array.from(processMap.values()));
    }
  };

  const resetFIFO = () => {
    setStartScheduler(false);
    setReset(true);
    setSchedulerMatrix([]);
    callProcesses();
    setTurnAroundTime(0);
  };

  return (
    <div className={s.fifoWrapper}>
      <div className={s.btnWrapper}>
        <button
          onClick={startFIFO}
          className={`${s.baseBtn} ${startScheduler ? s.disabledBtn : s.startBtn}`}
          disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        
        <button onClick={resetFIFO} className={`${s.baseBtn} ${s.resetBtn}`}>
          Resetar
        </button>
      </div>

      {startScheduler && (
        <div>
          <div className={s.statsContainer}>
            <div className={s.turnaroundBadge}>
               <span>TurnAround Médio:</span>
               <span className={s.turnaroundValue}>{turnAroundTime}ms</span>
            </div>
          </div>
          
          <GanttChart 
            schedulerMatrix={schedulerMatrix} 
            schedulerType="FIFO" 
            delay={delay} 
          />
        </div>
      )}
    </div>
  );
}