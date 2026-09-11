import "server-only";

function pickupName() {
  const value = process.env.DELHIVERY_PICKUP_NAME?.trim();
  if (!value) throw new Error("DELHIVERY_PICKUP_NAME is required for shipment fulfilment");
  return value;
}

export const shipmentConfig = Object.freeze({
  get pickupName() {
    return pickupName();
  },
  pickupAddress: "1020 Tower No. 5, Southcity Apartments, VIP Road, Zirakpur, Punjab 140603",
  pickupCity: "Zirakpur",
  pickupState: "Punjab",
  pickupPincode: "140603",
  pickupCountry: "India",
  weightGrams: 150,
  dimensionsCm: Object.freeze({ width: 8, length: 8, height: 13 }),
  hsnCode: "33059090",
  sellerGstin: "04AYUPB0073E1ZS",
} as const);
