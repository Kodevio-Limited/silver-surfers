export interface SubscriptionPlanLimits {
  scansPerMonth: number;
  maxUsers: number;
  features: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price?: number;
  yearlyPrice?: number | null;
  yearlyPriceId?: string;
  monthlyPrice?: number | null;
  currency: string;
  type?: string;
  isOneTime?: boolean;
  limits: SubscriptionPlanLimits;
  icon?: string;
  gradient?: string;
  popular?: boolean;
  contactSales?: boolean;
  buttonText?: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  oneTime: {
    id: 'oneTime',
    name: 'One-Time',
    description: 'Perfect for getting started',
    price: 39700,
    currency: 'usd',
    type: 'one-time',
    isOneTime: true,
    limits: {
      scansPerMonth: 1,
      maxUsers: 1,
      features: [
        'One device tested',
        'up to 25 subpages scanned',
        'Detailed PDF report',
        'Actionable recommendations',
        '17-category analysis',
        'Email support',
      ],
    },
    gradient: 'from-blue-500 to-indigo-500',
    popular: false,
    buttonText: 'Get Report',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: '',
    yearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    yearlyPrice: 199700,
    currency: 'usd',
    limits: {
      scansPerMonth: 60,
      maxUsers: 1,
      features: [
        '60 reports per year',
        'Select device per report',
        'up to 25 subpages scanned',
        '1 user account',
        'PDF reports',
        'Actionable recommendations',
        'Priority email support',
      ],
    },
    gradient: 'from-blue-500 to-green-500',
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: '',
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    yearlyPrice: 299700,
    currency: 'usd',
    limits: {
      scansPerMonth: 144,
      maxUsers: 3,
      features: [
        '144 reports per year',
        'All devices tested together',
        'up to 25 subpages scanned',
        '3 team users',
        'SilverSurfers Seal',
        'Priority support',
        'Historical tracking',
        'White-label reports',
        'Quarterly consultation',
      ],
    },
    gradient: 'from-green-500 to-teal-500',
    popular: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Tailored solutions for enterprise-level accessibility needs.',
    monthlyPrice: null,
    yearlyPrice: null,
    currency: 'usd',
    limits: {
      scansPerMonth: -1,
      maxUsers: -1,
      features: [
        'SilverSurfers Score',
        'Unlimited scans',
        'SilverSurfers Seal of Approval',
        'Unlimited team users',
        'Advanced analytics',
        'API access',
        'White labeling options',
        'Dedicated support',
        'Custom integrations',
      ],
    },
    gradient: 'from-purple-500 to-blue-500',
    popular: false,
    contactSales: true,
  },
};

export function getPlanById(planId: string | null | undefined): SubscriptionPlan | null {
  if (!planId) {
    return null;
  }

  return SUBSCRIPTION_PLANS[planId] || null;
}

export function getPlanByPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) {
    return null;
  }

  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.yearlyPriceId === priceId) || null;
}

export function getAvailablePlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function getPublicPlans(): Array<Record<string, unknown>> {
  return getAvailablePlans().map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    yearlyPrice: plan.yearlyPrice,
    currency: plan.currency,
    type: plan.type,
    isOneTime: plan.isOneTime,
    limits: plan.limits,
    icon: plan.icon,
    gradient: plan.gradient,
    popular: plan.popular,
    contactSales: plan.contactSales,
  }));
}
