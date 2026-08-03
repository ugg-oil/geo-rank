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

export async function sendPipelineAlert(payload: PipelineEvent) {
  const webhookUrl = process.env.PIPELINE_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    logPipelineEvent({ ...payload, event: "alert_skipped_no_webhook" });
    return false;
  }
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
