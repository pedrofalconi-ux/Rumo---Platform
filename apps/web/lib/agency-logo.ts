export const AGENCY_LOGO_BUCKET = 'agency-assets';

export function safeAgencyStorageId(agencyId: string) {
  return String(agencyId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function agencyLogoReference(objectPath: string) {
  return `storage://${AGENCY_LOGO_BUCKET}/${objectPath}`;
}

export function extractAgencyLogoPath(value: unknown) {
  const logoUrl = String(value || '').trim();
  const privatePrefix = `storage://${AGENCY_LOGO_BUCKET}/`;
  if (logoUrl.startsWith(privatePrefix)) return decodeURIComponent(logoUrl.slice(privatePrefix.length));

  const publicMarker = `/storage/v1/object/public/${AGENCY_LOGO_BUCKET}/`;
  const markerIndex = logoUrl.indexOf(publicMarker);
  if (markerIndex >= 0) return decodeURIComponent(logoUrl.slice(markerIndex + publicMarker.length).split('?')[0]);
  return '';
}

export function isAgencyLogoPath(objectPath: string, agencyId: string) {
  return objectPath.startsWith(`${safeAgencyStorageId(agencyId)}/logos/`);
}

export function agencyLogoProxyUrl(agencyId?: string) {
  return agencyId
    ? `/api/settings/logo?agencyId=${encodeURIComponent(agencyId)}`
    : '/api/settings/logo';
}
