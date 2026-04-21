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

type CellStatus = "locked" | "pending" | "completed";
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
        .filter((challenge): challenge is Challenge => Boolean(challenge)),
    [activeChallenges]
  );

  useSubmissionPolling(submissions, setSubmissions, {
    onAccepted: ({ taskId, points }) => setToastData({ id: taskId, points }),
    onRejected: (message) => setRejectToastMessage(message),
    onUpdate: (next) => onSubmissionsUpdate?.(next),
  });

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
  const [crestRevealed, setCrestRevealed] = useState(false);
  const [isAnimatingFinale, setIsAnimatingFinale] = useState(false);

  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const [wheelScale, setWheelScale] = useState(1);

  useEffect(() => {
    if (!wheelContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0) {
        setWheelScale(Math.min(1, rect.width / DESKTOP_SIZE));
      }
    });
    observer.observe(wheelContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (allComplete && !crestRevealed && !isAnimatingFinale) {
      setIsAnimatingFinale(true);
      setTimeout(() => {
        setCrestRevealed(true);
        setIsAnimatingFinale(false);
      }, 2800);
    }
  }, [allComplete, crestRevealed, isAnimatingFinale]);

  const activeChallenge = useMemo(() => challenges.find((c) => c.id === activeTaskId) ?? null, [activeTaskId, challenges]);

  const getCellStatus = (challenge: Challenge): CellStatus => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    if (rows.length === 0) return "locked";
    if (rows.some((row) => row.status === "accepted")) return "completed";
    if (rows.some((row) => row.status === "pending")) return "pending";
    return "locked";
  };

  const isSubmissionLocked = (challenge: Challenge) => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    const hasCompleted = hasCompletedSubmission(rows);

    // Referral challenge remains interactive for repeated claims.
    if (challenge.isReferral) return false;

    // 3-Day Real Streak remains interactive until all allowed attempts are used.
    if (challenge.id === STREAK_CHALLENGE_ID) {
      const maxResubmitCount = rows.reduce(
        (max, row) => Math.max(max, row.resubmit_count ?? 0),
        0
      );
      return maxResubmitCount >= STREAK_MAX_ATTEMPTS;
    }

    return hasCompleted;
  };

  const getRingStatus = (challenge: Challenge): RingStatus => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    if (rows.length === 0) return "default";
    const rawStatuses = rows.map((row) => String(row.status).toLowerCase());
    if (rawStatuses.some((status) => status === "approved" || status === "accepted")) {
      return "success";
    }
    if (rawStatuses.some((status) => status === "under_review" || status === "verifying")) {
      return "review";
    }
    if (rawStatuses.some((status) => status === "rejected")) return "danger";
    return "default";
  };

  const getStoneColor = (challengeId: number): string =>
    STONE_META[challengeId]?.color ?? "var(--text-muted)";

  const getStatusRingStyle = (challenge: Challenge): CSSProperties => {
    const ringStatus = getRingStatus(challenge);
    const stoneColor = getStoneColor(challenge.id);
    const isCompleted = ringStatus === "success";

    if (!isCompleted) {
      return {
        border: `2px solid color-mix(in srgb, ${stoneColor} 80%, transparent)`,
        opacity: 0.9,
        boxShadow: `0 0 10px color-mix(in srgb, ${stoneColor} 25%, transparent)`,
      };
    }

    if (ringStatus === "success") {
      return {
        border: "2px solid var(--success)",
        opacity: 0.9,
        boxShadow: "0 0 8px color-mix(in srgb, var(--success) 40%, transparent)",
      };
    }
    if (ringStatus === "review") {
      return {
        border: "2px solid var(--yellow)",
        opacity: 0.9,
        animation: "stonePulse 2s ease-in-out infinite",
      };
    }
    if (ringStatus === "danger") {
      return {
        border: "2px solid var(--primary)",
        opacity: 0.9,
      };
    }
    return {
      border: `1px solid color-mix(in srgb, ${stoneColor} 25%, transparent)`,
      opacity: 0.8,
    };
  };

  const getOuterNodePosition = (index: number) => {
    const angle = (index / 5) * 2 * Math.PI - Math.PI / 2;
    const x = DESKTOP_CENTER + DESKTOP_RADIUS * Math.cos(angle);
    const y = DESKTOP_CENTER + DESKTOP_RADIUS * Math.sin(angle);
    return { x, y };
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

  const getGemStyle = (
    challengeId: number,
    isCenter: boolean,
    isCompleted: boolean
  ): CSSProperties => {
    const stoneColor = getStoneColor(challengeId);
    const gemCoreColor = isCompleted
      ? stoneColor
      : "color-mix(in srgb, var(--text-muted) 35%, var(--text-dark))";
    return {
      width: isCenter ? `${CENTER_GEM_SIZE}px` : `${OUTER_GEM_SIZE}px`,
      height: isCenter ? `${CENTER_GEM_SIZE}px` : `${OUTER_GEM_SIZE}px`,
      borderRadius: "999px",
      position: "relative",
      border: `1px solid color-mix(in srgb, ${gemCoreColor} 60%, transparent)`,
      background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${gemCoreColor} 90%, white 10%), color-mix(in srgb, ${gemCoreColor} 80%, black 20%))`,
    };
  };

  const getGemShadow = (
    challengeId: number,
    isCenter: boolean,
    isCompleted: boolean,
    hover = false
  ): string => {
    const stoneColor = getStoneColor(challengeId);
    const activeColor = isCompleted
      ? stoneColor
      : "color-mix(in srgb, var(--text-muted) 40%, var(--text-dark))";
    if (isCenter) {
      return hover
        ? `0 0 24px color-mix(in srgb, ${activeColor} 70%, transparent), 0 0 48px color-mix(in srgb, ${activeColor} 40%, transparent), 0 0 72px color-mix(in srgb, ${activeColor} 25%, transparent)`
        : `0 0 20px color-mix(in srgb, ${activeColor} 60%, transparent), 0 0 40px color-mix(in srgb, ${activeColor} 30%, transparent), 0 0 60px color-mix(in srgb, ${activeColor} 15%, transparent)`;
    }

    return hover
      ? `0 0 24px color-mix(in srgb, ${activeColor} 55%, transparent), 0 0 48px color-mix(in srgb, ${activeColor} 35%, transparent)`
      : `0 0 12px color-mix(in srgb, ${activeColor} 50%, transparent), 0 0 24px color-mix(in srgb, ${activeColor} 25%, transparent)`;
  };

  const getNodeBodyStyle = (challengeId: number, isCenter: boolean): CSSProperties => {
    const stoneColor = getStoneColor(challengeId);
    return {
      width: isCenter ? `${CENTER_NODE_SIZE}px` : `${OUTER_NODE_SIZE}px`,
      height: isCenter ? `${CENTER_NODE_SIZE}px` : `${OUTER_NODE_SIZE}px`,
      borderRadius: "999px",
      border: `1px solid color-mix(in srgb, ${stoneColor} 40%, transparent)`,
      background: "var(--text-dark)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    };
  };

  const handleSubmitted = ({ taskId, submissionId }: { taskId: number; submissionId?: string }) => {
    setSubmissions((prev) => {
      let updated = false;
      let next = prev.map((item) => {
        if (submissionId && item.id === submissionId) {
          updated = true;
          return {
            ...item,
            task_id: taskId,
            status: "pending" as const,
            resubmit_count: item.resubmit_count + 1,
            updated_at: new Date().toISOString(),
          };
        }
        return item;
      });

      if (!updated) {
        next = prev.map((item) => {
          if (item.task_id === taskId) {
            updated = true;
            return {
              ...item,
              status: "pending" as const,
              resubmit_count: item.resubmit_count + 1,
              updated_at: new Date().toISOString(),
            };
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

  return (
    <div className="w-full max-w-4xl mx-auto py-8 relative z-10">
      <AnimatePresence>
        {toastData && (
          <XPToast
            key="points-toast"
            points={toastData.points}
            onComplete={() => setToastData(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rejectToastMessage && (
          <RejectToast
            key="reject-toast"
            message={rejectToastMessage}
            onComplete={() => setRejectToastMessage(null)}
          />
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
          {/* Desktop wheel */}
          <div
            ref={wheelContainerRef}
            className="relative w-full max-w-[580px] aspect-square mx-auto hidden md:block"
          >
            <div
              className="absolute top-0 left-0"
              style={{
                width: `${DESKTOP_SIZE}px`,
                height: `${DESKTOP_SIZE}px`,
                transform: `scale(${wheelScale})`,
                transformOrigin: "top left",
              }}
            >
        <div
          className="absolute inset-0 rounded-full pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle at center, color-mix(in srgb, var(--text-dark) 80%, transparent), transparent 70%)",
          }}
        />
        <svg
          width={DESKTOP_SIZE}
          height={DESKTOP_SIZE}
          className={`absolute left-0 top-0 z-0 text-[var(--text-muted)] ${isAnimatingFinale ? "finale-orbit" : ""}`}
          style={{ pointerEvents: "none" }}
        >
          {outerChallenges.map((challenge, index) => {
            const { x, y } = getOuterNodePosition(index);
            return (
              <line
                key={`line-${challenge.id}`}
                x1={DESKTOP_CENTER}
                y1={DESKTOP_CENTER}
                x2={x}
                y2={y}
                stroke={getStoneColor(challenge.id)}
                strokeOpacity={0.2}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            );
          })}
        </svg>

        {centerChallenge && (
          (() => {
            const centerCompleted = getRingStatus(centerChallenge) === "success";
            return (
          <motion.button
            type="button"
            whileHover={
              isSubmissionLocked(centerChallenge) ? { scale: 1 } : { scale: 1.06 }
            }
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
            <div
              className="absolute inset-[-8px] rounded-full pointer-events-none"
              style={{ border: "1px solid color-mix(in srgb, var(--primary-hover) 20%, transparent)" }}
            />
            <div
              className="absolute inset-[-14px] rounded-full pointer-events-none"
              style={{ border: "1px solid color-mix(in srgb, var(--primary-hover) 10%, transparent)" }}
            />
            <div className="absolute inset-[-4px] rounded-full pointer-events-none" style={getStatusRingStyle(centerChallenge)} />
            <div style={getNodeBodyStyle(centerChallenge.id, true)}>
              <motion.div
                style={getGemStyle(centerChallenge.id, true, centerCompleted)}
                variants={{
                  rest: { boxShadow: getGemShadow(centerChallenge.id, true, centerCompleted, false) },
                  hover: { boxShadow: getGemShadow(centerChallenge.id, true, centerCompleted, true) },
                }}
                initial="rest"
                whileHover={isSubmissionLocked(centerChallenge) ? "rest" : "hover"}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "30%",
                    height: "20%",
                    top: "18%",
                    left: "22%",
                    background: "rgba(255,255,255,0.35)",
                  }}
                />
              </motion.div>
            </div>
            <div
              className="absolute pointer-events-none flex flex-col items-center gap-[2px] whitespace-nowrap text-center"
              style={{ top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}
            >
              <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                {SHORT_NAMES[centerChallenge.id] ?? centerChallenge.title}
              </span>
              <span
                className="text-[8px] italic"
                style={{ color: "color-mix(in srgb, var(--primary-hover) 70%, transparent)" }}
              >
                {STONE_META[centerChallenge.id]?.label ?? "Reality Stone"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: "var(--hero-from)", color: "var(--bg-base)" }}
              >
                {DISPLAY_POINTS[centerChallenge.id] ?? centerChallenge.points}pt
              </span>
            </div>
          </motion.button>
            );
          })()
        )}

        {isAnimatingFinale && (
          <svg width={DESKTOP_SIZE} height={DESKTOP_SIZE} className="absolute inset-0 pointer-events-none z-[1]">
            {outerChallenges.map((challenge, index) => {
              const { x, y } = getOuterNodePosition(index);
              return (
                <line
                  key={`beam-${challenge.id}`}
                  x1={x}
                  y1={y}
                  x2={DESKTOP_CENTER}
                  y2={DESKTOP_CENTER}
                  stroke={getStoneColor(challenge.id)}
                  strokeWidth="2"
                  className="finale-beam"
                />
              );
            })}
            <circle
              cx={DESKTOP_CENTER}
              cy={DESKTOP_CENTER}
              stroke="var(--yellow)"
              fill="none"
              className="finale-shield-ring"
            />
          </svg>
        )}

        <div className={`absolute inset-0 pointer-events-none z-[2] ${isAnimatingFinale ? "finale-orbit" : ""}`}>
          {outerChallenges.map((challenge, index) => {
            const { x, y } = getOuterNodePosition(index);
            const locked = isSubmissionLocked(challenge);
            const challengeCompleted = getRingStatus(challenge) === "success";
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
                    transition: "transform 200ms ease, box-shadow 200ms ease",
                  }}
                >
                  <div className="absolute inset-[-4px] rounded-full pointer-events-none" style={getStatusRingStyle(challenge)} />
                  <div style={getNodeBodyStyle(challenge.id, false)}>
                    <motion.div
                      style={getGemStyle(challenge.id, false, challengeCompleted)}
                      variants={{
                        rest: { boxShadow: getGemShadow(challenge.id, false, challengeCompleted, false) },
                        hover: { boxShadow: getGemShadow(challenge.id, false, challengeCompleted, true) },
                      }}
                      initial="rest"
                      whileHover={locked ? "rest" : "hover"}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "30%",
                          height: "20%",
                          top: "18%",
                          left: "22%",
                          background: "rgba(255,255,255,0.35)",
                        }}
                      />
                    </motion.div>
                  </div>
                  <div
                    className="absolute pointer-events-none flex flex-col items-center gap-[2px] whitespace-nowrap text-center"
                    style={{ top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}
                  >
                    <span
                      className="text-[8px] italic"
                      style={{ color: `color-mix(in srgb, ${getStoneColor(challenge.id)} 70%, transparent)` }}
                    >
                      {STONE_META[challenge.id]?.label}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {SHORT_NAMES[challenge.id] ?? challenge.title}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: "var(--hero-from)", color: "var(--bg-base)" }}
                    >
                      {DISPLAY_POINTS[challenge.id] ?? challenge.points}pt
                    </span>
                  </div>
                </motion.button>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Mobile fallback */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {activeChallenges.map((challenge) => {
          const locked = isSubmissionLocked(challenge);
          const isCenter = Boolean(challenge.isReferral);
          const challengeCompleted = getRingStatus(challenge) === "success";
          return (
            <motion.button
              key={`mobile-${challenge.id}`}
              type="button"
              whileHover={{ scale: locked ? 1 : 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openChallenge(challenge)}
              className={`relative flex min-h-[130px] flex-col items-center justify-center gap-2.5 px-4 py-4 text-center ${isCenter ? "col-span-2" : ""}`}
              style={{
                borderRadius: "16px",
                background: "var(--text-dark)",
                border: `1px solid color-mix(in srgb, ${getStoneColor(challenge.id)} 30%, transparent)`,
                cursor: locked ? "not-allowed" : "pointer",
              }}
            >
              <div className="absolute inset-[-4px] rounded-2xl pointer-events-none" style={getStatusRingStyle(challenge)} />
              <div
                style={{
                  ...getGemStyle(challenge.id, false, challengeCompleted),
                  width: isCenter ? "56px" : "48px",
                  height: isCenter ? "56px" : "48px",
                  boxShadow: getGemShadow(challenge.id, false, challengeCompleted),
                }}
              >
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "30%",
                    height: "20%",
                    top: "18%",
                    left: "22%",
                    background: "rgba(255,255,255,0.35)",
                  }}
                />
              </div>
              <span
                className="text-[9px] italic"
                style={{ color: `color-mix(in srgb, ${getStoneColor(challenge.id)} 70%, transparent)` }}
              >
                {STONE_META[challenge.id]?.label}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {SHORT_NAMES[challenge.id] ?? challenge.title}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: "var(--hero-from)", color: "var(--bg-base)" }}
              >
                {DISPLAY_POINTS[challenge.id] ?? challenge.points}pt
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 text-center text-[#991b1b]/60 text-xs font-bold uppercase tracking-[0.2em] relative z-20">
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
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
