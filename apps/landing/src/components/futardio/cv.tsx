import { BriefcaseBusiness, CheckCheck, Crown } from "lucide-react";

type ProfileProps = {
  isDAORaise: boolean,
  showExits: boolean
};

export default function FabianSchuhProfile({ isDAORaise = true, showExits = true }: ProfileProps) {
  return (
    <div className="space-y-8">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ["26+", "projects shipped"],
          ["4", "successful exits"],
          ["10+", "years in web3"],
          ["500M+", "blocks produced"],
          ["16+", "L1 blockchains launched"],
        ].map(([num, label]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-medium">{num}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Intro ── */}
      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest ">
          Built the entire protocol solo · $0 funding
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Veteran web3 builder. PhD engineer turned crypto founder in 2015.
          From low-latency comms research to shipping low-latency, full-stack
          blockchain protocols, DeFi platforms, and AI agent systems.
        </p>
      </section>

      {/* ── BitShares DAO ── */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest ">
          The world's first on-chain DAO run as a business
        </p>
        <div className="space-y-2.5">
          <div className="flex gap-3 items-start border border-foreground/30 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-lg shrink-0">
              <Crown />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">#1 committee member</p>
              <p className="text-xs  leading-relaxed">
                One of 11 elected seats controlling the blockchain — fees, block
                times, stablecoin rules, reserve fund. Held the top position by
                community vote.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start border border-foreground/30 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-lg shrink-0">
              <CheckCheck />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Largest voting proxy</p>
              <p className="text-xs  leading-relaxed">
                Tens of Millions of BTS delegated stake to{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  xeroc
                </code>
                . His vote determined which witnesses secured the network.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start border border-foreground/30 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-lg shrink-0">
              <BriefcaseBusiness />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                Hired by the blockchain directly
              </p>
              <p className="text-xs  leading-relaxed">
                One of the first developers ever paid via on-chain worker
                proposal. Token holders approved his salary through governance.
                Pioneered the model.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Exits ── */}
      {showExits && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest ">Exits</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              ["Steemit", "Founding member · Python lead"],
              ["MakerDAO", "Advisor · whitepaper review"],
              ["Cryptonomex", "Founding member · 0.1% equity"],
              ["Relay.md", "Solo MicroSaaS founder"],
            ].map(([name, role]) => (
              <div
                key={name}
                className="border border-foreground/30 rounded-xl p-3 flex flex-col gap-1 hover:border-gray-300 transition-colors"
              >
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-gray-400">{role}</p>
                <span className="mt-1 self-start text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
                  ✓ Exit
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Why Fabian for a DAO ── */}
      {isDAORaise && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest ">
            Why Fabian to raise funds for a DAO
          </p>
          <p className="bg-gray-50 p-4 leading-relaxed">
            Arguably the most uniquely qualified individual in Web3 to lead a
            project's transition into a DAO. He not only participated in
            decentralized governance, he even architected systems that let DAOs
            function as sustainable, unmanned companies.
          </p>
        </section>
      )}
    </div>
  );
}
