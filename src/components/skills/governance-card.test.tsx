import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GovernanceCard } from "./governance-card";

describe("GovernanceCard", () => {
  it("renders nothing when no governance fields are set", () => {
    const { container } = render(
      <GovernanceCard businessPurpose={null} systemsAccessed={[]} governanceReviewDate={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders business purpose, systems accessed, and review date when set", () => {
    render(
      <GovernanceCard
        businessPurpose="Summarize customer support tickets"
        systemsAccessed={["zendesk", "s3"]}
        governanceReviewDate="2026-12-01"
      />,
    );
    expect(screen.getByText("Summarize customer support tickets")).toBeInTheDocument();
    expect(screen.getByText("zendesk")).toBeInTheDocument();
    expect(screen.getByText("s3")).toBeInTheDocument();
    expect(screen.getByText("2026-12-01")).toBeInTheDocument();
  });

  it("renders partial data when only some fields are set", () => {
    render(
      <GovernanceCard
        businessPurpose="Summarize tickets"
        systemsAccessed={[]}
        governanceReviewDate={null}
      />,
    );
    expect(screen.getByText("Summarize tickets")).toBeInTheDocument();
  });
});
