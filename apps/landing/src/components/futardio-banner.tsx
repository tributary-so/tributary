import { Lightbulb } from "lucide-react";
import React, { useState, useEffect } from "react";
import { FaTelegram } from "react-icons/fa6";
import { FiExternalLink, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const FutardioBanner: React.FC = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 5,
    minutes: 45,
    seconds: 28,
  });

  // Countdown timer logic
  useEffect(() => {
    // Set the target date (3 days from now for demo purposes)
    const targetDate = new Date(Date.UTC(2026, 4, 18, 15, 0, 0));

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative w-full bg-cover bg-center bg-no-repeat bg-neutral-900 text-white"
      style={{
        backgroundImage: `url('/futardio.png')`,
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 lg:py-8">
        <div className="max-w-4xl mx-auto text-center lg:text-left">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-purple-300/10 border border-purple-300/30 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-purple-300 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-300">
              Live on Futardio
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 leading-tight tracking-tight">
            Futards, <span className="text-purple-500">Join the raise</span>
          </h2>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-neutral-200 mb-6 leading-relaxed max-w-2xl mx-auto">
            $176K raise · 7 days · Full refund if target not met
          </p>

          {/* Countdown Timer */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-200 mb-2 justify-center flex items-center">
              Sale ends in
            </p>
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <div className="glass-card px-3 py-2 rounded-lg min-w-15 md:min-w-17.5">
                <span className="block text-lg md:text-xl lg:text-2xl font-mono font-bold tabular-nums">
                  {timeLeft.days}
                </span>
                <span className="text-[10px] text-neutral-200 uppercase tracking-wider">
                  Days
                </span>
              </div>
              <span className="text-xl font-light text-neutral-200">:</span>
              <div className="glass-card px-3 py-2 rounded-lg min-w-15 md:min-w-17.5">
                <span className="block text-lg md:text-xl lg:text-2xl font-mono font-bold tabular-nums">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-neutral-200 uppercase tracking-wider">
                  Hours
                </span>
              </div>
              <span className="text-xl font-light text-neutral-200">:</span>
              <div className="glass-card px-3 py-2 rounded-lg min-w-15 md:min-w-17.5">
                <span className="block text-lg md:text-xl lg:text-2xl font-mono font-bold tabular-nums">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-neutral-200 uppercase tracking-wider">
                  Minutes
                </span>
              </div>
              <span className="text-xl font-light text-neutral-200">:</span>
              <div className="glass-card px-3 py-2 rounded-lg min-w-15 md:min-w-17.5">
                <span className="block text-lg md:text-xl lg:text-2xl font-mono font-bold tabular-nums text-purple-400">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-neutral-200 uppercase tracking-wider">
                  Seconds
                </span>
              </div>
            </div>
            <p className="text-sm text-neutral-200 font-mono mt-2 tracking-wide  justify-center flex items-center">
              Ends Mon May 25 · 14:59:59 UTC
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              onClick={() => navigate("/futardio")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-base px-6 py-3 flex items-center justify-center gap-2 bg-accent/60 hover:bg-accent/80 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Deck</span>
              <FiArrowRight className="w-4 h-4" />
            </a>

            <a
              href="https://www.futard.io/launch/99vD3p7e5p4vStrn4mX5Uzrqg9A4bica3wisAUQygG6B"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-base px-6 py-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <FiExternalLink className="w-4 h-4" />
              <span>Futardio Raise</span>
              <FiArrowRight className="w-4 h-4" />
            </a>

            <a
              href="https://t.me/tributaryso"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-base px-6 py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaTelegram className="w-4 h-4" />
              <span>Join Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FutardioBanner;
