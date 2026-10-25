import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const VoiceGreeting = () => {
  const { language, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  const getGreetingText = () => {
    if (language === 'mr') {
      return 'सिव्हिक एआय मध्ये आपले स्वागत आहे. आपले शहर, आपला आवाज.';
    }
    if (language === 'hi') {
      return 'सिविक एआई में आपका स्वागत है। आपका शहर, आपकी आवाज़।';
    }
    return 'Welcome to CivicAI. Your city, your voice.';
  };

  const playGreeting = (manual = true) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const UtteranceClass =
        (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) ||
        (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null) ||
        class FallbackUtterance {
          constructor(t) {
            this.text = t;
          }
        };

      const text = getGreetingText();
      const utterance = new UtteranceClass(text);

      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select suitable language code
      if (language === 'mr') {
        utterance.lang = 'mr-IN';
      } else if (language === 'hi') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-US';
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const prefix = utterance.lang.split('-')[0];
        const matchVoice =
          voices.find((v) => v.lang === utterance.lang) ||
          voices.find((v) => v.lang.startsWith(prefix));
        if (matchVoice) {
          utterance.voice = matchVoice;
        }
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        sessionStorage.setItem('civicai_welcome_voice_played', 'true');
        sessionStorage.removeItem('civicai_welcome_voice_auto');
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);

      // Guard against Chromium paused state
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setHasVoiceSupport(true);

    const isAutoPending = sessionStorage.getItem('civicai_welcome_voice_auto') === 'true';
    const alreadyPlayed = sessionStorage.getItem('civicai_welcome_voice_played') === 'true';

    // Auto-play when citizen logs in or on first visit to dashboard
    if ((isAutoPending || !alreadyPlayed) && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      sessionStorage.removeItem('civicai_welcome_voice_auto');

      playGreeting(false);

      // Handle browser autoplay policy: if browser prevented initial autoplay,
      // trigger seamlessly on first user interaction on the dashboard
      const handleFirstInteraction = () => {
        const played = sessionStorage.getItem('civicai_welcome_voice_played') === 'true';
        if (!played) {
          playGreeting(false);
        }
      };

      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });

      return () => {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
    }
  }, [language]);

  const handleToggle = () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      playGreeting(true);
    }
  };

  if (!hasVoiceSupport) return null;

  return (
    <button
      type="button"
      className={`voice-greeting-btn ${isPlaying ? 'voice-greeting-btn--playing' : ''}`}
      onClick={handleToggle}
      aria-label="Play welcome voice greeting"
      title="Click to play voice welcome message"
    >
      <span className="voice-icon" aria-hidden="true">
        {isPlaying ? '🔊' : '🔈'}
      </span>
      <span className="voice-label">
        {isPlaying ? t('voiceGreetingPlaying', 'Speaking...') : t('voiceGreetingTitle', 'Voice Welcome')}
      </span>
      {isPlaying && (
        <span className="voice-equalizer" aria-hidden="true">
          <span className="voice-bar voice-bar--1" />
          <span className="voice-bar voice-bar--2" />
          <span className="voice-bar voice-bar--3" />
        </span>
      )}
    </button>
  );
};

export default VoiceGreeting;
