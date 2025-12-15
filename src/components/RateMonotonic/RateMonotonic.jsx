import { useEffect, useState } from "react";
import s from "./RateMonotonic.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function RateMonotonic({ processes, setReset, delay }) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);
  const [utilization, setUtilization] = useState(0);
  const [schedulabilityMsg, setSchedulabilityMsg] = useState("");
  const [responseTimes, setResponseTimes] = useState([]);

  const gcd = (a, b) => (!b ? a : gcd(b, a % b));
  const lcm = (a, b) => (a * b) / gcd(a, b);

  const calculateResponseTime = (taskIndex, tasks) => {
    const task = tasks[taskIndex];
    let R = task.C;
    let prevR = 0;

    if (R > task.D) return R;

    while (Math.abs(R - prevR) > 0.001) {
      prevR = R;
      let interference = 0;

      for (let j = 0; j < taskIndex; j++) {
        const hpTask = tasks[j];
        interference += Math.ceil(R / hpTask.T) * hpTask.C;
      }

      R = task.C + interference;

      if (R > task.D) return R;
    }
    return R;
  };

  const startRM = () => {
    if (processes.length === 0) return;

    setReset(false);
    setStartScheduler(true);

    let tasks = processes.map((p) => ({
      id: p.id,
      C: Number(p.time),
      T: Number(p.period || p.time * 2),
      D: Number(p.period),
      Arrival: Number(p.arrival || 0),
      priority: 0,
      color: p.color,
    }));

    tasks.sort((a, b) => a.T - b.T);

    tasks = tasks.map((t, index) => ({ ...t, priority: index }));

    const U = tasks.reduce((acc, t) => acc + t.C / t.T, 0);
    setUtilization(U.toFixed(3));

    const n = tasks.length;
    const bound = n * (Math.pow(2, 1 / n) - 1);

    const rtaResults = [];
    let allSchedulable = true;
    for (let i = 0; i < tasks.length; i++) {
        const R = calculateResponseTime(i, tasks);
        const isSchedulable = R <= tasks[i].D;

        rtaResults.push({
            taskId: tasks[i].id,
            deadline: tasks[i].D,
            period: tasks[i].T,
            responseTime: R.toFixed(2),
            schedulable: isSchedulable
        });

        if (!isSchedulable) allSchedulable = false;
    }
    setResponseTimes(rtaResults);

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

    const maxArrival = Math.max(...tasks.map(t => t.Arrival));
    const simulationLimit = Math.min(hyperperiod + maxArrival, 100);

    let currentTime = 0;
    let readyQueue = [];
    let timeline = new Map();

    tasks.forEach((t) => timeline.set(t.id, { ...t, segments: [] }));

    let jobCounter = 0;
    let totalTurnaround = 0;
    let finishedJobs = 0;

    while (currentTime < simulationLimit) {
      tasks.forEach((task) => {
        if (
          currentTime >= task.Arrival &&
          (currentTime - task.Arrival) % task.T === 0
        ) {
          readyQueue.push({
            uniqueId: jobCounter++,
            taskId: task.id,
            remainingTime: task.C,
            absoluteDeadline: currentTime + task.D,
            releaseTime: currentTime,
            priority: task.priority,
            started: false,
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

        const lastSegment =
          taskData.segments[taskData.segments.length - 1];

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
            isWaiting: false,
          });
        }

        readyQueue.forEach((job, idx) => {
          if (idx > 0) {
            const otherTaskData = timeline.get(job.taskId);
            const otherLastSegment =
              otherTaskData.segments[otherTaskData.segments.length - 1];

            const waitStart =
              otherLastSegment && otherLastSegment.endTime > job.releaseTime
                ? Math.max(otherLastSegment.endTime, startTime)
                : Math.max(job.releaseTime, startTime);

            if (waitStart < endTime) {
              if (
                otherLastSegment &&
                otherLastSegment.isWaiting &&
                otherLastSegment.endTime === waitStart
              ) {
                otherLastSegment.endTime = endTime;
              } else {
                otherTaskData.segments.push({
                  startTime: waitStart,
                  endTime: endTime,
                  isOverload: false,
                  isDeadlineFinished: false,
                  isWaiting: true,
                });
              }
            }
          }
        });

        if (activeJob.remainingTime <= 0) {
          readyQueue.shift();
          totalTurnaround += endTime - activeJob.releaseTime;
          finishedJobs++;
        }
      } else {
        currentTime += 1;
      }
    }

    setTurnAroundTime(
      finishedJobs > 0 ? (totalTurnaround / finishedJobs).toFixed(2) : 0
    );
    setSchedulerMatrix(Array.from(timeline.values()));
  };

  const resetLocal = () => {
    setStartScheduler(false);
    setSchedulerMatrix([]);
    setResponseTimes([]);
    setReset(true);
  };

  return (
    <div className={s.edfWrapper}>
      <div className={s.btnWrapper}>
        <button
          onClick={startRM}
          className={`${s.baseBtn} ${
            startScheduler ? s.disabledBtn : s.startBtn
          }`}
          disabled={startScheduler}
        >
          Iniciar Simulação
        </button>
        <button onClick={resetLocal} className={`${s.baseBtn} ${s.resetBtn}`}>
          Apagar
        </button>
      </div>

      {startScheduler && (
        <div>
          <div className={s.statsContainer}>
            <div className={s.turnaroundBadge}>
              <span>Utilização (U):</span>
              <span
                className={s.turnaroundValue}
                style={{
                  color: parseFloat(utilization) > 1 ? "#ef4444" : "#059669",
                }}
              >
                {utilization}
              </span>
            </div>

            <div
              className={s.turnaroundBadge}
              style={{ gridColumn: "span 2" }}
            >
              <span style={{ fontSize: "0.8rem" }}>{schedulabilityMsg}</span>
            </div>

            <div className={s.turnaroundBadge}>
              <span>TurnAround:</span>
              <span className={s.turnaroundValue}>{turnAroundTime}ms</span>
            </div>
          </div>

          {/* TABELA DE ANÁLISE RTA */}
          {responseTimes.length > 0 && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px', fontSize: '0.85em' }}>
              <strong>Análise de Tempo de Resposta (RTA) - Rate Monotonic:</strong>
              <table style={{width: '100%', marginTop: '8px', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{backgroundColor: '#e0e0e0'}}>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Tarefa</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Período (T)</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>R Calc (ms)</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {responseTimes.map((rt, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>τ{rt.taskId}</td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>{rt.period}</td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>{rt.responseTime}</td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center', color: rt.schedulable ? '#4caf50' : '#f44336', fontWeight: 'bold'}}>
                        {rt.schedulable ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
