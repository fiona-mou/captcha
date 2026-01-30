/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { generateId, randomInt, randomItem, generateRandomCode, ASCII_CHARS } from './utils';
import { WindowData, WindowType } from './types';

// --- 全局音频实例 (放在组件外防止重复创建) ---
const bgDrone = typeof Audio !== 'undefined' ? new Audio('/drone.mp3') : null;
if (bgDrone) {
    bgDrone.loop = true;
    bgDrone.volume = 0.4;
    // 将实例挂载到 window 方便 handleRestart 访问
    (window as any).bgDrone = bgDrone;
}

const genericErrors = ['/error_1.mp3', '/error_2.mp3', '/error_3.mp3'];

// --- Constants & Config ---
const MAX_WINDOWS = 40;
const SUCCESS_CODES = ['A1B1', 'A2B2', 'A3B3', 'A4B4', 'A5B3', 'A6B1', 'A6B2', 'A6B3'];

const TASK_MAP: Record<string, string> = {
    'A1': "Seleziona tutti gli organismi viventi :",
    'A2': "Seleziona tutti gli oggetti che possono essere utilizzati per la navigazione :",
    'A3': "Seleziona tutti gli oggetti che svolgono funzioni di pubblica sicurezza :",
    'A4': "Seleziona gli oggetti che assomigliano a volti umani :",
    'A5': "Seleziona tutti gli oggetti contenenti elementi rossi :",
    'A6': "Seleziona oggetti appartenenti al mondo reale:"
};

const VISUAL_MAP: Record<string, { img: string, emojis: string[], sound: string }> = {
    'B1': { img: 'B1.jpg', emojis: ['🐶', '🧁', '🍪', '🐩'], sound: '/bark.mp3' },
    'B2': { img: 'B2.jpg', emojis: ['🚦', '🛑', '🚲', '🛣️'], sound: '/honk.mp3' },
    'B3': { img: 'B3.jpg', emojis: ['🧯', '🚒', '🔥', '💦'], sound: '/siren.mp3' },
    'B4': { img: 'B4.jpg', emojis: ['👁️', '👄', '🤡', '👺'], sound: '/glitch_voice.mp3' }
};

// 1. Background ASCII Rain
const AsciiBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        const cols = Math.floor(width / 20);
        const ypos = Array(cols).fill(0);

        const draw = () => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#000';
            ctx.font = '15px monospace';
            ypos.forEach((y, ind) => {
                const text = randomItem(ASCII_CHARS);
                const x = ind * 20;
                ctx.fillText(text, x, y);
                if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
                else ypos[ind] = y + 20;
            });
        };

        const interval = setInterval(draw, 50);
        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    return <canvas ref={canvasRef} className="ascii-bg" />;
};

// 2. Mac Window Component (已集成触摸支持和报错修复)
interface MacWindowProps {
    data: WindowData;
    onClose: (id: string, x: number, y: number) => void;
    onFocus: (id: string) => void;
    onDrag: (id: string, dx: number, dy: number) => void;
}

const MacWindow: React.FC<MacWindowProps> = ({ data, onClose, onFocus, onDrag }) => {
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    const handleStart = (clientX: number, clientY: number) => {
        onFocus(data.id);
        isDragging.current = true;
        startPos.current = { x: clientX, y: clientY };
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            // 移动端防止滚动
            if (e instanceof TouchEvent && e.cancelable) e.preventDefault();

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startPos.current.x;
            const dy = clientY - startPos.current.y;
            
            onDrag(data.id, dx, dy);
            startPos.current = { x: clientX, y: clientY };
        };

        const handleEnd = () => { isDragging.current = false; };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [data.id, onDrag]);

    const renderContent = () => {
        switch (data.type) {
            case 'TEXT': return <div className="content-text">{data.content}</div>;
            case 'CODE': return <pre className="content-code">{data.content}</pre>;
            case 'CAPTCHA':
                return (
                    <div className="content-captcha" style={data.content.bgImage ? {
                        backgroundImage: `url(${data.content.bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    } : {}}>
                        {Array(9).fill(0).map((_, i) => (
                            <div key={i} className="captcha-cell" onClick={(e) => {
                                e.stopPropagation();
                                (e.target as HTMLDivElement).classList.toggle('selected');
                            }}>
                                {data.content.emojis ? randomItem(data.content.emojis) : '❓'}
                            </div>
                        ))}
                    </div>
                );
            case 'IMAGE':
                return (
                    <div style={{
                        width: '100%', height: '100%', 
                        background: data.content.bgImage ? `url(${data.content.bgImage}) center/cover no-repeat` : `linear-gradient(${data.rotation}deg, ${data.content.color1}, ${data.content.color2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3rem'
                    }}>
                        {!data.content.bgImage && data.content.emoji}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div 
            className="mac-window"
            style={{
                left: data.x,
                top: data.y,
                width: data.width,
                height: data.height,
                zIndex: data.zIndex,
                transform: `rotate(${data.rotation}deg)`,
                touchAction: 'none' 
            }}
            onMouseDown={() => onFocus(data.id)}
            onTouchStart={() => onFocus(data.id)}
        >
            <div 
                className="mac-titlebar" 
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            >
                <div className="mac-buttons">
                    <div className="mac-btn close" onClick={(e) => { e.stopPropagation(); onClose(data.id, data.x, data.y); }} />
                    <div className="mac-btn min" />
                    <div className="mac-btn max" />
                </div>
                <div className="mac-title">{data.title}</div>
            </div>
            <div className="mac-content">{renderContent()}</div>
        </div>
    );
};

// 3. Main App Component
function App() {
    const [mode, setMode] = useState<'intro' | 'verified' | 'crash'>('intro');
    const [inputCode, setInputCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [windows, setWindows] = useState<WindowData[]>([]);
    const [zCounter, setZCounter] = useState(100);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [probability, setProbability] = useState(0);
    const [crashTask, setCrashTask] = useState<string>('');
    const [crashVisual, setCrashVisual] = useState<string>('');

    // 音效辅助函数
    const playSound = (src: string) => {
        const audio = new Audio(src);
        audio.play().catch(() => {});
    };

    // Surveillance Loop
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        const interval = setInterval(() => setProbability(Math.floor(Math.random() * 100)), 200);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(interval);
        };
    }, []);

    // Crash Loop generator
    useEffect(() => {
        if (mode !== 'crash') return;
        const spawnInterval = setInterval(() => {
            setWindows(prev => {
                if (prev.length >= MAX_WINDOWS) return prev;
                return [...prev, createRandomWindow(zCounter, undefined, undefined, crashTask, crashVisual)];
            });
            setZCounter(z => z + 1);
        }, 800);
        return () => clearInterval(spawnInterval);
    }, [mode, zCounter, crashTask, crashVisual]);

    const createRandomWindow = (zIndex: number, x?: number, y?: number, taskId?: string, visualId?: string): WindowData => {
        // --- 触发音效逻辑 ---
        playSound(randomItem(genericErrors));
        const visualData = visualId && VISUAL_MAP[visualId] ? VISUAL_MAP[visualId] : null;
        if (Math.random() < 0.3 && visualData?.sound) playSound(visualData.sound);

        const types: WindowType[] = ['IMAGE', 'TEXT', 'CODE', 'CAPTCHA'];
        const type = randomItem(types);
        const width = type === 'CAPTCHA' ? 300 : randomInt(200, 400);
        const height = type === 'CAPTCHA' ? 320 : randomInt(150, 300);
        
        const taskText = taskId && TASK_MAP[taskId] ? TASK_MAP[taskId] : "SYSTEM FAILURE";
        const emojiList = visualData ? visualData.emojis : ['⚠️', '❌', '🚫'];
        const bgImg = visualData ? visualData.img : null;

        let content, title = "System Alert";
        if (type === 'TEXT') { content = taskText; title = taskId ? `Task: ${taskId}` : "Warning"; }
        else if (type === 'CODE') { content = generateRandomCode(); title = "Terminal.exe"; }
        else if (type === 'IMAGE') {
            content = { emoji: randomItem(emojiList), bgImage: bgImg, color1: '#ff9a9e', color2: '#fecfef' };
            title = visualId ? `${visualData?.img}` : "image.jpg";
        } else if (type === 'CAPTCHA') {
            title = taskText.substring(0, 25) + "...";
            content = { bgImage: bgImg, emojis: emojiList };
        }

        const safeWidth = Math.min(width, window.innerWidth - 40);
        const posX = x ?? randomInt(10, Math.max(10, window.innerWidth - safeWidth - 20));
        const posY = y ?? randomInt(60, Math.max(60, window.innerHeight - height - 60));

        return { id: generateId(), type, x: posX, y: posY, width: safeWidth, height, zIndex, title, content, rotation: randomInt(-3, 3) };
    };

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = inputCode.trim().toUpperCase();
        if (!code) { setErrorMsg('ERROR: INPUT REQUIRED'); return; }

        if (SUCCESS_CODES.includes(code)) {
            setMode('verified');
            return;
        }

        const crashRegex = /^A[1-6]B[1-4]$/;
        if (crashRegex.test(code)) {
            const taskId = code.substring(0, 2);
            const visualId = code.substring(2);
            setCrashTask(taskId);
            setCrashVisual(visualId);
            setMode('crash');
            if (bgDrone) { bgDrone.volume = 0.4; bgDrone.play().catch(() => {}); }
            setWindows(Array(5).fill(0).map((_, i) => createRandomWindow(100 + i, undefined, undefined, taskId, visualId)));
            setZCounter(105);
            return;
        }
        setErrorMsg('ERROR: INVALID CODE');
    };

    const handleRestart = () => {
        if ((window as any).bgDrone) {
            (window as any).bgDrone.pause();
            (window as any).bgDrone.currentTime = 0;
        }
        window.location.reload(); 
    };

    const closeWindow = (id: string, x: number, y: number) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (windows.length < MAX_WINDOWS) {
             const newZ = zCounter + 2;
             setZCounter(newZ);
             setWindows(prev => [...prev, createRandomWindow(newZ - 1, x - 20, y - 20, crashTask, crashVisual), createRandomWindow(newZ, x + 20, y + 20, crashTask, crashVisual)]);
        }
    };

    const focusWindow = (id: string) => {
        setZCounter(z => z + 1);
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: zCounter + 1 } : w));
    };

    const dragWindow = (id: string, dx: number, dy: number) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, x: w.x + dx, y: w.y + dy } : w));
    };

    const crashBgImage = (mode === 'crash' && crashVisual && VISUAL_MAP[crashVisual]) ? VISUAL_MAP[crashVisual].img : null;

    return (
        <>
            <div className="scanlines" />
            {mode === 'crash' && crashBgImage && (
                 <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${crashBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3, zIndex: 1, pointerEvents: 'none', filter: 'contrast(1.2) brightness(0.8)' }} />
            )}
            <AsciiBackground />
            <div className="surveillance-ui">
                <div className="coords">X: {mousePos.x} <br/> Y: {mousePos.y}</div>
                <div className="probability">HUMAN PROBABILITY: <br/> {probability}%</div>
                <div className="crosshair" /><div className="crosshair v" />
            </div>

            {mode === 'intro' && (
                <div className="terminal-container">
                    <img src="/logo.png" id="site-logo" alt="LOGO" style={{ width: '100%', marginBottom: '20px', display: 'block' }} />
                    <div className="terminal-header">Identity Verification Protocol v2.0</div>
                    <form onSubmit={handleInputSubmit}>
                        <div className="terminal-prompt">ENTER SEED CODE:</div>
                        <div className="terminal-input-group">
                            <span>&gt;</span>
                            <input className="terminal-input" autoFocus value={inputCode} onChange={(e) => { setInputCode(e.target.value); if (errorMsg) setErrorMsg(''); }} maxLength={10} />
                            <div className="cursor" />
                        </div>
                        {errorMsg && <div className="terminal-error">{errorMsg}</div>}
                        <button type="submit" className="terminal-btn">VERIFY</button>
                    </form>
                </div>
            )}

            {mode === 'verified' && (
                <div className="terminal-container">
                    <div className="terminal-header">Identity Confirmed</div>
                    <div className="verified-text-box">
                        <div style={{fontSize: '1.2rem', marginBottom: '10px'}}>Congratulations🎉</div>
                        <div style={{fontSize: '1.2rem'}}>Verification successful, you are human</div>
                    </div>
                    <button className="terminal-btn" onClick={handleRestart}>Back</button>
                </div>
            )}

            {mode === 'crash' && (
                <>
                    <button className="crash-restart-btn" onClick={handleRestart}>[ EMERGENCY REBOOT ]</button>
                    {windows.map(w => <MacWindow key={w.id} data={w} onClose={closeWindow} onFocus={focusWindow} onDrag={dragWindow} />)}
                    <div className="edu-quote">"The conflict arises when we attempt to force the messy, analog reality of human perception into the binary 1s and 0s of machine logic." — George Hein</div>
                </>
            )}
        </>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) { ReactDOM.createRoot(rootElement).render(<App />); }