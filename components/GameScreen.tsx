import React, { useState, useEffect } from 'react';
import { GameState, Team, PlayerRole, Question } from '../types';
import { questions, shuffleQuestions } from '../data';

const MAX_JOCS_TO_WIN = 5;
const SCORE_MAP = ['Net', 15, 30, 'Val'];
const TEAM_ROLES: PlayerRole[] = ['Punter', 'Mitger', 'Rest'];

const GameScreen: React.FC = () => {
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    globalScore: { Roig: 0, Blau: 0 },
    currentJocScore: { Roig: 0, Blau: 0 },
    turnTeam: 'Roig',
    turnPlayerIndex: { Roig: 0, Blau: 0 },
    questionIndex: 0,
    phase: 'welcome',
  });

  // Sound effects
  const playClap = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'square';
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
        
        // Burst of clapping effect (simulated noise)
        const bufferSize = 4096;
        const pinkNoise = (function() {
            let b0, b1, b2, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
            const node = ctx.createScriptProcessor(bufferSize, 1, 1);
            node.onaudioprocess = function(e) {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    output[i] *= 0.11; // (roughly) compensate for gain
                    b6 = white * 0.115926;
                }
            };
            return node;
        })();

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        pinkNoise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        setTimeout(() => pinkNoise.disconnect(), 500);

    } catch (e) { console.error(e) }
  };

  const startGame = () => {
    setGameQuestions(shuffleQuestions([...questions]));
    setGameState({
      globalScore: { Roig: 0, Blau: 0 },
      currentJocScore: { Roig: 0, Blau: 0 },
      turnTeam: 'Roig',
      turnPlayerIndex: { Roig: 0, Blau: 0 },
      questionIndex: 0,
      phase: 'playing',
    });
  };

  const handleAnswer = (optionIndex: number) => {
    const currentQ = gameQuestions[gameState.questionIndex];
    const isCorrect = optionIndex === currentQ.correctAnswer;
    // const currentTeam = gameState.turnTeam;

    setGameState(prev => ({
      ...prev,
      phase: 'feedback',
      lastAnswerCorrect: isCorrect,
      feedbackMessage: isCorrect ? "Correcte! " + currentQ.explanation : "Incorrecte! El torn passa a l'altre equip."
    }));

    // Logic updates happen after feedback view (in nextTurn)
  };

  const nextTurn = () => {
    const isCorrect = gameState.lastAnswerCorrect;
    const currentTeam = gameState.turnTeam;
    const otherTeam = currentTeam === 'Roig' ? 'Blau' : 'Roig';
    
    let newJocScore = { ...gameState.currentJocScore };
    let newGlobalScore = { ...gameState.globalScore };
    let gameWon = false;
    let matchWon = false;
    let winner: Team | null = null;

    if (isCorrect) {
      // Raspall Scoring Logic
      const myPoints = newJocScore[currentTeam];
      const oppPoints = newJocScore[otherTeam];

      if (myPoints === 3) {
        // I have Val
        if (oppPoints === 3) {
           // Rule: "Si ambdós equips arriben a Val, la puntuació torna a 30-30"
           newJocScore = { Roig: 0, Blau: 0 };
           gameWon = true;
           winner = currentTeam;
        } else {
           // I have Val, opponent has < Val -> I WIN GAME
           newJocScore = { Roig: 0, Blau: 0 };
           gameWon = true;
           winner = currentTeam;
        }
      } else if (myPoints === 2) {
        // I have 30. Win point -> Go to Val.
        if (oppPoints === 3) {
          // Opponent has Val. Now both have Val. 
          // Rule: "la puntuació baixa a 30-30"
          newJocScore = { Roig: 2, Blau: 2 };
        } else {
          newJocScore[currentTeam] = 3; // To Val
        }
      } else {
        // 0 -> 15 or 15 -> 30
        newJocScore[currentTeam] += 1;
      }

      if (gameWon && winner) {
        playClap();
        newGlobalScore[winner] += 5; // 5 points per Joc to reach 25
        if (newGlobalScore[winner] >= 25) {
          matchWon = true;
        }
      }
    }

    // Prepare next turn state
    // Advance player index for the team that just played
    const nextPlayerIndices = { ...gameState.turnPlayerIndex };
    nextPlayerIndices[currentTeam] = (nextPlayerIndices[currentTeam] + 1) % 3;

    if (matchWon) {
      setGameState(prev => ({
        ...prev,
        globalScore: newGlobalScore,
        currentJocScore: newJocScore,
        phase: 'match_won',
        lastGameWinner: winner || undefined
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        globalScore: newGlobalScore,
        currentJocScore: newJocScore,
        turnTeam: otherTeam, // Alternate teams
        turnPlayerIndex: nextPlayerIndices,
        questionIndex: (prev.questionIndex + 1) % gameQuestions.length,
        phase: gameWon ? 'game_won' : 'playing',
        lastGameWinner: winner || undefined
      }));
    }
  };

  // Render Helpers
  const currentQ = gameQuestions[gameState.questionIndex];
  
  if (gameState.phase === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-full flag-bg text-white p-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-2 text-center drop-shadow-lg uppercase">Què saps de la Pilota Valenciana?</h1>
        <p className="text-lg md:text-xl italic mb-8 opacity-90 font-medium">by Pepe Alborch Canet</p>
        
        <div className="bg-white/20 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-white/30 text-center max-w-2xl">
            <p className="text-xl mb-6">Demostra els teus coneixements sobre el nostre esport!</p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-lg">
                <div className="bg-red-600/80 p-4 rounded-lg shadow-inner border border-red-400">Equip Roig</div>
                <div className="bg-blue-600/80 p-4 rounded-lg shadow-inner border border-blue-400">Equip Blau</div>
            </div>
            <button 
                onClick={startGame}
                className="bg-yellow-400 hover:bg-yellow-300 text-red-700 font-bold py-4 px-12 rounded-full text-2xl shadow-lg transform hover:scale-105 transition-all border-4 border-red-600"
            >
                Va de bo!
            </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'match_won') {
    return (
      <div className="flex flex-col items-center justify-center h-full flag-bg text-white p-4">
        <h1 className="text-5xl font-bold mb-4 animate-bounce text-center drop-shadow-md">HAS GUANYAT EL PARTIT!</h1>
        <p className="text-lg md:text-xl italic mb-8 opacity-90 font-medium">by Pepe Alborch Canet</p>
        <div className="text-3xl bg-white/90 text-slate-900 p-8 rounded-xl shadow-2xl text-center">
            Victòria de l'Equip {gameState.globalScore.Roig >= 25 ? 'ROIG' : 'BLAU'}
        </div>
        <div className="mt-4 text-white text-xl font-bold drop-shadow-md">
            Resultat Final: {gameState.globalScore.Roig} - {gameState.globalScore.Blau}
        </div>
        <button onClick={startGame} className="mt-8 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded text-white font-bold shadow-lg transform hover:scale-105 transition-all">
            Tornar a jugar
        </button>
      </div>
    );
  }

  const activePlayerRole = TEAM_ROLES[gameState.turnPlayerIndex[gameState.turnTeam]];
  const activeColorClass = gameState.turnTeam === 'Roig' ? 'bg-red-600 border-red-800 text-white' : 'bg-blue-600 border-blue-800 text-white';

  return (
    <div className="h-full flex flex-col bg-slate-100 font-sans">
        {/* Header / Scoreboard */}
        <header className="bg-white shadow-md p-2 md:p-4 z-10 relative">
            <div className="max-w-4xl mx-auto flex justify-between items-center bg-slate-800 rounded-lg p-3 text-white shadow-lg">
                <div className="flex flex-col items-center w-1/3 border-r border-slate-600">
                    <span className="text-red-500 font-bold text-xl uppercase tracking-wider">Roig</span>
                    <div className="flex gap-4 text-center mt-1">
                        <div>
                            <span className="text-[10px] md:text-xs text-slate-400 block uppercase tracking-wider mb-1">Marcador</span>
                            <span className="text-2xl md:text-3xl font-mono bg-slate-900 px-2 rounded border border-slate-700">{gameState.globalScore.Roig}</span>
                        </div>
                        <div>
                            <span className="text-[10px] md:text-xs text-slate-400 block uppercase tracking-wider mb-1">Quinzes</span>
                            <span className="text-2xl md:text-3xl text-yellow-400 font-bold bg-slate-900 px-2 rounded border border-slate-700">{SCORE_MAP[gameState.currentJocScore.Roig]}</span>
                        </div>
                    </div>
                </div>
                
                <div className="w-1/3 flex flex-col items-center justify-center">
                   <span className="text-sm md:text-xl font-bold uppercase tracking-widest text-slate-200 text-center drop-shadow-sm">Pilota Valenciana</span>
                   <span className="text-[10px] md:text-xs text-slate-400 italic text-center mt-1 opacity-80">by Pepe Alborch Canet</span>
                </div>

                <div className="flex flex-col items-center w-1/3 border-l border-slate-600">
                    <span className="text-blue-500 font-bold text-xl uppercase tracking-wider">Blau</span>
                    <div className="flex gap-4 text-center mt-1">
                        <div>
                            <span className="text-[10px] md:text-xs text-slate-400 block uppercase tracking-wider mb-1">Quinzes</span>
                            <span className="text-2xl md:text-3xl text-yellow-400 font-bold bg-slate-900 px-2 rounded border border-slate-700">{SCORE_MAP[gameState.currentJocScore.Blau]}</span>
                        </div>
                        <div>
                            <span className="text-[10px] md:text-xs text-slate-400 block uppercase tracking-wider mb-1">Marcador</span>
                            <span className="text-2xl md:text-3xl font-mono bg-slate-900 px-2 rounded border border-slate-700">{gameState.globalScore.Blau}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        {/* Game Area */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start perspective-container relative">
            
            {/* Background elements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
               <img src="https://www.google.com/search?vsrid=CNiLxdHvxZS0CBACGAEiJGRiMjlkMjU0LWVmNDgtNDgyMC1hOTIzLWNiMTZhYzVhOTcyNzIGIgJ3ZSggOJPT9-aPkpED" alt="Trinquet" className="w-full h-full object-cover" />
            </div>

            {/* Turn Indicator */}
            {gameState.phase === 'playing' && (
                <div className={`z-10 mb-6 px-8 py-3 rounded-full shadow-lg border-b-4 text-xl font-bold uppercase tracking-wider animate-pulse transition-colors duration-500 ${activeColorClass}`}>
                    Torn: Equip {gameState.turnTeam} - {activePlayerRole}
                </div>
            )}

            {/* Content Card */}
            <div className="z-10 w-full max-w-3xl card-3d">
                {gameState.phase === 'playing' && (
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">{currentQ.category}</span>
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600 font-mono">Pregunta #{currentQ.id}</span>
                             </div>
                             <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">{currentQ.text}</h2>
                        </div>
                        <div className="p-6 grid gap-4">
                            {currentQ.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className="text-left w-full p-4 rounded-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-700 font-medium group relative overflow-hidden"
                                >
                                    <div className="flex items-center">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 group-hover:bg-blue-500 group-hover:text-white mr-4 font-bold text-sm transition-colors">
                                            {['A', 'B', 'C'][idx]}
                                        </span>
                                        <span className="text-lg">{opt}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {gameState.phase === 'feedback' && (
                    <div className={`bg-white rounded-xl shadow-2xl p-8 text-center border-t-8 ${gameState.lastAnswerCorrect ? 'border-green-500' : 'border-red-500'}`}>
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-md ${gameState.lastAnswerCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {gameState.lastAnswerCorrect ? (
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-slate-800">
                            {gameState.lastAnswerCorrect ? 'Va de bo!' : 'Falta!'}
                        </h3>
                        <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                            {gameState.feedbackMessage}
                        </p>
                        <button 
                            onClick={nextTurn}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition-transform transform hover:scale-105"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {gameState.phase === 'game_won' && (
                    <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-xl shadow-2xl p-8 text-center border-4 border-yellow-600 text-yellow-900">
                        <h3 className="text-4xl font-extrabold mb-4 uppercase drop-shadow-sm">Joc!</h3>
                        <p className="text-2xl mb-6 font-bold">Joc per a l'equip {gameState.lastGameWinner === 'Roig' ? 'ROIG' : 'BLAU'}</p>
                        <div className="mb-6 text-xl bg-white/30 inline-block px-6 py-2 rounded-lg font-mono font-bold border border-yellow-700/20">
                           Marcador: Roig {gameState.globalScore.Roig} - Blau {gameState.globalScore.Blau}
                        </div>
                        <div className="flex justify-center mb-8">
                            {/* Image removed as per request */}
                        </div>
                        <button 
                            onClick={() => setGameState(prev => ({ ...prev, phase: 'playing' }))}
                            className="bg-white hover:bg-yellow-50 text-yellow-900 font-bold py-4 px-12 rounded-full shadow-lg border-2 border-yellow-600 transform hover:scale-105 transition-all"
                        >
                            Següent Joc
                        </button>
                    </div>
                )}
            </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t p-3 text-center text-xs text-slate-400 flex justify-center items-center gap-2">
            <span>Joc educatiu sobre la Pilota Valenciana</span>
            <span>•</span>
            <span className="font-semibold">by Pepe Alborch Canet</span>
        </footer>
    </div>
  );
};

export default GameScreen;