import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./index";

describe("Button Component", () => {
  it("renders standard primary button correctly", () => {
    render(<Button variant="primary">Deploy Code</Button>);
    const button = screen.getByRole("button", { name: /deploy code/i });
    expect(button).toBeDefined();
    expect(button.className).toContain("bg-primary");
  });

  it("renders secondary button variant", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: /cancel/i });
    expect(button).toBeDefined();
    expect(button.className).toContain("bg-canvas");
  });
});
