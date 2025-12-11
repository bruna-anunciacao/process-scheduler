// Styles
import s from "./ProcessView.module.css";

export default function ProcessView({ processes, setProcesses }) {
  const handleAddNewProcess = () => {
    setProcesses([
      ...processes,
      {
        id: processes.length + 1,
        time: 1,
        deadline: 0,
        arrival: 0,
        priority: 0,
        period: 0,
        cycles: 1,
        status: "Waiting",
      },
    ]);
  };

  const handleRemove = (id) => {
    return () => {
      setProcesses(
        processes
          .filter((process) => process.id !== id)
          .map((process, index) => ({ ...process, id: index + 1 }))
      );
    };
  };

  const handleInputChange = (id, field, value) => {
    setProcesses(
      processes.map((process) => {
        if (process.id === id) {
          const parsedValue = parseInt(value);
          return {
            ...process,
            [field]: isNaN(parsedValue) ? 0 : parsedValue,
          };
        }
        return process;
      })
    );
  };

  return (
    <section className={s.processViewWrapper}>
      <div onClick={handleAddNewProcess} className={s.addProcessBtn}>
        <p>Criar processo</p>
      </div>
      {processes.map((process) => (
        <div key={process.id} className={s.eachProcess}>
          <div className={s.cardHeader}>
            <span>Processo #{process.id}</span>
            <button
              className={s.deleteBtn}
              onClick={handleRemove(process.id)}
              title="Remover"
            >
              ×
            </button>
          </div>
          <div className={s.cardBody}>
            <div className={s.inputsGrid}>
              <div className={s.inputGroup}>
                <label>Chegada</label>
                <input
                  className={s.styledInput}
                  type="number"
                  min="0"
                  value={process.arrival}
                  onChange={(e) =>
                    handleInputChange(process.id, "arrival", e.target.value)
                  }
                />
              </div>

              <div className={s.inputGroup}>
                <label>Tempo</label>
                <input
                  className={s.styledInput}
                  type="number"
                  min="1"
                  value={process.time}
                  onChange={(e) =>
                    handleInputChange(process.id, "time", e.target.value)
                  }
                />
              </div>

              <div className={s.inputGroup}>
                <label>Deadline</label>
                <input
                  className={s.styledInput}
                  type="number"
                  min="0"
                  value={process.deadline}
                  onChange={(e) =>
                    handleInputChange(process.id, "deadline", e.target.value)
                  }
                />
              </div>

              <div className={s.inputGroup}>
                <label>Período</label>
                <input
                  className={s.styledInput}
                  type="number"
                  min="0"
                  placeholder="0 = Único"
                  value={process.period}
                  onChange={(e) =>
                    handleInputChange(process.id, "period", e.target.value)
                  }
                />
              </div>
              <div className={s.inputGroup}>
                <label>Ciclos</label>
                <input
                  className={s.styledInput}
                  type="number"
                  min="1"
                  value={process.cycles}
                  onChange={(e) =>
                    handleInputChange(process.id, "cycles", e.target.value)
                  }
                  disabled={process.period <= 0}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
