import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad, Play, RotateCcw, Swords, Compass, SquareDot, Trophy } from 'lucide-react';

type GameType = 'GRID_RUNNER' | 'CYBER_ARENA';

interface GridPosition {
  x: number;
  y: number;
}

export const ArcadeCabinetWidget = () => {
  const [activeGame, setActiveGame] = useState<GameType>('GRID_RUNNER');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(120);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER' | 'WIN'>('IDLE');

  // --- Grid Runner Snake-like State ---
  const [snake, setSnake] = useState<GridPosition[]>([{ x: 5, y: 5 }]);
  const [food, setFood] = useState<GridPosition>({ x: 3, y: 3 });
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const [gameTick, setGameTick] = useState(0);

  // --- Cyber Arena Tic-Tac-Toe State ---
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [aiSpeech, setAiSpeech] = useState("Think you can beat me? Let's play!");

  // Screen shake feedback trigger
  const [shake, setShake] = useState(false);

  // --- Grid Runner Game Loop ---
  useEffect(() => {
    if (activeGame !== 'GRID_RUNNER' || gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        let newHead = { ...head };

        switch (direction) {
          case 'UP': newHead.y = head.y - 1; break;
          case 'DOWN': newHead.y = head.y + 1; break;
          case 'LEFT': newHead.x = head.x - 1; break;
          case 'RIGHT': newHead.x = head.x + 1; break;
        }

        // Boundary collision check
        if (newHead.x < 0 || newHead.x >= 10 || newHead.y < 0 || newHead.y >= 10) {
          triggerScreenShake();
          setGameState('GAME_OVER');
          return prev;
        }

        // Self collision check
        if (prev.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          triggerScreenShake();
          setGameState('GAME_OVER');
          return prev;
        }

        const next = [newHead, ...prev];

        // Did we eat food?
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => {
            const nextScore = s + 10;
            if (nextScore > highScore) setHighScore(nextScore);
            return nextScore;
          });
          // respawn food
          spawnFood(next);
        } else {
          next.pop();
        }

        return next;
      });

      setGameTick((t) => t + 1);
    }, 280);

    return () => clearInterval(interval);
  }, [activeGame, gameState, direction, food]);

  const spawnFood = (currentSnakeData: GridPosition[]) => {
    let attempts = 0;
    while (attempts < 50) {
      const rx = Math.floor(Math.random() * 10);
      const ry = Math.floor(Math.random() * 10);
      if (!currentSnakeData.some((segment) => segment.x === rx && segment.y === ry)) {
        setFood({ x: rx, y: ry });
        return;
      }
      attempts++;
    }
  };

  const triggerScreenShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Listen to keyboard buttons W/A/S/D and Arrow Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || activeGame !== 'GRID_RUNNER') return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, direction, activeGame]);

  const startGame = () => {
    setScore(0);
    setGameState('PLAYING');
    if (activeGame === 'GRID_RUNNER') {
      setSnake([{ x: 5, y: 5 }]);
      setDirection('RIGHT');
      setFood({ x: 3, y: 3 });
    } else {
      setBoard(Array(9).fill(null));
      setIsXTurn(true);
      setAiSpeech("Let our game begin!");
    }
  };

  // --- Cyber Arena Tic-Tac-Toe Win Checker ---
  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let line of lines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  // AI Turn Logic for Cyber Arena
  const makeAiMove = (squares: (string | null)[]) => {
    // Collect empty indicies
    const emptyIndices: number[] = [];
    squares.forEach((sq, i) => {
      if (!sq) emptyIndices.push(i);
    });

    if (emptyIndices.length === 0) return;

    // A simple minimax-style heuristic: check if AI can win this turn, or if it must block a win, else choose random
    const searchMove = (playerSign: string) => {
      for (let i of emptyIndices) {
        const testBoard = [...squares];
        testBoard[i] = playerSign;
        if (checkWinner(testBoard) === playerSign) {
          return i;
        }
      }
      return -1;
    };

    let move = searchMove('O'); // Check AI win
    if (move === -1) {
      move = searchMove('X'); // Block human win
    }
    if (move === -1) {
      // Pick random
      move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    const testBoard = [...squares];
    testBoard[move] = 'O';
    setBoard(testBoard);

    const winner = checkWinner(testBoard);
    if (winner === 'O') {
      setGameState('GAME_OVER');
      setAiSpeech("Good game! Better luck next time.");
      triggerScreenShake();
    } else if (emptyIndices.length === 1) { // It was the last slot
      setGameState('WIN');
      setScore((s) => s + 5);
      setAiSpeech("It's a draw! Well played.");
    } else {
      setIsXTurn(true);
      const quotes = [
        "Nice move! Let's see your next one.",
        "An interesting strategy.",
        "I'm calculating my next move...",
        "Are we headed for a draw?"
      ];
      setAiSpeech(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'PLAYING' || board[index] || !isXTurn || activeGame !== 'CYBER_ARENA') return;

    const updated = [...board];
    updated[index] = 'X';
    setBoard(updated);

    const winner = checkWinner(updated);
    if (winner === 'X') {
      setGameState('WIN');
      setScore((s) => {
        const nextScore = s + 50;
        if (nextScore > highScore) setHighScore(nextScore);
        return nextScore;
      });
      setAiSpeech("Wow, you won! Amazing play!");
    } else if (updated.every((cell) => cell !== null)) {
      setGameState('WIN');
      setScore((s) => s + 5);
      setAiSpeech("A solid draw! Nice logic.");
    } else {
      setIsXTurn(false);
      // Wait and make AI move
      setTimeout(() => {
        makeAiMove(updated);
      }, 500);
    }
  };

  return (
    <div className={`bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col h-full ${shake ? 'animate-shake' : ''}`}>
      <style>{`
        @keyframes shake_anim {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-4px, 2px); }
          40% { transform: translate(4px, -2px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 2px); }
        }
        .animate-shake {
          animation: shake_anim 0.4s ease-in-out;
        }
      `}</style>

      {/* Controller Area Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <h3 className="font-sans font-black uppercase text-xs tracking-tight text-[#facc15] flex items-center gap-1.5">
          <Gamepad size={12} />
          RETRO ARCADE CABINET
        </h3>

        <div className="flex gap-2">
          {['GRID_RUNNER', 'CYBER_ARENA'].map((game) => (
            <button
              key={game}
              onClick={() => {
                setActiveGame(game as GameType);
                setGameState('IDLE');
                setScore(0);
              }}
              className={`px-2 py-0.5 text-[8px] font-mono leading-normal tracking-tighter border font-black cursor-pointer ${
                activeGame === game 
                  ? 'bg-black text-[#facc15] border-black' 
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-white'
              }`}
            >
              {game.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* The Physical Screen Matrix Frame */}
      <div className="bg-black p-3 border-4 border-black aspect-[4/3] relative flex flex-col justify-between overflow-hidden">
        {/* Cathode Ray Glass Overlay Decal */}
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20 z-20" />
        <div className="absolute inset-0 bg-radial-gradient(inset, rgba(250,204,21,0.04), transparent) pointer-events-none z-10" />

        {/* HUD Info bar */}
        <div className="flex justify-between text-[8px] font-mono border-b border-zinc-900 pb-1 text-zinc-500 font-bold uppercase z-10">
          <span className="flex items-center gap-1">
            <Trophy size={10} className="text-[#facc15]" />
            HI: {highScore} pts
          </span>
          <span className="text-[#facc15] font-black">{score} PTS</span>
        </div>

        {/* SCREEN STAGE AREA */}
        <div className="flex-1 flex items-center justify-center relative min-h-0 z-10 my-1">
          {gameState === 'IDLE' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3 p-4">
              <Swords size={32} className="text-[#facc15] led-flicker" />
              <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                {activeGame === 'GRID_RUNNER' ? 'GRID RUNNER READY' : 'TIC TAC TOE READY'}
              </div>
              <p className="text-[9px] text-zinc-600 max-w-[200px] leading-tight uppercase font-mono">
                {activeGame === 'GRID_RUNNER' 
                  ? 'Guide cycle. Reclaim crystals. Dodge edges. WASD/ARROWS.' 
                  : 'Beat the AI in clean tic-tac-toe. Claim victory!'}
              </p>
              <button
                onClick={startGame}
                className="bg-[#facc15] text-black border-2 border-black px-4 py-1.5 font-black text-[10px] uppercase tracking-wider hover:bg-yellow-400 cursor-pointer active:translate-y-0.5"
              >
                START GAME
              </button>
            </div>
          )}

          {/* GRID_RUNNER GAME STAGE */}
          {activeGame === 'GRID_RUNNER' && gameState === 'PLAYING' && (
            <div className="grid grid-cols-10 grid-rows-10 gap-[1px] w-[140px] h-[140px] bg-zinc-950 p-[1px] border border-zinc-800">
              {Array.from({ length: 100 }).map((_, i) => {
                const x = i % 10;
                const y = Math.floor(i / 10);
                const isHead = snake[0].x === x && snake[0].y === y;
                const isBody = snake.slice(1).some((seg) => seg.x === x && seg.y === y);
                const isFood = food.x === x && food.y === y;

                return (
                  <div
                    key={i}
                    className={`w-full h-full ${
                      isHead ? 'bg-cyan-400' :
                      isBody ? 'bg-cyan-700' :
                      isFood ? 'bg-[#facc15] animate-pulse shadow-[0_0_8px_#facc15]' :
                      'bg-zinc-950/20'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* CYBER_ARENA GAME STAGE */}
          {activeGame === 'CYBER_ARENA' && gameState === 'PLAYING' && (
            <div className="flex flex-col items-center space-y-1.5 w-full">
              {/* Sarcastic Speech Bubble readout */}
              <div className="bg-[#18181b] border border-zinc-700 px-2 py-1 text-[8px] font-mono text-cyan-400 text-center max-w-[200px] truncate-3 line-clamp-3 h-[28px] overflow-hidden leading-tight font-black uppercase">
                AI: "{aiSpeech}"
              </div>

              <div className="grid grid-cols-3 gap-1.5 w-[110px] h-[110px] bg-black">
                {board.map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => handleCellClick(i)}
                    className="w-full h-full bg-zinc-950 hover:bg-zinc-90 w-[32px] h-[32px] border border-zinc-800 font-mono text-sm font-black flex items-center justify-center cursor-pointer"
                  >
                    {cell === 'X' && <span className="text-[#facc15]">X</span>}
                    {cell === 'O' && <span className="text-cyan-400">O</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OUTCOME OVERLAYS */}
          {(gameState === 'GAME_OVER' || gameState === 'WIN') && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center space-y-2.5 p-4 z-10 select-none">
              <div className={`text-base font-black uppercase tracking-widest ${
                gameState === 'WIN' ? 'text-emerald-400 led-flicker' : 'text-red-500'
              }`}>
                {gameState === 'WIN' ? 'VICTORY' : 'DEFEAT'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                FINAL SCORE: <span className="text-[#facc15] font-black">{score} SCORE</span>
              </div>
              
              {activeGame === 'CYBER_ARENA' && (
                <div className="bg-[#18181b] p-1 border border-zinc-800 text-[8px] text-zinc-400 uppercase leading-snug max-w-[200px]">
                  AI: "{aiSpeech}"
                </div>
              )}

              <button
                onClick={startGame}
                className="bg-[#facc15] text-black border-2 border-black px-4 py-1.5 font-black text-[9px] uppercase tracking-wider hover:bg-yellow-400 cursor-pointer flex items-center gap-1 active:translate-y-0.5"
              >
                <RotateCcw size={10} /> PLAY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* CRT edge blur shadow overlay */}
        <div className="absolute bottom-1 right-2 text-[7px] font-mono text-zinc-800 tracking-[0.2em]">
          ARCADE // TERMINAL
        </div>
      </div>

      {/* Manual D-Pad Controller Keys for touch support & game interactions */}
      <div className="flex justify-between items-center mt-3 bg-black p-2.5 border-2 border-black select-none">
        
        {/* Joystick Simulation Arrows */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex gap-1.5">
            <button 
              onClick={() => { if (gameState === 'PLAYING' && direction !== 'DOWN') setDirection('UP'); }}
              className="w-7 h-7 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 active:bg-[#facc15] active:text-black cursor-pointer text-[10px] font-bold"
            >
              ▲
            </button>
          </div>
          <div className="flex gap-1.5 mt-1">
            <button 
              onClick={() => { if (gameState === 'PLAYING' && direction !== 'RIGHT') setDirection('LEFT'); }}
              className="w-7 h-7 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 active:bg-[#facc15] active:text-black cursor-pointer text-[10px] font-bold"
            >
              ◀
            </button>
            <button 
              onClick={() => { if (gameState === 'PLAYING' && direction !== 'UP') setDirection('DOWN'); }}
              className="w-7 h-7 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 active:bg-[#facc15] active:text-black cursor-pointer text-[10px] font-bold"
            >
              ▼
            </button>
            <button 
              onClick={() => { if (gameState === 'PLAYING' && direction !== 'LEFT') setDirection('RIGHT'); }}
              className="w-7 h-7 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 active:bg-[#facc15] active:text-black cursor-pointer text-[10px] font-bold"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Visual Controls Legend Label */}
        <div className="text-right flex flex-col items-end gap-1 font-mono text-[8px] text-zinc-600 font-bold leading-tight">
          <span className="text-[#facc15] uppercase tracking-wider">JOYSTICK NAVIGATION //</span>
          <span>W/A/S/D SUPPORTED</span>
          <span>KEYBOARD FULL-INPUT ENABLED</span>
        </div>
      </div>
    </div>
  );
};
