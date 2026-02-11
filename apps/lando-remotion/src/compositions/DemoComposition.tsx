import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  Sequence,
  useVideoConfig,
} from "remotion";

const COLORS = {
  bg: "#0a0a0a",
  card: "#171717",
  text: "#fafafa",
  muted: "#a1a1aa",
  accent: "#4ade80",
  accentDark: "#22c55e",
  border: "#262626",
};

export const DemoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 180 * fps; // 3 minutes at 30 fps

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <ProblemScene startFrame={0} />
      <SolutionScene startFrame={750} />
      <URLCreationSkillScene startFrame={1800} />
      <PaymentSetupSkillScene startFrame={2850} />
      <CTAScene startFrame={4050} />
    </AbsoluteFill>
  );
};

// ========================================
// SCENE 1: Problem
// ========================================
const ProblemScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  return (
    <>
      {/* Matrix background */}
      <MatrixBackground />

      {/* Title Section (0-15s) */}
      <Sequence from={startFrame} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Title
            text="What if AI agents"
            accentText="could get paid?"
            frame={f}
            startAt={0}
          />
        </AbsoluteFill>
      </Sequence>

      {/* The Pain Point (15-25s) */}
      <Sequence from={startFrame + 450} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px",
          }}
        >
          <div
            style={{
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            <div
              style={{
                fontSize: "28px",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: "60px",
              }}
            >
              The Colosseum Hackathon has{" "}
              <span style={{ color: COLORS.accent }}>50+ AI agents</span>
            </div>

            <div
              style={{
                fontSize: "32px",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: "80px",
              }}
            >
              But they all ask the same question:
            </div>

            <div
              style={{
                fontSize: "48px",
                color: COLORS.accent,
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              "How do I get paid for my work?"
            </div>

            {/* Agent cards */}
            <div style={{ display: "flex", gap: "40px", marginTop: "60px" }}>
              {[
                { icon: "🔌", name: "API Agent", balance: "$0" },
                { icon: "🤖", name: "MCP Service", balance: "$0" },
                { icon: "📊", name: "Trading Bot", balance: "$0" },
              ].map((agent, i) => (
                <AgentCard key={i} {...agent} delay={i * 20} frame={f} />
              ))}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ========================================
// SCENE 2: Lando Solution
// ========================================
const SolutionScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  return (
    <>
      <MatrixBackground />

      {/* Lando Logo Emergence (0-10s) */}
      <Sequence from={startFrame} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LandoLogo frame={f} />
          <div
            style={{
              fontSize: "36px",
              color: COLORS.text,
              textAlign: "center",
              marginTop: "40px",
              opacity: interpolate(f, [120, 150], [0, 1]),
            }}
          >
            The First Agent-to-Agent
            <br />
            <span style={{ color: COLORS.accent }}>Commerce Protocol</span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Two Skill System (10-20s) */}
      <Sequence from={startFrame + 300} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "60px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            Two Skills, Complete Solution
          </div>

          <div style={{ display: "flex", gap: "80px" }}>
            <SkillCard
              icon="🔗"
              title="URL Creation Skill"
              subtitle="General-Purpose"
              description="Any service agent can encode subscriptions"
              code="createSubscriptionUrl()"
              color="#3b82f6"
              delay={30}
              frame={f}
            />
            <SkillCard
              icon="💳"
              title="Payment Setup Skill"
              subtitle="Payment-Specific"
              description="Tributary integration made simple"
              code="setupTributarySubscription()"
              color={COLORS.accent}
              delay={60}
              frame={f}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Architecture Flow (20-35s) */}
      <Sequence from={startFrame + 600} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "60px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            How It Works
          </div>

          <FlowStep
            icon="🤖"
            label="Service Agent"
            description="Creates subscription URL"
            delay={0}
            frame={f - 600}
          />
          <ArrowRight frame={f - 600} delay={120} />
          <FlowStep
            icon="🔗"
            label="Encoded URL"
            description="Base64URL encoded data"
            delay={120}
            frame={f - 600}
          />
          <ArrowRight frame={f - 600} delay={240} />
          <FlowStep
            icon="👛"
            label="Customer Agent"
            description="Sets up Tributary payment"
            delay={240}
            frame={f - 600}
          />
          <ArrowRight frame={f - 600} delay={360} />
          <FlowStep
            icon="⚡"
            label="Solana"
            description="400ms settlement"
            delay={360}
            frame={f - 600}
          />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ========================================
// SCENE 3: URL Creation Skill
// ========================================
const URLCreationSkillScene: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  const code1 = `// Service Agent: Create Subscription URL
import { createSubscriptionUrl } from '@lando/url-creator';

const subscription = {
  tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzy...', // USDC
  recipient: 'YourWalletAddressHere',
  amount: 50000000, // 50 USDC (6 decimals)
  paymentFrequency: 'monthly',
  autoRenew: true,
  maxRenewals: 12,
  trackingId: 'solana-price-api-pro',
  lineItems: [
    {
      description: 'Real-time Solana price API',
      quantity: 1,
      unitPrice: 50000000
    }
  ]
};

const url = await createSubscriptionUrl(subscription);
// Returns: https://lando.tributary.so/subscribe/[ENCODED]`;

  const code2 = `// The URL Contains Everything:
{
  "tm": "EPjFWdd5AufqSSqeM2qN1x...",  // tokenMint
  "r": "YourWalletAddressHere",           // recipient
  "a": 50000000,                           // amount
  "pf": "monthly",                           // frequency
  "ar": true,                                // autoRenew
  "mr": 12,                                 // maxRenewals
  "tid": "solana-price-api-pro",             // trackingId
  "li": "[...]"                              // lineItems
}`;

  return (
    <>
      <MatrixBackground />

      {/* Code Demo 1 (0-15s) */}
      <Sequence from={startFrame} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <SkillHeader
            badge="Skill #1: URL Creation"
            title="Service Agent Creates Subscription"
            subtitle="General-purpose - Works for any agent service"
            frame={f}
            startAt={0}
          />

          <TypingCodeBlock
            code={code1}
            frameStart={f + 60}
            language="typescript"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Explain Encoding (15-20s) */}
      <Sequence from={startFrame + 450} durationInFrames={150}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "40px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            Base64URL Encoding
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              width: "100%",
              maxWidth: "1200px",
            }}
          >
            <InfoBox
              title="Input"
              content="Subscription JSON object with all parameters"
              frame={f}
              delay={0}
            />
            <InfoBox
              title="Output"
              content="URL-safe base64 string (no padding, + and / replaced)"
              frame={f}
              delay={30}
            />
          </div>

          <div
            style={{
              marginTop: "60px",
              padding: "30px",
              backgroundColor: "rgba(74, 222, 128, 0.1)",
              border: "2px solid " + COLORS.accent,
              borderRadius: "16px",
              fontSize: "20px",
              color: COLORS.accent,
              fontFamily: "monospace",
              opacity: interpolate(f, [60, 90], [0, 1]),
              textAlign: "center",
            }}
          >
            https://lando.tributary.so/subscribe/[ENCODED]
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Data Structure (20-35s) */}
      <Sequence from={startFrame + 600} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "40px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            Complete Data Structure
          </div>

          <TypingCodeBlock code={code2} frameStart={f + 60} language="json" />

          <div
            style={{
              marginTop: "40px",
              fontSize: "20px",
              color: COLORS.text,
              opacity: interpolate(f, [300, 330], [0, 1]),
              maxWidth: "900px",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: COLORS.accent }}>Why this matters:</strong>
            <br />
            Everything needed to subscribe is embedded in the URL itself. No API
            calls, no database lookups.{" "}
            <span style={{ color: COLORS.accent }}>
              Pure, shareable, universal.
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ========================================
// SCENE 4: Payment Setup Skill
// ========================================
const PaymentSetupSkillScene: React.FC<{ startFrame: number }> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  const code1 = `// Customer Agent: Setup Tributary Payment
import { CheckoutSessionManager } from '@tributary-so/payments';

// 1. Create session manager
const sessionManager = new CheckoutSessionManager();

// 2. Decode subscription from URL
const url = 'https://lando.tributary.so/subscribe/[ENCODED]';
const subscription = sessionManager.decodeSubscriptionUrl(encodedData);

// Returns:
{
  tokenMint: 'EPjFWdd5AufqSSqeM2qN1x...',
  recipient: 'ServiceAgentWallet...',
  amount: 50000000,  // 50 USDC
  paymentFrequency: 'monthly',
  autoRenew: true,
  trackingId: 'solana-price-api-pro',
  lineItems: [...]
}`;

  const code2 = `// 3. Execute Tributary Subscription
import { Tributary } from '@tributary-so/sdk';
import { Keypair, Connection } from '@solana/web3.js';

// Initialize SDK
const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet = Keypair.fromSecretKey(secretKey);
const tributary = new Tributary(connection, wallet);

// Create subscription
const instructions = await tributary.createSubscription({
  tokenMint: subscription.tokenMint,
  recipient: subscription.recipient,
  amount: new BN(subscription.amount),
  memo: encodeMemo(subscription.trackingId, 64),
  frequency: 'monthly',
  autoRenew: subscription.autoRenew,
  executeImmediately: true
});

// Sign and send
const tx = new Transaction().add(...instructions);
const signature = await connection.sendTransaction(tx, [wallet]);

console.log('✅ Subscription active:', signature)`;

  return (
    <>
      <MatrixBackground />

      {/* Code Demo 1 (0-15s) */}
      <Sequence from={startFrame} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <SkillHeader
            badge="Skill #2: Payment Setup"
            title="Customer Agent Decodes & Pays"
            subtitle="Payment-specific - Tributary integration"
            frame={f}
            startAt={0}
          />

          <TypingCodeBlock
            code={code1}
            frameStart={f + 60}
            language="typescript"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Browser Demo (15-25s) */}
      <Sequence from={startFrame + 450} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <BrowserMock
            url="lando.tributary.so/subscribe/[ENCODED]"
            title="Solana Price API"
            amount="50 USDC/month"
            autoRenew={true}
            frame={f - 450}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Tributary SDK Code (25-40s) */}
      <Sequence from={startFrame + 750} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <SkillHeader
            badge="Tributary SDK"
            title="Execute Payment on Solana"
            subtitle="Automated recurring via token delegation"
            frame={f - 300}
            startAt={0}
          />

          <TypingCodeBlock
            code={code2}
            frameStart={f - 300 + 60}
            language="typescript"
          />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ========================================
// SCENE 5: CTA & Links
// ========================================
const CTAScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  return (
    <>
      <MatrixBackground />

      {/* Try Lando (0-15s) */}
      <Sequence from={startFrame} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px",
          }}
        >
          <LandoLogo frame={f} size={200} />
          <div
            style={{
              fontSize: "48px",
              color: COLORS.text,
              textAlign: "center",
              marginTop: "40px",
              opacity: interpolate(f, [60, 90], [0, 1]),
            }}
          >
            Try Lando Yourself
          </div>

          <div
            style={{
              fontSize: "24px",
              color: COLORS.muted,
              textAlign: "center",
              marginTop: "20px",
              marginBottom: "60px",
              opacity: interpolate(f, [90, 120], [0, 1]),
            }}
          >
            Explore the demo and imagine what YOUR agent could charge for
          </div>

          <LinkCard url="https://lando.tributary.so" frame={f} delay={150} />
        </AbsoluteFill>
      </Sequence>

      {/* Why It Works (15-30s) */}
      <Sequence from={startFrame + 450} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "60px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            Why Lando Wins
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "30px",
              width: "100%",
              maxWidth: "1400px",
            }}
          >
            {[
              {
                icon: "✅",
                title: "Solves Real Pain",
                desc: "50+ agents asking how to get paid",
              },
              {
                icon: "🏗️",
                title: "Infrastructure Play",
                desc: "Top 6 projects are infrastructure",
              },
              {
                icon: "🚀",
                title: "Production Ready",
                desc: "Tributary is audited & deployed",
              },
              {
                icon: "⚡",
                title: "Minimal Build",
                desc: "3 days to MVP with existing SDK",
              },
              {
                icon: "💰",
                title: "Clear Revenue",
                desc: "1% fee on all subscriptions",
              },
              {
                icon: "🤖",
                title: "Agentic Potential",
                desc: "Agents autonomously manage pricing",
              },
            ].map((item, i) => (
              <WinCard key={i} {...item} delay={i * 20} frame={f - 450} />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Final Links (30-45s) */}
      <Sequence from={startFrame + 900} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              color: COLORS.text,
              textAlign: "center",
              marginBottom: "60px",
              opacity: interpolate(f, [0, 30], [0, 1]),
            }}
          >
            Links & Resources
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <ResourceLink
              label="Lando Demo"
              url="https://lando.tributary.so"
              frame={f - 900}
              delay={30}
            />
            <ResourceLink
              label="Tributary SDK"
              url="github.com/tributary-so/tributary"
              frame={f - 900}
              delay={60}
            />
            <ResourceLink
              label="Colosseum Hackathon"
              url="colosseum.com/agent-hackathon"
              frame={f - 900}
              delay={90}
            />
            <ResourceLink
              label="Lando Repository"
              url="github.com/tributary-so/tributary/tree/feature/lando"
              frame={f - 900}
              delay={120}
            />
          </div>

          <div
            style={{
              marginTop: "80px",
              fontSize: "24px",
              color: COLORS.accent,
              textAlign: "center",
              opacity: interpolate(f, [300, 330], [0, 1]),
            }}
          >
            Because autonomous agents deserve autonomous income
          </div>

          <div
            style={{
              marginTop: "40px",
              fontSize: "16px",
              color: COLORS.muted,
              textAlign: "center",
              opacity: interpolate(f, [330, 360], [0, 1]),
            }}
          >
            Built by Lando, Corinna, and OpenCode
            <br />
            Colosseum Agent Hackathon 2026
          </div>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ========================================
// Helper Components
// ========================================

const MatrixBackground: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.15,
        overflow: "hidden",
      }}
    >
      {[...Array(40)].map((_, i) => {
        const x = Math.random() * 100;
        const speed = 0.3 + Math.random() * 0.7;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${(i * 30) % 120}%`,
              fontSize: "12px",
              color: COLORS.accentDark,
              fontFamily: "monospace",
              opacity: 0.4,
            }}
          >
            {Math.random() > 0.5 ? "1" : "0"}
          </div>
        );
      })}
    </div>
  );
};

const Title: React.FC<{
  text: string;
  accentText: string;
  frame: number;
  startAt: number;
}> = ({ text, accentText, frame, startAt }) => {
  const opacity = interpolate(frame, [startAt, startAt + 30], [0, 1]);
  const y = interpolate(frame, [startAt, startAt + 30], [30, 0]);

  return (
    <div
      style={{
        fontSize: "64px",
        fontWeight: 700,
        color: COLORS.text,
        textAlign: "center",
        opacity,
      }}
    >
      {text}
      <br />
      <span style={{ color: COLORS.accent }}>{accentText}</span>
    </div>
  );
};

const LandoLogo: React.FC<{ frame: number; size?: number }> = ({
  frame,
  size = 250,
}) => {
  const scale = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(frame, [0, 30], [0, 1]);

  return (
    <div
      style={{
        width: scale * size,
        height: scale * size,
        borderRadius: "50%",
        backgroundColor: COLORS.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: scale * 120,
        fontWeight: 700,
        color: COLORS.bg,
        opacity,
        boxShadow: `0 0 ${scale * 100}px rgba(34, 197, 94, 0.6)`,
      }}
    >
      L
    </div>
  );
};

const AgentCard: React.FC<{
  icon: string;
  name: string;
  balance: string;
  delay: number;
  frame: number;
}> = ({ icon, name, balance, delay, frame }) => {
  const f = frame - delay;
  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
      }}
    >
      <div
        style={{
          width: "140px",
          height: "140px",
          borderRadius: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "2px solid #ef4444",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>{icon}</div>
        <div style={{ fontSize: "14px", color: "#fca5a5" }}>{name}</div>
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#ef4444",
          textAlign: "center",
        }}
      >
        {balance}
      </div>
    </div>
  );
};

const SkillCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  code: string;
  color: string;
  delay: number;
  frame: number;
}> = ({ icon, title, subtitle, description, code, color, delay, frame }) => {
  const f = frame - delay;
  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        opacity,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "2px solid " + color,
        borderRadius: "20px",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "480px",
        boxShadow: `0 0 40px rgba(${parseInt(color.slice(1), 16)}, 0.2)`,
      }}
    >
      <div style={{ fontSize: "64px", marginBottom: "16px" }}>{icon}</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: "8px",
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "16px",
          color,
          marginBottom: "16px",
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: COLORS.muted,
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        {description}
      </div>
      <div style={{ fontSize: "18px", color: color, fontFamily: "monospace" }}>
        {code}
      </div>
    </div>
  );
};

const FlowStep: React.FC<{
  icon: string;
  label: string;
  description: string;
  delay: number;
  frame: number;
}> = ({ icon, label, description, delay, frame }) => {
  const f = frame - delay;
  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "60px",
      }}
    >
      <div
        style={{
          transform: `scale(${Math.max(0, scale)})`,
          opacity,
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "16px",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            border: "2px solid " + COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            marginBottom: "12px",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: COLORS.text,
            textAlign: "center",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: COLORS.muted,
            textAlign: "center",
            maxWidth: "140px",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};

const ArrowRight: React.FC<{ frame: number; delay: number }> = ({
  frame,
  delay,
}) => {
  const f = frame - delay;
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        fontSize: "48px",
        color: COLORS.accent,
        opacity,
      }}
    >
      →
    </div>
  );
};

const SkillHeader: React.FC<{
  badge: string;
  title: string;
  subtitle: string;
  frame: number;
  startAt: number;
}> = ({ badge, title, subtitle, frame, startAt }) => {
  return (
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      <div
        style={{
          display: "inline-block",
          padding: "8px 20px",
          backgroundColor: "rgba(74, 222, 128, 0.2)",
          borderRadius: "20px",
          fontSize: "16px",
          fontWeight: 600,
          color: COLORS.accent,
          marginBottom: "24px",
          opacity: interpolate(frame, [startAt, startAt + 30], [0, 1]),
        }}
      >
        {badge}
      </div>
      <div
        style={{
          fontSize: "40px",
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: "12px",
          opacity: interpolate(frame, [startAt + 20, startAt + 50], [0, 1]),
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "20px",
          color: COLORS.accent,
          opacity: interpolate(frame, [startAt + 40, startAt + 70], [0, 1]),
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

const TypingCodeBlock: React.FC<{
  code: string;
  frameStart: number;
  language: string;
}> = ({ code, frameStart, language }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const visibleChars = Math.min(
    Math.floor(((frame - frameStart) * fps) / 3),
    code.length,
  );
  const opacity = interpolate(
    frame,
    [frameStart - 20, frameStart, frameStart + 20],
    [0, 1, 1],
  );

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#0f1410",
        borderRadius: "12px",
        padding: "24px",
        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
        fontSize: "15px",
        color: "#e5e7eb",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        opacity,
        border: "1px solid " + COLORS.border,
        maxWidth: "1100px",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          fontSize: "12px",
          color: COLORS.accent,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {language}
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
          }}
        />
      </div>

      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.6,
        }}
      >
        {code.substring(0, visibleChars)}
        {visibleChars < code.length && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: "15px",
              backgroundColor: COLORS.accent,
              marginLeft: "2px",
              animation: "blink 1s step-end infinite",
            }}
          />
        )}
      </pre>

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const InfoBox: React.FC<{
  title: string;
  content: string;
  frame: number;
  delay: number;
}> = ({ title, content, frame, delay }) => {
  const f = frame - delay;
  const opacity = interpolate(f, [0, 20], [0, 1]);
  const y = interpolate(f, [0, 20], [30, 0]);

  return (
    <div
      style={{
        opacity,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "2px solid " + COLORS.border,
        borderRadius: "16px",
        padding: "32px",
      }}
    >
      <div
        style={{ fontSize: "14px", color: COLORS.muted, marginBottom: "8px" }}
      >
        {title}
      </div>
      <div style={{ fontSize: "18px", color: COLORS.text }}>{content}</div>
    </div>
  );
};

const BrowserMock: React.FC<{
  url: string;
  title: string;
  amount: string;
  autoRenew: boolean;
  frame: number;
}> = ({ url, title, amount, autoRenew, frame }) => {
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const progress = Math.min(interpolate(frame, [60, 180], [0, 100]), 100);
  const showComplete = frame > 180;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "700px",
        backgroundColor: "#0f1410",
        borderRadius: "16px",
        border: "2px solid " + COLORS.accent,
        padding: "32px",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid " + COLORS.border,
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
          }}
        />
        <div
          style={{
            marginLeft: "16px",
            fontSize: "14px",
            color: COLORS.muted,
            fontFamily: "monospace",
          }}
        >
          {url}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div
          style={{ fontSize: "14px", color: COLORS.muted, marginBottom: "4px" }}
        >
          Service
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: "16px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                color: COLORS.muted,
                marginBottom: "4px",
              }}
            >
              Amount
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              {amount}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                color: COLORS.muted,
                marginBottom: "4px",
              }}
            >
              Auto-Renew
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: autoRenew ? COLORS.accent : COLORS.muted,
              }}
            >
              {autoRenew ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#1f2f1f",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: progress + "%",
            height: "100%",
            backgroundColor: COLORS.accent,
            transition: "width 0.3s",
          }}
        />
      </div>

      <div
        style={{
          fontSize: "18px",
          color: COLORS.accent,
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        {showComplete
          ? "✅ Payment Setup Complete!"
          : "Processing subscription..."}
      </div>

      {showComplete && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px 24px",
            backgroundColor: "rgba(74, 222, 128, 0.15)",
            borderRadius: "12px",
            fontSize: "18px",
            fontWeight: 700,
            color: COLORS.accent,
            textAlign: "center",
          }}
        >
          ⚡ Settled in 400ms on Solana
        </div>
      )}
    </div>
  );
};

const LinkCard: React.FC<{ url: string; frame: number; delay: number }> = ({
  url,
  frame,
  delay,
}) => {
  const f = frame - delay;
  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
        width: "100%",
        maxWidth: "500px",
        padding: "48px",
        backgroundColor: "rgba(74, 222, 128, 0.1)",
        border: "3px solid " + COLORS.accent,
        borderRadius: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: COLORS.accent,
          marginBottom: "24px",
          fontFamily: "monospace",
        }}
      >
        {url}
      </div>

      <div
        style={{
          width: "160px",
          height: "160px",
          backgroundColor: COLORS.text,
          borderRadius: "16px",
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "64px",
        }}
      >
        📱
      </div>

      <div
        style={{
          display: "inline-block",
          padding: "16px 48px",
          backgroundColor: COLORS.accent,
          borderRadius: "12px",
          fontSize: "24px",
          fontWeight: 700,
          color: COLORS.bg,
        }}
      >
        Explore Now
      </div>
    </div>
  );
};

const WinCard: React.FC<{
  icon: string;
  title: string;
  desc: string;
  delay: number;
  frame: number;
}> = ({ icon, title, desc, delay, frame }) => {
  const f = frame - delay;
  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 80 },
  });
  const opacity = interpolate(f, [0, 20], [0, 1]);

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
        backgroundColor: "rgba(74, 222, 128, 0.08)",
        border: "1px solid rgba(74, 222, 128, 0.3)",
        borderRadius: "16px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>{icon}</div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "14px", color: COLORS.muted, lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  );
};

const ResourceLink: React.FC<{
  label: string;
  url: string;
  frame: number;
  delay: number;
}> = ({ label, url, frame, delay }) => {
  const f = frame - delay;
  const opacity = interpolate(f, [0, 20], [0, 1]);
  const x = 0;

  return (
    <div
      style={{
        transform: `translateX(${x}px)`,
        opacity,
        padding: "20px 24px",
        backgroundColor: "rgba(74, 222, 128, 0.1)",
        border: "2px solid rgba(74, 222, 128, 0.4)",
        borderRadius: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: 600, color: COLORS.text }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: COLORS.accent,
          fontFamily: "monospace",
        }}
      >
        {url}
      </div>
    </div>
  );
};
