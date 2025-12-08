// Imports
import { useEffect, useState } from "react";
import GanttChart from "../GanttChart/GanttChart";
// Styles
import s from "./RoundRobin.module.css";

export default function RoundRobin({ quantum, overload, processes, setReset, delay }) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [rrProcesses, setRrProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);

  useEffect(() => {
    if (processes.length > 0) {
      const sortedProcesses = processes
        .filter((process) => process.status === "Waiting")
        .sort((a, b) => {
          if (a.arrival === b.arrival) {
            return b.id - a.id;
          }
          return a.arrival - b.arrival;
        })
        .map((process, index) => ({
          ...process,
          arrivalTime: index,
          firstArrivalTime: process.arrival,
          segments: [],
        }));

      setRrProcesses([...sortedProcesses]);
    }
  }, [processes, quantum, overload]);

  const startRR = () => {
    if (processes.length > 0) {
      setReset(false);
      setStartScheduler(true);

      let simulationProcesses = JSON.parse(JSON.stringify(rrProcesses));
      
      let currentTime = 0;

      simulationProcesses.sort((a, b) => a.firstArrivalTime - b.firstArrivalTime);

      while (simulationProcesses.some(p => p.time > 0)) {
        simulationProcesses.sort((a, b) => {
             if (a.arrival === b.arrival) return a.firstArrivalTime - b.firstArrivalTime;
             return a.arrival - b.arrival;
        });

        const process = simulationProcesses.find((p) => p.time > 0 && p.arrival <= currentTime);

        if (!process) {
          currentTime++;
          continue;
        }

        const startTime = parseInt(currentTime);
        
        let remainingTime = parseInt(process.time);
        let runTime = Math.min(parseInt(quantum), remainingTime);
        let endTime = startTime + runTime;
        
        remainingTime -= runTime;

        process.segments.push({
          startTime: startTime,
          endTime: endTime,
          isOverload: false,
          isDeadlineFinished: false,
        });

        if (remainingTime > 0) {
          const overloadTime = parseInt(overload);
          
          if (overloadTime > 0) {
              process.segments.push({
                startTime: endTime,
                endTime: endTime + overloadTime,
                isOverload: true,
                isDeadlineFinished: false,
              });
              endTime += overloadTime;
          }
          
          currentTime = endTime;
          process.arrival = currentTime; 
        } else {
          remainingTime = 0;
          currentTime = endTime;
          process.finalEndTime = currentTime;
        }

        process.time = remainingTime;
      }

      simulationProcesses.sort((a, b) => a.firstArrivalTime - b.firstArrivalTime);
      
      setSchedulerMatrix(simulationProcesses);

      const totalTurnAround = simulationProcesses.reduce(
          (acc, p) => acc + (p.finalEndTime - p.firstArrivalTime), 
          0
      );
      setTurnAroundTime((totalTurnAround / simulationProcesses.length).toFixed(2));
    }
  };

  const resetRR = () => {
    setStartScheduler(false);
    setTurnAroundTime(0);
    setReset(true);
    setSchedulerMatrix([]);
  };

  return (
    <div className={s.rrWrapper}>
      <div className={s.btnWrapper}>
        <button 
            onClick={startRR} 
            className={`${s.baseBtn} ${startScheduler ? s.disabledBtn : s.startBtn}`} 
            disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        <button onClick={resetRR} className={`${s.baseBtn} ${s.resetBtn}`}>
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
            schedulerType="RR" 
            delay={delay} 
          />
        </div>
      )}
    </div>
  );
}