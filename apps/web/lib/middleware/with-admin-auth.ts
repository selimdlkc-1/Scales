import { UnauthorizedError } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildErrorBody } from './response-envelope.js';

/**
 * `/api/admin/*` route'larına özel son (en iç) middleware katmanı
 * (docs/04_BACKEND_SPEC.md §4 madde 4, docs/07_SECURITY_IMPLEMENTATION.md §2-4).
 *
 * `Authorization: Basic base64(user:pass)` header'ını `OPERATOR_USERNAME`/
 * `OPERATOR_PASSWORD` ortam değişkenleriyle karşılaştırır. Eksik/hatalıysa
 * `withRateLimit`/`withValidation` ile aynı desende — `withErrorHandling`
 * üzerinden değil, doğrudan burada — `401` ile zinciri kısa devre yapar;
 * bu, tarayıcının native Basic Auth diyaloğunu tetikleyen `WWW-Authenticate`
 * header'ının yanıta eklenebilmesi içindir (docs/03_API_CONTRACTS.md §3
 * `UNAUTHORIZED` satırı).
 *
 * `apps/web/middleware.ts` (İterasyon 2, sayfa seviyesi `/admin/**` koruması)
 * ile aynı env var karşılaştırmasını yapar ama bağımsız bir implementasyondur
 * — defense in depth (docs/07 §4): biri atlanırsa/bozulursa diğeri yine de
 * korumayı sağlar.
 */

const WWW_AUTHENTICATE_HEADER = 'Basic realm="Terazi Operator Panel"';

// Mesaj metni tek kaynaktan (`UnauthorizedError`) alınır — `docs/03 §3`'teki
// `UNAUTHORIZED` mesajının route handler'da elle kopyalanmaması için.
const UNAUTHORIZED_ERROR = new UnauthorizedError();

function decodeBasicCredentials(
  authorizationHeader: string | null,
): { username: string; password: string } | null {
  if (!authorizationHeader?.startsWith('Basic ')) return null;

  const base64Credentials = authorizationHeader.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

/**
 * Env var'lar her istekte (modül yüklenirken değil) okunur — hem test'te
 * `vi.stubEnv` ile geçersiz kılınabilmesi hem de değeri unset bırakılan bir
 * ortamda (`OPERATOR_USERNAME`/`OPERATOR_PASSWORD` tanımsız) her isteğin
 * deny-by-default davranmasını (header'daki değer literal "undefined" string'i
 * olmadıkça hiçbir zaman eşleşmez) garanti eder.
 */
function isAuthorized(request: NextRequest): boolean {
  const credentials = decodeBasicCredentials(request.headers.get('authorization'));
  if (!credentials) return false;

  return (
    credentials.username === process.env.OPERATOR_USERNAME &&
    credentials.password === process.env.OPERATOR_PASSWORD
  );
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(buildErrorBody(UNAUTHORIZED_ERROR.code, UNAUTHORIZED_ERROR.message), {
    status: UNAUTHORIZED_ERROR.httpStatus,
    headers: { 'WWW-Authenticate': WWW_AUTHENTICATE_HEADER },
  });
}

export function withAdminAuth<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>,
): (request: NextRequest, ...args: TArgs) => Promise<NextResponse> {
  return async (request: NextRequest, ...args: TArgs): Promise<NextResponse> => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return handler(request, ...args);
  };
}
