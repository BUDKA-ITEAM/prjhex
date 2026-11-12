type OnePieceBannerProps = {
  failedAttempts: number;
  playing: boolean;
  busy: boolean;
  hintRevealed: boolean;
  onHint: () => void;
  onSurrender: () => void;
};

export function OnePieceBanner({ failedAttempts, playing, busy, hintRevealed, onHint, onSurrender }: OnePieceBannerProps) {
  return <section className="game-banner onepiece-scroll" aria-labelledby="game-title">
    <h1 id="game-title"><span>Угадай сегодняшнего</span><span>персонажа из</span><span>«Ван Писа»!</span></h1>
    <div className="onepiece-cards">
      <button className="onepiece-card" disabled={!playing || busy || failedAttempts < 5 || hintRevealed} onClick={onHint}
        title={hintRevealed ? 'Подсказка уже открыта' : failedAttempts < 5 ? `Ещё ${5 - failedAttempts} неверных попыток` : 'Открыть подсказку первого появления'}>
        <span aria-live="polite">{hintRevealed ? 'ПОДСКАЗКА ОТКРЫТА' : 'ПЕРВОЕ ПОЯВЛЕНИЕ'}<br/><strong>{Math.min(failedAttempts, 5)}/5</strong></span>
      </button>
      <button className="onepiece-card" disabled={!playing || busy || failedAttempts < 10} onClick={onSurrender}
        title={failedAttempts < 10 ? `Ещё ${10 - failedAttempts} неверных попыток` : 'Показать ответ и завершить партию'}>
        <span aria-live="polite">ПОКАЗАТЬ ПЕРСОНАЖА<br/>И СДАТЬСЯ<br/><strong>{Math.min(failedAttempts, 10)}/10</strong></span>
      </button>
    </div>
  </section>;
}
