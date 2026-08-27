import { demoReportCertificationSnapshot } from "../features/report-certification";
import type {
  AuthorizedReportCertificationSnapshot,
  ReportCertificationControlProps,
} from "../features/report-certification";

const safeCertificationDemoProps: ReportCertificationControlProps = {};

// Production labeling cannot be selected without an explicit data projection.
// @ts-expect-error -- `data` is required when the demo banner is disabled.
const unsafeCertificationFallbackProps: ReportCertificationControlProps = {
  showDemoBanner: false,
};

// Synthetic provenance cannot be hidden even when an explicit fixture is used.
// @ts-expect-error -- synthetic snapshots must retain the demo banner.
const hiddenSyntheticProps: ReportCertificationControlProps = {
  data: demoReportCertificationSnapshot,
  showDemoBanner: false,
};

declare const authorizedSnapshot: AuthorizedReportCertificationSnapshot;
const authorizedCertificationProps: ReportCertificationControlProps = {
  data: authorizedSnapshot,
  showDemoBanner: false,
};

void safeCertificationDemoProps;
void unsafeCertificationFallbackProps;
void hiddenSyntheticProps;
void authorizedCertificationProps;
