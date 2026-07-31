// Shared between the Edge middleware and the Node auth helpers.
// Kept free of `next/headers` so it can be imported from middleware safely.
export const SESSION_COOKIE = 'nata_session';
