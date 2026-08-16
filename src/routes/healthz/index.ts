import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = ({ headers, json }) => {
  headers.set('Cache-Control', 'no-store');
  json(200, { status: 'ok' });
};
