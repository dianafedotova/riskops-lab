import { BrandedDatePicker } from "@/components/branded-date-picker";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("BrandedDatePicker", () => {
  it("shows the placeholder until a date is selected", () => {
    render(
      <BrandedDatePicker
        id="joined-at"
        value=""
        placeholder="Select date"
        onChange={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: /select date/i })).toBeTruthy();
  });

  it("emits today when the Today shortcut is used", () => {
    const onChange = vi.fn();

    render(<BrandedDatePicker id="joined-at" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /select date/i }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
