import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ISBNScanner from "./ISBNScanner";

const playMock = vi.fn().mockResolvedValue(undefined);

describe("ISBNScanner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (HTMLMediaElement.prototype as any).play = playMock;
    (navigator as any).mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getVideoTracks: () => [
          {
            stop: vi.fn(),
            getCapabilities: vi.fn().mockReturnValue({ torch: false }),
            applyConstraints: vi.fn(),
          },
        ],
      }),
    };
  });

  it("starts camera when button clicked", async () => {
    const onDetected = vi.fn();
    render(<ISBNScanner onISBNDetected={onDetected} />);

    const startBtn = await screen.findByRole("button", { name: /start camera/i });
    await userEvent.click(startBtn);

    await waitFor(() => {
      expect((navigator as any).mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    // After start, status text should reflect camera ready
    await waitFor(() => expect(screen.getByText(/camera ready/i)).toBeInTheDocument());
  });
});
