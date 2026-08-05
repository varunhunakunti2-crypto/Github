import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  Card,
  CardMarketing,
  Input,
  Select,
  Checkbox,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  Dropdown,
  DropdownItem,
} from "./index";

describe("Design System Component Suite", () => {
  describe("Buttons", () => {
    it("renders with appropriate class for primary variant", () => {
      render(<Button variant="primary">Primary</Button>);
      const btn = screen.getByRole("button", { name: /primary/i });
      expect(btn.className).toContain("bg-primary");
    });

    it("renders with appropriate class for tab-ghost variant", () => {
      render(<Button variant="tab-ghost">Tab Ghost</Button>);
      const btn = screen.getByRole("button", { name: /tab ghost/i });
      expect(btn.className).toContain("bg-transparent");
    });

    it("supports disabling button behavior", () => {
      render(
        <Button variant="primary" disabled>
          Disabled
        </Button>,
      );
      const btn = screen.getByRole("button", { name: /disabled/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe("Cards", () => {
    it("renders base Card with standard elevation class", () => {
      render(<Card elevation={4}>Elevation Card</Card>);
      const card = screen.getByText("Elevation Card");
      expect(card.className).toContain("shadow-level-4");
    });

    it("renders CardMarketing with marketing configuration", () => {
      render(<CardMarketing>Marketing Content</CardMarketing>);
      const card = screen.getByText("Marketing Content");
      expect(card.className).toContain("shadow-level-3");
      expect(card.className).toContain("rounded-lg");
    });
  });

  describe("Form Inputs", () => {
    it("renders medium input default class", () => {
      render(<Input sizeVariant="md" placeholder="Type here" />);
      const input = screen.getByPlaceholderText("Type here");
      expect(input.className).toContain("h-[40px]");
    });

    it("renders input with validation error states", () => {
      render(<Input error placeholder="Error state" />);
      const input = screen.getByPlaceholderText("Error state");
      expect(input.className).toContain("border-error");
    });

    it("handles checkbox rendering and interaction", () => {
      let isChecked = false;
      const onChange = vi.fn((e) => {
        isChecked = e.target.checked;
      });
      render(<Checkbox checked={isChecked} onChange={onChange} />);
      const chk = screen.getByRole("checkbox") as HTMLInputElement;
      expect(chk.checked).toBe(false);
      fireEvent.click(chk);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("Semantic Badges", () => {
    it("renders success badge with correct class styles", () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText("Active");
      expect(badge.className).toContain("bg-link-bg-soft");
    });
  });

  describe("Tables", () => {
    it("renders structured elements properly", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <th>Repository</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>gitforge-core</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByRole("table")).toBeDefined();
      expect(screen.getByText("gitforge-core")).toBeDefined();
    });
  });

  describe("Interactive Modal Overlay", () => {
    it("does not render when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
          Modal Body
        </Modal>,
      );
      expect(screen.queryByText("Test Modal")).toBeNull();
    });

    it("renders title and triggers close when escape is pressed", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          Modal Body
        </Modal>,
      );
      expect(screen.getByText("Test Modal")).toBeDefined();
      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
