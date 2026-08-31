// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseSsgPage, ssgImageUrl, ssgReviewListUrl } from "../src/lib/ssg";
import { normalizeSsgReview } from "../src/lib/normalize";

describe("ssgReviewListUrl", () => {
  it("builds 1-based page URL with itemId/siteNo", () => {
    const url = ssgReviewListUrl("1000827457933", "6004", 2);
    expect(url).toContain("/item/ajaxItemCommentList.ssg");
    expect(url).toContain("itemId=1000827457933");
    expect(url).toContain("siteNo=6004");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
  });
});

describe("parseSsgPage", () => {
  it("parses rvw_expansion_panel.v2 fragment (라이브 캡처 스키마)", () => {
    const html = `
      <ul>
        <li class="rvw_expansion_panel v2" data-postngid="1267295680">
          <div class="rvw_expansion_panel_head">
            <div class="cdtl_star_area"><span class="cdtl_star_on" style="width:100%"><span class="blind">구매고객 총 평점 별 5개 중 <em>5</em>개</span></span></div>
            <div class="rvw_item_label rvw_item_user_id">cha*******</div>
            <p class="rvw_item_text">언니 생일 선물로 드렸는데 넘 좋아해요~</p>
            <div class="rvw_item_thumb_group"><div class="rvw_item_thumb"><img src="//succ.ssgcdn.com/uphoto/a.jpg" alt=""></div></div>
          </div>
          <div class="rvw_expansion_panel_foot">
            <div class="rvw_item_label rvw_item_date">2026.04.14</div>
            <div class="rvw_help_wrap"><button class="rvw_help_btn"><span data-cnt="12">12</span></button></div>
          </div>
        </li>
      </ul>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = parseSsgPage(doc);
    expect(items).toHaveLength(1);
    expect(items[0].reviewId).toBe("1267295680");
    expect(items[0].rating).toBe("5");
    expect(items[0].author).toBe("cha*******");
    expect(items[0].text).toContain("언니 생일 선물");
    expect(items[0].reviewedAt).toBe("2026.04.14");
    expect(items[0].helpfulCount).toBe("12");
    expect(items[0].images?.[0]).toBe("https://succ.ssgcdn.com/uphoto/a.jpg");
  });
  it("selects li.rvw_expansion_panel.v2 only", () => {
    const doc = new DOMParser().parseFromString("<li class='rvw_expansion_panel v2'></li><div class='rvw_expansion_panel v2'></div>", "text/html");
    expect(parseSsgPage(doc)).toHaveLength(1);
  });
});

describe("ssgImageUrl", () => {
  it("resolves protocol-relative to https", () => {
    expect(ssgImageUrl("//succ.ssgcdn.com/uphoto/a.jpg")).toBe("https://succ.ssgcdn.com/uphoto/a.jpg");
    expect(ssgImageUrl("https://succ.ssgcdn.com/a.jpg")).toBe("https://succ.ssgcdn.com/a.jpg");
    expect(ssgImageUrl(null)).toBe("");
  });
});

describe("normalizeSsgReview", () => {
  it("maps parsed fields to RawReview", () => {
    const r = normalizeSsgReview({
      text: "좋아요",
      rating: "4",
      reviewedAt: "2026.04.14",
      author: "cha*******",
      helpfulCount: "12",
      images: ["https://succ.ssgcdn.com/a.jpg"]
    });
    expect(r.rating).toBe(4);
    expect(r.helpfulCount).toBe(12);
    expect(r.imageUrls?.[0]).toContain("succ.ssgcdn.com");
  });
});