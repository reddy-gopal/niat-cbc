"use client";

import type { ReactNode } from "react";
import { StudentNavbar } from "./StudentNavbar";
import { StudentBottomNav } from "./StudentBottomNav";

type StudentAppShellProps = {
  firstName: string;
  children: ReactNode;
};

/**
 * Shared student layout: top navbar, scrollable content, mobile bottom tab bar.
 * Extra bottom padding on small screens so content stays above the fixed tab bar.
 */
export function StudentAppShell({ firstName, children }: StudentAppShellProps) {
  return (
    <>
      <StudentNavbar firstName={firstName} />
      <div className="relative z-[1] min-h-0 w-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>
      <StudentBottomNav />
    </>
  );
}
