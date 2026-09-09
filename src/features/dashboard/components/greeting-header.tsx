/** e.g. "Wednesday, September 10, 2026". */
function formatToday(): string {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function GreetingHeader({
  userName,
  merchantName,
}: {
  userName?: string;
  merchantName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">
        {merchantName ? `Good day, ${merchantName}` : "Good day"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {userName ? `Signed in as ${userName} · ` : ""}
        {formatToday()}
      </p>
    </div>
  );
}
