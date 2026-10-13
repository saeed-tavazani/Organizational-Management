import { DirectionProvider } from "@base-ui/react/direction-provider";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { GanttTaskBar } from "./gantt-task-bar";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutateAsync: mocks.update }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  mocks.update.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const day = (n: number) => new Date(2026, 0, n);

describe.each(["ltr", "rtl"] as const)(
  "Gantt interactions in %s",
  (direction) => {
    it.each([
      ["taskAriaLabel", 4, 7],
      ["resizeStart", 4, 5],
      ["resizeDue", 2, 7],
    ] as const)(
      "%s follows the visual timeline direction",
      async (label, start, end) => {
        render(
          <DirectionProvider direction={direction}>
            <GanttTaskBar
              task={{
                id: "task",
                title: "Task",
                number: 1,
                description: "",
                status: "to-do",
                priority: "low",
                startDate: day(2).toISOString(),
                dueDate: day(5).toISOString(),
                position: 1,
                createdAt: day(1).toISOString(),
                userId: null,
                assigneeId: null,
                assigneeName: null,
                projectId: "project",
                scheduleStart: day(2),
                scheduleEnd: day(5),
              }}
              timeline={{
                days: Array.from({ length: 10 }, (_, i) => day(i + 1)),
                rangeStart: day(1),
                gridTemplateColumns: "repeat(10, 10px)",
              }}
              pixelsPerDay={10}
              onOpenTask={vi.fn()}
            />
          </DirectionProvider>,
        );
        fireEvent.pointerDown(
          screen.getByRole("button", { name: `tasks:gantt.${label}` }),
          { clientX: 100, button: 0 },
        );
        const clientX = direction === "rtl" ? 80 : 120;
        fireEvent.pointerMove(window, { clientX });
        fireEvent.pointerUp(window, { clientX });
        await waitFor(() =>
          expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
              startDate: day(start).toISOString(),
              dueDate: day(end).toISOString(),
            }),
          ),
        );
      },
    );
  },
);
