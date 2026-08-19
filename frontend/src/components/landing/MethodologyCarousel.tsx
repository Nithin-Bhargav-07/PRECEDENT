import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../layout/PageContainer';
import { 
  FileText, 
  Cpu, 
  Layers, 
  Scale, 
  GitCompare, 
  UserCheck
} from 'lucide-react';

const STAGES = [
  {
    id: 'stage-1',
    meta: 'STAGE_01 :: INPUT',
    title: 'MISSION REVIEW',
    description: 'Input evidence enters the system',
    icon: <FileText className="h-4 w-4" />,
    color: 'cyan',
    capabilities: [
      'Engineering notes',
      'Teleconference transcripts',
      'Telemetry / observations'
    ]
  },
  {
    id: 'stage-2',
    meta: 'STAGE_02 :: EXTRACTION',
    title: 'IBM GRANITE',
    description: 'AI-assisted extraction only',
    icon: <Cpu className="h-4 w-4" />,
    color: 'cyan',
    capabilities: [
      'Structured NLP extraction',
      'Identifies canonical risks',
      'Extracts verbatim evidence'
    ]
  },
  {
    id: 'stage-3',
    meta: 'STAGE_03 :: STRUCTURE',
    title: 'STRUCTURED FACTORS',
    description: 'Evidence remains traceable',
    icon: <Layers className="h-4 w-4" />,
    color: 'cyan',
    capabilities: [
      '8-factor aerospace profile',
      'Human confirmation',
      'Engineer override'
    ]
  },
  {
    id: 'stage-4',
    meta: 'STAGE_04 :: DETERMINISTIC',
    title: 'DETERMINISTIC ENGINE',
    description: "Pure mathematical comparison",
    icon: <Scale className="h-4 w-4" />,
    color: 'amber',
    capabilities: [
      'Pure mathematical comparison',
      'No LLM in scoring',
      'Deterministic overlap calc',
      'Historical ranking'
    ]
  },
  {
    id: 'stage-5',
    meta: 'STAGE_05 :: PRECEDENT',
    title: 'HISTORICAL COMPARISON',
    description: 'Historical investigation grounding',
    icon: <GitCompare className="h-4 w-4" />,
    color: 'emerald',
    capabilities: [
      'Shared risk factors',
      'Differing factors',
      'Divergent recovery'
    ]
  },
  {
    id: 'stage-6',
    meta: 'STAGE_06 :: JUDGMENT',
    title: 'ENGINEERING JUDGMENT',
    description: 'Human remains final authority',
    icon: <UserCheck className="h-4 w-4" />,
    color: 'emerald',
    capabilities: [
      'Chief Engineer / FRB',
      'ACKNOWLEDGED / DISMISSED',
      'Immutable audit record'
    ]
  }
];

const ZONES = [
  {
    id: 'zone-1',
    title: 'AI-ASSISTED',
    color: 'cyan',
    stages: [STAGES[0], STAGES[1], STAGES[2]]
  },
  {
    id: 'zone-2',
    title: 'DETERMINISTIC',
    color: 'amber',
    stages: [STAGES[3]]
  },
  {
    id: 'zone-3',
    title: 'HUMAN AUTHORITY',
    color: 'emerald',
    stages: [STAGES[4], STAGES[5]]
  }
];

export const MethodologyCarousel: React.FC = () => {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [pinnedStage, setPinnedStage] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPinnedStage(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleStageClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedStage === id) {
      setPinnedStage(null);
    } else {
      setPinnedStage(id);
    }
  };

  const handleContainerClick = () => {
    setPinnedStage(null);
  };

  return (
    <section 
      ref={containerRef}
      className="relative bg-slate-950 py-24 sm:py-32 overflow-hidden border-y border-slate-900"
      onClick={handleContainerClick}
    >
      
      {/* Schematic Technical Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-10" />
        <div className="absolute top-10 left-10 font-mono text-[9px] text-slate-700">SYS.RAIL.01</div>
        <div className="absolute bottom-10 right-10 font-mono text-[9px] text-slate-700">OP.NOMINAL</div>
      </div>
      
      <PageContainer variant="wide" className="relative z-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto px-6 mb-16 xl:mb-24">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
            System Architecture & Methodology
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-100 font-sans">
            How PRECEDENT Works
          </h2>
          <p className="text-base text-slate-400 font-sans max-w-2xl mx-auto">
            From raw mission evidence to deterministic precedent analysis and human engineering judgment.
          </p>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP SCHEMATIC RAIL (lg and up)                        */}
        {/* ========================================================= */}
        <div className="hidden lg:block relative w-full pt-16 pb-20">
          
          <div className="absolute top-0 left-0 w-full h-[60px]">
             {ZONES.map((zone, zIdx) => {
                let left = "0%";
                let width = "0%";
                if (zIdx === 0) { left = "0%"; width = "50%"; }
                else if (zIdx === 1) { left = "50%"; width = "16.666%"; }
                else { left = "66.666%"; width = "33.333%"; }

                return (
                   <div key={zone.id} className="absolute top-0 h-full" style={{ left, width }}>
                      <div className={`font-mono text-[10px] tracking-widest text-${zone.color}-500 mb-2`}>
                         {zone.title}
                      </div>
                      <div className={`h-[1px] w-[calc(100%-2rem)] bg-${zone.color}-900/60`} />
                      <div className={`w-[1px] h-3 bg-${zone.color}-900/60`} />
                   </div>
                )
             })}
          </div>

          <div className="absolute top-[80px] left-0 w-full h-[1px] bg-slate-700" />
          
          <div className="absolute top-[76px] left-[50%] flex gap-1 z-0">
             <div className="w-[1px] h-[9px] bg-slate-500" />
             <div className="w-[1px] h-[9px] bg-slate-500" />
          </div>
          <div className="absolute top-[76px] left-[66.666%] flex gap-1 z-0">
             <div className="w-[1px] h-[9px] bg-slate-500" />
             <div className="w-[1px] h-[9px] bg-slate-500" />
          </div>

          <div className="absolute top-[80px] left-0 h-[1px] w-[15%] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-[slide-right-rail_10s_linear_infinite]" />

          <div className="grid grid-cols-6 w-full h-full relative z-10">
             {STAGES.map((stage) => {
                const isActive = hoveredStage === stage.id || pinnedStage === stage.id;
                
                return (
                   <div 
                      key={stage.id} 
                      className="col-span-1 relative pr-6 flex flex-col cursor-pointer group"
                      onMouseEnter={() => setHoveredStage(stage.id)}
                      onMouseLeave={() => setHoveredStage(null)}
                      onClick={(e) => handleStageClick(stage.id, e)}
                   >
                       <div className={`absolute top-[80px] -left-[1px] -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-none rotate-45 bg-slate-950 border border-${stage.color}-500 z-10 transition-colors duration-200 ${isActive ? `bg-${stage.color}-950 shadow-[0_0_8px_currentColor]` : ''}`} />
                       
                       <div className={`absolute top-[80px] left-[-1px] w-[1px] h-6 bg-${stage.color}-900/60 transition-all duration-200 ${isActive ? `bg-${stage.color}-500/80` : ''}`} />

                       <div className="pt-[110px]">
                          <div className="flex items-center gap-2 mb-2">
                             <div className={`text-${stage.color}-500 opacity-70 group-hover:opacity-100 transition-opacity`}>
                                {stage.icon}
                             </div>
                             <div className={`font-mono text-[9px] tracking-widest text-${stage.color}-500 transition-colors ${isActive ? `text-${stage.color}-300` : ''}`}>
                                {stage.meta}
                             </div>
                          </div>
                          
                          <h3 className={`font-sans font-bold text-xs tracking-wider text-slate-200 mb-2 transition-colors ${isActive ? 'text-white' : ''}`}>
                             {stage.title}
                          </h3>
                          
                          <p className="text-[11px] text-slate-400 font-sans leading-relaxed min-h-[36px]">
                             {stage.description}
                          </p>
                          
                          <div 
                             className={`overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
                          >
                             <div className={`border-t border-${stage.color}-900/50 pt-4 pb-2`}>
                                <ul className="space-y-2">
                                   {stage.capabilities.map(cap => (
                                      <li key={cap} className="flex gap-2 text-[10px] items-start text-slate-300 font-mono">
                                         <span className={`text-${stage.color}-500/70`}>✓</span> 
                                         <span className="leading-tight">{cap}</span>
                                      </li>
                                   ))}
                                </ul>
                             </div>
                          </div>
                       </div>
                   </div>
                );
             })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE/TABLET SCHEMATIC RAIL (< lg)                       */}
        {/* ========================================================= */}
        <div className="lg:hidden flex flex-col w-full pt-8 pb-12">
           {ZONES.map((zone, zIdx) => (
              <div key={zone.id} className="relative flex flex-col mb-10">
                 <div className={`font-mono text-[10px] tracking-widest text-${zone.color}-500 mb-6 pl-2 flex items-center gap-2`}>
                    <div className={`w-2 h-[1px] bg-${zone.color}-500`} />
                    {zone.title}
                 </div>

                 {zone.stages.map((stage, sIdx) => {
                     const isLastStage = zIdx === ZONES.length - 1 && sIdx === zone.stages.length - 1;
                     const isActive = hoveredStage === stage.id || pinnedStage === stage.id;
                     
                     return (
                         <div 
                            key={stage.id} 
                            className="relative flex min-h-[120px] cursor-pointer group"
                            onClick={(e) => handleStageClick(stage.id, e)}
                         >
                             <div className="w-12 flex flex-col items-center shrink-0">
                                 <div className={`w-3 h-3 mt-1 bg-slate-950 border border-${stage.color}-500 rotate-45 z-10 transition-colors ${isActive ? `bg-${stage.color}-950 shadow-[0_0_8px_currentColor]` : ''}`} />
                                 {!isLastStage && (
                                    <div className="flex-1 w-[1px] bg-slate-700 my-1 relative overflow-hidden">
                                       <div className="absolute top-0 left-0 w-full h-[50px] bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent animate-[slide-down-rail_4s_linear_infinite]" />
                                    </div>
                                 )}
                             </div>
                             
                             <div className="flex-1 pb-10 pr-2">
                                 <div className="flex items-center gap-2 mb-1.5">
                                    <div className={`text-${stage.color}-500 opacity-70 group-hover:opacity-100 transition-opacity`}>
                                       {stage.icon}
                                    </div>
                                    <div className={`font-mono text-[9px] tracking-widest text-${stage.color}-500 transition-colors ${isActive ? `text-${stage.color}-300` : ''}`}>
                                       {stage.meta}
                                    </div>
                                 </div>
                                 <h3 className={`font-sans font-bold text-sm tracking-wider text-slate-200 mb-2 transition-colors ${isActive ? 'text-white' : ''}`}>{stage.title}</h3>
                                 <p className="text-xs text-slate-400 font-sans leading-relaxed mb-2">{stage.description}</p>
                                 
                                 <div 
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'max-h-[300px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}
                                 >
                                    <div className={`border-t border-${stage.color}-900/50 pt-3 pb-2`}>
                                       <ul className="space-y-1.5">
                                          {stage.capabilities.map(cap => (
                                             <li key={cap} className="flex gap-2 text-[11px] items-start text-slate-300 font-mono">
                                                <span className={`text-${stage.color}-500/70`}>✓</span> 
                                                <span className="leading-tight">{cap}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 </div>
                             </div>
                         </div>
                     )
                 })}
              </div>
           ))}
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-900/50 text-center font-mono text-xs text-slate-500">
           AI assists. Deterministic engine compares. History informs. Human engineers decide.
        </div>

      </PageContainer>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-right-rail {
          0% { left: -20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes slide-down-rail {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
      `}} />
    </section>
  );
};
