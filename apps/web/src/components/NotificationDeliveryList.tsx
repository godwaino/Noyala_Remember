import type { NotificationDeliveryRow } from "@/server/notifications/queries";

const STATUS_LABEL: Record<NotificationDeliveryRow["status"], string> = {
  scheduled: "Scheduled",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function NotificationDeliveryList({ deliveries }: { deliveries: NotificationDeliveryRow[] }) {
  if (deliveries.length === 0) {
    return <p className="text-ink-muted text-sm">No reminders have been scheduled yet.</p>;
  }

  return (
    <ul className="border-border divide-border divide-y rounded-lg border">
      {deliveries.map((delivery) => (
        <li key={delivery.id} className="flex items-center justify-between gap-4 p-3 text-sm">
          <div className="min-w-0">
            <p className="text-ink truncate">
              {delivery.important_dates?.label ?? "Reminder"}
              {delivery.important_dates?.people?.first_name
                ? ` — ${delivery.important_dates.people.first_name}`
                : ""}
            </p>
            <p className="text-ink-muted text-xs">
              {new Date(delivery.scheduled_for).toLocaleString()} · {delivery.channel}
            </p>
          </div>
          <span className="text-ink-muted shrink-0 text-xs">{STATUS_LABEL[delivery.status]}</span>
        </li>
      ))}
    </ul>
  );
}
