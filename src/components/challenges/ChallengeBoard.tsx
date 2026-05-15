"use client";

import { memo, useMemo, useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Brain, Zap, Heart, Hourglass, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  instagramHandle: string | null;
  onInstagramHandleSaved: (handle: string) => void;
  onChallengeStatusesUpdate?: (statuses: StudentChallengeStatus[]) => void;
};

type RingStatus = "default" | "review" | "success" | "danger";

const DESKTOP_SIZE = 600;
const DESKTOP_CENTER = 300;
const DESKTOP_RADIUS = 210;
const OUTER_NODE_SIZE = 96;
const CENTER_NODE_SIZE = 160;
const OUTER_GEM_SIZE = 64;
const CENTER_GEM_SIZE = 130;

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

const DAILY_POST_TASK_ID = 6;
const REFERRAL_CHALLENGE_ID = 3;

const STONE_META: Record<number, { label: string; color: string; Icon: LucideIcon }> = {
  1: { label: "Space Stone", color: "#3B82F6", Icon: Globe },
  2: { label: "Mind Stone", color: "#EAB308", Icon: Brain },
  3: { label: "Reality Stone", color: "#F43F5E", Icon: Sparkles },
  4: { label: "Power Stone", color: "#A855F7", Icon: Zap },
  5: { label: "Soul Stone", color: "#F97316", Icon: Heart },
  6: { label: "Time Stone", color: "#10B981", Icon: Hourglass },
};

const NodeLabel = memo(function NodeLabel({
  id,
  isCenter,
  shortName,
  stoneLabel,
  stoneColor,
  displayPoints,
  coolMessage,
}: {
  id: number;
  isCenter: boolean;
  shortName: string;
  stoneLabel: string;
  stoneColor: string;
  displayPoints: number;
  coolMessage?: string | null;
}) {
  return (
    <div
      className="absolute pointer-events-none flex flex-col items-center gap-1.5 text-center"
      style={{
        top: "calc(100% + 12px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: isCenter ? "140px" : "120px",
        zIndex: 20,
      }}
    >
      <AnimatePresence>
        {coolMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.8 }}
            className="absolute bottom-full mb-2 px-3 py-1.5 rounded-lg bg-[#0F172A] text-[10px] font-bold text-white whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none max-w-[220px] text-center"
          >
            {coolMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <span
        className={`font-bold leading-none tracking-wider ${isCenter ? "uppercase tracking-widest" : ""}`}
        style={{
          color: stoneColor,
          fontSize: isCenter ? "11px" : "11px",
          textShadow: `0 0 8px ${stoneColor}80`,
        }}
      >
        {stoneLabel}
      </span>
      <span
        className="font-bold leading-tight text-white mt-0.5"
        style={{
          fontSize: isCenter ? "15px" : "13px",
          textShadow: isCenter
            ? "0 0 10px rgba(255,255,255,0.5)"
            : "0 1px 3px rgba(0,0,0,0.8)",
        }}
      >
        {shortName}
      </span>
      {id === DAILY_POST_TASK_ID ? (
        <span className="daily-points-badge mt-1.5 rounded-full px-2.5 py-0.5 font-bold border border-white/10">
          <span className="block text-[8px] leading-tight tracking-wide">
            +{displayPoints} Points Daily
          </span>
        </span>
      ) : (
        <span
          className="mt-1.5 rounded-full px-2.5 py-0.5 font-bold border border-white/10"
          style={{
            background: `${stoneColor}33`,
            color: stoneColor,
            backdropFilter: "blur(4px)",
            boxShadow: isCenter ? `0 0 10px ${stoneColor}40` : undefined,
          }}
        >
          <span style={{ fontSize: "11px" }}>{displayPoints}pt</span>
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
    () => ACTIVE_CHALLENGE_IDS.every((id) => isChallengeComplete(id)),
    [statusByTask]
  );
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

    if (id === REFERRAL_CHALLENGE_ID) return null;

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

  const getStoneColor = (id: number) => STONE_META[id]?.color ?? "#ffffff";
  const getStoneIcon = (id: number) => STONE_META[id]?.Icon ?? Sparkles;

  const getOuterNodePosition = (index: number) => {
    const angle = (index / 5) * 2 * Math.PI - Math.PI / 2;
    return {
      x: DESKTOP_CENTER + DESKTOP_RADIUS * Math.cos(angle),
      y: DESKTOP_CENTER + DESKTOP_RADIUS * Math.sin(angle),
    };
  };

  const getNodeBorderColor = (challenge: Challenge, color: string) => {
    const ring = getRingStatus(challenge);
    if (ring === "success") return color;
    if (ring === "review") return color;
    if (ring === "danger") return "#EF4444";
    if (isDateLocked(challenge.id)) return `${color}50`;
    return `${color}60`;
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
    <div className="w-full max-w-4xl mx-auto relative bg-[#030712] flex flex-col items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-white/5 my-8">
      {/* Ambient background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen" />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[80px] mix-blend-screen" />
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-4xl mx-auto py-8 relative z-10">
        <AnimatePresence>
          {toastData && (
            <XPToast key="xp" points={toastData.points} onComplete={() => setToastData(null)} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {rejectToastMessage && (
            <RejectToast
              key="reject"
              message={rejectToastMessage}
              onComplete={() => setRejectToastMessage(null)}
            />
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
                {/* Spoke lines + orbit ring */}
                <svg
                  width={DESKTOP_SIZE}
                  height={DESKTOP_SIZE}
                  className={`absolute left-0 top-0 z-0 ${isAnimatingFinale ? "finale-orbit" : ""}`}
                  style={{ pointerEvents: "none" }}
                >
                  <circle
                    cx={DESKTOP_CENTER}
                    cy={DESKTOP_CENTER}
                    r={DESKTOP_RADIUS}
                    stroke="white"
                    strokeOpacity={0.05}
                    strokeWidth={1}
                    fill="none"
                    strokeDasharray="4 8"
                  />
                  {outerChallenges.map((challenge, index) => {
                    const { x, y } = getOuterNodePosition(index);
                    const color = getStoneColor(challenge.id);
                    return (
                      <line
                        key={`line-${challenge.id}`}
                        x1={DESKTOP_CENTER}
                        y1={DESKTOP_CENTER}
                        x2={x}
                        y2={y}
                        stroke={color}
                        strokeOpacity={0.3}
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
                      />
                    );
                  })}
                </svg>

                {/* Center node — Connect Dots / Reality Stone */}
                {centerChallenge && (() => {
                  const locked = isBoardClickDisabled(centerChallenge);
                  const color = getStoneColor(centerChallenge.id);
                  const shortName =
                    SHORT_NAMES[centerChallenge.id] ??
                    `Challenge ${CHALLENGE_ID_MAP[centerChallenge.id] ?? centerChallenge.id}`;

                  return (
                    <motion.button
                      type="button"
                      whileHover={locked ? { scale: 1 } : { scale: 1.05 }}
                      whileTap={locked ? { scale: 1 } : { scale: 0.98 }}
                      onClick={() => openChallenge(centerChallenge)}
                      className={`absolute z-[2] flex items-center justify-center overflow-visible rounded-full ${isAnimatingFinale ? "finale-center-pulse finale-center-boom" : ""}`}
                      style={{
                        left: `${DESKTOP_CENTER - CENTER_NODE_SIZE / 2}px`,
                        top: `${DESKTOP_CENTER - CENTER_NODE_SIZE / 2}px`,
                        width: `${CENTER_NODE_SIZE}px`,
                        height: `${CENTER_NODE_SIZE}px`,
                        cursor: locked ? "not-allowed" : "pointer",
                        boxShadow: `0 0 40px ${color}40, inset 0 0 20px ${color}20`,
                        background: "radial-gradient(circle at center, #0F172A 0%, #020617 100%)",
                        border: `2px solid ${getNodeBorderColor(centerChallenge, color)}`,
                      }}
                      onMouseEnter={() => setHoveredTaskId(centerChallenge.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                    >
                      <div
                        className="absolute rounded-full flex items-center justify-center"
                        style={{
                          width: `${CENTER_GEM_SIZE}px`,
                          height: `${CENTER_GEM_SIZE}px`,
                          background: `radial-gradient(circle at 30% 30%, ${color}40, #000000 80%)`,
                          border: `1px solid ${color}60`,
                          boxShadow: `inset 0 0 20px ${color}80`,
                        }}
                      >
                        <Sparkles
                          size={48}
                          color="#FFFFFF"
                          className="relative z-10 drop-shadow-lg opacity-90"
                        />
                      </div>
                      <NodeLabel
                        id={centerChallenge.id}
                        isCenter
                        shortName={shortName}
                        stoneLabel={STONE_META[centerChallenge.id]?.label ?? "Stone"}
                        stoneColor={color}
                        displayPoints={DISPLAY_POINTS[centerChallenge.id] ?? 0}
                        coolMessage={
                          hoveredTaskId === centerChallenge.id
                            ? "Your referral link is live!"
                            : null
                        }
                      />
                    </motion.button>
                  );
                })()}

                {/* Finale beams */}
                {isAnimatingFinale && (
                  <svg
                    width={DESKTOP_SIZE}
                    height={DESKTOP_SIZE}
                    className="absolute inset-0 pointer-events-none z-[1]"
                  >
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

                {/* Outer nodes */}
                <div
                  className={`absolute inset-0 pointer-events-none z-[3] ${isAnimatingFinale ? "finale-orbit" : ""}`}
                >
                  {outerChallenges.map((challenge, index) => {
                    const { x, y } = getOuterNodePosition(index);
                    const locked = isBoardClickDisabled(challenge);
                    const dateLocked = isDateLocked(challenge.id);
                    const color = getStoneColor(challenge.id);
                    const Icon = getStoneIcon(challenge.id);
                    const isHovered = hoveredTaskId === challenge.id;
                    const shortName =
                      SHORT_NAMES[challenge.id] ??
                      `Challenge ${CHALLENGE_ID_MAP[challenge.id] ?? challenge.id}`;

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
                          whileHover={locked ? { scale: 1 } : { scale: 1.1 }}
                          whileTap={locked ? { scale: 1 } : { scale: 0.95 }}
                          onClick={() => openChallenge(challenge)}
                          onMouseEnter={() => setHoveredTaskId(challenge.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`relative flex w-full h-full items-center justify-center pointer-events-auto rounded-full ${isAnimatingFinale ? "finale-implode" : ""}`}
                          style={{
                            cursor: locked ? "not-allowed" : "pointer",
                            background: "#020617",
                            border: `2px solid ${getNodeBorderColor(challenge, color)}`,
                            boxShadow: isHovered
                              ? `0 0 30px ${color}80, inset 0 0 15px ${color}40`
                              : `0 0 15px ${color}30`,
                            opacity: dateLocked ? 0.65 : 1,
                            transition: "all 300ms ease",
                          }}
                        >
                          <div
                            className="rounded-full flex items-center justify-center relative overflow-hidden"
                            style={{
                              width: `${OUTER_GEM_SIZE}px`,
                              height: `${OUTER_GEM_SIZE}px`,
                              background: `radial-gradient(circle at 30% 30%, ${color}80, ${color}20 80%)`,
                              border: `1px solid ${color}90`,
                              boxShadow: `inset 0 0 10px ${color}`,
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent mix-blend-overlay" />
                            <Icon size={28} color="#FFFFFF" className="relative z-10 drop-shadow-md" />
                          </div>
                          <NodeLabel
                            id={challenge.id}
                            isCenter={false}
                            shortName={shortName}
                            stoneLabel={STONE_META[challenge.id]?.label ?? "Stone"}
                            stoneColor={color}
                            displayPoints={DISPLAY_POINTS[challenge.id] ?? 0}
                            coolMessage={
                              isHovered && (locked || dateLocked)
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

            <div className="relative z-20 mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-[#0D0D2B]/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-white/50">
                Reveal the Story
              </p>
              <p className="mt-2 text-sm sm:text-base font-semibold leading-snug text-white">
                Complete challenges to awaken each Infinity Stone
              </p>
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
      </div>

      <style jsx global>{`
        @keyframes stonePulse {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes dailyPointsPulse {
          0%, 100% {
            box-shadow: 0 0 6px rgba(0, 230, 118, 0.45), 0 0 10px rgba(0, 191, 165, 0.25);
          }
          50% {
            box-shadow: 0 0 14px rgba(0, 230, 118, 0.75), 0 0 22px rgba(0, 191, 165, 0.45);
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
