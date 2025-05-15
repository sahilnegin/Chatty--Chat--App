import React, { useEffect, useState } from 'react';

export default function TypewriterText() {
  const phrases = [
    'Text your friend',
    'Connect with them',
    'Make conversations easier',
    'Stay in touch effortlessly',
  ];

  const [currentText, setCurrentText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const speed = isDeleting ? 50 : 100;

    const timeout = setTimeout(() => {
      setCurrentText((prev) =>
        isDeleting
          ? currentPhrase.substring(0, prev.length - 1)
          : currentPhrase.substring(0, prev.length + 1)
      );

      if (!isDeleting && currentText === currentPhrase) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentPhraseIndex]);

  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 h-10">
        {currentText}
        <span className="border-r-2 border-gray-800 animate-pulse ml-1" />
      </h2>
    </div>
  );
}
