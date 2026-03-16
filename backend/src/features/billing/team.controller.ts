import crypto from 'node:crypto';
import type { Request, Response } from 'express';

import AnalysisRecord from '../../models/analysis-record.model.ts';
import Subscription from '../../models/subscription.model.ts';
import User from '../../models/user.model.ts';
import {
  sendNewTeamMemberNotification,
  sendTeamInvitationEmail,
  sendTeamMemberLeftConfirmation,
  sendTeamMemberLeftNotification,
  sendTeamMemberRemovedEmail,
} from './billing-email.service.ts';
import { getPlanById } from './subscription-plans.ts';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function addTeamMember(request: Request, response: Response): Promise<void> {
  try {
    const email = request.body?.email;
    const userId = request.user?.id;

    if (!userId) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!email) {
      response.status(400).json({ error: 'Email is required.' });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      response.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.status(404).json({ error: 'No active subscription found.' });
      return;
    }

    const plan = getPlanById(subscription.planId);
    if (!plan || plan.limits.maxUsers <= 1) {
      response.status(400).json({ error: 'Your current plan does not support team members.' });
      return;
    }

    if ((subscription.teamMembers || []).length >= plan.limits.maxUsers) {
      response.status(400).json({ error: `Team limit reached (${plan.limits.maxUsers} members).` });
      return;
    }

    const existingMember = (subscription.teamMembers || []).find((member: { email?: string }) =>
      member.email?.toLowerCase() === normalizedEmail);
    if (existingMember) {
      response.status(400).json({ error: 'This email is already in your team.' });
      return;
    }

    const owner = await User.findById(userId);
    if (!owner) {
      response.status(404).json({ error: 'Owner not found.' });
      return;
    }

    if (owner.email.toLowerCase() === normalizedEmail) {
      response.status(400).json({ error: 'You cannot add yourself to your own team.' });
      return;
    }

    const targetUser = await User.findOne({ email: normalizedEmail });
    if (targetUser) {
      const existingSubscription = await Subscription.findOne({
        user: targetUser._id,
        status: { $in: ['active', 'trialing'] },
      });

      if (existingSubscription) {
        response.status(400).json({
          error: `This person already has an active ${getPlanById(existingSubscription.planId)?.name || 'subscription'} plan. They cannot join your team.`,
        });
        return;
      }

      const existingActiveMembership = await Subscription.findOne({
        'teamMembers.email': normalizedEmail,
        'teamMembers.status': 'active',
        user: { $ne: userId },
      });

      if (existingActiveMembership) {
        const existingOwner = await User.findById(existingActiveMembership.user);
        const existingTeamPlan = getPlanById(existingActiveMembership.planId);
        response.status(400).json({
          error: `This person is already an active member of ${existingOwner?.email || 'another team'}'s ${existingTeamPlan?.name || 'team'}. They cannot join your team.`,
        });
        return;
      }

      const existingPendingInvitation = await Subscription.findOne({
        'teamMembers.email': normalizedEmail,
        'teamMembers.status': 'pending',
        user: userId,
      });

      if (existingPendingInvitation) {
        response.status(400).json({ error: 'This person already has a pending invitation to your team.' });
        return;
      }
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    subscription.teamMembers.push({
      email: normalizedEmail,
      status: 'pending',
      addedAt: new Date(),
      invitationToken,
    } as never);
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      $push: {
        'subscription.teamMembers': {
          email: normalizedEmail,
          status: 'pending',
          invitedAt: new Date(),
        },
      },
    });

    try {
      await sendTeamInvitationEmail(
        normalizedEmail,
        owner.email,
        owner.email,
        plan.name,
        invitationToken,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }

    response.json({
      message: 'Team member invited successfully.',
      invitationToken,
    });
  } catch (error) {
    console.error('Add team member error:', error);
    response.status(500).json({ error: 'Failed to add team member.' });
  }
}

export async function leaveTeam(request: Request, response: Response): Promise<void> {
  try {
    const userId = request.user?.id;
    const userEmail = request.user?.email;

    if (!userId || !userEmail) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await Subscription.findOne({
      'teamMembers.email': userEmail.toLowerCase(),
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.status(404).json({ error: 'No team membership found.' });
      return;
    }

    const memberIndex = (subscription.teamMembers || []).findIndex((member: { email?: string }) =>
      member.email?.toLowerCase() === userEmail.toLowerCase());

    if (memberIndex === -1) {
      response.status(404).json({ error: 'Team membership not found.' });
      return;
    }

    const member = subscription.teamMembers[memberIndex] as { name?: string };
    subscription.teamMembers.splice(memberIndex, 1);

    await User.findByIdAndUpdate(userId, {
      'subscription.isTeamMember': false,
      'subscription.teamOwner': null,
    });

    await subscription.save();

    try {
      const owner = await User.findById(subscription.user);
      const planName = getPlanById(subscription.planId)?.name || 'Unknown Plan';

      if (owner?.email) {
        await sendTeamMemberLeftNotification(
          owner.email,
          userEmail,
          member.name || userEmail,
          planName,
        );
      }

      await sendTeamMemberLeftConfirmation(
        userEmail,
        owner?.email || 'Unknown',
        owner?.email || 'Unknown',
        planName,
      );
    } catch (error) {
      console.error('Failed to send team member leave notifications:', error);
    }

    response.json({ message: 'Successfully left the team.' });
  } catch (error) {
    console.error('Team leave error:', error);
    response.status(500).json({ error: 'Failed to leave team.' });
  }
}

export async function removeTeamMember(request: Request, response: Response): Promise<void> {
  try {
    const email = request.body?.email;
    const userId = request.user?.id;

    if (!userId) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!email) {
      response.status(400).json({ error: 'Email is required.' });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));
    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.status(404).json({ error: 'No active subscription found.' });
      return;
    }

    const memberIndex = (subscription.teamMembers || []).findIndex((member: { email?: string }) =>
      member.email?.toLowerCase() === normalizedEmail);
    if (memberIndex === -1) {
      response.status(404).json({ error: 'Team member not found.' });
      return;
    }

    const member = subscription.teamMembers[memberIndex] as { status?: string };
    subscription.teamMembers.splice(memberIndex, 1);
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      $pull: {
        'subscription.teamMembers': { email: normalizedEmail },
      },
    });

    if (member.status === 'active') {
      const memberUser = await User.findOne({ email: normalizedEmail });
      if (memberUser) {
        await User.findByIdAndUpdate(memberUser._id, {
          'subscription.isTeamMember': false,
          'subscription.teamOwner': null,
        });
      }

      try {
        const owner = await User.findById(userId);
        await sendTeamMemberRemovedEmail(
          normalizedEmail,
          owner?.email || 'Unknown',
          owner?.email || 'Unknown',
          getPlanById(subscription.planId)?.name || 'Unknown Plan',
        );
      } catch (error) {
        console.error('Failed to send removal email:', error);
      }
    }

    response.json({ message: 'Team member removed successfully.' });
  } catch (error) {
    console.error('Remove team member error:', error);
    response.status(500).json({ error: 'Failed to remove team member.' });
  }
}

export async function getTeam(request: Request, response: Response): Promise<void> {
  try {
    const userId = request.user?.id;
    if (!userId) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.json({ teamMembers: [] });
      return;
    }

    const plan = getPlanById(subscription.planId);
    response.json({
      teamMembers: subscription.teamMembers || [],
      maxMembers: plan?.limits?.maxUsers || 1,
      currentCount: subscription.teamMembers?.length || 0,
    });
  } catch (error) {
    console.error('Get team error:', error);
    response.status(500).json({ error: 'Failed to get team.' });
  }
}

export async function getTeamScans(request: Request, response: Response): Promise<void> {
  try {
    const userId = request.user?.id;
    if (!userId) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.json({ scans: [] });
      return;
    }

    const teamUserIds = (subscription.teamMembers || [])
      .filter((member: { status?: string; user?: unknown }) => member.status === 'active' && member.user)
      .map((member: { user?: unknown }) => member.user);

    const scans = await AnalysisRecord.find({
      user: { $in: [userId, ...teamUserIds] },
    }).sort({ createdAt: -1 }).limit(100);

    response.json({ scans });
  } catch (error) {
    console.error('Get team scans error:', error);
    response.status(500).json({ error: 'Failed to get team scans.' });
  }
}

export async function getInvite(request: Request, response: Response): Promise<void> {
  try {
    const token = String(request.params.token || '');
    const subscription = await Subscription.findOne({
      'teamMembers.invitationToken': token,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.status(404).json({ error: 'Invalid invitation token.' });
      return;
    }

    const member = (subscription.teamMembers || []).find((item: { invitationToken?: string }) => item.invitationToken === token) as { email?: string } | undefined;
    const owner = await User.findById(subscription.user);

    response.json({
      valid: true,
      ownerEmail: owner?.email,
      planName: getPlanById(subscription.planId)?.name,
      memberEmail: member?.email,
    });
  } catch (error) {
    console.error('Get invite error:', error);
    response.status(500).json({ error: 'Failed to get invite.' });
  }
}

export async function acceptInvite(request: Request, response: Response): Promise<void> {
  try {
    const token = String(request.body?.token || '');
    const userId = request.user?.id;
    const userEmail = request.user?.email;

    if (!userId || !userEmail) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await Subscription.findOne({
      'teamMembers.invitationToken': token,
      status: { $in: ['active', 'trialing'] },
    });

    if (!subscription) {
      response.status(404).json({ error: 'Invalid invitation token.' });
      return;
    }

    const memberIndex = (subscription.teamMembers || []).findIndex((item: { invitationToken?: string }) => item.invitationToken === token);
    if (memberIndex === -1) {
      response.status(404).json({ error: 'Team member not found.' });
      return;
    }

    const member = subscription.teamMembers[memberIndex] as { email?: string; status?: string; user?: unknown; acceptedAt?: Date; invitationToken?: string };
    if (member.email?.toLowerCase() !== userEmail.toLowerCase()) {
      response.status(403).json({ error: 'This invitation is not for your email address.' });
      return;
    }

    member.status = 'active';
    member.user = userId;
    member.acceptedAt = new Date();
    member.invitationToken = undefined;
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      'subscription.isTeamMember': true,
      'subscription.teamOwner': subscription.user,
    });

    try {
      const owner = await User.findById(subscription.user);
      await sendNewTeamMemberNotification(
        owner?.email || 'Unknown',
        userEmail,
        userEmail,
        getPlanById(subscription.planId)?.name || 'Unknown Plan',
      );
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }

    response.json({ message: 'Successfully joined the team.' });
  } catch (error) {
    console.error('Accept invite error:', error);
    response.status(500).json({ error: 'Failed to accept invite.' });
  }
}
