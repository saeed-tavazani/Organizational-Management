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
import { toChatEvents } from "@/components/project/integrations/chat-webhook/chat-events";
import { BaleIntegrationSettings } from "./bale-integration-settings";

const mocks = vi.hoisted(() => ({
  query: {
    data: null as unknown,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
    isRefetching: false,
  },
  createIntegration: vi.fn(),
  updateIntegration: vi.fn(),
  deleteIntegration: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/queries/bale-integration/use-get-bale-integration", () => ({
  default: () => mocks.query,
}));

vi.mock("@/hooks/mutations/bale-integration/use-bale-integration", () => ({
  useCreateBaleIntegration: () => ({
    mutateAsync: mocks.createIntegration,
    isPending: false,
  }),
  useUpdateBaleIntegration: () => ({
    mutateAsync: mocks.updateIntegration,
    isPending: false,
  }),
  useDeleteBaleIntegration: () => ({
    mutateAsync: mocks.deleteIntegration,
    isPending: false,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("BaleIntegrationSettings", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.query = {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    };
    mocks.createIntegration.mockReset().mockResolvedValue(undefined);
    mocks.updateIntegration.mockReset().mockResolvedValue(undefined);
    mocks.deleteIntegration.mockReset().mockResolvedValue(undefined);
  });

  it("shows a retryable error when the settings fail to load", () => {
    mocks.query.error = new Error("Network down");
    render(<BaleIntegrationSettings projectId="project-1" />);

    expect(screen.getByText("settings:baleIntegration.loadError")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "settings:chatIntegrations.retry" }),
    );
    expect(mocks.query.refetch).toHaveBeenCalledTimes(1);
  });

  it("requires a chat ID before connecting", async () => {
    render(<BaleIntegrationSettings projectId="project-1" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings:baleIntegration.connect",
      }),
    );

    expect(
      await screen.findByText(
        "settings:baleIntegration.validation.chatIdRequired",
      ),
    ).toBeTruthy();
    expect(mocks.createIntegration).not.toHaveBeenCalled();
  });

  it("connects with a Bale token and a channel username", async () => {
    render(<BaleIntegrationSettings projectId="project-1" />);
    const botToken = `123456789:${"a".repeat(40)}`;
    fireEvent.change(
      screen.getByLabelText("settings:baleIntegration.botTokenLabel"),
      { target: { value: botToken } },
    );
    fireEvent.change(
      screen.getByLabelText("settings:baleIntegration.chatIdLabel"),
      { target: { value: "@team" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "settings:baleIntegration.connect" }),
    );
    await waitFor(() =>
      expect(mocks.createIntegration).toHaveBeenCalledWith({
        projectId: "project-1",
        data: {
          botToken,
          chatId: "@team",
          chatLabel: undefined,
          events: toChatEvents(),
        },
      }),
    );
    expect(
      screen.queryByLabelText("settings:telegramIntegration.threadIdLabel"),
    ).toBeNull();
    expect(
      screen.getByLabelText("settings:baleIntegration.botTokenLabel"),
    ).toHaveValue("");
  });

  it("toggles delivery and confirms disconnecting a configured integration", async () => {
    mocks.query.data = {
      id: "integration-1",
      projectId: "project-1",
      chatId: "123",
      botTokenConfigured: true,
      maskedBotToken: "123:••••",
      events: toChatEvents(),
      isActive: true,
    };
    render(<BaleIntegrationSettings projectId="project-1" />);
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() =>
      expect(mocks.updateIntegration).toHaveBeenCalledWith({
        projectId: "project-1",
        json: { isActive: false },
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings:chatIntegrations.disconnect",
      }),
    );
    const buttons = screen.getAllByRole("button", {
      name: "settings:chatIntegrations.disconnect",
    });
    fireEvent.click(buttons[buttons.length - 1]!);
    await waitFor(() =>
      expect(mocks.deleteIntegration).toHaveBeenCalledWith("project-1"),
    );
  });

  it("keeps the saved bot token when the field is left empty", async () => {
    mocks.query.data = {
      id: "integration-1",
      projectId: "project-1",
      chatId: "-1001234567890",
      chatLabel: "Engineering",
      botTokenConfigured: true,
      maskedBotToken: "1234:…abcd",
      events: toChatEvents(),
      isActive: true,
      createdAt: "",
      updatedAt: "",
    };
    render(<BaleIntegrationSettings projectId="project-1" />);

    expect(
      screen.getByLabelText("settings:baleIntegration.botTokenLabel"),
    ).toHaveAttribute(
      "placeholder",
      "settings:baleIntegration.botTokenSavedPlaceholder",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings:chatIntegrations.saveChanges",
      }),
    );

    await waitFor(() =>
      expect(mocks.updateIntegration).toHaveBeenCalledWith({
        projectId: "project-1",
        json: {
          botToken: undefined,
          chatId: "-1001234567890",
          chatLabel: "Engineering",
          events: toChatEvents(),
        },
      }),
    );
  });
});
