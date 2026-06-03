import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="pb-6 border-b border-border/70">
          <p className="text-xs uppercase tracking-[0.22em] text-primary/85 mb-3">Cragmate policy</p>
          <PageHeader
            title="Terms of Service"
            description="Baseline terms for acceptable and safe platform use."
            className="mb-0"
          />
        </div>

        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Use of Cragmate</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            By using Cragmate, you agree to these terms and to using the service lawfully and respectfully.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Accounts and content</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            You are responsible for your account and the content you submit. You keep ownership of your content, and
            grant us permission to store and display it to operate the platform.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Restrictions</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            You may not attempt unauthorized access, disrupt service availability, or upload harmful or abusive content.
          </p>
        </section>
        <section className="py-5 sm:py-6 border-b border-border/60">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Liability and termination</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Cragmate’s liability is limited to the extent permitted by law. We may suspend or terminate accounts for
            serious violations of these terms.
          </p>
        </section>
        <section className="py-5 sm:py-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">Updates and contact</h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We may update these terms from time to time. For questions, please contact our support team.
          </p>
        </section>
      </div>
    </Layout>
  );
}
