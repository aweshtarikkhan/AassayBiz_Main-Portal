import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";

export function PublicHeader() {
  const { session } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={`${logoImg}?v=${Date.now()}`} alt="Aassay Biz" className="h-6 sm:h-8 w-auto object-contain" />
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {session ? (
            <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10 font-semibold px-2 sm:px-4 text-xs sm:text-sm h-9 sm:h-10" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button variant="ghost" className="text-slate-700 hover:text-primary hover:bg-slate-100 font-semibold px-2 sm:px-4 text-xs sm:text-sm h-9 sm:h-10" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/25 rounded-full px-4 sm:px-6 text-xs sm:text-sm h-9 sm:h-10" asChild>
            <Link to="/pricing">View Plans</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
