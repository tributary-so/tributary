import React, { useState, useEffect } from "react";
import { FaTelegram } from "react-icons/fa6";
import { FiExternalLink, FiArrowRight } from "react-icons/fi";

const FutardioBanner: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 5,
    minutes: 45,
    seconds: 28,
  });

  // Countdown timer logic
  useEffect(() => {
    // Set the target date (3 days from now for demo purposes)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(16, 0, 0, 0); // 4 PM UTC

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
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl px-6 sm:px-12 py-16 md:py-24 lg:py-32">
        <div className="max-w-4xl">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 bg-purple-300/10 border border-purple-300/30 backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-300 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-300">
              Live on Futardio
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Futards, <span className="gradient-text">Join the raise</span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-neutral-200 mb-10 leading-relaxed max-w-2xl mx-auto">
            $180K raise · 72 hours · Full refund if target not met
          </p>

          {/* Countdown Timer */}
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-200 mb-4 justify-center flex items-center">
              Sale ends in
            </p>
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <div className="glass-card px-5 py-4 rounded-xl min-w-[80px] md:min-w-[100px]">
                <span className="block text-2xl md:text-3xl lg:text-4xl font-mono font-bold tabular-nums">
                  {timeLeft.days}
                </span>
                <span className="text-xs text-neutral-200 uppercase tracking-wider">
                  Days
                </span>
              </div>
              <span className="text-3xl font-light text-neutral-200">:</span>
              <div className="glass-card px-5 py-4 rounded-xl min-w-[80px] md:min-w-[100px]">
                <span className="block text-2xl md:text-3xl lg:text-4xl font-mono font-bold tabular-nums">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-xs text-neutral-200 uppercase tracking-wider">
                  Hours
                </span>
              </div>
              <span className="text-3xl font-light text-neutral-200">:</span>
              <div className="glass-card px-5 py-4 rounded-xl min-w-[80px] md:min-w-[100px]">
                <span className="block text-2xl md:text-3xl lg:text-4xl font-mono font-bold tabular-nums">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-xs text-neutral-200 uppercase tracking-wider">
                  Minutes
                </span>
              </div>
              <span className="text-3xl font-light text-neutral-200">:</span>
              <div className="glass-card px-5 py-4 rounded-xl min-w-[80px] md:min-w-[100px]">
                <span className="block text-2xl md:text-3xl lg:text-4xl font-mono font-bold tabular-nums text-purple-400">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-xs text-neutral-200 uppercase tracking-wider">
                  Seconds
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-200 font-mono mt-4 tracking-wide  justify-center flex items-center">
              Ends Sat Mar 14 · 16:00 UTC · 9:30 PM IST · 12 PM ET · 9 AM PT
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://www.futard.io/launch/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base md:text-lg px-8 py-4 flex items-center justify-center gap-3"
            >
              <FiExternalLink className="w-5 h-5" />
              <span>Participate on Futardio</span>
              <FiArrowRight className="w-5 h-5" />
            </a>

            <a
              href="https://t.me/mashdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-base md:text-lg px-8 py-4 flex items-center justify-center gap-3"
            >
              <FaTelegram className="w-5 h-5" />
              <span>Join Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FutardioBanner;
