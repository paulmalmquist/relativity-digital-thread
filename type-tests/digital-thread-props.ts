import type { DigitalThreadControlProps } from "../features/digital-thread";

const safeDemoProps: DigitalThreadControlProps = {};

// Production labeling cannot be selected without an explicit data snapshot.
// @ts-expect-error -- `data` is required when the demo banner is disabled.
const unsafeFallbackProps: DigitalThreadControlProps = {
  showDemoBanner: false,
};

void safeDemoProps;
void unsafeFallbackProps;
