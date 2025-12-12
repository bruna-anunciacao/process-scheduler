import { useEffect, useState } from "react";
import s from "./RateMonotonic.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function RateMonotonic({ processes, setReset, delay }) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [rmProcesses, setRmProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);
  const [isSchedulable, setIsSchedulable] = useState(true);
  const [utilizationFactor, setUtilizationFactor] = useState(0);
  const [responseTimes, setResponseTimes] = useState([]);
  const [missedDeadlines, setMissedDeadlines] = useState(0);

  useEffect(() => {
    if (processes.length > 0) {
      const taskGroups = new Map();

      processes.forEach(process => {
        const taskId = process.originalId || process.id;
        if (!taskGroups.has(taskId)) {
          taskGroups.set(taskId, []);
        }
        taskGroups.get(taskId).push(process);
      });

      const uniqueTasks = Array.from(taskGroups.values()).map(group => {
        const firstInstance = group[0];
        const period = group.length > 1 ?
          (group[1].arrival - group[0].arrival) :
          (firstInstance.period || firstInstance.deadline || 10);

        return {
          id: firstInstance.originalId || firstInstance.id,
          time: Number(firstInstance.time),
          period: Number(period),
          deadline: Number(firstInstance.deadline - firstInstance.arrival) || Number(period),
          firstArrivalTime: group[0].arrival,
          instances: group,
          segments: [],
        };
      });

      // RM: Prioridade inversamente proporcional ao Período (Menor T = Maior P)
      // [cite: 3176] "A prioridade de cada tarefa é inversamente proporcional ao seu período"
      uniqueTasks.sort((a, b) => a.period - b.period);

      // Atribui prioridade (1 é a maior/melhor)
      const tasksWithPriority = uniqueTasks.map((task, index) => ({
        ...task,
        priority: index + 1,
      }));

      setRmProcesses(tasksWithPriority);

      // Fator de Utilização
      const U = tasksWithPriority.reduce((acc, task) => {
        return acc + (task.time / task.period);
      }, 0);
      setUtilizationFactor(U.toFixed(3));

      // Teste de Liu & Layland (Condição Suficiente, mas não necessária)
      // [cite: 3415]
      const n = tasksWithPriority.length;
      const liuLaylandBound = n * (Math.pow(2, 1/n) - 1);
      // Nota: Se falhar aqui, ainda pode ser escalonável via RTA.
      // O estado final de isSchedulable será definido pelo RTA no startRM.
    }
  }, [processes]);

  // Cálculo Matemático do Tempo de Resposta (RTA)
  // R_i^(k+1) = C_i + Sum(ceil(R_i^k / T_j) * C_j)
  const calculateResponseTime = (taskIndex, tasks) => {
    const task = tasks[taskIndex];
    let R = task.time;
    let prevR = 0;
    let iterations = 0;
    const maxIterations = 1000;

    while (Math.abs(R - prevR) > 0.001 && iterations < maxIterations) {
      prevR = R;
      let interference = 0;

      for (let j = 0; j < taskIndex; j++) {
        const higherPriorityTask = tasks[j];
        interference += Math.ceil(R / higherPriorityTask.period) * higherPriorityTask.time;
      }

      R = task.time + interference;
      iterations++;

      if (R > task.deadline) {
        return R;
      }
    }
    return R;
  };

  const startRM = () => {
    if (processes.length === 0) {
      alert("Adicione pelo menos um processo!");
      return;
    }

    setReset(false);
    setStartScheduler(true);

    let simulationTasks = JSON.parse(JSON.stringify(rmProcesses));

    const responseTimesCalc = [];
    let theoreticallySchedulable = true;

    for (let i = 0; i < simulationTasks.length; i++) {
      const R = calculateResponseTime(i, simulationTasks);
      const isOk = R <= simulationTasks[i].deadline;

      responseTimesCalc.push({
        taskId: simulationTasks[i].id,
        period: simulationTasks[i].period,
        responseTime: R.toFixed(2),
        deadline: simulationTasks[i].deadline,
        schedulable: isOk,
      });

      if (!isOk) theoreticallySchedulable = false;
    }

    setResponseTimes(responseTimesCalc);
    setIsSchedulable(theoreticallySchedulable);

    const maxArrival = Math.max(...processes.map(p => p.arrival));
    const maxDeadline = Math.max(...processes.map(p => p.deadline));
    const simulationLimit = Math.max(maxDeadline, maxArrival + 50, 100);

    let currentTime = 0;
    let jobQueue = [];
    let deadlinesMissedCount = 0;

    const taskMap = new Map(simulationTasks.map(task => [task.id, task]));

    const allJobs = processes.map((proc, idx) => ({
      uniqueId: idx,
      taskId: proc.originalId || proc.id,
      priority: simulationTasks.find(t => t.id === (proc.originalId || proc.id))?.priority || 999,
      releaseTime: proc.arrival,
      absoluteDeadline: proc.deadline,
      remainingTime: Number(proc.time),
      executionTime: Number(proc.time),
      started: false,
      processId: proc.id,
    }));

    while (currentTime < simulationLimit) {

      const arrivingJobs = allJobs.filter(
        job => job.releaseTime === currentTime
      );
      jobQueue.push(...arrivingJobs);

      jobQueue.forEach(job => {
        if (job.remainingTime > 0 && currentTime === job.absoluteDeadline) {
          console.warn(`⚠️ Deadline miss (RM): Job ${job.uniqueId} da tarefa τ${job.taskId}`);
          deadlinesMissedCount++;
        }
      });

      jobQueue = jobQueue.filter(job => job.remainingTime > 0);

      jobQueue.sort((a, b) => {
        if (a.priority === b.priority) {
          return a.releaseTime - b.releaseTime;
        }
        return a.priority - b.priority
      });

      const currentJob = jobQueue[0];

      if (currentJob) {
        const startTime = currentTime;

        if (!currentJob.started) {
          currentJob.started = true;
        }

        currentJob.remainingTime--;
        currentTime++;
        const endTime = currentTime;

        const task = taskMap.get(currentJob.taskId);
        const lastSegment = task.segments[task.segments.length - 1];

        const isBurstedTick = currentTime > currentJob.absoluteDeadline;

        if (lastSegment &&
            lastSegment.endTime === startTime &&
            lastSegment.jobId === currentJob.uniqueId &&
            !lastSegment.isWaiting &&
            !!lastSegment.isDeadlineFinished === isBurstedTick
           ) {
          lastSegment.endTime = endTime;
        } else {
          task.segments.push({
            jobId: currentJob.uniqueId,
            processId: currentJob.processId,
            startTime: startTime,
            endTime: endTime,
            isOverload: false,
            isWaiting: false,
            isDeadlineFinished: isBurstedTick,
          });
        }

        jobQueue.forEach(job => {
          if (job.uniqueId !== currentJob.uniqueId && job.releaseTime <= startTime) {
            const otherTask = taskMap.get(job.taskId);
            const otherLast = otherTask.segments[otherTask.segments.length - 1];

            if (otherLast && otherLast.isWaiting && otherLast.endTime === startTime) {
              otherLast.endTime = endTime;
            } else {
              const gapStart = otherLast ? otherLast.endTime : job.releaseTime;
              if (gapStart < endTime && gapStart >= job.releaseTime) {
                otherTask.segments.push({
                  jobId: job.uniqueId,
                  startTime: startTime,
                  endTime: endTime,
                  isOverload: false,
                  isWaiting: true,
                  isDeadlineFinished: false,
                });
              }
            }
          }
        });

      } else {
        currentTime++;
      }
    }

    setMissedDeadlines(deadlinesMissedCount);

    let totalTurnAround = 0;
    let finishedJobsCount = 0;

    allJobs.forEach(job => {
      if (job.started) {
        const task = taskMap.get(job.taskId);
        const jobSegments = task.segments.filter(s => s.jobId === job.uniqueId && !s.isWaiting);

        if (jobSegments.length > 0) {
          const finishTime = Math.max(...jobSegments.map(s => s.endTime));
          const turnAround = finishTime - job.releaseTime;
          totalTurnAround += turnAround;
          finishedJobsCount++;
        }
      }
    });

    const avgTurnAround = finishedJobsCount > 0 ? (totalTurnAround / finishedJobsCount).toFixed(2) : 0;
    setTurnAroundTime(avgTurnAround);
    setSchedulerMatrix(Array.from(taskMap.values()));
  };

  const resetRM = () => {
    setStartScheduler(false);
    setTurnAroundTime(0);
    setReset(true);
    setSchedulerMatrix([]);
    setResponseTimes([]);
    setMissedDeadlines(0);
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
          Iniciar Simulação RM
        </button>
        <button onClick={resetRM} className={`${s.baseBtn} ${s.resetBtn}`}>
          Resetar
        </button>
      </div>

      {startScheduler && (
        <div>
          <div className={s.statsContainer}>
            <div className={s.turnaroundBadge}>
              <span>Fator de Utilização (U):</span>
              <span className={s.turnaroundValue}>{utilizationFactor}</span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>Análise RTA:</span>
              <span
                className={s.turnaroundValue}
                style={{color: isSchedulable ? '#4caf50' : '#f44336'}}
              >
                {isSchedulable ? '✓ Escalonável' : '✗ Não Escalonável'}
              </span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>Deadlines Perdidos (Simulação):</span>
              <span
                className={s.turnaroundValue}
                style={{color: missedDeadlines === 0 ? '#4caf50' : '#f44336'}}
              >
                {missedDeadlines}
              </span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>TurnAround Médio:</span>
              <span className={s.turnaroundValue}>{turnAroundTime}ms</span>
            </div>
          </div>

          {responseTimes.length > 0 && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f9f9f9',
              borderRadius: '5px',
              fontSize: '0.85em'
            }}>
              <strong>Análise Teórica (Response Time Analysis):</strong>
              <table style={{width: '100%', marginTop: '8px', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{backgroundColor: '#e0e0e0'}}>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Tarefa</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Prioridade</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Período (T)</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>R Calculado</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Deadline (D)</th>
                    <th style={{padding: '5px', border: '1px solid #ccc'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {responseTimes.map((rt, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>
                        τ{rt.taskId}
                      </td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>
                        {idx + 1}
                      </td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>
                        {rt.period}
                      </td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>
                        {rt.responseTime}
                      </td>
                      <td style={{padding: '5px', border: '1px solid #ccc', textAlign: 'center'}}>
                        {rt.deadline}
                      </td>
                      <td style={{
                        padding: '5px',
                        border: '1px solid #ccc',
                        textAlign: 'center',
                        color: rt.schedulable ? '#4caf50' : '#f44336',
                        fontWeight: 'bold'
                      }}>
                        {rt.schedulable ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            marginTop: '10px',
            padding: '10px',
            fontSize: '0.9em',
            backgroundColor: '#e3f2fd',
            borderRadius: '5px',
            color: '#1565c0'
          }}>
            <strong>Rate Monotonic (RM):</strong> Prioridade fixa inversamente proporcional ao período[cite: 3176].
            Tarefas com menor período têm maior prioridade. O algoritmo é ótimo para prioridade fixa[cite: 3177].
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
