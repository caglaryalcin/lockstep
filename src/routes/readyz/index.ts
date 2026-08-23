import type { RequestHandler } from '@builder.io/qwik-city';

import { readSettings } from '~/lib/server/settings-store';

export const onGet: RequestHandler = async ({ headers, json }) => {
  headers.set('Cache-Control', 'no-store');

  try {
    await readSettings('readiness-probe');
    json(200, {
      mode: 'production',
      status: 'ready',
    });
  } catch {
    json(503, {
      mode: 'production',
      status: 'unavailable',
    });
  }
};
