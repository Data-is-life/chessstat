"use client";

import { FormEvent, useMemo, useState } from "react";

type Fingerprint = {
  accuracy: number; initiative: number; resilience: number;
  consistency: number; adaptability: number; openingImpact: number;
  confidence: "High" | "Medium" | "Early read";
};
type PlayerReport = {
  username: string; avatar?: string;
  ratings: { chess_rapid?: number; chess_blitz?: number; chess_bullet?: number };
  recent: { games:number; wins:number; draws:number; losses:number; whiteWinRate:number; blackWinRate:number; avgAccuracy?:number; accuracyGames?:number; openingCount?:number; openings:{name:string;count:number;score:number}[] };
  fingerprint?: Fingerprint;
};

const demo: PlayerReport = {
  username:"rookandroll", ratings:{chess_rapid:1482,chess_blitz:1376,chess_bullet:1291},
  recent:{games:86,wins:44,draws:8,losses:34,whiteWinRate:61,blackWinRate:46,avgAccuracy:78.4,accuracyGames:42,openingCount:14,openings:[{name:"Italian Game",count:18,score:67},{name:"Queen’s Gambit",count:13,score:58},{name:"Sicilian Defense",count:11,score:45}]},
  fingerprint:{accuracy:78,initiative:84,resilience:58,consistency:72,adaptability:69,openingImpact:63,confidence:"High"}
};
const traitMeta = {
  initiative:{label:"Initiative",note:"How often you turn the first move into results"},
  accuracy:{label:"Move quality",note:"Accuracy in games with public analysis"},
  consistency:{label:"Consistency",note:"How steady your analyzed performances are"},
  adaptability:{label:"Adaptability",note:"Breadth of openings in your recent games"},
  resilience:{label:"Black resilience",note:"Your ability to score without the first move"},
  openingImpact:{label:"Opening impact",note:"Results in your most-played opening families"},
} as const;

function scoreTone(score:number){ return score>=78?"strength":score<62?"focus":"steady"; }

export default function Home(){
  const [username,setUsername]=useState(""),[report,setReport]=useState<PlayerReport>(demo);
  const [status,setStatus]=useState<"idle"|"loading"|"error"|"live">("idle");
  const [active,setActive]=useState<"rapid"|"blitz"|"bullet">("rapid");
  const [showPlan,setShowPlan]=useState(false);
  async function analyze(e:FormEvent){e.preventDefault();const clean=username.trim();if(!clean)return;setStatus("loading");setShowPlan(false);try{const res=await fetch(`/api/player/${encodeURIComponent(clean)}`);if(!res.ok)throw new Error();setReport(await res.json());setStatus("live");document.getElementById("fingerprint")?.scrollIntoView({behavior:"smooth"});}catch{setStatus("error")}}

  const fp=report.fingerprint??demo.fingerprint!;
  const traits=Object.entries(fp).filter(([key])=>key!=="confidence") as [keyof typeof traitMeta,number][];
  const focus=traits.reduce((a,b)=>a[1]<=b[1]?a:b);
  const strength=traits.reduce((a,b)=>a[1]>=b[1]?a:b);
  const currentRating=report.ratings[`chess_${active}`],total=Math.max(report.recent.games,1);
  const winPct=Math.round(report.recent.wins/total*100);
  const archetype=useMemo(()=>fp.initiative>=80?"The Tempo Setter":fp.consistency>=80?"The Clean Converter":fp.adaptability>=80?"The Shape-Shifter":"The Balanced Fighter",[fp]);
  const colorGap=Math.max(0,report.recent.whiteWinRate-report.recent.blackWinRate);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="ChessStat home"><span className="brandmark">C<span>⁺</span></span><span>ChessStat</span></a>
      <nav aria-label="Main navigation"><a href="#fingerprint">Fingerprint</a><a href="#practice">Practice plan</a><a href="#method">How it works</a></nav>
      <button className="quiet-button" onClick={()=>document.getElementById("username")?.focus()}>Discover yours →</button>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span/> Your games have a pattern</p>
        <h1>Discover your<br/><em>chess fingerprint.</em></h1>
        <p className="lede">Not another page of ratings. See the habits that make you distinctive, the evidence behind them, and the one thing worth practicing next.</p>
        <form onSubmit={analyze} className="searchbox"><label htmlFor="username">Enter your Chess.com username</label><div><span aria-hidden="true">♟</span><input id="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. hikaru" autoComplete="off"/><button disabled={status==="loading"}>{status==="loading"?"Reading your games…":"Reveal my fingerprint"}</button></div></form>
        <p className={`status ${status}`} aria-live="polite">{status==="error"?"We couldn’t find that public profile. Check the spelling and try again.":status==="live"?`Fingerprint generated from ${report.recent.games} recent public games for ${report.username}.`:"No login needed · Built from public game evidence"}</p>
      </div>
      <div className="fingerprint-preview" aria-label="Example chess fingerprint">
        <div className="preview-top"><span>CHESS FINGERPRINT / 001</span><span>{fp.confidence} confidence</span></div>
        <div className="print-orbit"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><div className="orbit-core">♞</div><span className="orbit-label l1">INITIATIVE {fp.initiative}</span><span className="orbit-label l2">RESILIENCE {fp.resilience}</span><span className="orbit-label l3">CONSISTENCY {fp.consistency}</span></div>
        <div className="preview-name"><small>PLAYING ARCHETYPE</small><strong>{archetype}</strong><p>Sets the agenda early. Most dangerous in open, active positions.</p></div>
        <div className="preview-traits">{traits.slice(0,4).map(([key,score])=><div key={key}><span>{traitMeta[key].label}</span><i><b style={{width:`${score}%`}}/></i><strong>{score}</strong></div>)}</div>
      </div>
    </section>

    <section className="fingerprint-section" id="fingerprint">
      <div className="section-heading"><div><p className="eyebrow"><span/> Your player identity</p><h2>A profile only your games could produce.</h2></div><p>{status==="live"?`Based on ${report.recent.games} recent games for ${report.username}.`:"A realistic sample report is shown until you enter a username."}</p></div>
      <div className="identity-grid">
        <aside className="player-card">
          <div className="avatar">{report.avatar?<img src={report.avatar} alt=""/>:report.username.slice(0,1).toUpperCase()}</div>
          <p className="muted">{status==="live"?"LIVE PLAYER FINGERPRINT":"SAMPLE FINGERPRINT"}</p><h3>{report.username}</h3>
          <div className="archetype-seal"><span>ARCHETYPE</span><b>{archetype}</b><small>{fp.confidence} confidence · {report.recent.games} games</small></div>
          <p className="identity-copy">You play your best chess when you create the questions. Your fingerprint favors activity and initiative over passive certainty.</p>
          <div className="time-tabs" role="tablist" aria-label="Rating time control">{(["rapid","blitz","bullet"] as const).map(t=><button key={t} role="tab" aria-selected={active===t} className={active===t?"active":""} onClick={()=>setActive(t)}>{t}</button>)}</div>
          <div className="rating-row"><span>{active} rating</span><strong>{currentRating??"—"}</strong></div>
        </aside>

        <article className="trait-card">
          <div className="card-title"><div><p className="muted">SIX-SIGNAL FINGERPRINT</p><h3>How your game behaves</h3></div><span className="method-pill">Evidence-backed beta</span></div>
          <div className="trait-list">{traits.map(([key,score])=><div className="trait" key={key}><div className="trait-name"><b>{traitMeta[key].label}</b><small>{traitMeta[key].note}</small></div><div className="trait-track"><i className={scoreTone(score)} style={{width:`${score}%`}}/></div><strong>{score}</strong><span className={scoreTone(score)}>{score>=78?"Strength":score<62?"Focus":"Steady"}</span></div>)}</div>
          <div className="confidence-note"><b>Why “{fp.confidence} confidence”?</b><span>{report.recent.accuracyGames??0} games include accuracy data, across {report.recent.openingCount??report.recent.openings.length} opening families. Scores become more stable as more games are added.</span></div>
        </article>

        <article className="evidence-card">
          <p className="muted">WHAT THE DATA SAYS</p>
          <h3>Your clearest strength</h3><strong className="evidence-score">{traitMeta[strength[0]].label} <i>{strength[1]}</i></strong>
          <p>{strength[0]==="initiative"?`You win ${report.recent.whiteWinRate}% of recent games as White. Your best results come when you claim space and dictate the direction early.`:`This is the strongest stable signal across your recent public games.`}</p>
          <div className="evidence-facts"><span><b>{report.recent.games}</b> games read</span><span><b>{winPct}%</b> win rate</span><span><b>{report.recent.avgAccuracy?.toFixed(1)??"—"}</b> avg. accuracy</span></div>
        </article>
      </div>
    </section>

    <section className="practice-section" id="practice">
      <div className="practice-intro"><p className="eyebrow light"><span/> The next best move</p><h2>One priority.<br/>Not twenty observations.</h2><p>ChessStat looks for the weakest meaningful signal with enough evidence to act on—not simply your lowest number.</p></div>
      <article className="prescription">
        <div className="rx-top"><span>YOUR 7-DAY PRACTICE PRESCRIPTION</span><span>15 min / day</span></div>
        <div className="rx-main"><div className="rx-number">01</div><div><p className="muted">HIGHEST-IMPACT OPPORTUNITY</p><h3>{focus[0]==="resilience"?"Build resilience with Black":`Strengthen ${traitMeta[focus[0]].label.toLowerCase()}`}</h3><p>Your score is <b>{focus[1]}</b>. {colorGap>0?`Your win rate falls ${colorGap} points when playing Black. That gap is large enough to prioritize this week.`:"This is the clearest high-confidence opportunity in your recent games."}</p></div></div>
        <div className="rx-evidence"><span>WHY THIS</span><p>{report.recent.blackWinRate}% wins as Black</p><p>{report.recent.openings.at(-1)?.score??0}% score in {report.recent.openings.at(-1)?.name??"your toughest opening"}</p><p>{fp.confidence} confidence</p></div>
        <button className="plan-button" onClick={()=>setShowPlan(!showPlan)} aria-expanded={showPlan}>{showPlan?"Hide practice plan":"Open my 15-minute plan"} <span>→</span></button>
        {showPlan&&<div className="practice-plan"><div><b>05 min</b><span>Replay one recent loss as Black. Stop at the first uncomfortable decision.</span></div><div><b>05 min</b><span>Solve five defensive puzzles without moving until you identify the opponent’s threat.</span></div><div><b>05 min</b><span>Return to that game position and write down two candidate moves before checking analysis.</span></div></div>}
      </article>
    </section>

    <section className="proof-section">
      <div className="section-heading"><div><p className="eyebrow"><span/> Supporting evidence</p><h2>The stats behind the story.</h2></div><p>Useful context—kept in its proper place.</p></div>
      <div className="proof-grid"><article><p className="muted">COLOR SPLIT</p><h3>First-move advantage</h3><div className="color-bars"><div><span>White</span><i><b style={{width:`${report.recent.whiteWinRate}%`}}/></i><strong>{report.recent.whiteWinRate}%</strong></div><div><span>Black</span><i><b style={{width:`${report.recent.blackWinRate}%`}}/></i><strong>{report.recent.blackWinRate}%</strong></div></div></article>
        <article><p className="muted">OPENING EVIDENCE</p><h3>Your frequent positions</h3>{report.recent.openings.map(o=><div className="opening" key={o.name}><span>{o.name}<small>{o.count} games</small></span><strong>{o.score}%</strong></div>)}</article>
        <article><p className="muted">RESULTS</p><h3>Recent outcomes</h3><div className="result-donut" style={{background:`conic-gradient(var(--acid) 0 ${winPct}%,#bac3bd ${winPct}% ${winPct+Math.round(report.recent.draws/total*100)}%,#355048 0)`}}><span><b>{winPct}%</b>wins</span></div></article></div>
    </section>

    <section className="method" id="method"><p className="eyebrow"><span/> Transparent by design</p><h2>No mystical AI labels.</h2><div className="method-grid"><article><b>01</b><h3>Read the games</h3><p>Public games, ratings, colors, openings, results, and available accuracy data.</p></article><article><b>02</b><h3>Measure behavior</h3><p>Every fingerprint dimension has a visible definition, evidence count, and confidence level.</p></article><article><b>03</b><h3>Choose the next move</h3><p>The weakest meaningful signal becomes one focused, repeatable practice prescription.</p></article></div></section>
    <footer><a className="brand" href="#top"><span className="brandmark">C<span>⁺</span></span><span>ChessStat</span></a><p>Know your game. Train what matters.</p><small>Independent product concept · Not affiliated with Chess.com</small></footer>
  </main>
}
