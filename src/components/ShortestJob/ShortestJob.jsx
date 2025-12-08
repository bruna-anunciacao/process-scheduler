// Imports
import { useEffect, useState } from "react";
// Styles
import s from "./ShortestJob.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function ShortestJob({
  processes,
  setReset,
  delay
}) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [sjfProcesses, setSjfProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);

  useEffect(() => {
    if (processes.length > 0) {
      const sortedProcesses = processes
        .filter((process) => process.status === "Waiting")
        .sort((a, b) => {
          if (a.arrival === b.arrival) {
            return a.time - b.time;
          }
          return a.arrival - b.arrival;
        })
        .map((process, index) => ({
          ...process,
          arrivalTime: index,
          segments: [],
        }));

      setSjfProcesses(sortedProcesses);
    }
  }, [processes]);

  const startSJF = () => {
    if (sjfProcesses.length > 0) {
      setReset(false);
      setStartScheduler(true);
      
      const processesCopy = JSON.parse(JSON.stringify(sjfProcesses)); 
  
      let currentTime = 0;
      
      const sortedByBurst = [...processesCopy].sort((a, b) => a.time - b.time);
  
      const processMap = new Map();
      
      processesCopy.forEach(p => {
          processMap.set(p.id, { ...p, segments: [] });
      });

      while (processesCopy.some((process) => process.time > 0)) {
        
        const process = sortedByBurst.find(
          (p) => p.time > 0 && p.arrival <= currentTime
        );

        if (!process) {
          currentTime++;
          continue;
        }

        if (process.arrival < currentTime && processMap.get(process.id).segments.length === 0) {
           processMap.get(process.id).segments.push({
            startTime: process.arrival,
            endTime: currentTime,
            isOverload: false,
            isDeadlineFinished: false,
            isWaiting: true,
          });
        }
  
        const startTime = currentTime;
        const endTime = startTime + process.time;
        currentTime = endTime;
  
        processMap.get(process.id).segments.push({
          startTime,
          endTime,
          isOverload: false,
          isDeadlineFinished: false,
          isWaiting: false,
        });
  
        process.time = 0;
      }
  
      const turnAroundTimes = Array.from(processMap.values()).map((process) => {
        const arrivalTime = process.arrival;
        const lastSegment = process.segments[process.segments.length - 1];
        const completionTime = lastSegment ? lastSegment.endTime : arrivalTime;
        return completionTime - arrivalTime;
      });
  
      const totalTurnAroundTime = turnAroundTimes.reduce((acc, time) => acc + time, 0);
      const averageTurnAroundTime = (totalTurnAroundTime / turnAroundTimes.length).toFixed(2);
  
      setTurnAroundTime(averageTurnAroundTime);
      setSchedulerMatrix(Array.from(processMap.values()));
    }
  };

  const resetSJF = () => {
    setStartScheduler(false);
    setReset(true);
    setSchedulerMatrix([]);
    setTurnAroundTime(0);
  };

  return (
    <div className={s.sjfWrapper}>
      
      <div className={s.btnWrapper}>
        <button
          onClick={startSJF}
          className={`${s.baseBtn} ${startScheduler ? s.disabledBtn : s.startBtn}`}
          disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        <button onClick={resetSJF} className={`${s.baseBtn} ${s.resetBtn}`}>
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
            schedulerType="SJF" 
            delay={delay} 
          />
        </div>
      )}
    </div>
  );
}