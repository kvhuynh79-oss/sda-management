// Notification helper functions with retry logic

export interface NotificationResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  messageId?: string;
  retryCount?: number;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calculate delay with exponential backoff
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

// Check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on network errors or rate limits
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("503") ||
      message.includes("502") ||
      message.includes("429")
    );
  }
  return false;
}

// Check if HTTP response is retryable
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

// Generic fetch with retry logic
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ response: Response | null; error: string | null; retryCount: number }> {
  let lastError: string | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return { response, error: null, retryCount };
      }

      // Check if we should retry this status code
      if (isRetryableStatus(response.status) && attempt < config.maxRetries) {
        lastError = `HTTP ${response.status}`;
        retryCount++;
        const delay = calculateDelay(attempt, config);
        console.log(`Retrying request (attempt ${attempt + 1}/${config.maxRetries}) after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error
      return { response, error: null, retryCount };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (isRetryableError(error) && attempt < config.maxRetries) {
        retryCount++;
        const delay = calculateDelay(attempt, config);
        console.log(`Retrying request (attempt ${attempt + 1}/${config.maxRetries}) after ${delay}ms due to: ${lastError}`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      return { response: null, error: lastError, retryCount };
    }
  }

  return { response: null, error: lastError || "Max retries exceeded", retryCount };
}

// Send email with retry
export async function sendEmailWithRetry(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  htmlContent: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<NotificationResult> {
  const { response, error, retryCount } = await fetchWithRetry(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: htmlContent,
      }),
    },
    config
  );

  if (error) {
    console.error(`Failed to send email after ${retryCount} retries:`, error);
    return {
      success: false,
      error: `Failed to send email: ${error}`,
      retryCount,
    };
  }

  if (!response) {
    return {
      success: false,
      error: "No response received",
      retryCount,
    };
  }

  const data = await response.json();

  if (!response.ok) {
    console.error("Resend API error:", data);
    return {
      success: false,
      error: JSON.stringify(data),
      retryCount,
    };
  }

  return {
    success: true,
    messageId: data.id,
    retryCount,
  };
}

// Send SMS with retry
export async function sendSmsWithRetry(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<NotificationResult> {
  const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const { response, error, retryCount } = await fetchWithRetry(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    },
    config
  );

  if (error) {
    console.error(`Failed to send SMS after ${retryCount} retries:`, error);
    return {
      success: false,
      error: `Failed to send SMS: ${error}`,
      retryCount,
    };
  }

  if (!response) {
    return {
      success: false,
      error: "No response received",
      retryCount,
    };
  }

  const data = await response.json();

  if (!response.ok) {
    console.error("Twilio API error:", data);
    return {
      success: false,
      error: JSON.stringify(data),
      retryCount,
    };
  }

  return {
    success: true,
    messageId: data.sid,
    retryCount,
  };
}

// Format alert message for SMS (character limit aware)
export function formatSmsMessage(
  severity: string,
  title: string,
  message: string,
  dueDate?: string,
  maxLength: number = 160
): string {
  const header = `[${severity.toUpperCase()}] ${title}`;
  const footer = "\n\n- SDA Manager";
  const duePart = dueDate ? `\nDue: ${dueDate}` : "";

  const availableLength = maxLength - header.length - footer.length - duePart.length - 2; // -2 for newlines

  let truncatedMessage = message;
  if (message.length > availableLength) {
    truncatedMessage = message.substring(0, availableLength - 3) + "...";
  }

  return `${header}\n${truncatedMessage}${duePart}${footer}`;
}
