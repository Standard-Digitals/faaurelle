export type InrAmountPaisa = number;

export function assertPaise(value: number, fieldName = "amount"): asserts value is InrAmountPaisa {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer number of paise.`);
  }
}

export function calculateSubtotal(unitAmountPaisa: number, quantity: number): InrAmountPaisa {
  assertPaise(unitAmountPaisa, "unitAmountPaisa");

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError("quantity must be a positive safe integer.");
  }

  const subtotal = unitAmountPaisa * quantity;
  assertPaise(subtotal, "subtotalPaisa");
  return subtotal;
}

export function calculateTotal(
  subtotalPaisa: number,
  shippingPaisa: number,
  taxPaisa: number,
): InrAmountPaisa {
  assertPaise(subtotalPaisa, "subtotalPaisa");
  assertPaise(shippingPaisa, "shippingPaisa");
  assertPaise(taxPaisa, "taxPaisa");

  const total = subtotalPaisa + shippingPaisa + taxPaisa;
  assertPaise(total, "totalPaisa");
  return total;
}

export function formatInr(amountPaisa: number): string {
  assertPaise(amountPaisa);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: amountPaisa % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountPaisa / 100);
}
