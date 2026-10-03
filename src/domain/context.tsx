import { NativeApplicationService } from "./native";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  MockApplicationService,
  type ApplicationService,
  type DomainState,
  type Locale,
} from "./service";
interface DomainContextValue {
  locale: Locale;
  state: DomainState;
  service: ApplicationService;
  openWorkspace: (id: string) => void;
  newSession: () => void;
  selectSession: (id: string) => void;
  openFile: (path: string) => void;
}
const Context = createContext<DomainContextValue | null>(null);
export function DomainProvider({
  children,
  locale,
  onCommand,
  service: suppliedService,
}: {
  children: ReactNode;
  service?: ApplicationService;
  locale: Locale;
  onCommand: (id: string, payload?: unknown) => void;
}) {
  const ref = useRef<ApplicationService | null>(null);
  if (!ref.current)
    ref.current =
      suppliedService ??
      (window.desktop?.backend
        ? new NativeApplicationService(window.desktop.backend)
        : new MockApplicationService());
  const service = ref.current;
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  useEffect(() => {
    service.start?.();
    return () => service.dispose();
  }, [service]);
  return (
    <Context.Provider
      value={{
        locale,
        state,
        service,
        openWorkspace: (id) => service.openWorkspace(id as "demo" | "research"),
        selectSession: (id) => {
          service.selectSession(id);
          onCommand("session.open");
        },
        newSession: () => {
          service.createSession();
          onCommand("session.open");
        },
        openFile: (path) => {
          service.openFile(path);
          onCommand("file.open", { path });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDomain() {
  const value = useContext(Context);
  if (!value) throw new Error("DomainProvider is required");
  return value;
}
