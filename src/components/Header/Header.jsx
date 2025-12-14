// Components

// Images

// Imports

// Styles
import s from './Header.module.css';

export default function Header({selectedButton, setSelectedButton, setDelay, delay}) {
  return (
    <header className={s.wrapperHeader}>
      <section className={s.displayMethod}>
        <h1>Método:</h1>
        <ul className={s.methodSelection}>
          {/* <li>
            <button
              className={selectedButton == 0 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(0)}
            >FIFO</button>
          </li>
          <li>
            <button
              className={selectedButton == 1 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(1)}
            >SJF</button>
          </li> */}
          <li>
            <button
              className={selectedButton == 0 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(0)}
            >RM</button>
          </li>
          {/* <li>
            <button
              className={selectedButton == 3 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(3)}
            >EDF</button>
          </li>
          <li>
            <button
              className={selectedButton == 4 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(4)}
            >RR</button>
          </li> */}
          <li>
            <button
              className={selectedButton == 1 ? s.selectedButton : s.notSelectedButton}
              onClick={() => setSelectedButton(1)}
            >DM</button>
          </li>
        </ul>
      </section>
      <section className={s.wrapperSettings}>
        {/* <div>
          <p>Quantum:</p>
          <input onChange={(e) => setQuantum(e.target.value)} value={quantum} className={s.inputStyle} type='number' min='1' max='100' step='1' />
        </div>
        <div>
          <p>Sobrecarga:</p>
          <input onChange={(e) => setOverload(e.target.value)} value={overload} className={s.inputStyle} type='number' min='1' max='100' step='1' />
        </div> */}
        <div className={s.wrapperDelay}>
          <div className={s.wrapperDelaySeconds}>
            <p>Delay: </p>
            <input onChange={(e) => setDelay(parseFloat(e.target.value))} type="range" min="0" max="2" step={0.5} value={delay} />
            <p>{delay}</p>
          </div>
        </div>
      </section>
    </header>
  );
}
