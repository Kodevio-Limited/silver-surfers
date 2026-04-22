import { sendDirectMail } from "../audits/report-delivery.ts";

export interface AuthEmailResult {
    success: boolean;
    error?: string;
    accepted?: string[];
    rejected?: string[];
    response?: string;
    messageId?: string;
}

interface AuthEmailContent {
    html: string;
    text: string;
}

function resolveFrontendUrl(frontendUrl: string = process.env.FRONTEND_URL || "http://localhost:3000"): string {
    return frontendUrl.replace(/\/+$/, "");
}

export function buildVerificationLink(token: string, frontendUrl?: string): string {
    return `${resolveFrontendUrl(frontendUrl)}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetLink(token: string, frontendUrl?: string): string {
    return `${resolveFrontendUrl(frontendUrl)}/reset-password?token=${encodeURIComponent(token)}`;
}

function wrapAuthEmail(options: {
    bannerTitle: string;
    heading: string;
    body: string;
    actionLabel: string;
    actionUrl: string;
    accentColor: string;
    footer: string;
    token: string;
}): AuthEmailContent {
    const html = `
    <div style="font-family: Arial,sans-serif;background:#f7f7fb;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #eef2f7;background-color:${options.accentColor};color:#fff;">
          <h1 style="margin:0;font-size:20px;">${options.bannerTitle}</h1>
        </div>
        <div style="padding:24px;color:#111827;">
          <h2 style="margin:0 0 8px 0;font-size:18px;">${options.heading}</h2>
          <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">${options.body}</p>
          <p style="margin:20px 0;">
            <a href="${options.actionUrl}" style="background-color:${options.accentColor};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">${options.actionLabel}</a>
          </p>
          <p style="margin:16px 0;color:#6b7280;font-size:14px;">Or use this token: <strong>${options.token}</strong></p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">${options.footer}</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;">SilverSurfers • Accessibility for Everyone</div>
      </div>
    </div>`;

    const text = [
        options.bannerTitle,
        "",
        options.heading,
        options.body,
        "",
        `${options.actionLabel}: ${options.actionUrl}`,
        `Token: ${options.token}`,
        "",
        options.footer,
    ].join("\n");

    return { html, text };
}

export function buildVerificationEmailContent(token: string, frontendUrl?: string): AuthEmailContent {
    return wrapAuthEmail({
        bannerTitle: "Welcome to SilverSurfers",
        heading: "Verify your email",
        body: "Thanks for signing up. Please verify your email address by clicking the button below.",
        actionLabel: "Verify Email",
        actionUrl: buildVerificationLink(token, frontendUrl),
        accentColor: "#2563eb",
        footer: "If you did not create an account, you can ignore this email.",
        token,
    });
}

export function buildPasswordResetEmailContent(token: string, frontendUrl?: string): AuthEmailContent {
    return wrapAuthEmail({
        bannerTitle: "Password Reset",
        heading: "Reset your password",
        body: "We received a request to reset your password. Click the button below to continue.",
        actionLabel: "Reset Password",
        actionUrl: buildPasswordResetLink(token, frontendUrl),
        accentColor: "#ef4444",
        footer: "If you did not request this, you can safely ignore this email.",
        token,
    });
}

export async function sendVerificationEmail(to: string, token: string): Promise<AuthEmailResult> {
    const content = buildVerificationEmailContent(token);
    return sendDirectMail({
        to,
        subject: "Verify your email",
        html: content.html,
        text: content.text,
    });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<AuthEmailResult> {
    const content = buildPasswordResetEmailContent(token);
    return sendDirectMail({
        to,
        subject: "Password Reset",
        html: content.html,
        text: content.text,
    });
}
