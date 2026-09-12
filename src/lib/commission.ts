export function getCommissionRate(): number {
  const raw = process.env.PLATFORM_COMMISSION_PERCENT;
  const parsed = raw ? Number(raw) : NaN;
  const percent = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 8;
  return percent / 100;
}

export type CommissionBreakdown = {
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  businessPayout: number;
};

export function computeCommission(amount: number): CommissionBreakdown {
  const commissionRate = getCommissionRate();
  const commissionAmount = round2(amount * commissionRate);
  const businessPayout = round2(amount - commissionAmount);
  return { amount: round2(amount), commissionRate, commissionAmount, businessPayout };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
