"use client";
import { memo, useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { StudentChallengeStatus } from "@/types/database";
import {
  CAUGHT_GREAT_TASK_ID,
  getChallengeDateLockMessage,
  isChallengeUnlockedByDate,
  isDateScheduleLockMessage,
  TIME_CAPSULE_TASK_ID,
} from "@/lib/challenge-unlock";
import { CHALLENGE_ID_MAP } from "@/lib/challenges";
import { isDailyPostAcceptedToday } from "@/lib/daily-post";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
const MissionModal = dynamic(() => import("./MissionModal"), {
  ssr: false,
  loading: () => <div className="sr-only">Loading mission modal…</div>,
});
const XPToast = dynamic(() => import("./XPToast"), { ssr: false });
const RejectToast = dynamic(() => import("./RejectToast"), { ssr: false });
const TribeCrest = dynamic(() => import("./TribeCrest"));

const ACTIVE_CHALLENGE_IDS = [1, 2, 3, 4, 5, 6];

type ChallengeBoardProps = {
  challenges: Challenge[];
  challengeStatuses: StudentChallengeStatus[];
  setChallengeStatuses: Dispatch<SetStateAction<StudentChallengeStatus[]>>;
  session: StudentSession;
  /** Instagram username (normalized, no @) for daily post (task 6) verification. */
  instagramHandle: string | null;
  onInstagramHandleSaved: (handle: string) => void;
  onChallengeStatusesUpdate?: (statuses: StudentChallengeStatus[]) => void;
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
  6: "Insta Post Streak",
};

const DISPLAY_POINTS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 2,
  5: 2,
  6: 2,
};

/** Daily Insta post — lock only after today's acceptance (see `upload-daily`). */
const DAILY_POST_TASK_ID = 6;
const REFERRAL_CHALLENGE_ID = 3;
const COMPLETED_STATUSES = new Set(["accepted", "approved"]);

const STONE_META: Record<number, { label: string; color: string }> = {
  1: { label: "Space Stone", color: "#4A9EFF" },
  2: { label: "Mind Stone", color: "#FFD740" },
  3: { label: "Reality Stone", color: "#FF1744" },
  4: { label: "Power Stone", color: "#CE93D8" },
  5: { label: "Soul Stone", color: "#FF6D00" },
  6: { label: "Time Stone", color: "#00E676" },
};

const FacetHighlight = memo(function FacetHighlight() {
  return (
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
  );
});

type NodeLabelProps = {
  id: number;
  isCenter: boolean;
  shortName: string;
  stoneLabel: string;
  stoneColor: string;
  displayPoints: number;
};

const NodeLabel = memo(function NodeLabel({
  id,
  isCenter,
  shortName,
  stoneLabel,
  stoneColor,
  displayPoints,
  coolMessage,
}: NodeLabelProps & { coolMessage?: string | null }) {
  const pointsBadgeBase: CSSProperties = {
    borderRadius: "9999px",
    fontWeight: 700,
  };

  const getPointsBadgeStyle = (): CSSProperties => {
    if (id === DAILY_POST_TASK_ID) return pointsBadgeBase;
    if (isCenter && id === REFERRAL_CHALLENGE_ID) {
      return {
        ...pointsBadgeBase,
        background: "rgba(255, 23, 68, 0.2)",
        border: "1px solid #FF1744",
        color: "#FF1744",
      };
    }
    return {
      ...pointsBadgeBase,
      background: `color-mix(in srgb, ${stoneColor} 18%, transparent)`,
      border: `1px solid ${stoneColor}`,
      color: stoneColor,
    };
  };

  return (
    <div
      className="absolute pointer-events-none flex flex-col items-center gap-1 text-center"
      style={{
        top: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: isCenter ? "140px" : "118px",
      }}
    >
      <AnimatePresence>
        {coolMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.8 }}
            className="absolute bottom-full mb-4 px-3 py-1.5 rounded-lg bg-black/90 text-[10px] font-bold text-white whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none"
          >
            {coolMessage}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/90" />
          </motion.div>
        )}
      </AnimatePresence>
      {isCenter ? (
        <>
          <span
            className="leading-none"
            style={{
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "16px",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {shortName}
          </span>
          <span
            className="leading-none"
            style={{
              color: "#FF1744",
              fontWeight: 600,
              fontSize: "11px",
              textShadow: "0 0 8px #FF1744",
            }}
          >
            {stoneLabel}
          </span>
        </>
      ) : (
        <>
          <span
            className="leading-none"
            style={{
              color: stoneColor,
              fontWeight: 600,
              fontSize: "11px",
              textShadow: `0 0 8px ${stoneColor}`,
            }}
          >
            {stoneLabel}
          </span>
          <span
            className="leading-none"
            style={{
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "13px",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {shortName}
          </span>
        </>
      )}
      {id === DAILY_POST_TASK_ID ? (
        <span className="daily-points-badge rounded-full px-2.5 py-0.5">
          <span
            className="block max-w-[7.5rem] text-center leading-tight"
            style={{ fontSize: "8px", letterSpacing: "0.02em" }}
          >
            +{displayPoints} Points Daily
          </span>
        </span>
      ) : (
        <span className="rounded-full px-2.5 py-0.5" style={getPointsBadgeStyle()}>
          <span style={{ fontSize: "10px" }}>{displayPoints}pt</span>
        </span>
      )}
    </div>
  );
});

export default function ChallengeBoard({
  challenges,
  challengeStatuses,
  setChallengeStatuses,
  session,
  instagramHandle,
  onInstagramHandleSaved,
  onChallengeStatusesUpdate,
}: ChallengeBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);
  const [crestRevealed, setCrestRevealed] = useState(false);
  const [isAnimatingFinale, setIsAnimatingFinale] = useState(false);
  const [wheelScale, setWheelScale] = useState(1);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);

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

  const statusByTask = useMemo(() => {
    const map = new Map<number, StudentChallengeStatus>();
    for (const row of challengeStatuses) {
      map.set(row.task_id, row);
    }
    return map;
  }, [challengeStatuses]);

  const isChallengeComplete = (challengeId: number) => {
    const status = statusByTask.get(challengeId);
    return status?.is_completed ?? false;
  };

  const allComplete = useMemo(
    () =>
      ACTIVE_CHALLENGE_IDS.every((id) => isChallengeComplete(id)),
    [statusByTask]
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

  useSubmissionPolling(challengeStatuses, setChallengeStatuses, {
    onAccepted: ({ taskId, points }) => setToastData({ id: taskId, points }),
    onRejected: (message) => setRejectToastMessage(message),
    onUpdate: (next) => onChallengeStatusesUpdate?.(next),
  });

  const activeChallenge = useMemo(
    () => challenges.find((c) => c.id === activeTaskId) ?? null,
    [activeTaskId, challenges]
  );

  const bootcampDate = session.bootcampDate;

  const isDateLocked = (challengeId: number) =>
    (challengeId === CAUGHT_GREAT_TASK_ID || challengeId === TIME_CAPSULE_TASK_ID) &&
    !isChallengeUnlockedByDate(challengeId, bootcampDate);

  const getSubmissionLockMessage = (challenge: Challenge): string | null => {
    const status = statusByTask.get(challenge.id);
    const id = challenge.id;

    if (id === REFERRAL_CHALLENGE_ID) {
      return null;
    }

    if (isDateLocked(id)) {
      return getChallengeDateLockMessage(id, bootcampDate);
    }

    if (id === DAILY_POST_TASK_ID && isDailyPostAcceptedToday(status)) {
      return "Come back tomorrow.";
    }

    if (status?.is_completed) {
      return "Already completed.";
    }

    return null;
  };

  const isSubmissionLocked = (challenge: Challenge) =>
    getSubmissionLockMessage(challenge) !== null;

  /** Date-locked challenges can still be opened to read the unlock date. */
  const isBoardClickDisabled = (challenge: Challenge) => {
    const message = getSubmissionLockMessage(challenge);
    if (!message) return false;
    return !isDateScheduleLockMessage(message);
  };

  const getRingStatus = (challenge: Challenge): RingStatus => {
    const status = statusByTask.get(challenge.id);
    if (!status || status.latest_status === "not_started") return "default";
    if (status.is_completed) return "success";
    if (status.latest_status === "pending") return "review";
    if (status.latest_status === "rejected") return "danger";
    return "default";
  };

  const getStoneColor = (id: number) =>
    STONE_META[id]?.color ?? "rgba(255,255,255,0.45)";

  const getStatusRingStyle = (challenge: Challenge): CSSProperties => {
    const ring = getRingStatus(challenge);
    const color = getStoneColor(challenge.id);
    const isReality = challenge.id === REFERRAL_CHALLENGE_ID;
    const glowSpread = isReality ? "0 0 18px" : "0 0 12px";
    if (ring === "success") {
      return {
        border: `3px solid ${color}`,
        boxShadow: `${glowSpread} ${color}, 0 0 4px color-mix(in srgb, ${color} 40%, transparent)`,
      };
    }
    if (ring === "review") {
      return {
        border: `3px solid ${color}`,
        animation: "stonePulse 2s ease-in-out infinite",
        boxShadow: `${glowSpread} color-mix(in srgb, ${color} 75%, transparent)`,
      };
    }
    if (ring === "danger") {
      return {
        border: `3px solid ${color}`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 55%, transparent)`,
      };
    }
    return {
      border: `3px solid ${color}`,
      boxShadow: `${glowSpread} color-mix(in srgb, ${color} 50%, transparent)`,
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
    background: "#0a0a14",
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
    if (isBoardClickDisabled(challenge)) return;
    setActiveTaskId(challenge.id);
  };

  const isCrestStoneClickable = (challenge: Challenge) => {
    if (challenge.isReferral) return true;
    if (challenge.id === DAILY_POST_TASK_ID) return !isSubmissionLocked(challenge);
    return false;
  };

  const handleSubmitted = ({ taskId }: { taskId: number; submissionId?: string }) => {
    setChallengeStatuses((prev) => {
      const next = [...prev];
      const index = next.findIndex((s) => s.task_id === taskId);
      if (index !== -1) {
        next[index] = {
          ...next[index],
          latest_status: "pending",
          attempts_used: next[index].attempts_used + 1,
        };
      } else {
        next.push({
          student_id: session.studentId,
          task_id: taskId,
          bootcamp_id: session.bootcampId,
          attempts_used: 1,
          is_completed: false,
          points_earned: 0,
          latest_status: "pending",
          completed_at: null,
        });
      }
      onChallengeStatusesUpdate?.(next);
      return next;
    });
    setActiveTaskId(null);
  };

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
          challengeStatuses={challengeStatuses}
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
                background: "#0D0D2B",
              }}
            >
              {/* Background radial — deep space + indigo center energy */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none z-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, #2D1B69 0%, rgba(45, 27, 105, 0.55) 22%, rgba(13, 13, 43, 0.4) 48%, transparent 72%)",
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
                  const lineColor = getStoneColor(challenge.id);
                  return (
                    <line
                      key={`line-${challenge.id}`}
                      x1={DESKTOP_CENTER} y1={DESKTOP_CENTER}
                      x2={x} y2={y}
                      stroke={lineColor}
                      strokeOpacity={0.6}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      style={{
                        filter: `drop-shadow(0 0 4px ${lineColor}) drop-shadow(0 0 8px color-mix(in srgb, ${lineColor} 45%, transparent))`,
                      }}
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
                      style={{ border: "1px solid rgba(255, 23, 68, 0.35)" }} />
                    <div className="absolute inset-[-14px] rounded-full pointer-events-none"
                      style={{ border: "1px solid rgba(255, 23, 68, 0.2)" }} />
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
                        onMouseEnter={() => setHoveredTaskId(centerChallenge.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        transition={{ duration: 0.2 }}
                      >
                        <FacetHighlight />
                      </motion.div>
                    </div>
                    <NodeLabel
                      id={centerChallenge.id}
                      isCenter={true}
                      shortName={SHORT_NAMES[centerChallenge.id] ?? `Challenge ${CHALLENGE_ID_MAP[centerChallenge.id] ?? centerChallenge.id}`}
                      stoneLabel={STONE_META[centerChallenge.id]?.label ?? "Stone"}
                      stoneColor={getStoneColor(centerChallenge.id)}
                      displayPoints={DISPLAY_POINTS[centerChallenge.id] ?? 0}
                      coolMessage={hoveredTaskId === centerChallenge.id ? "Your referral link is live! 🚀" : null}
                    />
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
                  const locked = isBoardClickDisabled(challenge);
                  const dateLocked = isDateLocked(challenge.id);
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
                        onMouseEnter={() => setHoveredTaskId(challenge.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
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
                        <NodeLabel
                          id={challenge.id}
                          isCenter={false}
                          shortName={SHORT_NAMES[challenge.id] ?? `Challenge ${CHALLENGE_ID_MAP[challenge.id] ?? challenge.id}`}
                          stoneLabel={STONE_META[challenge.id]?.label ?? "Stone"}
                          stoneColor={getStoneColor(challenge.id)}
                          displayPoints={DISPLAY_POINTS[challenge.id] ?? 0}
                          coolMessage={
                            hoveredTaskId === challenge.id && (locked || dateLocked)
                              ? getSubmissionLockMessage(challenge)
                              : null
                          }
                        />
                      </motion.button>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          <div
            className="mt-8 text-center text-xs font-bold uppercase tracking-[0.2em] relative z-20"
            style={{ color: "rgba(255,255,255,0.72)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
          >
            Reveal the Story: Complete challenges to awaken each Infinity Stone
          </div>
        </>
      )}

      <MissionModal
        isOpen={Boolean(activeTaskId)}
        challenge={activeChallenge}
        session={session}
        challengeStatuses={challengeStatuses}
        instagramHandle={instagramHandle}
        onInstagramHandleSaved={onInstagramHandleSaved}
        onClose={() => setActiveTaskId(null)}
        onSubmitSuccess={handleSubmitted}
        isSubmissionLocked={activeChallenge ? isSubmissionLocked(activeChallenge) : false}
        submissionLockMessage={
          activeChallenge ? getSubmissionLockMessage(activeChallenge) : null
        }
        stoneColor={activeChallenge ? getStoneColor(activeChallenge.id) : undefined}
      />

      <style jsx global>{`
        @keyframes stonePulse {
          0%, 100% { opacity: 0.75; transform: scale(1); filter: brightness(1); }
          50%       { opacity: 1;   transform: scale(1.04); filter: brightness(1.15); }
        }
        @keyframes dailyPointsPulse {
          0%, 100% {
            box-shadow:
              0 0 6px rgba(0, 230, 118, 0.45),
              0 0 10px rgba(0, 191, 165, 0.25);
          }
          50% {
            box-shadow:
              0 0 14px rgba(0, 230, 118, 0.75),
              0 0 22px rgba(0, 191, 165, 0.45);
          }
        }
        .daily-points-badge {
          background: linear-gradient(135deg, #00e676, #00bfa5);
          color: #001a0e;
          font-weight: 700;
          animation: dailyPointsPulse 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}