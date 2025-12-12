import { useState } from "react";

// Components
import Header from "./components/Header/Header";
import ProcessView from "./components/ProcessView/ProcessView";
import Fifo from "./components/Fifo/Fifo";
import ShortestJob from "./components/ShortestJob/ShortestJob";
import RateMonotonic from "./components/RateMonotonic/RateMonotonic";
import EarliestDeadline from "./components/EarliestDeadline/EarliestDeadline";
import RoundRobin from "./components/RoundRobin/RoundRobin";

// Styles
import s from "./App.module.css";

function App() {
  const [selectedButton, setSelectedButton] = useState(0);
  /* const [quantum, setQuantum] = useState(1);
  const [overload, setOverload] = useState(1); */
  const [delay, setDelay] = useState(1);
  const [reset, setReset] = useState(false);

  const [processes, setProcesses] = useState([
    {
      id: 1,
      time: 1,
      deadline: 1,
      arrival: 0,
      priority: 0,
      period: 1,
      cycles: 1,
      status: "Waiting",
    },
  ]);

  const generateSimulationProcesses = () => {
    let expandedList = [];

    processes.forEach((p) => {
      const cycles = p.period > 0 && p.cycles > 0 ? p.cycles : 1;

      for (let i = 0; i < cycles; i++) {
        const timeShift = i * p.period;
        const relativeDeadline = p.deadline - p.arrival;
        const newArrival = p.arrival + timeShift;
        const newDeadline = newArrival + relativeDeadline;

        expandedList.push({
          ...p,
          id: `${p.id}-${i}`,
          originalId: p.id,
          arrival: newArrival,
          deadline: newDeadline,
          status: "Waiting",
          period: 0,
          cycles: 1,
        });
      }
    });

    return expandedList.sort((a, b) => a.arrival - b.arrival);
  };

  const simulationProcesses = generateSimulationProcesses();

  return (
    <main className={s.wrapperMain}>
      <div className={s.titleWrapper}>
        <h2 className={s.titleName}>Escalonador de Processos</h2>
        <p className={s.weNames}>
          Desenvolvido por Bruna Anunciação e Victoria Beatriz
        </p>
      </div>
      <section className={s.internDiv}>
        <div className={s.scrollView}>
          <Header
            selectedButton={selectedButton}
            setSelectedButton={setSelectedButton}
            setDelay={setDelay}
            delay={delay}
          />
          <ProcessView processes={processes} setProcesses={setProcesses} />
          <div className={s.line} />
          <div className={s.algorithmArea}>
            {selectedButton === 0 && (
              <Fifo
                processes={simulationProcesses}
                setReset={setReset}
                delay={delay}
              />
            )}
            {selectedButton === 1 && (
              <ShortestJob
                processes={simulationProcesses}
                setReset={setReset}
                delay={delay}
              />
            )}
            {selectedButton === 2 && (
              <RateMonotonic
                processes={simulationProcesses}
                setReset={setReset}
                delay={delay}
              />
            )}
            {selectedButton === 3 && (
              <EarliestDeadline
                processes={simulationProcesses}
                setReset={setReset}
                delay={delay}
                quantum={3}
                overload={1}
              />
            )}
            {selectedButton === 4 && (
              <RoundRobin
                processes={simulationProcesses}
                setReset={setReset}
                delay={delay}
                quantum={1}
                overload={1}
              />
            )}
          </div>
          <div className={s.line} />
        </div>
      </section>
    </main>
  );
}

export default App;
