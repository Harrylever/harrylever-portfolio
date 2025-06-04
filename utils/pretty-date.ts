import { format } from "date-fns";

// Convert ISO date time to pretty date
export const prettyDate = (date: string) => {
  return format(new Date(date), "MMM yyyy");
};
