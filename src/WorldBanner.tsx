type Props = {name:string;failedAttempts:number;playing:boolean;busy:boolean;hintRevealed:boolean;onHint:()=>void;onSurrender:()=>void};
export function WorldBanner({name,failedAttempts,playing,busy,hintRevealed,onHint,onSurrender}:Props) {
 return <section className="game-banner world-banner" aria-labelledby="game-title">
 <h1 id="game-title"><span>Угадай сегодняшнего персонажа из</span><span>«{name}»!</span></h1>
 <div className="world-banner-cards">
 <button disabled={!playing||busy||failedAttempts<5||hintRevealed} onClick={onHint} title={hintRevealed?'Подсказка уже открыта':failedAttempts<5?`Ещё ${5-failedAttempts} неверных попыток`:'Открыть подсказку первого появления'}><span aria-live="polite">{hintRevealed?'ПОДСКАЗКА ОТКРЫТА':'ПЕРВОЕ ПОЯВЛЕНИЕ'}<br/><strong>{Math.min(failedAttempts,5)}/5</strong></span></button>
 <button disabled={!playing||busy||failedAttempts<10} onClick={onSurrender} title={failedAttempts<10?`Ещё ${10-failedAttempts} неверных попыток`:'Показать ответ и завершить партию'}><span aria-live="polite">ПОКАЗАТЬ ПЕРСОНАЖА<br/>И СДАТЬСЯ<br/><strong>{Math.min(failedAttempts,10)}/10</strong></span></button>
 </div></section>;
}
