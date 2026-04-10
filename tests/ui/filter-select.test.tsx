import { FilterSelect } from "@/components/filter-select";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("FilterSelect", () => {
  it("renders the selected label and updates on option click", () => {
    const onChange = vi.fn();

    render(
      <FilterSelect
        ariaLabel="Status"
        value="open"
        onChange={onChange}
        options={[
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));

    expect(onChange).toHaveBeenCalledWith("closed");
  });

  it("supports keyboard opening and escape closing", () => {
    render(
      <FilterSelect
        ariaLabel="Severity"
        value="high"
        onChange={() => undefined}
        options={[
          { value: "high", label: "High" },
          { value: "low", label: "Low" },
        ]}
      />
    );

    const trigger = screen.getByRole("button", { name: "Severity" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    expect(screen.getByRole("listbox", { name: "Severity" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox", { name: "Severity" })).toBeNull();
  });
});
