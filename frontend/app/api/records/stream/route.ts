import { cookies } from 'next/headers';
import { setTimeout } from 'node:timers/promises';
import { user, sessionUser, failure } from '@/lib/server/auth';
import { readRecords } from '@/lib/server/records';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await user();
    const token = (await cookies()).get('response_session')!.value;
    const abort = new AbortController();
    request.signal.addEventListener('abort', () => abort.abort(), { once: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let previous = '';
        try {
          while (!abort.signal.aborted) {
            // Re-check role, district assignment and revocation on every cycle.
            let account;
            try { account = await sessionUser(token); }
            catch (error) {
              if (!(error instanceof Error) || error.message !== '401') throw error;
              controller.enqueue(encoder.encode('event: expired\ndata: {}\n\n'));
              break;
            }
            const data = JSON.stringify(await readRecords(account));
            if (data !== previous) { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); previous = data; }
            else controller.enqueue(encoder.encode(': heartbeat\n\n'));
            await setTimeout(3000, undefined, { signal: abort.signal });
          }
        } catch { if (!abort.signal.aborted) controller.enqueue(encoder.encode('event: unavailable\ndata: {}\n\n')); }
        finally { if (!abort.signal.aborted) controller.close(); }
      },
      cancel() { abort.abort(); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' } });
  } catch (e) { return failure(e); }
}
