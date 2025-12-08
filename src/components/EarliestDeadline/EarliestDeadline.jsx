// Imports
import { useEffect, useState } from "react";
// Styles
import s from "./EarliestDeadline.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function EarliestDeadline({
  quantum,
  overload,
  processes,
  setReset,
  delay,
}) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [edfProcesses, setEdfProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);

  useEffect(() => {
    if (processes.length > 0) {
      const sortedProcesses = processes
        .filter((process) => process.status === "Waiting")
        .sort((a, b) => {
          if (a.deadline === b.deadline) {
            return b.firstArrivalTime - a.firstArrivalTime;
          }
          return a.deadline - b.deadline;
        })
        .map((process, index) => ({
          ...process,
          arrivalTime: index,
          firstArrivalTime: process.arrival,
          segments: [],
        }));

      setEdfProcesses([...sortedProcesses]);
    }
  }, [processes, quantum, overload]);

  const startEDF = () => {
    if (edfProcesses.length > 0) {
      setReset(false);
      setStartScheduler(true);

      const processesCopy = JSON.parse(JSON.stringify(edfProcesses));

      let currentTime = 0;

      const sortedProcesses = processesCopy
        .filter((process) => process.status === "Waiting")
        .sort((a, b) => {
          if (a.deadline === b.deadline) {
            return a.time - b.time;
          }
          return a.deadline - b.deadline;
        });

      const processMap = new Map(
        sortedProcesses.map((process) => [process.id, process])
      );

      while (sortedProcesses.some((process) => process.time > 0)) {
        const process = sortedProcesses.find(
          (p) => p.time > 0 && p.arrival <= currentTime
        );

        if (!process) {
          currentTime++;
          continue;
        }

        const startTime = currentTime;

        if (process.segments.length === 0 && process.arrival < startTime) {
          process.segments.push({
            startTime: process.arrival,
            endTime: startTime,
            isOverload: false,
            isDeadlineFinished: false,
            isWaiting: true,
          });
        }

        let remainingTime = parseInt(process.time);
        const realDeadline =
          parseInt(process.deadline) + parseInt(process.firstArrivalTime);

        if (remainingTime > quantum) {
          remainingTime -= quantum;
          const endTime = parseInt(startTime) + parseInt(quantum);

          const overloadStartTime = endTime;
          const overloadEndTime =
            parseInt(overloadStartTime) + parseInt(overload);

          currentTime = overloadEndTime;

          if (realDeadline === startTime) {
            processMap.get(process.id).segments.push({
              startTime: startTime,
              endTime: endTime,
              isOverload: false,
              isDeadlineFinished: true,
            });
          } else if (realDeadline < endTime && realDeadline > startTime) {
            const DeadlineFinished = parseInt(realDeadline);
            processMap.get(process.id).segments.push({
              startTime: startTime,
              endTime: DeadlineFinished,
              isOverload: false,
              isDeadlineFinished: false,
            });
            processMap.get(process.id).segments.push({
              startTime: DeadlineFinished,
              endTime: endTime,
              isOverload: false,
              isDeadlineFinished: true,
            });
          } else if (realDeadline < startTime) {
            processMap.get(process.id).segments.push({
              startTime,
              endTime,
              isOverload: false,
              isDeadlineFinished: true,
            });
          } else {
            processMap.get(process.id).segments.push({
              startTime,
              endTime,
              isOverload: false,
              isDeadlineFinished: false,
            });
          }

          process.time = remainingTime;

          processMap.get(process.id).segments.push({
            startTime: overloadStartTime,
            endTime: overloadEndTime,
            isOverload: true,
            isDeadlineFinished: false,
            isWaiting: false,
          });

          process.arrival = overloadEndTime;

          sortedProcesses.sort((a, b) => {
            if (a.deadline === b.deadline) {
              return a.time - b.time;
            }
            return a.deadline - b.deadline;
          });
        } else {
          const endTime = parseInt(startTime) + parseInt(remainingTime);
          currentTime = endTime;

          if (realDeadline < endTime && realDeadline > startTime) {
            const DeadlineFinished = parseInt(realDeadline);
            processMap.get(process.id).segments.push({
              startTime: startTime,
              endTime: DeadlineFinished,
              isOverload: false,
              isDeadlineFinished: false,
            });
            processMap.get(process.id).segments.push({
              startTime: DeadlineFinished,
              endTime: endTime,
              isOverload: false,
              isDeadlineFinished: true,
            });
          } else if (realDeadline <= startTime) {
            processMap.get(process.id).segments.push({
              startTime,
              endTime,
              isOverload: false,
              isDeadlineFinished: true,
            });
          } else {
            processMap.get(process.id).segments.push({
              startTime,
              endTime,
              isOverload: false,
              isDeadlineFinished: false,
            });
          }

          process.time = 0;
          processMap.get(process.id).endTime = endTime;
        }
        sortedProcesses.forEach((p) => {
          if (p.time > 0 && p.id !== process.id && p.arrival <= currentTime) {
            const lastSegment = p.segments[p.segments.length - 1];
            const lastEndTime = lastSegment ? lastSegment.endTime : p.arrival;

            if (lastEndTime < currentTime) {
              p.segments.push({
                startTime: lastEndTime,
                endTime: currentTime,
                isOverload: false,
                isDeadlineFinished: false,
                isWaiting: true,
              });
            }
          }
        });
      }

      const turnAroundTimes = Array.from(processMap.values()).map((process) => {
        const validSegments = process.segments.filter((s) => !s.isWaiting);
        const lastSegment = validSegments[validSegments.length - 1];

        const completionTime = lastSegment
          ? lastSegment.endTime
          : process.firstArrivalTime;
        return completionTime - process.firstArrivalTime;
      });

      const totalTurnAroundTime = turnAroundTimes.reduce(
        (acc, value) => acc + value,
        0
      );
      const averageTurnAroundTime = (
        totalTurnAroundTime / turnAroundTimes.length
      ).toFixed(2);

      setTurnAroundTime(averageTurnAroundTime);
      setSchedulerMatrix(Array.from(processMap.values()));
    }
  };

  const resetEDF = () => {
    setStartScheduler(false);
    setTurnAroundTime(0);
    setReset(true);
    setSchedulerMatrix([]);
  };

  return (
    <div className={s.edfWrapper}>
      <div className={s.btnWrapper}>
        <button
          onClick={startEDF}
          className={`${s.baseBtn} ${
            startScheduler ? s.disabledBtn : s.startBtn
          }`}
          disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        <button onClick={resetEDF} className={`${s.baseBtn} ${s.resetBtn}`}>
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
            schedulerType="EDF"
            delay={delay}
          />
        </div>
      )}
    </div>
  );
}
