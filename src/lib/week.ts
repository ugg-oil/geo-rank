export function getCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `Week of ${yyyy}-${mm}-${dd}`;
}

export function getPreviousWeek(week: string): string {
  const dateStr = week.replace("Week of ", "");
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 7);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `Week of ${yyyy}-${mm}-${dd}`;
}
