import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const VoiceGreeting = () => {
  const { language, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setHasVoiceSupport(true);

      // Check if already auto-played in this session
      const alreadyPlayed = sessionStorage.getItem('civicai_welcome_voice_played');
      if (!alreadyPlayed && !hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        // Small delay to allow page render
        const timer = setTimeout(() => {
          playGreeting(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

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
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const text = getGreetingText();
      const utterance = new SpeechSynthesisUtterance(text);

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

      utterance.onstart = () => {
        setIsPlaying(true);
        sessionStorage.setItem('civicai_welcome_voice_played', 'true');
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) {
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
