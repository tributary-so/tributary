export default function Terms() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Effective: May 7, 2026 &middot; ChainSquad GmbH
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            1. Operator
          </h2>
          <p>
            Tributary (&ldquo;the Protocol&rdquo;) is operated by{" "}
            <strong className="text-foreground">ChainSquad GmbH</strong>,
            registered in Germany. All references to &ldquo;we&rdquo;,
            &ldquo;us&rdquo;, or &ldquo;ChainSquad&rdquo; mean ChainSquad GmbH.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            2. Early Testing Stage
          </h2>
          <p>
            Tributary is in{" "}
            <strong className="text-foreground">early testing</strong>. The
            Protocol is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;. Features may be incomplete, contain bugs, or
            change without notice. You use Tributary at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            3. No Warranty
          </h2>
          <p>
            To the fullest extent permitted by applicable law, ChainSquad GmbH
            disclaims all warranties, express or implied, including
            merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the Protocol will be
            error-free, uninterrupted, secure, or meet your requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            4. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted under German law, ChainSquad GmbH
            shall <strong className="text-foreground">not be liable</strong> for
            any direct, indirect, incidental, special, consequential, or
            exemplary damages arising from your use of&mdash;or inability to
            use&mdash;the Protocol. This includes, but is not limited to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1">
            <li>Loss of digital assets, tokens, or funds</li>
            <li>Transaction failures, delays, or misrouting</li>
            <li>Smart contract vulnerabilities or exploits</li>
            <li>Network outages, congestion, or third-party failures</li>
            <li>Any loss of profits, data, or business opportunities</li>
          </ul>
          <p className="mt-3">
            This limitation applies regardless of the legal theory, whether in
            contract, tort (including negligence), strict liability, or
            otherwise, even if ChainSquad GmbH has been advised of the
            possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            5. Assumption of Risk
          </h2>
          <p>
            By using Tributary, you acknowledge and accept the following risks:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1">
            <li>
              <strong className="text-foreground">Smart contract risk:</strong>{" "}
              Code may contain undiscovered vulnerabilities.
            </li>
            <li>
              <strong className="text-foreground">Blockchain risk:</strong>{" "}
              Solana network outages, forks, or consensus failures may affect
              payment execution.
            </li>
            <li>
              <strong className="text-foreground">Market risk:</strong> Token
              values may fluctuate; payment amounts may change in real-world
              terms.
            </li>
            <li>
              <strong className="text-foreground">Regulatory risk:</strong>{" "}
              Legal frameworks for blockchain payments may change.
            </li>
            <li>
              <strong className="text-foreground">Operational risk:</strong> As
              an early-stage product, features may break or behave unexpectedly.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            6. User Responsibilities
          </h2>
          <p>You are solely responsible for:</p>
          <ul className="list-disc list-inside mt-3 space-y-1">
            <li>
              Maintaining the security of your wallet, private keys, and seed
              phrases
            </li>
            <li>Reviewing and understanding any transaction before signing</li>
            <li>
              Ensuring compliance with applicable tax and regulatory obligations
              in your jurisdiction
            </li>
            <li>Monitoring your payment policies and delegations on-chain</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            7. Non-Custodial Nature
          </h2>
          <p>
            Tributary is a{" "}
            <strong className="text-foreground">non-custodial</strong> protocol.
            We never hold, control, or have access to your funds. Payments are
            executed via Solana&rsquo;s native token delegation. You may revoke
            any delegation at any time through your wallet.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            8. Acceptable Use
          </h2>
          <p>
            You agree not to use Tributary for any unlawful purpose, including
            but not limited to money laundering, fraud, sanctions evasion, or
            financing of illegal activities. ChainSquad GmbH reserves the right
            to restrict access to any user or gateway that violates these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            9. Intellectual Property
          </h2>
          <p>
            All content, code, trademarks, and documentation associated with
            Tributary are the intellectual property of ChainSquad GmbH unless
            otherwise stated. Open-source components are governed by their
            respective licenses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            10. Modifications
          </h2>
          <p>
            We may update these Terms at any time. Continued use of the Protocol
            after changes constitutes acceptance of the revised Terms. Material
            changes will be communicated through our website or official
            channels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            11. Governing Law &amp; Dispute Resolution
          </h2>
          <p>
            These Terms are governed by the laws of the{" "}
            <strong className="text-foreground">
              Federal Republic of Germany
            </strong>
            , excluding its conflict-of-law rules.
          </p>
          <p className="mt-3">
            Any dispute arising from or in connection with these Terms shall be
            submitted to the exclusive jurisdiction of the courts of Germany. If
            required by applicable law or mutual agreement, disputes may be
            resolved through arbitration under the rules of the{" "}
            <strong className="text-foreground">
              German Institution of Arbitration (DIS)
            </strong>{" "}
            in Frankfurt am Main. The proceedings shall be conducted in English.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            12. Severability
          </h2>
          <p>
            If any provision of these Terms is found to be unenforceable, the
            remaining provisions shall remain in full force and effect. The
            unenforceable provision shall be replaced by a valid provision that
            comes closest to the economic intent of the original.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            13. Contact
          </h2>
          <p>
            ChainSquad GmbH
            <br />
            Email:{" "}
            <a
              href="mailto:info@tributary.so"
              className="text-primary hover:underline"
            >
              info@tributary.so
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
