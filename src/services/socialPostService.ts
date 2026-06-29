import type { CRMState, SocialPost, SocialPostStatus, SocialPostType } from "../types";
import { makeId, nowIso } from "./helpers";

export function createSocialPost(
  state: CRMState,
  input: {
    type: SocialPostType;
    caption: string;
    mediaUrl: string;
    status: SocialPostStatus;
    scheduledAt: string;
    assignedTo: string;
    notes: string;
  }
): SocialPost {
  return {
    id: makeId("post"),
    organizationId: state.organization.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input,
  };
}

export function draftCaption(seedText: string) {
  return `Discover your next address with EstateFlow CRM. ${seedText} #RealEstate #DreamHome`;
}
