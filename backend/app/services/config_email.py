"""Send configuration specification spreadsheets to sales inbox."""

from __future__ import annotations

import base64
import logging
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import httpx

from app.core.config import settings
from app.models.configuration import Configuration
from app.models.user import User

logger = logging.getLogger(__name__)


class ConfigurationEmailNotConfigured(Exception):
    """Neither Resend API nor SMTP is configured."""


def sales_inbox_email() -> str:
    return (settings.sales_inbox_email or "").strip()


def resend_is_configured() -> bool:
    return bool((settings.resend_api_key or "").strip() and sales_inbox_email())


def smtp_is_configured() -> bool:
    return bool(
        (settings.smtp_host or "").strip()
        and (settings.smtp_user or "").strip()
        and (settings.smtp_password or "").strip()
        and sales_inbox_email()
    )


def email_is_configured() -> bool:
    return resend_is_configured() or smtp_is_configured()


def _render_hosting() -> bool:
    """Render sets RENDER=true; free tier blocks outbound SMTP ports."""
    return os.environ.get("RENDER", "").strip().lower() == "true"


def _smtp_blocked_message() -> str:
    return (
        "Gmail SMTP не работает на бесплатном Render (порт 587 заблокирован). "
        "Добавьте RESEND_API_KEY в Environment на Render и задеплойте последнюю версию backend."
    )


def _email_subject_and_body(
    *,
    conf: Configuration,
    user: User,
) -> tuple[str, str]:
    project = (conf.project_name or "").strip() or f"Configuration #{conf.id}"
    subject = f"Configuration #{conf.id}: {project}"
    body_lines = [
        "New configuration submitted from the product configurator.",
        "",
        f"Configuration ID: {conf.id}",
        f"Project: {project}",
        f"Contact: {(conf.project_contact_name or '').strip() or '—'}",
        f"Contact email: {(conf.project_contact_email or '').strip() or '—'}",
        f"Submitted by: {user.name} <{user.email}>",
        "",
        "Specification is attached as an Excel (.xlsx) file.",
    ]
    notes = (conf.project_notes or "").strip()
    if notes:
        body_lines.extend(["", "Notes:", notes])
    return subject, "\n".join(body_lines)


def _attachment_filename(conf: Configuration) -> str:
    return f"configuration-{conf.id}-spec.xlsx"


def send_configuration_via_resend(
    *,
    to_email: str,
    conf: Configuration,
    xlsx_bytes: bytes,
    user: User,
) -> None:
    """HTTPS email API — works on Render free tier (SMTP ports are blocked)."""
    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        raise ConfigurationEmailNotConfigured("Resend API key is not configured")

    recipient = (to_email or "").strip()
    if not recipient or "@" not in recipient:
        raise ValueError("Invalid sales inbox email")

    from_email = (settings.resend_from_email or "onboarding@resend.dev").strip()
    subject, body = _email_subject_and_body(conf=conf, user=user)
    filename = _attachment_filename(conf)

    payload = {
        "from": from_email,
        "to": [recipient],
        "subject": subject,
        "text": body,
        "attachments": [
            {
                "filename": filename,
                "content": base64.b64encode(xlsx_bytes).decode("ascii"),
            }
        ],
    }

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30.0,
    )
    if response.status_code >= 400:
        detail = response.text.strip() or response.reason_phrase
        raise RuntimeError(f"Resend API error ({response.status_code}): {detail}")


def send_configuration_specification_email(
    *,
    to_email: str,
    conf: Configuration,
    xlsx_bytes: bytes,
    user: User,
) -> None:
    """Deliver XLSX attachment via SMTP (works locally; blocked on Render free tier)."""
    if not smtp_is_configured():
        raise ConfigurationEmailNotConfigured("SMTP is not configured")

    host = settings.smtp_host.strip()
    port = int(settings.smtp_port or 587)
    login = settings.smtp_user.strip()
    password = settings.smtp_password
    from_email = (settings.smtp_from_email or login).strip()
    recipient = (to_email or "").strip()
    if not recipient or "@" not in recipient:
        raise ValueError("Invalid sales inbox email")

    subject, body = _email_subject_and_body(conf=conf, user=user)
    filename = _attachment_filename(conf)

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = recipient
    msg.attach(MIMEText(body, "plain", "utf-8"))

    attachment = MIMEApplication(
        xlsx_bytes,
        _subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(attachment)

    if settings.smtp_use_tls:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(login, password)
            smtp.sendmail(from_email, [recipient], msg.as_string())
    else:
        with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
            smtp.login(login, password)
            smtp.sendmail(from_email, [recipient], msg.as_string())


def deliver_configuration_specification_email(
    *,
    to_email: str,
    conf: Configuration,
    xlsx_bytes: bytes,
    user: User,
) -> None:
    """Prefer Resend (HTTPS) when configured; otherwise SMTP (not on Render free)."""
    if resend_is_configured():
        send_configuration_via_resend(
            to_email=to_email,
            conf=conf,
            xlsx_bytes=xlsx_bytes,
            user=user,
        )
        return
    if smtp_is_configured():
        if _render_hosting():
            raise ConfigurationEmailNotConfigured(_smtp_blocked_message())
        send_configuration_specification_email(
            to_email=to_email,
            conf=conf,
            xlsx_bytes=xlsx_bytes,
            user=user,
        )
        return
    raise ConfigurationEmailNotConfigured("Email delivery is not configured")


def _friendly_email_error(exc: Exception) -> str:
    msg = str(exc).strip() or exc.__class__.__name__
    lower = msg.lower()
    if "errno 101" in lower or "network is unreachable" in lower:
        return _smtp_blocked_message()
    return msg


def email_handoff_result(
    *,
    conf: Configuration,
    xlsx_bytes: bytes,
    user: User,
) -> dict[str, Any]:
    """Try to email specification; never raise to the API caller."""
    recipient = sales_inbox_email()
    if not conf.submitted_to_sales:
        return {"email_sent": False, "email_recipient": recipient or None}
    if not email_is_configured():
        return {
            "email_sent": False,
            "email_recipient": recipient or None,
            "email_error": "Email is not configured (set RESEND_API_KEY or SMTP)",
        }
    try:
        deliver_configuration_specification_email(
            to_email=recipient,
            conf=conf,
            xlsx_bytes=xlsx_bytes,
            user=user,
        )
        return {"email_sent": True, "email_recipient": recipient}
    except Exception as exc:
        logger.exception("Failed to send configuration %s email", conf.id)
        return {
            "email_sent": False,
            "email_recipient": recipient,
            "email_error": _friendly_email_error(exc),
        }
