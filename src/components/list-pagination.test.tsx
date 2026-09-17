import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListPagination } from "./list-pagination";
import type { PageMeta } from "@/lib/api/pagination";

function makeMeta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    current_page: 1,
    from: 1,
    last_page: 1,
    links: [],
    path: "/api/v1/merchant/products",
    per_page: 15,
    to: 1,
    total: 1,
    ...overrides,
  };
}

describe("ListPagination", () => {
  it("renders nothing for a single page with no page-size control", () => {
    const { container } = render(
      <ListPagination meta={makeMeta({ last_page: 1 })} page={1} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the prev/next pager, disabling prev on the first page and next on the last", () => {
    render(
      <ListPagination meta={makeMeta({ current_page: 1, last_page: 3 })} page={1} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to previous page/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: /go to next page/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("clicking next/prev calls onPageChange with the adjacent page", async () => {
    const onPageChange = vi.fn();
    render(
      <ListPagination
        meta={makeMeta({ current_page: 2, last_page: 3 })}
        page={2}
        onPageChange={onPageChange}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("link", { name: /go to previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("a page-size control still shows on a single page, even with no pager", () => {
    render(
      <ListPagination
        meta={makeMeta({ last_page: 1 })}
        page={1}
        onPageChange={vi.fn()}
        perPage={15}
        onPerPageChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Rows per page")).toBeInTheDocument();
    expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
  });

  it("defaults its options to 15/25/50 and calls onPerPageChange with the chosen number", async () => {
    const onPerPageChange = vi.fn();
    render(
      <ListPagination
        meta={makeMeta()}
        page={1}
        onPageChange={vi.fn()}
        perPage={15}
        onPerPageChange={onPerPageChange}
      />,
    );
    const user = userEvent.setup();

    const trigger = screen.getByLabelText("Rows per page");
    expect(trigger).toHaveTextContent("15");
    await user.click(trigger);

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "15" })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: "25" })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: "50" })).toBeInTheDocument();

    await user.click(within(listbox).getByRole("option", { name: "50" }));
    expect(onPerPageChange).toHaveBeenCalledWith(50);
  });

  it("accepts a custom perPageOptions list", async () => {
    render(
      <ListPagination
        meta={makeMeta()}
        page={1}
        onPageChange={vi.fn()}
        perPage={10}
        onPerPageChange={vi.fn()}
        perPageOptions={[10, 20]}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Rows per page"));

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "10" })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: "20" })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: "15" })).not.toBeInTheDocument();
  });
});
