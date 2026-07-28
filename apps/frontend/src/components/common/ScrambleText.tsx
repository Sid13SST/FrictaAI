import { useEffect, useState, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';

interface ScrambleTextProps {
  text: string;
  delay?: number;
  triggered?: boolean;
  className?: string;
}

export function ScrambleText({ text, delay = 0, triggered = true, className = '' }: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const frameRef = useRef<number>(0);
  const textLength = text.length;

  useEffect(() => {
    if (!triggered) return;

    let interval: ReturnType<typeof setInterval>;

    const startAnimation = () => {
      setIsStarted(true);
      frameRef.current = 0;

      interval = setInterval(() => {
        frameRef.current += 0.5;
        
        let newText = '';
        const currentFrame = Math.floor(frameRef.current);

        for (let i = 0; i < textLength; i++) {
          if (text[i] === ' ') {
            newText += ' ';
          } else if (i < currentFrame) {
            newText += text[i];
          } else if (i < currentFrame + 3) {
            newText += CHARS[Math.floor(Math.random() * CHARS.length)];
          } else {
            newText += ''; // Hide characters beyond the active scramble zone
          }
        }

        setDisplayText(newText);

        if (currentFrame >= textLength) {
          clearInterval(interval);
          setDisplayText(text);
        }
      }, 25);
    };

    const timeout = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay, triggered, textLength]);

  return (
    <span className={className}>
      {!isStarted ? '\u00A0' : displayText}
    </span>
  );
}
