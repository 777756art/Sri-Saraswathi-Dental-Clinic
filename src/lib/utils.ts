import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatCurrency(amount: number | string | null | undefined) {
  if (amount == null) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function generateId(prefix?: string) {
  const id = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${id}` : id;
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string) {
  const re = /^\+?[\d\s-()]{7,15}$/;
  return re.test(phone);
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-[#E4F0F2] text-[#1F6878]",
    CONFIRMED: "bg-[#E4F0F2] text-[#1F6878]",
    CHECKED_IN: "bg-[#E4F0F2] text-[#E95A35]",
    IN_PROGRESS: "bg-[#E4F0F2] text-[#1F6878]",
    COMPLETED: "bg-[#E4F0F2] text-[#1F6878]",
    CANCELLED: "bg-rose-100 text-rose-800",
    NO_SHOW: "bg-slate-100 text-[#707574]",
    PENDING: "bg-[#E4F0F2] text-[#E95A35]",
    PAID: "bg-[#E4F0F2] text-[#1F6878]",
    PARTIAL: "bg-[#E4F0F2] text-[#1F6878]",
    REFUNDED: "bg-[#E4F0F2] text-[#D14824]",
    PLANNED: "bg-[#E4F0F2] text-[#1F6878]",
    ON_HOLD: "bg-amber-50 text-amber-800",
  };
  return colors[status] || "bg-slate-100 text-[#707574]";
}

export function getDayName(day: number) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}
