"use client";

import { useState } from "react";
import { savePushSubscription } from "@/server/notifications/subscriptions";

type Status = "idle" | "subscribing" | "subscribed" | "error" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function PushSubscribeButton({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | undefined>();

  async function subscribe() {
    if (!vapidPublicKey) {
      setStatus("unsupported");
      setMessage("Push notifications aren't configured on this deployment yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      setMessage("This browser doesn't support push notifications.");
      return;
    }

    setStatus("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        setMessage("Notification permission wasn't granted.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatus("error");
        setMessage("The browser returned an incomplete subscription.");
        return;
      }

      const result = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      if (result.status === "error") {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      setStatus("subscribed");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Couldn't enable push notifications.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={subscribe}
        disabled={status === "subscribing" || status === "subscribed"}
        className="border-border rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {status === "subscribed" ? "Push notifications enabled" : "Enable push notifications"}
      </button>
      {message ? (
        <p role="status" className="text-ink-muted mt-2 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
