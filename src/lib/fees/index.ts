import db from '@/lib/db';

export interface DepositFeeResult {
  fee: number;
  netAmount: number;
  feePercent: number;
  isConfigured: boolean;
}

export interface PayoutFeeResult {
  fee: number;
  feeInKobo: number;
  gatewayFee: number;
  gatewayFeeInKobo: number;
  totalDebit: number;
  totalDebitInNaira: number;
  totalDebitInKobo: number;
  netAmount: number;
  netAmountInKobo: number;
  isInternal: boolean;
  minAmount: number;
  isConfigured: boolean;
  tierStep: number;
  tierFeeStep: number;
}

/**
 * Calculate transaction fee for incoming deposits / pay-ins.
 * Uses admin configured deposit fee from systemSettings.deposit,
 * checks feeRules as fallback, and finally falls back to default fee (1.0% / 0.5%).
 */
export async function calculateDepositFee(amount: number): Promise<DepositFeeResult> {
  const safeAmount = Number(amount) || 0;
  if (safeAmount <= 0) {
    return { fee: 0, netAmount: 0, feePercent: 0, isConfigured: false };
  }

  const settings = await db.systemSettings.get();
  let feePercent = 1.0; // Default fallback: 1.0%
  let isConfigured = false;
  let isPercentage = true;
  let flatFee = 0;
  let cap = 0;

  // 1. Primary: check admin systemSettings.deposit.vtpayFeePercent
  if (
    settings?.deposit?.vtpayFeePercent !== undefined &&
    settings?.deposit?.vtpayFeePercent !== null &&
    settings?.deposit?.vtpayFeePercent !== '' &&
    !isNaN(Number(settings.deposit.vtpayFeePercent))
  ) {
    feePercent = Number(settings.deposit.vtpayFeePercent);
    isConfigured = true;
  } else if (
    settings?.deposit?.virtualAccountChargePercent !== undefined &&
    settings?.deposit?.virtualAccountChargePercent !== null &&
    settings?.deposit?.virtualAccountChargePercent !== '' &&
    !isNaN(Number(settings.deposit.virtualAccountChargePercent))
  ) {
    feePercent = Number(settings.deposit.virtualAccountChargePercent);
    isConfigured = true;
  } else {
    // 2. Secondary: check active deposit rule in feeRules
    try {
      const rules = await db.fees.findAll();
      const depositRule = rules.find(
        (r: any) =>
          r.category === 'deposit' &&
          (r.status === 'active' || r.status === undefined)
      );
      if (depositRule) {
        isConfigured = true;
        if (depositRule.type === 'flat') {
          isPercentage = false;
          flatFee = Number(depositRule.value) || 0;
        } else {
          feePercent = Number(depositRule.value) || 1.0;
          cap = Number(depositRule.cap) || 0;
        }
      }
    } catch {
      // Fallback to default
    }
  }

  let fee = 0;
  if (!isPercentage) {
    fee = Number(flatFee.toFixed(2));
  } else {
    fee = Number(((safeAmount * feePercent) / 100).toFixed(2));
    if (cap > 0 && fee > cap) {
      fee = cap;
    }
  }

  const netAmount = Number(Math.max(0, safeAmount - fee).toFixed(2));

  return {
    fee,
    netAmount,
    feePercent,
    isConfigured,
  };
}

/**
 * Calculate fee for withdrawals / payouts.
 * Uses admin configured tiered flat fee or rule with fallback to default:
 * Default: every ₦2,500 band incurs ₦25 fee (e.g. ₦1-2,500 = ₦25, ₦2,501-5,000 = ₦50, etc.)
 */
export async function calculatePayoutFee(
  amountInNaira: number,
  isInternal: boolean = false
): Promise<PayoutFeeResult> {
  const safeAmount = Number(amountInNaira) || 0;
  if (safeAmount <= 0) {
    return {
      fee: 0,
      feeInKobo: 0,
      gatewayFee: 0,
      gatewayFeeInKobo: 0,
      totalDebit: 0,
      totalDebitInNaira: 0,
      totalDebitInKobo: 0,
      netAmount: 0,
      netAmountInKobo: 0,
      isInternal,
      minAmount: 1000,
      isConfigured: false,
      tierStep: 2500,
      tierFeeStep: 25,
    };
  }

  if (isInternal) {
    return {
      fee: 0,
      feeInKobo: 0,
      gatewayFee: 0,
      gatewayFeeInKobo: 0,
      totalDebit: safeAmount,
      totalDebitInNaira: safeAmount,
      totalDebitInKobo: Math.round(safeAmount * 100),
      netAmount: safeAmount,
      netAmountInKobo: Math.round(safeAmount * 100),
      isInternal: true,
      minAmount: 100,
      isConfigured: true,
      tierStep: 2500,
      tierFeeStep: 25,
    };
  }

  const settings = await db.systemSettings.get();
  const payoutSettings = settings?.payout || {};

  let ruleFee: number | null = null;
  let isConfigured = false;

  // 1. Check feeRules for custom withdrawal rule
  try {
    const rules = await db.fees.findAll();
    const withdrawRule = rules.find(
      (r: any) =>
        r.category === 'withdrawal' &&
        (r.status === 'active' || r.status === undefined)
    );
    if (withdrawRule) {
      isConfigured = true;
      if (withdrawRule.type === 'flat') {
        ruleFee = Number(withdrawRule.value) || 0;
      } else if (withdrawRule.type === 'percentage') {
        const pctFee = (safeAmount * (Number(withdrawRule.value) || 0)) / 100;
        const cap = Number(withdrawRule.cap) || 0;
        ruleFee = cap > 0 ? Math.min(pctFee, cap) : pctFee;
      }
    }
  } catch {
    // Fallback
  }

  // 2. Tiered fee from admin settings with default fallback
  const tierStep =
    payoutSettings.payoutTierStep !== undefined &&
    payoutSettings.payoutTierStep !== null &&
    !isNaN(Number(payoutSettings.payoutTierStep)) &&
    Number(payoutSettings.payoutTierStep) > 0
      ? Number(payoutSettings.payoutTierStep)
      : 2500;

  const tierFeeStep =
    payoutSettings.payoutTierFeeStep !== undefined &&
    payoutSettings.payoutTierFeeStep !== null &&
    !isNaN(Number(payoutSettings.payoutTierFeeStep)) &&
    Number(payoutSettings.payoutTierFeeStep) >= 0
      ? Number(payoutSettings.payoutTierFeeStep)
      : 25;

  if (payoutSettings.payoutTierStep || payoutSettings.payoutTierFeeStep) {
    isConfigured = true;
  }

  let feeInNaira = 0;
  if (ruleFee !== null) {
    feeInNaira = ruleFee;
  } else {
    feeInNaira = Math.ceil(safeAmount / tierStep) * tierFeeStep;
  }

  // 3. Bank settlement gateway fee if configured
  const bankSettlementFeeRaw = Number(payoutSettings.bankSettlementFee) || 0;
  const bankSettlementThreshold = Number(payoutSettings.bankSettlementThreshold) || 0;
  const bankSettlementFeeInNaira =
    bankSettlementFeeRaw > 100 ? bankSettlementFeeRaw / 100 : bankSettlementFeeRaw;

  const gatewayFeeInNaira =
    safeAmount >= bankSettlementThreshold && bankSettlementThreshold > 0
      ? bankSettlementFeeInNaira
      : 0;

  const totalFeeInNaira = Number((feeInNaira + gatewayFeeInNaira).toFixed(2));
  const totalDebitInNaira = Number((safeAmount + totalFeeInNaira).toFixed(2));
  const netAmountInNaira = safeAmount; // Recipient receives requested amount

  const minAmount =
    payoutSettings.minAmount !== undefined &&
    payoutSettings.minAmount !== null &&
    !isNaN(Number(payoutSettings.minAmount)) &&
    Number(payoutSettings.minAmount) > 0
      ? Number(payoutSettings.minAmount)
      : 1000;

  return {
    fee: feeInNaira,
    feeInKobo: Math.round(feeInNaira * 100),
    gatewayFee: gatewayFeeInNaira,
    gatewayFeeInKobo: Math.round(gatewayFeeInNaira * 100),
    totalDebit: totalDebitInNaira,
    totalDebitInNaira,
    totalDebitInKobo: Math.round(totalDebitInNaira * 100),
    netAmount: netAmountInNaira,
    netAmountInKobo: Math.round(netAmountInNaira * 100),
    isInternal: false,
    minAmount,
    isConfigured,
    tierStep,
    tierFeeStep,
  };
}
