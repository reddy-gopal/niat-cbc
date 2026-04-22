"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
import MissionModal from "./MissionModal";
import XPToast from "./XPToast";
import RejectToast from "./RejectToast";
import TribeCrest from "./TribeCrest";

const ACTIVE_CHALLENGE_IDS = [1, 2, 3, 4, 5, 6];

type ChallengeBoardProps = {
  challenges: Challenge[];
  submissions: Submission[];
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  session: StudentSession;
  onSubmissionsUpdate?: (submissions: Submission[]) => void;
};

type RingStatus = "default" | "review" | "success" | "danger";

const DESKTOP_SIZE = 580;
const DESKTOP_CENTER = 290;
const DESKTOP_RADIUS = 210;
const OUTER_NODE_SIZE = 90;
const CENTER_NODE_SIZE = 128;
const OUTER_GEM_SIZE = 44;
const CENTER_GEM_SIZE = 72;

const SHORT_NAMES: Record<number, string> = {
  1: "Common Ground",
  2: "Crossed Mind",
  3: "Connect Dots",
  4: "Caught Great",
  5: "Time Capsule",
  6: "Real Streak",
};

const DISPLAY_POINTS: Record<number, number> = {
  1: 1,
  2: 5,
  3: 5,
  4: 3,
  5: 2,
  6: 3,
};

const STREAK_CHALLENGE_ID = 6;
const STREAK_MAX_ATTEMPTS = 3;
const COMPLETED_STATUSES = new Set(["accepted", "approved"]);

const STONE_META: Record<number, { label: string; color: string }> = {
  1: { label: "Space Stone", color: "var(--link)" },
  2: { label: "Mind Stone", color: "var(--yellow)" },
  3: { label: "Reality Stone", color: "var(--primary-hover)" },
  4: { label: "Power Stone", color: "var(--purple-dark)" },
  5: { label: "Soul Stone", color: "var(--orange)" },
  6: { label: "Time Stone", color: "var(--success)" },
};

export default function ChallengeBoard({
  challenges,
  submissions,
  setSubmissions,
  session,
  onSubmissionsUpdate,
}: ChallengeBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);
  const [crestRevealed, setCrestRevealed] = useState(false);
  const [isAnimatingFinale, setIsAnimatingFinale] = useState(false);
  const [wheelScale, setWheelScale] = useState(1);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Responsive scale: measure wrapper width, scale 580px canvas to fit
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) setWheelScale(Math.min(1, width / DESKTOP_SIZE));
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const activeChallenges = useMemo(
    () => challenges.filter((c) => ACTIVE_CHALLENGE_IDS.includes(c.id)),
    [challenges]
  );

  const centerChallenge = useMemo(
    () => activeChallenges.find((c) => c.isReferral) ?? null,
    [activeChallenges]
  );

  const outerChallenges = useMemo(
    () =>
      [1, 2, 4, 5, 6]
        .map((id) => activeChallenges.find((c) => c.id === id))
        .filter((c): c is Challenge => Boolean(c)),
    [activeChallenges]
  );

  const submissionByTask = useMemo(() => {
    const map = new Map<number, Submission[]>();
    for (const row of submissions) {
      const list = map.get(row.task_id) ?? [];
      list.push(row);
      map.set(row.task_id, list);
    }
    return map;
  }, [submissions]);

  const hasCompletedSubmission = (rows: Submission[]) =>
    rows.some((row) => COMPLETED_STATUSES.has(String(row.status).toLowerCase()));

  const allComplete = useMemo(
    () =>
      ACTIVE_CHALLENGE_IDS.every((id) =>
        hasCompletedSubmission(submissionByTask.get(id) ?? [])
      ),
    [submissionByTask]
  );
  // const allComplete = true;

  useEffect(() => {
    if (allComplete && !crestRevealed && !isAnimatingFinale) {
      setIsAnimatingFinale(true);
      setTimeout(() => {
        setCrestRevealed(true);
        setIsAnimatingFinale(false);
      }, 2800);
    }
  }, [allComplete, crestRevealed, isAnimatingFinale]);

  useSubmissionPolling(submissions, setSubmissions, {
    onAccepted: ({ taskId, points }) => setToastData({ id: taskId, points }),
    onRejected: (message) => setRejectToastMessage(message),
    onUpdate: (next) => onSubmissionsUpdate?.(next),
  });

  const activeChallenge = useMemo(
    () => challenges.find((c) => c.id === activeTaskId) ?? null,
    [activeTaskId, challenges]
  );

  const isSubmissionLocked = (challenge: Challenge) => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    if (challenge.isReferral) return false;
    if (challenge.id === STREAK_CHALLENGE_ID) {
      const maxResubmitCount = rows.reduce(
        (max, row) => Math.max(max, row.resubmit_count ?? 0),
        0
      );
      return maxResubmitCount >= STREAK_MAX_ATTEMPTS;
    }
    return hasCompletedSubmission(rows);
  };

  const getRingStatus = (challenge: Challenge): RingStatus => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    if (rows.length === 0) return "default";
    const statuses = rows.map((r) => String(r.status).toLowerCase());
    if (statuses.some((s) => s === "approved" || s === "accepted")) return "success";
    if (statuses.some((s) => s === "under_review" || s === "verifying")) return "review";
    if (statuses.some((s) => s === "rejected")) return "danger";
    return "default";
  };

  const getStoneColor = (id: number) =>
    STONE_META[id]?.color ?? "var(--text-muted)";

  const getStatusRingStyle = (challenge: Challenge): CSSProperties => {
    const ring = getRingStatus(challenge);
    const color = getStoneColor(challenge.id);
    if (ring === "success") {
      return {
        border: "2px solid var(--success)",
        boxShadow: "0 0 8px color-mix(in srgb, var(--success) 40%, transparent)",
      };
    }
    if (ring === "review") {
      return {
        border: "2px solid var(--yellow)",
        animation: "stonePulse 2s ease-in-out infinite",
      };
    }
    if (ring === "danger") {
      return { border: "2px solid var(--primary)" };
    }
    return {
      border: `2px solid color-mix(in srgb, ${color} 80%, transparent)`,
      boxShadow: `0 0 10px color-mix(in srgb, ${color} 25%, transparent)`,
    };
  };

  const getGemStyle = (id: number, isCenter: boolean, isCompleted: boolean): CSSProperties => {
    const color = getStoneColor(id);
    const core = isCompleted
      ? color
      : "color-mix(in srgb, var(--text-muted) 35%, var(--text-dark))";
    return {
      width: isCenter ? `${CENTER_GEM_SIZE}px` : `${OUTER_GEM_SIZE}px`,
      height: isCenter ? `${CENTER_GEM_SIZE}px` : `${OUTER_GEM_SIZE}px`,
      borderRadius: "999px",
      position: "relative",
      border: `1px solid color-mix(in srgb, ${core} 60%, transparent)`,
      background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${core} 90%, white 10%), color-mix(in srgb, ${core} 80%, black 20%))`,
    };
  };

  const getGemShadow = (id: number, isCenter: boolean, isCompleted: boolean, hover = false): string => {
    const color = getStoneColor(id);
    const active = isCompleted
      ? color
      : "color-mix(in srgb, var(--text-muted) 40%, var(--text-dark))";
    if (isCenter) {
      return hover
        ? `0 0 24px color-mix(in srgb, ${active} 70%, transparent), 0 0 48px color-mix(in srgb, ${active} 40%, transparent), 0 0 72px color-mix(in srgb, ${active} 25%, transparent)`
        : `0 0 20px color-mix(in srgb, ${active} 60%, transparent), 0 0 40px color-mix(in srgb, ${active} 30%, transparent), 0 0 60px color-mix(in srgb, ${active} 15%, transparent)`;
    }
    return hover
      ? `0 0 24px color-mix(in srgb, ${active} 55%, transparent), 0 0 48px color-mix(in srgb, ${active} 35%, transparent)`
      : `0 0 12px color-mix(in srgb, ${active} 50%, transparent), 0 0 24px color-mix(in srgb, ${active} 25%, transparent)`;
  };

  const getNodeBodyStyle = (id: number, isCenter: boolean): CSSProperties => ({
    width: isCenter ? `${CENTER_NODE_SIZE}px` : `${OUTER_NODE_SIZE}px`,
    height: isCenter ? `${CENTER_NODE_SIZE}px` : `${OUTER_NODE_SIZE}px`,
    borderRadius: "999px",
    border: `1px solid color-mix(in srgb, ${getStoneColor(id)} 40%, transparent)`,
    background: "var(--text-dark)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  });

  const getOuterNodePosition = (index: number) => {
    const angle = (index / 5) * 2 * Math.PI - Math.PI / 2;
    return {
      x: DESKTOP_CENTER + DESKTOP_RADIUS * Math.cos(angle),
      y: DESKTOP_CENTER + DESKTOP_RADIUS * Math.sin(angle),
    };
  };

  const openChallenge = (challenge: Challenge) => {
    if (isSubmissionLocked(challenge)) return;
    setActiveTaskId(challenge.id);
  };

  const isCrestStoneClickable = (challenge: Challenge) => {
    if (challenge.isReferral) return true;
    if (challenge.id === STREAK_CHALLENGE_ID) return !isSubmissionLocked(challenge);
    return false;
  };

  const handleSubmitted = ({ taskId, submissionId }: { taskId: number; submissionId?: string }) => {
    setSubmissions((prev) => {
      let updated = false;
      let next = prev.map((item) => {
        if (submissionId && item.id === submissionId) {
          updated = true;
          return { ...item, task_id: taskId, status: "pending" as const, resubmit_count: item.resubmit_count + 1, updated_at: new Date().toISOString() };
        }
        return item;
      });
      if (!updated) {
        next = prev.map((item) => {
          if (item.task_id === taskId) {
            updated = true;
            return { ...item, status: "pending" as const, resubmit_count: item.resubmit_count + 1, updated_at: new Date().toISOString() };
          }
          return item;
        });
      }
      if (!updated && submissionId) {
        const now = new Date().toISOString();
        next = [
          ...next,
          {
            id: submissionId,
            student_id: session.studentId,
            bootcamp_id: session.bootcampId,
            section_id: session.sectionId,
            region_id: session.regionId,
            task_id: taskId,
            streak_day: null,
            file_url: null,
            file_hash: null,
            status: "pending",
            points: 0,
            ai_reason: null,
            text_response: null,
            resubmit_count: 1,
            verification_attempts: 0,
            last_attempted_at: null,
            verified_at: null,
            override_by: null,
            override_note: null,
            created_at: now,
            updated_at: now,
          },
        ];
      }
      onSubmissionsUpdate?.(next);
      return next;
    });
    setActiveTaskId(null);
  };

  const FacetHighlight = () => (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{ width: "30%", height: "20%", top: "18%", left: "22%", background: "rgba(255,255,255,0.35)" }}
    />
  );

  const NodeLabel = ({ id, isCenter }: { id: number; isCenter: boolean }) => (
    <div
      className="absolute pointer-events-none flex flex-col items-center gap-[2px] whitespace-nowrap text-center"
      style={{ top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}
    >
      {isCenter ? (
        <>
          <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
            {SHORT_NAMES[id]}
          </span>
          <span className="text-[8px] italic" style={{ color: "color-mix(in srgb, var(--primary-hover) 70%, transparent)" }}>
            {STONE_META[id]?.label}
          </span>
        </>
      ) : (
        <>
          <span className="text-[8px] italic" style={{ color: `color-mix(in srgb, ${getStoneColor(id)} 70%, transparent)` }}>
            {STONE_META[id]?.label}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            {SHORT_NAMES[id]}
          </span>
        </>
      )}
      <span
        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
        style={{ background: "var(--hero-from)", color: "var(--bg-base)" }}
      >
        {DISPLAY_POINTS[id]}pt
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-8 relative z-10">
      <AnimatePresence>
        {toastData && (
          <XPToast key="xp" points={toastData.points} onComplete={() => setToastData(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rejectToastMessage && (
          <RejectToast key="reject" message={rejectToastMessage} onComplete={() => setRejectToastMessage(null)} />
        )}
      </AnimatePresence>

      {crestRevealed ? (
        <TribeCrest
          challenges={challenges}
          submissions={submissions}
          onStoneClick={(challenge) => {
            if (!isCrestStoneClickable(challenge)) return;
            openChallenge(challenge);
          }}
          isStoneClickable={isCrestStoneClickable}
          studentName={session.fullName}
        />
      ) : (
        <>
          {/*
            Responsive wheel wrapper:
            - Outer div: full width, square aspect ratio, max 580px
            - Inner div: fixed 580x580, scaled down via transform
            This approach keeps all absolute positioning intact at any screen size.
          */}
          <div
            ref={wrapperRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: `${DESKTOP_SIZE}px`,
              aspectRatio: "1 / 1",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${DESKTOP_SIZE}px`,
                height: `${DESKTOP_SIZE}px`,
                transformOrigin: "top left",
                transform: `scale(${wheelScale})`,
              }}
            >
              {/* Background radial */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none z-0"
                style={{
                  background: "radial-gradient(circle at center, color-mix(in srgb, var(--text-dark) 80%, transparent), transparent 70%)",
                }}
              />

              {/* Spoke lines SVG */}
              <svg
                width={DESKTOP_SIZE}
                height={DESKTOP_SIZE}
                className={`absolute left-0 top-0 z-0 ${isAnimatingFinale ? "finale-orbit" : ""}`}
                style={{ pointerEvents: "none" }}
              >
                {outerChallenges.map((challenge, index) => {
                  const { x, y } = getOuterNodePosition(index);
                  return (
                    <line
                      key={`line-${challenge.id}`}
                      x1={DESKTOP_CENTER} y1={DESKTOP_CENTER}
                      x2={x} y2={y}
                      stroke={getStoneColor(challenge.id)}
                      strokeOpacity={0.2}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  );
                })}
              </svg>

              {/* Center node */}
              {centerChallenge && (() => {
                const completed = getRingStatus(centerChallenge) === "success";
                return (
                  <motion.button
                    type="button"
                    whileHover={isSubmissionLocked(centerChallenge) ? { scale: 1 } : { scale: 1.06 }}
                    whileTap={isSubmissionLocked(centerChallenge) ? { scale: 1 } : { scale: 1.02 }}
                    onClick={() => openChallenge(centerChallenge)}
                    className={`absolute z-[1] flex items-center justify-center ${isAnimatingFinale ? "finale-center-pulse finale-center-boom" : ""}`}
                    style={{
                      left: `${DESKTOP_CENTER - CENTER_NODE_SIZE / 2}px`,
                      top: `${DESKTOP_CENTER - CENTER_NODE_SIZE / 2}px`,
                      width: `${CENTER_NODE_SIZE}px`,
                      height: `${CENTER_NODE_SIZE}px`,
                      borderRadius: "999px",
                      cursor: isSubmissionLocked(centerChallenge) ? "not-allowed" : "pointer",
                      transition: "transform 200ms ease, box-shadow 200ms ease",
                    }}
                  >
                    <div className="absolute inset-[-8px] rounded-full pointer-events-none"
                      style={{ border: "1px solid color-mix(in srgb, var(--primary-hover) 20%, transparent)" }} />
                    <div className="absolute inset-[-14px] rounded-full pointer-events-none"
                      style={{ border: "1px solid color-mix(in srgb, var(--primary-hover) 10%, transparent)" }} />
                    <div className="absolute inset-[-4px] rounded-full pointer-events-none"
                      style={getStatusRingStyle(centerChallenge)} />
                    <div style={getNodeBodyStyle(centerChallenge.id, true)}>
                      <motion.div
                        style={getGemStyle(centerChallenge.id, true, completed)}
                        variants={{
                          rest: { boxShadow: getGemShadow(centerChallenge.id, true, completed, false) },
                          hover: { boxShadow: getGemShadow(centerChallenge.id, true, completed, true) },
                        }}
                        initial="rest"
                        whileHover={isSubmissionLocked(centerChallenge) ? "rest" : "hover"}
                        transition={{ duration: 0.2 }}
                      >
                        <FacetHighlight />
                      </motion.div>
                    </div>
                    <NodeLabel id={centerChallenge.id} isCenter={true} />
                  </motion.button>
                );
              })()}

              {/* Finale beam + shield SVG */}
              {isAnimatingFinale && (
                <svg width={DESKTOP_SIZE} height={DESKTOP_SIZE} className="absolute inset-0 pointer-events-none z-[1]">
                  {outerChallenges.map((challenge, index) => {
                    const { x, y } = getOuterNodePosition(index);
                    return (
                      <line
                        key={`beam-${challenge.id}`}
                        x1={x} y1={y}
                        x2={DESKTOP_CENTER} y2={DESKTOP_CENTER}
                        stroke={getStoneColor(challenge.id)}
                        strokeWidth="2"
                        className="finale-beam"
                      />
                    );
                  })}
                  <circle cx={DESKTOP_CENTER} cy={DESKTOP_CENTER} stroke="var(--yellow)" fill="none" className="finale-shield-ring" />
                </svg>
              )}

              {/* Outer nodes */}
              <div className={`absolute inset-0 pointer-events-none z-[2] ${isAnimatingFinale ? "finale-orbit" : ""}`}>
                {outerChallenges.map((challenge, index) => {
                  const { x, y } = getOuterNodePosition(index);
                  const locked = isSubmissionLocked(challenge);
                  const completed = getRingStatus(challenge) === "success";
                  return (
                    <div
                      key={challenge.id}
                      className={`absolute ${isAnimatingFinale ? "finale-counter" : ""}`}
                      style={{
                        left: `${x - OUTER_NODE_SIZE / 2}px`,
                        top: `${y - OUTER_NODE_SIZE / 2}px`,
                        width: `${OUTER_NODE_SIZE}px`,
                        height: `${OUTER_NODE_SIZE}px`,
                      }}
                    >
                      <motion.button
                        type="button"
                        whileHover={locked ? { scale: 1 } : { scale: 1.12 }}
                        whileTap={locked ? { scale: 1 } : { scale: 1.03 }}
                        onClick={() => openChallenge(challenge)}
                        className={`relative flex w-full h-full items-center justify-center pointer-events-auto ${isAnimatingFinale ? "finale-implode" : ""}`}
                        style={{
                          borderRadius: "999px",
                          cursor: locked ? "not-allowed" : "pointer",
                          transition: "transform 200ms ease",
                        }}
                      >
                        <div className="absolute inset-[-4px] rounded-full pointer-events-none"
                          style={getStatusRingStyle(challenge)} />
                        <div style={getNodeBodyStyle(challenge.id, false)}>
                          <motion.div
                            style={getGemStyle(challenge.id, false, completed)}
                            variants={{
                              rest: { boxShadow: getGemShadow(challenge.id, false, completed, false) },
                              hover: { boxShadow: getGemShadow(challenge.id, false, completed, true) },
                            }}
                            initial="rest"
                            whileHover={locked ? "rest" : "hover"}
                            transition={{ duration: 0.2 }}
                          >
                            <FacetHighlight />
                          </motion.div>
                        </div>
                        <NodeLabel id={challenge.id} isCenter={false} />
                      </motion.button>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          <div
            className="mt-8 text-center text-xs font-bold uppercase tracking-[0.2em] relative z-20"
            style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
          >
            Reveal the Story: Complete challenges to awaken each Infinity Stone
          </div>
        </>
      )}

      <MissionModal
        isOpen={Boolean(activeTaskId)}
        challenge={activeChallenge}
        session={session}
        onClose={() => setActiveTaskId(null)}
        onSubmitSuccess={handleSubmitted}
        isSubmissionLocked={activeChallenge ? isSubmissionLocked(activeChallenge) : false}
      />

      <style jsx global>{`
        @keyframes stonePulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}