# Iranian mobile accounts and Bale

## Project integration with a Bale BotFather bot

Project settings → Integrations → Bale can send project updates to a private chat, group, or channel. This is a separate integration from Safir phone sign-in and personal notifications described below. It uses a normal BotFather token; no Safir account, organization key, webhook, Redis, or additional worker is needed.

1. Create a bot with [@botfather in Bale](https://ble.ir/botfather) and copy its token.
2. For a private destination, start a conversation with the bot. For a group, add the bot and allow it to send messages. For a channel, add it as an administrator with permission to post.
3. Obtain the numeric `chat.id` from a message returned by the bot's `getUpdates` API after sending a message or command to it. Call this from your own trusted tool, and keep the token out of screenshots, shell history, and shared logs. If this bot already has a webhook or another consumer, use that consumer's updates instead of changing its webhook or taking its update queue. Public channels can also use `@channelusername`.
4. In the Bale project panel, enter the token and chat ID (or channel username), optionally name the destination, and select the events to send.

New tasks, status changes, and new comments are enabled by default. Priority, title, and description changes can also be enabled. Messages use Persian labels and include task context and a task link when `KANEO_CLIENT_URL` is configured. The token stays on the API; a masked token is returned to the web app. No Bale token belongs in Vite variables.

Saving only validates the configuration's shape; it does not verify the token or destination with Bale. The panel's connected state means configuration is stored. Verify delivery by creating a test task in a test project and checking the intended destination. Disable delivery to pause it, or disconnect to remove the stored configuration. An empty token field while editing keeps the saved token.

The project integration attempts each message once with a ten-second timeout. Failures are logged without the credential and do not block task changes; there is no durable queue, automatic retry, or email fallback for project messages. Existing Safir notification delivery retains its own queue and fallback behavior. See the [official Bale Bot API](https://docs.bale.ai/) for token, destination, and rate-limit details.

Montask supports email accounts and phone-only accounts side by side. Phone accounts use a six-digit code delivered through **Safir Bale**, without SMS or a password. Only Iranian mobile numbers are accepted. Users can attach a verified phone or email to their existing account; two existing accounts are never merged automatically.

## Configure Safir

Create or locate your Safir in the [Bale business panel](https://business.bale.ai/) and confirm that its organization key and bot ID can send both OTP and ordinary messages. A normal BotFather bot token alone is insufficient. See the [official Safir API](https://docs.bale.ai/safir).

Set these variables on the **API**:

```dotenv
BALE_SAFIR_BOT_ID=123456789
BALE_SAFIR_API_ACCESS_KEY=your-organization-key
```

Alternatively mount a secret and set `BALE_SAFIR_API_ACCESS_KEY_FILE=/run/secrets/bale_key`. Direct values take precedence over files. Neither secret nor bot ID is returned by the public configuration API; it exposes only `hasBale`. Missing or invalid configuration disables the phone flow and preserves email behavior.

Use the root `.env` for a local API, your container environment for Docker/Coolify, or `kaneo.env.bale` in Helm:

```yaml
kaneo:
  env:
    bale:
      botId: "123456789"
      existingSecret:
        name: bale-credentials
        key: api-access-key
```

The Kubernetes Secret is provided by the operator. Configure the web application's normal API URL for separate hosting; no Bale key belongs in Vite environment variables. The same-origin bundled deployment also works. No callback webhook, SMS gateway, Redis, or extra worker service is required.

## Account and delivery behavior

- Public registration and invitation-only policies apply to phone registration. A name is required for a new phone account. Existing users retain their IDs, tasks, roles, and sessions.
- Sending is limited to one code per minute and five per hour per number, plus thirty per hour per client IP. Each code expires in five minutes and allows five incorrect attempts. Codes are consumed atomically and cannot cross between sign-in and changing a phone.
- Adding/changing a phone requires a user session and a code delivered to the new number. Another account's number cannot be attached. Removing a contact requires another verified sign-in method.
- Phone invitations support project restrictions, resend, links, acceptance, rejection, cancellation, and expiry. Acceptance requires the exact invited, verified phone; an invitation link alone cannot grant membership.
- New phone-only accounts have Bale notifications enabled. Users select email, Bale, or both and retain per-workspace/project/event controls. Existing notification preferences are not reset.
- Invitations, notification/reminder messages, magic links, and password-reset links for linked email accounts can be delivered through Bale. Safir's standard OTP messages appear in Bale's dedicated OTP bot; ordinary messages use the configured bot.
- Deliveries live in PostgreSQL with encrypted payloads and fixed request IDs across retries. Temporary failures get at most three attempts, with increasing delays. Eligibility is checked again before retrying. A provider accepting a message does not prove the person has read it.
- Failed ordinary messages can fall back to a verified email, when SMTP is configured. A failed phone sign-in creates a **separate email sign-in challenge** for the same account. Use the email sign-in form to redeem it. An email code never verifies a phone. Phone registration and changing a phone cannot fall back to email.
- Recent statuses appear in notification settings. The API reports `pending`, `retry`, `accepted`, `failed`, `email_fallback`, or `expired`. Terminal delivery payloads are cleared and records expire after thirty days.
- Instance administrators can recover a user's phone after checking identity outside Montask. Recovery is audited, revokes sessions/API keys (including CLI/MCP sessions), and requires verification of the new phone before phone sign-in.

The existing `AUTH_SECRET` encrypts queued payloads. Keep it stable across API instances and restarts. Drain queued deliveries before rotating it; messages encrypted with the old secret cannot be delivered after rotation.

## Deployment and verification

Apply the normal additive database migrations before running the new API. They add phone/contact verification, delivery queue, throttling, and recovery-audit storage; existing email accounts and invitations are preserved. Back up the database before an upgrade as usual. A rollback to an older application cannot serve phone-only users: attach a verified email to such accounts before reverting the application.

First verify with a dedicated test user in your Safir organization: request a code, sign in, invite another test number, and check an ordinary notification. Check invalid-key, insufficient-credit and temporary-outage statuses as well. Do not use production users or paste access keys into issue reports or chat.
