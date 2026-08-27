import type {
  AuthorizedReportCertificationSnapshot,
  CertificationEvaluationInput,
  CertificationException,
  CertificationPolicy,
  CertificationProduct,
  CertificationRun,
} from "./types";

/**
 * Server-side evidence boundary. Implementations keep privileged SDK objects,
 * raw queries, and credentials out of the client feature.
 */
export interface CertificationEvidenceRepository {
  listProducts(): Promise<CertificationProduct[]>;
  getEvaluationInput(
    productId: string,
  ): Promise<CertificationEvaluationInput | null>;
  getRun(runId: string): Promise<CertificationRun | null>;
  getCurrentPolicy(): Promise<CertificationPolicy>;
  listExceptions(productId?: string): Promise<CertificationException[]>;
}

/** Browser-facing repository returns only an authorized, redacted projection. */
export interface CertificationViewRepository {
  getAuthorizedSnapshot(): Promise<AuthorizedReportCertificationSnapshot>;
}
