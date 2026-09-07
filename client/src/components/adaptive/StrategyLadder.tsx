import type { AdaptiveStrategyStep } from "../../types";

interface Props {
  strategies: AdaptiveStrategyStep[];
}

export function StrategyLadder({ strategies }: Props) {
  return (
    <section className="strategy-ladder" aria-label="سلّم طرق الشرح">
      <p className="step-kicker">سلّم طرق الشرح</p>
      <ol>
        {strategies.map((item) => (
          <li key={item.id} className={`strategy-step ${item.state}`}>
            <span className="strategy-dot" aria-hidden="true" />
            <div>
              <strong>{item.label}</strong>
              {item.note ? <p>{item.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
