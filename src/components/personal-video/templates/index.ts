import type { ComponentType } from "react";
import type { FrameId } from "@/lib/personal-video/types";
import type { ScreenTemplateProps } from "./Screen03";
import { Screen03 } from "./Screen03";

const TEMPLATE_MAP: Partial<Record<FrameId, ComponentType<ScreenTemplateProps>>> = {
  3: Screen03,
};

export function getTemplateComponent(
  frameId: FrameId
): ComponentType<ScreenTemplateProps> | null {
  return TEMPLATE_MAP[frameId] ?? null;
}

export type { ScreenTemplateProps };
