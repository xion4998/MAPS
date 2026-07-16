/* eslint-disable */
import { useState, useMemo } from "react";

const ZONES = ["상부", "하부", "B", "C", "D", "P", "T", "W", "Z"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P": "#059669", "T": "#db2777", "W": "#65a30d", "Z": "#d97706",
};

// 호기별 라인 구성
const MACHINE_LINES = {
  1: [
    { line: 1, numbers: [11,12,13,14,15,16,17,18] },
    { line: 2, numbers: [21,22,23,24,25,26,27,28] },
  ],
  2: [
    { line: 3, numbers: [31,32,33,34,35,36,37,38] },
    { line: 4, numbers: [41,42,43,44,45,46,47,48] },
  ],
};
const MACHINES = [1, 2];
const TYPES = ["플로우", "선반"];

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try {
    const saved = localStorage.getItem("maps_data");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const d = {};
  ZONES.forEach(z => {
    d[z] = {};
    MACHINES.forEach(m => {
      d[z][m] = {};
      MACHINE_LINES[m].forEach(({ line }) => {
        d[z][m][line] = { flow: Array(8).fill(false), shelf: Array(8).fill(false), flowPicking: false, shelfPicking: false };
      });
    });
  });
  return d;
};

function CircleProgress({ percent, color, size = 80 }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeMachine, setActiveMachine] = useState(1);
  const [activeLine, setActiveLine] = useState(1);
  const [copied, setCopied] = useState(false);
  const [enabledMachines, setEnabledMachines] = useState(() => {
    try { const s = localStorage.getItem("maps_enabled_machines"); if (s) return JSON.parse(s); } catch (e) {}
    return { 1: true, 2: true };
  });

  const toggleMachineEnabled = (m) => {
    const next = { ...enabledMachines, [m]: !enabledMachines[m] };
    setEnabledMachines(next);
    try { localStorage.setItem("maps_enabled_machines", JSON.stringify(next)); } catch (e) {}
  };
  const [resetConfirm, setResetConfirm] = useState(false);

  const saveData = (d) => { setData(d); try { localStorage.setItem("maps_data", JSON.stringify(d)); } catch (e) {} };

  const toggleNum = (zone, machine, line, type, idx) => {
    const current = data[zone][machine][line][type];
    const allChecked = current.slice(0, idx + 1).every(v => v);
    const newArr = [...current];
    if (allChecked) { for (let i = idx; i < 8; i++) newArr[i] = false; }
    else { for (let i = 0; i <= idx; i++) newArr[i] = true; }

    const newMachineData = { ...data[zone][machine], [line]: { ...data[zone][machine][line], [type]: newArr } };

    // 뒤 라인 체크되면 앞 라인 자동 완료
    if (!allChecked) {
      const lines = MACHINE_LINES[machine];
      const lineIdx = lines.findIndex(l => l.line === line);
      for (let i = 0; i < lineIdx; i++) {
        const prevLine = lines[i].line;
        newMachineData[prevLine] = { ...newMachineData[prevLine], [type]: Array(8).fill(true) };
      }
    }

    saveData({ ...data, [zone]: { ...data[zone], [machine]: newMachineData } });
  };

  const togglePicking = (zone, machine, line, type) => {
    const pickKey = type === "flow" ? "flowPicking" : "shelfPicking";
    const cur = data[zone][machine][line];
    const newVal = !(cur[pickKey] || false);
    const newMachineData = { ...data[zone][machine], [line]: { 
      ...cur, 
      [pickKey]: newVal,
      // 피킹완료 시 해당 타입 전체 체크, 해제 시 그대로 유지
      [type]: newVal ? Array(8).fill(true) : cur[type],
    }};

    // 피킹완료 체크 시 앞 라인도 자동 완료
    if (newVal) {
      const lines = MACHINE_LINES[machine];
      const lineIdx = lines.findIndex(l => l.line === line);
      for (let i = 0; i < lineIdx; i++) {
        const prevLine = lines[i].line;
        newMachineData[prevLine] = {
          ...newMachineData[prevLine],
          [type]: Array(8).fill(true),
          [pickKey]: true,
        };
      }
    }

    saveData({ ...data, [zone]: { ...data[zone], [machine]: newMachineData } });
  };

  const resetAll = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    const d = {};
    ZONES.forEach(z => {
      d[z] = {};
      MACHINES.forEach(m => {
        d[z][m] = {};
        MACHINE_LINES[m].forEach(({ line }) => { d[z][m][line] = { flow: Array(8).fill(false), shelf: Array(8).fill(false), flowPicking: false, shelfPicking: false }; });
      });
    });
    saveData(d); setResetConfirm(false);
  };

  const stats = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      let flowDone = 0, shelfDone = 0;
      const total = MACHINES.reduce((s, m) => s + MACHINE_LINES[m].length * 8, 0);
      MACHINES.forEach(m => MACHINE_LINES[m].forEach(({ line }) => {
        flowDone += data[z][m][line].flow.filter(v=>v).length;
        shelfDone += data[z][m][line].shelf.filter(v=>v).length;
      }));
      out[z] = { flowDone, shelfDone, total, flowPct: Math.round((flowDone/total)*100), shelfPct: Math.round((shelfDone/total)*100), pct: Math.round(((flowDone+shelfDone)/(total*2))*100) };
    });
    return out;
  }, [data]);

  const machineTotals = useMemo(() => {
    const out = {};
    MACHINES.forEach(m => {
      let flowDone = 0, shelfDone = 0;
      ZONES.forEach(z => MACHINE_LINES[m].forEach(({ line }) => {
        flowDone += data[z][m][line].flow.filter(v=>v).length;
        shelfDone += data[z][m][line].shelf.filter(v=>v).length;
      }));
      const total = ZONES.length * MACHINE_LINES[m].length * 8;
      out[m] = { flowPct: Math.round((flowDone/total)*100), shelfPct: Math.round((shelfDone/total)*100) };
    });
    return out;
  }, [data]);

  const grand = useMemo(() => {
    const total = ZONES.length * MACHINES.reduce((s,m) => s + MACHINE_LINES[m].length * 8, 0);
    const flowDone = ZONES.reduce((s,z) => s+stats[z].flowDone, 0);
    const shelfDone = ZONES.reduce((s,z) => s+stats[z].shelfDone, 0);
    return { flowDone, shelfDone, total, flowPct: Math.round((flowDone/total)*100), shelfPct: Math.round((shelfDone/total)*100), pct: Math.round(((flowDone+shelfDone)/(total*2))*100) };
  }, [stats]);

  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth()+1, day = now.getDate();
    const lines = [`MAPS (${timeStr})`, `${month}월${day}일자`, `──────────────`];

    MACHINES.filter(m => enabledMachines[m]).forEach(m => {
      lines.push(`MAPS ${m}호기`);

      // 존별 상태 계산 (라인 합산)
      const zoneStatus = {};
      ZONES.forEach(z => {
        let flowDone = 0, shelfDone = 0, flowTotal = 0, shelfTotal = 0;
        let flowPicking = false, shelfPicking = false;
        MACHINE_LINES[m].forEach(({ line, numbers }) => {
          flowDone += data[z][m][line].flow.filter(v=>v).length;
          shelfDone += data[z][m][line].shelf.filter(v=>v).length;
          flowTotal += 8; shelfTotal += 8;
          if (data[z][m][line].flowPicking) flowPicking = true;
          if (data[z][m][line].shelfPicking) shelfPicking = true;
        });
        const flowAll = flowDone === flowTotal;
        const shelfAll = shelfDone === shelfTotal;
        const lastFlowNum = (() => {
          for (let li = MACHINE_LINES[m].length - 1; li >= 0; li--) {
            const { line, numbers } = MACHINE_LINES[m][li];
            const cnt = data[z][m][line].flow.filter(v=>v).length;
            if (cnt > 0) return numbers[cnt - 1];
          }
          return null;
        })();
        const lastShelfNum = (() => {
          for (let li = MACHINE_LINES[m].length - 1; li >= 0; li--) {
            const { line, numbers } = MACHINE_LINES[m][li];
            const cnt = data[z][m][line].shelf.filter(v=>v).length;
            if (cnt > 0) return numbers[cnt - 1];
          }
          return null;
        })();

        // 둘 다 피킹완료
        if (flowPicking && shelfPicking) { zoneStatus[z] = "완료"; return; }

        // 플로우 상태
        let flowStatus = "";
        if (flowPicking) flowStatus = "플로우 피킹완료";
        else if (flowAll) flowStatus = "플로우 불출완료";
        else if (flowDone > 0) flowStatus = `플로우 ${lastFlowNum} 불출중`;

        // 선반 상태
        let shelfStatus = "";
        if (shelfPicking) shelfStatus = "선반 피킹완료";
        else if (shelfAll) shelfStatus = "선반 불출완료";
        else if (shelfDone > 0) shelfStatus = `선반 ${lastShelfNum} 불출중`;

        if (!flowStatus && !shelfStatus) { zoneStatus[z] = "미불출"; return; }
        if (flowAll && shelfAll && !flowPicking && !shelfPicking) { zoneStatus[z] = "불출완료"; return; }

        const parts = [flowStatus, shelfStatus].filter(Boolean);
        zoneStatus[z] = parts.join(" / ");
      });

      // 같은 상태끼리 묶기
      const statusGroups = {};
      ZONES.forEach(z => {
        const st = zoneStatus[z];
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(z);
      });

      // 완료 > 불출완료 > 나머지 > 미불출 순서로 정렬
      const order = ["완료", "불출완료"];
      const sorted = Object.entries(statusGroups).sort(([a], [b]) => {
        const ai = order.indexOf(a) >= 0 ? order.indexOf(a) : a === "미불출" ? 999 : 50;
        const bi = order.indexOf(b) >= 0 ? order.indexOf(b) : b === "미불출" ? 999 : 50;
        return ai - bi;
      });

      sorted.forEach(([status, zones]) => {
        const names = zones.map(z => z.length<=1?z+"존":z).join("/");
        lines.push(`${names} : ${status}`);
      });
    });

    lines.push(`──────────────`, `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = { bg:"#f0f4f8", card:"#ffffff", border:"#e2e8f0", text:"#0f172a", textSub:"#64748b", inputBg:"#f8fafc", shadow:"0 1px 8px rgba(0,0,0,0.08)", shadowMd:"0 2px 16px rgba(0,0,0,0.10)" };
  const activeColor = ZONE_COLORS[activeZone];
  const mc = activeMachine === 1 ? "#7c3aed" : "#0891b2";

  return (
    <div style={{ minHeight:"100vh", background:S.bg, color:S.text, fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding:"20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:0, letterSpacing:"0.08em", background:"linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>MAPS</h1>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:S.textSub, textTransform:"uppercase", marginTop:4, fontWeight:500 }}>피킹 진행 현황</div>
      </div>

      {/* Grand Total */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[{label:"플로우 피킹률", pct:grand.flowPct, done:grand.flowDone, grad:"linear-gradient(135deg,#059669,#047857)", shadow:"rgba(5,150,105,0.25)"},
          {label:"선반 피킹률", pct:grand.shelfPct, done:grand.shelfDone, grad:"linear-gradient(135deg,#f59e0b,#d97706)", shadow:"rgba(245,158,11,0.25)"}].map((item,i) => (
          <div key={i} style={{ flex:1, background:item.grad, borderRadius:16, padding:"14px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:5, boxShadow:`0 4px 16px ${item.shadow}` }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{item.label}</div>
            <div style={{ position:"relative" }}>
              <CircleProgress percent={item.pct} color="#ffffff" size={76} />
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{item.pct}%</span>
              </div>
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)" }}>{item.done}/{grand.total}</div>
            <div style={{ display:"flex", gap:5, width:"100%" }}>
              {MACHINES.map(m => (
                <div key={m} style={{ flex:1, background:"rgba(255,255,255,0.15)", borderRadius:7, padding:"3px 0", textAlign:"center" }}>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.7)" }}>{m}호기</div>
                  <div style={{ fontSize:12, fontWeight:800, color:"#fff" }}>{i===0?machineTotals[m].flowPct:machineTotals[m].shelfPct}%</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Zone Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        {ZONES.map(z => {
          const { flowPct, shelfPct, pct } = stats[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <button key={z} onClick={() => setActiveZone(z)} style={{ background:isActive?color+"12":S.card, border:`1.5px solid ${isActive?color:S.border}`, borderRadius:12, padding:"10px 6px", cursor:"pointer", textAlign:"center", boxShadow:S.shadow, transition:"all 0.2s" }}>
              <div style={{ fontSize:11, color, fontWeight:700, marginBottom:3 }}>{z} 존</div>
              <div style={{ fontSize:18, fontWeight:900, color:S.text, marginBottom:4 }}>{pct}%</div>
              <div style={{ height:4, background:"#e2e8f0", borderRadius:2 }}><div style={{ height:4, borderRadius:2, background:color, width:`${pct}%`, transition:"width 0.4s" }} /></div>
            </button>
          );
        })}
      </div>

      {/* 체크 패널 */}
      <div style={{ background:S.card, border:`1.5px solid ${activeColor}`, borderRadius:16, padding:16, marginBottom:16, boxShadow:S.shadowMd }}>
        {/* 존 + 호기 선택 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:activeColor }}>{activeZone} 존</div>
          <div style={{ display:"flex", gap:6 }}>
            {MACHINES.map(m => (
              <button key={m} onClick={() => { setActiveMachine(m); setActiveLine(MACHINE_LINES[m][0].line); }} style={{ background:activeMachine===m?(m===1?"#7c3aed":"#0891b2"):S.inputBg, border:`1px solid ${m===1?"#7c3aed":"#0891b2"}`, borderRadius:8, padding:"5px 14px", cursor:"pointer", color:activeMachine===m?"#fff":S.textSub, fontSize:12, fontWeight:700, fontFamily:"inherit" }}>{m}호기</button>
            ))}
          </div>
        </div>

        {/* 라인 선택 */}
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {MACHINE_LINES[activeMachine].map(({ line, numbers }) => (
            <button key={line} onClick={() => setActiveLine(line)} style={{ flex:1, background:activeLine===line?mc:S.inputBg, border:`1px solid ${mc}`, borderRadius:8, padding:"5px 0", cursor:"pointer", color:activeLine===line?"#fff":S.textSub, fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
              {line}라인 ({numbers[0]}~{numbers[7]})
            </button>
          ))}
        </div>

        {/* 피킹완료 버튼 - 플로우/선반 각각 */}
        {(() => {
          const cur = data[activeZone][activeMachine][activeLine];
          const flowAll = cur.flow.every(v=>v);
          const shelfAll = cur.shelf.every(v=>v);
          const flowPicking = cur.flowPicking || false;
          const shelfPicking = cur.shelfPicking || false;
          const flowBul = flowAll && !flowPicking;
          const shelfBul = shelfAll && !shelfPicking;
          return (
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={() => togglePicking(activeZone, activeMachine, activeLine, "flow")} style={{ flex:1, fontSize:11, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s", background:flowBul?"#dcfce7":flowPicking?"#fef9c3":"#f8fafc", border:`1.5px solid ${flowBul?"#86efac":flowPicking?"#fde047":"#e2e8f0"}`, color:flowBul?"#15803d":flowPicking?"#a16207":"#94a3b8", fontFamily:"inherit" }}>
                {flowBul ? "✓ 플 불출완료" : flowPicking ? "✓ 플 피킹완료" : "플로우 피킹완료"}
              </button>
              <button onClick={() => togglePicking(activeZone, activeMachine, activeLine, "shelf")} style={{ flex:1, fontSize:11, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s", background:shelfBul?"#dcfce7":shelfPicking?"#fef9c3":"#f8fafc", border:`1.5px solid ${shelfBul?"#86efac":shelfPicking?"#fde047":"#e2e8f0"}`, color:shelfBul?"#15803d":shelfPicking?"#a16207":"#94a3b8", fontFamily:"inherit" }}>
                {shelfBul ? "✓ 선 불출완료" : shelfPicking ? "✓ 선 피킹완료" : "선반 피킹완료"}
              </button>
            </div>
          );
        })()}

        {/* 플로우/선반 체크 */}
        {(() => {
          const lineInfo = MACHINE_LINES[activeMachine].find(l => l.line === activeLine);
          const numbers = lineInfo ? lineInfo.numbers : [];
          return TYPES.map(type => {
            const typeKey = type === "플로우" ? "flow" : "shelf";
            const checks = data[activeZone][activeMachine][activeLine][typeKey];
            const doneCnt = checks.filter(v=>v).length;
            const typeColor = type === "플로우" ? "#059669" : "#d97706";
            return (
              <div key={type} style={{ marginBottom:type==="플로우"?14:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:typeColor, background:typeColor+"12", border:`1px solid ${typeColor}33`, borderRadius:7, padding:"3px 12px" }}>{type}</div>
                  <div style={{ fontSize:11, color:S.textSub }}>{doneCnt} / 8 완료</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:5 }}>
                  {numbers.map((n, idx) => {
                    const done = checks[idx];
                    return (
                      <button key={n} onClick={() => toggleNum(activeZone, activeMachine, activeLine, typeKey, idx)} style={{ background:done?typeColor:S.inputBg, border:`1.5px solid ${done?typeColor:S.border}`, borderRadius:8, padding:"8px 2px", cursor:"pointer", color:done?"#fff":S.textSub, fontSize:11, fontWeight:700, display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"all 0.15s", fontFamily:"inherit" }}>
                        {n}<span style={{ fontSize:9 }}>{done?"✓":"·"}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ height:4, background:"#e2e8f0", borderRadius:2, marginTop:8 }}>
                  <div style={{ height:4, borderRadius:2, background:typeColor, width:`${(doneCnt/8)*100}%`, transition:"width 0.3s" }} />
                </div>
              </div>
            );
          });
        })()}

        <div style={{ marginTop:12, background:S.inputBg, border:`1px solid ${S.border}`, borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:12, color:S.textSub }}>{activeZone} 존 {activeMachine}호기 {activeLine}라인</div>
          <div style={{ display:"flex", gap:12 }}>
            <span style={{ fontSize:12, color:"#059669", fontWeight:700 }}>플 {data[activeZone][activeMachine][activeLine].flow.filter(v=>v).length}/8</span>
            <span style={{ fontSize:12, color:"#d97706", fontWeight:700 }}>선 {data[activeZone][activeMachine][activeLine].shelf.filter(v=>v).length}/8</span>
          </div>
        </div>
      </div>

      {/* 존별 요약 */}
      <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:16, padding:16, boxShadow:S.shadow }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:S.text }}>존별 요약</div>
          <div style={{ display:"flex", gap:6 }}>
            {MACHINES.map(m => (
              <button key={m} onClick={() => toggleMachineEnabled(m)} style={{
                fontSize:10, fontWeight:800, padding:"4px 12px", borderRadius:8, cursor:"pointer",
                background: enabledMachines[m] ? (m===1?"#7c3aed":"#0891b2") : "#f8fafc",
                border: `1px solid ${m===1?"#7c3aed":"#0891b2"}`,
                color: enabledMachines[m] ? "#fff" : "#94a3b8",
                fontFamily:"inherit", transition:"all 0.15s"
              }}>
                {m}호기 {enabledMachines[m] ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:S.inputBg, borderRadius:10, padding:"12px 14px", marginBottom:10, fontSize:12, lineHeight:1.8, color:S.textSub, fontFamily:"monospace", whiteSpace:"pre-wrap", border:`1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width:"100%", background:copied?"#059669":"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"inherit" }}>
          {copied?"✓ 복사됨!":"📤 현황 공유"}
        </button>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ZONES.map(z => {
            const { flowPct, shelfPct } = stats[z];
            const totalPct = Math.round((flowPct + shelfPct) / 2);
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color, minWidth:32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex:1, height:8, background:"#e2e8f0", borderRadius:4 }}>
                  <div style={{ height:8, borderRadius:4, background:`linear-gradient(90deg,${color},${color}88)`, width:`${totalPct}%`, transition:"width 0.4s" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:800, minWidth:40, textAlign:"right", color:totalPct===100?"#059669":S.text }}>{totalPct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={resetAll} style={{ width:"100%", background:resetConfirm?"#fee2e2":S.card, border:`1px solid ${resetConfirm?"#dc2626":"#fecaca"}`, borderRadius:12, padding:"12px 0", cursor:"pointer", color:"#dc2626", fontSize:13, fontWeight:700, marginTop:16, boxShadow:S.shadow, fontFamily:"inherit" }}>
        {resetConfirm?"한 번 더 탭하면 초기화됩니다":"🔄 전체 초기화"}
      </button>
    </div>
  );
}
