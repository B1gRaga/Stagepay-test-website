"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="#10B981"
            strokeWidth={path.width}
            strokeOpacity={0.04 + path.id * 0.018}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({
  title = "Invoice like a professional.",
  subtitle = "Describe your work in plain English. AI builds the invoice. Reminders chase the payment. You focus on what you do best.",
  ctaHref = "/app",
  ctaLabel = "Start for free",
}: {
  title?: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const words = title.split(" ");

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "#060A12" }}
    >
      {/* Animated grid overlay matching landing page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 40%, black, transparent)",
        }}
      />

      {/* Floating SVG paths */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Ambient orbs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          background: "rgba(16,185,129,.1)",
          filter: "blur(100px)",
          top: "20%",
          left: "15%",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: "rgba(59,130,246,.08)",
          filter: "blur(100px)",
          top: "40%",
          right: "10%",
          opacity: 0.5,
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 mb-9 px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase"
            style={{
              color: "#10B981",
              borderColor: "rgba(16,185,129,.2)",
              background: "rgba(16,185,129,.06)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#10B981" }}
            />
            AI-powered invoicing
          </motion.div>

          {/* Headline — Bebas Neue to match brand */}
          <h1
            className="font-black mb-6 leading-none tracking-wide"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(60px, 11vw, 120px)",
              letterSpacing: "2px",
              lineHeight: 0.88,
            }}
          >
            {words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                className="inline-block mr-4 last:mr-0"
              >
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block"
                    style={{
                      color:
                        wordIndex === words.length - 1
                          ? "#10B981"
                          : "#F0F4F8",
                      fontFamily:
                        wordIndex === words.length - 1
                          ? "'Instrument Serif', serif"
                          : "'Bebas Neue', sans-serif",
                      fontStyle:
                        wordIndex === words.length - 1 ? "italic" : "normal",
                      textShadow:
                        wordIndex === words.length - 1
                          ? "0 0 80px rgba(16,185,129,.3)"
                          : "none",
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mb-10 font-light leading-relaxed max-w-xl mx-auto"
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontSize: "clamp(16px, 2.2vw, 20px)",
              color: "rgba(240,244,248,.55)",
            }}
          >
            {subtitle}
          </motion.p>

          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <div
              className="inline-block group relative p-px rounded-xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(16,185,129,.4), rgba(16,185,129,.1))",
              }}
            >
              <Button
                variant="ghost"
                className="rounded-[0.65rem] px-8 py-5 text-base font-bold transition-all duration-300 group-hover:-translate-y-0.5"
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  background: "#10B981",
                  color: "#060A12",
                  letterSpacing: "0.02em",
                }}
                onClick={() => {
                  window.location.href = ctaHref;
                }}
              >
                <span className="opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M2 8l5 5 7-7" />
                  </svg>
                  {ctaLabel}
                </span>
              </Button>
            </div>

            <Button
              variant="ghost"
              className="px-8 py-5 text-base font-semibold rounded-xl border transition-all duration-300"
              style={{
                fontFamily: "'Archivo', sans-serif",
                background: "transparent",
                color: "rgba(240,244,248,.55)",
                borderColor: "rgba(255,255,255,.1)",
                letterSpacing: "0.02em",
              }}
              onClick={() => {
                document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See how it works
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-10 flex items-center justify-center gap-6 flex-wrap"
          >
            {["No credit card", "Free plan forever", "40+ countries"].map(
              (item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "rgba(240,244,248,.25)", fontFamily: "'Archivo', sans-serif" }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                  >
                    <path d="M2 8l5 5 7-7" />
                  </svg>
                  {item}
                </span>
              )
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
