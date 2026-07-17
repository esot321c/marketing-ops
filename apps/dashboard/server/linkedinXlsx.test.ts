import { test, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseSinglePostWorkbook } from "./linkedinXlsx.js";

const POST_URL =
  "https://www.linkedin.com/posts/example-agency_why-shipping-beats-polishing-ugcPost-1000000000000000001-Ab3d";

async function buildWorkbook(rows: [string, string?, string?][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Post analytics");
  for (const row of rows) sheet.addRow(row);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function fullRows(): [string, string?, string?][] {
  return [
    ["Post URL", POST_URL],
    ["Post Date", "7/16/2026"],
    ["Post Publish Time", "9:41 AM"],
    ["Impressions", "12345"],
    ["Members reached", "9800"],
    ["Profile viewers from this post", "42"],
    ["Followers gained from this post", "7"],
    ["Social engagements", "310"],
    ["Reactions", "200"],
    ["Comments", "60"],
    ["Reposts", "30"],
    ["Saves", "15"],
    ["Sends on LinkedIn", "5"],
    ["Link engagements", "3"],
    ["Premium custom button engagements", "1"],
    ["Category", "Value", "%"],
    ["Job title", "Marketing Manager", "22%"],
    ["Location", "Toronto", "18%"],
    ["Seniority", "Manager", "30%"],
    ["Industry", "Software", "40%"],
    ["Company size", "51-200", "25%"],
  ];
}

test("parses every field from a full workbook including demographics and percent conversion", async () => {
  const buffer = await buildWorkbook(fullRows());
  const result = await parseSinglePostWorkbook(buffer);

  expect(result.postUrl).toBe(POST_URL);
  expect(result.urn).toBe("ugcPost-1000000000000000001");
  expect(result.postedAt).toBe("2026-07-16");
  expect(result.postedTime).toBe("9:41 AM");
  expect(result.titleSlug).toBe("why shipping beats polishing");

  expect(result.capture.impressions).toBe(12345);
  expect(result.capture.membersReached).toBe(9800);
  expect(result.capture.profileViewers).toBe(42);
  expect(result.capture.followersGained).toBe(7);
  expect(result.capture.socialEngagements).toBe(310);
  expect(result.capture.reactions).toBe(200);
  expect(result.capture.comments).toBe(60);
  expect(result.capture.reposts).toBe(30);
  expect(result.capture.saves).toBe(15);
  expect(result.capture.sends).toBe(5);
  expect(result.capture.linkEngagements).toBe(3);
  expect(result.capture.premiumButtonEngagements).toBe(1);

  expect(result.capture.demographics?.jobTitles).toEqual([{ label: "Marketing Manager", pct: 22 }]);
  expect(result.capture.demographics?.locations).toEqual([{ label: "Toronto", pct: 18 }]);
  expect(result.capture.demographics?.seniority).toEqual([{ label: "Manager", pct: 30 }]);
  expect(result.capture.demographics?.industries).toEqual([{ label: "Software", pct: 40 }]);
  expect(result.capture.demographics?.companySizes).toEqual([{ label: "51-200", pct: 25 }]);
});

test("missing engagement section yields nulls for those fields", async () => {
  const buffer = await buildWorkbook([
    ["Post URL", POST_URL],
    ["Post Date", "7/16/2026"],
    ["Impressions", "100"],
  ]);
  const result = await parseSinglePostWorkbook(buffer);

  expect(result.capture.impressions).toBe(100);
  expect(result.capture.membersReached).toBeNull();
  expect(result.capture.socialEngagements).toBeNull();
  expect(result.capture.reactions).toBeNull();
  expect(result.capture.comments).toBeNull();
  expect(result.capture.reposts).toBeNull();
  expect(result.capture.saves).toBeNull();
  expect(result.capture.sends).toBeNull();
  expect(result.capture.linkEngagements).toBeNull();
  expect(result.capture.premiumButtonEngagements).toBeNull();
  expect(result.capture.profileViewers).toBeNull();
  expect(result.capture.followersGained).toBeNull();
  expect(result.capture.demographics).toBeUndefined();
});

test("a workbook with no Post URL label throws 'unrecognized workbook layout'", async () => {
  const buffer = await buildWorkbook([
    ["Impressions", "100"],
    ["Reactions", "5"],
  ]);
  await expect(parseSinglePostWorkbook(buffer)).rejects.toThrow("unrecognized workbook layout");
});

test("converts M/D/YYYY post date to YYYY-MM-DD", async () => {
  const buffer = await buildWorkbook([
    ["Post URL", POST_URL],
    ["Post Date", "1/5/2026"],
  ]);
  const result = await parseSinglePostWorkbook(buffer);
  expect(result.postedAt).toBe("2026-01-05");
});

test("unknown labels are ignored", async () => {
  const buffer = await buildWorkbook([
    ["Post URL", POST_URL],
    ["Some Unknown Label", "whatever"],
  ]);
  const result = await parseSinglePostWorkbook(buffer);
  expect(result.postUrl).toBe(POST_URL);
});

test("parses urn and titleSlug from a share-style post URL", async () => {
  const shareUrl =
    "https://www.linkedin.com/posts/example-profile-12ab34c_planning-a-product-launch-in-one-week-share-2000000000000000002-8SHs";
  const buffer = await buildWorkbook([["Post URL", shareUrl]]);
  const result = await parseSinglePostWorkbook(buffer);

  expect(result.urn).toBe("share-2000000000000000002");
  expect(result.titleSlug).toBe("planning a product launch in one week");
});
