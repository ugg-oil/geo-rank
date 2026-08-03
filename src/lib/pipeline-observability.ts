type PipelineEvent = {
  event: string;
  week?: string;
  runId?: string;
  stage?: string;
  durationMs?: number;
  [key: string]: unknown;
};

export function errorContext(error: unknown) {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: string };
    return { name: error.name, message: error.message, code: withCode.code };
  }
  return { name: "UnknownError", message: String(error) };
}

/** JSON logs are intentionally one line so Vercel can filter by runId/week/stage. */
export function logPipelineEvent(event: PipelineEvent) {
  console.info(JSON.stringify({ source: "pipeline", at: new Date().toISOString(), ...event }));
}

function alertSubject(payload: PipelineEvent) {
  return `[GEO Radar] Pipeline alert: ${payload.event}${payload.week ? ` (${payload.week})` : ""}`;
}

async function sendResendAlert(payload: PipelineEvent) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PIPELINE_ALERT_EMAIL_TO;
  const from = process.env.PIPELINE_ALERT_EMAIL_FROM;
  if (!apiKey || !to || !from) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: alertSubject(payload),
        text: `GEO Radar pipeline alert\n\n${JSON.stringify(payload, null, 2)}`,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    logPipelineEvent({ ...payload, event: "alert_email_sent" });
    return true;
  } catch (error) {
    logPipelineEvent({ ...payload, event: "alert_email_delivery_failed", alertError: errorContext(error) });
    return false;
  } finally { clearTimeout(timer); }
}

async function sendWebhookAlert(payload: PipelineEvent) {
  const webhookUrl = process.env.PIPELINE_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "geo-radar", ...payload }), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Alert webhook returned ${response.status}`);
    logPipelineEvent({ ...payload, event: "alert_sent" });
    return true;
  } catch (error) {
    logPipelineEvent({ ...payload, event: "alert_delivery_failed", alertError: errorContext(error) });
    return false;
  } finally { clearTimeout(timer); }
}

/** Sends direct Resend email when configured; generic webhook is a fallback. */
export async function sendPipelineAlert(payload: PipelineEvent) {
  if (await sendResendAlert(payload)) return true;
  if (await sendWebhookAlert(payload)) return true;
  logPipelineEvent({ ...payload, event: "alert_skipped_no_delivery_channel" });
  return false;
}
