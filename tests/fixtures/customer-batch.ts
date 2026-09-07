export const customerCsvHeader = "companyName,customerNumber,email,pricingTier,active";
export function fictionalCustomerCsv(count = 1, prefix = "test-m5b", tier = "Tier 1") {
  return customerCsvHeader + "\n" + Array.from({ length: count }, (_, i) => `Fictional Wholesale ${i},${prefix}-${i},${prefix}-${i}@example.test,${tier},${i % 2 === 0}`).join("\n") + "\n";
}
