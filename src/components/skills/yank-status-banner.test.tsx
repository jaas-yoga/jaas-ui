import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { YankStatusBanner } from "./yank-status-banner";

describe("YankStatusBanner", () => {
  it("renders nothing when status is active", () => {
    const { container } = render(<YankStatusBanner status="active" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a warning when status is yanked", () => {
    render(<YankStatusBanner status="yanked" />);
    expect(screen.getByText(/yanked/i)).toBeInTheDocument();
  });
});
