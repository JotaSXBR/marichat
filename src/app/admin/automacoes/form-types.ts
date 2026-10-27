import type { FollowMode } from "@/lib/follow-mode";

export type MediaOption = {
  id: string;
  label: string;
  thumbnailUrl?: string;
  permalink?: string;
};

export type AutomationInitialValues = {
  id?: string;
  name: string;
  keyword: string;
  mediaId: string;
  firstDmText: string;
  firstDmButtonLabel: string;
  secondDmText: string;
  linkButtonTitle: string;
  linkUrl: string;
  followMode: FollowMode;
  followGateText: string;
  followGateFollowLabel: string;
  followGateConfirmLabel: string;
  followOptionalText: string;
  followDirectText: string;
  isActive: boolean;
};

export type FieldErrors = Record<string, string | undefined>;
