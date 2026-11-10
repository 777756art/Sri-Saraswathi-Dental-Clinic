import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

interface AppointmentState {
  selectedDate: Date | null;
  selectedStaff: string | null;
  selectedService: string | null;
  setSelectedDate: (date: Date | null) => void;
  setSelectedStaff: (staff: string | null) => void;
  setSelectedService: (service: string | null) => void;
  reset: () => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  selectedDate: null,
  selectedStaff: null,
  selectedService: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedStaff: (staff) => set({ selectedStaff: staff }),
  setSelectedService: (service) => set({ selectedService: service }),
  reset: () => set({ selectedDate: null, selectedStaff: null, selectedService: null }),
}));
