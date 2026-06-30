import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RenameDialog } from "./RenameDialog";

describe("RenameDialog", () => {
  it("submits through Enter with the trimmed name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <RenameDialog
        title="Create project"
        inputLabel="Project name"
        submitLabel="Create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Project name" }), "  Ideas");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Ideas"));
  });

  it("shows async submit errors when Enter submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Project already exists."));

    render(
      <RenameDialog
        title="Create project"
        inputLabel="Project name"
        submitLabel="Create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Project name" }), "Ideas");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.getByText("Project already exists.")).toBeVisible(),
    );
  });
});
