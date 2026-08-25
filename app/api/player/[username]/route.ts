import { NextResponse } from "next/server";
const API = "https://api.chess.com/pub/player";

function resultFor(game: any, username: string) {
  const mine = game.white?.username?.toLowerCase() === username.toLowerCase() ? game.white : game.black;
  if (!mine) return "loss";
  if (mine.result === "win") return "win";
  if (["agreed","repetition","stalemate","insufficient","50move","timevsinsufficient"].includes(mine.result)) return "draw";
  return "loss";
}
function openingName(pgn = "") {
  const slug = pgn.match(/\[ECOUrl "[^"]+\/openings\/([^"]+)"\]/)?.[1];
  return slug ? decodeURIComponent(slug).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/ Variation.*$/, "") : "Unclassified opening";
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const headers = { "User-Agent": "ChessStat/0.1 (product prototype; contact: hello@chessstat.com)" };
  try {
    const profileRes = await fetch(`${API}/${encodeURIComponent(username)}`, { headers, next: { revalidate: 3600 } });
    if (!profileRes.ok) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    const profile = await profileRes.json();
    const statsRes = await fetch(`${API}/${encodeURIComponent(username)}/stats`, { headers, next: { revalidate: 3600 } });
    const archiveRes = await fetch(`${API}/${encodeURIComponent(username)}/games/archives`, { headers, next: { revalidate: 3600 } });
    const stats = statsRes.ok ? await statsRes.json() : {};
    const archives = archiveRes.ok ? (await archiveRes.json()).archives ?? [] : [];
    const games: any[] = [];
    for (const url of archives.slice(-2).reverse()) {
      const response = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (response.ok) games.push(...((await response.json()).games ?? []));
    }
    const recent = games.filter(g => ["rapid","blitz","bullet"].includes(g.time_class)).slice(-100);
    let wins=0, draws=0, losses=0, whiteGames=0, whiteWins=0, blackGames=0, blackWins=0;
    const accuracies:number[] = [], openingMap = new Map<string,{count:number;points:number}>();
    for (const game of recent) {
      const result = resultFor(game, username);
      if (result === "win") wins++; else if (result === "draw") draws++; else losses++;
      const asWhite = game.white?.username?.toLowerCase() === username.toLowerCase();
      if (asWhite) { whiteGames++; if (result === "win") whiteWins++; } else { blackGames++; if (result === "win") blackWins++; }
      const accuracy = asWhite ? game.accuracies?.white : game.accuracies?.black;
      if (typeof accuracy === "number") accuracies.push(accuracy);
      const opening = openingName(game.pgn), item = openingMap.get(opening) ?? { count:0, points:0 };
      item.count++; item.points += result === "win" ? 1 : result === "draw" ? .5 : 0; openingMap.set(opening,item);
    }
    const allOpenings = [...openingMap.entries()].sort((a,b)=>b[1].count-a[1].count);
    const openings = allOpenings.slice(0,3).map(([name,v])=>({name,count:v.count,score:Math.round(v.points/v.count*100)}));
    const whiteWinRate = whiteGames?Math.round(whiteWins/whiteGames*100):0;
    const blackWinRate = blackGames?Math.round(blackWins/blackGames*100):0;
    const avgAccuracy = accuracies.length?accuracies.reduce((a,b)=>a+b,0)/accuracies.length:undefined;
    const accuracyDeviation = avgAccuracy===undefined?undefined:Math.sqrt(accuracies.reduce((sum,value)=>sum+(value-avgAccuracy)**2,0)/accuracies.length);
    const clamp = (value:number)=>Math.max(35,Math.min(95,Math.round(value)));
    const topOpeningGames = openings.reduce((sum,o)=>sum+o.count,0);
    const openingImpact = topOpeningGames?openings.reduce((sum,o)=>sum+o.score*o.count,0)/topOpeningGames:50;
    const fingerprint = {
      accuracy: clamp(avgAccuracy??65),
      initiative: clamp(40+whiteWinRate*.72),
      resilience: clamp(12+blackWinRate),
      consistency: clamp(accuracyDeviation===undefined?62:94-accuracyDeviation*2.2),
      adaptability: clamp(47+allOpenings.length*2.4),
      openingImpact: clamp(openingImpact),
      confidence: recent.length>=60&&accuracies.length>=20?"High":recent.length>=30?"Medium":"Early read"
    };
    return NextResponse.json({
      username: profile.username, avatar: profile.avatar, country: profile.country,
      ratings: { chess_rapid:stats.chess_rapid?.last?.rating, chess_blitz:stats.chess_blitz?.last?.rating, chess_bullet:stats.chess_bullet?.last?.rating },
      recent: { games:recent.length,wins,draws,losses,whiteWinRate,blackWinRate,avgAccuracy,accuracyGames:accuracies.length,openingCount:allOpenings.length,openings:openings.length?openings:[{name:"Not enough recent data",count:0,score:0}] },
      fingerprint
    });
  } catch {
    return NextResponse.json({ error: "Chess data unavailable" }, { status: 502 });
  }
}
