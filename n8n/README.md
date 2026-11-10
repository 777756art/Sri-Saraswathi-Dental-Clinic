# WhatsApp Appointment Automation - Sri Saraswathi Dental Clinic

This directory contains the production-ready n8n automation workflow for **Sri Saraswathi Dental Clinic** integrated with the **Meta WhatsApp Cloud API (v21.0)**.

---

## Architecture Overview

```
Patient Books / Admin Updates
              │
              ▼
   Sri Saraswathi Dental Website
    (Express API / Node Backend)
              │
              ▼ (JSON Webhook POST)
        n8n Workflow
  (/webhook/sri-saraswathi-dental-appointments)
              │
              ├──► 1. booking.created     ──► Meta Cloud API ──► Clinic Manager (+919345743409)
              ├──► 2. booking.confirmed   ──► Meta Cloud API ──► Patient WhatsApp
              ├──► 3. booking.rejected    ──► Meta Cloud API ──► Patient WhatsApp
              ├──► 4. booking.rescheduled ──► Meta Cloud API ──► Patient WhatsApp
              ├──► 5. booking.reminder    ──► Meta Cloud API ──► Patient WhatsApp
              └──► 6. admin.custom_reply  ──► Meta Cloud API ──► Patient WhatsApp
```

---

## 1. Quick Import into n8n

1. Open your n8n dashboard (cloud or self-hosted).
2. Click **Add workflow** > **... (top right)** > **Import from File**.
3. Select `whatsapp-appointment-automation.json`.
4. Double-click the **Set Meta Credentials** node:
   - Replace `YOUR_META_PHONE_NUMBER_ID` with your Meta Phone Number ID.
   - Replace `YOUR_META_SYSTEM_USER_ACCESS_TOKEN` with your permanent Meta System User token.
5. Click **Save** and toggle the workflow to **Active**.
6. Copy the Production Webhook URL from the **Webhook Trigger** node.
7. Open the Sri Saraswathi Dental Clinic Admin Dashboard at `/dashboard/settings` > **WhatsApp Automation** tab:
   - Paste the Webhook URL into the **n8n Webhook URL** field.
   - Click **Save Configuration**.
   - Click **Send Test Notification** to verify real-time message delivery!

---

## 2. Meta WhatsApp Phone Number Eligibility Guide

### For the Clinic Recipient: `+919345743409`
- Your clinic number `9345743409` (`+919345743409`) is configured as the **Clinic Recipient**.
- It receives instant WhatsApp alerts whenever a patient books an appointment online.
- Because it is a *recipient*, it can be a standard WhatsApp account running on your Android or iPhone without any restrictions.

### For the Outbound Cloud API Sender:
Meta Cloud API requires a verified sender number. Meta has strict rules:
- **Rule:** A phone number registered with Meta Cloud API **cannot** be active inside the standard WhatsApp app on a smartphone at the same time.
- **Recommended Setup:**
  - **Development / Test:** Use the free Meta Test Number provided in your Meta Developer Console. It sends alerts directly to `+919345743409`.
  - **Production:** Register a dedicated clinic virtual number or SIM (e.g. landline `0424 427 2494` or a secondary mobile SIM) as the sender. Both the clinic manager (`+919345743409`) and patients will receive official messages from that verified clinic number.
