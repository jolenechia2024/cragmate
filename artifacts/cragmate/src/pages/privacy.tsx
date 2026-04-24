import { Layout } from "@/components/layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="pb-6 border-b border-border/70">
          <p className="text-xs uppercase tracking-[0.22em] text-primary/85 mb-2">Cragmate policy</p>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-wider leading-tight">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-3 leading-relaxed max-w-4xl">
            This Privacy Policy explains how we collect, use, and protect your personal information.
          </p>
        </header>

        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">What we collect</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We collect account information (such as email), climbing logs, notes, and app preferences you choose to
            save.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">How we use it</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We use your data to run core features like login, session tracking, progress analytics, and support.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Sharing and protection</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We do not sell personal data. We only share information with trusted providers needed to operate Cragmate,
            and we apply appropriate safeguards to protect your information.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Your choices</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            You can request access, correction, or deletion of your data, subject to legal requirements.
          </p>
        </section>
        <section className="py-5 sm:py-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Contact</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            For privacy questions or requests, please contact our support team.
          </p>
        </section>
      </div>
    </Layout>
  );
}
