import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Mountain, Activity, NotebookPen, MapPin, Users, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/sessions", label: "Sessions", icon: NotebookPen },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/grades", label: "Grade Converter", icon: Mountain },
  { href: "/gyms", label: "Gyms", icon: MapPin },
  { href: "/partners", label: "Partners", icon: Users },
];

function NavLink({ href, label, icon: Icon, onClick }: any) {
  const [isActive] = useRoute(href);
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-lg font-display text-xl tracking-wider transition-all duration-300 group overflow-hidden",
        isActive 
          ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,212,170,0.1)]" 
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="activeNavIndicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,212,170,0.8)]" 
        />
      )}
      {!isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      )}
      <Icon className={cn("w-5 h-5 mb-0.5 relative z-10 transition-transform duration-300 group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]")} />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Mountain className="w-6 h-6" />
          <span className="font-display text-2xl tracking-widest mt-1">CRAGMATE</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="text-foreground p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 md:hidden backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-primary drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
                  <Mountain className="w-8 h-8" />
                  <span className="font-display text-3xl tracking-widest mt-1">CRAGMATE</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-72 bg-card border-r border-border sticky top-0 h-screen p-6">
        <Link href="/" className="flex items-center gap-3 text-primary mb-12 hover:scale-105 transition-transform origin-left drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
          <Mountain className="w-10 h-10" />
          <span className="font-display text-4xl tracking-widest mt-1">CRAGMATE</span>
        </Link>
        <div className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-display text-xl text-foreground group relative overflow-hidden">
              <span className="relative z-10">GU</span>
              <div className="absolute inset-0 bg-primary/20 scale-0 group-hover:scale-100 transition-transform rounded-full" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Guest User</p>
              <p className="text-xs uppercase tracking-wider text-primary/80">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
