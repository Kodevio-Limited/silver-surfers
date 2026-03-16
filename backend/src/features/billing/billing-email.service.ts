import { sendDirectMail } from '../audits/report-delivery.ts';

type DirectMailResult = Awaited<ReturnType<typeof sendDirectMail>>;

interface BillingEmailContent {
  html: string;
  text: string;
}

function resolveFrontendUrl(frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3000'): string {
  return frontendUrl.replace(/\/+$/, '');
}

function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function wrapBillingEmail(options: {
  bannerTitle: string;
  heading: string;
  intro: string;
  bodyLines?: string[];
  bullets?: string[];
  actionLabel?: string;
  actionUrl?: string;
  footer: string;
  accentColor: string;
  subject: string;
}): BillingEmailContent {
  const bulletList = options.bullets && options.bullets.length > 0
    ? `<ul style="margin:0 0 20px 0;padding-left:20px;color:#374151;">${options.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';

  const action = options.actionLabel && options.actionUrl
    ? `
      <p style="margin:20px 0;">
        <a href="${options.actionUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">${options.actionLabel}</a>
      </p>
      <p style="margin:16px 0;color:#6b7280;font-size:14px;">${options.actionUrl}</p>
    `
    : '';

  const bodyParagraphs = (options.bodyLines || [])
    .map((line) => `<p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">${line}</p>`)
    .join('');

  const html = `
    <div style="font-family: Arial,sans-serif;background:#f7f7fb;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #eef2f7;background:${options.accentColor};color:#fff;">
          <h1 style="margin:0;font-size:20px;">${options.bannerTitle}</h1>
        </div>
        <div style="padding:24px;color:#111827;">
          <h2 style="margin:0 0 8px 0;font-size:18px;">${options.heading}</h2>
          <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">${options.intro}</p>
          ${bodyParagraphs}
          ${bulletList}
          ${action}
          <p style="margin:0;font-size:12px;color:#9ca3af;">${options.footer}</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;">SilverSurfers • Accessibility for Everyone</div>
      </div>
    </div>`;

  const text = [
    options.subject,
    '',
    options.heading,
    options.intro,
    '',
    ...(options.bodyLines || []),
    '',
    ...((options.bullets || []).map((item) => `- ${item}`)),
    ...(options.actionLabel && options.actionUrl ? ['', `${options.actionLabel}: ${options.actionUrl}`] : []),
    '',
    options.footer,
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n');

  return { html, text };
}

function planFeatureBullets(planName: string): string[] {
  const normalized = planName.trim().toLowerCase();

  if (normalized === 'starter') {
    return [
      '60 accessibility scans per year',
      'Single-user account',
      'Detailed PDF reports',
      'Priority email support',
    ];
  }

  if (normalized === 'pro') {
    return [
      '144 accessibility scans per year',
      'Team access for up to 3 users',
      'Historical tracking and white-label reports',
      'SilverSurfers Seal eligibility',
    ];
  }

  if (normalized === 'custom') {
    return [
      'Unlimited scans and team users',
      'Advanced analytics and API access',
      'Custom integrations and dedicated support',
    ];
  }

  return [
    'Accessibility scans and reports',
    'Actionable remediation guidance',
    'Secure account-based delivery',
  ];
}

export function buildTeamInvitationEmailContent(
  ownerEmail: string,
  ownerName: string,
  planName: string,
  invitationToken: string,
  frontendUrl?: string,
): BillingEmailContent {
  const invitationLink = `${resolveFrontendUrl(frontendUrl)}/team/accept?token=${encodeURIComponent(invitationToken)}`;

  return wrapBillingEmail({
    subject: `${ownerName || ownerEmail} invited you to join their SilverSurfers team`,
    bannerTitle: "You're Invited to Join SilverSurfers",
    heading: 'Team Invitation',
    intro: `${ownerName || ownerEmail} has invited you to join their SilverSurfers team on the ${planName} plan.`,
    bodyLines: [
      'As a team member, you will share access to scans, reports, and subscription-backed features.',
    ],
    bullets: [
      'Website accessibility audits',
      'Detailed report downloads',
      'Shared team usage limits',
      'Priority support',
    ],
    actionLabel: 'Accept Invitation',
    actionUrl: invitationLink,
    footer: 'If you do not have an account yet, you can create one after opening the invitation link.',
    accentColor: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
  });
}

export function buildSubscriptionCancellationEmailContent(
  planName: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd?: Date | string | null,
): BillingEmailContent {
  const formattedDate = formatDate(currentPeriodEnd);
  const bodyLines = cancelAtPeriodEnd
    ? [
        `Your subscription will remain active until ${formattedDate || 'the end of the current billing period'}.`,
        'After that date, premium access will end unless you reactivate the subscription.',
      ]
    : [
        'Your subscription has been cancelled immediately and premium access has ended.',
      ];

  return wrapBillingEmail({
    subject: 'Subscription Cancelled - SilverSurfers',
    bannerTitle: 'Subscription Cancelled',
    heading: `Your ${planName} subscription has been cancelled`,
    intro: cancelAtPeriodEnd
      ? 'Your cancellation request is confirmed.'
      : 'Your subscription cancellation has been processed.',
    bodyLines,
    footer: 'You can return at any time by purchasing a new subscription from your dashboard.',
    accentColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  });
}

export function buildSubscriptionReinstatementEmailContent(planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'Subscription Reactivated - SilverSurfers',
    bannerTitle: 'Subscription Reactivated',
    heading: 'Welcome back to SilverSurfers',
    intro: `Your ${planName} subscription has been successfully reactivated.`,
    bodyLines: [
      'Your premium access is live again and all included features are available in your account.',
    ],
    footer: 'Thank you for continuing with SilverSurfers.',
    accentColor: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  });
}

export function buildSubscriptionWelcomeEmailContent(
  planName: string,
  billingCycle: string = 'yearly',
  currentPeriodEnd?: Date | string | null,
): BillingEmailContent {
  const formattedDate = formatDate(currentPeriodEnd);
  const cycleLabel = billingCycle === 'monthly' ? 'monthly' : 'yearly';

  return wrapBillingEmail({
    subject: 'Welcome to SilverSurfers',
    bannerTitle: 'Subscription Activated',
    heading: `Welcome to the ${planName} plan`,
    intro: `Your ${cycleLabel} SilverSurfers subscription is now active.`,
    bodyLines: [
      ...(formattedDate ? [`Your current billing period runs through ${formattedDate}.`] : []),
      'You can start running audits and reviewing reports from your dashboard right away.',
    ],
    bullets: planFeatureBullets(planName),
    footer: 'We are glad to have you on board.',
    accentColor: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
  });
}

export function buildOneTimePurchaseEmailContent(planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'Purchase Confirmation - SilverSurfers',
    bannerTitle: 'Purchase Confirmed',
    heading: 'Your one-time purchase is ready',
    intro: `Your ${planName} purchase has been confirmed.`,
    bodyLines: [
      'A one-time scan credit has been added to your account and is ready to use.',
    ],
    footer: 'You can launch your scan from the dashboard whenever you are ready.',
    accentColor: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
  });
}

export function buildTeamMemberRemovedEmailContent(ownerEmail: string, ownerName: string, planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'Team Access Removed - SilverSurfers',
    bannerTitle: 'Team Access Removed',
    heading: 'Team Membership Ended',
    intro: `Your access to the SilverSurfers team managed by ${ownerName || ownerEmail} has been removed.`,
    bodyLines: [
      `This change was made on the ${planName} plan.`,
      'You can still create your own subscription if you would like to continue using SilverSurfers.',
    ],
    footer: 'If you believe this was a mistake, please contact the team owner.',
    accentColor: '#111827',
  });
}

export function buildTeamMemberLeftNotificationContent(memberEmail: string, memberName: string, planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'Team Member Left - SilverSurfers',
    bannerTitle: 'Team Member Left',
    heading: `${memberName || memberEmail} left your team`,
    intro: `${memberName || memberEmail} is no longer part of your SilverSurfers team.`,
    bodyLines: [
      `They no longer have access under your ${planName} subscription.`,
    ],
    footer: 'You can invite another team member at any time from the subscription dashboard.',
    accentColor: '#111827',
  });
}

export function buildTeamMemberLeftConfirmationContent(ownerEmail: string, ownerName: string, planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'You Left the Team - SilverSurfers',
    bannerTitle: 'You Left the Team',
    heading: 'Team Membership Ended',
    intro: `You have successfully left the SilverSurfers team managed by ${ownerName || ownerEmail}.`,
    bodyLines: [
      `Your access under the ${planName} plan has ended.`,
    ],
    footer: 'Thank you for using SilverSurfers.',
    accentColor: '#111827',
  });
}

export function buildNewTeamMemberNotificationContent(memberEmail: string, memberName: string, planName: string): BillingEmailContent {
  return wrapBillingEmail({
    subject: 'New Team Member Joined Your SilverSurfers Team',
    bannerTitle: 'New Team Member Joined',
    heading: 'A new team member joined your workspace',
    intro: `${memberName || memberEmail} has joined your SilverSurfers team.`,
    bodyLines: [
      `They now share access under your ${planName} subscription.`,
    ],
    footer: 'You can manage your team from the subscription dashboard.',
    accentColor: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
  });
}

export async function sendTeamInvitationEmail(
  to: string,
  ownerEmail: string,
  ownerName: string,
  planName: string,
  invitationToken: string,
): Promise<DirectMailResult> {
  const content = buildTeamInvitationEmailContent(ownerEmail, ownerName, planName, invitationToken);
  return sendDirectMail({
    to,
    subject: `${ownerName || ownerEmail} invited you to join their SilverSurfers team`,
    html: content.html,
    text: content.text,
  });
}

export async function sendTeamMemberRemovedEmail(
  to: string,
  ownerEmail: string,
  ownerName: string,
  planName: string,
): Promise<DirectMailResult> {
  const content = buildTeamMemberRemovedEmailContent(ownerEmail, ownerName, planName);
  return sendDirectMail({
    to,
    subject: 'Team Access Removed - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendTeamMemberLeftNotification(
  ownerEmail: string,
  memberEmail: string,
  memberName: string,
  planName: string,
): Promise<DirectMailResult> {
  const content = buildTeamMemberLeftNotificationContent(memberEmail, memberName, planName);
  return sendDirectMail({
    to: ownerEmail,
    subject: 'Team Member Left - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendTeamMemberLeftConfirmation(
  memberEmail: string,
  ownerEmail: string,
  ownerName: string,
  planName: string,
): Promise<DirectMailResult> {
  const content = buildTeamMemberLeftConfirmationContent(ownerEmail, ownerName, planName);
  return sendDirectMail({
    to: memberEmail,
    subject: 'You Left the Team - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendNewTeamMemberNotification(
  ownerEmail: string,
  memberEmail: string,
  memberName: string,
  planName: string,
): Promise<DirectMailResult> {
  const content = buildNewTeamMemberNotificationContent(memberEmail, memberName, planName);
  return sendDirectMail({
    to: ownerEmail,
    subject: 'New Team Member Joined Your SilverSurfers Team',
    html: content.html,
    text: content.text,
  });
}

export async function sendSubscriptionCancellationEmail(
  to: string,
  planName: string,
  cancelAtPeriodEnd: boolean = true,
  currentPeriodEnd: Date | string | null = null,
): Promise<DirectMailResult> {
  const content = buildSubscriptionCancellationEmailContent(planName, cancelAtPeriodEnd, currentPeriodEnd);
  return sendDirectMail({
    to,
    subject: 'Subscription Cancelled - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendSubscriptionReinstatementEmail(to: string, planName: string): Promise<DirectMailResult> {
  const content = buildSubscriptionReinstatementEmailContent(planName);
  return sendDirectMail({
    to,
    subject: 'Subscription Reactivated - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendSubscriptionWelcomeEmail(
  to: string,
  planName: string,
  billingCycle: string = 'yearly',
  currentPeriodEnd: Date | string | null = null,
): Promise<DirectMailResult> {
  const content = buildSubscriptionWelcomeEmailContent(planName, billingCycle, currentPeriodEnd);
  return sendDirectMail({
    to,
    subject: 'Welcome to SilverSurfers',
    html: content.html,
    text: content.text,
  });
}

export async function sendOneTimePurchaseEmail(to: string, planName: string): Promise<DirectMailResult> {
  const content = buildOneTimePurchaseEmailContent(planName);
  return sendDirectMail({
    to,
    subject: 'Purchase Confirmation - SilverSurfers',
    html: content.html,
    text: content.text,
  });
}
