import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  createStaffSchoolYear,
  getActiveStaffSchoolYear,
  getStaffSchoolYears,
  loadStaffSession,
  setActiveStaffSchoolYear,
  staffSessionChangedEvent,
  type StaffSchoolYear,
} from "./staffApi";

interface StaffSchoolYearContextValue {
  availableYears: StaffSchoolYear[];
  selectedLabel: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  canCreate: boolean;
  isCreating: boolean;
  selectYear: (label: string) => void;
  createYear: (label: string) => void;
}

const emptyContext: StaffSchoolYearContextValue = {
  availableYears: [],
  selectedLabel: null,
  isLoading: false,
  isError: false,
  errorMessage: null,
  canCreate: false,
  isCreating: false,
  selectYear: () => undefined,
  createYear: () => undefined,
};

const StaffSchoolYearContext = createContext(emptyContext);

export function StaffSchoolYearProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(loadStaffSession);
  const [selectedLabel, setSelectedLabel] = useState(getActiveStaffSchoolYear);
  const yearsQuery = useQuery({
    queryKey: ["staff-school-years", session?.staff.id ?? null],
    queryFn: getStaffSchoolYears,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const createMutation = useMutation({
    mutationFn: createStaffSchoolYear,
    onSuccess: (year) => {
      setActiveStaffSchoolYear(year.label);
      setSelectedLabel(year.label);
      void queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    const synchronizeSession = () => {
      const nextSession = loadStaffSession();
      setSession(nextSession);
      void queryClient.invalidateQueries({
        queryKey: ["staff-school-years"],
      });
      if (!nextSession) {
        setActiveStaffSchoolYear(null);
        setSelectedLabel(null);
      }
    };

    window.addEventListener(staffSessionChangedEvent, synchronizeSession);
    return () =>
      window.removeEventListener(staffSessionChangedEvent, synchronizeSession);
  }, [queryClient]);

  useEffect(() => {
    if (!session || !yearsQuery.data) return;

    const labels = new Set(
      yearsQuery.data.school_years.map((year) => year.label),
    );
    const serverSelected = yearsQuery.data.selected_school_year?.label ?? null;
    const nextLabel =
      selectedLabel && labels.has(selectedLabel)
        ? selectedLabel
        : (serverSelected ?? yearsQuery.data.school_years[0]?.label ?? null);

    if (nextLabel !== selectedLabel) setSelectedLabel(nextLabel);
    if (nextLabel !== getActiveStaffSchoolYear()) {
      setActiveStaffSchoolYear(nextLabel);
    }
  }, [session, selectedLabel, yearsQuery.data]);

  const value = useMemo<StaffSchoolYearContextValue>(
    () => ({
      availableYears: yearsQuery.data?.school_years ?? [],
      selectedLabel,
      isLoading: Boolean(session) && yearsQuery.isLoading,
      isError: Boolean(session) && yearsQuery.isError,
      errorMessage:
        createMutation.error instanceof Error
          ? createMutation.error.message
          : yearsQuery.error instanceof Error
            ? yearsQuery.error.message
            : null,
      canCreate:
        session?.staff.role === "school_admin" && session.staff.school !== null,
      isCreating: createMutation.isPending,
      selectYear: (label: string) => {
        if (
          !yearsQuery.data?.school_years.some((year) => year.label === label)
        ) {
          return;
        }
        setActiveStaffSchoolYear(label);
        setSelectedLabel(label);
        void queryClient.invalidateQueries();
      },
      createYear: (label: string) => {
        createMutation.mutate(label);
      },
    }),
    [
      createMutation,
      queryClient,
      selectedLabel,
      session,
      yearsQuery.data,
      yearsQuery.error,
      yearsQuery.isError,
      yearsQuery.isLoading,
    ],
  );

  return (
    <StaffSchoolYearContext.Provider value={value}>
      {children}
    </StaffSchoolYearContext.Provider>
  );
}

export function useStaffSchoolYear(): StaffSchoolYearContextValue {
  return useContext(StaffSchoolYearContext);
}
