import { Logo } from "./Logo";
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#1a1a1a] text-white pt-16 pb-8 border-t-8 border-[#f7b801]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-6 bg-white p-2 rounded-2xl inline-block shadow-xl">
              <Logo size="lg" />
            </div>
            <h2 className="text-xl font-heading font-black text-[#f7b801] tracking-tighter uppercase mb-4">
              Community Building <br/> Championship
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Empowering the next generation of leaders through gamified connection and real-world challenges.
            </p>
          </div>

          {/* Menus Column */}
          <div className="md:col-span-4 flex justify-center md:justify-start">
            <div>
              <h3 className="text-[#f7b801] font-black text-xs uppercase tracking-[0.2em] mb-6">Platform</h3>
              <ul className="space-y-4 text-sm font-bold">
                <li><Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors">Global Standings</Link></li>
                <li><Link href="/invite" className="text-gray-400 hover:text-white transition-colors">My Tribe</Link></li>
              </ul>
            </div>
          </div>

          {/* Pitch Column */}
          <div className="md:col-span-4">
            <div className="bg-gradient-to-br from-[#991b1b] to-[#1a1a1a] border-2 border-[#f7b801]/30 p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#f7b801]/10 rounded-full blur-3xl group-hover:bg-[#f7b801]/20 transition-all duration-700"></div>
              
              <h3 className="text-white font-heading font-black text-2xl mb-4 relative z-10 italic">
                Ready for more?
              </h3>
              <p className="text-white/70 text-sm mb-6 relative z-10 font-medium">
                Join the <span className="text-[#f7b801] font-bold">NIAT Insider</span> community for exclusive campus news, events, and networking.
              </p>
              
              <a 
                href="https://niatinsider.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#f7b801] text-[#991b1b] font-black px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg text-sm uppercase tracking-widest relative z-10"
              >
                VISIT NIAT INSIDER
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span>NIAT CBC © {year}</span>
            <span className="hidden md:inline text-gray-800">|</span>
            <a 
              href="https://www.linkedin.com/in/anthapu-gopal-reddy/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#f7b801] hover:underline transition-all"
            >
              Built by Gopal Reddy
            </a>
          </div>
          <div className="flex gap-6">
            <a href="https://niatinsider.com" className="hover:text-white transition-colors">NIAT INSIDER</a>
            <a href="https://www.niatindia.com" className="hover:text-white transition-colors">NIAT INDIA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
