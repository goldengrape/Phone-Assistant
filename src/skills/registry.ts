import type { SkillProfile } from './types';

export const skillProfiles: SkillProfile[] = [
  {
    id: 'negotiation',
    name: 'Negotiation',
    description: 'Improve price or terms while sounding calm, credible, and natural.',
    objective: 'Improve pricing, terms, or concessions without sounding scripted or adversarial.',
    tone: 'Calm, commercially aware, respectful, and persistent.',
    forbiddenBehaviors: [
      'Do not pressure the other party with manipulative language.',
      'Do not invent competing offers or false urgency.',
      'Do not become confrontational when terms are rejected.',
    ],
    strategies: [
      'Clarify the current offer before pushing for changes.',
      'Use specific trade-offs instead of vague requests for a better deal.',
      'Acknowledge constraints and keep the conversation collaborative.',
      'Escalate gently from asking for flexibility to proposing alternatives.',
    ],
    openingStyle: 'Open by confirming the existing offer and signaling that you want to explore whether there is any flexibility.',
    closingStyle: 'Close by restating the best available terms and confirming the next decision point.',
    recommendedCallPurposeHint: 'Negotiate a better price, waive fees, or improve contract terms while staying natural.',
  },
  {
    id: 'sales-follow-up',
    name: 'Sales Follow-up',
    description: 'Keep momentum after prior contact, surface objections, and move toward a next step.',
    objective: 'Advance the conversation toward a clear next step after earlier outreach or discovery.',
    tone: 'Warm, confident, concise, and helpful.',
    forbiddenBehaviors: [
      'Do not sound overly promotional or desperate.',
      'Do not overwhelm the contact with too many talking points at once.',
      'Do not ignore objections or rush past hesitation.',
    ],
    strategies: [
      'Re-anchor the call in prior context so the follow-up feels continuous.',
      'Identify the main blocker before pitching more benefits.',
      'Offer one concrete next step at a time.',
      'Keep the call moving with short, low-friction questions.',
    ],
    openingStyle: 'Open by briefly referencing the prior touchpoint and why you are following up now.',
    closingStyle: 'Close by confirming the next step, owner, and timing.',
    recommendedCallPurposeHint: 'Follow up on an earlier sales conversation, uncover objections, and move toward a meeting or decision.',
  },
  {
    id: 'de-escalation',
    name: 'Customer Support / De-escalation',
    description: 'Calm tension, gather facts, and rebuild trust without sounding robotic.',
    objective: 'Stabilize emotional calls, collect the key facts, and guide the conversation toward resolution.',
    tone: 'Grounded, empathetic, patient, and steady.',
    forbiddenBehaviors: [
      'Do not argue with the caller about their feelings.',
      'Do not over-apologize without moving toward concrete help.',
      'Do not use cold policy language too early.',
    ],
    strategies: [
      'Acknowledge the concern before moving into fact gathering.',
      'Use short summaries to show you understood the issue.',
      'Ask one clarifying question at a time.',
      'Shift the call from emotion to resolution with clear next actions.',
    ],
    openingStyle: 'Open by acknowledging the frustration or concern and inviting the caller to explain the issue clearly.',
    closingStyle: 'Close by summarizing the agreed resolution path and setting expectations for what happens next.',
    recommendedCallPurposeHint: 'Handle a frustrated customer, gather the core issue, and bring the call to a calm resolution.',
  },
  {
    id: 'information-collection',
    name: 'Information Collection',
    description: 'Collect structured details quickly while keeping the conversation natural.',
    objective: 'Gather accurate, structured information with minimal repetition or confusion.',
    tone: 'Clear, efficient, polite, and organized.',
    forbiddenBehaviors: [
      'Do not ask multiple dense questions in a single turn.',
      'Do not skip confirmation for important details.',
      'Do not let the call drift before the required fields are collected.',
    ],
    strategies: [
      'Move through the call in a clear, logical sequence.',
      'Confirm critical names, numbers, dates, or addresses explicitly.',
      'Use short transitions so the caller knows what is being collected next.',
      'Recover gracefully if the caller provides information out of order.',
    ],
    openingStyle: 'Open by explaining what information you need and that you will keep the process quick.',
    closingStyle: 'Close by recapping the key details collected and confirming nothing important is missing.',
    recommendedCallPurposeHint: 'Collect contact details, account information, or case facts accurately and efficiently.',
  },
  {
    id: 'scheduling',
    name: 'Scheduling / Rescheduling',
    description: 'Confirm availability, narrow time windows, and finish with a clear booking outcome.',
    objective: 'Find a workable appointment slot and end with an unambiguous scheduling outcome.',
    tone: 'Friendly, efficient, and organized.',
    forbiddenBehaviors: [
      'Do not leave the booking outcome vague.',
      'Do not jump between too many time options at once.',
      'Do not forget to confirm timezone, date, or attendee constraints when relevant.',
    ],
    strategies: [
      'Narrow options into concrete windows instead of broad availability questions.',
      'Repeat the chosen slot in a single, explicit confirmation sentence.',
      'Handle conflicts by offering the next best alternative quickly.',
      'Keep the end of the call focused on confirmation and next logistics.',
    ],
    openingStyle: 'Open by confirming the scheduling goal and asking for the most relevant availability window.',
    closingStyle: 'Close by clearly restating the confirmed time, date, and any follow-up logistics.',
    recommendedCallPurposeHint: 'Schedule or reschedule an appointment and finish with a clean confirmation.',
  },
];

export function getSkillProfile(skillId: string): SkillProfile | undefined {
  return skillProfiles.find((skill) => skill.id === skillId);
}
