import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Page title with a single-line subtitle directly underneath. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-widest leading-tight">
            {title}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0 w-full md:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}
