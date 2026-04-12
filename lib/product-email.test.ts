import { getProductEmailFromHeader, sendResendEmail } from "@/lib/product-email";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  EMAIL_REPLY_TO_ADDRESS: process.env.EMAIL_REPLY_TO_ADDRESS,
};

describe("product email provider", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM_ADDRESS = "product@riskopslab.com";
    process.env.EMAIL_FROM_NAME = "RiskOps Lab";
    process.env.EMAIL_REPLY_TO_ADDRESS = "support@riskopslab.com";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.EMAIL_FROM_ADDRESS = originalEnv.EMAIL_FROM_ADDRESS;
    process.env.EMAIL_FROM_NAME = originalEnv.EMAIL_FROM_NAME;
    process.env.EMAIL_REPLY_TO_ADDRESS = originalEnv.EMAIL_REPLY_TO_ADDRESS;
    vi.restoreAllMocks();
  });

  it("builds a formatted from header", () => {
    expect(getProductEmailFromHeader()).toBe("RiskOps Lab <product@riskopslab.com>");
  });

  it("sends email payload to Resend and returns the message id", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const result = await sendResendEmail({
      to: "trainee@example.com",
      subject: "Case review updated",
      html: "<p>Hello</p>",
      text: "Hello",
      replyTo: "support@riskopslab.com",
      tags: [{ name: "notification_type", value: "case_reviewed" }],
    });

    expect(result).toEqual({ id: "email_123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_123",
          "Content-Type": "application/json",
          "User-Agent": "riskops-lab/product-email",
        }),
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      from: "RiskOps Lab <product@riskopslab.com>",
      to: ["trainee@example.com"],
      subject: "Case review updated",
      html: "<p>Hello</p>",
      text: "Hello",
      reply_to: "support@riskopslab.com",
      tags: [{ name: "notification_type", value: "case_reviewed" }],
    });
  });

  it("throws a readable error when Resend rejects the request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      sendResendEmail({
        to: "trainee@example.com",
        subject: "Case review updated",
        html: "<p>Hello</p>",
        text: "Hello",
      })
    ).rejects.toThrow("Invalid API key");
  });
});
