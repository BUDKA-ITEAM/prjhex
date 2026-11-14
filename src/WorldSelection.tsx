import { Anchor, ArrowRight, Flame, Leaf, Shield, Sparkles, Zap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { worlds, type FranchiseId } from '../shared/game.js';
import { readSaved } from './api.js';
import './world-selection.css';

const telegramGroupUrl = '';

const visuals = {
  'one-piece': { icon: Anchor, art: 'onepiece-wano.png', description: 'Отправляйся на Гранд-Лайн и найди загаданного героя.' },
  naruto: { icon: Leaf, art: 'naruto-village.png', description: 'Узнай шиноби по клану, стихиям и техникам.' },
  'fairy-tail': { icon: Flame, art: 'fairy-tail-banner-v1.png', description: 'Распутай следы магии и найди мага своей гильдии.' },
  dxd: { icon: Zap, art: 'dxd-banner-v1.png', description: 'Раскрой загадку клуба оккультных исследований.' },
  'girls-und-panzer': { icon: Shield, art: 'gup-banner-v1.png', description: 'Определи героиню по школе, команде и танку.' },
  'prison-school': { icon: Shield, art: 'prison-school-banner-v1.png', description: 'Проверь, как хорошо ты знаешь академию Хатимицу.' },
};

export function WorldSelection({ lastWorld, onSelect }: { lastWorld: FranchiseId; onSelect: (id: FranchiseId) => void }) {
  return <div className="world-home">
    <header className="site-header">
      <a className="wordmark" href="#worlds" aria-label="ANIDLE, выбор мира"><span className="brand-icon"><Sparkles size={19}/></span>ANI<span className="wordmark-soft">DLE</span><span className="beta">BETA</span></a>
    </header>
    <main className="world-home-main">
      <section className="world-grid" id="worlds" aria-label="Выбор мира">
        {worlds.map(world => {
          const { icon: Icon, art, description } = visuals[world.id];
          const hasProgress = Boolean(readSaved(`anidle-game:${world.id}`));
          return <button key={world.id} className="world-card" style={{ '--world-accent': world.accent, '--card-art': `url('/art/${art}')` } as CSSProperties} onClick={() => onSelect(world.id)} aria-label={`Открыть мир: ${world.name}`}>
            <span className="world-card-art" aria-hidden="true"/>
            <span className="world-card-top"><span className="world-card-icon"><Icon size={22}/></span><span className="world-card-tag">{hasProgress && world.id === lastWorld ? 'ПОСЛЕДНИЙ МИР' : world.japanese}</span></span>
            <span className="world-card-content"><span className="world-card-title">{world.name}</span><span className="world-card-description">{description}</span><span className="world-card-action">{hasProgress ? 'Вернуться в мир' : 'Войти в мир'}<ArrowRight size={18}/></span></span>
          </button>;
        })}
      </section>
    </main>
    <footer className="home-footer">
      <span>Наша группа —</span>
      <a className="telegram-group-link" href={telegramGroupUrl} aria-label="Наша группа в Telegram" onClick={event => { if (!telegramGroupUrl) event.preventDefault(); }}>
        <svg className="telegram-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2AABEE"/><path fill="#fff" d="M5.1 11.6 18 6.7c.6-.2 1 .1.8.8l-2.2 10.3c-.1.7-.6.9-1.2.5l-3.3-2.4-1.6 1.6c-.2.2-.3.3-.6.3l.2-3.4 6.2-5.6c.3-.2-.1-.4-.4-.2l-7.6 4.8-3.3-1c-.7-.2-.7-.6.1-.8Z"/></svg>
        <span>Telegram</span>
      </a>
    </footer>
  </div>;
}
