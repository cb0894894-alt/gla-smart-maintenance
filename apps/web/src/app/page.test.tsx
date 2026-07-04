import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders maintenance modules", () => {
    render(<DashboardPage />);
    expect(screen.getAllByText("Activos")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Órdenes de trabajo")[0]).toBeInTheDocument();
    expect(screen.getByText("Inventario crítico")).toBeInTheDocument();
  });
});
