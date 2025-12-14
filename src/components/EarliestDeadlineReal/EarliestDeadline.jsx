import { useEffect, useState } from "react";
import s from "./EarliestDeadline.module.css";
import GanttChart from "../GanttChart/GanttChart";

export default function EarliestDeadline({
  processes,
  setReset,
  delay,
}) {
  const [startScheduler, setStartScheduler] = useState(false);
  const [turnAroundTime, setTurnAroundTime] = useState(0);
  const [edfProcesses, setEdfProcesses] = useState([]);
  const [schedulerMatrix, setSchedulerMatrix] = useState([]);
  const [isSchedulable, setIsSchedulable] = useState(true);
  const [utilizationFactor, setUtilizationFactor] = useState(0);
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
          time: firstInstance.time,
          period: period,
          deadline: firstInstance.deadline - firstInstance.arrival || period,
          firstArrivalTime: group[0].arrival,
          instances: group,
          segments: [],
        };
      });

      setEdfProcesses(uniqueTasks);

      const U = uniqueTasks.reduce((acc, task) => {
        return acc + (task.time / task.period);
      }, 0);

      setUtilizationFactor(U.toFixed(3));
      setIsSchedulable(U <= 1.0);
    }
  }, [processes]);

  const startEDF = () => {
    if (processes.length === 0) {
      alert("Adicione pelo menos um processo!");
      return;
    }

    setReset(false);
    setStartScheduler(true);

    let simulationTasks = JSON.parse(JSON.stringify(edfProcesses));

    const maxArrival = Math.max(...processes.map(p => p.arrival));
    const maxDeadline = Math.max(...processes.map(p => p.deadline));
    const simulationLimit = Math.max(maxDeadline, maxArrival + 50, 100);

    let currentTime = 0;
    let jobQueue = [];
    let deadlinesMissed = 0;

    const taskMap = new Map(simulationTasks.map(task => [task.id, task]));

    const allJobs = processes.map((proc, idx) => ({
      id: idx,
      taskId: proc.originalId || proc.id,
      releaseTime: proc.arrival,
      absoluteDeadline: proc.deadline,
      remainingTime: proc.time,
      executionTime: proc.time,
      started: false,
      processId: proc.id,
    }));

    while (currentTime < simulationLimit) {
      // Adiciona jobs que chegaram
      const arrivingJobs = allJobs.filter(
        job => job.releaseTime === currentTime && !jobQueue.find(j => j.id === job.id)
      );
      jobQueue.push(...arrivingJobs);

      // Verifica deadline misses
      jobQueue.forEach(job => {
        if (job.remainingTime > 0 && currentTime >= job.absoluteDeadline) {
          console.warn(`⚠️ Deadline miss: Job ${job.id} da tarefa τ${job.taskId}`);
          deadlinesMissed++;
          job.remainingTime = 0;
        }
      });

      jobQueue = jobQueue.filter(job => job.remainingTime > 0);

      // EDF: Ordena por deadline absoluto
      jobQueue.sort((a, b) => {
        if (a.absoluteDeadline === b.absoluteDeadline) {
          return a.releaseTime - b.releaseTime;
        }
        return a.absoluteDeadline - b.absoluteDeadline;
      });

      const currentJob = jobQueue.find(job =>
        job.remainingTime > 0 && job.releaseTime <= currentTime
      );

      if (currentJob) {
        const startTime = currentTime;

        if (!currentJob.started) {
          currentJob.started = true;
          currentJob.startTime = currentTime;
        }

        currentJob.remainingTime--;
        currentTime++;

        const task = taskMap.get(currentJob.taskId);
        const endTime = currentTime;

        const lastSegment = task.segments[task.segments.length - 1];

        // Verifica se o deadline já foi ultrapassado
        const isExecutingAfterDeadline = currentTime > currentJob.absoluteDeadline;
        const jobCompleted = currentJob.remainingTime === 0;

        if (lastSegment &&
            lastSegment.endTime === startTime &&
            lastSegment.jobId === currentJob.id &&
            !lastSegment.isWaiting) {
          // Estende segmento existente
          lastSegment.endTime = endTime;

          // Se já passou do deadline, marca o segmento
          if (isExecutingAfterDeadline) {
            lastSegment.missedDeadline = true;
          }
        } else {
          // Cria novo segmento
          task.segments.push({
            jobId: currentJob.id,
            processId: currentJob.processId,
            startTime: startTime,
            endTime: endTime,
            absoluteDeadline: currentJob.absoluteDeadline,
            isOverload: false,
            isWaiting: false,
            // Marca se está executando APÓS o deadline
            missedDeadline: isExecutingAfterDeadline,
            isDeadlineFinished: false,
          });
        }

        // Segmentos de espera
        jobQueue.forEach(job => {
          if (job.id !== currentJob.id &&
              job.releaseTime <= startTime &&
              job.remainingTime > 0) {
            const otherTask = taskMap.get(job.taskId);
            const otherLastSegment = otherTask.segments[otherTask.segments.length - 1];

            if (!otherLastSegment ||
                otherLastSegment.endTime < startTime ||
                !otherLastSegment.isWaiting ||
                otherLastSegment.jobId !== job.id) {

              const waitStartTime = otherLastSegment ?
                Math.max(otherLastSegment.endTime, job.releaseTime) :
                job.releaseTime;

              if (waitStartTime < endTime) {
                otherTask.segments.push({
                  jobId: job.id,
                  processId: job.processId,
                  startTime: waitStartTime,
                  endTime: endTime,
                  absoluteDeadline: job.absoluteDeadline,
                  isOverload: false,
                  isWaiting: true,
                  missedDeadline: false,
                  isDeadlineFinished: false,
                });
              }
            } else if (otherLastSegment.isWaiting && otherLastSegment.jobId === job.id) {
              otherLastSegment.endTime = endTime;
            }
          }
        });

      } else {
        currentTime++;
      }
    }

    setMissedDeadlines(deadlinesMissed);
    setIsSchedulable(deadlinesMissed === 0 && parseFloat(utilizationFactor) <= 1.0);

    // Calcula turnaround
    let totalTurnAround = 0;
    let totalJobs = 0;

    allJobs.forEach(job => {
      if (job.started) {
        const task = taskMap.get(job.taskId);
        const jobSegments = task.segments.filter(s => s.jobId === job.id && !s.isWaiting);

        if (jobSegments.length > 0) {
          const lastSegment = jobSegments[jobSegments.length - 1];
          const turnAround = lastSegment.endTime - job.releaseTime;
          totalTurnAround += turnAround;
          totalJobs++;
        }
      }
    });

    const avgTurnAround = totalJobs > 0 ? (totalTurnAround / totalJobs).toFixed(2) : 0;
    setTurnAroundTime(avgTurnAround);
    setSchedulerMatrix(Array.from(taskMap.values()));
  };

  const resetEDF = () => {
    setStartScheduler(false);
    setTurnAroundTime(0);
    setReset(true);
    setSchedulerMatrix([]);
    setMissedDeadlines(0);

    const U = edfProcesses.reduce((acc, task) => acc + (task.time / task.period), 0);
    setIsSchedulable(U <= 1.0);
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
          Iniciar Simulação EDF
        </button>
        <button onClick={resetEDF} className={`${s.baseBtn} ${s.resetBtn}`}>
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
              <span>Teste EDF (U ≤ 1):</span>
              <span
                className={s.turnaroundValue}
                style={{color: parseFloat(utilizationFactor) <= 1.0 ? '#4caf50' : '#f44336'}}
              >
                {parseFloat(utilizationFactor) <= 1.0 ? '✓ Passou' : '✗ Falhou'}
              </span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>Deadlines Perdidos:</span>
              <span
                className={s.turnaroundValue}
                style={{color: missedDeadlines === 0 ? '#4caf50' : '#f44336'}}
              >
                {missedDeadlines}
              </span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>Sistema Escalonável:</span>
              <span
                className={s.turnaroundValue}
                style={{color: isSchedulable ? '#4caf50' : '#f44336'}}
              >
                {isSchedulable ? 'Sim ✓' : 'Não ✗'}
              </span>
            </div>
            <div className={s.turnaroundBadge}>
              <span>TurnAround Médio:</span>
              <span className={s.turnaroundValue}>{turnAroundTime}ms</span>
            </div>
          </div>

          <div style={{
            marginTop: '10px',
            padding: '10px',
            fontSize: '0.9em',
            backgroundColor: '#f0f0f0',
            borderRadius: '5px',
            color: '#333'
          }}>
            <strong>EDF (Earliest Deadline First):</strong> Algoritmo ótimo para sistemas
            uniprocessados com prioridade dinâmica. O job com deadline absoluto mais próximo
            sempre executa. Escalonável se U ≤ 1 (100% de utilização da CPU).
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
