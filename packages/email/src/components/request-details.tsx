import React from "react";
import { type EmailLocale, emailHtmlLang } from "../templates/resolve-locale";
import { type DetailRow, DetailRows } from "./detail-rows";
import { type DateInput, formatDateTime } from "./format-date";
import { Frame } from "./frame";

void React;

export type RequestDevice = {
  browser?: string;
  os?: string;
};

export type RequestContext = {
  email?: string;
  instance?: string;
  requestedAt?: DateInput;
  device?: RequestDevice;
};

type Messages = {
  title: string;
  account: string;
  instance: string;
  requested: string;
  device: string;
  browserOn: (browser: string, os: string) => string;
};

const messages: Record<EmailLocale, Messages> = {
  en: {
    title: "Request details",
    account: "Account",
    instance: "Instance",
    requested: "Requested",
    device: "Device",
    browserOn: (browser, os) => `${browser} on ${os}`,
  },
  fa: {
    title: "جزئیات درخواست",
    account: "حساب کاربری",
    instance: "نمونه",
    requested: "زمان درخواست",
    device: "دستگاه",
    browserOn: (browser, os) => `${browser} در ${os}`,
  },
};

function describeDevice(copy: Messages, device?: RequestDevice) {
  if (device?.browser && device.os) {
    return copy.browserOn(device.browser, device.os);
  }
  return device?.browser ?? device?.os;
}

type RequestDetailsProps = RequestContext & {
  locale: EmailLocale;
};

export function RequestDetails({
  locale,
  email,
  instance,
  requestedAt,
  device,
}: RequestDetailsProps) {
  const copy = messages[locale];
  const rows: DetailRow[] = [
    { label: copy.account, value: email },
    { label: copy.instance, value: instance },
    {
      label: copy.requested,
      value: requestedAt
        ? formatDateTime(requestedAt, emailHtmlLang(locale))
        : undefined,
    },
    { label: copy.device, value: describeDevice(copy, device) },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) {
    return null;
  }

  return (
    <Frame title={copy.title} panelPadding="8px 20px">
      <DetailRows rows={rows} />
    </Frame>
  );
}
