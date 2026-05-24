import { Prisma } from "@/generated/prisma/client";

export type MoneyLike = number | string | Prisma.Decimal | null | undefined;

const ZERO = new Prisma.Decimal(0);

export function dec(value: MoneyLike): Prisma.Decimal {
  if (value == null) return ZERO;
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

/** Round to 2dp using banker's rounding. Use this whenever a Decimal becomes a stored value. */
export function money(value: MoneyLike): Prisma.Decimal {
  return dec(value).toDecimalPlaces(2);
}

export function sumMoney(values: MoneyLike[]): Prisma.Decimal {
  return money(values.reduce<Prisma.Decimal>((acc, v) => acc.plus(dec(v)), ZERO));
}

/**
 * Compute booking financials from raw inputs. Pure: no DB.
 * Returns Decimal-rounded values ready to persist.
 *
 * Receipt formula:
 *   totalAmount   = subtotal − discount + miscCharges + electricityCharge + generatorCharge + mattressCharge
 *   electricityCharge = electricityUnits × electricityRate
 *   generatorCharge   = generatorHours  × generatorRate
 *   mattressCharge    = addonMattresses × addonMattressRate
 *
 *   grossPayable  = totalAmount + securityDeposit
 *   net received  = sum(non-refund payments) − sum(refunds)
 *   balanceDue    = grossPayable − net received       (negative ⇒ refund owed to customer)
 */
export type FinancialsInput = {
  subtotal: MoneyLike;
  discount: MoneyLike;
  miscCharges: MoneyLike;
  electricityUnits: MoneyLike;
  electricityRate: MoneyLike;
  generatorHours: MoneyLike;
  generatorRate: MoneyLike;
  addonMattresses: number;
  addonMattressRate: MoneyLike;
  securityDeposit: MoneyLike;
  payments: { kind: string; amount: MoneyLike }[];
};

export type FinancialsResult = {
  electricityCharge: Prisma.Decimal;
  generatorCharge: Prisma.Decimal;
  mattressCharge: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  grossPayable: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  refundAmount: Prisma.Decimal;
  balanceDue: Prisma.Decimal;
};

export function computeFinancials(input: FinancialsInput): FinancialsResult {
  const electricityCharge = money(dec(input.electricityUnits).times(dec(input.electricityRate)));
  const generatorCharge = money(dec(input.generatorHours).times(dec(input.generatorRate)));
  const mattressCharge = money(dec(input.addonMattresses).times(dec(input.addonMattressRate)));

  const totalAmount = money(
    dec(input.subtotal)
      .minus(dec(input.discount))
      .plus(dec(input.miscCharges))
      .plus(electricityCharge)
      .plus(generatorCharge)
      .plus(mattressCharge)
  );

  const grossPayable = money(totalAmount.plus(dec(input.securityDeposit)));

  const refundAmount = sumMoney(
    input.payments.filter((p) => p.kind === "REFUND").map((p) => p.amount)
  );
  const grossReceived = sumMoney(
    input.payments.filter((p) => p.kind !== "REFUND").map((p) => p.amount)
  );
  const paidAmount = money(grossReceived.minus(refundAmount));
  const balanceDue = money(grossPayable.minus(paidAmount));

  return {
    electricityCharge,
    generatorCharge,
    mattressCharge,
    totalAmount,
    grossPayable,
    paidAmount,
    refundAmount,
    balanceDue,
  };
}
