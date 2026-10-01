"use client";

export default function ProductError({ reset }: { reset: () => void }) {
  return <section className="product-empty"><h1>Product details are temporarily unavailable.</h1><p>Please try again.</p><button type="button" onClick={reset}>Try again</button></section>;
}
