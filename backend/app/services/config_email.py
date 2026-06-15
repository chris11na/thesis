"""Send configuration specification spreadsheets to sales inbox via SMTP."""

from __future__ import annotations

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import settings
from app.models.configuration import Configuration
from app.models.user import User

logger = logging.getLogger(__name__)


class ConfigurationEmailNotConfigured(Exception):
    """SMTP is not configured in environment settings."""


def sales_inbox_email() -> str:
    return (settings.sales_inbox_email or "").strip()


def smtp_is_configured() -> bool:
    return bool(
        (settings.smtp_host or "").strip()
        and (settings.smtp_user or "").strip()
        and (settings.smtp_password or "").strip()
        and sales_inbox_email()
    )


def send_configuration_specification_email(
    *,
    to_email: str,
    conf: Configuration,
    xlsx_bytes: bytes,
    user: User,
) -> None:
    """Deliver XLSX attachment to the sales inbox."""
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

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = recipient
    msg.attach(MIMEText("\n".join(body_lines), "plain", "utf-8"))

    filename = f"configuration-{conf.id}-spec.xlsx"
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
    if not smtp_is_configured():
        return {
            "email_sent": False,
            "email_recipient": recipient or None,
            "email_error": "SMTP is not configured",
        }
    try:
        send_configuration_specification_email(
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
            "email_error": str(exc),
        }
